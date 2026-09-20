import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorPanelProps {
  title: string;
  /** What happened, in the user's terms. Not the exception message. */
  message: string;
  /** Retry, go home, whatever the boundary can offer. */
  children?: ReactNode;
}

/**
 * The shell every error boundary renders into, so a failed dashboard and a
 * failed settings page don't look like two different bugs.
 *
 * Deliberately never shows `error.message`. A Postgres or fetch error says
 * nothing useful to the person reading it and quite a lot to anyone else.
 */
export function ErrorPanel({ title, message, children }: ErrorPanelProps) {
  return (
    <div className="mx-auto max-w-sm space-y-4 rounded border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-8 text-center">
      <AlertTriangle
        size={32}
        className="mx-auto text-[var(--color-status-red)]"
        aria-hidden
      />
      <h1 className="text-lg font-medium text-[var(--color-foreground)]">
        {title}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)]">{message}</p>
      {children && (
        <div className="flex flex-col items-center gap-2 pt-1">{children}</div>
      )}
    </div>
  );
}
