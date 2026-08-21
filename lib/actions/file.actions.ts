'use server';

import {createAdminClient} from "@/lib/appwrite";
import {InputFile} from "node-appwrite/file";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Query} from "node-appwrite";
import {constructFileUrl, formatFileName, getFileType, parseStringify, sanitizeFileName} from "@/lib/utils";
import {revalidatePath} from "next/cache";
import {getCurrentUser} from "@/lib/actions/user.actions";
import {UserRow} from "@/types/db.types";

export const uploadFile = async ({file, ownerId, accountId, path}: UploadFileProps) => {
    const { storage, tablesDB } = await createAdminClient();

    try {
        const inputFile = InputFile.fromBuffer(file, file.name);

        const bucketFile = await storage.createFile({
            bucketId: appwriteConfig.bucketId,
            fileId: ID.unique(),
            file: inputFile,
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
}: SaveFileRecordProps) => {
    const { storage, tablesDB } = await createAdminClient();

    try {
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
    trashed = false
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

export const getFiles = async ({types = [], searchText = "", sort = "$createdAt-desc", limit, page = 1, fetchAll, onlyOwner, trashed = false}: GetFilesProps) => {
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
                    trashed
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
    const { tablesDB } = await createAdminClient();

    try {
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

export const unshareFileForMe = async ({fileId, currentUserEmail, path}: {fileId: string; currentUserEmail: string; path: string}) => {
    const { tablesDB } = await createAdminClient();

    try {
        const file = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
        });

        const currentUsers = (file.users as string[]) || [];
        const updatedUsers = currentUsers.filter((email: string) => email !== currentUserEmail);

        const updatedFile = await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            rowId: fileId,
            data: {
                users: updatedUsers,
            },
        });

        revalidatePath(path);

        return parseStringify(updatedFile);
    } catch (err) {
        console.log('Failed to unshare file', err);
        throw err;
    }
};

const setFilesTrashed = async (fileIds: string[], trashed: boolean, path: string) => {
    const { tablesDB } = await createAdminClient();

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
    const { tablesDB, storage } = await createAdminClient();

    try {
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
            audio: { size: 0, latestDate: "" },
            other: { size: 0, latestDate: "" },
            used: 0,
            all: 2 * 1024 * 1024 * 1024, // 2GB in bytes
        };

        files.rows.forEach((file: any) => {
            const fileType = file.type as FileType;
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
            audio: { size: 0, latestDate: "" },
            other: { size: 0, latestDate: "" },
            used: 0,
            all: 2 * 1024 * 1024 * 1024,
        };
    }
};