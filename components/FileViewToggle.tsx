'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFileView } from '@/components/FileViewProvider';
import { FileViewMode } from '@/types/db.types';

const FileViewToggle = () => {
    const { viewMode, setViewMode } = useFileView();

    const handleViewChange = (mode: FileViewMode) => {
        setViewMode(mode);
    };

    return (
        <div className="view-toggle">
            <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                onClick={() => handleViewChange('list')}
                className={cn(
                    'view-toggle-btn',
                    viewMode === 'list' && 'view-toggle-btn-active'
                )}
            >
                <Image
                    src="/assets/icons/menu.svg"
                    alt="list view"
                    width={22}
                    height={22}
                    className={cn(viewMode === 'list' && 'view-toggle-icon-active')}
                />
            </button>

            <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                onClick={() => handleViewChange('grid')}
                className={cn(
                    'view-toggle-btn',
                    viewMode === 'grid' && 'view-toggle-btn-active'
                )}
            >
                <Image
                    src="/assets/icons/grid.svg"
                    alt="grid view"
                    width={22}
                    height={22}
                    className={cn(viewMode !== 'grid' && 'view-toggle-icon-inactive')}
                />
            </button>
        </div>
    );
};

export default FileViewToggle;
