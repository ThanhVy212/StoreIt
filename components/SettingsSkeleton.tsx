import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const SettingsSkeleton = () => {
    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <Card className="p-6">
                <Skeleton className="h-7 w-48 mb-6" />
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="profile-user-avatar" />
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-32 rounded-full" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-[52px] w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-14" />
                            <Skeleton className="h-[52px] w-full rounded-xl" />
                        </div>
                    </div>

                    <Skeleton className="h-9 w-32 rounded-full" />
                </div>
            </Card>
        </div>
    );
};

export default SettingsSkeleton;
