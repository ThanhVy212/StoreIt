'use client';

import React from 'react';
import Image from 'next/image';
import Thumbnail from '@/components/Thumbnail';
import UploadProgressBar from '@/components/UploadProgressBar';
import { getFileType } from '@/lib/utils';
import { useLocale } from '@/lib/locale-context';

export interface UploadingFile {
    file: File;
    url: string;
    progress: number;
    loaded: number;
    total: number;
    status: 'uploading' | 'saving' | 'completed' | 'error';
    xhr?: XMLHttpRequest;
}

interface UploadProgressListProps {
    files: UploadingFile[];
    onRemoveFile: (e: React.MouseEvent, fileName: string) => void;
}

const UploadProgressList = ({ files, onRemoveFile }: UploadProgressListProps) => {
    const { dictionary: t } = useLocale();
    if (files.length === 0) return null;

    return (
        <ul className="uploader-preview-list">
            <h4 className="h4 text-light-100">{t.upload.uploading} ({files.length})</h4>

            {files.map(({ file, url, progress, loaded, total, status }) => {
                const { type, extension } = getFileType(file.name);

                return (
                    <li
                        key={`${file.name}-${extension}`}
                        className="uploader-preview-item flex-col items-stretch gap-2"
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Thumbnail
                                    type={type}
                                    extension={extension}
                                    url={url}
                                />

                                <div className="preview-item-name overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] mb-0">
                                    {file.name}
                                </div>
                            </div>

                            <Image
                                src="/assets/icons/remove.svg"
                                alt="remove"
                                width={20}
                                height={20}
                                className="cursor-pointer"
                                onClick={(e) => onRemoveFile(e, file.name)}
                            />
                        </div>

                        <UploadProgressBar
                            loaded={loaded}
                            total={total}
                            progress={progress}
                            status={status}
                        />
                    </li>
                );
            })}
        </ul>
    );
};

export default UploadProgressList;
