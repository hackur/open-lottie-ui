"use client";

import { RouteError } from "@/components/route-error";

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError route="/generate" error={error} reset={reset} />;
}
