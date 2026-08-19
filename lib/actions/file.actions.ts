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

const createQueries = (
    currentUser: UserRow,
    types: string[],
    searchText: string,
    sort: string,
    limit?: number,
    onlyOwner?: boolean
) => {
    const userQuery = onlyOwner
        ? Query.equal("owner", [currentUser.$id])
        : Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email]),
        ]);

    const queries = [
        userQuery,
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
    }

    return queries;
};

export const getFiles = async ({types = [], searchText = "", sort = "$createdAt-desc", limit, onlyOwner}: GetFilesProps) => {
    const {tablesDB} = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();

        if(!currentUser) {
            throw new Error("No user found");
        }

        const queries = createQueries(currentUser, types, searchText, sort, limit, onlyOwner);

        const files = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.filesTableId,
            queries,
        });

        return parseStringify(files);
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