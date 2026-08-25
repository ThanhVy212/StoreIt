"use client";

import React from "react";
import { calculatePercentage, convertFileSize } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/locale-context";

export const Chart = ({ used = 0 }: { used: number }) => {
    const { dictionary: t } = useLocale();
    const percentage = calculatePercentage(used);
    const radius = 64;
    const strokeWidth = 14;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <Card className="chart">
            <CardContent className="flex flex-1 items-center justify-center p-0">
                <div className="chart-container relative flex items-center justify-center">
                    <svg
                        height={radius * 2 + strokeWidth}
                        width={radius * 2 + strokeWidth}
                        className="-rotate-90"
                    >
                        <circle
                            stroke="rgba(255, 255, 255, 0.2)"
                            fill="transparent"
                            strokeWidth={strokeWidth}
                            r={normalizedRadius}
                            cx={radius + strokeWidth / 2}
                            cy={radius + strokeWidth / 2}
                        />
                        <circle
                            stroke="white"
                            fill="transparent"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${circumference} ${circumference}`}
                            style={{ strokeDashoffset }}
                            strokeLinecap="round"
                            r={normalizedRadius}
                            cx={radius + strokeWidth / 2}
                            cy={radius + strokeWidth / 2}
                            className="transition-all duration-700 ease-in-out"
                        />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="chart-total-percentage">{percentage}%</span>
                        <span className="text-xs font-normal text-white/70">{t.dashboard.spaceUsed}</span>
                    </div>
                </div>
            </CardContent>

            <CardHeader className="chart-details">
                <CardTitle className="chart-title">{t.dashboard.availableStorage}</CardTitle>
                <CardDescription className="chart-description">
                    {used ? convertFileSize(used) : "0 GB"} / 2 GB
                </CardDescription>
            </CardHeader>
        </Card>
    );
};

export default Chart;
