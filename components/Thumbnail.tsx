'use client';

import React, { useState } from 'react';
import { cn, getFileIcon } from "@/lib/utils";
import Image from "next/image";

const Thumbnail = ({ type, extension, url = '', imageClassName, className }: ThumbnailProps) => {
    const [hasError, setHasError] = useState(false);
    const isImage = type === 'image' && extension !== "svg";
    const isVideo = type === 'video';

    // Fallback: Nếu url cũ trong database bị dính project=undefined thì tự động thay thế bằng project ID chuẩn
    const sanitizedUrl = url.includes("project=undefined")
        ? url.replace("project=undefined", `project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`)
        : url;

    return (
        <figure className={cn("thumbnail", className)}>
            {isImage && sanitizedUrl && !hasError ? (
                <Image
                    src={sanitizedUrl}
                    alt="thumbnail"
                    width={100}
                    height={100}
                    onError={() => setHasError(true)}
                    className={cn(
                        "size-8 object-contain",
                        imageClassName,
                        "thumbnail-image",
                    )}
                />
            ) : isVideo && sanitizedUrl && !hasError ? (
                <div className="relative size-full flex items-center justify-center">
                    <video
                        src={`${sanitizedUrl}#t=0.001`}
                        preload="metadata"
                        muted
                        playsInline
                        onError={() => setHasError(true)}
                        className={cn(
                            "size-full object-cover pointer-events-none",
                            imageClassName
                        )}
                    />
                    <Image
                        src="/assets/icons/play-video.svg"
                        alt="play"
                        width={24}
                        height={24}
                        className="absolute pointer-events-none size-5 md:size-6"
                    />
                </div>
            ) : (
                <Image
                    src={getFileIcon(extension, type)}
                    alt="thumbnail"
                    width={100}
                    height={100}
                    className={cn(
                        "size-8 object-contain",
                        imageClassName,
                    )}
                />
            )}
        </figure>
    );
};

export default Thumbnail;
