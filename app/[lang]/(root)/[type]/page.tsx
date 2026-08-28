import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { getFolders, getFolderFileCountForMultiple } from "@/lib/actions/folder.actions";
import {FileRow, FolderRow} from "@/types/db.types";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import TypeFileList from "@/components/TypeFileList";
import TypeFolderList from "@/components/TypeFolderList";
import { FileViewProvider } from "@/components/FileViewProvider";
import FileViewToggle from "@/components/FileViewToggle";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getDictionary, type Locale } from "@/lib/get-dictionary";
import TrashBanner from "@/components/TrashBanner";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams, params }: SearchParamProps) => {
    const { type, lang } = (await params) as { type: string; lang: string };
    const dictionary = await getDictionary(lang as Locale);
    const searchText = ((await searchParams)?.query as string) || "";
    const sort = ((await searchParams)?.sort as string) || "$createdAt-desc";
    const isTrash = type === "trash";
    const currentUser = await getCurrentUser();

    const types = isTrash ? [] : (getFileTypesParams(type) as FileType[]);

    const files = await getFiles({
        types,
        searchText,
        sort,
        fetchAll: true,
        trashed: isTrash,
        onlyOwner: isTrash,
        folderId: isTrash ? undefined : null,
    });

    let trashedFolders: FolderRow[] = [];
    let trashedFolderFileCounts: Record<string, number> = {};
    if (isTrash) {
        const folders = await getFolders({
            searchText,
            sort,
            fetchAll: true,
            trashed: true,
            onlyOwner: true,
        });
        const allTrashed: FolderRow[] = folders?.rows ?? [];
        const trashedIds = new Set(allTrashed.map((f) => f.$id));
        trashedFolders = allTrashed.filter(
            (f) => !f.parentFolderId || !trashedIds.has(f.parentFolderId)
        );
        trashedFolderFileCounts = await getFolderFileCountForMultiple(
            trashedFolders.map((f) => f.$id),
            true
        );
    }


    const totalFiles = files?.total ?? 0;
    const totalFolders = trashedFolders.length;

    const totalSize = files?.rows?.reduce((acc: number, file: FileRow) => acc + (file.size || 0), 0) || 0;

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <h1 className="h1 capitalize">{isTrash ? dictionary.files.trash : type}</h1>

                    {isTrash && <TrashBanner dictionary={dictionary} />}

                    <div className="total-size-section">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <p className="body-1">
                                {dictionary.files.total} <span className="h5">{convertFileSize(totalSize)}</span>
                            </p>
                            <p className="body-1">
                                {dictionary.files.fileCount} <span className="h5">{totalFiles}</span>
                            </p>
                            {isTrash && (
                                <p className="body-1">
                                    {dictionary.files.folderCount} <span className="h5">{totalFolders}</span>
                                </p>
                            )}
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">{dictionary.files.sortBy}</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                {isTrash && trashedFolders.length > 0 && (
                    <section className="mb-8">
                        <TypeFolderList
                            folders={trashedFolders}
                            fileCounts={trashedFolderFileCounts}
                            isTrash={true}
                            currentUserId={currentUser?.$id}
                            currentUserEmail={currentUser?.email}
                        />
                    </section>
                )}

                <TypeFileList files={files?.rows || []} isTrash={isTrash} currentUserId={currentUser?.$id} currentUserEmail={currentUser?.email} />
            </div>
        </FileViewProvider>
    );
};

export default Page;
