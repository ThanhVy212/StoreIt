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

import React, {useEffect, useState} from 'react';
import {FileRow} from "@/types/db.types";
import Image from "next/image";
import {actionsDropdownItems} from "@/constants";
import {addExtension, constructDownloadUrl, downloadFile, removeExtension} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {deleteFile, renameFile, updateFileUsers} from "@/lib/actions/file.actions";
import {usePathname} from "next/navigation";
import {FileDetails, ShareInput} from "@/components/ActionsModalContent";



const ActionDropdown = ({file}: {file: FileRow}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [action, setAction] = useState<ActionType | null>(null);
    const [name, setName] = useState(removeExtension(file.name ?? ""))
    const [isLoading, setIsLoading] = useState(false);
    const [emails, setEmails] = useState<string[]>([]);

    const path = usePathname();

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

    const handleAction = async () => {
        if(!action) return;
        setIsLoading(true);
        let success: any = false;

        const actions = {
            rename: () => renameFile({fileId: file.$id, name: name.trim(), extension: file.extension!, path}),
            share: () => updateFileUsers({fileId: file.$id, emails, path}),
            delete: () => deleteFile({fileId: file.$id, bucketFileId: file.bucketFileId, path}),
        }

        success = await actions[action.value as keyof typeof actions]();

        if (success) {
            if (action.value === "rename" && success?.name) {
                setName(removeExtension(success.name));
            }
            closeAllModals();
        }

        setIsLoading(false);
    }

    const handleRemoveUser = async (email: string) => {
        const updatedEmails = emails.filter((e) => e !== email);

        const success = await updateFileUsers({fileId: file.$id, emails: updatedEmails, path});

        if(success) setEmails(updatedEmails);
        closeAllModals();
    }

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
                        <ShareInput file={file} onInputChange={setEmails} onRemove={handleRemoveUser}/>
                    )}
                    {value === "delete" && (
                        <p className="delete-confirmation">
                            Are you sure you want to delete {` `}
                            <span className="delete-file-name">{addExtension(name, file.extension!)}</span>?
                        </p>
                    )}
                </DialogHeader>
                {['rename', 'delete', 'share'].includes(value) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={closeAllModals} className="modal-cancel-button">Cancel</Button>
                        <Button onClick={handleAction} className="modal-submit-button ">
                            <p className="capitalize">{value}</p>
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
                        {actionsDropdownItems.map((item) => (
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

                                    setAction(item);

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
