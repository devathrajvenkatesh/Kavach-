import { redirect } from "next/navigation";

export default function SecureFilesRedirect() {
  redirect("/?tab=files");
}
