'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FolderRow } from '@/types/db.types';
import { formatDateTime, getFileProxyUrl } from '@/lib/utils';
import FolderActionDropdown from '@/components/FolderActionDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/lib/locale-context';

const FolderTableRow = ({
    folder,
    fileCount,
    showCheckbox = false,
    isSelected = false,
    onToggleSelect,
    currentUserId,
    currentUserEmail,
}: {
    folder: FolderRow;
    fileCount: number;
    showCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (folder: FolderRow) => void;
    currentUserId?: string;
    currentUserEmail?: string;
}) => {
    const { lang } = useLocale();
    const folderIcon = fileCount > 0
        ? '/assets/icons/file-items-folder.svg'
        : '/assets/icons/file-empty-folder.svg';

    const isTrashed = Boolean(folder.trashed);

    const nameContent = (
        <>
            <Image
                src={folderIcon}
                alt=""
                width={24}
                height={24}
                className="file-table-icon"
            />
            <span className="file-table-name">{folder.name}</span>
        </>
    );

    return (
        <div className={`file-table-row ${isSelected ? 'file-table-row-selected' : ''}`}>
            <div
                className="file-table-cell file-table-cell-check"
                onClick={(e) => e.stopPropagation()}
            >
                {showCheckbox && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect?.(folder)}
                        aria-label={`Select ${folder.name}`}
                    />
                )}
            </div>

            {isTrashed ? (
                <div className="file-table-cell file-table-cell-name">
                    {nameContent}
                </div>
            ) : (
                <Link
                    href={`/${lang}/folders/${folder.$id}`}
                    className="file-table-cell file-table-cell-name"
                >
                    {nameContent}
                </Link>
            )}

            <p className="file-table-cell file-table-cell-owner">
                <Image
                    src={getFileProxyUrl(folder.owner?.avatar) || '/assets/icons/avatar-default.svg'}
                    alt="avatar"
                    width={24}
                    height={24}
                    unoptimized={getFileProxyUrl(folder.owner?.avatar).startsWith('/api/files/')}
                    className="file-table-owner-avatar"
                />
                <span className="file-table-owner-email">
                    {folder.owner?.email || '—'}
                </span>
            </p>

            <p className="file-table-cell file-table-cell-date">
                {formatDateTime(folder.$updatedAt || folder.$createdAt, lang)}
            </p>

            <p className="file-table-cell file-table-cell-size">
                {fileCount} file{fileCount !== 1 ? 's' : ''}
            </p>

            <div
                className="file-table-cell file-table-cell-actions"
                onClick={(e) => e.stopPropagation()}
            >
                <FolderActionDropdown
                    folder={folder}
                    fileCount={fileCount}
                    currentUserId={currentUserId}
                    currentUserEmail={currentUserEmail}
                />
            </div>
        </div>
    );
};

const FolderTableList = ({
    folders,
    fileCounts,
    selectedIds,
    onToggleSelect,
    currentUserId,
    currentUserEmail,
}: {
    folders: FolderRow[];
    fileCounts: Record<string, number>;
    selectedIds: string[];
    onToggleSelect: (folder: FolderRow) => void;
    currentUserId?: string;
    currentUserEmail?: string;
}) => {
    const { dictionary: t } = useLocale();
    return (
        <section className="file-table">
            <div className="file-table-header">
                <span className="file-table-cell file-table-cell-check" />
                <span className="file-table-cell">{t.files.name}</span>
                <span className="file-table-cell">{t.files.owner}</span>
                <span className="file-table-cell file-table-header-date">{t.files.dateModified}</span>
                <span className="file-table-cell file-table-header-size">{t.files.contents}</span>
                <span className="file-table-cell file-table-cell-actions" />
            </div>

            <div className="file-table-body">
                {folders.map((folder) => (
                    <FolderTableRow
                        key={folder.$id}
                        folder={folder}
                        fileCount={fileCounts[folder.$id] || 0}
                        showCheckbox={true}
                        isSelected={selectedIds.includes(folder.$id)}
                        onToggleSelect={onToggleSelect}
                        currentUserId={currentUserId}
                        currentUserEmail={currentUserEmail}
                    />
                ))}
            </div>
        </section>
    );
};

export default FolderTableList;
