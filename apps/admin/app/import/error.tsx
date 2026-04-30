"use client";

import { RouteError } from "@/components/route-error";

export default function ImportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError route="/import" error={error} reset={reset} />;
}
