"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** App-level error boundary that catches render-time exceptions in widgets. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  reset = (): void => this.setState({ hasError: false, error: undefined });

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-error">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-headline-md text-on-surface">Something went wrong</h2>
          <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
            An unexpected error occurred while rendering this view. You can try again.
          </p>
        </div>
        <Button variant="secondary" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}
