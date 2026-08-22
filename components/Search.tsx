'use client';

import React, {useEffect, useState} from 'react'
import Image from "next/image";
import {Input} from "@/components/ui/input";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {FileRow} from "@/types/db.types";
import {getFiles} from "@/lib/actions/file.actions";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { useDebounce } from 'use-debounce';

const Search = () => {
    const [query, setQuery] = useState('');
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("query");
    const [results, setResults] = useState<FileRow[]>([]);
    const [open, setOpen] = useState(false);
    const [debouncedQuery] = useDebounce(query, 300);

    const router = useRouter();
    const path = usePathname();

    const clearSearchQuery = () => {
        const params = new URLSearchParams(searchParams.toString());

        params.delete("query");

        const queryString = params.toString();

        router.push(queryString ? `${path}?${queryString}` : path);
    };

    useEffect(() => {
        const fetchFiles = async () => {
            if(debouncedQuery.length === 0){
                setResults([]);
                setOpen(false);
                return clearSearchQuery();
            }
            const files = await getFiles({searchText: debouncedQuery});
            setResults(files.rows);
            setOpen(true);
        }

        fetchFiles();
    }, [debouncedQuery]);

    useEffect(() => {
        if(!searchQuery) {
            setQuery("");
        }
    }, [searchQuery]);

    const handleClickItem = (file: FileRow)=> {
        setOpen(false);
        setResults([]);
        if (file.folderId) {
            router.push(`/folders/${file.folderId}?query=${file.name}`);
        } else if (file.type === "other" || (file.type as string) === "audio") {
            router.push(`/others?query=${file.name}`);
        } else if (file.type === "video") {
            router.push(`/video?query=${file.name}`);
        } else {
            router.push(`/${file.type}s?query=${file.name}`);
        }
    }

    const resetSearch = () => {
        setOpen(false);
    }

    return (
        <div className="search">
            <div
                className="search-input-wrapper"
                tabIndex={-1}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        resetSearch();
                    }
                }}
            >
                <Image
                    src="/assets/icons/search.svg"
                    alt="Search"
                    width={24}
                    height={24}
                />

                <Input
                    value={query}
                    placeholder="Search..."
                    className="search-input"
                    onChange={(e) => setQuery(e.target.value)}
                />

                {open && (
                    <ul className="search-result">
                        {results.length > 0 ? (
                            results.map((file) => (
                                <li
                                    key={file.$id}
                                    tabIndex={0}
                                    onClick={() => handleClickItem(file)}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <div className="flex cursor-pointer items-center gap-4 min-w-0 flex-1">
                                        <Thumbnail
                                            type={file.type}
                                            extension={file.extension ?? ""}
                                            url={file.url}
                                            className="size-9 min-w-9 shrink-0"
                                        />

                                        <p className="subtitle-2 line-clamp-1 text-light-100">
                                            {file.name}
                                        </p>
                                    </div>

                                    <FormattedDateTime
                                        date={file.$createdAt}
                                        className="caption line-clamp-1 text-light-200 shrink-0"
                                    />
                                </li>
                            ))
                        ) : (
                            <li className="empty-result">
                                No files found
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    )
}
export default Search
