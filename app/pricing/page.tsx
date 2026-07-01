import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HanoPricing } from "@/components/marketing/HanoPricing";
import { getCurrentUser, isPremium } from "@/lib/auth";

export default async function PricingPage() {
  const user = await getCurrentUser();

  if (user) {
    const active = await isPremium();
    if (active) {
      redirect("/dashboard");
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0d10]" />}>
      <HanoPricing />
    </Suspense>
  );
}
