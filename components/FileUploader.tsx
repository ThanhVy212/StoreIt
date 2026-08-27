'use client';

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl } from "@/lib/utils";
import Image from "next/image";
import { MAX_FILE_SIZE } from "@/constants";
import { toast } from "@/components/ui/toast";
import { usePathname } from "next/navigation";
import { saveFileRecord } from "@/lib/actions/file.actions";
import { getAppwriteJWT } from "@/lib/actions/user.actions";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import UploadProgressList, { UploadingFile } from "@/components/UploadProgressList";
import { useLocale } from "@/lib/locale-context";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB Appwrite chunk threshold

const FileUploader = ({ ownerId, accountId, className, folderId }: FileUploaderProps) => {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const path = usePathname();
    const { dictionary: t } = useLocale();

    const uploadChunk = (
        url: string,
        projectId: string,
        fileId: string,
        file: File,
        start: number,
        end: number,
        totalSize: number,
        isFirstChunk: boolean,
        jwt: string | null,
        onChunkProgress: (loadedInChunk: number) => void
    ): { promise: Promise<any>; xhr: XMLHttpRequest } => {
        const xhr = new XMLHttpRequest();
        const promise = new Promise<any>((resolve, reject) => {
            const chunk = file.slice(start, end);
            const chunkFile = new File([chunk], file.name, { type: file.type });
            const formData = new FormData();
            formData.append('fileId', fileId);
            formData.append('file', chunkFile);

            xhr.open('POST', url);
            xhr.withCredentials = true;
            xhr.setRequestHeader('X-Appwrite-Project', projectId);
            if (jwt) {
                xhr.setRequestHeader('X-Appwrite-JWT', jwt);
            }
            xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`);
            if (!isFirstChunk) {
                xhr.setRequestHeader('x-appwrite-id', fileId);
            }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onChunkProgress(e.loaded);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.message || `Upload failed with status ${xhr.status}`));
                    } catch {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.onabort = () => reject(new Error('Upload aborted'));
            xhr.send(formData);
        });

        return { promise, xhr };
    };

    const uploadFileWithSmoothProgress = async (
        file: File,
        onProgress: (loaded: number, total: number, percent: number) => void,
        onXhrCreated: (xhr: XMLHttpRequest) => void
    ): Promise<any> => {
        const jwt = await getAppwriteJWT();
        const fileId = ID.unique();
        const totalSize = file.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const uploadUrl = `${appwriteConfig.endpointUrl}/storage/buckets/${appwriteConfig.bucketId}/files`;

        let lastResponse: any = null;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalSize);
            const isFirstChunk = i === 0;

            const { promise, xhr } = uploadChunk(
                uploadUrl,
                appwriteConfig.projectId,
                fileId,
                file,
                start,
                end,
                totalSize,
                isFirstChunk,
                jwt,
                (loadedInChunk) => {
                    const totalLoaded = Math.min(start + loadedInChunk, totalSize);
                    const percent = Math.min(Math.round((totalLoaded / totalSize) * 100), 100);
                    onProgress(totalLoaded, totalSize, percent);
                }
            );

            onXhrCreated(xhr);
            lastResponse = await promise;
            onProgress(end, totalSize, Math.min(Math.round((end / totalSize) * 100), 100));
        }

        return lastResponse;
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const validFiles: UploadingFile[] = [];

        for (const file of acceptedFiles) {
            if (file.size > MAX_FILE_SIZE) {
                toast.add({
                    type: "error",
                    description: (
                        <span className="body-2 text-white">
                            <span className="font-semibold">{file.name}</span> {t.toast.fileTooLargeUpload}
                        </span>
                    ),
                });
                continue;
            }

            validFiles.push({
                file,
                url: convertFileToUrl(file),
                progress: 0,
                loaded: 0,
                total: file.size,
                status: 'uploading',
            });
        }

        if (validFiles.length === 0) return;

        setUploadingFiles((prev) => [...prev, ...validFiles]);

        validFiles.forEach(async (item) => {
            try {
                const bucketFile = await uploadFileWithSmoothProgress(
                    item.file,
                    (loaded, total, percent) => {
                        setUploadingFiles((prev) =>
                            prev.map((f) =>
                                f.file.name === item.file.name
                                    ? { ...f, loaded, total, progress: percent }
                                    : f
                            )
                        );
                    },
                    (xhr) => {
                        setUploadingFiles((prev) =>
                            prev.map((f) => (f.file.name === item.file.name ? { ...f, xhr } : f))
                        );
                    }
                );

                setUploadingFiles((prev) =>
                    prev.map((f) =>
                        f.file.name === item.file.name
                            ? { ...f, status: 'saving', progress: 100, loaded: item.file.size }
                            : f
                    )
                );

                await saveFileRecord({
                    bucketFileId: bucketFile.$id,
                    name: bucketFile.name,
                    size: bucketFile.sizeOriginal,
                    ownerId,
                    accountId,
                    path,
                    folderId,
                });

                URL.revokeObjectURL(item.url);
                setUploadingFiles((prev) => prev.filter((f) => f.file.name !== item.file.name));
            } catch (error: any) {
                if (error.message !== 'Upload aborted') {
                    toast.add({
                        type: "error",
                        description: `${t.toast.uploadFailed} ${item.file.name}: ${error.message || t.toast.unknownError}`,
                    });
                }
                URL.revokeObjectURL(item.url);
                setUploadingFiles((prev) => prev.filter((f) => f.file.name !== item.file.name));
            }
        });
    }, [ownerId, accountId, path, folderId, t]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

    const handleRemoveFile = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation();
        setUploadingFiles((prev) => {
            const target = prev.find((f) => f.file.name === fileName);
            if (target?.xhr) {
                target.xhr.abort();
            }
            if (target?.url) {
                URL.revokeObjectURL(target.url);
            }
            return prev.filter((f) => f.file.name !== fileName);
        });
    };

    return (
        <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <Button
                type="button"
                className={cn('uploader-button group', className)}
            >
                <Image
                    src="/assets/icons/upload.svg"
                    alt="upload"
                    width={24}
                    height={24}
                />{" "}
                <span className="relative inline-flex overflow-hidden text-xs">
                    <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                        {t.common.upload}
                    </div>
                    <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                        {t.common.upload}
                    </div>
                </span>
            </Button>
            <UploadProgressList
                files={uploadingFiles}
                onRemoveFile={handleRemoveFile}
            />
        </div>
    );
};

export default FileUploader;
