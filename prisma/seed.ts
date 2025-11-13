import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";
import { prisma } from "../src/lib/prisma";

// Set seed for reproducibility
faker.seed(123);

async function main() {
  logger.info("🌱 Seeding database...");

  // Create 10 users with UserQuota
  const userCreatePromises = Array.from({ length: 10 }, async () => {
    const email = faker.internet.email();
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: nanoid(11),
        name: faker.person.fullName(),
        email,
        emailVerified: faker.datatype.boolean(0.8), // 80% chance of being verified
        image: faker.image.avatar(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        stripeCustomerId: faker.string.alphanumeric(10),
        quota: {
          create: {
            planId: faker.helpers.arrayElement(["free", "pro", "premium"]),
            auditsUsed: faker.number.int({ min: 0, max: 10 }),
            auditsLimit: faker.helpers.arrayElement([5, 25, 100]),
          },
        },
      },
      include: {
        quota: true,
      },
    });
  });

  const users = await Promise.all(userCreatePromises);
  users.forEach((user) => logger.info(`👤 Created user: ${user.name}`));

  // Create some audit usage logs for users
  const auditLogPromises = users.slice(0, 5).map(async (user) => {
    const auditCount = faker.number.int({ min: 1, max: 5 });
    const auditPromises = Array.from({ length: auditCount }, async () =>
      prisma.auditUsageLog.create({
        data: {
          userId: user.id,
          auditType: faker.helpers.arrayElement(["single", "batch"]),
          url: faker.internet.url(),
          status: faker.helpers.arrayElement([
            "processing",
            "completed",
            "failed",
          ]),
          runId: nanoid(11),
          createdAt: faker.date.past(),
          completedAt: faker.datatype.boolean(0.7) ? faker.date.recent() : null,
        },
      }),
    );
    return Promise.all(auditPromises);
  });

  await Promise.all(auditLogPromises);

  // Create some subscriptions
  const subscriptionPromises = users.slice(0, 3).map(async (user) =>
    prisma.subscription.create({
      data: {
        id: nanoid(11),
        plan: faker.helpers.arrayElement(["pro", "premium"]),
        referenceId: nanoid(11),
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
        status: faker.helpers.arrayElement(["active", "canceled", "past_due"]),
        periodStart: faker.date.past(),
        periodEnd: faker.date.future(),
        cancelAtPeriodEnd: faker.datatype.boolean(0.2),
        seats: faker.number.int({ min: 1, max: 5 }),
      },
    }),
  );

  await Promise.all(subscriptionPromises);

  // Create some feedback
  const feedbackPromises = users.slice(0, 4).map(async (user) =>
    prisma.feedback.create({
      data: {
        review: faker.number.int({ min: 1, max: 5 }),
        message: faker.lorem.paragraph(),
        email: faker.datatype.boolean(0.5) ? faker.internet.email() : null,
        userId: user.id,
      },
    }),
  );

  await Promise.all(feedbackPromises);

  logger.info("✅ Seeding completed!");
}

main()
  .catch((e) => {
    logger.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
