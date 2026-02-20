import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to sign-in by default
  redirect("/sign-in");
}
