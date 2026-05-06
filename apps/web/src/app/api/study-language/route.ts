import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLanguageCode } from "@/lib/study-languages";

const COOKIE = "preferred_study_lang";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? (body as { code: unknown }).code
      : undefined;

  if (typeof code !== "string" || !isStudyLanguageCode(code)) {
    return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredStudyLanguageCode: code },
  });

  const langRow = await prisma.language.findUnique({
    where: { code },
    select: { id: true },
  });

  if (langRow) {
    await prisma.userLanguageSettings.upsert({
      where: {
        userId_languageId: {
          userId: session.user.id,
          languageId: langRow.id,
        },
      },
      create: {
        userId: session.user.id,
        languageId: langRow.id,
        isStudying: true,
        includeInTotalProgress: true,
      },
      update: {},
    });
  }

  const res = NextResponse.json({ ok: true, code });
  res.cookies.set(COOKIE, code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
