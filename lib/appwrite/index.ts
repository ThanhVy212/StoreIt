'use server';

import {appwriteConfig} from "@/lib/appwrite/config";
import {Account, Avatars, Client, Storage, TablesDB} from "node-appwrite";
import {cookies} from "next/headers";

export const createSessionClient = async () => {
    const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId);

    const session = (await cookies()).get("appwrite-session");

    if (!session?.value) {
        throw new Error("No session");
    }

    client.setSession(session.value);

    return {
        get account() {
            return new Account(client);
        },
        get tablesDB() {
            return new TablesDB(client);
        },
    };
};

export const createAdminClient = async () => {
    const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId)
        .setKey(appwriteConfig.secretKey);

    return {
        get account() {
            return new Account(client);
        },
        get tablesDB() {
            return new TablesDB(client);
        },
        get storage() {
            return new Storage(client);
        },
        get avatars() {
            return new Avatars(client);
        },
    };
};


