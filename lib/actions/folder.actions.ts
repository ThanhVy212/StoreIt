'use server';

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Query, TablesDB } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { FolderRow, UserRow } from "@/types/db.types";

const getUniqueFolderName = async (
    tablesDB: TablesDB,
    name: string,
    parentFolderId: string | null,
    accountId: string
): Promise<string> => {
    const queries = [
        Query.equal("accountId", [accountId]),
        parentFolderId === null
            ? Query.isNull("parentFolderId")
            : Query.equal("parentFolderId", [parentFolderId]),
        Query.equal("trashed", [false]),
    ];

    const existingFolders = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.foldersTableId,
        queries,
    });

    const existingNames = new Set(
        (existingFolders.rows as unknown as FolderRow[]).map(
            (folder) => folder.name
        )
    );

    if (!existingNames.has(name)) {
        return name;
    }

    let counter = 1;
    while (existingNames.has(`${name} (${counter})`)) {
        counter++;
    }

    return `${name} (${counter})`;
};

const assertFolderAuthorized = async (tablesDB: TablesDB, folderId: string) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("No user found");

    const folder = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.foldersTableId,
        rowId: folderId,
    });

    const isOwner = folder.owner === currentUser.$id;
    const isUser = Array.isArray(folder.users) && folder.users.includes(currentUser.email);

    if (!isOwner && !isUser) {
        throw new Error("Not authorized to access this folder");
    }
};

const assertFolderOwner = async (tablesDB: TablesDB, folderId: string) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("No user found");

    const folder = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.foldersTableId,
        rowId: folderId,
    });

    if (folder.owner !== currentUser.$id) {
        throw new Error("Only the folder owner can perform this action.");
    }

    return { currentUser, folder };
};

export const createFolder = async ({
    name,
    accountId,
    owner,
    parentFolderId,
    path,
}: {
    name: string;
    accountId: string;
    owner: string;
    parentFolderId?: string | null;
    path: string;
}) => {
    const { tablesDB } = await createAdminClient();

    try {
        if (parentFolderId) {
            await assertFolderAuthorized(tablesDB, parentFolderId);
        }

        const uniqueName = await getUniqueFolderName(
            tablesDB,
            name,
            parentFolderId || null,
            accountId
        );

        const folder = {
            name: uniqueName,
            accountId,
            owner,
            parentFolderId: parentFolderId || null,
            users: [],
            trashed: false,
        };

        const newFolder = await tablesDB.createRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            rowId: ID.unique(),
            data: folder,
        });

        revalidatePath(path);
        return parseStringify(newFolder);
    } catch (err) {
        console.log("Failed to create folder", err);
        throw err;
    }
};

const createFolderQueries = (
    currentUser: UserRow,
    searchText: string,
    sort: string,
    limit?: number,
    page?: number,
    onlyOwner?: boolean,
    trashed = false,
    parentFolderId?: string | null
) => {
    const userQuery = onlyOwner
        ? Query.equal("owner", [currentUser.$id])
        : Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email]),
        ]);

    const queries = [
        userQuery,
        Query.equal("trashed", [trashed]),
        Query.select(["*", "owner.*"]),
    ];

    if (parentFolderId !== undefined) {
        if (parentFolderId === null) {
            queries.push(Query.isNull("parentFolderId"));
        } else {
            queries.push(Query.equal("parentFolderId", [parentFolderId]));
        }
    }

    if (searchText) {
        queries.push(Query.contains("name", searchText));
    }

    if (sort) {
        const [sortBy, orderBy] = sort.split("-");
        queries.push(
            orderBy === "asc"
                ? Query.orderAsc(sortBy)
                : Query.orderDesc(sortBy)
        );
    }

    if (limit) {
        queries.push(Query.limit(limit));
        if (page && page > 1) {
            queries.push(Query.offset((page - 1) * limit));
        }
    }

    return queries;
};

export const getFolders = async ({
    searchText = "",
    sort = "$createdAt-desc",
    limit,
    page = 1,
    fetchAll,
    onlyOwner,
    trashed = false,
    parentFolderId,
}: {
    searchText?: string;
    sort?: string;
    limit?: number;
    page?: number;
    fetchAll?: boolean;
    onlyOwner?: boolean;
    trashed?: boolean;
    parentFolderId?: string | null;
} = {}) => {
    const { tablesDB } = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error("No user found");

        const isSizeSort = sort.startsWith("size-");
        const dbSort = isSizeSort ? "$createdAt-desc" : sort;

        const listFolders = (queryLimit?: number, queryPage?: number) =>
            tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                queries: createFolderQueries(
                    currentUser,
                    searchText,
                    dbSort,
                    queryLimit,
                    queryPage,
                    onlyOwner,
                    trashed,
                    parentFolderId
                ),
            });

        if (fetchAll) {
            const allRows = [];
            let currentPage = 1;
            let totalCount = 0;

            while (true) {
                const batch = await listFolders(100, currentPage);
                totalCount = batch.total;
                allRows.push(...(batch.rows ?? []));

                if (allRows.length >= totalCount || (batch.rows?.length ?? 0) < 100) {
                    break;
                }
                currentPage += 1;
            }

            if (isSizeSort && allRows.length > 0) {
                const sizePromises = allRows.map(async (folder: any) => ({
                    id: folder.$id,
                    size: await getFolderTotalSize(tablesDB, folder.$id),
                }));
                const sizes = await Promise.all(sizePromises);
                const sizeMap = new Map(sizes.map((s) => [s.id, s.size]));
                const [, order] = sort.split("-");
                allRows.sort((a: any, b: any) => {
                    const sizeA = sizeMap.get(a.$id) ?? 0;
                    const sizeB = sizeMap.get(b.$id) ?? 0;
                    return order === "asc" ? sizeA - sizeB : sizeB - sizeA;
                });
            }

            return parseStringify({ rows: allRows, total: totalCount });
        }

        const folders = await listFolders(limit, page);
        let rows = folders.rows ?? [];

        if (isSizeSort && rows.length > 0) {
            const sizePromises = rows.map(async (folder: any) => ({
                id: folder.$id,
                size: await getFolderTotalSize(tablesDB, folder.$id),
            }));
            const sizes = await Promise.all(sizePromises);
            const sizeMap = new Map(sizes.map((s) => [s.id, s.size]));
            const [, order] = sort.split("-");
            rows.sort((a: any, b: any) => {
                const sizeA = sizeMap.get(a.$id) ?? 0;
                const sizeB = sizeMap.get(b.$id) ?? 0;
                return order === "asc" ? sizeA - sizeB : sizeB - sizeA;
            });
        }

        return parseStringify({
            ...folders,
            rows,
            pagination: limit
                ? {
                    page,
                    limit,
                    total: folders.total,
                    totalPages: Math.ceil(folders.total / limit),
                }
                : undefined,
        });
    } catch (err) {
        console.log("Failed to get folders", err);
        throw err;
    }
};

export const getFolderById = async (folderId: string) => {
    const { tablesDB } = await createAdminClient();

    try {
        await assertFolderAuthorized(tablesDB, folderId);

        const folder = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            rowId: folderId,
        });
        return parseStringify(folder);
    } catch (err) {
        console.log("Failed to get folder", err);
        throw err;
    }
};

export const getFolderAncestors = async (folderId: string): Promise<{ id: string; name: string }[]> => {
    const { tablesDB } = await createAdminClient();
    const ancestors: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;

    try {
        while (currentId) {
            const folder: FolderRow = await tablesDB.getRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                rowId: currentId,
            });

            await assertFolderAuthorized(tablesDB, currentId);

            ancestors.unshift({ id: folder.$id, name: folder.name });
            currentId = folder.parentFolderId ?? null;
        }

        return ancestors;
    } catch (err) {
        console.log("Failed to get folder ancestors", err);
        return ancestors;
    }
};

export const getFolderFileCount = async (folderId: string) => {
    const { tablesDB } = await createAdminClient();

    try {
        await assertFolderAuthorized(tablesDB, folderId);

        const result = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries: [
                Query.equal("folderId", [folderId]),
                Query.equal("trashed", [false]),
            ],
        });
        return result.total;
    } catch (err) {
        console.log("Failed to get folder file count", err);
        return 0;
    }
};

export const getFolderFileCountForMultiple = async (folderIds: string[], trashed = false) => {
    const { tablesDB } = await createAdminClient();
    const counts: Record<string, number> = {};

    const countFilesRecursively = async (folderId: string): Promise<number> => {
        const result = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries: [
                Query.equal("folderId", [folderId]),
                Query.equal("trashed", [trashed]),
            ],
        });
        let total = result.total;

        let subOffset = 0;
        while (true) {
            const subfolders = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                queries: [
                    Query.equal("parentFolderId", [folderId]),
                    Query.equal("trashed", [trashed]),
                    Query.limit(100),
                    Query.offset(subOffset),
                ],
            });

            const subfolderRows = subfolders.rows ?? [];
            for (const subfolder of subfolderRows) {
                total += await countFilesRecursively(subfolder.$id);
            }

            if (subfolderRows.length < 100) break;
            subOffset += 100;
        }

        return total;
    };

    try {
        await Promise.all(
            folderIds.map(async (folderId) => {
                counts[folderId] = await countFilesRecursively(folderId);
            })
        );
        return counts;
    } catch (err) {
        console.log("Failed to get folder file counts", err);
        return counts;
    }
};

const getFolderTotalSize = async (
    tablesDB: TablesDB,
    folderId: string
): Promise<number> => {
    let totalSize = 0;
    let offset = 0;

    while (true) {
        const files = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries: [
                Query.equal("folderId", [folderId]),
                Query.equal("trashed", [false]),
                Query.select(["size"]),
                Query.limit(100),
                Query.offset(offset),
            ],
        });

        for (const file of files.rows ?? []) {
            totalSize += (file as any).size || 0;
        }

        if ((files.rows?.length ?? 0) < 100) break;
        offset += 100;
    }

    let subOffset = 0;
    while (true) {
        const subfolders = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            queries: [
                Query.equal("parentFolderId", [folderId]),
                Query.equal("trashed", [false]),
                Query.limit(100),
                Query.offset(subOffset),
            ],
        });

        const subfolderRows = subfolders.rows ?? [];
        for (const subfolder of subfolderRows) {
            totalSize += await getFolderTotalSize(tablesDB, subfolder.$id);
        }

        if (subfolderRows.length < 100) break;
        subOffset += 100;
    }

    return totalSize;
};

export const getFolderSize = async (folderId: string) => {
    const { tablesDB } = await createAdminClient();

    try {
        await assertFolderAuthorized(tablesDB, folderId);

        return await getFolderTotalSize(tablesDB, folderId);
    } catch (err) {
        console.log("Failed to get folder size", err);
        return 0;
    }
};

export const renameFolder = async ({
    folderId,
    name,
    path,
}: {
    folderId: string;
    name: string;
    path: string;
}) => {
    const { tablesDB } = await createAdminClient();

    try {
        await assertFolderOwner(tablesDB, folderId);

        const updated = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            rowId: folderId,
            data: { name },
        });

        revalidatePath(path);
        return parseStringify(updated);
    } catch (err) {
        console.log("Failed to rename folder", err);
        throw err;
    }
};

export const updateFolderUsers = async ({
    folderId,
    emails,
    path,
}: {
    folderId: string;
    emails: string[];
    path: string;
}) => {
    const { tablesDB } = await createAdminClient();

    try {
        await assertFolderOwner(tablesDB, folderId);

        const updated = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            rowId: folderId,
            data: { users: emails },
        });

        revalidatePath(path);
        return parseStringify(updated);
    } catch (err) {
        console.log("Failed to update folder users", err);
        throw err;
    }
};

const setFoldersTrashed = async (
    folderIds: string[],
    trashed: boolean,
    path: string
) => {
    const { tablesDB } = await createAdminClient();

    await Promise.all(
        folderIds.map((folderId) => assertFolderOwner(tablesDB, folderId))
    );

    const getAllSubfolderIds = async (parentIds: string[]): Promise<string[]> => {
        const allIds: string[] = [];
        if (parentIds.length === 0) return allIds;
        const childIds: string[] = [];
        let offset = 0;
        while (true) {
            const result = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                queries: [
                    Query.equal("parentFolderId", parentIds),
                    Query.limit(100),
                    Query.offset(offset),
                ],
            });
            const rows = result.rows ?? [];
            childIds.push(...rows.map((r: { $id: string }) => r.$id));
            if (rows.length < 100) break;
            offset += 100;
        }
        allIds.push(...childIds);
        if (childIds.length > 0) {
            const nestedIds = await getAllSubfolderIds(childIds);
            allIds.push(...nestedIds);
        }
        return allIds;
    };

    const allFolderIds = [...folderIds];
    const subFolderIds = await getAllSubfolderIds(folderIds);
    allFolderIds.push(...subFolderIds);

    const trashedAt = trashed ? new Date().toISOString() : null;

    await Promise.all(
        allFolderIds.map((folderId) =>
            tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                rowId: folderId,
                data: { trashed, trashedAt },
            })
        )
    );

    for (const folderId of allFolderIds) {
        let offset = 0;
        while (true) {
            const files = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                queries: [
                    Query.equal("folderId", [folderId]),
                    Query.limit(100),
                    Query.offset(offset),
                ],
            });

            const fileRows = files.rows ?? [];
            if (fileRows.length === 0) break;

            await Promise.all(
                fileRows.map((file: any) =>
                    tablesDB.updateRow({
                        databaseId: appwriteConfig.databaseId,
                        tableId: appwriteConfig.filesTableId,
                        rowId: file.$id,
                        data: { trashed, trashedAt },
                    })
                )
            );

            if (fileRows.length < 100) break;
            offset += 100;
        }
    }

    revalidatePath(path);
    revalidatePath("/trash");
    revalidatePath("/");
    revalidatePath("/folders");

    return parseStringify({ status: "success" });
};

export const moveFolderToTrash = async ({
    folderId,
    path,
}: {
    folderId: string;
    path: string;
}) => {
    try {
        return await setFoldersTrashed([folderId], true, path);
    } catch (err) {
        console.log("Failed to move folder to trash", err);
        throw err;
    }
};

export const moveFoldersToTrash = async ({
    folderIds,
    path,
}: {
    folderIds: string[];
    path: string;
}) => {
    try {
        return await setFoldersTrashed(folderIds, true, path);
    } catch (err) {
        console.log("Failed to move folders to trash", err);
        throw err;
    }
};

export const restoreFolder = async ({
    folderId,
    path,
}: {
    folderId: string;
    path: string;
}) => {
    try {
        return await setFoldersTrashed([folderId], false, path);
    } catch (err) {
        console.log("Failed to restore folder", err);
        throw err;
    }
};

export const restoreFolders = async ({
    folderIds,
    path,
}: {
    folderIds: string[];
    path: string;
}) => {
    try {
        return await setFoldersTrashed(folderIds, false, path);
    } catch (err) {
        console.log("Failed to restore folders", err);
        throw err;
    }
};

const deleteFolderAndContents = async (folderIds: string[]) => {
    const { tablesDB, storage } = await createAdminClient();

    await Promise.all(
        folderIds.map((folderId) => assertFolderOwner(tablesDB, folderId))
    );

    // Get all subfolder IDs recursively
    const getAllSubfolderIds = async (parentIds: string[]): Promise<string[]> => {
        const allIds: string[] = [];
        if (parentIds.length === 0) return allIds;

        const result = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            queries: [
                Query.equal("parentFolderId", parentIds),
            ],
        });

        const childIds = (result.rows ?? []).map((r: any) => r.$id);
        allIds.push(...childIds);

        if (childIds.length > 0) {
            const nestedIds = await getAllSubfolderIds(childIds);
            allIds.push(...nestedIds);
        }

        return allIds;
    };

    const allFolderIds = [...folderIds];
    const subFolderIds = await getAllSubfolderIds(folderIds);
    allFolderIds.push(...subFolderIds);

    // Delete all files in these folders from storage and DB
    for (const folderId of allFolderIds) {
        while (true) {
            const files = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                queries: [
                    Query.equal("folderId", [folderId]),
                    Query.limit(100),
                ],
            });
            const fileRows = files.rows ?? [];
            if (fileRows.length === 0) break;
            await Promise.all(
                fileRows.map(async (file: any) => {
                    try {
                        await storage.deleteFile({
                            bucketId: appwriteConfig.bucketId,
                            fileId: file.bucketFileId,
                        });
                    } catch (e) {
                        console.log("Failed to delete file from storage", e);
                    }
                    await tablesDB.deleteRow({
                        databaseId: appwriteConfig.databaseId,
                        tableId: appwriteConfig.filesTableId,
                        rowId: file.$id,
                    });
                })
            );
            if (fileRows.length < 100) break;
        }
    }

    // Delete all folders (deepest first)
    for (const folderId of allFolderIds.reverse()) {
        await tablesDB.deleteRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.foldersTableId,
            rowId: folderId,
        });
    }
};

export const deleteFolder = async ({
    folderId,
    path,
}: {
    folderId: string;
    path: string;
}) => {
    try {
        await deleteFolderAndContents([folderId]);
        revalidatePath(path);
        return parseStringify({ status: "success" });
    } catch (err) {
        console.log("Failed to delete folder", err);
        throw err;
    }
};

export const deleteFolders = async ({
    folderIds,
    path,
}: {
    folderIds: string[];
    path: string;
}) => {
    try {
        await deleteFolderAndContents(folderIds);
        revalidatePath(path);
        return parseStringify({ status: "success" });
    } catch (err) {
        console.log("Failed to delete folders", err);
        throw err;
    }
};

export const getFolderFilesForDownload = async (folderId: string) => {
    const { tablesDB } = await createAdminClient();

    const allFiles: { name: string; url: string }[] = [];

    const getFilesInFolder = async (currentFolderId: string, pathPrefix: string) => {
        let offset = 0;
        while (true) {
            const result = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                queries: [
                    Query.equal("folderId", [currentFolderId]),
                    Query.equal("trashed", [false]),
                    Query.limit(100),
                    Query.offset(offset),
                ],
            });

            const files = result.rows ?? [];
            for (const file of files) {
                allFiles.push({
                    name: pathPrefix ? `${pathPrefix}/${file.name}` : file.name,
                    url: file.url,
                });
            }

            if (files.length < 100) break;
            offset += 100;
        }

        // Get subfolders
        let subOffset = 0;
        while (true) {
            const subfolders = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                queries: [
                    Query.equal("parentFolderId", [currentFolderId]),
                    Query.equal("trashed", [false]),
                    Query.limit(100),
                    Query.offset(subOffset),
                ],
            });

            const subfolderRows = subfolders.rows ?? [];
            for (const subfolder of subfolderRows) {
                const subPath = pathPrefix ? `${pathPrefix}/${subfolder.name}` : subfolder.name;
                await getFilesInFolder(subfolder.$id, subPath);
            }

            if (subfolderRows.length < 100) break;
            subOffset += 100;
        }
    };

    try {
        await assertFolderAuthorized(tablesDB, folderId);

        await getFilesInFolder(folderId, "");
        return parseStringify(allFiles);
    } catch (err) {
        console.log("Failed to get folder files for download", err);
        throw err;
    }
};
