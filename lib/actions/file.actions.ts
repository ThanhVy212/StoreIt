'use server';

import {createAdminClient} from "@/lib/appwrite";
import {InputFile} from "node-appwrite/file";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Permission, Query, Role} from "node-appwrite";
import {constructFileUrl, formatFileName, getFileType, parseStringify, sanitizeFileName} from "@/lib/utils";
import {revalidatePath} from "next/cache";
import {getCurrentUser, getUserByEmail} from "@/lib/actions/user.actions";
import {UserRow} from "@/types/db.types";

const getFileById = async (fileId: string) => {
    const { tablesDB } = await createAdminClient();
    return tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesTableId,
        rowId: fileId,
    });
};

const assertFileAuthenticated = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Authentication required.");
    }
    return currentUser;
};

const assertFileOwner = async (fileId: string, currentUser: UserRow) => {
    const file = await getFileById(fileId);
    if (file.accountId !== currentUser.$id) {
        throw new Error("You are not allowed to modify this file.");
    }
    return file;
};

const buildOwnerPermissions = (ownerAccountId: string) => [
    Permission.read(Role.user(ownerAccountId)),
    Permission.update(Role.user(ownerAccountId)),
    Permission.delete(Role.user(ownerAccountId)),
];

const buildSharePermissions = (ownerAccountId: string, sharedAccountIds: string[]) => [
    ...buildOwnerPermissions(ownerAccountId),
    ...sharedAccountIds.map((id) => Permission.read(Role.user(id))),
];

const resolveAccountIds = async (emails: string[]): Promise<string[]> => {
    const accountIds: string[] = [];
    for (const email of emails) {
        const user = await getUserByEmail(email);
        if (user) {
            accountIds.push(user.$id);
        }
    }
    return accountIds;
};

export const uploadFile = async ({file, ownerId, accountId, path, folderId}: UploadFileProps) => {
    const currentUser = await assertFileAuthenticated();
    const { storage, tablesDB } = await createAdminClient();

    try {
        const inputFile = InputFile.fromBuffer(file, file.name);

        const permissions = buildOwnerPermissions(currentUser.$id);

        const bucketFile = await storage.createFile({
            bucketId: appwriteConfig.bucketId,
            fileId: ID.unique(),
            file: inputFile,
            permissions,
        });

        const fileName = sanitizeFileName(bucketFile.name);
        const {type, extension} = getFileType(fileName);

        const fileDocument = {
            type,
            name: fileName,
            url: constructFileUrl(bucketFile.$id),
            extension,
            size: bucketFile.sizeOriginal,
            owner: ownerId,
            accountId,
            users: [],
            bucketFileId: bucketFile.$id,
            trashed: false,
            folderId: folderId || null,
        }

        const newFile = await tablesDB
            .createRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                rowId: ID.unique(),
                data: fileDocument,
            })
            .catch(async (err: unknown) => {
                await storage.deleteFile({
                    bucketId: appwriteConfig.bucketId,
                    fileId: bucketFile.$id,
                });

                console.log("Failed to create file row");
                throw err;
            });

        revalidatePath(path);

        return parseStringify(newFile);
    } catch (err) {
        console.log('Failed to upload file', err);
        throw err;
    }
}

export const saveFileRecord = async ({
    bucketFileId,
    name,
    size,
    ownerId,
    accountId,
    path,
    folderId,
}: SaveFileRecordProps) => {
    const currentUser = await assertFileAuthenticated();
    const { storage, tablesDB } = await createAdminClient();

    try {
        const permissions = buildOwnerPermissions(currentUser.$id);

        await storage.updateFile({
            bucketId: appwriteConfig.bucketId,
            fileId: bucketFileId,
            permissions,
        });

        const fileName = sanitizeFileName(name);
        const { type, extension } = getFileType(fileName);

        const fileDocument = {
            type,
            name: fileName,
            url: constructFileUrl(bucketFileId),
            extension,
            size,
            owner: ownerId,
            accountId,
            users: [],
            bucketFileId,
            trashed: false,
            folderId: folderId || null,
        };

        const newFile = await tablesDB
            .createRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                rowId: ID.unique(),
                data: fileDocument,
            })
            .catch(async (err: unknown) => {
                await storage.deleteFile({
                    bucketId: appwriteConfig.bucketId,
                    fileId: bucketFileId,
                });

                console.log("Failed to create file row");
                throw err;
            });

        revalidatePath(path);

        return parseStringify(newFile);
    } catch (err) {
        console.log('Failed to save file record', err);
        throw err;
    }
}

const createQueries = (
    currentUser: UserRow,
    types: string[],
    searchText: string,
    sort: string,
    limit?: number,
    page?: number,
    onlyOwner?: boolean,
    trashed = false,
    folderId?: string | null
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
        Query.select([
            "*",
            "owner.*",
        ]),
    ];

    if (types.length > 0) {
        queries.push(Query.equal("type", types));
    }

    if (folderId === null) {
        queries.push(Query.isNull("folderId"));
    } else if (folderId !== undefined) {
        queries.push(Query.equal("folderId", [folderId]));
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

const FILES_BATCH_SIZE = 100;

export const getFiles = async ({types = [], searchText = "", sort = "$createdAt-desc", limit, page = 1, fetchAll, onlyOwner, trashed = false, folderId}: GetFilesProps) => {
    const {tablesDB} = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();

        if(!currentUser) {
            throw new Error("No user found");
        }

        const listFiles = (queryLimit?: number, queryPage?: number) =>
            tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                queries: createQueries(
                    currentUser,
                    types,
                    searchText,
                    sort,
                    queryLimit,
                    queryPage,
                    onlyOwner,
                    trashed,
                    folderId
                ),
            });

        if (fetchAll) {
            const allRows = [];
            let currentPage = 1;
            let totalCount = 0;

            while (true) {
                const batch = await listFiles(FILES_BATCH_SIZE, currentPage);
                totalCount = batch.total;
                allRows.push(...(batch.rows ?? []));

                if (allRows.length >= totalCount || (batch.rows?.length ?? 0) < FILES_BATCH_SIZE) {
                    break;
                }

                currentPage += 1;
            }

            return parseStringify({
                rows: allRows,
                total: totalCount,
            });
        }

        const files = await listFiles(limit, page);
        const totalCount = files.total;

        return parseStringify({
            ...files,
            pagination: limit
                ? {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                }
                : undefined,
        });
    } catch (err) {
        console.log('Failed to get files', err);
        throw err;
    }
}

export const renameFile = async({fileId, name, extension, path}: RenameFileProps) => {
    const currentUser = await assertFileAuthenticated();
    await assertFileOwner(fileId, currentUser);
    const {tablesDB} = await createAdminClient();

    try {
        const newName = formatFileName(name, extension);

        const updatedFile = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
            data: {
                name: newName,
            },
        });

        revalidatePath(path);
        return parseStringify(updatedFile);
    } catch (err) {
        console.log('Failed to rename file', err);
        throw err;
    }
}

export const updateFileUsers = async ({fileId, emails, path}: UpdateFileUsersProps) => {
    const currentUser = await assertFileAuthenticated();
    const file = await assertFileOwner(fileId, currentUser);

    const { tablesDB, storage } = await createAdminClient();

    try {
        const sharedAccountIds = await resolveAccountIds(emails);

        const storagePermissions = buildSharePermissions(currentUser.$id, sharedAccountIds);

        await storage.updateFile({
            bucketId: appwriteConfig.bucketId,
            fileId: file.bucketFileId as string,
            permissions: storagePermissions,
        });

        const updatedFile = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
            data: {
                users: emails,
            },
        });

        revalidatePath(path);

        return parseStringify(updatedFile);
    } catch (err) {
        console.log('Failed to update file users', err);
        throw err;
    }
};

export const unshareFileForMe = async ({fileId, path}: {fileId: string; path: string}) => {
    const currentUser = await assertFileAuthenticated();

    const { tablesDB, storage } = await createAdminClient();

    try {
        const file = await getFileById(fileId);

        const isOwner = file.accountId === currentUser.$id;
        const currentUsers = (file.users as string[]) || [];

        if (isOwner) {
            throw new Error("Owner cannot unshare their own file. Use revoke access instead.");
        }

        if (!currentUsers.includes(currentUser.email)) {
            throw new Error("You are not a recipient of this file.");
        }

        const updatedUsers = currentUsers.filter((email: string) => email !== currentUser.email);

        const updatedFile = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
            data: {
                users: updatedUsers,
            },
        });

        const ownerAccountId = file.accountId as string;
        const remainingAccountIds = await resolveAccountIds(updatedUsers);
        const storagePermissions = buildSharePermissions(ownerAccountId, remainingAccountIds);

        await storage.updateFile({
            bucketId: appwriteConfig.bucketId,
            fileId: file.bucketFileId as string,
            permissions: storagePermissions,
        });

        revalidatePath(path);

        return parseStringify(updatedFile);
    } catch (err) {
        console.log('Failed to unshare file', err);
        throw err;
    }
};

const setFilesTrashed = async (fileIds: string[], trashed: boolean, path: string) => {
    const currentUser = await assertFileAuthenticated();
    const { tablesDB } = await createAdminClient();

    const files = await Promise.all(
        fileIds.map((fileId) => getFileById(fileId))
    );

    for (const file of files) {
        if (file.accountId !== currentUser.$id) {
            throw new Error("You are not allowed to modify this file.");
        }
    }

    await Promise.all(
        fileIds.map((fileId) =>
            tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                rowId: fileId,
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

export const moveFileToTrash = async ({ fileId, path }: TrashFileProps) => {
    try {
        return await setFilesTrashed([fileId], true, path);
    } catch (err) {
        console.log("Failed to move file to trash", err);
        throw err;
    }
};

export const moveFilesToTrash = async ({ fileIds, path }: TrashFilesProps) => {
    try {
        return await setFilesTrashed(fileIds, true, path);
    } catch (err) {
        console.log("Failed to move files to trash", err);
        throw err;
    }
};

export const restoreFile = async ({ fileId, path }: TrashFileProps) => {
    try {
        return await setFilesTrashed([fileId], false, path);
    } catch (err) {
        console.log("Failed to restore file", err);
        throw err;
    }
};

export const restoreFiles = async ({ fileIds, path }: TrashFilesProps) => {
    try {
        return await setFilesTrashed(fileIds, false, path);
    } catch (err) {
        console.log("Failed to restore files", err);
        throw err;
    }
};

export const deleteFile = async ({fileId, bucketFileId, path}: DeleteFileProps) => {
    const currentUser = await assertFileAuthenticated();
    await assertFileOwner(fileId, currentUser);

    const { tablesDB, storage } = await createAdminClient();

    try {
        await tablesDB.deleteRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
        });

        await storage.deleteFile({
            bucketId: appwriteConfig.bucketId,
            fileId: bucketFileId,
        });

        revalidatePath(path);

        return parseStringify({
            status: "success",
        });
    } catch (err) {
        console.log('Failed to delete file', err);
        throw err;
    }
};

export const deleteFiles = async ({files, path,}: DeleteFilesProps) => {
    const currentUser = await assertFileAuthenticated();
    const { tablesDB, storage } = await createAdminClient();

    try {
        const fileRecords = await Promise.all(
            files.map((f) => getFileById(f.fileId))
        );

        for (const file of fileRecords) {
            if (file.accountId !== currentUser.$id) {
                throw new Error("You are not allowed to delete this file.");
            }
        }

        const deletePromises = files.map(async ({ fileId, bucketFileId }) => {
            await tablesDB.deleteRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                rowId: fileId,
            });

            await storage.deleteFile({
                bucketId: appwriteConfig.bucketId,
                fileId: bucketFileId,
            });
        });

        await Promise.all(deletePromises);
        revalidatePath(path);

        return parseStringify({ status: "success" });
    } catch (err) {
        console.log('Failed to delete files', err);
        throw err;
    }
};

export const getTotalSpaceUsed = async () => {
    try {
        const { tablesDB } = await createAdminClient();
        const currentUser = await getCurrentUser();
        if (!currentUser) throw new Error("User is not authenticated.");

        const files = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries: [
                Query.equal("owner", [currentUser.$id]),
            ],
        });

        const totalSpace = {
            image: { size: 0, latestDate: "" },
            document: { size: 0, latestDate: "" },
            video: { size: 0, latestDate: "" },
            other: { size: 0, latestDate: "" },
            used: 0,
            all: 2 * 1024 * 1024 * 1024, // 2GB in bytes
        };

        files.rows.forEach((file: any) => {
            const fileType = (file.type === 'audio' ? 'other' : file.type) as 'image' | 'document' | 'video' | 'other';
            const fileSize = file.size || 0;

            if (totalSpace[fileType]) {
                totalSpace[fileType].size += fileSize;

                if (
                    !totalSpace[fileType].latestDate ||
                    new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
                ) {
                    totalSpace[fileType].latestDate = file.$updatedAt;
                }
            }

            totalSpace.used += fileSize;
        });

        return parseStringify(totalSpace);
    } catch (error) {
        console.log("Error calculating total space used:", error);
        return {
            image: { size: 0, latestDate: "" },
            document: { size: 0, latestDate: "" },
            video: { size: 0, latestDate: "" },
            other: { size: 0, latestDate: "" },
            used: 0,
            all: 2 * 1024 * 1024 * 1024,
        };
    }
};

export const createPublicFileLink = async ({ fileId, expiresIn, path }: CreatePublicLinkProps) => {
    const currentUser = await assertFileAuthenticated();
    const file = await assertFileOwner(fileId, currentUser);

    const { tokens, tablesDB } = await createAdminClient();

    try {
        // Revoke any existing active links for this file to ensure single active fresh token
        const existingLinks = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.fileLinksTableId,
            queries: [
                Query.equal("bucketFileId", [file.bucketFileId as string]),
                Query.equal("revoked", [false]),
            ],
        });

        for (const oldLink of existingLinks.rows) {
            await tokens.delete({ tokenId: oldLink.tokenId }).catch(() => {});
            await tablesDB
                .updateRow({
                    databaseId: appwriteConfig.databaseId,
                    tableId: appwriteConfig.fileLinksTableId,
                    rowId: oldLink.$id,
                    data: { revoked: true },
                })
                .catch(() => {});
        }

        const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

        const token = await tokens.createFileToken({
            bucketId: appwriteConfig.bucketId,
            fileId: file.bucketFileId as string,
            expire: expiresAt.toISOString(),
        });

        const linkRow = {
            fileId: [fileId],
            bucketFileId: file.bucketFileId,
            tokenId: token.$id,
            createdBy: currentUser.$id,
            expiresAt: expiresAt.toISOString(),
            revoked: false,
        };

        await tablesDB.createRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.fileLinksTableId,
            rowId: ID.unique(),
            data: linkRow,
        });

        const publicPath = `/api/files/${file.bucketFileId}?token=${token.$id}`;

        revalidatePath(path);

        return parseStringify({
            tokenId: token.$id,
            expiresAt: expiresAt.toISOString(),
            url: publicPath,
            bucketFileId: file.bucketFileId,
        });
    } catch (err) {
        console.log('Failed to create public file link', err);
        throw err;
    }
};

export const revokePublicFileLink = async ({ fileId, tokenId, path }: RevokePublicLinkProps) => {
    const currentUser = await assertFileAuthenticated();
    const file = await assertFileOwner(fileId, currentUser);

    const { tokens, tablesDB } = await createAdminClient();

    try {
        const links = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.fileLinksTableId,
            queries: [
                Query.equal("tokenId", [tokenId]),
                Query.equal("bucketFileId", [file.bucketFileId as string]),
            ],
        });

        const link = links.rows[0];
        if (!link) {
            throw new Error("Link not found.");
        }

        await tokens.delete({
            tokenId,
        }).catch(() => {});

        await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.fileLinksTableId,
            rowId: link.$id,
            data: { revoked: true },
        });

        revalidatePath(path);

        return parseStringify({ status: "success" });
    } catch (err) {
        console.log('Failed to revoke public file link', err);
        throw err;
    }
};

export const getFilePublicLinks = async (fileId: string) => {
    const currentUser = await assertFileAuthenticated();
    const file = await getFileById(fileId);

    if (file.accountId !== currentUser.$id) {
        throw new Error("You are not allowed to view links for this file.");
    }

    const { tablesDB } = await createAdminClient();

    try {
        const links = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.fileLinksTableId,
            queries: [
                Query.equal("bucketFileId", [file.bucketFileId as string]),
                Query.equal("revoked", [false]),
                Query.orderDesc("$createdAt"),
            ],
        });

        const result = links.rows.map((link: any) => ({
            tokenId: link.tokenId,
            expiresAt: link.expiresAt,
            url: `/api/files/${file.bucketFileId}?token=${link.tokenId}`,
            bucketFileId: file.bucketFileId,
            $createdAt: link.$createdAt,
        }));

        return parseStringify(result);
    } catch (err) {
        console.log('Failed to get file public links', err);
        throw err;
    }
};
