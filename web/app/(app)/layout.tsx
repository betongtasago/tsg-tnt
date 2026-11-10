import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell role={session.role} fullName={session.fullName} username={session.username}>
      {children}
    </AppShell>
  );
}
