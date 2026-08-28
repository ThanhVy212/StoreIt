'use client';

import React from 'react';
import Image from 'next/image';
import type { Dictionary } from '@/lib/get-dictionary';

interface TrashBannerProps {
    dictionary: Dictionary;
}

const TrashBanner = ({ dictionary }: TrashBannerProps) => {
    return (
        <div className="trash-banner">
            <Image
                src="/assets/icons/info.svg"
                alt="info"
                width={20}
                height={20}
                className="trash-banner-icon"
            />
            <p className="body-2">{dictionary.trash.autoDeleteNotice}</p>
        </div>
    );
};

export default TrashBanner;
