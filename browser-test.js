// browser-test.js — Playwright test for ai-website-builder + FORGE Pro integration
const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting browser test...\n');
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const page = await browser.newPage();

  const BASE = 'http://localhost:3000';
  const results = [];

  function pass(msg) { results.push({ status: '✅ PASS', msg }); console.log('  ✅ PASS:', msg); }
  function fail(msg) { results.push({ status: '❌ FAIL', msg }); console.log('  ❌ FAIL:', msg); }
  function info(msg) { console.log('  ℹ️  ', msg); }

  try {
    // ── 1. Load the app ────────────────────────────────────────────────────
    console.log('📋 Test 1: Page loads');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    info(`Page title: "${title}"`);
    if (title) pass('Page loaded with a title');
    else fail('Page has no title');

    // ── 2. Check key UI elements ──────────────────────────────────────────
    console.log('\n📋 Test 2: Core UI elements present');
    const promptArea = page.locator('textarea, input[type=text]').first();
    const generateBtn = page.locator('button').filter({ hasText: /generate/i }).first();

    if (await promptArea.isVisible()) pass('Prompt input visible');
    else fail('Prompt input not found');

    if (await generateBtn.isVisible()) pass('Generate button visible');
    else fail('Generate button not found');

    // ── 3. "Edit in FORGE Pro" button should not appear before generation ──
    console.log('\n📋 Test 3: Edit button hidden before generation');
    const editBtn = page.locator('button').filter({ hasText: /Edit in FORGE Pro/i });
    const editBtnCount = await editBtn.count();
    if (editBtnCount === 0) pass('"Edit in FORGE Pro" correctly hidden before generation');
    else fail('"Edit in FORGE Pro" should not be visible yet');

    // ── 4. Fill prompt and generate ───────────────────────────────────────
    console.log('\n📋 Test 4: Enter prompt and generate a website');
    await promptArea.fill('A simple portfolio for a web developer named Alex');
    pass('Filled prompt input');

    await generateBtn.click();
    info('Clicked Generate button — waiting for AI response...');

    // Wait for the Edit button to appear (means generation completed)
    try {
      await page.waitForSelector('button:has-text("Edit in FORGE Pro")', { timeout: 60000 });
      pass('Generation complete — "Edit in FORGE Pro" button appeared');
    } catch (e) {
      fail('Timed out waiting for generation to complete');
    }

    // ── 5. Preview iframe should exist ────────────────────────────────────
    console.log('\n📋 Test 5: Preview iframe present');
    const previewIframe = page.locator('iframe[title="Website Preview"]');
    if (await previewIframe.isVisible()) pass('Preview iframe is visible');
    else fail('Preview iframe not found');

    // ── 6. Click Edit button → FORGE Pro editor loads ────────────────────
    console.log('\n📋 Test 6: Switch to FORGE Pro editor');
    const editBtnEl = page.locator('button').filter({ hasText: /Edit in FORGE Pro/i });
    await editBtnEl.click();
    info('Clicked "Edit in FORGE Pro"');

    // Wait for editor iframe to load
    try {
      const editorIframe = page.locator('iframe[title="FORGE Pro Editor"]');
      await editorIframe.waitFor({ state: 'visible', timeout: 15000 });
      pass('FORGE Pro editor iframe is visible');

      // Give the editor time to fully boot and receive content
      await page.waitForTimeout(4000);

      // Check the iframe src points to our editor
      const src = await editorIframe.getAttribute('src');
      if (src && src.includes('/editor/')) pass(`Editor src is correct: ${src}`);
      else fail(`Editor src unexpected: ${src}`);
    } catch (e) {
      fail('FORGE Pro editor iframe did not appear: ' + e.message);
    }

    // ── 6b. Make an edit in the editor ────────────────────────────────────
    console.log('\n📋 Test 6b: Make an edit in the editor');
    try {
      const editorFrame = page.frameLocator('iframe[title="FORGE Pro Editor"]');
      // The prompt generated a site for "Alex", so we search for that text
      const textEl = editorFrame.locator('.forge-el', { hasText: 'Alex' }).last();
      await textEl.waitFor({ state: 'visible', timeout: 10000 });
      await textEl.click();
      
      // Use the editor's State Engine API to ensure history and messages are properly fired
      await textEl.evaluate((node) => {
        if (window.updateElement) {
          window.updateElement(node.id, 'text', 'Alex The Great');
        } else {
          // Fallback if state engine is not available
          node.textContent = 'Alex The Great';
          window.saveHistory();
        }
      });
      pass('Edited text "Alex" to "Alex The Great"');
      await page.waitForTimeout(2000); // give it time to save and postMessage
    } catch (e) {
      fail('Failed to edit text in the editor: ' + e.message);
    }

    // ── 7. Switch back to Preview ─────────────────────────────────────────
    console.log('\n📋 Test 7: Switch back to Preview mode');
    const viewPreviewBtn = page.locator('button').filter({ hasText: /View Preview/i });
    if (await viewPreviewBtn.isVisible()) {
      await viewPreviewBtn.click();
      pass('Clicked "View Preview" button');
      await page.waitForTimeout(1000);
      const previewIframeAgain = page.locator('iframe[title="Website Preview"]');
      if (await previewIframeAgain.isVisible()) pass('Preview iframe restored after toggling back');
      else fail('Preview iframe missing after toggling back');
    } else {
      fail('"View Preview" button not found');
    }

    // ── 8. Verify edit in Preview ─────────────────────────────────────────
    console.log('\n📋 Test 8: Verify edit in Preview');
    try {
      const previewFrame = page.frameLocator('iframe[title="Website Preview"]');
      // The preview iframe loads the generated page, we check if it contains "Alex The Great"
      const updatedTextEl = previewFrame.locator('text="Alex The Great"');
      await updatedTextEl.waitFor({ state: 'visible', timeout: 10000 });
      pass('Edit was successfully reflected in the preview');
    } catch (e) {
      fail('Edit was NOT reflected in the preview: ' + e.message);
    }

    // ── Screenshot ────────────────────────────────────────────────────────
    await page.screenshot({ path: 'test-result.png', fullPage: false });
    info('Screenshot saved to test-result.png');

  } catch (err) {
    fail('Unexpected error: ' + err.message);
    console.error(err);
  } finally {
    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('══════════════════════════════════════════');
    results.forEach(r => console.log(`  ${r.status}  ${r.msg}`));
    const passed = results.filter(r => r.status.includes('PASS')).length;
    const failed = results.filter(r => r.status.includes('FAIL')).length;
    console.log(`\n  Total: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════\n');

    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
