import { redirect } from "next/navigation";
import { HanoLanding } from "@/components/marketing/HanoLanding";
import { getCurrentUser, isPremium } from "@/lib/auth";

export default async function Landing() {
  const user = await getCurrentUser();

  if (user) {
    const active = await isPremium();
    if (active) {
      redirect("/dashboard");
    }
  }

  return <HanoLanding />;
}
