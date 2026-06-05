import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Stock Easy design system — "Slate Pro".
 *
 * A premium, enterprise SaaS palette (slate neutrals + deep navy brand +
 * refined blue accent + professional emerald/amber/red states), in the spirit
 * of Stripe / Linear / Mercury. Token NAMES are stable across the app, so
 * re-skinning happens here without touching component markup.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        // --- neutral surfaces (slate) ---
        background: "#f8fafc",
        surface: "#f8fafc",
        "surface-bright": "#ffffff",
        "surface-dim": "#eef2f6",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5f9",
        "surface-container": "#f1f5f9",
        "surface-container-high": "#e7ecf2",
        "surface-container-highest": "#dbe2ea",
        "surface-variant": "#e2e8f0",
        // --- text / ink ---
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        "on-background": "#0f172a",
        // --- outline / borders ---
        outline: "#94a3b8",
        "outline-variant": "#e2e8f0",
        // --- primary (refined blue) ---
        primary: "#1d4ed8",
        "on-primary": "#ffffff",
        "primary-container": "#1e3a8a",
        "on-primary-container": "#dbeafe",
        "primary-fixed": "#dbeafe",
        "primary-fixed-dim": "#bfdbfe",
        "on-primary-fixed": "#172554",
        "on-primary-fixed-variant": "#1e40af",
        "surface-tint": "#1d4ed8",
        "inverse-primary": "#93c5fd",
        // --- secondary (emerald — success / positive) ---
        secondary: "#059669",
        "on-secondary": "#ffffff",
        "secondary-container": "#d1fae5",
        "on-secondary-container": "#065f46",
        "secondary-fixed": "#a7f3d0",
        "secondary-fixed-dim": "#6ee7b7",
        "on-secondary-fixed": "#022c22",
        "on-secondary-fixed-variant": "#047857",
        // --- tertiary (neutral slate — review / muted) ---
        tertiary: "#475569",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#64748b",
        "on-tertiary-container": "#f1f5f9",
        "tertiary-fixed": "#e2e8f0",
        "tertiary-fixed-dim": "#cbd5e1",
        "on-tertiary-fixed": "#0f172a",
        "on-tertiary-fixed-variant": "#334155",
        // --- error (red — danger) ---
        error: "#dc2626",
        "on-error": "#ffffff",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",
        // --- warning (amber) ---
        warning: "#d97706",
        "warning-container": "#fef3c7",
        "on-warning-container": "#92400e",
        // --- inverse (dark surfaces — tooltips, overlays) ---
        "inverse-surface": "#0f172a",
        "inverse-on-surface": "#f1f5f9",
        // --- brand (deep-navy sidebar / marketing) ---
        brand: "#0b1220",
        "brand-elevated": "#0f1830",
        "brand-foreground": "#e2e8f0",
        "brand-muted": "#94a3b8",
        "brand-border": "#1e293b",
        "brand-accent": "#3b82f6",
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        base: "4px",
        gutter: "24px",
        md: "16px",
        xl: "40px",
        "container-max": "1440px",
        sm: "8px",
        lg: "24px",
        margin: "32px",
        xs: "4px",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      maxWidth: {
        "container-max": "1440px",
        content: "1280px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        "data-mono": ["var(--font-mono)", "ui-monospace", "monospace"],
        "headline-md": ["var(--font-geist)"],
        "headline-lg": ["var(--font-geist)"],
        "headline-lg-mobile": ["var(--font-geist)"],
        "display-lg": ["var(--font-geist)"],
        "label-md": ["var(--font-inter)"],
        "label-sm": ["var(--font-inter)"],
        "body-md": ["var(--font-inter)"],
        "body-sm": ["var(--font-inter)"],
        "body-lg": ["var(--font-inter)"],
      },
      fontSize: {
        "data-mono": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "600" }],
        "body-md": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "display-lg": ["40px", { lineHeight: "46px", letterSpacing: "-0.025em", fontWeight: "600" }],
        "body-sm": ["13.5px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["17px", { lineHeight: "26px", fontWeight: "400" }],
        "headline-lg-mobile": ["22px", { lineHeight: "28px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15,23,42,0.04)",
        sm: "0 1px 2px 0 rgba(15,23,42,0.06)",
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05)",
        "card-hover": "0 8px 24px -8px rgba(15,23,42,0.16), 0 2px 6px -2px rgba(15,23,42,0.06)",
        "card-error": "0 1px 3px rgba(220,38,38,0.08)",
        elevated: "0 12px 32px -12px rgba(15,23,42,0.22), 0 4px 8px -4px rgba(15,23,42,0.08)",
        "brand-glow": "0 8px 30px -12px rgba(29,78,216,0.35)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.35s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
