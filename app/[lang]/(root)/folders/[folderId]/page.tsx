import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import {
    getFolders,
    getFolderById,
    getFolderAncestors,
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
import Breadcrumb from "@/components/Breadcrumb";
import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/get-dictionary";

export const dynamic = "force-dynamic";

const FolderDetailPage = async ({
    params,
    searchParams,
}: SearchParamProps) => {
    const { folderId, lang } = (await params) as { folderId: string; lang: string };
    const dictionary = await getDictionary(lang as Locale);
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

    const ancestors = await getFolderAncestors(folderId);

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <Breadcrumb ancestors={ancestors} />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="h1">{folder?.name || dictionary.folders.folders}</h1>
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
                                {dictionary.folders.size} <span className="h5">{convertFileSize(totalSize)}</span>
                            </p>
                            <p className="body-1">
                                {dictionary.files.fileCount} <span className="h5">{totalFileCount}</span>
                            </p>
                            <p className="body-1">
                                {dictionary.folders.subfolderCount} <span className="h5">{subfolderRows.length}</span>
                            </p>
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">{dictionary.folders.sortBy}</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                {subfolderRows.length > 0 && (
                    <section className="mb-6">
                        <h2 className="h3 text-light-100 mb-4">{dictionary.folders.subfolders}</h2>
                        <TypeFolderList
                            folders={subfolderRows}
                            fileCounts={subfolderFileCounts}
                            currentUserId={currentUser?.$id}
                            currentUserEmail={currentUser?.email}
                        />
                    </section>
                )}

                <section>
                    <h2 className="h3 text-light-100 mb-4">{dictionary.common.files}</h2>
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
