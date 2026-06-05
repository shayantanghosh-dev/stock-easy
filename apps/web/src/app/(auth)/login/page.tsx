import type { Metadata } from "next";
import { Pill } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Pill className="h-5 w-5" />
        </div>
        <p className="font-display text-headline-md font-bold text-primary">Stock Easy</p>
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-headline-lg text-on-surface">Welcome back</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sign in to manage your pharmacy inventory and sales.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
