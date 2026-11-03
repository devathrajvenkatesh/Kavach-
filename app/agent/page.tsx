import { redirect } from "next/navigation";

export default function AgentRedirect() {
  redirect("/?tab=ai-agent");
}
