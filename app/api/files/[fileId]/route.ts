import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { Query } from "node-appwrite";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";
    const token = searchParams.get("token") || undefined;

    if (!fileId) {
        return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    try {
        const { storage, tablesDB } = await createAdminClient();

        let bucketFileId = fileId;
        let fileDoc: any = null;

        // Try looking up the file record in DB by bucketFileId or rowId
        try {
            const filesByBucket = await tablesDB.listRows({
                databaseId: appwriteConfig.databaseId,
                tableId: appwriteConfig.filesTableId,
                queries: [Query.equal("bucketFileId", fileId)],
            });

            if (filesByBucket.rows.length > 0) {
                fileDoc = filesByBucket.rows[0];
                bucketFileId = fileDoc.bucketFileId;
            } else {
                const row = await tablesDB
                    .getRow({
                        databaseId: appwriteConfig.databaseId,
                        tableId: appwriteConfig.filesTableId,
                        rowId: fileId,
                    })
                    .catch(() => null);
                if (row) {
                    fileDoc = row;
                    bucketFileId = (row as any).bucketFileId || fileId;
                }
            }
        } catch (dbErr) {
            console.error("DB lookup warning:", dbErr);
        }

        // Check authentication & permissions
        if (token) {
            // Verify public share link in Database
            const linkResults = await tablesDB
                .listRows({
                    databaseId: appwriteConfig.databaseId,
                    tableId: appwriteConfig.fileLinksTableId,
                    queries: [Query.equal("tokenId", [token])],
                })
                .catch(() => ({ rows: [] }));

            const link = linkResults.rows[0];
            if (!link || link.revoked) {
                return NextResponse.json(
                    { error: "This public link is invalid or has been revoked." },
                    { status: 403 }
                );
            }

            if (new Date(link.expiresAt) < new Date()) {
                return NextResponse.json(
                    { error: "This public link has expired." },
                    { status: 410 }
                );
            }
        } else {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
            }

            if (fileDoc) {
                const ownerId = typeof fileDoc.owner === "object" ? fileDoc.owner?.$id : fileDoc.owner;
                const isOwner =
                    fileDoc.accountId === currentUser.$id ||
                    ownerId === currentUser.$id ||
                    fileDoc.owner?.email === currentUser.email;

                const isShared =
                    Array.isArray(fileDoc.users) &&
                    fileDoc.users.some(
                        (u: any) =>
                            u === currentUser.email ||
                            u === currentUser.$id ||
                            (typeof u === "object" && (u?.email === currentUser.email || u?.$id === currentUser.$id))
                    );

                if (!isOwner && !isShared) {
                    return NextResponse.json(
                        { error: "Forbidden: You do not have permission to access this file" },
                        { status: 403 }
                    );
                }
            }
        }

        // Fetch file metadata from storage
        const fileMetadata = await storage.getFile({
            bucketId: appwriteConfig.bucketId,
            fileId: bucketFileId,
        });

        // Fetch file binary buffer from storage
        const arrayBuffer = isDownload
            ? await storage.getFileDownload({
                  bucketId: appwriteConfig.bucketId,
                  fileId: bucketFileId,
                  token,
              })
            : await storage.getFileView({
                  bucketId: appwriteConfig.bucketId,
                  fileId: bucketFileId,
                  token,
              });

        const headers = new Headers();
        headers.set("Content-Type", fileMetadata.mimeType || "application/octet-stream");
        headers.set("Content-Length", String(fileMetadata.sizeOriginal || arrayBuffer.byteLength));
        headers.set("Cache-Control", "private, max-age=3600");
        headers.set("Accept-Ranges", "bytes");

        if (isDownload) {
            const safeName = encodeURIComponent(fileMetadata.name || "download");
            headers.set("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
        } else {
            headers.set("Content-Disposition", "inline");
        }

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers,
        });
    } catch (err: any) {
        console.error("Error serving file via secure proxy:", err);
        if (err?.code === 404 || err?.message?.toLowerCase().includes("not found")) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        return NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: err?.code || 500 }
        );
    }
}
