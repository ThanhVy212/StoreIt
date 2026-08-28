'use client';

import React from 'react';
import {FileCardProps} from "@/types/db.types";
import Thumbnail from "@/components/Thumbnail";
import { cn, convertFileSize, getFileProxyUrl } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import { Checkbox } from "@/components/ui/checkbox";
import {useLocale} from "@/lib/locale-context";
import {useFilePreview} from "@/components/FilePreviewProvider";


const FileCard = ({file, showCheckbox = false, isSelected = false, onToggleSelect, currentUserId, currentUserEmail, allFiles}: FileCardProps) => {
    const { lang, dictionary: t } = useLocale();
    const { openPreview } = useFilePreview();
    const fileUrl = getFileProxyUrl(file.url);

    const handlePreviewClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openPreview(file, allFiles);
    };

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

                    <div onClick={handlePreviewClick} className="cursor-pointer">
                        <Thumbnail
                            type={file.type}
                            extension={file.extension ?? ""}
                            url={fileUrl}
                            className="!size-20"
                            imageClassName={file.type === "image" || file.type === "video" ? "!size-full" : "!size-11"}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch">
                    <ActionDropdown file={file} currentUserId={currentUserId} currentUserEmail={currentUserEmail}/>
                    {file.size != null && (
                        <p className="body-1">{convertFileSize(file.size)}</p>
                    )}
                </div>
            </div>

            <div onClick={handlePreviewClick} className="file-card-details cursor-pointer">
                <p className="subtitle-2 line-clamp-1">{file.name}</p>
                <FormattedDateTime date={file.$createdAt} className="body-2 text-light-100"/>
                <p className="caption line-clamp-1 text-light-200">
                    {t.files.by} {file.owner?.fullName}
                </p>
            </div>
        </div>
    );
};

export default FileCard;
