async function globalTeardown() {
  // Skip cleanup when using mock database for testing
  if (process.env.DATABASE_URL?.includes("dummy")) {
    console.info("Skipping teardown for mock database");
    return;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.user.deleteMany({
      where: {
        email: {
          contains: "playwright-test-",
        },
      },
    });

    // eslint-disable-next-line no-console
    console.info(`Cleanup ${count.count} test users`);
  } catch (error) {
    console.info("Teardown skipped: database not available", error);
  }
}

export default globalTeardown;
