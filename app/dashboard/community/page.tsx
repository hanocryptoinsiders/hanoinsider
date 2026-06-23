import { redirect } from "next/navigation";

export default function DisabledLaunchRoute() {
  redirect("/dashboard");
}
