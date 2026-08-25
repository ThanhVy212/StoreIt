'use client';

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {usePathname, useRouter} from "next/navigation";
import {sortTypes} from "@/constants";
import {useLocale} from "@/lib/locale-context";


const Sort = () => {
    const router = useRouter();
    const path = usePathname();
    const { dictionary: t } = useLocale();

    const handleSort = (value: string | null) => {
        router.push(`${path}?sort=${value}`);
    }

    return (
        <Select items={sortTypes} onValueChange={handleSort} defaultValue={sortTypes[0].value}>
            <SelectTrigger className="sort-select">
                <SelectValue placeholder={sortTypes[0].label} />
            </SelectTrigger>
            <SelectContent className="sort-select-content">
                <SelectGroup>
                    {sortTypes.map((item) => (
                        <SelectItem
                            key={item.label}
                            className="shad-select-item"
                            value={item.value}
                        >
                            {t.sort[item.key as keyof typeof t.sort]}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
    </Select>
    )
}
export default Sort
