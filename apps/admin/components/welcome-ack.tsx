"use client";

import { useEffect } from "react";

/**
 * Marks the welcome page as seen the moment it mounts. We'd rather a
 * single visit "spend" the welcome — if the user closes the tab, they
 * shouldn't get a redirect-loop next time.
 */
export function WelcomeAck() {
  useEffect(() => {
    fetch("/api/welcome/seen", { method: "POST" }).catch(() => {});
  }, []);
  return (
    <span className="text-xs text-[var(--color-fg-faint)]">
      You can revisit the docs at <code className="font-mono">README.md</code>.
    </span>
  );
}
