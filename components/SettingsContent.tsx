'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRef, useState } from "react";
import { updateUser, uploadAvatar } from "@/lib/actions/user.actions";
import { getFileProxyUrl } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useLocale } from "@/lib/locale-context";
import { useRouter, usePathname } from "next/navigation";

const SettingsContent = ({ avatar, fullName, email }: SidebarProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(fullName);
    const [avatarUrl, setAvatarUrl] = useState(avatar);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { lang, dictionary: t } = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.add({
                type: "error",
                description: t.toast.fileTooLarge,
            });
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.add({
                type: "error",
                description: t.toast.invalidFileType,
            });
            return;
        }

        try {
            setIsLoading(true);
            const result = await uploadAvatar({ file });
            if (!result.url) {
                toast.add({
                    type: "error",
                    description: result.error || t.toast.failedUploadAvatar,
                });
                return;
            }
            setAvatarUrl(result.url);
            toast.add({
                type: "success",
                description: t.toast.avatarUpdated,
            });
        } catch {
            toast.add({
                type: "error",
                description: t.toast.failedUploadAvatar,
            });
        } finally {
            setIsLoading(false);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSaveChanges = async () => {
        if (!name.trim()) {
            toast.add({
                type: "error",
                description: t.toast.nameEmpty,
            });
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateUser({ fullName: name.trim(), avatar: avatarUrl });
            if (!result.success) {
                toast.add({
                    type: "error",
                    description: result.error || t.toast.failedUpdateProfile,
                });
                return;
            }
            toast.add({
                type: "success",
                description: t.toast.profileUpdated,
            });
        } catch {
            toast.add({
                type: "error",
                description: t.toast.failedUpdateProfile,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLanguageChange = (newLang: string) => {
        const segments = pathname.split("/");
        segments[1] = newLang;
        router.push(segments.join("/"));
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <Card className="p-6 profile-card">
                <h3 className="h3 capitalize">{t.settings.profileInformation}</h3>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Image
                            src={getFileProxyUrl(avatarUrl)}
                            alt="Avatar"
                            width={192}
                            height={192}
                            unoptimized={getFileProxyUrl(avatarUrl).startsWith('/api/files/')}
                            className="profile-user-avatar"
                            priority
                        />
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="btn-change-avatar"
                                onClick={handlePhotoClick}
                                disabled={isLoading}
                            >
                                {isLoading ? t.settings.uploading : t.settings.changePhoto}
                            </Button>

                            <p className="caption mt-2 text-light-200">{t.settings.photoHint}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="subtitle-2 text-light-100">{t.settings.fullName}</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="body-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="subtitle-2 text-light-100">{t.settings.email}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                disabled
                                className="body-2"
                            />
                        </div>
                    </div>

                    <Button
                        className="btn-save-change"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                    >
                        {isSaving ? t.settings.saving : t.settings.saveChanges}
                    </Button>
                </div>
            </Card>

            {/* Language */}
            <Card className="p-6 profile-card">
                <h3 className="h3 capitalize">{t.settings.language}</h3>
                <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                        <Label className="subtitle-2 text-light-100">{t.settings.language}</Label>
                        <div className="flex items-center gap-2 rounded-full border border-light-300 p-1" role="radiogroup" aria-label={t.settings.language}>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={lang === "en"}
                                onClick={() => handleLanguageChange("en")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    lang === "en"
                                        ? "bg-brand text-white shadow-sm"
                                        : "text-light-200 hover:text-light-100"
                                }`}
                            >
                                {t.settings.english}
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={lang === "vi"}
                                onClick={() => handleLanguageChange("vi")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    lang === "vi"
                                        ? "bg-brand text-white shadow-sm"
                                        : "text-light-200 hover:text-light-100"
                                }`}
                            >
                                {t.settings.vietnamese}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SettingsContent;
