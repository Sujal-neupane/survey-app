import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { SurveySchema } from "../src/lib/survey/types";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create or update Demo Admin
  const demoEmail = "demo@example.com";
  const passwordHash = await bcrypt.hash("Demo@12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash },
    create: {
      email: demoEmail,
      passwordHash,
    },
  });

  console.log(`Demo admin ready: ${admin.email}`);

  // 2. Define Customer Feedback Survey Schema
  const schema: SurveySchema = {
    questions: [
      {
        id: "q_use_product",
        type: "single_choice",
        label: "Do you use our product?",
        helpText: "Select your current user status with our platform",
        required: true,
        options: [
          { id: "opt_yes", label: "Yes, regularly" },
          { id: "opt_no", label: "No, not yet" },
        ],
      },
      {
        id: "q_like_most",
        type: "text",
        label: "What do you like most about our product?",
        helpText: "Tell us about your favorite feature or workflow",
        required: false,
        maxLength: 1000,
        showIf: {
          logic: "and",
          conditions: [
            {
              questionId: "q_use_product",
              operator: "equals",
              value: "opt_yes",
            },
          ],
        },
      },
      {
        id: "q_make_try",
        type: "text",
        label: "What would encourage you to try it?",
        helpText: "We value your suggestions on what would help you get started",
        required: false,
        maxLength: 1000,
        showIf: {
          logic: "and",
          conditions: [
            {
              questionId: "q_use_product",
              operator: "equals",
              value: "opt_no",
            },
          ],
        },
      },
      {
        id: "q_features",
        type: "multi_choice",
        label: "Which features do you use most frequently?",
        helpText: "Select all that apply to your workflow",
        required: false,
        options: [
          { id: "opt_dash", label: "Interactive Analytics Dashboard" },
          { id: "opt_alerts", label: "Real-time Notification Alerts" },
          { id: "opt_reports", label: "Automated Weekly PDF Reports" },
          { id: "opt_api", label: "REST & Webhook API Integrations" },
        ],
        showIf: {
          logic: "and",
          conditions: [
            {
              questionId: "q_use_product",
              operator: "equals",
              value: "opt_yes",
            },
          ],
        },
      },
      {
        id: "q_rating",
        type: "rating",
        label: "How would you rate your overall experience?",
        helpText: "1 = Poor, 5 = Excellent",
        required: true,
        min: 1,
        max: 5,
      },
    ],
  };

  const surveySlug = "customer-feedback-demo";

  // Upsert survey
  const existingSurvey = await prisma.survey.findUnique({
    where: { slug: surveySlug },
  });

  if (existingSurvey) {
    await prisma.survey.delete({ where: { slug: surveySlug } });
  }

  const survey = await prisma.survey.create({
    data: {
      title: "Customer Feedback",
      description: "Help us understand your experience and make our dynamic survey platform even better.",
      slug: surveySlug,
      ownerId: admin.id,
      draftSchema: schema as unknown as Prisma.InputJsonValue,
      status: "PUBLISHED",
    },
  });

  // Create Version 1 snapshot
  const surveyVersion = await prisma.surveyVersion.create({
    data: {
      surveyId: survey.id,
      version: 1,
      title: survey.title,
      description: survey.description,
      schema: schema as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`Created survey: "${survey.title}" (slug: ${survey.slug}, version: ${surveyVersion.version})`);

  // 3. Generate ~40 realistic responses
  const positiveFeedbacks = [
    "The conditional logic and drag-and-drop question reordering is remarkably fast.",
    "Clean and minimalist respondent UI. Our users love how easy it is on mobile.",
    "Instant real-time analytics charts and export capabilities save our team hours.",
    "Extremely responsive and accessible inputs, especially the keyboard navigation.",
    "Setting up branching surveys takes minutes instead of hours now.",
    "Real-time progress bar keeps our survey completion rates high.",
    "Great overall aesthetic and robust validation on both client and server.",
  ];

  const prospectiveFeedbacks = [
    "More starter templates for HR and product research.",
    "Direct native integrations with Slack and Google Workspace.",
    "Custom domain support for corporate branding.",
    "A self-hosted Docker compose option for enterprise compliance.",
    "More color themes and custom font options.",
  ];

  const responsesData = [];
  const now = Date.now();

  for (let i = 1; i <= 42; i++) {
    const isUser = i % 3 !== 0; // ~66% users, ~33% non-users
    const daysAgo = Math.floor(Math.random() * 10);
    const submittedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 3600000);
    const ipHash = crypto.createHash("sha256").update(`seed-ip-${i}`).digest("hex");

    const answers: Record<string, string | number | string[]> = {};

    if (isUser) {
      answers["q_use_product"] = "opt_yes";
      answers["q_like_most"] = positiveFeedbacks[i % positiveFeedbacks.length];

      // Pick random features
      const featurePool = ["opt_dash", "opt_alerts", "opt_reports", "opt_api"];
      const selectedCount = (i % 3) + 1;
      answers["q_features"] = featurePool.slice(0, selectedCount);

      // Mostly 4s and 5s, occasionally 3
      answers["q_rating"] = i % 7 === 0 ? 3 : i % 2 === 0 ? 5 : 4;
    } else {
      answers["q_use_product"] = "opt_no";
      answers["q_make_try"] = prospectiveFeedbacks[i % prospectiveFeedbacks.length];
      answers["q_rating"] = (i % 3) + 2; // 2, 3, or 4
    }

    responsesData.push({
      surveyVersionId: surveyVersion.id,
      answers: answers as unknown as Prisma.InputJsonValue,
      status: "COMPLETE" as const,
      ipHash,
      createdAt: submittedAt,
      submittedAt,
    });
  }

  await prisma.response.createMany({
    data: responsesData,
  });

  console.log(`Successfully seeded ${responsesData.length} completed responses for analytics!`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
