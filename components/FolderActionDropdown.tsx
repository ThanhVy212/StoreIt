'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import React, { useEffect, useState } from 'react';
import { FolderRow } from '@/types/db.types';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { deleteFolder, getFolderFilesForDownload, moveFolderToTrash, renameFolder, restoreFolder, updateFolderUsers } from '@/lib/actions/folder.actions';
import { constructDownloadUrl, convertFileSize, downloadFile, formatDateTime } from '@/lib/utils';
import JSZip from 'jszip';
import { getFolderSize } from '@/lib/actions/folder.actions';

const FolderDetails = ({
    folder,
    fileCount,
}: {
    folder: FolderRow;
    fileCount: number;
}) => {
    const [totalSize, setTotalSize] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        getFolderSize(folder.$id).then((size) => {
            if (!cancelled) setTotalSize(size);
        });
        return () => { cancelled = true; };
    }, [folder.$id]);

    return (
        <div className="space-y-4 px-2 pt-2">
            <div className="flex gap-2">
                <p className="file-details-label text-left shrink-0">Name:</p>
                <p className="file-details-value text-left">{folder.name}</p>
            </div>
            <div className="flex gap-2">
                <p className="file-details-label text-left shrink-0">Size:</p>
                <p className="file-details-value text-left">
                    {totalSize !== null ? convertFileSize(totalSize) : 'Loading...'}
                </p>
            </div>
            <div className="flex gap-2">
                <p className="file-details-label text-left shrink-0">Files:</p>
                <p className="file-details-value text-left">{fileCount}</p>
            </div>
            <div className="flex gap-2">
                <p className="file-details-label text-left shrink-0">Created:</p>
                <p className="file-details-value text-left">{formatDateTime(folder.$createdAt)}</p>
            </div>
            <div className="flex gap-2">
                <p className="file-details-label text-left shrink-0">Modified:</p>
                <p className="file-details-value text-left">{formatDateTime(folder.$updatedAt)}</p>
            </div>
            {folder.owner && (
                <div className="flex gap-2">
                    <p className="file-details-label text-left shrink-0">Owner:</p>
                    <p className="file-details-value text-left">{folder.owner.email}</p>
                </div>
            )}
        </div>
    );
};

const downloadFolderAsZip = async (folderId: string, folderName: string) => {
    try {
        const files = await getFolderFilesForDownload(folderId);

        if (!files || files.length === 0) {
            toast.add({ type: 'info', description: 'Folder is empty. Nothing to download.' });
            return;
        }

        const zip = new JSZip();
        const folder = zip.folder(folderName);

        if (!folder) {
            toast.add({ type: 'error', description: 'Failed to create zip file.' });
            return;
        }

        toast.add({ type: 'info', description: 'Preparing download...' });

        await Promise.all(
            files.map(async (file: { name: string; url: string }) => {
                try {
                    const response = await fetch(file.url);
                    if (response.ok) {
                        const blob = await response.blob();
                        folder.file(file.name, blob);
                    }
                } catch (err) {
                    console.error(`Failed to fetch file: ${file.name}`, err);
                }
            })
        );

        const content = await zip.generateAsync({ type: 'blob' });
        const blobUrl = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast.add({ type: 'success', description: 'Folder downloaded successfully.' });
    } catch (err) {
        console.error('Download failed:', err);
        toast.add({ type: 'error', description: 'Failed to download folder.' });
    }
};

const FolderActionDropdown = ({
    folder,
    fileCount,
    currentUserId,
    currentUserEmail,
}: {
    folder: FolderRow;
    fileCount: number;
    currentUserId?: string;
    currentUserEmail?: string;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [action, setAction] = useState<string | null>(null);
    const [name, setName] = useState(folder.name ?? '');
    const [isLoading, setIsLoading] = useState(false);
    const [emails, setEmails] = useState<string[]>([]);

    const path = usePathname();
    const isTrashed = Boolean(folder.trashed);
    const isOwner = folder.owner?.$id === currentUserId;

    const menuItems = isTrashed
        ? [
            { label: 'Restore', icon: '/assets/icons/restore.svg', value: 'restore' },
            { label: 'Details', icon: '/assets/icons/info.svg', value: 'details' },
            { label: 'Delete', icon: '/assets/icons/delete.svg', value: 'delete' },
          ]
        : [
            { label: 'Rename', icon: '/assets/icons/edit.svg', value: 'rename' },
            { label: 'Details', icon: '/assets/icons/info.svg', value: 'details' },
            { label: 'Share', icon: '/assets/icons/share.svg', value: 'share' },
            { label: 'Download', icon: '/assets/icons/download.svg', value: 'download' },
            { label: 'Move to trash', icon: '/assets/icons/delete.svg', value: 'trash' },
          ];

    useEffect(() => {
        setName(folder.name ?? '');
    }, [folder.name]);

    const closeAllModals = () => {
        setIsModalOpen(false);
        setIsDropdownOpen(false);
        setAction(null);
        setName(folder.name ?? '');
        setEmails([]);
    };

    const handleAction = async (selectedAction?: string | null) => {
        const currentAction = selectedAction ?? action;
        if (!currentAction) return;

        const actions: Record<string, () => Promise<any>> = {
            rename: () => renameFolder({ folderId: folder.$id, name: name.trim(), path }),
            trash: () => moveFolderToTrash({ folderId: folder.$id, path }),
            restore: () => restoreFolder({ folderId: folder.$id, path }),
            delete: () => deleteFolder({ folderId: folder.$id, path }),
            share: () => updateFolderUsers({ folderId: folder.$id, emails, path }),
        };

        try {
            setIsLoading(true);
            const success = await actions[currentAction]();
            if (success) {
                if (currentAction === 'rename' && success?.name) {
                    setName(success.name);
                }
                if (currentAction === 'trash') {
                    toast.add({ type: 'success', description: 'Folder moved to trash.' });
                }
                if (currentAction === 'restore') {
                    toast.add({ type: 'success', description: 'Folder restored.' });
                }
                if (currentAction === 'delete') {
                    toast.add({ type: 'success', description: 'Folder deleted permanently.' });
                }
                if (currentAction !== 'share') {
                    closeAllModals();
                }
            }
        } catch {
            toast.add({
                type: 'error',
                description: 'Something went wrong. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderDialogContent = () => {
        if (!action || !['rename', 'share', 'delete', 'details'].includes(action)) return null;

        return (
            <DialogContent className="shad-dialog button">
                <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                    <DialogTitle className="text-center text-light-100">
                        {action === 'rename' && 'Rename'}
                        {action === 'details' && 'Details'}
                        {action === 'share' && 'Share'}
                        {action === 'delete' && 'Delete'}
                    </DialogTitle>
                    {action === 'rename' && (
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    {action === 'details' && (
                        <FolderDetails folder={folder} fileCount={fileCount} />
                    )}
                    {action === 'delete' && (
                        <p className="delete-confirmation">
                            Permanently delete folder{' '}
                            <span className="delete-file-name">{folder.name}</span>?
                            This cannot be undone.
                        </p>
                    )}
                </DialogHeader>
                {['rename', 'delete'].includes(action) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={closeAllModals} className="modal-cancel-button">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => void handleAction()}
                            className="modal-submit-button"
                            disabled={isLoading}
                        >
                            <p className="capitalize">
                                {action === 'delete' ? 'Delete forever' : action}
                            </p>
                            {isLoading && (
                                <Image
                                    src="/assets/icons/loader.svg"
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
        );
    };

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
                        <DropdownMenuLabel className="max-w-[200px] truncate">
                            {folder.name}
                        </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        {menuItems.map((item) => (
                            <DropdownMenuItem
                                key={item.value}
                                className="shad-dropdown-item"
                                onClick={() => {
                                    if (item.value === 'rename') {
                                        setName(folder.name ?? '');
                                    }

                                    if (item.value === 'download') {
                                        setIsDropdownOpen(false);
                                        void downloadFolderAsZip(folder.$id, folder.name);
                                        return;
                                    }

                                    setAction(item.value);

                                    if (item.value === 'trash' || item.value === 'restore') {
                                        setIsDropdownOpen(false);
                                        void handleAction(item.value);
                                        return;
                                    }

                                    if (['rename', 'share', 'delete', 'details'].includes(item.value)) {
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
    );
};

export default FolderActionDropdown;
