'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { usePathname } from 'next/navigation';
import { createFolder } from '@/lib/actions/folder.actions';
import { useLocale } from '@/lib/locale-context';

const CreateFolderButton = ({
    ownerId,
    accountId,
    parentFolderId,
}: {
    ownerId: string;
    accountId: string;
    parentFolderId?: string | null;
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const path = usePathname();
    const { dictionary: t } = useLocale();

    const handleCreate = async () => {
        const trimmedName = folderName.trim();
        if (!trimmedName) {
            toast.add({
                type: 'error',
                description: t.toast.enterFolderName,
            });
            return;
        }

        setIsLoading(true);
        try {
            await createFolder({
                name: trimmedName,
                accountId,
                owner: ownerId,
                parentFolderId,
                path,
            });
            toast.add({
                type: 'success',
                description: parentFolderId ? t.toast.subfolderCreated : t.toast.folderCreated,
            });
            setFolderName('');
            setIsModalOpen(false);
        } catch {
            toast.add({
                type: 'error',
                description: t.toast.failedCreateFolder,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-brand text-white hover:bg-brand-100"
            >
                <Image
                    src="/assets/icons/folder.svg"
                    alt="create folder"
                    width={20}
                    height={20}
                />
                <span>{parentFolderId ? t.folders.createSubfolder : t.folders.createFolder}</span>
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="shad-dialog button">
                    <DialogHeader className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
                        <DialogTitle className="text-center text-light-100">
                            {parentFolderId ? t.folders.createNewSubfolder : t.folders.createNewFolder}
                        </DialogTitle>
                        <Input
                            type="text"
                            placeholder={t.folders.enterFolderName}
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleCreate();
                                }
                            }}
                            autoFocus
                        />
                    </DialogHeader>
                    <DialogFooter className="flex flex-col gap-3 md:flex-row">
                        <Button
                            onClick={() => {
                                setIsModalOpen(false);
                                setFolderName('');
                            }}
                            className="modal-cancel-button"
                        >
                            {t.actions.cancel}
                        </Button>
                        <Button
                            onClick={() => void handleCreate()}
                            className="modal-submit-button"
                            disabled={isLoading}
                        >
                            <p>{t.common.create}</p>
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
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CreateFolderButton;
