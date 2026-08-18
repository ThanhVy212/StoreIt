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
};

export interface ShareInputProps {
    file: FileRow;
    onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
    onRemove: (email: string) => void;
}
