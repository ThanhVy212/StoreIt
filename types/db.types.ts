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
};

export interface ShareInputProps {
    file: FileRow;
    onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
    onRemove: (email: string) => void;
}

export type FileViewMode = 'grid' | 'list';

export interface TypeFileListProps {
    files: FileRow[];
    isTrash?: boolean;
}

export interface FileCardProps {
    file: FileRow;
    showCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (file: FileRow) => void;
}

export interface FileTableListProps {
    files: FileRow[];
    selectedIds: string[];
    onToggleSelect: (file: FileRow) => void;
}