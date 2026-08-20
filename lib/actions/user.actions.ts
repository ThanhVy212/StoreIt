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
    try {
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return parseStringify({ accountId: null, error: "An account with this email already exists. Please sign in." });
        }

        const accountId = await sendEmailOTP({ email });

        if (!accountId) {
            return parseStringify({ accountId: null, error: "Failed to send an OTP. Please try again." });
        }

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

        return parseStringify({ accountId });
    } catch (err) {
        console.log("Failed to create account:", err);
        return parseStringify({
            accountId: null,
            error: err instanceof Error ? err.message : "Failed to create account.",
        });
    }
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
        return parseStringify({
            sessionId: null,
            error: err instanceof Error ? err.message : "Failed to verify OTP",
        });
    }
}

export const getCurrentUser = async () => {
    try {
        const { account } = await createSessionClient();

        const result = await account.get();

        const user = await getUserByEmail(result.email);
        if (!user) return null;

        return parseStringify({
            ...user,
            accountId: result.$id,
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
            const accountId = await sendEmailOTP({ email });
            return parseStringify({ accountId });
        }

        return parseStringify({ accountId: null, error: "No account found with this email. Please sign up first." });

    } catch (err) {
        console.log("Failed to Sign in user:", err);
        return parseStringify({
            accountId: null,
            error: err instanceof Error ? err.message : "Failed to sign in.",
        });
    }
}