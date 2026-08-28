'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import React, {useEffect, useRef, useState} from 'react';
import {FileRow} from "@/types/db.types";
import Image from "next/image";
import {actionsDropdownItems, sharedActionsDropdownItems, trashActionsDropdownItems} from "@/constants";
import {addExtension, constructDownloadUrl, downloadFile, removeExtension} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {deleteFile, getFilePublicLinks, moveFileToTrash, renameFile, restoreFile, updateFileUsers, unshareFileForMe} from "@/lib/actions/file.actions";
import {usePathname} from "next/navigation";
import {FileDetails, ShareInput} from "@/components/ActionsModalContent";
import {toast} from "@/components/ui/toast";
import {useLocale} from "@/lib/locale-context";
import {useFilePreview} from "@/components/FilePreviewProvider";



const ActionDropdown = ({file, currentUserId, currentUserEmail, allFiles}: {file: FileRow; currentUserId?: string; currentUserEmail?: string; allFiles?: FileRow[]}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [action, setAction] = useState<ActionType | null>(null);
    const [name, setName] = useState(removeExtension(file.name ?? ""))
    const [isLoading, setIsLoading] = useState(false);
    const [emails, setEmails] = useState<string[]>([]);
    const [activePublicLink, setActivePublicLink] = useState<{ tokenId: string; expiresAt: string; url: string } | null>(null);
    const shareValidatorRef = useRef<(() => boolean) | null>(null);
    const linkGenerationRef = useRef(0);
    const { dictionary: t } = useLocale();
    const { openPreview } = useFilePreview();

    const path = usePathname();
    const isTrashed = Boolean(file.trashed);
    const isOwner = file.owner?.$id === currentUserId;
    const isSharedWithMe = !isOwner && currentUserId !== undefined;

    const menuItems = isTrashed
        ? trashActionsDropdownItems
        : isSharedWithMe
            ? sharedActionsDropdownItems
            : actionsDropdownItems;

    useEffect(() => {
        setName(removeExtension(file.name ?? ""));
    }, [file.name]);

    const closeAllModals = () => {
        setIsModalOpen(false);
        setIsDropdownOpen(false);
        setAction(null);
        setName(removeExtension(file.name ?? ""));
        setEmails([]);
        setActivePublicLink(null);
    }

    const handleAction = async (selectedAction?: ActionType | null) => {
        const currentAction = selectedAction ?? action;
        if (!currentAction) return;

        if (currentAction.value === "share" && shareValidatorRef.current) {
            const isValid = shareValidatorRef.current();
            if (!isValid) {
                setIsLoading(false);
                return;
            }
        }

        const actions = {
            rename: () => renameFile({fileId: file.$id, name: name.trim(), extension: file.extension!, path}),
            share: () => updateFileUsers({fileId: file.$id, emails, path}),
            trash: () => moveFileToTrash({fileId: file.$id, path}),
            restore: () => restoreFile({fileId: file.$id, path}),
            delete: () => deleteFile({fileId: file.$id, bucketFileId: file.bucketFileId, path}),
            unshare: () => {
                return unshareFileForMe({fileId: file.$id, path});
            },
        };

        try {
            setIsLoading(true);
            const success = await actions[currentAction.value as keyof typeof actions]();
            if (success) {
                if (currentAction.value === "rename" && success?.name) {
                    setName(removeExtension(success.name));
                }
                if (currentAction.value === "trash") {
                    toast.add({ type: "success", description: t.toast.fileMovedToTrash });
                }
                if (currentAction.value === "restore") {
                    toast.add({ type: "success", description: t.toast.fileRestored });
                }
                if (currentAction.value === "delete") {
                    toast.add({ type: "success", description: t.toast.fileDeletedPermanently });
                }
                if (currentAction.value === "unshare") {
                    toast.add({ type: "success", description: t.toast.fileUnshared });
                }
                if (currentAction.value !== "share") {
                    closeAllModals();
                }
            }
        } catch {
            toast.add({
                type: "error",
                description: t.toast.somethingWrong,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveUser = async (email: string) => {
        const updatedEmails = emails.filter((e) => e !== email);

        const success = await updateFileUsers({fileId: file.$id, emails: updatedEmails, path});

        if(success) setEmails(updatedEmails);
    }

    const handleAddEmails = (newEmails: string[]) => {
        setEmails((prev) => {
            const merged = [...prev];
            for (const email of newEmails) {
                if (!merged.includes(email)) {
                    merged.push(email);
                }
            }
            return merged;
        });
    };

    const fetchPublicLinks = async () => {
        const generation = ++linkGenerationRef.current;
        try {
            const links = await getFilePublicLinks(file.$id);
            if (generation !== linkGenerationRef.current) return;
            if (Array.isArray(links) && links.length > 0) {
                setActivePublicLink(links[0]);
            } else {
                setActivePublicLink(null);
            }
        } catch {
            if (generation !== linkGenerationRef.current) return;
            setActivePublicLink(null);
        }
    };

    const renderDialogContent = () => {
        if(!action || !['rename', 'share', 'delete', 'details'].includes(action.value)) return null;

        const {value} = action;

        return (
            <DialogContent className="shad-dialog button">
                <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                    <DialogTitle className="text-center text-light-100">
                        {t.actions[action.value as keyof typeof t.actions] || action.value}
                    </DialogTitle>
                    {value === "rename" && (
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    {value === "details" && (
                        <FileDetails file={file} />
                    )}
                    {value === "share" && (
                        <ShareInput
                            file={file}
                            onAddEmails={handleAddEmails}
                            onRemove={handleRemoveUser}
                            isOwner={isOwner}
                            registerValidator={(fn) => { shareValidatorRef.current = fn; }}
                            sharedEmails={emails}
                            onLoadingChange={setIsLoading}
                            onPublicLinkRevoked={() => setActivePublicLink(null)}
                            onLinkGenerated={() => { linkGenerationRef.current++; }}
                            activePublicLink={activePublicLink}
                        />
                    )}
                    {value === "delete" && (
                        <p className="delete-confirmation">
                            {t.actions.permanentlyDelete} {` `}
                            <span className="delete-file-name">{addExtension(name, file.extension!)}</span>?
                            {t.actions.thisCannotBeUndone}
                        </p>
                    )}
                </DialogHeader>
                {(['rename', 'delete'].includes(value) || (value === 'share' && isOwner)) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={closeAllModals} className="modal-cancel-button">{t.actions.cancel}</Button>
                        <Button onClick={() => void handleAction()} className="modal-submit-button " disabled={isLoading}>
                            <p className="capitalize">{value === "delete" ? t.actions.deleteForever : t.actions[value as keyof typeof t.actions] || value}</p>
                            {isLoading && (
                                <Image src="/assets/icons/loader.svg"
                                       alt="loader"
                                       width={24}
                                       height={24}
                                       className="animate-spin"
                                />
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        )
    }


    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger className="shad-no-focus">
                    <Image
                        src="/assets/icons/dots.svg"
                        alt="dots"
                        width={30}
                        height={30}
                        className="cursor-pointer"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[200px]">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="max-w-[200px] truncate">{file.name}</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        {menuItems.map((item) => (
                            <DropdownMenuItem
                                key={item.value}
                                className="shad-dropdown-item"
                                onClick={() => {
                                    if (item.value === "download") {
                                        downloadFile(constructDownloadUrl(file.bucketFileId), file.name);
                                        setIsDropdownOpen(false);
                                        return;
                                    }

                                    if (item.value === "preview") {
                                        openPreview(file, allFiles);
                                        setIsDropdownOpen(false);
                                        return;
                                    }

                                    if (item.value === "rename") {
                                        setName(removeExtension(file.name ?? ""));
                                    }
                                    if (item.value === "share") {
                                        setEmails(file.users ?? []);
                                        fetchPublicLinks();
                                    }

                                    setAction(item);

                                    if (item.value === "trash" || item.value === "restore" || item.value === "unshare") {
                                        setIsDropdownOpen(false);
                                        void handleAction(item);
                                        return;
                                    }

                                    if([
                                        'rename',
                                        'share',
                                        "delete",
                                        "details"
                                    ].includes(item.value)) {
                                        setIsModalOpen(true);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Image
                                        src={item.icon}
                                        alt={item.label}
                                        width={30}
                                        height={30}
                                    />
                                    {t.actions[item.key as keyof typeof t.actions] || item.label}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {renderDialogContent()}
        </Dialog>
    )
}
export default ActionDropdown
