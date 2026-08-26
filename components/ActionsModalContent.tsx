'use client';
import React from 'react';
import {FileRow, ShareInputProps} from "@/types/db.types";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import {convertFileSize, formatDateTime, getFileProxyUrl} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import Image from "next/image";
import {toast} from "@/components/ui/toast";
import {z} from "zod";
import {useLocale} from "@/lib/locale-context";
import {createPublicFileLink, revokePublicFileLink} from "@/lib/actions/file.actions";
import {usePathname} from "next/navigation";

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
                    src={getFileProxyUrl(avatar) || "/assets/icons/avatar-default.svg"}
                    alt="avatar"
                    width={24}
                    height={24}
                    unoptimized={getFileProxyUrl(avatar).startsWith('/api/files/')}
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

export const ShareInput = ({
    file,
    onAddEmails,
    onRemove,
    isOwner = true,
    registerValidator,
    sharedEmails,
    onLoadingChange,
    activePublicLink,
    onPublicLinkRevoked,
}: ShareInputProps) => {
    const [inputValue, setInputValue] = React.useState("");
    const [expirationHours, setExpirationHours] = React.useState<number>(24);
    const [publicLink, setPublicLink] = React.useState<{ tokenId: string; expiresAt: string; url: string } | null>(
        activePublicLink ?? null
    );
    const [isGetLinkLoading, setIsGetLinkLoading] = React.useState(false);
    const [isRevokingLink, setIsRevokingLink] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);
    const { lang, dictionary: t } = useLocale();
    const path = usePathname();

    const emailSchema = z.email(t.validation.validEmail);

    React.useEffect(() => {
        setPublicLink(activePublicLink ?? null);
    }, [activePublicLink]);

    const getFullPublicUrl = (urlPath: string) => {
        if (typeof window === "undefined") return urlPath;
        if (urlPath.startsWith("http")) return urlPath;
        return `${window.location.origin}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;
    };

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
        } catch {
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

    const handleGeneratePublicLink = async () => {
        if (!isOwner) return;
        setIsGetLinkLoading(true);
        try {
            const result = await createPublicFileLink({
                fileId: file.$id,
                expiresIn: expirationHours,
                path,
            });

            setPublicLink(result);
            const fullUrl = getFullPublicUrl(result.url);
            await navigator.clipboard.writeText(fullUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
            toast.add({ type: "success", description: t.share.linkCopied });
        } catch {
            toast.add({ type: "error", description: t.share.failedCopyLink });
        } finally {
            setIsGetLinkLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!publicLink) return;
        try {
            const fullUrl = getFullPublicUrl(publicLink.url);
            await navigator.clipboard.writeText(fullUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
            toast.add({ type: "success", description: t.share.linkCopied });
        } catch {
            toast.add({ type: "error", description: t.share.failedCopyLink });
        }
    };

    const handleRevokeLink = async () => {
        if (!publicLink) return;
        setIsRevokingLink(true);
        try {
            await revokePublicFileLink({
                fileId: file.$id,
                tokenId: publicLink.tokenId,
                path,
            });
            setPublicLink(null);
            onPublicLinkRevoked?.();
            toast.add({ type: "success", description: t.share.publicLinkRevoked });
        } catch {
            toast.add({ type: "error", description: t.toast.somethingWrong });
        } finally {
            setIsRevokingLink(false);
        }
    };

    const isLinkActive = publicLink && new Date(publicLink.expiresAt) > new Date();

    const expirationOptions = [
        { value: 12, label: t.share.hours12 },
        { value: 24, label: t.share.days1 },
        { value: 72, label: t.share.days3 },
        { value: 168, label: t.share.days7 },
    ];

    return (
        <>
            <ImageThumbnail file={file} />

            <div className="share-wrapper space-y-4">
                {isOwner ? (
                    <div>
                        <p className="subtitle-2 pl-1 text-light-100">
                            {t.share.shareWithUsers}
                        </p>

                        <Input
                            type="email"
                            placeholder={t.share.enterEmail}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="share-input-field mt-2"
                        />

                        {(sharedEmails?.length ?? file.users?.length ?? 0) > 0 && (
                            <div className="pt-3">
                                <div className="flex justify-between">
                                    <p className="subtitle-2 text-light-100">{t.share.shareWith}</p>
                                    <p className="subtitle-2 text-light-200">
                                        {sharedEmails?.length ?? file.users?.length ?? 0} {t.share.users}
                                    </p>
                                </div>

                                <ul className="pt-2 w-full max-h-36 overflow-y-auto space-y-1">
                                    {(sharedEmails ?? file.users ?? []).map((email: string) => (
                                        <li
                                            key={email}
                                            className="flex w-full items-center justify-between py-1 px-2 rounded-lg bg-light-400/40 dark:bg-dark-200/40"
                                        >
                                            <p className="subtitle-2 truncate pr-2">{email}</p>
                                            <Button
                                                type="button"
                                                onClick={() => onRemove(email)}
                                                className="share-remove-user"
                                            >
                                                <Image
                                                    src="/assets/icons/remove.svg"
                                                    alt="remove"
                                                    width={20}
                                                    height={20}
                                                    className="remove-icon"
                                                />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Public Share Link Section */}
                {isOwner && (
                    <div className="pt-3 border-t border-light-400/50 dark:border-dark-200/50">
                        <div className="flex flex-col gap-0.5 mb-2.5">
                            <p className="subtitle-2 text-light-100">{t.share.publicLink}</p>
                            <p className="caption text-light-200">{t.share.publicLinkDesc}</p>
                        </div>

                        {/* Expiration Select & Generate Button */}
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="caption text-light-200 block mb-1 pl-1">
                                    {t.share.expiration}
                                </label>
                                <select
                                    value={expirationHours}
                                    onChange={(e) => setExpirationHours(Number(e.target.value))}
                                    className="w-full h-10 px-3 rounded-xl border border-light-500 bg-white dark:bg-dark-300 dark:border-dark-400 text-sm font-medium text-light-100 outline-none focus:border-brand cursor-pointer"
                                >
                                    {expirationOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={handleGeneratePublicLink}
                                disabled={isGetLinkLoading}
                                className="modal-submit-button h-10 px-4 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <Image
                                    src="/assets/icons/copy.svg"
                                    alt="get link"
                                    width={18}
                                    height={18}
                                />
                                {isLinkActive ? t.share.generateNewLink : t.share.getLink}
                                {isGetLinkLoading && (
                                    <Image
                                        src="/assets/icons/loader.svg"
                                        alt="loader"
                                        width={16}
                                        height={16}
                                        className="animate-spin"
                                    />
                                )}
                            </Button>
                        </div>

                        {/* Active Public Link Card */}
                        {isLinkActive && publicLink && (
                            <div className="mt-3 p-3 rounded-xl bg-brand/5 border border-brand/20 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 font-medium text-brand">
                                        <span className="size-2 rounded-full bg-brand inline-block animate-pulse" />
                                        {t.share.linkActive}
                                    </span>
                                    <span className="text-light-200 font-medium">
                                        {t.share.expiresAt} {formatDateTime(publicLink.expiresAt, lang)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={getFullPublicUrl(publicLink.url)}
                                        className="share-input-field h-9 text-xs flex-1 select-all bg-white dark:bg-dark-300 truncate"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="h-9 px-3 text-xs bg-brand text-white hover:bg-brand/90 rounded-lg flex items-center gap-1.5 shrink-0"
                                    >
                                        <Image
                                            src="/assets/icons/copy.svg"
                                            alt="copy"
                                            width={14}
                                            height={14}
                                            className="brightness-0 invert"
                                        />
                                        {isCopied ? "✓" : t.share.copyLink}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleRevokeLink}
                                        disabled={isRevokingLink}
                                        className="h-9 px-2.5 text-xs text-red bg-red/10 hover:bg-red/20 border border-red/20 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
                                        title={t.share.revokeLink}
                                    >
                                        <Image
                                            src="/assets/icons/delete.svg"
                                            alt="revoke"
                                            width={16}
                                            height={16}
                                        />
                                        {isRevokingLink && (
                                            <Image
                                                src="/assets/icons/loader.svg"
                                                alt="loader"
                                                width={14}
                                                height={14}
                                                className="animate-spin"
                                            />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
