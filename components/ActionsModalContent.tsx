'use client';
import React from 'react';
import {FileRow, ShareInputProps} from "@/types/db.types";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import {constructFileUrl, convertFileSize, formatDateTime} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import Image from "next/image";
import {toast} from "@/components/ui/toast";
import {z} from "zod";
import {useLocale} from "@/lib/locale-context";

const ImageThumbnail = ({file}: {file: FileRow}) => (
    <div className="file-details-thumbnail w-full min-w-0 overflow-hidden">
        <Thumbnail type={file.type} extension={file.extension ?? ""} url={file.url} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <p className="subtitle-2 mb-1 truncate text-left" title={file.name}>{file.name}</p>
            <FormattedDateTime date={file.$createdAt} className="caption text-left" />
        </div>
    </div>
)

export const DetailRow = ({label, value, avatar}: {label: string, value: string, avatar?: string}) => (
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
    const { lang, dictionary: t } = useLocale();
    return (
        <>
            <ImageThumbnail file={file} />
            <div className="space-y-4 px-2 pt-2">
                <DetailRow label={t.fileDetails.format} value={file.extension ?? "—"} />
                <DetailRow label={t.fileDetails.size} value={file.size != null ? convertFileSize(file.size) : "—"} />
                <DetailRow label={t.fileDetails.uploadedBy} value={file.owner?.fullName ?? "—"} />
                <DetailRow label={t.fileDetails.lastEdit} value={formatDateTime(file.$updatedAt, lang)} />
                <DetailRow label={t.fileDetails.owner} value={file.owner?.email ?? "—"} avatar={file.owner?.avatar} />
            </div>
        </>
    )
}


export const ShareInput = ({file, onAddEmails, onRemove, isOwner = true, registerValidator, sharedEmails, onLoadingChange}: ShareInputProps) => {
    const [inputValue, setInputValue] = React.useState("");
    const { dictionary: t } = useLocale();

    const emailSchema = z.email(t.validation.validEmail);

    const processEmails = (raw: string): boolean => {
        onLoadingChange?.(true);
        try {
            const candidates = raw
                .split(",")
                .map((email) => email.trim().toLowerCase())
                .filter((email) => email.length > 0);

            if (candidates.length === 0) return true;

            const existingUsers = (sharedEmails ?? file.users ?? []).map((e) => e.toLowerCase());

            let hasError = false;
            const validNew: string[] = [];
            for (const email of candidates) {
                const result = emailSchema.safeParse(email);
                if (!result.success) {
                    toast.add({ type: "error", description: result.error.issues[0].message });
                    hasError = true;
                    continue;
                }
                if (existingUsers.includes(email) || validNew.includes(email)) {
                    toast.add({ type: "error", description: t.share.alreadyShared.replace("{email}", email) });
                    hasError = true;
                    continue;
                }
                validNew.push(email);
            }

            if (validNew.length > 0) {
                onAddEmails(validNew);
                setInputValue("");
            }
            return !hasError;
        } catch (error) {
            toast.add({ type: "error", description: t.toast.somethingWrong });
            return false;
        } finally {
            onLoadingChange?.(false);
        }
    };

    React.useEffect(() => {
        if (registerValidator) {
            registerValidator(() => processEmails(inputValue));
        }
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            processEmails(inputValue);
        }
    };

    const handleGetLink = async () => {
        const fileUrl = constructFileUrl(file.bucketFileId);
        try {
            await navigator.clipboard.writeText(fileUrl);
            toast.add({ type: "success", description: t.share.linkCopied });
        } catch {
            toast.add({
                type: "error",
                description: t.share.failedCopyLink,
            });
        }
    };

    return (
        <>
            <ImageThumbnail file={file} />

            <div className="share-wrapper">
                {isOwner ? (
                    <>
                        <p className="subtitle-2 pl-1 text-light-100">
                            {t.share.shareWithUsers}
                        </p>

                        <Input
                            type="email"
                            placeholder={t.share.enterEmail}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="share-input-field"
                        />

                        <div className="pt-4">
                            <div className="flex justify-between">
                                <p className="subtitle-2 text-light-100">{t.share.shareWith}</p>
                                <p className="subtitle-2 text-light-200">{sharedEmails?.length ?? file.users?.length ?? 0} {t.share.users}</p>
                            </div>

                            <ul className="pt-2 w-full">
                                {(sharedEmails ?? file.users ?? []).map((email: string) => (
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
                    </>
                ) : null}

                <div className="pt-4">
                    <Button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleGetLink}
                        className="w-full modal-submit-button flex items-center justify-center gap-2"
                    >
                        <Image
                            src="/assets/icons/copy.svg"
                            alt="get link"
                            width={20}
                            height={20}
                        />
                        {t.share.getLink}
                    </Button>
                </div>
            </div>
        </>
    )
}
