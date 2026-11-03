import { redirect } from "next/navigation";

export default function ExecutiveRadarRedirect() {
  redirect("/?tab=overview");
}
