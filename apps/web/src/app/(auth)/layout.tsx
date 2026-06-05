import { Suspense, type ReactNode } from "react";
import { Pill, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { GuestGuard } from "@/components/guards/guest-guard";
import { PageLoader } from "@/components/shared/page-loader";

const highlights = [
  { icon: ShieldCheck, label: "FEFO-enforced selling", desc: "Expiry-first allocation on every sale." },
  { icon: TrendingUp, label: "Live inventory health", desc: "Dead stock, reorder and expiry alerts." },
  { icon: Sparkles, label: "AI pharmacy copilot", desc: "Ask questions about your data in plain English." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <GuestGuard>
        <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
          {/* Brand / value panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
            {/* decorative glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand-accent/20 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />

            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-primary shadow-brand-glow ring-1 ring-white/10">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-headline-md font-semibold tracking-tight">Stock Easy</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Pharmacy OS</p>
              </div>
            </div>

            <div className="relative space-y-8">
              <h2 className="max-w-md font-display text-display-lg leading-[1.1] tracking-tight">
                Run a tighter, smarter pharmacy.
              </h2>
              <ul className="space-y-5">
                {highlights.map(({ icon: Icon, label, desc }) => (
                  <li key={label} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-label-md text-label-md font-semibold">{label}</p>
                      <p className="font-body-sm text-body-sm text-brand-muted">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative font-label-sm text-label-sm text-brand-muted">
              © {new Date().getFullYear()} Stock Easy. Built for modern pharmacies.
            </p>
          </div>

          {/* Form panel */}
          <div className="flex items-center justify-center bg-surface p-6 sm:p-10">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </GuestGuard>
    </Suspense>
  );
}
