import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function AppAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredStudyLanguageCode: true },
  });

  const name = session.user.name?.trim() || "Pengguna";
  const avatarChar = name.charAt(0).toUpperCase();

  return (
    <AppShell
      user={{
        name,
        email: session.user.email,
        avatarChar,
        preferredStudyLanguageCode: row?.preferredStudyLanguageCode ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
