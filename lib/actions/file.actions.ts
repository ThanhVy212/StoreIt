'use server';

import {createAdminClient} from "@/lib/appwrite";
import {InputFile} from "node-appwrite/file";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID} from "node-appwrite";
import {constructFileUrl, getFileType, parseStringify} from "@/lib/utils";
import {revalidatePath} from "next/cache";

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