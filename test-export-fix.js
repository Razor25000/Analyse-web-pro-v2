const { chromium } = require('@playwright/test');

async function testExportModal() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the audits page
    await page.goto('http://localhost:3000/dashboard/audits');

    // Wait for page to load and check if we need to sign in
    await page.waitForTimeout(2000);

    // Check if we're on the signin page
    const isSigninPage = await page.url().includes('/auth/signin');

    if (isSigninPage) {
      console.log('❌ Need to sign in first. Please login manually and try again.');
      return;
    }

    // Look for the export button
    const exportButton = await page.$('text="Exporter les résultats"');
    if (!exportButton) {
      console.log('❌ Export button not found');
      return;
    }

    console.log('✅ Found export button');

    // Try to click the export button and check for form errors
    await exportButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Check if the modal content appears (not the error message)
    const modalContent = await page.$('text="Exporter les audits"');
    const errorMessage = await page.$('text="Form error: Form component is not properly configured"');

    if (errorMessage) {
      console.log('❌ Form error still present - fix failed');
      return;
    }

    if (modalContent) {
      console.log('✅ Export modal opened successfully without form errors');

      // Check if form elements are present
      const formatSelect = await page.$('select');
      if (formatSelect) {
        console.log('✅ Form elements are properly rendered');
      } else {
        console.log('❌ Form elements not found');
      }
    } else {
      console.log('⚠️ Modal not immediately visible, checking again...');
      await page.waitForTimeout(2000);
      const modalContent2 = await page.$('text="Exporter les audits"');
      if (modalContent2) {
        console.log('✅ Export modal opened successfully without form errors');
      } else {
        console.log('❌ Modal content not found');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testExportModal().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});