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
import {deleteFile, moveFileToTrash, renameFile, restoreFile, updateFileUsers} from "@/lib/actions/file.actions";
import {usePathname} from "next/navigation";
import {FileDetails, ShareInput} from "@/components/ActionsModalContent";
import {toast} from "@/components/ui/toast";



const ActionDropdown = ({file, currentUserId, currentUserEmail}: {file: FileRow; currentUserId?: string; currentUserEmail?: string}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [action, setAction] = useState<ActionType | null>(null);
    const [name, setName] = useState(removeExtension(file.name ?? ""))
    const [isLoading, setIsLoading] = useState(false);
    const [emails, setEmails] = useState<string[]>([]);
    const shareValidatorRef = useRef<(() => boolean) | null>(null);

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

        setIsLoading(true);
        const actions = {
            rename: () => renameFile({fileId: file.$id, name: name.trim(), extension: file.extension!, path}),
            share: () => updateFileUsers({fileId: file.$id, emails, path}),
            trash: () => moveFileToTrash({fileId: file.$id, path}),
            restore: () => restoreFile({fileId: file.$id, path}),
            delete: () => deleteFile({fileId: file.$id, bucketFileId: file.bucketFileId, path}),
            unshare: () => {
                if (!currentUserEmail) return Promise.resolve(null);
                const updatedEmails = (file.users ?? []).filter((e) => e !== currentUserEmail);
                return updateFileUsers({fileId: file.$id, emails: updatedEmails, path});
            },
        };

        try {
            const success = await actions[currentAction.value as keyof typeof actions]();
            if (success) {
                if (currentAction.value === "rename" && success?.name) {
                    setName(removeExtension(success.name));
                }
                if (currentAction.value === "trash") {
                    toast.add({ type: "success", description: "File moved to trash." });
                }
                if (currentAction.value === "restore") {
                    toast.add({ type: "success", description: "File restored." });
                }
                if (currentAction.value === "delete") {
                    toast.add({ type: "success", description: "File deleted permanently." });
                }
                if (currentAction.value === "unshare") {
                    toast.add({ type: "success", description: "File unshared successfully." });
                }
                if (currentAction.value !== "share") {
                    closeAllModals();
                }
            }
        } catch {
            toast.add({
                type: "error",
                description: "Something went wrong. Please try again.",
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

    const renderDialogContent = () => {
        if(!action || !['rename', 'share', 'delete', 'details'].includes(action.value)) return null;

        const {value, label} = action;

        return (
            <DialogContent className="shad-dialog button">
                <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                    <DialogTitle className="text-center text-light-100">
                        {label}
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
                        <ShareInput file={file} onAddEmails={handleAddEmails} onRemove={handleRemoveUser} isOwner={isOwner} registerValidator={(fn) => { shareValidatorRef.current = fn; }} sharedEmails={emails}/>
                    )}
                    {value === "delete" && (
                        <p className="delete-confirmation">
                            Permanently delete {` `}
                            <span className="delete-file-name">{addExtension(name, file.extension!)}</span>?
                            This cannot be undone.
                        </p>
                    )}
                </DialogHeader>
                {(['rename', 'delete'].includes(value) || (value === 'share' && isOwner)) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={closeAllModals} className="modal-cancel-button">Cancel</Button>
                        <Button onClick={() => void handleAction()} className="modal-submit-button ">
                            <p className="capitalize">{value === "delete" ? "Delete forever" : value}</p>
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

                                    if (item.value === "rename") {
                                        setName(removeExtension(file.name ?? ""));
                                    }
                                    if (item.value === "share") {
                                        setEmails(file.users ?? []);
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
                                    {item.label}
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
