'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileCardProps, FileTableListProps } from '@/types/db.types';
import { cn, convertFileSize, formatDateTime, getFileIcon } from '@/lib/utils';
import ActionDropdown from '@/components/ActionDropdown';
import { Checkbox } from '@/components/ui/checkbox';

const getFileUrl = (url: string) =>
    url?.includes('project=undefined')
        ? url.replace(
              'project=undefined',
              `project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`
          )
        : url;

const FileTableRow = ({
    file,
    showCheckbox = false,
    isSelected = false,
    onToggleSelect,
}: FileCardProps) => {
    const fileUrl = getFileUrl(file.url);
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
                    src={file.owner?.avatar ?? ""}
                    alt="avatar"
                    width={24}
                    height={24}
                    className="file-table-owner-avatar"
                />

                <span className="file-table-owner-email">
                    {file.owner?.email || '—'}
                </span>
            </p>

            <p className="file-table-cell file-table-cell-date">
                {formatDateTime(modifiedAt)}
            </p>

            <p className="file-table-cell file-table-cell-size">
                {file.size != null ? convertFileSize(file.size) : '—'}
            </p>

            <div
                className="file-table-cell file-table-cell-actions"
                onClick={(e) => e.stopPropagation()}
            >
                <ActionDropdown file={file} />
            </div>
        </div>
    );
};

const FileTableList = ({
    files,
    selectedIds,
    onToggleSelect,
}: FileTableListProps) => {
    return (
        <section className="file-table">
            <div className="file-table-header">
                <span className="file-table-cell file-table-cell-check" />
                <span className="file-table-cell">Name</span>
                <span className="file-table-cell">Owner</span>
                <span className="file-table-cell file-table-header-date">Date modified</span>
                <span className="file-table-cell file-table-header-size">File size</span>
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
                    />
                ))}
            </div>
        </section>
    );
};

export default FileTableList;
