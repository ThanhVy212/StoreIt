/* eslint-disable no-unused-vars */

declare type FileType = 'document' | 'image' | 'video' | 'other';

declare type AuthFormType = 'sign-in' | 'sign-up';

declare interface ActionType {
    label: string;
    icon: string;
    value: string;
}

declare interface SearchParamProps {
    params?: Promise<SegmentParams>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

declare interface UploadFileProps {
    file: File;
    ownerId: string;
    accountId: string;
    path: string;
    folderId?: string | null;
}
declare interface SaveFileRecordProps {
    bucketFileId: string;
    name: string;
    size: number;
    ownerId: string;
    accountId: string;
    path: string;
    folderId?: string | null;
}
declare interface GetFilesProps {
    types?: FileType[];
    searchText?: string;
    sort?: string;
    limit?: number;
    page?: number;
    fetchAll?: boolean;
    onlyOwner?: boolean;
    trashed?: boolean;
    folderId?: string | null;
}

declare interface TrashFileProps {
    fileId: string;
    path: string;
}

declare interface TrashFilesProps {
    fileIds: string[];
    path: string;
}
declare interface RenameFileProps {
    fileId: string;
    name: string;
    extension: string;
    path: string;
}
declare interface UpdateFileUsersProps {
    fileId: string;
    emails: string[];
    path: string;
}
declare interface DeleteFileProps {
    fileId: string;
    bucketFileId: string;
    path: string;
}

declare interface DeleteFilesProps {
    files: {
        fileId: string;
        bucketFileId: string
    }[];
    path: string;
}

declare interface FileUploaderProps {
    ownerId: string;
    accountId: string;
    className?: string;
    folderId?: string | null;
}

declare interface MobileNavigationProps {
    $id: string;
    accountId: string;
    fullName: string;
    avatar: string;
    email: string;
}
declare interface SidebarProps {
    fullName: string;
    avatar: string;
    email: string;
}

declare interface ThumbnailProps {
    type: string;
    extension: string;
    url: string;
    className?: string;
    imageClassName?: string;
}

declare interface CreatePublicLinkProps {
    fileId: string;
    expiresIn: number;
    path: string;
}

declare interface RevokePublicLinkProps {
    fileId: string;
    tokenId: string;
    path: string;
}
