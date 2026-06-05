import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and de-duplicate conflicting Tailwind classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Build a short, human-friendly id label from a UUID (e.g. "a1b2c3d4"). */
export function shortId(id: string | null | undefined, length = 8): string {
  if (!id) return "—";
  return id.replace(/-/g, "").slice(0, length).toUpperCase();
}

/** Initials for an avatar fallback. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

/** Sleep helper for retry/backoff. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
