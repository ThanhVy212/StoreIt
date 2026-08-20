import React from 'react';
import {FileRow, ShareInputProps} from "@/types/db.types";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import {convertFileSize, formatDateTime} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import Image from "next/image";

const ImageThumbnail = ({file}: {file: FileRow}) => (
    <div className="file-details-thumbnail w-full min-w-0 overflow-hidden">
        <Thumbnail type={file.type} extension={file.extension ?? ""} url={file.url} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <p className="subtitle-2 mb-1 truncate text-left" title={file.name}>{file.name}</p>
            <FormattedDateTime date={file.$createdAt} className="caption text-left" />
        </div>
    </div>
)

const DetailRow = ({label, value, avatar}: {label: string, value: string, avatar?: string}) => (
    <div className="flex gap-2">
        <p className="file-details-label text-left shrink-0">{label}</p>
        {avatar ? (
            <>
                <Image
                    src={avatar}
                    alt="avatar"
                    width={24}
                    height={24}
                    className="file-table-owner-avatar"
                />
                <p className="file-details-value text-left truncate" title={value}>{value}</p>
            </>
        ):(
            <p className="file-details-value text-left truncate" title={value}>{value}</p>
        )}
    </div>
)

export const FileDetails = ({file}: {file: FileRow}) => {
    return (
        <>
            <ImageThumbnail file={file} />
            <div className="space-y-4 px-2 pt-2">
                <DetailRow label="Format:" value={file.extension ?? "—"} />
                <DetailRow label="Size:" value={file.size != null ? convertFileSize(file.size) : "—"} />
                <DetailRow label="Upload:" value={file.owner?.fullName ?? "—"} />
                <DetailRow label="Last edit:" value={formatDateTime(file.$updatedAt)} />
                <DetailRow label="Owner:" value={file.owner?.email ?? "—"} avatar={file.owner?.avatar} />
            </div>
        </>
    )
}


export const ShareInput = ({file, onInputChange, onRemove}: ShareInputProps) => {
    return (
        <>
            <ImageThumbnail file={file} />

            <div className="share-wrapper">
                <p className="subtitle-2 pl-1 text-light-100">
                    Share with other users
                </p>

                <Input
                    type="email"
                    placeholder="Enter email address"
                    onChange={(e) => {
                        const recipients = e.target.value
                            .split(",")
                            .map((email) => email.trim().toLowerCase())
                            .filter((email) => email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
                        onInputChange(recipients);
                    }}
                    className="share-input-field"
                />

                <div className="pt-4">
                    <div className="flex justify-between">
                        <p className="subtitle-2 text-light-100">Share with</p>
                        <p className="subtitle-2 text-light-200">{file.users?.length} users</p>
                    </div>

                    <ul className="pt-2 w-full">
                        {file.users?.map((email: string) => (
                            <li
                                key={email}
                                className="flex w-full items-center justify-between"
                            >
                                <p className="subtitle-2">{email}</p>
                                <Button
                                    onClick={() => onRemove(email)}
                                    className="share-remove-user"
                                >
                                    <Image
                                        src="/assets/icons/remove.svg"
                                        alt="remove"
                                        width={24}
                                        height={24}
                                        className="remove-icon"
                                    />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    )
}