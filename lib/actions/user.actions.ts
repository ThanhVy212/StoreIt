'use server';

import {createAdminClient, createSessionClient} from "@/lib/appwrite";
import {appwriteConfig} from "@/lib/appwrite/config";
import {ID, Permission, Query, Role} from "node-appwrite";
import {InputFile} from "node-appwrite/file";
import {constructFileUrl, extractBucketFileId, parseStringify} from "@/lib/utils";
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

export const updateUser = async ({
    fullName,
    avatar,
}: {
    fullName?: string;
    avatar?: string;
}) => {
    try {
        const { account } = await createSessionClient();
        const user = await getCurrentUser();

        if (!user) throw new Error("User not found");

        const updateData: Record<string, string> = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (avatar !== undefined) updateData.avatar = avatar;

        await account.updateName({ name: fullName || user.fullName });

        try {
            const { tablesDB } = await createAdminClient();
            await tablesDB.updateRow({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.usersTableId,
                rowId: user.$id,
                data: updateData,
            });
        } catch (dbErr) {
            await account.updateName({ name: user.fullName }).catch(() => {});
            throw dbErr;
        }

        return parseStringify({ success: true });
    } catch (err) {
        console.log("Failed to update user:", err);
        return parseStringify({
            success: false,
            error: err instanceof Error ? err.message : "Failed to update user.",
        });
    }
};

export const uploadAvatar = async ({
    file,
}: {
    file: File;
}) => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        throw new Error("Authentication required.");
    }

    const { storage } = await createAdminClient();

    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `avatar/${currentUser.$id}.${extension}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const inputFile = InputFile.fromBuffer(buffer, fileName);

    const permissions = [
        Permission.read(Role.any()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
    ];

    let bucketFile: Awaited<ReturnType<typeof storage.createFile>> | null = null;
    try {
        bucketFile = await storage.createFile({
            bucketId: appwriteConfig.bucketId,
            fileId: ID.unique(),
            file: inputFile,
            permissions,
        });

        const avatarUrl = constructFileUrl(bucketFile.$id);

        const updateResult = await updateUser({ avatar: avatarUrl });
        if (!updateResult.success) {
            await storage.deleteFile({
                bucketId: appwriteConfig.bucketId,
                fileId: bucketFile.$id,
            }).catch(() => {});
            throw new Error(updateResult.error || "Failed to update profile.");
        }

        if (currentUser.avatar) {
            const oldFileId = extractBucketFileId(currentUser.avatar);
            if (oldFileId && oldFileId !== bucketFile.$id) {
                await storage.deleteFile({
                    bucketId: appwriteConfig.bucketId,
                    fileId: oldFileId,
                }).catch(() => {});
            }
        }

        return parseStringify({ url: avatarUrl, bucketFileId: bucketFile.$id });
    } catch (err) {
        if (bucketFile) {
            await storage.deleteFile({
                bucketId: appwriteConfig.bucketId,
                fileId: bucketFile.$id,
            }).catch(() => {});
        }
        console.log("Failed to upload avatar:", err);
        return parseStringify({
            url: null,
            error: err instanceof Error ? err.message : "Failed to upload avatar.",
        });
    }
};

export const getAppwriteJWT = async () => {
    try {
        const session = (await cookies()).get("appwrite-session");
        if (!session?.value) {
            return null;
        }

        const res = await fetch(`${appwriteConfig.endpointUrl}/account/jwt`, {
            method: "POST",
            signal: AbortSignal.timeout(10_000),
            headers: {
                "Content-Type": "application/json",
                "X-Appwrite-Project": appwriteConfig.projectId,
                "X-Appwrite-Session": session.value,
            },
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("Failed to create Appwrite JWT:", err);
            return null;
        }

        const data = (await res.json()) as { jwt: string };
        return data.jwt;
    } catch (err) {
        console.error("Failed to create Appwrite JWT:", err);
        return null;
    }
};

