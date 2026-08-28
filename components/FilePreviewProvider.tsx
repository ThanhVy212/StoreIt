'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { FileRow } from '@/types/db.types';

interface FilePreviewContextValue {
    previewFile: FileRow | null;
    previewFiles: FileRow[];
    openPreview: (file: FileRow, files?: FileRow[]) => void;
    closePreview: () => void;
    goNext: () => void;
    goPrev: () => void;
    currentIndex: number;
    totalCount: number;
    isOpen: boolean;
}

const FilePreviewContext = createContext<FilePreviewContextValue | null>(null);

export const FilePreviewProvider = ({ children }: { children: React.ReactNode }) => {
    const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
    const [previewFiles, setPreviewFiles] = useState<FileRow[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const currentIndex = previewFiles.findIndex((f) => f.$id === previewFile?.$id);
    const totalCount = previewFiles.length;

    const openPreview = useCallback((file: FileRow, files?: FileRow[]) => {
        setPreviewFile(file);
        setPreviewFiles(files && files.length > 0 ? files : [file]);
        setIsOpen(true);
    }, []);

    const closePreview = useCallback(() => {
        setIsOpen(false);
        setPreviewFile(null);
    }, []);

    const goNext = useCallback(() => {
        if (currentIndex < 0 || currentIndex >= previewFiles.length - 1) return;
        setPreviewFile(previewFiles[currentIndex + 1]);
    }, [currentIndex, previewFiles]);

    const goPrev = useCallback(() => {
        if (currentIndex <= 0) return;
        setPreviewFile(previewFiles[currentIndex - 1]);
    }, [currentIndex, previewFiles]);

    return (
        <FilePreviewContext.Provider
            value={{
                previewFile,
                previewFiles,
                openPreview,
                closePreview,
                goNext,
                goPrev,
                currentIndex,
                totalCount,
                isOpen,
            }}
        >
            {children}
        </FilePreviewContext.Provider>
    );
};

export const useFilePreview = () => {
    const context = useContext(FilePreviewContext);
    if (!context) {
        throw new Error('useFilePreview must be used within a FilePreviewProvider');
    }
    return context;
};
