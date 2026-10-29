// Leak check: with the theme switched off, nothing of it may be left in SillyTavern's page.
// Run before every push against a test SillyTavern with this extension installed:
//   node tests/leak-check.js [http://127.0.0.1:8000/]
// Needs Playwright. It turns the theme off through its own switch, checks the page, reloads with
// it off, checks again, opens a chat while off, checks again, then turns it on, off and on again
// and checks that it comes back whole and leaves nothing the second time either.
// Exits with 1 and lists what it found when anything of the theme is left.

const { chromium } = require('playwright');

const URL = process.argv[2] ?? 'http://127.0.0.1:8000/';

/** Everything of the theme's in the page, outside its own settings panel */
function scan() {
    const found = [];
    const outside = (node) => !node.closest?.('.mst-settings');
    for (const node of document.querySelectorAll('*')) {
        if (!outside(node)) {
            continue;
        }
        const name = `${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''}`;
        if (/^mst/i.test(node.id)) {
            found.push(`element ${name}`);
        }
        for (const cls of node.classList) {
            if (cls.startsWith('mst-') || cls === 'ms-teams') {
                found.push(`class ${cls} on ${name}`);
            }
        }
        for (const attribute of node.attributes) {
            if (attribute.name.startsWith('data-mst')) {
                found.push(`attribute ${attribute.name} on ${name}`);
            }
            if (attribute.name === 'style' && attribute.value.includes('--mst-')) {
                found.push(`style variable on ${name}`);
            }
        }
    }
    if (document.title.endsWith('Microsoft Teams')) {
        found.push('the tab is still titled like a Teams tab');
    }
    if (document.getElementById('send_textarea')?.getAttribute('placeholder') === 'Type a message') {
        found.push('the message box still says Type a message');
    }
    if ([...document.querySelectorAll('link[rel~="icon"]')].some((link) => link.href.includes('teams.microsoft.com'))) {
        found.push('the tab still has the Teams icon');
    }
    if (document.documentElement.classList.contains('mst-html')) {
        found.push('class mst-html on html');
    }
    if (document.getElementById('mst-custom-css')) {
        found.push('the Customize CSS is still in the page');
    }
    return found;
}

async function setTheme(page, on) {
    await page.evaluate((on) => {
        const box = document.getElementById('mst_enabled');
        box.checked = on;
        box.dispatchEvent(new Event('input', { bubbles: true }));
    }, on);
    await page.waitForTimeout(2000);
}

(async () => {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(URL);
    await page.waitForSelector('#mst_enabled', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(3000);
    await setTheme(page, true);

    const results = {};
    await setTheme(page, false);
    results['turned off'] = await page.evaluate(scan);
    await page.reload();
    await page.waitForSelector('#mst_enabled', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(4000);
    results['loaded while off'] = await page.evaluate(scan);
    await page.evaluate(async () => {
        const context = SillyTavern.getContext();
        if (context.characters.length) {
            await context.selectCharacterById(0);
        }
    });
    await page.waitForTimeout(2500);
    results['chat opened while off'] = await page.evaluate(scan);
    // on, off and on again: it comes back whole, then leaves nothing again
    await setTheme(page, true);
    const back = await page.evaluate(() => !!document.querySelector('#mst-titlebar') && document.body.classList.contains('ms-teams'));
    await setTheme(page, false);
    results['turned off a second time'] = await page.evaluate(scan);
    await setTheme(page, true);
    if (!back) {
        results['turned on again'] = ['the theme did not come back when turned on'];
    }
    await browser.close();

    let failed = false;
    for (const [step, found] of Object.entries(results)) {
        console.log(`${found.length ? 'FAIL' : 'ok  '} ${step}${found.length ? `: ${found.length} left` : ''}`);
        for (const item of found.slice(0, 20)) {
            console.log(`       ${item}`);
        }
        failed ||= found.length > 0;
    }
    for (const error of errors) {
        console.log(`page error: ${error}`);
    }
    process.exit(failed || errors.length ? 1 : 0);
})();
