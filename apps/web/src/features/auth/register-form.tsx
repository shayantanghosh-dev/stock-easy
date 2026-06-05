"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { Separator } from "@/components/ui/separator";
import { registerSchema, type RegisterFormValues } from "./validators";
import { useRegisterSubmit } from "./hooks";

export function RegisterForm() {
  const { onSubmit, submitting } = useRegisterSubmit();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      shopName: "",
      licenseNumber: "",
      address: "",
      phone: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1">
        <p className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
          Owner account
        </p>
      </div>
      <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
        <Input id="fullName" autoComplete="name" placeholder="Dr. Sarah Smith" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </FormField>
      <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input id="email" type="email" autoComplete="email" placeholder="you@pharmacy.com" aria-invalid={!!errors.email} {...register("email")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.password} {...register("password")} />
        </FormField>
        <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </FormField>
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
          Pharmacy details
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Your shop starts a 14-day trial and stays in review until verified.
        </p>
      </div>
      <FormField label="Pharmacy name" htmlFor="shopName" error={errors.shopName?.message} required>
        <Input id="shopName" placeholder="MedPlus Central" aria-invalid={!!errors.shopName} {...register("shopName")} />
      </FormField>
      <FormField label="License number" htmlFor="licenseNumber" error={errors.licenseNumber?.message} required>
        <Input id="licenseNumber" placeholder="DL-12345-2026" aria-invalid={!!errors.licenseNumber} {...register("licenseNumber")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
        </FormField>
        <FormField label="Address" htmlFor="address" error={errors.address?.message}>
          <Input id="address" placeholder="12 MG Road, Bengaluru" {...register("address")} />
        </FormField>
      </div>

      <Button type="submit" className="w-full" loading={submitting}>
        <UserPlus className="h-4 w-4" />
        Create pharmacy account
      </Button>

      <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
