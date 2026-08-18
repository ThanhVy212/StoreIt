'use server';

import {createAdminClient} from "@/lib/appwrite";
import {InputFile} from "node-appwrite/file";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Query} from "node-appwrite";
import {constructFileUrl, getFileType, parseStringify} from "@/lib/utils";
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

        const fileDocument = {
            type: getFileType(bucketFile.name).type,
            name: bucketFile.name,
            url: constructFileUrl(bucketFile.$id),
            extension: getFileType(bucketFile.name).extension,
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

const createQueries = (currentUser: UserRow, types: string[], searchText: string, sort: string, limit?: number) => {
    const queries = [
        Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email]),
        ]),
    ];

    if(types.length >= 0) {
        queries.push(Query.equal("type", types));
    }

    if(searchText) {
        queries.push(Query.contains("name", searchText));
    }

    if(sort) {
        const [sortBy, orderBy] = sort.split("-");

        queries.push(
            orderBy === "asc"
                ? Query.orderAsc(sortBy)
                : Query.orderDesc(sortBy),
        );
    }

    if(limit) {
        queries.push(Query.limit(limit));
    }

    return queries;
}

export const getFiles = async ({types = [], searchText = "", sort = "$createdAt-desc", limit}: GetFilesProps) => {
    const {tablesDB} = await createAdminClient();

    try {
        const currentUser = await getCurrentUser();

        if(!currentUser) {
            throw new Error("No user found");
        }

        const queries = createQueries(currentUser, types, searchText, sort, limit);

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