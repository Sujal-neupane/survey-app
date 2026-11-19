import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, ApiError } from "@/lib/errors";
import { checkRateLimit, extractClientIp, getIpHash } from "@/lib/rateLimit";

export const GET = apiHandler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;

  // Rate limiting: 60 requests per minute per IP
  const clientIp = extractClientIp(req);
  const ipHash = getIpHash(clientIp);
  const rateResult = await checkRateLimit(`public_get:${ipHash}`, 60, 60);

  if (!rateResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait a moment before trying again.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, rateResult.reset - Math.floor(Date.now() / 1000))) },
      }
    );
  }

  const survey = await db.survey.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      slug: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          id: true,
          version: true,
          title: true,
          description: true,
          schema: true,
        },
      },
    },
  });

  if (!survey || survey.versions.length === 0) {
    throw new ApiError(404, "Survey not found or not yet published", "NOT_FOUND");
  }

  if (survey.status === "CLOSED") {
    return NextResponse.json(
      {
        error: {
          code: "SURVEY_CLOSED",
          message: "This survey is no longer accepting responses.",
        },
      },
      { status: 410 }
    );
  }

  const latestVersion = survey.versions[0];

  return NextResponse.json({
    title: latestVersion.title || survey.title,
    description: latestVersion.description || survey.description,
    schema: latestVersion.schema,
    version: latestVersion.version,
    slug: survey.slug,
  });
});
