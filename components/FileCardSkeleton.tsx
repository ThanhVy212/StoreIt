import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const FileCardSkeleton = () => {
    return (
        <div className="file-card">
            <div className="flex justify-between">
                <Skeleton className="size-20 rounded-full" />
                <div className="flex flex-col items-end justify-between">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </div>

            <div className="file-card-details space-y-2 mt-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    );
};

export const FileListSkeleton = () => {
    return (
        <div className="page-container">
            <section className="w-full">
                <Skeleton className="h-10 w-48 mb-4" />
                <div className="total-size-section">
                    <Skeleton className="h-6 w-32" />
                    <div className="sort-container">
                        <Skeleton className="h-10 w-44 rounded-full" />
                    </div>
                </div>
            </section>

            <section className="file-list">
                {Array.from({ length: 8 }).map((_, idx) => (
                    <FileCardSkeleton key={idx} />
                ))}
            </section>
        </div>
    );
};

export default FileCardSkeleton;
