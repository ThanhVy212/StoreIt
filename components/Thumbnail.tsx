import React from 'react'
import {cn, getFileIcon} from "@/lib/utils";
import Image from "next/image";

const Thumbnail = ({type, extension, url = '', imageClassName, className}: ThumbnailProps) => {
    const isImage = type === 'image' && extension !== "svg";

    // Fallback: Nếu url cũ trong database bị dính project=undefined thì tự động thay thế bằng project ID chuẩn
    const sanitizedUrl = url.includes("project=undefined")
        ? url.replace("project=undefined", `project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`)
        : url;

    return (
        <figure className={cn("thumbnail", className)}>
            <Image
                src={isImage ? sanitizedUrl : getFileIcon(extension, type)}
                alt="thumbnail"
                width={100}
                height={100}
                className={cn(
                    "size-8 object-contain",
                    imageClassName,
                    isImage && "thumbnail-image",
                )}
            />
        </figure>
    )
}
export default Thumbnail
