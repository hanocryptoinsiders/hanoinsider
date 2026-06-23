import { redirect } from "next/navigation";
import { HanoLanding } from "@/components/marketing/HanoLanding";
import { getCurrentUser } from "@/lib/auth";

export default async function Landing() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return <HanoLanding />;
}
