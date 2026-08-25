import Sort from "@/components/Sort";
import { getFolders, getFolderFileCountForMultiple } from "@/lib/actions/folder.actions";
import TypeFolderList from "@/components/TypeFolderList";
import { FileViewProvider } from "@/components/FileViewProvider";
import FileViewToggle from "@/components/FileViewToggle";
import { getCurrentUser } from "@/lib/actions/user.actions";
import CreateFolderButton from "@/components/CreateFolderButton";
import { getDictionary, type Locale } from "@/lib/get-dictionary";

export const dynamic = "force-dynamic";

const FoldersPage = async ({ searchParams, params }: SearchParamProps) => {
    const { lang } = (await params) as { lang: string };
    const dictionary = await getDictionary(lang as Locale);
    const searchText = ((await searchParams)?.query as string) || "";
    const sort = ((await searchParams)?.sort as string) || "$createdAt-desc";
    const currentUser = await getCurrentUser();

    const folders = await getFolders({
        searchText,
        sort,
        fetchAll: true,
        trashed: false,
        onlyOwner: true,
        parentFolderId: null,
    });

    const folderRows = folders?.rows ?? [];
    const totalFolders = folderRows.length;

    const fileCounts = await getFolderFileCountForMultiple(
        folderRows.map((f: any) => f.$id)
    );

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="h1">{dictionary.folders.folders}</h1>
                        {currentUser && (
                            <CreateFolderButton
                                ownerId={currentUser.$id}
                                accountId={currentUser.accountId || ''}
                            />
                        )}
                    </div>

                    <div className="total-size-section">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <p className="body-1">
                                {dictionary.folders.total} <span className="h5">{totalFolders}</span>
                            </p>
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">{dictionary.folders.sortBy}</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                <TypeFolderList
                    folders={folderRows}
                    fileCounts={fileCounts}
                    currentUserId={currentUser?.$id}
                    currentUserEmail={currentUser?.email}
                />
            </div>
        </FileViewProvider>
    );
};

export default FoldersPage;
