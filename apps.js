// The rail apps' screens, each dressed as its Teams app while doing its own job:
// Activity (response settings) as the Activity pane, Calendar (API connections) as a
// calendar week with the connection as today's meeting, Calls (formatting) with the dial
// pad, OneDrive (World Info) as My files, Copilot (user settings) with its greeting and a
// prompt box that searches the settings, and Apps (extensions) as the app store.

import { createMonogram, hashName } from './monograms.js';
import { isOn, own } from './own.js';
import { button, click, el, fluentIcon, t } from './util.js';

/** A tool in an app's header: an icon with a label, or an icon alone (title it yourself). */
function toolButton(label, icon, onClick, primary = false) {
    const tool = button(`mst-tool${primary ? ' mst-tool-primary' : ''}`);
    if (icon) {
        tool.append(fluentIcon(icon, 16));
    }
    if (label) {
        tool.title = t(label);
        tool.append(el('span', '', t(label)));
    } else {
        tool.classList.add('mst-tool-icon');
    }
    tool.addEventListener('click', onClick);
    return tool;
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
    drawer.prepend(own(bar));
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

/** A believable work week, Monday to Friday: [start hour, hours, title, where, kind] */
const MEETINGS = [
    [[9.5, 0.25, 'Daily standup', 'Microsoft Teams Meeting'], [11, 1, 'Sprint planning', 'Microsoft Teams Meeting'], [13, 1, 'Lunch', '', 'away'], [15, 0.5, '1:1 with Alex', 'Microsoft Teams Meeting']],
    [[9.5, 0.25, 'Daily standup', 'Microsoft Teams Meeting'], [10, 1, 'Design review', 'Conference Room 4B'], [14, 1.5, 'Focus time', '', 'focus'], [16, 0.5, 'Customer sync', 'Microsoft Teams Meeting', 'tentative']],
    [[9.5, 0.25, 'Daily standup', 'Microsoft Teams Meeting'], [11, 0.5, 'Architecture office hours', 'Microsoft Teams Meeting', 'tentative'], [13, 1, 'Lunch', '', 'away'], [15, 1, 'All hands', 'Town hall', 'event']],
    [[9.5, 0.25, 'Daily standup', 'Microsoft Teams Meeting'], [10, 1.5, 'Focus time', '', 'focus'], [14, 0.5, 'Vendor call', 'Microsoft Teams Meeting', 'tentative'], [16, 1, 'Backlog grooming', 'Microsoft Teams Meeting']],
    [[9.5, 0.25, 'Daily standup', 'Microsoft Teams Meeting'], [11, 1, 'Demo prep', 'Microsoft Teams Meeting'], [14, 1, 'Sprint review', 'Microsoft Teams Meeting'], [16.5, 0.5, 'Weekly wrap-up', 'Microsoft Teams Meeting', 'tentative']],
];

/** Rows are half hours: row 2 is DAY_START. */
function halfHourRow(hour) {
    return Math.round((hour - DAY_START) * 2) + 2;
}

function renderCalendar(stage, monthLabel) {
    const { timestampToMoment } = SillyTavern.getContext();
    const now = timestampToMoment(Date.now());
    const monday = now.clone().startOf('isoWeek').add(weekOffset, 'weeks');
    monthLabel.textContent = monday.format('MMMM YYYY');

    // every cell has its own place, so meetings and the "now" line can sit on top of them
    const place = (element, column, row, span = 1) => {
        element.style.gridColumn = String(column);
        element.style.gridRow = `${row} / span ${span}`;
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
        const row = halfHourRow(hour);
        grid.append(place(el('div', 'mst-cal-hour', now.clone().hour(hour).minute(0).format('LT')), 1, row, 2));
        days.forEach((day, index) => {
            const cell = el('div', 'mst-cal-cell');
            cell.classList.toggle('mst-cal-today', day.isSame(now, 'day'));
            grid.append(place(cell, index + 2, row, 2));
        });
    }

    const todayIndex = days.findIndex(day => day.isSame(now, 'day'));
    // the connection is today's meeting at the current hour, as long as an hour
    const connectionHour = Math.min(Math.max(now.hour(), DAY_START), DAY_END - 1);

    days.forEach((day, index) => {
        for (const [start, length, title, where, kind] of MEETINGS[index]) {
            const isToday = index === todayIndex;
            if (isToday && start < connectionHour + 1 && start + length > connectionHour) {
                continue;
            }
            const meeting = el('div', `mst-cal-event${kind ? ` mst-cal-${kind}` : ''}`);
            meeting.classList.toggle('mst-cal-short', length < 0.5);
            meeting.classList.toggle('mst-cal-past', day.clone().hour(Math.floor(start + length)).minute(((start + length) % 1) * 60).isBefore(now));
            const from = day.clone().hour(Math.floor(start)).minute((start % 1) * 60);
            const to = from.clone().add(length * 60, 'minutes');
            const status = kind === 'tentative' ? `\n${t('Tentative')}` : '';
            meeting.title = `${t(title)}\n${from.format('LT')} – ${to.format('LT')}${where ? `\n${t(where)}` : ''}${status}`;
            meeting.append(el('strong', '', t(title)));
            if (where && length >= 0.5) {
                meeting.append(el('span', '', t(where)));
            }
            grid.append(place(meeting, index + 2, halfHourRow(start), Math.max(1, Math.round(length * 2))));
        }
    });

    if (todayIndex !== -1) {
        const { connected, apiName } = getConnection();
        const event = button(`mst-cal-event mst-cal-connection${connected ? '' : ' mst-cal-event-off'}`);
        event.append(
            el('strong', '', connected ? apiName || t('Connected') : t('Not connected')),
            el('span', '', connected ? t('Connected') : t('Pick an API and connect')),
        );
        event.addEventListener('click', () => {
            document.getElementById('rm_api_block')?.classList.remove('mst-cal-week');
            /** @type {HTMLElement} */ (document.getElementById('main_api'))?.focus();
        });
        grid.append(place(event, todayIndex + 2, halfHourRow(connectionHour), 2));

        // the red line is now, moved along every minute while the calendar is open
        const minutes = now.hour() * 60 + now.minute();
        if (minutes >= DAY_START * 60 && minutes < DAY_END * 60) {
            const line = el('div', 'mst-cal-now');
            line.style.setProperty('--mst-now', String((minutes - DAY_START * 60) / ((DAY_END - DAY_START) * 60)));
            grid.append(place(line, todayIndex + 2, 2, (DAY_END - DAY_START) * 2));
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
    const render = () => isOn() && renderCalendar(stage, month);
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
    // on phones there's room for one view: Work week shows the schedule, New event the settings
    const view = toolButton('Work week', 'calendar', () => {
        drawer.classList.add('mst-cal-week');
        render();
    });
    const add = toolButton('New event', 'add', () => {
        drawer.classList.remove('mst-cal-week');
        /** @type {HTMLElement} */ (document.getElementById('main_api'))?.focus();
    }, true);
    header(drawer, 'API', [view, add], [today, prev, next, month]);
    drawer.append(own(stage));
    render();

    // redraw when the menu opens, so "now" and the connection are current
    document.querySelector('#sys-settings-button > .drawer-toggle')?.addEventListener('click', () => setTimeout(render, 50));
    const status = document.getElementById('API-status-top');
    if (status) {
        new MutationObserver(render).observe(status, { attributes: true, attributeFilter: ['class'] });
    }
    setInterval(() => {
        if (drawer.classList.contains('openDrawer') && isOn()) {
            render();
        }
    }, 60 * 1000);
}

/* Calls --------------------------------------------------------------------------------- */

/** Made-up calls and voicemails for the Calls screen's first two columns */
const CALL_HISTORY = [
    ['Priya Shah', 'in', 0, 9, 42, '12m 08s'],
    ['Daily standup', 'out', 0, 9, 30, '15m 02s'],
    ['Alex Morgan', 'missed', 0, 8, 51, ''],
    ['Jordan Kim', 'out', 1, 16, 20, '4m 37s'],
    ['Taylor Brooks', 'in', 1, 14, 5, '22m 10s'],
    ['Riley Chen', 'missed', 1, 11, 47, ''],
    ['Sam Lee', 'in', 2, 15, 33, '6m 54s'],
    ['Morgan Diaz', 'out', 3, 10, 12, '1m 20s'],
    ['Chris Patel', 'in', 4, 17, 2, '9m 45s'],
];

const VOICEMAILS = [
    ['Riley Chen', 1, 11, 48, '0:42', 'Hi, just checking whether the design review is still on for Thursday. Call me back when you can.'],
    ['Alex Morgan', 0, 8, 52, '0:18', 'Hey, quick one about the launch plan, I’ll send the notes over in chat.'],
    ['Avery Cole', 3, 16, 5, '1:05', 'Following up on the vendor contract, they need a signature by Friday.'],
];

function callRow(name, when, detail, kind) {
    const row = el('div', `mst-call-row${kind === 'missed' ? ' mst-call-missed' : ''}`);
    const avatar = createMonogram(name, 'mst-speed-avatar');
    const text = el('span', 'mst-speed-text');
    const top = el('span', 'mst-call-top');
    top.append(el('span', 'mst-speed-name', name), el('span', 'mst-call-when', when));
    const line = el('span', 'mst-speed-detail');
    if (kind) {
        const icon = fluentIcon(kind === 'out' ? 'arrow-right' : kind === 'missed' ? 'dismiss' : 'arrow-left', 12);
        icon.classList.add('mst-call-dir');
        line.append(icon);
    }
    line.append(document.createTextNode(detail));
    text.append(top, line);
    row.append(avatar, text);
    return row;
}

/** History and Voicemail, as Teams' Calls app shows them */
function buildCallFillers(drawer) {
    const grid = drawer.querySelector(':scope > .flex-container.spaceEvenly');
    if (!grid || grid.querySelector('.mst-call-card')) {
        return;
    }
    const { timestampToMoment } = SillyTavern.getContext();
    const when = (daysAgo, hour, minute) => {
        const time = timestampToMoment(Date.now()).subtract(daysAgo, 'days').hour(hour).minute(minute);
        return daysAgo === 0 ? time.format('LT') : daysAgo === 1 ? t('Yesterday') : time.format('ddd');
    };
    const history = el('section', 'mst-call-card');
    history.append(el('h3', 'mst-call-card-title', t('History')));
    const filters = el('div', 'mst-call-filters');
    ['All', 'Missed', 'Incoming', 'Outgoing'].forEach((label, index) => filters.append(el('span', `mst-call-chip${index === 0 ? ' mst-call-chip-on' : ''}`, t(label))));
    history.append(filters);
    for (const [name, kind, days, hour, minute, length] of CALL_HISTORY) {
        const label = kind === 'missed' ? t('Missed call') : `${kind === 'out' ? t('Outgoing') : t('Incoming')} · ${length}`;
        history.append(callRow(name, when(days, hour, minute), label, kind));
    }
    const voicemail = el('section', 'mst-call-card');
    voicemail.append(el('h3', 'mst-call-card-title', t('Voicemail')));
    for (const [name, days, hour, minute, length, transcript] of VOICEMAILS) {
        const row = callRow(name, when(days, hour, minute), length, '');
        const text = el('p', 'mst-call-transcript', transcript);
        row.querySelector('.mst-speed-text')?.append(text);
        voicemail.append(row);
    }
    grid.prepend(own(history), own(voicemail));
}

function buildCalls() {
    const drawer = document.getElementById('AdvancedFormatting');
    if (!drawer) {
        return;
    }
    header(drawer, 'Response Format', [
        toolButton('Import', 'import', () => click('#af_master_import')),
        toolButton('Export', 'share', () => click('#af_master_export')),
    ]);
    const stage = el('div', 'mst-stage mst-dialpad');
    const number = el('input', 'mst-input');
    number.type = 'text';
    number.placeholder = t('Type a name or number');
    const keys = el('div', 'mst-dial-keys');
    const labels = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
    for (const [digit, letters] of labels) {
        const key = button('mst-dial-key');
        key.append(el('span', 'mst-dial-digit', digit), el('span', 'mst-dial-letters', letters));
        key.addEventListener('click', () => {
            number.value += digit;
        });
        keys.append(key);
    }
    const call = button('mst-tool mst-tool-primary mst-dial-call');
    call.append(fluentIcon('call', 16), el('span', '', t('Call')));
    call.disabled = true;
    number.addEventListener('input', () => {
        call.disabled = !number.value.trim();
    });
    const speed = el('h3', 'mst-dial-section', t('Speed dial'));
    // speed dial: the three formatting groups, as contacts that take you to their card
    const dial = el('div', 'mst-speed-dial');
    const contacts = [
        ['Context Template', '#ContextSettings', 'context'],
        ['Instruct Template', '#InstructSettingsColumn', 'instruct'],
        ['System Prompt', '#SystemPromptColumn', 'system'],
    ];
    // the third column shows the group picked here; Context Template to start
    const pick = (key) => {
        drawer.dataset.mstCall = key;
        dial.querySelectorAll('.mst-speed-contact').forEach(x => x.classList.toggle('mst-speed-on', x.dataset.call === key));
    };
    for (const [name, selector, key] of contacts) {
        const card = /** @type {HTMLElement} */ (drawer.querySelector(selector));
        if (!card) {
            continue;
        }
        const row = button('mst-speed-contact');
        row.dataset.call = key;
        const avatar = createMonogram(name, 'mst-speed-avatar');
        const text = el('span', 'mst-speed-text');
        const detail = el('span', 'mst-speed-detail');
        text.append(el('span', 'mst-speed-name', t(name)), detail);
        // the preset in use, kept current as it changes
        const preset = /** @type {HTMLSelectElement} */ (card.querySelector('select'));
        const showPreset = () => {
            detail.textContent = preset?.selectedOptions?.[0]?.textContent?.trim() ?? '';
        };
        preset?.addEventListener('change', showPreset);
        showPreset();
        row.append(avatar, text, fluentIcon('call', 16));
        row.addEventListener('click', () => {
            showPreset();
            pick(key);
            drawer.scrollTo({ top: 0, behavior: 'smooth' });
            card.classList.remove('mst-flash');
            void card.offsetWidth;
            card.classList.add('mst-flash');
        });
        dial.append(row);
    }
    stage.append(el('h3', 'mst-dial-section', t('Make a call')), number, keys, call, speed, dial);
    pick('context');
    buildCallFillers(drawer);
    drawer.append(own(stage));
}

/* OneDrive ------------------------------------------------------------------------------ */

const WORLD_SELECT = '#world_editor_select';
/** File icons linked from Microsoft's icon CDN (the ones Fluent UI apps use) */
const OFFICE_CDN = 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets';
const WORD_ICON = `${OFFICE_CDN}/brand-icons/product/svg/word_48x1.svg`;
/** The kinds of file a lorebook can pass for in My files; Word most often, as in a real OneDrive */
const FILE_KINDS = [
    { label: 'Word document', icon: WORD_ICON },
    { label: 'Excel workbook', icon: `${OFFICE_CDN}/item-types/48/xlsx.svg` },
    { label: 'Word document', icon: WORD_ICON },
    { label: 'PowerPoint presentation', icon: `${OFFICE_CDN}/item-types/48/pptx.svg` },
    { label: 'Word document', icon: WORD_ICON },
    { label: 'PDF', icon: `${OFFICE_CDN}/item-types/48/pdf.svg` },
    { label: 'Video', icon: `${OFFICE_CDN}/item-types/48/video.svg` },
    { label: 'OneNote notebook', icon: `${OFFICE_CDN}/item-types/48/one.svg` },
];

function wordIcon(className = 'mst-doc-icon', src = WORD_ICON) {
    const icon = el('span', className);
    const img = el('img');
    // a fixed size, so it can never show at full size without the theme's styles
    img.width = img.height = 48;
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    // the theme's own document icon when Microsoft's CDN can't be reached
    img.addEventListener('error', () => icon.replaceChildren(fluentIcon('document', className.includes('mst-doc-icon-big') ? 48 : 24)), { once: true });
    icon.append(img);
    return icon;
}

/** Opens a lorebook the way SillyTavern's own picker does (it's a select2 box). */
function openLorebook(value) {
    const $ = /** @type {any} */ (window).jQuery;
    if ($) {
        $(WORLD_SELECT).val(value).trigger('change');
    }
}

/** The left column: every lorebook as a file (its name picks the kind), the open one highlighted. */
function renderDocuments(list, title) {
    const select = /** @type {HTMLSelectElement} */ (document.querySelector(WORLD_SELECT));
    if (!select) {
        return;
    }
    const items = [...select.options].filter(option => option.value !== '').map((option) => {
        const item = button('mst-doc');
        item.classList.toggle('mst-doc-active', option.selected);
        const kind = FILE_KINDS[hashName(option.textContent.trim()) % FILE_KINDS.length];
        const icon = wordIcon('mst-doc-icon', kind.icon);
        const text = el('span', 'mst-doc-text');
        text.append(el('span', 'mst-doc-name', option.textContent.trim()), el('span', 'mst-doc-kind', t(kind.label)));
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
    header(drawer, 'World Info', [
        toolButton('Add new', 'add', () => click('#world_create_button'), true),
        toolButton('Upload', 'arrow-up', () => click('#world_import_button')),
    ], [crumbs]);

    // My files: the lorebooks as documents
    const stage = el('div', 'mst-stage mst-drive');
    const fresh = button('mst-tool mst-tool-primary mst-drive-new');
    fresh.append(fluentIcon('add', 16), el('span', '', t('New document')));
    fresh.addEventListener('click', () => click('#world_create_button'));
    const list = el('div', 'mst-docs');
    stage.append(el('h3', 'mst-dial-section', t('Documents')), fresh, list);
    drawer.append(own(stage));

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
    const marks = button('mst-ribbon-command mst-ribbon-marks');
    marks.title = t('Show/Hide ¶');
    marks.append(el('i', 'fa-solid fa-paragraph'), el('span', '', t('Entry settings')));
    marks.addEventListener('click', () => {
        const on = drawer.classList.toggle('mst-show-marks');
        marks.classList.toggle('mst-ribbon-on', on);
    });
    const command = (label, icon, selector) => {
        const command = button('mst-ribbon-command');
        command.append(el('i', icon), el('span', '', t(label)));
        command.addEventListener('click', () => click(selector));
        return command;
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
    (findRow ?? entries)?.before(own(ribbon));

    // a note on the empty page, until a document is open
    const blank = el('div', 'mst-doc-blank');
    blank.append(wordIcon('mst-doc-icon mst-doc-icon-big'), el('h2', '', t('Open a document')), el('p', '', t('Pick one from My files, or create a new one.')));
    entries?.before(own(blank));

    const select = document.querySelector(WORLD_SELECT);
    const render = () => {
        if (!isOn()) {
            return;
        }
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

/** Copilot's prompt suggestions, each a settings search */
const COPILOT_PROMPTS = [
    ['Change how chats look', 'Pick a chat style, avatars and a font size', 'Chat Style', 'paint'],
    ['Tune message sending', 'Enter to send, swipes and auto-scroll', 'Enter to Send', 'send'],
    ['Make it easier to read', 'Font scale, chat width and reduced motion', 'Font Scale', 'text'],
    ['Set up notifications', 'Where pop-ups appear and message sounds', 'Notifications', 'bell'],
];

/** The settings' sections as Copilot conversations: each opens on its own, like a chat */
const COPILOT_SECTIONS = [
    { key: 'theme', label: 'UI Theme', icon: 'paint', selector: '#UI-Theme-Block' },
    { key: 'characters', label: 'Character Handling', icon: 'person', selector: '[name="CharacterHandlingToggles"]' },
    { key: 'chat', label: 'Chat/Message Handling', icon: 'chat', selector: '[name="ChatMessageHandlingToggles"]' },
    { key: 'autocomplete', label: 'Autocomplete', icon: 'search', selector: '[name="AutoCompleteToggle"]' },
    { key: 'misc', label: 'Miscellaneous', icon: 'options', selector: '[name="MiscellaneousToggles"]', alsoShow: true },
    { key: 'css', label: 'Custom CSS', icon: 'code', selector: '#CustomCSS-block' },
    { key: 'script', label: 'Script Settings', icon: 'document', selector: '[name="STscriptToggles"]' },
];

function buildCopilot() {
    const drawer = document.getElementById('user-settings-block');
    if (!drawer) {
        return;
    }
    const prompt = /** @type {HTMLInputElement} */ (el('input'));
    /** Back to the greeting: no section open */
    const closeSection = () => {
        delete drawer.dataset.mstShow;
        drawer.querySelectorAll('.mst-cp-hidden, .mst-copilot-thread-on').forEach(x => x.classList.remove('mst-cp-hidden', 'mst-copilot-thread-on'));
    };
    // the prompt box is SillyTavern's settings search
    const ask = (text) => {
        prompt.value = text;
        const search = /** @type {HTMLTextAreaElement} */ (document.getElementById('settingsSearch'));
        if (search) {
            search.value = text;
            search.dispatchEvent(new Event('input', { bubbles: true }));
        }
        drawer.classList.toggle('mst-copilot-asking', !!text.trim());
        if (text.trim() && drawer.dataset.mstShow) {
            closeSection();
        }
    };
    header(drawer, 'User Settings', [toolButton('New chat', 'compose', () => {
        ask('');
        closeSection();
    })]);

    // left: Copilot's conversation list, here the settings' sections
    const nav = el('nav', 'mst-stage mst-copilot-nav');
    const fresh = button('mst-tool mst-copilot-new');
    fresh.append(fluentIcon('compose', 16), el('span', '', t('New chat')));
    nav.append(fresh, el('h3', 'mst-dial-section', t('Recent')));
    const content = document.getElementById('user-settings-block-content');
    const answerTitle = el('h2', 'mst-copilot-answer-title');
    // show one section and hide everything around it, up to the settings' outer box
    const showSection = (section) => {
        content?.querySelectorAll('.mst-cp-hidden').forEach(x => x.classList.remove('mst-cp-hidden'));
        content?.querySelectorAll('.mst-cp-card').forEach(x => x.classList.remove('mst-cp-card'));
        nav.querySelectorAll('.mst-copilot-thread').forEach(x => x.classList.toggle('mst-copilot-thread-on', x.dataset.section === section?.key));
        if (!section) {
            delete drawer.dataset.mstShow;
            return;
        }
        const target = content?.querySelector(section.selector);
        if (!target) {
            return;
        }
        ask('');
        drawer.dataset.mstShow = section.key;
        // the section reads as Copilot's answer: one card
        target.classList.add('mst-cp-card');
        answerTitle.textContent = t(section.label);
        for (let node = target; node && node !== content; node = node.parentElement) {
            for (const sibling of node.parentElement.children) {
                if (sibling !== node) {
                    sibling.classList.add('mst-cp-hidden');
                }
            }
        }
        // Miscellaneous holds Custom CSS, which has its own conversation
        if (section.key === 'misc') {
            content.querySelector('#CustomCSS-block')?.classList.add('mst-cp-hidden');
        }
        drawer.scrollTo({ top: 0 });
    };
    for (const section of COPILOT_SECTIONS) {
        if (!document.querySelector(`#user-settings-block ${section.selector}`)) {
            continue;
        }
        const item = button('mst-copilot-thread');
        item.dataset.section = section.key;
        item.append(fluentIcon(section.icon, 16), el('span', '', t(section.label)));
        item.addEventListener('click', () => showSection(section));
        nav.append(item);
    }
    fresh.addEventListener('click', () => {
        ask('');
        drawer.scrollTo({ top: 0, behavior: 'smooth' });
        showSection(null);
    });
    drawer.append(own(nav));

    // center: the greeting and prompt suggestions
    const intro = el('div', 'mst-copilot-intro');
    const logo = el('span', 'mst-copilot-logo');
    const hello = el('h2', 'mst-copilot-hello');
    const sub = el('p', 'mst-copilot-sub', t('Here are some things I can help you with in your settings.'));
    const cards = el('div', 'mst-copilot-cards');
    for (const [title, detail, query, icon] of COPILOT_PROMPTS) {
        const card = button('mst-copilot-card');
        card.append(fluentIcon(icon, 20), el('strong', '', t(title)), el('span', '', t(detail)));
        card.addEventListener('click', () => ask(query));
        cards.append(card);
    }
    intro.append(logo, hello, sub, cards);
    drawer.querySelector('.mst-app-header')?.after(own(intro));
    const answer = el('div', 'mst-copilot-answer');
    answer.append(el('span', 'mst-copilot-logo mst-copilot-logo-small'), answerTitle);
    intro.after(own(answer));

    // bottom: the "Message Copilot" box, docked like Copilot's
    const dock = el('div', 'mst-copilot-dock');
    const box = el('label', 'mst-copilot-box');
    prompt.type = 'text';
    prompt.placeholder = t('Message Copilot');
    prompt.addEventListener('input', () => ask(prompt.value));
    prompt.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            ask('');
        }
    });
    const send = button('mst-copilot-send');
    send.title = t('Send');
    send.append(fluentIcon('send', 18));
    send.addEventListener('click', () => ask(prompt.value));
    box.append(fluentIcon('plus-circle', 18), prompt, send);
    dock.append(box, el('p', 'mst-copilot-note', t('AI-generated content may be incorrect')));
    drawer.append(own(dock));
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

/** An app's tile icon, picked from words in its name */
const APP_ICONS = [
    [/image|picture|caption|gallery|sd\b|stable diffusion|comfy/i, 'image'],
    [/speech|tts|voice|narrat|audio|sound|rvc/i, 'speaker'],
    [/translat|language/i, 'translate'],
    [/regex|script|code|css/i, 'code'],
    [/summar|memory|note/i, 'document'],
    [/vector|data bank|search|rag/i, 'search'],
    [/quick ?repl|reply|chat|message/i, 'chat'],
    [/expression|character|persona|avatar|live2d|vrm/i, 'person'],
    [/download|asset|import|extension/i, 'import'],
    [/web|internet|browser|url/i, 'globe'],
    [/theme|color|style|teams/i, 'paint'],
    [/background|wallpaper/i, 'image'],
    [/token|count|stat/i, 'options'],
    [/idle|timer|time|objective/i, 'calendar'],
];

const APP_TILE_COLORS = ['#5b5fc7', '#0f6cbd', '#038387', '#107c10', '#c239b3', '#ca5010', '#8764b8', '#d13438', '#4f6bed', '#00666d'];

/** Puts a Teams-style app tile (colored square, white icon) in front of each app's name. */
function decorateApps(drawer) {
    if (!isOn()) {
        return;
    }
    for (const head of drawer.querySelectorAll('.extensions_block .inline-drawer > .inline-drawer-header')) {
        if (head.querySelector(':scope > .mst-app-tile')) {
            continue;
        }
        const name = head.textContent.trim().replace(/\s+/g, ' ');
        const icon = APP_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? 'apps';
        const tile = el('span', 'mst-app-tile');
        tile.style.setProperty('--mst-tile', APP_TILE_COLORS[hashName(name) % APP_TILE_COLORS.length]);
        tile.append(fluentIcon(icon, 20));
        head.prepend(own(tile));
    }
}

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
    header(drawer, 'Extensions', [], [search]);

    const nav = el('nav', 'mst-stage mst-store-nav');
    const item = (label, icon, onClick, active = false) => {
        const link = button(`mst-store-link${active ? ' mst-store-active' : ''}`);
        link.append(fluentIcon(icon, 18), el('span', '', t(label)));
        link.addEventListener('click', onClick);
        return link;
    };
    nav.append(
        item('Extensions', 'apps', () => drawer.scrollTo({ top: 0, behavior: 'smooth' }), true),
        item('Manage your apps', 'gear', () => click('#extensions_details')),
        item('Get more apps', 'arrow-down', () => click('#third_party_extension_button')),
    );
    drawer.append(own(nav));

    // tiles for every app, including ones added after start-up
    decorateApps(drawer);
    document.querySelector('#extensions-settings-button > .drawer-toggle')?.addEventListener('click', () => setTimeout(() => decorateApps(drawer), 50));
    const later = document.getElementById('extensions_settings2');
    if (later) {
        new MutationObserver(() => decorateApps(drawer)).observe(later, { childList: true });
    }
}

/* Activity ------------------------------------------------------------------------------ */

function buildActivity() {
    const drawer = document.getElementById('left-nav-panel');
    if (!drawer) {
        return;
    }
    const feed = toolButton('Feed', 'chevron-down', () => {});
    feed.classList.add('mst-tool-flip');
    header(drawer, 'AI Config', [toolButton('', 'filter', () => {})], [feed]);
}

/* People, Profiles and Background effects (the menus under More) ------------------------- */

/** A search box in the app header that types into one of SillyTavern's own search fields. */
function proxySearch(placeholder, targetId) {
    const search = el('label', 'mst-search mst-app-search');
    search.append(fluentIcon('search', 16));
    const input = el('input');
    input.type = 'search';
    input.placeholder = t(placeholder);
    input.addEventListener('input', () => {
        const target = /** @type {HTMLInputElement} */ (document.getElementById(targetId));
        if (target) {
            target.value = input.value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    search.append(input);
    return search;
}

/**
 * Endless scroll for one of SillyTavern's paged lists: the pager stays hidden on page 1, and
 * its page size steps up to the next option whenever the list nears its end.
 * @param {HTMLElement} drawer The panel the list scrolls in
 * @param {string} pagerSelector SillyTavern's pagination container
 */
function endlessScroll(drawer, pagerSelector) {
    let busy = false;
    const total = (pager) => {
        const numbers = (pager.querySelector('.paginationjs-nav')?.textContent ?? '').match(/\d+/g);
        return numbers ? { first: Number(numbers[0]), last: Number(numbers[numbers.length - 1]) } : null;
    };
    const check = () => {
        const pager = /** @type {HTMLElement} */ (document.querySelector(pagerSelector));
        const select = /** @type {HTMLSelectElement} */ (pager?.querySelector('select'));
        if (busy || !pager || !select || !isOn() || !drawer.classList.contains('openDrawer')) {
            return;
        }
        const $ = /** @type {any} */ (window).jQuery;
        const counts = total(pager);
        if (counts && counts.first > 1 && $) {
            $(pager).pagination('go', 1);
            return;
        }
        // the list's scrolling box is whichever ancestor actually scrolls
        const scrollers = [];
        for (let node = drawer.querySelector('.mst-endless') ?? drawer; node; node = node.parentElement) {
            if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
                scrollers.push(node);
            }
            if (node === drawer) {
                break;
            }
        }
        const nearEnd = !scrollers.length || scrollers.some(node => node.scrollTop + node.clientHeight > node.scrollHeight - 400);
        const shown = Number(select.value);
        if (!nearEnd || !counts || shown >= counts.last) {
            return;
        }
        const next = [...select.options].map(option => Number(option.value)).filter(size => size > shown).sort((a, b) => a - b)[0];
        if (!next) {
            return;
        }
        busy = true;
        const positions = scrollers.map(node => [node, node.scrollTop]);
        select.value = String(next);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        // SillyTavern scrolls a reprinted list back to the top; keep the reader's place
        const restore = () => positions.forEach(([node, top]) => { node.scrollTop = top; });
        setTimeout(restore, 30);
        setTimeout(() => {
            restore();
            busy = false;
            check();
        }, 250);
    };
    // at most one check per frame, however fast the list scrolls
    let queued = false;
    drawer.addEventListener('scroll', () => {
        if (!queued) {
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                check();
            });
        }
    }, { capture: true, passive: true });
    new MutationObserver(() => setTimeout(check, 50)).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, () => setTimeout(check, 50));
}

function buildPeople() {
    const drawer = document.getElementById('right-nav-panel');
    if (!drawer) {
        return;
    }
    header(drawer, 'Characters', [
        toolButton('', 'person-add', () => click('#rm_button_create')),
        toolButton('', 'arrow-down', () => click('#character_import_button')),
        toolButton('New group', 'people-add', () => click('#rm_button_group_chats'), true),
    ], [proxySearch('Search people', 'character_search_bar')]);
    const [add, importer] = drawer.querySelectorAll('.mst-app-header .mst-tool-icon');
    add.title = t('Add contact');
    importer.title = t('Import contact');
    // Teams' back arrow before the title while a contact or group is open (SillyTavern's own
    // way back is a list icon, hidden here); it returns to the list
    const back = toolButton('', 'arrow-left', () => click('#rm_button_characters'));
    back.classList.add('mst-people-back');
    back.title = t('Back');
    back.setAttribute('aria-label', t('Back'));
    drawer.querySelector('.mst-app-header')?.prepend(back);

    // a new group: SillyTavern's save is a small check mark; the styles make it a labelled
    // Create button, Enter in the name creates it, and a note says what comes after
    const note = el('p', 'mst-group-note', t('Add a scenario and other group settings once the group is created.'));
    document.getElementById('GroupFavDelOkBack')?.after(own(note));
    document.getElementById('rm_group_chat_name')?.addEventListener('keydown', (event) => {
        const submit = /** @type {HTMLElement|null} */ (document.getElementById('rm_group_submit'));
        if (isOn() && event.key === 'Enter' && !event.isComposing && submit && submit.offsetParent) {
            event.preventDefault();
            submit.click();
        }
    });
    document.getElementById('rm_print_characters_block')?.classList.add('mst-endless');
    endlessScroll(drawer, '#rm_print_characters_pagination');
}

function buildProfiles() {
    const drawer = document.getElementById('PersonaManagement');
    if (!drawer) {
        return;
    }
    header(drawer, 'Persona', [
        toolButton('Usage stats', 'info', () => click('#PersonaManagement .user_stats_button')),
        toolButton('Back up', 'arrow-down', () => click('#personas_backup')),
        toolButton('Restore', 'arrow-up', () => click('#personas_restore')),
        toolButton('New profile', 'person-add', () => click('#create_dummy_persona'), true),
    ], [proxySearch('Search profiles', 'persona_search_bar')]);
    document.getElementById('user_avatar_block')?.classList.add('mst-endless');
    endlessScroll(drawer, '#persona_pagination_container');
}

function buildBackgrounds() {
    const drawer = document.getElementById('Backgrounds');
    if (!drawer) {
        return;
    }
    header(drawer, 'Backgrounds', [
        toolButton('Add new', 'add', () => click('#add_background_button_top'), true),
    ], [proxySearch('Search backgrounds', 'bg-filter')]);
}

export function initApps() {
    for (const build of [buildActivity, buildCalendar, buildCalls, buildOneDrive, buildCopilot, buildApps, buildPeople, buildProfiles, buildBackgrounds]) {
        try {
            build();
        } catch (error) {
            console.error('[MS Teams] Could not dress a rail app', error);
        }
    }
}
