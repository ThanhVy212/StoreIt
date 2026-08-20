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

type FormType = "sign-in" | "sign-up";

const authFormSchema = (type: FormType) =>
  z.object({
    email: z.email("Please enter a valid email address."),

    fullName:
      type === "sign-up"
        ? z
            .string()
            .min(2, "Full name must be at least 2 characters.")
            .max(50, "Full name must be at most 50 characters.")
        : z.string().optional(),
  });

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountId, setAccountId] = useState(null)

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
              ? "Account created! An OTP has been sent to your email."
              : "OTP sent successfully! Please check your email.",
          });
        } else {
          const fallbackError = type === "sign-up" ? "Failed to create account." : "Failed to sign in.";
          setErrorMessage(fallbackError);
        }

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full sm:max-w-md">
        <CardHeader>
          <CardTitle className="form-title">
            {type === "sign-in" ? "Sign In" : "Sign Up"}
          </CardTitle>

          <CardDescription>
            {type === "sign-in"
              ? "Sign in to access your account."
              : "Create your account to get started."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="auth-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="auth-form"
          >
            <FieldGroup className="mb-3">
              {/* Full Name */}
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
                          Full Name
                        </FieldLabel>

                        <Input
                          {...field}
                          id={field.name}
                          placeholder="Enter your full name"
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

              {/* Email */}
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
                        Email
                      </FieldLabel>

                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="Enter your email"
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

              {/* Submit */}
              <Button
                type="submit"
                form="auth-form"
                className="w-full form-submit-button"
                disabled={isLoading}
              >
                {type === "sign-in" ? "Sign In" : "Sign Up"}

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

              {/* Server Error */}
              {errorMessage && (
                <p className="error-message">
                  *{errorMessage}
                </p>
              )}

              {/* Switch Auth */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {type === "sign-in"
                    ? "Don't have an account?"
                    : "Already have an account?"}
                </span>

                <Link
                  href={
                    type === "sign-in"
                      ? "/sign-up"
                      : "/sign-in"
                  }
                  className="ml-1 font-bold text-brand hover:underline"
                >
                  {type === "sign-in"
                    ? "Sign Up"
                    : "Sign In"}
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
