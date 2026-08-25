'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
    id: string;
    name: string;
}

const FolderBreadcrumb = ({ ancestors }: { ancestors: BreadcrumbItem[] }) => {
    const { lang, dictionary: t } = useLocale();

    return (
        <Breadcrumb className="mb-2">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={`/${lang}/folders`} />}>
                        {t.folders.breadcrumbFolders}
                    </BreadcrumbLink>
                </BreadcrumbItem>

                {ancestors.map((ancestor, index) => (
                    <React.Fragment key={ancestor.id}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            {index === ancestors.length - 1 ? (
                                <BreadcrumbPage>{ancestor.name}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink render={<Link href={`/${lang}/folders/${ancestor.id}`} />}>
                                    {ancestor.name}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default FolderBreadcrumb;
