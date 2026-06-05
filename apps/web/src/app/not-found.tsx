import Link from "next/link";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary">
        <Pill className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <p className="font-data-mono text-display-lg leading-none text-primary">404</p>
        <h1 className="font-display text-headline-md text-on-surface">Page not found</h1>
        <p className="max-w-sm font-body-md text-on-surface-variant">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to Stock Easy</Link>
      </Button>
    </div>
  );
}
