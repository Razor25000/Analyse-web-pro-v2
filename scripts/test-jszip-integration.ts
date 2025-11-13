#!/usr/bin/env tsx

/**
 * Test script to verify JSZip integration works correctly
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function testJSZipIntegration() {
  console.log("🔍 Testing JSZip integration...");

  try {
    // Test JSZip import
    console.log("\n1️⃣ Testing JSZip import...");
    const JSZip = await import('jszip');
    console.log("✅ JSZip imported successfully");

    // Test basic ZIP creation
    console.log("\n2️⃣ Testing basic ZIP creation...");
    const zip = new JSZip.default();

    // Add some test files
    zip.file('test.txt', 'Hello World!');
    zip.file('data.json', JSON.stringify({ test: true, timestamp: new Date().toISOString() }));

    // Generate ZIP content
    console.log("📦 Generating ZIP content...");
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    // Write to temporary file
    const tempPath = join(tmpdir(), 'test-export.zip');
    await writeFile(tempPath, zipContent);

    console.log(`✅ ZIP file created: ${tempPath}`);
    console.log(`📊 ZIP file size: ${zipContent.length} bytes`);

    // Clean up
    const { unlink } = await import('fs/promises');
    await unlink(tempPath);
    console.log("🗑️ Temporary file cleaned up");

    console.log("\n✅ JSZip integration test completed successfully!");
    console.log("📋 The export system should now work correctly with JSZip.");

  } catch (error) {
    console.error("❌ JSZip integration test failed:", error);
    process.exit(1);
  }
}

// Run the test
testJSZipIntegration().then(() => {
  console.log("🏁 JSZip test completed");
}).catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});