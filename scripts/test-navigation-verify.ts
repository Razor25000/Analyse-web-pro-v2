#!/usr/bin/env tsx

/**
 * Quick verification script to test navigation structure
 * Verifies that all navigation components are properly exported and configured
 */

import { getDashboardNavigation } from "../app/dashboard/dashboard.links";

console.log("🧭 Testing navigation structure...\n");

try {
  // Test dashboard navigation
  console.log("📊 Dashboard Navigation:");
  const dashboardNav = getDashboardNavigation();

  dashboardNav.forEach((group, index) => {
    console.log(`  ${index + 1}. ${group.title}`);
    group.links.forEach((link, linkIndex) => {
      console.log(
        `     ${linkIndex + 1}.${linkIndex + 1} ${link.label} → ${link.href}`,
      );
    });
  });

  console.log("\n✅ Dashboard navigation verification completed successfully!");

  // Summary
  const totalDashboardLinks = dashboardNav.reduce(
    (acc, group) => acc + group.links.length,
    0,
  );

  console.log(`\n📈 Summary:`);
  console.log(
    `   Dashboard: ${dashboardNav.length} groups, ${totalDashboardLinks} links`,
  );

  // Verify that all essential pages exist
  const expectedPaths = [
    "/dashboard/audits",
    "/dashboard/audits/new",
    "/dashboard/audits/batch",
    "/dashboard/settings",
  ];

  const availablePaths = dashboardNav.flatMap((group) =>
    group.links.map((link) => link.href),
  );
  const missingPaths = expectedPaths.filter(
    (path) => !availablePaths.includes(path),
  );

  if (missingPaths.length > 0) {
    console.log(`\n⚠️  Missing expected paths: ${missingPaths.join(", ")}`);
  } else {
    console.log(`\n✅ All expected dashboard paths are available!`);
  }
} catch (error) {
  console.error("❌ Navigation verification failed:", error);
  process.exit(1);
}
