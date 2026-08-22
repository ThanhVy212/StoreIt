'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FolderCardProps } from '@/types/db.types';
import { cn, convertFileSize } from '@/lib/utils';
import FormattedDateTime from '@/components/FormattedDateTime';
import FolderActionDropdown from '@/components/FolderActionDropdown';
import { Checkbox } from '@/components/ui/checkbox';

const FolderCard = ({
    folder,
    fileCount,
    showCheckbox = false,
    isSelected = false,
    onToggleSelect,
    currentUserId,
    currentUserEmail,
}: FolderCardProps & {
    showCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (folder: any) => void;
}) => {
    const folderIcon = fileCount > 0
        ? '/assets/icons/file-items-folder.svg'
        : '/assets/icons/file-empty-folder.svg';

    return (
        <div className={cn('file-card relative group transition-all', isSelected && 'file-card-selected')}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    {showCheckbox && (
                        <div className="pt-1 z-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onToggleSelect?.(folder)}
                                aria-label={`Select ${folder.name}`}
                            />
                        </div>
                    )}

                    <Link href={`/folders/${folder.$id}`}>
                        <div className="!size-20 flex items-center justify-center">
                            <Image
                                src={folderIcon}
                                alt="folder"
                                width={80}
                                height={80}
                                className="!size-full object-contain"
                            />
                        </div>
                    </Link>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch">
                    <FolderActionDropdown folder={folder} fileCount={fileCount} currentUserId={currentUserId} currentUserEmail={currentUserEmail} />
                </div>
            </div>

            <Link href={`/folders/${folder.$id}`} className="file-card-details">
                <p className="subtitle-2 line-clamp-1">{folder.name}</p>
                <FormattedDateTime date={folder.$createdAt} className="body-2 text-light-100" />
                <p className="caption line-clamp-1 text-light-200">
                    {fileCount} file{fileCount !== 1 ? 's' : ''}
                </p>
            </Link>
        </div>
    );
};

export default FolderCard;
