'use client';
import React, { useState } from 'react';
import FolderCard from '@/components/FolderCard';
import FolderTableList from '@/components/FolderTableList';
import { useFileView } from '@/components/FileViewProvider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { moveFoldersToTrash, restoreFolders, deleteFolders } from '@/lib/actions/folder.actions';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FolderRow } from '@/types/db.types';
import { useLocale } from '@/lib/locale-context';

interface TypeFolderListProps {
    folders: FolderRow[];
    fileCounts: Record<string, number>;
    isTrash?: boolean;
    currentUserId?: string;
    currentUserEmail?: string;
}

const TypeFolderList = ({
    folders,
    fileCounts,
    isTrash = false,
    currentUserId,
    currentUserEmail,
}: TypeFolderListProps) => {
    const { viewMode } = useFileView();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const path = usePathname();
    const { dictionary: t } = useLocale();

    const isAllSelected = folders.length > 0 && selectedIds.length === folders.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < folders.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(folders.map((f) => f.$id));
        }
    };

    const handleToggleSelect = (folderId: string) => {
        setSelectedIds((prev) =>
            prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
        );
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const handleMoveSelectedToTrash = async () => {
        if (selectedIds.length === 0) return;
        setIsUpdating(true);
        try {
            await moveFoldersToTrash({ folderIds: selectedIds, path });
            toast.add({
                type: 'success',
                description: t.toast.folderMovedToTrash,
            });
            setSelectedIds([]);
        } catch {
            toast.add({
                type: 'error',
                description: t.toast.somethingWrong,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedIds.length === 0) return;
        setIsUpdating(true);
        try {
            await restoreFolders({ folderIds: selectedIds, path });
            toast.add({
                type: 'success',
                description: t.toast.folderRestored,
            });
            setSelectedIds([]);
        } catch {
            toast.add({
                type: 'error',
                description: t.toast.somethingWrong,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        setIsDeleting(true);
        try {
            await deleteFolders({ folderIds: selectedIds, path });
            toast.add({
                type: 'success',
                description: t.toast.folderDeletedPermanently,
            });
            setSelectedIds([]);
            setIsDeleteDialogOpen(false);
        } catch {
            toast.add({
                type: 'error',
                description: t.toast.somethingWrong,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    if (folders.length === 0) {
        return (
            <p className="empty-list">
                {isTrash ? 'Trash is empty' : 'No folders created'}
            </p>
        );
    }

    const selectedCount = selectedIds.length;
    const foldersText = selectedCount === 1 ? t.deleteConfirm.selectedFolder : t.deleteConfirm.selectedFolders;

    return (
        <div className="file-type-list">
            <div className="selection-toolbar">
                <div className="selection-toolbar-left">
                    <Checkbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onCheckedChange={handleToggleSelectAll}
                        id="select-all-folders"
                    />
                    <label
                        htmlFor="select-all-folders"
                        className="body-2 selection-toolbar-label"
                    >
                        {t.common.selectAll}{' '}
                        {selectedIds.length > 0 && (
                            <span className="selection-toolbar-count">
                                ({selectedIds.length} / {folders.length} {t.selection.selected})
                            </span>
                        )}
                    </label>
                </div>

                {selectedIds.length > 0 && (
                    <div className="selection-toolbar-actions">
                        {isTrash ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="selection-toolbar-download"
                                    onClick={handleRestoreSelected}
                                    disabled={isUpdating}
                                >
                                    <Image
                                        src="/assets/icons/restore.svg"
                                        alt="restore"
                                        width={16}
                                        height={16}
                                    />
                                    <span>{t.selection.restore} ({selectedIds.length})</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="selection-toolbar-delete"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Image
                                        src="/assets/icons/delete.svg"
                                        alt="delete"
                                        width={16}
                                        height={16}
                                    />
                                    <span>{t.selection.deleteForever} ({selectedIds.length})</span>
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="selection-toolbar-delete"
                                onClick={handleMoveSelectedToTrash}
                                disabled={isUpdating}
                            >
                                <Image
                                    src="/assets/icons/delete.svg"
                                    alt="trash"
                                    width={16}
                                    height={16}
                                />
                                <span>{t.selection.moveToTrash} ({selectedIds.length})</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="selection-toolbar-clear"
                            onClick={handleClearSelection}
                        >
                            {t.common.clear}
                        </Button>
                    </div>
                )}
            </div>

            {viewMode === 'grid' ? (
                <section className="file-list">
                    {folders.map((folder) => (
                        <FolderCard
                            key={folder.$id}
                            folder={folder}
                            fileCount={fileCounts[folder.$id] || 0}
                            showCheckbox={true}
                            isSelected={selectedIds.includes(folder.$id)}
                            onToggleSelect={() => handleToggleSelect(folder.$id)}
                            currentUserId={currentUserId}
                            currentUserEmail={currentUserEmail}
                        />
                    ))}
                </section>
            ) : (
                <FolderTableList
                    folders={folders}
                    fileCounts={fileCounts}
                    selectedIds={selectedIds}
                    onToggleSelect={(folder) => handleToggleSelect(folder.$id)}
                    currentUserId={currentUserId}
                    currentUserEmail={currentUserEmail}
                />
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="shad-dialog button">
                    <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                        <DialogTitle className="text-center text-light-100">
                            {t.deleteConfirm.deleteFoldersForever.replace("{count}", String(selectedIds.length))}
                        </DialogTitle>
                        <p className="delete-confirmation text-center">
                            {t.deleteConfirm.confirmDeleteFolders}{' '}
                            <span className="font-semibold text-dark-200">
                                {selectedIds.length} {foldersText}
                            </span>
                            ? {t.deleteConfirm.allContentsDeleted}
                        </p>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="modal-cancel-button"
                            disabled={isDeleting}
                        >
                            {t.actions.cancel}
                        </Button>
                        <Button
                            onClick={handleDeleteSelected}
                            className="modal-submit-button"
                            disabled={isDeleting}
                        >
                            <p>{t.actions.deleteForever}</p>
                            {isDeleting && (
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
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TypeFolderList;
