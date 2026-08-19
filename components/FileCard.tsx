'use client';

import React from 'react';
import {FileRow} from "@/types/db.types";
import Link from "next/link";
import Thumbnail from "@/components/Thumbnail";
import {convertFileSize} from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";

const FileCard = ({file}: {file: FileRow}) => {
    const fileUrl = file.url?.includes("project=undefined")
        ? file.url.replace("project=undefined", `project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`)
        : file.url;

    return (
        <div className="file-card">
            <div className="flex justify-between">
                <Link href={fileUrl} target="_blank">
                    <Thumbnail
                        type={file.type}
                        extension={file.extension ?? ""}
                        url={fileUrl}
                        className="!size-20"
                        imageClassName={file.type === "image" || file.type === "video" ? "!size-full" : "!size-11"}
                    />
                </Link>

                <div className="flex flex-col items-end justify-between">
                    <ActionDropdown file={file}/>
                    {file.size != null && (
                        <p className="body-1">{convertFileSize(file.size)}</p>
                    )}
                </div>
            </div>

            <Link href={fileUrl} target="_blank" className="file-card-details">
                <p className="subtitle-2 line-clamp-1">{file.name}</p>
                <FormattedDateTime date={file.$createdAt} className="body-2 text-light-100"/>
                <p className="caption line-clamp-1 text-light-200">
                    By: {file.owner?.fullName}
                </p>
            </Link>
        </div>
    );
};

export default FileCard;
