import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireSurveyOwner } from "@/lib/auth";
import { apiHandler } from "@/lib/errors";

export const POST = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  const updated = await db.survey.update({
    where: { id },
    data: { status: "CLOSED" },
    select: {
      id: true,
      status: true,
      slug: true,
    },
  });

  return NextResponse.json({
    message: "Survey closed successfully",
    survey: updated,
  });
});
