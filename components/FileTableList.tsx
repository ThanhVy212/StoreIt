'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileCardProps, FileTableListProps } from '@/types/db.types';
import { cn, convertFileSize, formatDateTime, getFileIcon, getFileProxyUrl } from '@/lib/utils';
import ActionDropdown from '@/components/ActionDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/lib/locale-context';

const FileTableRow = ({
    file,
    showCheckbox = false,
    isSelected = false,
    onToggleSelect,
    currentUserId,
    currentUserEmail,
}: FileCardProps) => {
    const { lang } = useLocale();
    const fileUrl = getFileProxyUrl(file.url);
    const modifiedAt = file.$updatedAt || file.$createdAt;

    return (
        <div
            className={cn(
                'file-table-row',
                isSelected && 'file-table-row-selected'
            )}
        >
            <div
                className="file-table-cell file-table-cell-check"
                onClick={(e) => e.stopPropagation()}
            >
                {showCheckbox && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect?.(file)}
                        aria-label={`Select ${file.name}`}
                    />
                )}
            </div>

            <Link
                href={fileUrl}
                target="_blank"
                className="file-table-cell file-table-cell-name"
            >
                <Image
                    src={getFileIcon(file.extension ?? '', file.type)}
                    alt=""
                    width={24}
                    height={24}
                    className="file-table-icon"
                />
                <span className="file-table-name">{file.name}</span>
            </Link>

            <p className="file-table-cell file-table-cell-owner">
                <Image
                    src={getFileProxyUrl(file.owner?.avatar) || "/assets/icons/avatar-default.svg"}
                    alt="avatar"
                    width={24}
                    height={24}
                    unoptimized={getFileProxyUrl(file.owner?.avatar).startsWith('/api/files/')}
                    className="file-table-owner-avatar"
                />

                <span className="file-table-owner-email">
                    {file.owner?.email || '—'}
                </span>
            </p>

            <p className="file-table-cell file-table-cell-date">
                {formatDateTime(modifiedAt, lang)}
            </p>

            <p className="file-table-cell file-table-cell-size">
                {file.size != null ? convertFileSize(file.size) : '—'}
            </p>

            <div
                className="file-table-cell file-table-cell-actions"
                onClick={(e) => e.stopPropagation()}
            >
                <ActionDropdown file={file} currentUserId={currentUserId} currentUserEmail={currentUserEmail} />
            </div>
        </div>
    );
};

const FileTableList = ({
    files,
    selectedIds,
    onToggleSelect,
    currentUserId,
}: FileTableListProps) => {
    const { lang, dictionary: t } = useLocale();
    return (
        <section className="file-table">
            <div className="file-table-header">
                <span className="file-table-cell file-table-cell-check" />
                <span className="file-table-cell">{t.files.name}</span>
                <span className="file-table-cell">{t.files.owner}</span>
                <span className="file-table-cell file-table-header-date">{t.files.dateModified}</span>
                <span className="file-table-cell file-table-header-size">{t.files.fileSize}</span>
                <span className="file-table-cell file-table-cell-actions" />
            </div>

            <div className="file-table-body">
                {files.map((file) => (
                    <FileTableRow
                        key={file.$id}
                        file={file}
                        showCheckbox={true}
                        isSelected={selectedIds.includes(file.$id)}
                        onToggleSelect={onToggleSelect}
                        currentUserId={currentUserId}
                    />
                ))}
            </div>
        </section>
    );
};

export default FileTableList;
