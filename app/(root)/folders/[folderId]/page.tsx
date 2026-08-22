import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import {
    getFolders,
    getFolderById,
    getFolderFileCountForMultiple,
    getFolderFileCount,
    getFolderSize
} from "@/lib/actions/folder.actions";
import { convertFileSize } from "@/lib/utils";
import TypeFileList from "@/components/TypeFileList";
import TypeFolderList from "@/components/TypeFolderList";
import { FileViewProvider } from "@/components/FileViewProvider";
import FileViewToggle from "@/components/FileViewToggle";
import { getCurrentUser } from "@/lib/actions/user.actions";
import Link from "next/link";
import CreateFolderButton from "@/components/CreateFolderButton";
import FolderFileUploader from "@/components/FolderFileUploader";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const FolderDetailPage = async ({
    params,
    searchParams,
}: SearchParamProps) => {
    const { folderId } = (await params) as { folderId: string };
    const searchText = ((await searchParams)?.query as string) || "";
    const sort = ((await searchParams)?.sort as string) || "$createdAt-desc";
    const currentUser = await getCurrentUser();

    let folder;
    try {
        folder = await getFolderById(folderId);
    } catch {
        notFound();
    }

    if (!folder) notFound();
    if (folder.owner !== currentUser?.$id) notFound();

    const totalFileCount = await getFolderFileCount(folderId);

    const files = await getFiles({
        searchText,
        sort,
        fetchAll: true,
        trashed: false,
        onlyOwner: true,
        folderId,
    });

    const folderFiles = files?.rows ?? [];

    const subfolders = await getFolders({
        searchText,
        sort,
        fetchAll: true,
        trashed: false,
        onlyOwner: true,
        parentFolderId: folderId,
    });

    const subfolderRows = subfolders?.rows ?? [];
    const subfolderFileCounts = await getFolderFileCountForMultiple(
        subfolderRows.map((f: any) => f.$id)
    );

    const totalSize = await getFolderSize(folderId);

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/folders" className="body-1 text-light-200 hover:text-light-100">
                            Folders
                        </Link>
                        <span className="body-1 text-light-200">/</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="h1">{folder?.name || "Folder"}</h1>
                        {currentUser && (
                            <div className="flex items-center gap-3">
                                <FolderFileUploader
                                    ownerId={currentUser.$id}
                                    accountId={currentUser.accountId || ''}
                                    folderId={folderId}
                                />
                                <CreateFolderButton
                                    ownerId={currentUser.$id}
                                    accountId={currentUser.accountId || ''}
                                    parentFolderId={folderId}
                                />
                            </div>
                        )}
                    </div>

                    <div className="total-size-section">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <p className="body-1">
                                Size: <span className="h5">{convertFileSize(totalSize)}</span>
                            </p>
                            <p className="body-1">
                                Files: <span className="h5">{totalFileCount}</span>
                            </p>
                            <p className="body-1">
                                Subfolders: <span className="h5">{subfolderRows.length}</span>
                            </p>
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                {/* Subfolders */}
                {subfolderRows.length > 0 && (
                    <section className="mb-6">
                        <h2 className="h3 text-light-100 mb-4">Subfolders</h2>
                        <TypeFolderList
                            folders={subfolderRows}
                            fileCounts={subfolderFileCounts}
                            currentUserId={currentUser?.$id}
                            currentUserEmail={currentUser?.email}
                        />
                    </section>
                )}

                {/* Files in this folder */}
                <section>
                    <h2 className="h3 text-light-100 mb-4">Files</h2>
                    <TypeFileList
                        files={folderFiles}
                        currentUserId={currentUser?.$id}
                        currentUserEmail={currentUser?.email}
                    />
                </section>
            </div>
        </FileViewProvider>
    );
};

export default FolderDetailPage;
