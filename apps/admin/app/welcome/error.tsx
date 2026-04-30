"use client";

import { RouteError } from "@/components/route-error";

export default function WelcomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError route="/welcome" error={error} reset={reset} />;
}
