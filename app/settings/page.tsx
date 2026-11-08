import { redirect } from "next/navigation";

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsRedirect(props: SettingsPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const params = new URLSearchParams();
  params.set("tab", "settings");

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab") continue;
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    }
  }

  const query = params.toString();
  redirect(`/?${query}`);
}

