import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const cardIcons = [
    "/assets/icons/file-document-light.svg",
    "/assets/icons/file-image-light.svg",
    "/assets/icons/file-video-light.svg",
    "/assets/icons/file-audio-light.svg",
    "/assets/icons/file-other-light.svg",
];

export const SummaryCardSkeleton = ({ icon }: { icon?: string }) => {
    return (
        <div className="dashboard-summary-card relative overflow-hidden">
            <div className="space-y-4">
                <div className="flex justify-between gap-3">
                    {icon ? (
                        <Image
                            src={icon}
                            width={100}
                            height={100}
                            alt="skeleton icon"
                            className="summary-type-icon opacity-80"
                        />
                    ) : (
                        <Skeleton className="size-14 rounded-full" />
                    )}
                    <Skeleton className="h-6 w-16 ml-auto" />
                </div>

                <div className="flex flex-col items-center gap-2 pt-2">
                    <Skeleton className="h-5 w-24" />
                    <div className="w-full border-t border-light-400 my-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
        </div>
    );
};

export const DashboardSkeleton = () => {
    return (
        <div className="dashboard-container">
            <section>
                {/* Storage Chart Skeleton */}
                <div className="chart flex items-center justify-between p-5 rounded-[20px] bg-brand min-h-[170px]">
                    <div className="flex items-center justify-center flex-1">
                        <Skeleton className="size-28 rounded-full bg-white/20" />
                    </div>
                    <div className="chart-details flex-1 flex flex-col gap-2">
                        <Skeleton className="h-6 w-36 bg-white/30" />
                        <Skeleton className="h-4 w-28 bg-white/20" />
                    </div>
                </div>

                {/* Summary Cards Skeleton */}
                <div className="dashboard-summary-list">
                    {cardIcons.map((icon, idx) => (
                        <SummaryCardSkeleton key={idx} icon={icon} />
                    ))}
                </div>
            </section>

            {/* Recent Files Skeleton */}
            <section className="dashboard-recent-files">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="flex flex-col gap-5">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                                <Skeleton className="size-11 rounded-full shrink-0" />
                                <div className="flex flex-col gap-2 flex-1">
                                    <Skeleton className="h-4 w-3/4 max-w-[200px]" />
                                    <Skeleton className="h-3 w-1/3 max-w-[100px]" />
                                </div>
                            </div>
                            <Skeleton className="size-6 rounded-full" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DashboardSkeleton;
