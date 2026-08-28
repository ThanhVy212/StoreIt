'use client';

import React from 'react'
import Link from "next/link";
import Image from "next/image";
import {navItems} from "@/constants";
import {usePathname} from "next/navigation";
import {cn, getFileProxyUrl} from "@/lib/utils";
import {useLocale} from "@/lib/locale-context";


const Sidebar = ({fullName, avatar, email}: SidebarProps) => {
    const pathname = usePathname();
    const { lang, dictionary: t } = useLocale();

    const isActive = (url: string, name: string) => {
        if (name === 'Folders') {
            return pathname === `/${lang}/folders` || pathname.startsWith(`/${lang}/folders`);
        }
        if (url === '/') {
            return pathname === `/${lang}` || pathname === `/${lang}/`;
        }
        return pathname === `/${lang}${url}`;
    };

    return (
        <aside className="sidebar remove-scrollbar">
            <Link href={`/${lang}`}>
                <Image
                    src="/assets/icons/logo-full-brand.svg"
                    alt="logo"
                    width={145}
                    height={45}
                    className="hidden h-auto lg:block"
                />

                <Image
                    src="/assets/icons/logo-brand.svg"
                    alt="logo"
                    width={44}
                    height={44}
                    className="lg:hidden"
                />
            </Link>

            <nav className="sidebar-nav">
                <ul className="flex flex-1 flex-col gap-1.5 lg:gap-2">
                    {navItems.map(({url, name, key, icon}) => {
                        const active = isActive(url, name);
                        return (
                            <Link key={name} href={`/${lang}${url}`} className="lg:w-full">
                                <li className={cn("sidebar-nav-item", active && "shad-active")}>
                                    <Image
                                        src={icon}
                                        alt={name}
                                        width={22}
                                        height={22}
                                        className={cn("nav-icon", active && "nav-icon-active")}
                                    />
                                    <p className="hidden lg:block">{t.nav[key as keyof typeof t.nav]}</p>
                                </li>
                            </Link>
                        );
                    })}
                </ul>
            </nav>

            <Image
                src="/assets/images/files-2.png"
                alt="logo"
                width={506}
                height={418}
                className="w-full max-h-[120px] 2xl:max-h-[150px] object-contain my-2"
            />

            <Link href={`/${lang}/settings`} className="sidebar-user-info">
                <Image
                    src={getFileProxyUrl(avatar)}
                    alt="Avatar"
                    width={40}
                    height={40}
                    unoptimized={getFileProxyUrl(avatar).startsWith('/api/files/')}
                    className="sidebar-user-avatar"
                />
                <div className="hidden lg:block">
                    <p className="subtitle-2 capitalize">{fullName}</p>
                    <p className="caption">{email}</p>
                </div>
            </Link>
        </aside>
    )
}
export default Sidebar
