'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRef, useState } from "react";
import { updateUser, uploadAvatar } from "@/lib/actions/user.actions";
import { toast } from "@/components/ui/toast";

const SettingsContent = ({ avatar, fullName, email }: SidebarProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(fullName);
    const [avatarUrl, setAvatarUrl] = useState(avatar);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.add({
                type: "error",
                description: "File is too large. Max size is 2MB.",
            });
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.add({
                type: "error",
                description: "Only JPG, PNG or GIF files are allowed.",
            });
            return;
        }

        try {
            setIsLoading(true);
            const result = await uploadAvatar({ file });
            if (!result.url) {
                toast.add({
                    type: "error",
                    description: result.error || "Failed to upload avatar.",
                });
                return;
            }
            setAvatarUrl(result.url);
            toast.add({
                type: "success",
                description: "Avatar updated successfully.",
            });
        } catch {
            toast.add({
                type: "error",
                description: "Failed to upload avatar. Please try again.",
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
                description: "Full name cannot be empty.",
            });
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateUser({ fullName: name.trim(), avatar: avatarUrl });
            if (!result.success) {
                toast.add({
                    type: "error",
                    description: result.error || "Failed to update profile.",
                });
                return;
            }
            toast.add({
                type: "success",
                description: "Profile updated successfully.",
            });
        } catch {
            toast.add({
                type: "error",
                description: "Failed to update profile. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <Card className="p-6 profile-card">
                <h3 className="h3 capitalize">Profile Information</h3>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Image
                            src={avatarUrl}
                            alt="Avatar"
                            width={192}
                            height={192}
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
                                {isLoading ? "Uploading..." : "Change Photo"}
                            </Button>

                            <p className="caption mt-2 text-light-200">JPG, PNG or GIF. Max size 2MB</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="subtitle-2 text-light-100">Full Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="body-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="subtitle-2 text-light-100">Email</Label>
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
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default SettingsContent;
