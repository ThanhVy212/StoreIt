'use client';
import React, { useState } from 'react';
import FileCard from '@/components/FileCard';
import FileTableList from '@/components/FileTableList';
import { useFileView } from '@/components/FileViewProvider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { constructDownloadUrl, downloadFile } from '@/lib/utils';
import { deleteFiles, moveFilesToTrash, restoreFiles } from '@/lib/actions/file.actions';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {TypeFileListProps} from "@/types/db.types";

const TypeFileList = ({ files, isTrash = false, currentUserId, currentUserEmail }: TypeFileListProps) => {
    const { viewMode } = useFileView();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const path = usePathname();
    const isAllSelected = files.length > 0 && selectedIds.length === files.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < files.length;
    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(files.map((file) => file.$id));
        }
    };
    const handleToggleSelect = (fileId: string) => {
        setSelectedIds((prev) =>
            prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
        );
    };
    const handleClearSelection = () => {
        setSelectedIds([]);
    };
    const handleDownloadSelected = async () => {
        const selectedFiles = files.filter((f) => selectedIds.includes(f.$id));
        for (const file of selectedFiles) {
            const url = constructDownloadUrl(file.bucketFileId);
            await downloadFile(url, file.name);
        }
    };

    const handleMoveSelectedToTrash = async () => {
        if (selectedIds.length === 0) return;
        setIsUpdating(true);
        try {
            await moveFilesToTrash({ fileIds: selectedIds, path });
            toast.add({
                type: 'success',
                description: `Moved ${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''} to trash.`,
            });
            setSelectedIds([]);
        } catch {
            toast.add({
                type: 'error',
                description: 'Failed to move files to trash. Please try again.',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedIds.length === 0) return;
        setIsUpdating(true);
        try {
            await restoreFiles({ fileIds: selectedIds, path });
            toast.add({
                type: 'success',
                description: `Restored ${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''}.`,
            });
            setSelectedIds([]);
        } catch {
            toast.add({
                type: 'error',
                description: 'Failed to restore files. Please try again.',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteSelected = async () => {
        const selectedFiles = files.filter((f) => selectedIds.includes(f.$id));
        if (selectedFiles.length === 0) return;
        setIsDeleting(true);
        try {
            await deleteFiles({
                files: selectedFiles.map((f) => ({
                    fileId: f.$id,
                    bucketFileId: f.bucketFileId,
                })),
                path,
            });
            toast.add({
                type: 'success',
                description: `Permanently deleted ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}.`,
            });
            setSelectedIds([]);
            setIsDeleteDialogOpen(false);
        } catch {
            toast.add({
                type: 'error',
                description: 'Failed to delete selected files. Please try again.',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    if (files.length === 0) {
        return <p className="empty-list">{isTrash ? 'Trash is empty' : 'No files uploaded'}</p>;
    }

    return (
        <div className="file-type-list">
            {/* Selection Toolbar */}
            <div className="selection-toolbar">
                <div className="selection-toolbar-left">
                    <Checkbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onCheckedChange={handleToggleSelectAll}
                        id="select-all-files"
                    />

                    <label
                        htmlFor="select-all-files"
                        className="body-2 selection-toolbar-label"
                    >
                        Select All{' '}
                        {selectedIds.length > 0 && (
                            <span className="selection-toolbar-count">
                    ({selectedIds.length} / {files.length} selected)
                </span>
                        )}
                    </label>
                </div>

                {selectedIds.length > 0 && (
                    <div className="selection-toolbar-actions">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="selection-toolbar-download"
                            onClick={handleDownloadSelected}
                        >
                            <Image
                                src="/assets/icons/download.svg"
                                alt="download"
                                width={16}
                                height={16}
                            />
                            <span>Download ({selectedIds.length})</span>
                        </Button>

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
                                    <span>Restore ({selectedIds.length})</span>
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
                                    <span>Delete forever ({selectedIds.length})</span>
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
                                <span>Move to trash ({selectedIds.length})</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="selection-toolbar-clear"
                            onClick={handleClearSelection}
                        >
                            Clear
                        </Button>
                    </div>
                )}
            </div>

            {viewMode === 'grid' ? (
                <section className="file-list">
                    {files.map((file) => (
                        <FileCard
                            key={file.$id}
                            file={file}
                            showCheckbox={true}
                            isSelected={selectedIds.includes(file.$id)}
                            onToggleSelect={() => handleToggleSelect(file.$id)}
                            currentUserId={currentUserId}
                            currentUserEmail={currentUserEmail}
                        />
                    ))}
                </section>
            ) : (
                <FileTableList
                    files={files}
                    selectedIds={selectedIds}
                    onToggleSelect={(file) => handleToggleSelect(file.$id)}
                    currentUserId={currentUserId}
                    currentUserEmail={currentUserEmail}
                />
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="shad-dialog button">
                    <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                        <DialogTitle className="text-center text-light-100">
                            Delete {selectedIds.length} file{selectedIds.length > 1 ? 's' : ''} forever
                        </DialogTitle>
                        <p className="delete-confirmation text-center">
                            Are you sure you want to permanently delete{' '}
                            <span className="font-semibold text-dark-200">
                                {selectedIds.length} selected file{selectedIds.length > 1 ? 's' : ''}
                            </span>
                            ? This action cannot be undone.
                        </p>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="modal-cancel-button"
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteSelected}
                            className="modal-submit-button"
                            disabled={isDeleting}
                        >
                            <p>Delete forever</p>
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
export default TypeFileList;
