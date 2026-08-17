'use server';

import {createAdminClient} from "@/lib/appwrite";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Query} from "node-appwrite";
import {parseStringify} from "@/lib/utils";
import {cookies} from "next/headers";

export const getUserByEmail = async (email: string) => {
    const { tablesDB } = await createAdminClient();

    const result = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.usersTableId,
        queries: [
            Query.equal("email", email),
        ],
    });

    return result.rows[0] ?? null;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
    const { account } = await createAdminClient();

    try {
        const token = await account.createEmailToken({
            userId: ID.unique(),
            email,
        });

        return token.userId;
    } catch (err) {
        console.log("Failed to send email OTP:", err);
        throw err;
    }
};

export const createAccount = async ({fullName, email,}: { fullName: string; email: string; }) => {
    const existingUser = await getUserByEmail(email);

    const accountId = await sendEmailOTP({ email });

    if (!accountId) {
        throw new Error("Failed to send an OTP");
    }

    if (!existingUser) {
        const { tablesDB } = await createAdminClient();

        await tablesDB.createRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.usersTableId,
            rowId: accountId,
            data: {
                fullName,
                email,
                avatar: "https://png.pngtree.com/png-vector/20210604/ourmid/pngtree-gray-avatar-placeholder-png-image_3416697.jpg",
            },
        });
    }

    return parseStringify({ accountId });
};

export const verifySecret = async ({ accountId, password }: {accountId: string, password: string}) => {
    try {
        const {account} = await createAdminClient();

        const session = await account.createSession({
            userId: accountId,
            secret: password,
        });

        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify({ sessionId: session.$id });
    } catch (err) {
        console.log("Failed to verify OTP:", err);
        throw err;
    }
}