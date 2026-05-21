import { redirect } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";

export default async function RootPage() {
  const settings = await getSiteSettings();
  const firstPage = settings?.first_page;
  redirect(firstPage ? `/${firstPage}` : "/");
}
