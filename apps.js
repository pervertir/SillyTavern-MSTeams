// The rail apps' screens, each dressed as its Teams app while doing its own job:
// Activity (response settings) as the Activity pane, Calendar (API connections) as a
// calendar week with the connection as today's meeting, Calls (formatting) with the dial
// pad, OneDrive (World Info) as My files, Copilot (user settings) with its greeting and a
// prompt box that searches the settings, and Apps (extensions) as the app store.
// Everything added here is hidden by CSS while the theme is off.

function t(text) {
    return SillyTavern.getContext().translate(text);
}

function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function fluentIcon(name, size = 20) {
    const icon = el('i', 'mst-fluent');
    icon.style.setProperty('--mst-glyph', `var(--mst-icon-${name})`);
    if (size !== 20) {
        icon.style.width = icon.style.height = `${size}px`;
        icon.style.setProperty('mask-size', `${size}px ${size}px`);
        icon.style.setProperty('-webkit-mask-size', `${size}px ${size}px`);
    }
    return icon;
}

function toolButton(label, icon, onClick, primary = false) {
    const button = el('button', `mst-tool${primary ? ' mst-tool-primary' : ''}`);
    button.type = 'button';
    if (icon) {
        button.append(fluentIcon(icon, 16));
    }
    if (label) {
        button.append(el('span', '', t(label)));
    } else {
        button.classList.add('mst-tool-icon');
    }
    button.addEventListener('click', onClick);
    return button;
}

function click(selector) {
    /** @type {HTMLElement} */ (document.querySelector(selector))?.click();
}

/** The app's header bar: its name, then its own tools. */
function header(drawer, title, tools = [], middle = []) {
    const bar = el('div', 'mst-app-header');
    const name = el('h2', 'mst-app-title', t(title));
    const left = el('div', 'mst-app-tools');
    left.append(...middle);
    const right = el('div', 'mst-app-tools mst-app-tools-end');
    right.append(...tools);
    bar.append(name, left, right);
    drawer.prepend(bar);
    return bar;
}

/* Calendar ------------------------------------------------------------------------------ */

const DAY_START = 8;
const DAY_END = 18;
let weekOffset = 0;

function getConnection() {
    const disconnected = document.getElementById('API-status-top')?.classList.contains('fa-plug-circle-exclamation');
    const api = /** @type {HTMLSelectElement} */ (document.getElementById('main_api'));
    const apiName = api?.selectedOptions?.[0]?.textContent?.trim() || '';
    return { connected: !disconnected, apiName };
}

function renderCalendar(stage, monthLabel) {
    const { timestampToMoment } = SillyTavern.getContext();
    const now = timestampToMoment(Date.now());
    const monday = now.clone().startOf('isoWeek').add(weekOffset, 'weeks');
    monthLabel.textContent = monday.format('MMMM YYYY');

    // every cell has its own place, so the meeting and the "now" line can sit on top of them
    const place = (element, column, row) => {
        element.style.gridColumn = String(column);
        element.style.gridRow = String(row);
        return element;
    };
    const grid = el('div', 'mst-cal-grid');
    grid.append(place(el('div', 'mst-cal-corner'), 1, 1));
    const days = [];
    for (let i = 0; i < 5; i++) {
        const day = monday.clone().add(i, 'days');
        days.push(day);
        const head = el('div', 'mst-cal-dayhead');
        head.classList.toggle('mst-cal-today', day.isSame(now, 'day'));
        head.append(el('span', 'mst-cal-date', day.format('D')), el('span', 'mst-cal-weekday', day.format('dddd')));
        grid.append(place(head, i + 2, 1));
    }
    for (let hour = DAY_START; hour < DAY_END; hour++) {
        const row = hour - DAY_START + 2;
        grid.append(place(el('div', 'mst-cal-hour', now.clone().hour(hour).minute(0).format('LT')), 1, row));
        days.forEach((day, index) => {
            const cell = el('div', 'mst-cal-cell');
            cell.classList.toggle('mst-cal-today', day.isSame(now, 'day'));
            grid.append(place(cell, index + 2, row));
        });
    }

    const todayIndex = days.findIndex(day => day.isSame(now, 'day'));
    if (todayIndex !== -1) {
        // the connection is today's meeting, and the red line is now, as in Teams
        const { connected, apiName } = getConnection();
        const hour = Math.min(Math.max(now.hour(), DAY_START), DAY_END - 1);
        const event = el('button', `mst-cal-event${connected ? '' : ' mst-cal-event-off'}`);
        event.type = 'button';
        event.style.setProperty('--mst-col', String(todayIndex + 2));
        event.style.setProperty('--mst-row', String(hour - DAY_START + 2));
        event.append(
            el('strong', '', connected ? apiName || t('Connected') : t('Not connected')),
            el('span', '', connected ? t('Connected') : t('Pick an API and connect')),
        );
        event.addEventListener('click', () => /** @type {HTMLElement} */ (document.getElementById('main_api'))?.focus());
        grid.append(event);

        const minutes = now.hour() * 60 + now.minute();
        if (minutes >= DAY_START * 60 && minutes < DAY_END * 60) {
            const line = el('div', 'mst-cal-now');
            line.style.setProperty('--mst-col', String(todayIndex + 2));
            line.style.setProperty('--mst-now', String((minutes - DAY_START * 60) / ((DAY_END - DAY_START) * 60)));
            grid.append(line);
        }
    }
    stage.replaceChildren(grid);
}

function buildCalendar() {
    const drawer = document.getElementById('rm_api_block');
    if (!drawer) {
        return;
    }
    const stage = el('div', 'mst-stage mst-calendar');
    const month = el('span', 'mst-cal-month');
    const render = () => renderCalendar(stage, month);
    const today = toolButton('Today', 'calendar', () => {
        weekOffset = 0;
        render();
    });
    const prev = toolButton('', 'chevron-left', () => {
        weekOffset--;
        render();
    });
    const next = toolButton('', 'chevron-right', () => {
        weekOffset++;
        render();
    });
    prev.title = t('Previous week');
    next.title = t('Next week');
    const view = toolButton('Work week', 'calendar', () => {});
    const add = toolButton('New event', 'add', () => /** @type {HTMLElement} */ (document.getElementById('main_api'))?.focus(), true);
    header(drawer, 'Calendar', [view, add], [today, prev, next, month]);
    drawer.append(stage);
    render();

    // redraw when the menu opens, so "now" and the connection are current
    document.querySelector('#sys-settings-button > .drawer-toggle')?.addEventListener('click', () => setTimeout(render, 50));
    const status = document.getElementById('API-status-top');
    if (status) {
        new MutationObserver(render).observe(status, { attributes: true, attributeFilter: ['class'] });
    }
}

/* Calls --------------------------------------------------------------------------------- */

function buildCalls() {
    const drawer = document.getElementById('AdvancedFormatting');
    if (!drawer) {
        return;
    }
    header(drawer, 'Calls', [toolButton('', 'more', () => {})]);
    const stage = el('div', 'mst-stage mst-dialpad');
    const number = el('input', 'mst-input');
    number.type = 'text';
    number.placeholder = t('Type a name or number');
    const keys = el('div', 'mst-dial-keys');
    const labels = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
    for (const [digit, letters] of labels) {
        const key = el('button', 'mst-dial-key');
        key.type = 'button';
        key.append(el('span', 'mst-dial-digit', digit), el('span', 'mst-dial-letters', letters));
        key.addEventListener('click', () => {
            number.value += digit;
        });
        keys.append(key);
    }
    const call = el('button', 'mst-tool mst-tool-primary mst-dial-call');
    call.type = 'button';
    call.append(fluentIcon('call', 16), el('span', '', t('Call')));
    call.disabled = true;
    number.addEventListener('input', () => {
        call.disabled = !number.value.trim();
    });
    const speed = el('h3', 'mst-dial-section', t('Speed dial'));
    const none = el('p', 'mst-dial-empty', t('Add the people you call most often.'));
    stage.append(el('h3', 'mst-dial-section', t('Make a call')), number, keys, call, speed, none);
    drawer.append(stage);
}

/* OneDrive ------------------------------------------------------------------------------ */

const WORLD_SELECT = '#world_editor_select';

/** Opens a lorebook the way SillyTavern's own picker does (it's a select2 box). */
function openLorebook(value) {
    const $ = /** @type {any} */ (window).jQuery;
    if ($) {
        $(WORLD_SELECT).val(value).trigger('change');
    }
}

/** The left column: every lorebook as a Word document, the open one highlighted. */
function renderDocuments(list, title) {
    const select = /** @type {HTMLSelectElement} */ (document.querySelector(WORLD_SELECT));
    if (!select) {
        return;
    }
    const items = [...select.options].filter(option => option.value !== '').map((option) => {
        const item = el('button', 'mst-doc');
        item.type = 'button';
        item.classList.toggle('mst-doc-active', option.selected);
        const icon = el('span', 'mst-doc-icon', 'W');
        const text = el('span', 'mst-doc-text');
        text.append(el('span', 'mst-doc-name', option.textContent.trim()), el('span', 'mst-doc-kind', t('Word document')));
        item.append(icon, text);
        item.title = option.textContent.trim();
        item.addEventListener('click', () => openLorebook(option.value));
        return item;
    });
    if (!items.length) {
        items.push(el('p', 'mst-dial-empty', t('No documents yet. Use New to create one.')));
    }
    list.replaceChildren(...items);
    const open = select.selectedOptions[0];
    title.textContent = open && open.value !== '' ? open.textContent.trim() : t('Documents');
    document.getElementById('WorldInfo')?.classList.toggle('mst-doc-open', !!open && open.value !== '');
}

function buildOneDrive() {
    const drawer = document.getElementById('WorldInfo');
    if (!drawer) {
        return;
    }
    const crumbs = el('div', 'mst-crumbs');
    const here = el('span', 'mst-crumb-here', t('Documents'));
    crumbs.append(el('span', '', t('My files')), el('span', 'mst-crumb-sep', '›'), here);
    header(drawer, 'OneDrive', [
        toolButton('Add new', 'add', () => click('#world_create_button'), true),
        toolButton('Upload', 'arrow-up', () => click('#world_import_button')),
    ], [crumbs]);

    // My files: the lorebooks as documents
    const stage = el('div', 'mst-stage mst-drive');
    const fresh = el('button', 'mst-tool mst-tool-primary mst-drive-new');
    fresh.type = 'button';
    fresh.append(fluentIcon('add', 16), el('span', '', t('New document')));
    fresh.addEventListener('click', () => click('#world_create_button'));
    const list = el('div', 'mst-docs');
    stage.append(el('h3', 'mst-dial-section', t('Documents')), fresh, list);
    drawer.append(stage);

    // Word: a ribbon of the document's commands over the page
    const ribbon = el('div', 'mst-ribbon');
    const tabs = el('div', 'mst-ribbon-tabs');
    for (const name of ['File', 'Home', 'Insert', 'Layout', 'References', 'Review', 'View']) {
        tabs.append(el('span', `mst-ribbon-tab${name === 'Home' ? ' mst-ribbon-tab-active' : ''}`, t(name)));
    }
    const docTitle = el('span', 'mst-ribbon-title');
    tabs.prepend(docTitle);
    const commands = el('div', 'mst-ribbon-commands');
    // Word's ¶ button shows what's normally hidden: here, each entry's matching settings
    const marks = el('button', 'mst-ribbon-command mst-ribbon-marks');
    marks.type = 'button';
    marks.title = t('Show/Hide ¶');
    marks.append(el('i', 'fa-solid fa-paragraph'), el('span', '', t('Entry settings')));
    marks.addEventListener('click', () => {
        const on = drawer.classList.toggle('mst-show-marks');
        marks.classList.toggle('mst-ribbon-on', on);
    });
    const command = (label, icon, selector) => {
        const button = el('button', 'mst-ribbon-command');
        button.type = 'button';
        button.append(el('i', icon), el('span', '', t(label)));
        button.addEventListener('click', () => click(selector));
        return button;
    };
    commands.append(
        command('New paragraph', 'fa-solid fa-plus', '#world_popup_new'),
        command('Expand all', 'fa-solid fa-up-right-and-down-left-from-center', '#OpenAllWIEntries'),
        command('Collapse all', 'fa-solid fa-down-left-and-up-right-to-center', '#CloseAllWIEntries'),
        el('span', 'mst-ribbon-sep'),
        marks,
        el('span', 'mst-ribbon-sep'),
        command('Rename', 'fa-solid fa-i-cursor', '#world_popup_name_button'),
        command('Save a copy', 'fa-regular fa-copy', '#world_duplicate'),
        command('Download', 'fa-solid fa-download', '#world_popup_export'),
        command('Delete', 'fa-regular fa-trash-can', '#world_popup_delete'),
    );
    ribbon.append(tabs, commands);
    const entries = document.getElementById('world_popup_entries_list');
    const pickRow = document.getElementById('world_create_button')?.parentElement;
    const findRow = document.getElementById('world_info_search')?.parentElement;
    pickRow?.classList.add('mst-wi-pickrow');
    findRow?.classList.add('mst-wi-findrow');
    (findRow ?? entries)?.before(ribbon);

    // a note on the empty page, until a document is open
    const blank = el('div', 'mst-doc-blank');
    blank.append(el('span', 'mst-doc-icon mst-doc-icon-big', 'W'), el('h2', '', t('Open a document')), el('p', '', t('Pick one from My files, or create a new one.')));
    entries?.before(blank);

    const select = document.querySelector(WORLD_SELECT);
    const render = () => {
        renderDocuments(list, docTitle);
        here.textContent = docTitle.textContent;
    };
    if (select) {
        new MutationObserver(render).observe(select, { childList: true });
        select.addEventListener('change', render);
        const $ = /** @type {any} */ (window).jQuery;
        $?.(select).on('change', render);
    }
    render();
}

/* Copilot ------------------------------------------------------------------------------- */

function buildCopilot() {
    const drawer = document.getElementById('user-settings-block');
    if (!drawer) {
        return;
    }
    header(drawer, 'Copilot', [toolButton('New chat', 'compose', () => {
        prompt.value = '';
        sync();
    })]);
    const intro = el('div', 'mst-copilot-intro');
    const logo = el('span', 'mst-copilot-logo');
    const hello = el('h2', 'mst-copilot-hello');
    const sub = el('p', 'mst-copilot-sub', t('Ask me to find a setting, or browse them below.'));
    const box = el('label', 'mst-copilot-box');
    const prompt = el('input');
    prompt.type = 'text';
    prompt.placeholder = t('Message Copilot');
    const send = fluentIcon('send', 18);
    box.append(prompt, send);
    // the prompt box is SillyTavern's settings search
    const sync = () => {
        const search = /** @type {HTMLTextAreaElement} */ (document.getElementById('settingsSearch'));
        if (search) {
            search.value = prompt.value;
            search.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    prompt.addEventListener('input', sync);
    intro.append(logo, hello, sub, box);
    drawer.querySelector('.mst-app-header')?.after(intro);
    refreshCopilotGreeting();
}

export function refreshCopilotGreeting() {
    const hello = document.querySelector('.mst-copilot-hello');
    if (hello) {
        const name = SillyTavern.getContext().name1 || '';
        hello.textContent = name ? `${t('Hi')} ${name.split(/\s+/)[0]}, ${t('how can I help?')}` : t('How can I help?');
    }
}

/* Apps ---------------------------------------------------------------------------------- */

function buildApps() {
    const drawer = document.getElementById('rm_extensions_block');
    if (!drawer) {
        return;
    }
    const search = el('label', 'mst-search mst-app-search');
    search.append(fluentIcon('search', 16));
    const input = el('input');
    input.type = 'search';
    input.placeholder = t('Search apps');
    input.addEventListener('input', () => {
        const needle = input.value.trim().toLowerCase();
        for (const card of drawer.querySelectorAll(':is(.extension_container, #extensions_settings, #extensions_settings2) > :not(.extension_container)')) {
            card.classList.toggle('mst-hidden-app', !!needle && !card.textContent.toLowerCase().includes(needle));
        }
    });
    search.append(input);
    header(drawer, 'Apps', [], [search]);

    const nav = el('nav', 'mst-stage mst-store-nav');
    const item = (label, icon, onClick, active = false) => {
        const button = el('button', `mst-store-link${active ? ' mst-store-active' : ''}`);
        button.type = 'button';
        button.append(fluentIcon(icon, 18), el('span', '', t(label)));
        button.addEventListener('click', onClick);
        return button;
    };
    nav.append(
        item('Apps', 'apps', () => drawer.scrollTo({ top: 0, behavior: 'smooth' }), true),
        item('Manage your apps', 'gear', () => click('#extensions_details')),
        item('Get more apps', 'arrow-down', () => click('#third_party_extension_button')),
    );
    drawer.append(nav);
}

/* Activity ------------------------------------------------------------------------------ */

function buildActivity() {
    const drawer = document.getElementById('left-nav-panel');
    if (!drawer) {
        return;
    }
    const feed = toolButton('Feed', 'chevron-down', () => {});
    feed.classList.add('mst-tool-flip');
    header(drawer, 'Activity', [toolButton('', 'filter', () => {})], [feed]);
}

export function initApps() {
    for (const build of [buildActivity, buildCalendar, buildCalls, buildOneDrive, buildCopilot, buildApps]) {
        try {
            build();
        } catch (error) {
            console.error('[MS Teams] Could not dress a rail app', error);
        }
    }
}
