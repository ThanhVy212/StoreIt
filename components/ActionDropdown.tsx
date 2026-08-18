'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
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

import React, {useState} from 'react';
import {FileRow} from "@/types/db.types";
import Image from "next/image";
import {actionsDropdownItems} from "@/constants";
import Link from "next/link";
import {constructDownloadUrl} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";



const ActionDropdown = ({file}: {file: FileRow}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [action, setAction] = useState<ActionType | null>(null);
    const [name, setName] = useState(file.name ?? "");
    const [isLoading, setIsLoading] = useState(false);

    const handleCloseModals = () => {
        setIsModalOpen(false);
        setIsDropdownOpen(false);
        setAction(null);
        setName(file.name ?? "");
        // setEmails([]);
    }

    const handleAction = () => {

    }



    const renderDialogContent = () => {
        if(!action) return null;

        const {value, label} = action;

        return (
            <DialogContent className="shad-dialog button">
                <DialogHeader className="flex flex-col gap-3">
                    <DialogTitle className="text-center text-light-100">
                        {label}
                    </DialogTitle>
                    <DialogDescription className="text-center text-light-200">
                        This action cannot be undone
                    </DialogDescription>
                    {value === "rename" && (
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                </DialogHeader>
                {['rename', 'delete', 'share'].includes(value) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={handleCloseModals} className="modal-cancel-button">Cancel</Button>
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
                <DropdownMenuContent>
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
                                {item.value === "download" ? (
                                    <Link
                                        href={constructDownloadUrl(file.bucketFileId)}
                                        download={file.name}
                                        className="flex items-center gap-2"
                                    >
                                        <Image
                                            src={item.icon}
                                            alt={item.label}
                                            width={30}
                                            height={30}
                                        />
                                        {item.label}
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={item.icon}
                                            alt={item.label}
                                            width={30}
                                            height={30}
                                        />
                                        {item.label}
                                    </div>
                                )}
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
