'use client';

import React from 'react'
import {cn, formatDateTime} from "@/lib/utils";
import {useLocale} from "@/lib/locale-context";

const FormattedDateTime = ({date, className}: {date: string, className?: string}) => {
    const { lang } = useLocale();
    return (
        <p className={cn("body-1 text-light-200", className)}>
            {formatDateTime(date, lang)}
        </p>
    )
}
export default FormattedDateTime
