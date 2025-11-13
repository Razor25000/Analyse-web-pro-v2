#!/usr/bin/env tsx

import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";
import { prisma } from "../src/lib/prisma";

// Set seed for reproducibility
faker.seed(123);

// Retry utility for network operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      logger.warn(
        `Tentative ${attempt} échouée, retry dans ${delay}ms...`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}

async function main() {
  logger.info("🌱 Seeding database with robust error handling...");

  try {
    // Test connection first
    await retryOperation(async () => {
      await prisma.$connect();
      logger.info("✅ Connexion Prisma établie");
    });

    // Create users with retry logic
    const userCreatePromises = Array.from({ length: 10 }, async (_, index) => {
      const email = faker.internet.email();

      return retryOperation(async () => {
        return prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            id: nanoid(11),
            name: faker.person.fullName(),
            email,
            emailVerified: faker.datatype.boolean(0.8),
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
    });

    const users = await Promise.all(userCreatePromises);
    users.forEach((user) => logger.info(`👤 Created user: ${user.name}`));

    // Create audit logs with smaller batches to avoid timeouts
    const auditLogPromises = users.slice(0, 5).map(async (user, userIndex) => {
      const auditCount = faker.number.int({ min: 1, max: 3 }); // Reduced count

      const auditPromises = Array.from(
        { length: auditCount },
        async (_, auditIndex) =>
          retryOperation(async () => {
            logger.info(
              `Creating audit log ${auditIndex + 1}/${auditCount} for user ${userIndex + 1}`,
            );
            return prisma.auditUsageLog.create({
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
                completedAt: faker.datatype.boolean(0.7)
                  ? faker.date.recent()
                  : null,
              },
            });
          }),
      );

      return Promise.all(auditPromises);
    });

    await Promise.all(auditLogPromises);
    logger.info("📝 Audit logs créés avec succès");

    // Create subscriptions
    const subscriptionPromises = users.slice(0, 3).map(async (user, index) =>
      retryOperation(async () => {
        logger.info(`Creating subscription ${index + 1}/3`);
        return prisma.subscription.create({
          data: {
            id: nanoid(11),
            plan: faker.helpers.arrayElement(["pro", "premium"]),
            referenceId: nanoid(11),
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
            status: faker.helpers.arrayElement([
              "active",
              "canceled",
              "past_due",
            ]),
            periodStart: faker.date.past(),
            periodEnd: faker.date.future(),
            cancelAtPeriodEnd: faker.datatype.boolean(0.2),
            seats: faker.number.int({ min: 1, max: 5 }),
          },
        });
      }),
    );

    await Promise.all(subscriptionPromises);
    logger.info("💳 Subscriptions créées avec succès");

    // Create feedback
    const feedbackPromises = users.slice(0, 4).map(async (user, index) =>
      retryOperation(async () => {
        logger.info(`Creating feedback ${index + 1}/4`);
        return prisma.feedback.create({
          data: {
            review: faker.number.int({ min: 1, max: 5 }),
            message: faker.lorem.paragraph(),
            email: faker.datatype.boolean(0.5) ? faker.internet.email() : null,
            userId: user.id,
          },
        });
      }),
    );

    await Promise.all(feedbackPromises);
    logger.info("💬 Feedback créés avec succès");

    logger.info(
      "✅ Seeding completed successfully with robust error handling!",
    );
  } catch (error) {
    logger.error("❌ Critical error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
