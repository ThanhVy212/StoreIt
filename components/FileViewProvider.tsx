'use client';

import React, { createContext, useContext, useState } from 'react';
import { FileViewMode } from '@/types/db.types';

interface FileViewContextValue {
    viewMode: FileViewMode;
    setViewMode: (mode: FileViewMode) => void;
}

const FileViewContext = createContext<FileViewContextValue | null>(null);

export const FileViewProvider = ({ children }: { children: React.ReactNode }) => {
    const [viewMode, setViewMode] = useState<FileViewMode>('grid');

    return (
        <FileViewContext.Provider value={{ viewMode, setViewMode }}>
            {children}
        </FileViewContext.Provider>
    );
};

export const useFileView = () => {
    const context = useContext(FileViewContext);

    if (!context) {
        throw new Error('useFileView must be used within a FileViewProvider');
    }

    return context;
};
