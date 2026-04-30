import { redirect } from "next/navigation";
import { shouldShowWelcome } from "@/lib/first-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  if (await shouldShowWelcome()) {
    redirect("/welcome");
  }
  redirect("/library");
}
