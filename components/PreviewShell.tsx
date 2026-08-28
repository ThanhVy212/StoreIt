'use client';

import React from 'react';
import { FilePreviewProvider } from '@/components/FilePreviewProvider';
import FilePreviewModal from '@/components/FilePreviewModal';

export default function PreviewShell({ children }: { children: React.ReactNode }) {
    return (
        <FilePreviewProvider>
            {children}
            <FilePreviewModal />
        </FilePreviewProvider>
    );
}
