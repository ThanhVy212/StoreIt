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
import JSZip, {file} from 'jszip';
import { getFolderSize } from '@/lib/actions/folder.actions';
import { useLocale } from '@/lib/locale-context';
import {DetailRow} from "@/components/ActionsModalContent";

const FolderDetails = ({folder, fileCount}: { folder: FolderRow; fileCount: number }) => {
    const [totalSize, setTotalSize] = useState<number | null>(null);
    const { dictionary: t } = useLocale();

    useEffect(() => {
        let cancelled = false;
        getFolderSize(folder.$id).then((size) => {
            if (!cancelled) setTotalSize(size);
        });
        return () => { cancelled = true; };
    }, [folder.$id]);

    return (
        <div className="space-y-4 px-2 pt-2">
            <DetailRow label={t.actions.name} value={folder.name} />
            <DetailRow label={t.actions.size} value={totalSize !== null ? convertFileSize(totalSize) : t.actions.loading} />
            <DetailRow label={t.actions.files} value={fileCount.toString()} />
            <DetailRow label={t.actions.created} value={formatDateTime(folder.$createdAt)} />
            <DetailRow label={t.actions.modified} value={formatDateTime(folder.$updatedAt)} />
            {folder.owner && (
                <DetailRow label={t.actions.owner} value={folder.owner.email} avatar={folder.owner?.avatar} />
            )}
        </div>
    );
};

const downloadFolderAsZip = async (folderId: string, folderName: string, t: any) => {
    try {
        const files = await getFolderFilesForDownload(folderId);

        if (!files || files.length === 0) {
            toast.add({ type: 'info', description: t.actions.folderEmpty });
            return;
        }

        const zip = new JSZip();
        const folder = zip.folder(folderName);

        if (!folder) {
            toast.add({ type: 'error', description: t.actions.failedCreateZip });
            return;
        }

        toast.add({ type: 'info', description: t.actions.preparingDownload });

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

        toast.add({ type: 'success', description: t.actions.folderDownloaded });
    } catch (err) {
        console.error('Download failed:', err);
        toast.add({ type: 'error', description: t.actions.failedDownloadFolder });
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
    const { dictionary: t } = useLocale();

    const path = usePathname();
    const isTrashed = Boolean(folder.trashed);
    const isOwner = folder.owner?.$id === currentUserId;

    const menuItems = isTrashed
        ? [
            { label: 'Restore', key: 'restore', icon: '/assets/icons/restore.svg', value: 'restore' },
            { label: 'Details', key: 'details', icon: '/assets/icons/info.svg', value: 'details' },
            { label: 'Delete', key: 'delete', icon: '/assets/icons/delete.svg', value: 'delete' },
          ]
        : [
            { label: 'Rename', key: 'rename', icon: '/assets/icons/edit.svg', value: 'rename' },
            { label: 'Details', key: 'details', icon: '/assets/icons/info.svg', value: 'details' },
            { label: 'Share', key: 'share', icon: '/assets/icons/share.svg', value: 'share' },
            { label: 'Download', key: 'download', icon: '/assets/icons/download.svg', value: 'download' },
            { label: 'Move to trash', key: 'moveToTrash', icon: '/assets/icons/delete.svg', value: 'trash' },
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
                    toast.add({ type: 'success', description: t.toast.folderMovedToTrash });
                }
                if (currentAction === 'restore') {
                    toast.add({ type: 'success', description: t.toast.folderRestored });
                }
                if (currentAction === 'delete') {
                    toast.add({ type: 'success', description: t.toast.folderDeletedPermanently });
                }
                if (currentAction !== 'share') {
                    closeAllModals();
                }
            }
        } catch {
            toast.add({
                type: 'error',
                description: t.toast.somethingWrong,
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
                        {t.actions[action as keyof typeof t.actions] || action}
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
                            {t.actions.permanentlyDelete} folder{' '}
                            <span className="delete-file-name">{folder.name}</span>?
                            {t.actions.thisCannotBeUndone}
                        </p>
                    )}
                </DialogHeader>
                {['rename', 'delete'].includes(action) && (
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button onClick={closeAllModals} className="modal-cancel-button">
                            {t.actions.cancel}
                        </Button>
                        <Button
                            onClick={() => void handleAction()}
                            className="modal-submit-button"
                            disabled={isLoading}
                        >
                            <p className="capitalize">
                                {action === 'delete' ? t.actions.deleteForever : t.actions[action as keyof typeof t.actions] || action}
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
                                        void downloadFolderAsZip(folder.$id, folder.name, t);
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
                                    {t.actions[item.key as keyof typeof t.actions] || item.label}
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
