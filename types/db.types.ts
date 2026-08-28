import {Models} from "node-appwrite";

export type UserRow = Models.Row & {
    fullName: string;
    email: string;
    avatar?: string;
}

export type FileRow = Models.Row & {
    name: string;
    url: string;
    type: FileType;
    bucketFileId: string;
    accountId: string;
    owner?: UserRow | null;
    extension?: string | null;
    size?: number | null;
    users?: string[] | null;
    trashed?: boolean | null;
    trashedAt?: string | null;
    folderId?: string | null;
};

export type FolderRow = Models.Row & {
    name: string;
    accountId: string;
    owner?: UserRow | null;
    parentFolderId?: string | null;
    users?: string[] | null;
    trashed?: boolean | null;
    trashedAt?: string | null;
};

export type FileLinkRow = Models.Row & {
    fileId: string;
    bucketFileId: string;
    tokenId: string;
    createdBy: string;
    expiresAt: string;
    revoked: boolean;
};

export interface ShareInputProps {
    file: FileRow;
    onAddEmails: (newEmails: string[]) => void;
    onRemove: (email: string) => void;
    isOwner?: boolean;
    registerValidator?: (validate: () => boolean) => void;
    sharedEmails?: string[];
    onLoadingChange?: (loading: boolean) => void;
    onPublicLinkRevoked?: () => void;
    onLinkGenerated?: () => void;
    activePublicLink?: { tokenId: string; expiresAt: string; url: string } | null;
}

export type FileViewMode = 'grid' | 'list';

export interface TypeFileListProps {
    files: FileRow[];
    isTrash?: boolean;
    currentUserId?: string;
    currentUserEmail?: string;
}

export interface FolderCardProps {
    folder: FolderRow;
    fileCount: number;
    currentUserId?: string;
    currentUserEmail?: string;
}

export interface FolderTableListProps {
    folders: FolderRow[];
    selectedIds: string[];
    onToggleSelect: (folder: FolderRow) => void;
    currentUserId?: string;
    currentUserEmail?: string;
}

export interface FileCardProps {
    file: FileRow;
    showCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (file: FileRow) => void;
    currentUserId?: string;
    currentUserEmail?: string;
    allFiles?: FileRow[];
}

export interface FileTableListProps {
    files: FileRow[];
    selectedIds: string[];
    onToggleSelect: (file: FileRow) => void;
    currentUserId?: string;
    currentUserEmail?: string;
}