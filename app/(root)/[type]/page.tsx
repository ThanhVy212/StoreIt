import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { getFolders, getFolderFileCountForMultiple } from "@/lib/actions/folder.actions";
import { FileRow } from "@/types/db.types";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import TypeFileList from "@/components/TypeFileList";
import TypeFolderList from "@/components/TypeFolderList";
import { FileViewProvider } from "@/components/FileViewProvider";
import FileViewToggle from "@/components/FileViewToggle";
import { getCurrentUser } from "@/lib/actions/user.actions";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams, params }: SearchParamProps) => {
    const type = ((await params)?.type as string) || "";
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

    let trashedFolders: any[] = [];
    let trashedFolderFileCounts: Record<string, number> = {};

    if (isTrash) {
        const folders = await getFolders({
            searchText,
            sort,
            fetchAll: true,
            trashed: true,
            onlyOwner: true,
        });
        trashedFolders = folders?.rows ?? [];
        trashedFolderFileCounts = await getFolderFileCountForMultiple(
            trashedFolders.map((f: any) => f.$id)
        );
    }

    const totalFiles = files?.total ?? 0;
    const totalFolders = trashedFolders.length;

    const totalSize = files?.rows?.reduce((acc: number, file: FileRow) => acc + (file.size || 0), 0) || 0;

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <h1 className="h1 capitalize">{isTrash ? "Trash" : type}</h1>

                    <div className="total-size-section">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <p className="body-1">
                                Total: <span className="h5">{convertFileSize(totalSize)}</span>
                            </p>
                            <p className="body-1">
                                Files: <span className="h5">{totalFiles}</span>
                            </p>
                            {isTrash && (
                                <p className="body-1">
                                    Folders: <span className="h5">{totalFolders}</span>
                                </p>
                            )}
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                {/* Trashed Folders */}
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

                {/* Trashed Files */}
                <TypeFileList files={files?.rows || []} isTrash={isTrash} currentUserId={currentUser?.$id} currentUserEmail={currentUser?.email} />
            </div>
        </FileViewProvider>
    );
};

export default Page;
