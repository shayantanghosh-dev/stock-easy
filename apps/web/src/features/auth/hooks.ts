"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { roleHome, safeNext } from "@/lib/navigation";
import type { LoginFormValues, RegisterFormValues } from "./validators";

/** Login submit handler with redirect + toast + typed error surfacing. */
export function useLoginSubmit() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const profile = await login(values);
      toast.success(`Welcome back, ${profile.fullName.split(" ")[0]}`);
      router.replace(safeNext(params.get("next"), roleHome(profile.role)));
    } catch (error) {
      toast.error(errorMessage(error, "Unable to sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return { onSubmit, submitting };
}

/** Registration submit handler — maps the flat form into the API's nested shape. */
export function useRegisterSubmit() {
  const { register } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      const profile = await register({
        owner: {
          fullName: values.fullName,
          email: values.email,
          password: values.password,
        },
        shop: {
          name: values.shopName,
          licenseNumber: values.licenseNumber,
          address: values.address || undefined,
          phone: values.phone || undefined,
        },
      });
      toast.success("Pharmacy account created — welcome to Stock Easy!");
      router.replace(roleHome(profile.role));
    } catch (error) {
      toast.error(errorMessage(error, "Unable to create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  return { onSubmit, submitting };
}
