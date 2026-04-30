"use client";

import { RouteError } from "@/components/route-error";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError route="/activity" error={error} reset={reset} />;
}
