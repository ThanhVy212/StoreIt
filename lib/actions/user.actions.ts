'use server';

import {createAdminClient, createSessionClient} from "@/lib/appwrite";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Query} from "node-appwrite";
import {parseStringify} from "@/lib/utils";
import {cookies} from "next/headers";
import {avatarPlaceholderUrl} from "@/constants";
import {redirect} from "next/navigation";

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
                avatar: avatarPlaceholderUrl,
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

export const getCurrentUser = async () => {
    try {
        const { tablesDB, account } = await createSessionClient();

        const result = await account.get();

        const user = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.usersTableId,
            rowId: result.$id,
        });

        return parseStringify({
            ...user,
            accountId: user.$id,
        });
    } catch (err) {
        console.log("Failed to get current user:", err);
        return null;
    }
};

export const signOutUser = async () => {
    const {account} = await createSessionClient();

    try {
        await account.deleteSession({
            sessionId: "current",
        });
        (await cookies()).delete("appwrite-session");
    } catch (err) {
        console.log("Error logging out:", err);
    } finally {
        redirect("/sign-in")
    }
}

export const signInUser = async ({email}: {email: string}) => {
    try {
        const existingUser = await getUserByEmail(email);

        if(existingUser) {
            await sendEmailOTP({ email });
            return parseStringify({ accountId: existingUser.$id });
        }

        return parseStringify({ accountId: null, errors: 'User not found' });

    } catch (err) {
        console.log("Failed to Sign in user:", err);
        throw err;
    }
}