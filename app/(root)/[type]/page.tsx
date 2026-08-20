import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { FileRow } from "@/types/db.types";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import TypeFileList from "@/components/TypeFileList";
import { FileViewProvider } from "@/components/FileViewProvider";
import FileViewToggle from "@/components/FileViewToggle";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams, params }: SearchParamProps) => {
    const type = ((await params)?.type as string) || "";
    const searchText = ((await searchParams)?.query as string) || "";
    const sort = ((await searchParams)?.sort as string) || "$createdAt-desc";
    const isTrash = type === "trash";


    const types = isTrash ? [] : (getFileTypesParams(type) as FileType[]);

    const files = await getFiles({
        types,
        searchText,
        sort,
        fetchAll: true,
        trashed: isTrash,
        onlyOwner: isTrash,
    });

    const totalFiles = files?.total ?? 0;

    // Calculate total size for files in this category
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
                        </div>

                        <div className="sort-container">
                            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
                            <Sort />
                            <FileViewToggle />
                        </div>
                    </div>
                </section>

                <TypeFileList files={files?.rows || []} isTrash={isTrash} />
            </div>
        </FileViewProvider>
    );
};

export default Page;
