"use client";

import { RouteError } from "@/components/route-error";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError route="/settings" error={error} reset={reset} />;
}
