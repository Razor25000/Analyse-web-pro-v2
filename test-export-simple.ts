#!/usr/bin/env tsx

/**
 * Simple test to verify export functionality works
 */

import { exportJobManager } from './src/lib/jobs/export-job-manager';

async function testExport() {
  console.log('🔍 Testing export functionality...');

  try {
    // Test 1: Create a simple export job
    console.log('\n1️⃣ Testing basic export job creation...');
    const testUserId = 'test-user-' + Date.now();
    const testConfig = {
      format: 'json',
      filters: {
        status: ['completed'],
        minScore: 0
      },
      includeMetadata: true,
      includeScreenshots: false
    };

    const job = await exportJobManager.createExportJob(testUserId, testConfig);
    console.log(`✅ Export job created: ${job.id}`);

    // Monitor job progress
    console.log('\n2️⃣ Monitoring job progress...');
    let finalStatus = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentJob = exportJobManager.getJob(job.id);

      if (currentJob) {
        finalStatus = currentJob.status;
        console.log(`📊 Status: ${currentJob.status.phase} - ${currentJob.progress}% - ${currentJob.status.message}`);

        if (currentJob.status.phase === 'completed') {
          console.log('✅ Export completed successfully!');
          break;
        } else if (currentJob.status.phase === 'error') {
          console.log(`❌ Export failed: ${currentJob.status.error}`);
          break;
        }
      }

      attempts++;
    }

    if (finalStatus && finalStatus.phase === 'completed') {
      console.log(`✅ Test passed! Export completed in ${attempts} seconds`);
      console.log(`📂 Download URL: ${job.downloadUrl}`);
    } else {
      console.log('❌ Test failed! Export did not complete in time');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testExport().then(() => {
  console.log('🏁 Export test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});