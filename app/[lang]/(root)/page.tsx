import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getFiles, getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getFolders, getFolderFileCountForMultiple } from "@/lib/actions/folder.actions";
import { convertFileSize, getFileProxyUrl, getUsageSummary } from "@/lib/utils";
import Chart from "@/components/Chart";
import { Separator } from "@/components/ui/separator";
import FormattedDateTime from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import ActionDropdown from "@/components/ActionDropdown";
import { FileRow } from "@/types/db.types";
import { getDictionary, type Locale } from "@/lib/get-dictionary";

export const dynamic = "force-dynamic";

const Dashboard = async ({ params }: { params: Promise<{ lang: string }> }) => {
    const { lang } = await params;
    const dictionary = await getDictionary(lang as Locale);

    const recentFiles = await getFiles({ types: [], limit: 8, onlyOwner: true });
    const totalSpace = await getTotalSpaceUsed();
    const folders = await getFolders({ onlyOwner: true, trashed: false, fetchAll: true, parentFolderId: null });
    const folderRows = folders?.rows ?? [];
    const totalFolders = folders?.total ?? folderRows.length;
    const folderFileCounts = await getFolderFileCountForMultiple(
        folderRows.map((f: any) => f.$id)
    );

    const usageSummary = getUsageSummary(totalSpace, dictionary);

    const totalFolderFiles = Object.values(folderFileCounts).reduce(
        (acc: number, count: number) => acc + count,
        0
    );

    const folderText = totalFolderFiles === 1
      ? dictionary.dashboard.filesInFolders.replace("{count}", String(totalFolderFiles))
      : dictionary.dashboard.filesInFolders_plural.replace("{count}", String(totalFolderFiles));

    return (
        <div className="dashboard-container">
            <section>
                <Chart used={totalSpace?.used || 0} />

                <ul className="dashboard-summary-list">
                    {usageSummary.map((summary) => (
                        <Link
                            href={summary.url}
                            key={summary.title}
                            className="dashboard-summary-card"
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between gap-3">
                                    <Image
                                        src={summary.icon}
                                        width={100}
                                        height={100}
                                        alt={summary.title}
                                        className="summary-type-icon"
                                    />
                                    <h4 className="summary-type-size">
                                        {convertFileSize(summary.size) || "0 Bytes"}
                                    </h4>
                                </div>

                                <h5 className="summary-type-title">{summary.title}</h5>
                                <Separator className="bg-light-400 dark:bg-dark-200" />
                                <FormattedDateTime
                                    date={summary.latestDate}
                                    className="text-center"
                                />
                            </div>
                        </Link>
                    ))}
                    <Link href={`/${lang}/folders`} className="dashboard-summary-card">
                        <div className="space-y-4">
                            <div className="flex justify-between gap-3">
                                <Image
                                    src="/assets/icons/file-folder-light.svg"
                                    width={100}
                                    height={100}
                                    alt={dictionary.dashboard.folders}
                                    className="summary-type-icon"
                                />
                                <h4 className="summary-type-size">
                                    {totalFolders}
                                </h4>
                            </div>
                            <h5 className="summary-type-title">{dictionary.dashboard.folders}</h5>
                            <Separator className="bg-light-400 dark:bg-dark-200" />
                            <p className="body-2 text-center">
                                {folderText}
                            </p>
                        </div>
                    </Link>
                </ul>
            </section>

            <section className="dashboard-recent-files">
                <h2 className="h3 xl:h2 text-light-100">{dictionary.dashboard.recentFiles}</h2>
                {recentFiles?.rows && recentFiles.rows.length > 0 ? (
                    <ul className="mt-5 flex flex-col gap-5">
                        {recentFiles.rows.map((file: FileRow) => (
                            <li
                                key={file.$id}
                                className="flex items-center justify-between gap-3"
                            >
                                <Link
                                    href={getFileProxyUrl(file.url)}
                                    target="_blank"
                                    className="flex items-center gap-3 min-w-0 flex-1"
                                >
                                    <Thumbnail
                                        type={file.type}
                                        extension={file.extension ?? ""}
                                        url={file.url}
                                    />

                                    <div className="recent-file-details">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <p className="recent-file-name">{file.name}</p>
                                            <FormattedDateTime
                                                date={file.$createdAt}
                                                className="recent-file-date"
                                            />
                                        </div>
                                    </div>
                                </Link>

                                <ActionDropdown file={file} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="empty-list">{dictionary.dashboard.noFiles}</p>
                )}
            </section>
        </div>
    );
};

export default Dashboard;
