"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import {createAccount, signInUser} from "@/lib/actions/user.actions";
import OTPModal from "@/components/OTPModal";
import { toast } from "@/components/ui/toast";
import { useLocale } from "@/lib/locale-context";

type FormType = "sign-in" | "sign-up";

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountId, setAccountId] = useState(null)
  const { lang, dictionary: t } = useLocale();

  const authFormSchema = (formType: FormType) =>
    z.object({
      email: z.email(t.validation.validEmail),
      fullName:
        formType === "sign-up"
          ? z
              .string()
              .min(2, t.validation.fullNameMin)
              .max(50, t.validation.fullNameMax)
          : z.string().optional(),
    });

  const formSchema = authFormSchema(type);

  type AuthFormValues = z.infer<typeof formSchema>;

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
        const user =
            type === 'sign-up' ? await createAccount({
          fullName: values.fullName!,
          email: values.email,
        }) : await signInUser({email: values.email});

        if (user?.error) {
          setErrorMessage(user.error);
          return;
        }

        if (user?.accountId) {
          setAccountId(user.accountId);
          toast.add({
            type: "success",
            description: type === "sign-up"
              ? t.toast.accountCreated
              : t.toast.otpSent,
          });
        } else {
          const fallbackError = type === "sign-up" ? t.toast.failedCreateAccount : t.toast.somethingWrong;
          setErrorMessage(fallbackError);
        }

    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      if (msg.includes("otp")) {
        setErrorMessage(t.toast.otpVerifyFailed);
      } else if (msg.includes("email") && msg.includes("exist")) {
        setErrorMessage(t.toast.failedCreateAccount);
      } else if (msg.includes("network") || msg.includes("fetch")) {
        setErrorMessage(t.toast.somethingWrong);
      } else {
        setErrorMessage(error instanceof Error && error.message ? error.message : t.toast.somethingWrong);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full sm:max-w-md">
        <CardHeader>
          <CardTitle className="form-title">
            {type === "sign-in" ? t.auth.signIn : t.auth.signUp}
          </CardTitle>

          <CardDescription>
            {type === "sign-in"
              ? t.auth.signInDescription
              : t.auth.signUpDescription}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="auth-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="auth-form"
          >
            <FieldGroup className="mb-3">
              {type === "sign-up" && (
                <Controller
                  name="fullName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1 w-full">
                      <Field
                          className="shad-form-item"
                          data-invalid={fieldState.invalid}
                      >
                        <FieldLabel
                            className="shad-form-label"
                            htmlFor={field.name}
                        >
                          {t.auth.fullName}
                        </FieldLabel>

                        <Input
                          {...field}
                          id={field.name}
                          placeholder={t.auth.enterFullName}
                          autoComplete="name"
                          className="shad-input"
                          aria-invalid={fieldState.invalid}
                        />
                      </Field>

                      {fieldState.invalid && (
                        <FieldError
                            className="shad-form-message pl-1"
                            errors={[fieldState.error]}
                        />
                      )}
                    </div>
                  )}
                />
              )}

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1 w-full">
                    <Field
                        className="shad-form-item"
                        data-invalid={fieldState.invalid}
                    >
                      <FieldLabel
                          className="shad-form-label"
                          htmlFor={field.name}
                      >
                        {t.auth.email}
                      </FieldLabel>

                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder={t.auth.enterEmail}
                        className="shad-input"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>

                    {fieldState.invalid && (
                      <FieldError
                          className="shad-form-message pl-1"
                          errors={[fieldState.error]}
                      />
                    )}
                  </div>
                )}
              />

              <Button
                type="submit"
                form="auth-form"
                className="w-full form-submit-button"
                disabled={isLoading}
              >
                {type === "sign-in" ? t.auth.signIn : t.auth.signUp}

                {isLoading && (
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="Loading"
                    width={20}
                    height={20}
                    className="ml-2 animate-spin"
                  />
                )}
              </Button>

              {errorMessage && (
                <p className="error-message">
                  *{errorMessage}
                </p>
              )}

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {type === "sign-in"
                    ? t.auth.noAccount
                    : t.auth.hasAccount}
                </span>

                <Link
                  href={
                    type === "sign-in"
                      ? `/${lang}/sign-up`
                      : `/${lang}/sign-in`
                  }
                  className="ml-1 font-bold text-brand hover:underline"
                >
                  {type === "sign-in"
                    ? t.auth.signUp
                    : t.auth.signIn}
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {accountId && <OTPModal key={accountId} email={form.getValues("email")} accountId={accountId} />}
    </>
  );
};

export default AuthForm;
