import React from 'react';
import { convertFileSize } from '@/lib/utils';

export interface UploadProgressBarProps {
    loaded: number;
    total: number;
    progress: number;
    status: 'uploading' | 'saving' | 'completed' | 'error';
    className?: string;
}

const UploadProgressBar = ({
    loaded,
    total,
    progress,
    status,
    className,
}: UploadProgressBarProps) => {
    return (
        <div className={`w-full flex flex-col gap-1 ${className || ''}`}>
            <div className="flex justify-between items-center text-xs text-light-200">
                <span>
                    {status === 'saving'
                        ? 'Processing...'
                        : `${convertFileSize(loaded)} / ${convertFileSize(total)}`}
                </span>
                <span className="font-semibold text-brand">{progress}%</span>
            </div>

            <div className="w-full bg-light-300 h-1.5 rounded-full overflow-hidden">
                <div
                    className="bg-brand h-full transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default UploadProgressBar;
