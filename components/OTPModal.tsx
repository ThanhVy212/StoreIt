"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { REGEXP_ONLY_DIGITS } from "input-otp"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import {Button} from "@/components/ui/button";
import React, {useState, useEffect} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {verifySecret, sendEmailOTP} from "@/lib/actions/user.actions";
import {toast} from "@/components/ui/toast";
import {useLocale} from "@/lib/locale-context";


const OtpModal = ({accountId, email} : {accountId: string, email: string}) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(30);
    const [currentAccountId, setCurrentAccountId] = useState(accountId);
    const { lang, dictionary: t } = useLocale();

    useEffect(() => {
        if (cooldown <= 0) return;
        const interval = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!password || password.length < 6) {
            toast.add({
                type: "warning",
                description: t.otp.completeCode,
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await verifySecret({ accountId: currentAccountId, password });

            if (result?.sessionId) {
                toast.add({
                    type: "success",
                    description: t.toast.signedIn,
                });
                setIsOpen(false);
                router.push(`/${lang}`);
            } else {
                const errStr = (result?.error || "").toLowerCase();
                const isExpired = errStr.includes("expire") || errStr.includes("token");

                if (isExpired) {
                    toast.add({
                        type: "error",
                        description: t.otp.expired,
                    });
                } else {
                    toast.add({
                        type: "error",
                        description: t.otp.invalid,
                    });
                }
            }
        } catch (err: unknown) {
            console.log("Failed to verify OTP", err);
            const errStr = (err instanceof Error ? err.message : "").toLowerCase();
            const isExpired = errStr.includes("expire") || errStr.includes("token");

            if (isExpired) {
                toast.add({
                    type: "error",
                    description: t.otp.expired,
                });
            } else {
                toast.add({
                    type: "error",
                    description: t.otp.verifyFailed,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        try {
            const newAccountId = await sendEmailOTP({ email });
            if (newAccountId) {
                setCurrentAccountId(newAccountId);
                setPassword('');
                setCooldown(30);
                toast.add({
                    type: "success",
                    description: t.otp.resentSuccess,
                });
            } else {
                toast.add({
                    type: "error",
                    description: t.otp.resentFailed,
                });
            }
        } catch (err) {
            console.log("Failed to resend OTP", err);
            toast.add({
                type: "error",
                description: t.otp.resentFailed,
            });
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className="shad-alert-dialog">
                <AlertDialogHeader className="relative justify-center">
                    <AlertDialogTitle className="h2 text-center">{t.otp.enterOtp}</AlertDialogTitle>
                    <Image
                        src="/assets/icons/close-dark.svg"
                        alt="close"
                        width={20}
                        height={20}
                        onClick={() => setIsOpen(false)}
                        className="otp-close-button"
                    />
                    <AlertDialogDescription className="subtitle-2 text-center text-light-100">
                        {t.otp.sentCode} <span className="pl-1 text-brand">{email}</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <InputOTP id="digits-only" maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={password} onChange={setPassword} >
                    <InputOTPGroup className="shad-otp">
                        <InputOTPSlot index={0} className="shad-otp-slot" />
                        <InputOTPSlot index={1} className="shad-otp-slot" />
                        <InputOTPSlot index={2} className="shad-otp-slot" />
                        <InputOTPSlot index={3} className="shad-otp-slot" />
                        <InputOTPSlot index={4} className="shad-otp-slot" />
                        <InputOTPSlot index={5} className="shad-otp-slot" />
                    </InputOTPGroup>
                </InputOTP>

                <AlertDialogFooter>
                    <div className="flex w-full flex-col gap-4">
                        <AlertDialogAction
                            onClick={handleSubmit}
                            className="shad-submit-btn h-12"
                            type="button"
                        >
                            {t.otp.submit}

                            {isLoading && (
                                <Image src="/assets/icons/loader.svg"
                                       alt="loader"
                                       width={24}
                                       height={24}
                                       className="ml-2 animate-spin"

                                />
                            )}
                        </AlertDialogAction>

                        <div className="subtitle-2 mt-2 text-center text-light-100">
                            {t.otp.noCode}
                            <Button
                                type="button"
                                variant="link"
                                className="pl-1 text-brand cursor-pointer disabled:text-light-200 disabled:no-underline"
                                onClick={handleResendOtp}
                                disabled={cooldown > 0}
                            >
                                {cooldown > 0 ? t.otp.resendIn.replace("{seconds}", String(cooldown)) : t.otp.resend}
                            </Button>
                        </div>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
export default OtpModal
