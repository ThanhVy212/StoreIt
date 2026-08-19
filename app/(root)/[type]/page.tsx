import Sort from "@/components/Sort";
import {getFiles} from "@/lib/actions/file.actions";
import {FileRow} from "@/types/db.types";
import {getFileTypesParams} from "@/lib/utils";
import FileCard from "@/components/FileCard";

const Page = async ({ searchParams, params }: SearchParamProps) => {
    const type = ((await params)?.type as string) || "";
    const searchText = ((await searchParams)?.query as string) || "";
    const sort = ((await searchParams)?.sort as string) || "$createdAt-desc";

    const types = getFileTypesParams(type) as FileType[];

    const files = await getFiles({ types, searchText, sort });

    return (
        <div className="page-container">
            <section className="w-full">
                <h1 className="h1 capitalize">{type}</h1>

                <div className="total-size-section">
                    <p className="body-1">
                        Total: <span className="h5">0 MB</span>
                    </p>

                    <div className="sort-container">
                        <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
                        <Sort />
                    </div>
                </div>
            </section>

        {/* todo: Render the files  */}
            {files.total > 0 ? (
                <section className="file-list">
                    {files.rows.map((file: FileRow) => (
                        <FileCard key={file.$id} file={file} />
                    ))}
                </section>
            ) : (
                <p className="empty-list">No files uploaded</p>
            )}

        </div>
    )
}
export default Page
