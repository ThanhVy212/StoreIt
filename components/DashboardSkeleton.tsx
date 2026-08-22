import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SummaryCardSkeleton = () => {
    return (
        <div className="dashboard-summary-card relative overflow-hidden">
            <div className="space-y-4">
                <div className="flex justify-between gap-3">
                    <Skeleton className="size-14 rounded-full" />
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
                <Skeleton className="h-[300px] w-full rounded-lg mb-4" />

                <ul className="dashboard-summary-list">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <li key={idx}>
                            <SummaryCardSkeleton />
                        </li>
                    ))}
                </ul>
            </section>

            <section className="dashboard-recent-files">
                <Skeleton className="h-8 w-48 mb-5" />
                <ul className="flex flex-col gap-5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <li
                            key={idx}
                            className="flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Skeleton className="size-12 rounded-md flex-shrink-0" />
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                            <Skeleton className="size-6 rounded-full flex-shrink-0" />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default DashboardSkeleton;
