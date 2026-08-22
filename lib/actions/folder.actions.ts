'use server';

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Query } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { UserRow } from "@/types/db.types";

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
        const folder = {
            name,
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

        const listFolders = (queryLimit?: number, queryPage?: number) =>
            tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                queries: createFolderQueries(
                    currentUser,
                    searchText,
                    sort,
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

            return parseStringify({ rows: allRows, total: totalCount });
        }

        const folders = await listFolders(limit, page);
        return parseStringify({
            ...folders,
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

export const getFolderFileCount = async (folderId: string) => {
    const { tablesDB } = await createAdminClient();

    try {
        const result = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries: [
                Query.equal("folderId", [folderId]),
                Query.equal("trashed", [false]),
                Query.limit(0),
            ],
        });
        return result.total;
    } catch (err) {
        console.log("Failed to get folder file count", err);
        return 0;
    }
};

export const getFolderFileCountForMultiple = async (folderIds: string[]) => {
    const { tablesDB } = await createAdminClient();
    const counts: Record<string, number> = {};

    try {
        await Promise.all(
            folderIds.map(async (folderId) => {
                const result = await tablesDB.listRows({
                    databaseId: appwriteConfig.databaseId,
                    tableId: appwriteConfig.filesTableId,
                    queries: [
                        Query.equal("folderId", [folderId]),
                        Query.equal("trashed", [false]),
                        Query.limit(0),
                    ],
                });
                counts[folderId] = result.total;
            })
        );
        return counts;
    } catch (err) {
        console.log("Failed to get folder file counts", err);
        return counts;
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
        folderIds.map((folderId) =>
            tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.foldersTableId,
                rowId: folderId,
                data: { trashed },
            })
        )
    );

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
            offset += 100;
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
        await getFilesInFolder(folderId, "");
        return parseStringify(allFiles);
    } catch (err) {
        console.log("Failed to get folder files for download", err);
        throw err;
    }
};
