'use client';

import React from 'react';
import {FileCardProps} from "@/types/db.types";
import Link from "next/link";
import Thumbnail from "@/components/Thumbnail";
import { cn, convertFileSize } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import { Checkbox } from "@/components/ui/checkbox";


const FileCard = ({file, showCheckbox = false, isSelected = false, onToggleSelect, currentUserId, currentUserEmail}: FileCardProps) => {
    const fileUrl = file.url?.includes("project=undefined")
        ? file.url.replace("project=undefined", `project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`)
        : file.url;

    return (
        <div className={cn("file-card relative group transition-all", isSelected && "file-card-selected")}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    {showCheckbox && (
                        <div
                            className="pt-1 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onToggleSelect?.(file)}
                                aria-label={`Select ${file.name}`}
                            />
                        </div>
                    )}

                    <Link href={fileUrl} target="_blank">
                        <Thumbnail
                            type={file.type}
                            extension={file.extension ?? ""}
                            url={fileUrl}
                            className="!size-20"
                            imageClassName={file.type === "image" || file.type === "video" ? "!size-full" : "!size-11"}
                        />
                    </Link>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch">
                    <ActionDropdown file={file} currentUserId={currentUserId} currentUserEmail={currentUserEmail}/>
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