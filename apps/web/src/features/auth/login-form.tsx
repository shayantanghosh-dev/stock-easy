"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { loginSchema, type LoginFormValues } from "./validators";
import { useLoginSubmit } from "./hooks";

export function LoginForm() {
  const { onSubmit, submitting } = useLoginSubmit();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@pharmacy.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FormField>

      <Button type="submit" className="w-full" loading={submitting}>
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>

      <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
        New to Stock Easy?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Register your pharmacy
        </Link>
      </p>
    </form>
  );
}
