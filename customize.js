// Customize: every part of the theme can be changed from one page, live. Each option is a CSS
// custom property on body.ms-teams (set inline, so it wins over both Light and Dark), or a flag
// that shows or hides a part of the frame. Everything lives in one object in the extension's
// settings, layered on the chosen appearance:
//   customize = { version: 1, tokens: { '--mst-brand': '#…', … }, flags: { hideSearch: true, … }, css: '' }
// Export and Import use the same object plus themeId, so a look can move between installs.

const VERSION = 1;
const THEME_ID = 'msteams';
const CSS_ID = 'mst-custom-css';

const FONTS = [
    ['', 'Segoe UI (Teams)'],
    ['system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'System'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['Verdana, Geneva, sans-serif', 'Verdana'],
    ['Georgia, "Times New Roman", serif', 'Georgia'],
    ['"Courier New", Menlo, Consolas, monospace', 'Monospace'],
];

/**
 * The page's sections in order. Items are tokens (type color, size, select, font, image, css)
 * or flags (type flag: a body class mst-x-<name>).
 */
const SECTIONS = [
    {
        id: 'colors', title: 'Colors', items: [
            { token: '--mst-brand', label: 'Accent', type: 'color' },
            { token: '--mst-brand-hover', label: 'Accent (hover)', type: 'color' },
            { token: '--mst-brand-fg', label: 'Accent text and icons', type: 'color' },
            { token: '--mst-brand-soft', label: 'Selected background', type: 'color' },
            { token: '--mst-on-brand', label: 'Text on accent', type: 'color' },
            { token: '--mst-shell', label: 'Window frame', type: 'color' },
            { token: '--mst-list', label: 'Side panels', type: 'color' },
            { token: '--mst-canvas', label: 'Main area', type: 'color' },
            { token: '--mst-card', label: 'Cards', type: 'color' },
            { token: '--mst-raised', label: 'Menus and dialogs', type: 'color' },
            { token: '--mst-hover', label: 'Hovered rows', type: 'color' },
            { token: '--mst-input', label: 'Text boxes', type: 'color' },
            { token: '--mst-fg', label: 'Text', type: 'color' },
            { token: '--mst-fg-2', label: 'Secondary text', type: 'color' },
            { token: '--mst-fg-3', label: 'Muted text', type: 'color' },
            { token: '--mst-fg-4', label: 'Faint text', type: 'color' },
            { token: '--mst-stroke', label: 'Borders', type: 'color' },
            { token: '--mst-stroke-2', label: 'Dividers', type: 'color' },
            { token: '--mst-available', label: 'Available', type: 'color' },
            { token: '--mst-danger', label: 'Alerts and errors', type: 'color' },
            { token: '--mst-warning', label: 'Warnings', type: 'color' },
            { token: '--mst-success', label: 'Success', type: 'color' },
        ],
    },
    {
        id: 'text', title: 'Text', items: [
            { token: '--mst-font', label: 'Font', type: 'font' },
            { token: '--mst-text', label: 'Body text', type: 'size', min: 11, max: 20 },
            { token: '--mst-text-sm', label: 'Small text', type: 'size', min: 9, max: 18 },
            { token: '--mst-text-xs', label: 'Tiny text', type: 'size', min: 8, max: 14 },
            { token: '--mst-text-md', label: 'Headings', type: 'size', min: 12, max: 24 },
            { token: '--mst-text-lg', label: 'Page titles', type: 'size', min: 14, max: 32 },
        ],
    },
    {
        id: 'shape', title: 'Shape', items: [
            { token: '--mst-radius-sm', label: 'Small corners', type: 'size', min: 0, max: 12 },
            { token: '--mst-radius', label: 'Buttons and fields', type: 'size', min: 0, max: 16 },
            { token: '--mst-radius-md', label: 'Cards', type: 'size', min: 0, max: 20 },
            { token: '--mst-radius-lg', label: 'Panels and dialogs', type: 'size', min: 0, max: 24 },
            { token: '--mst-radius-xl', label: 'Large tiles', type: 'size', min: 0, max: 32 },
            { token: '--mst-bubble-radius', label: 'Message bubbles', type: 'size', min: 0, max: 24 },
            {
                token: '--mst-avatar-radius', label: 'Pictures in messages', type: 'select',
                options: [['50%', 'Circle'], ['25%', 'Rounded square'], ['4px', 'Square']],
            },
        ],
    },
    {
        id: 'spacing', title: 'Spacing', items: [
            { token: '--mst-titlebar-h', label: 'Title bar height', type: 'size', min: 36, max: 72 },
            { token: '--mst-rail-w', label: 'App rail width', type: 'size', min: 48, max: 100 },
            { token: '--mst-list-w', label: 'Chat list width', type: 'size', min: 220, max: 480 },
            { token: '--mst-head-h', label: 'Chat header height', type: 'size', min: 40, max: 80 },
            { token: '--mst-chat-pad', label: 'Chat side margins', type: 'size', min: 0, max: 80 },
            { token: '--mst-mes-gap', label: 'Space between messages', type: 'size', min: 0, max: 24 },
            { token: '--mst-bubble-pad-y', label: 'Bubble padding (top and bottom)', type: 'size', min: 2, max: 24 },
            { token: '--mst-bubble-pad-x', label: 'Bubble padding (sides)', type: 'size', min: 4, max: 32 },
        ],
    },
    {
        id: 'layout', title: 'Layout', items: [
            { flag: 'hideLauncher', label: 'Hide the app launcher (9 dots)', type: 'flag' },
            { flag: 'hideNav', label: 'Hide back and forward', type: 'flag' },
            { flag: 'hideSearch', label: 'Hide search', type: 'flag' },
            { flag: 'hideMe', label: 'Hide your picture in the title bar', type: 'flag' },
            { flag: 'hideFavorites', label: 'Hide Favorites in the chat list', type: 'flag' },
            { flag: 'hideTeams', label: 'Hide Teams and channels in the chat list', type: 'flag' },
            { flag: 'hidePreviews', label: 'Hide message previews in the chat list', type: 'flag' },
            { flag: 'hideTabs', label: 'Hide the Chat and Shared tabs', type: 'flag' },
            { flag: 'hideCalls', label: 'Hide the video and call buttons', type: 'flag' },
            { flag: 'hideEmoji', label: 'Hide the emoji button in the message box (extensions menu)', type: 'flag' },
            { flag: 'hidePlus', label: 'Hide the + button in the message box (chat options)', type: 'flag' },
        ],
    },
    {
        id: 'messages', title: 'Messages', items: [
            { token: '--mst-bubble-in', label: 'Their bubbles', type: 'color' },
            { token: '--mst-bubble-out', label: 'Your bubbles', type: 'color' },
            { token: '--mst-mes-em', label: 'Actions (italics)', type: 'color' },
            { token: '--mst-mes-quote', label: 'Quotes', type: 'color' },
            { token: '--mst-mes-text', label: 'Message text', type: 'size', min: 11, max: 24 },
            { token: '--mst-mes-line', label: 'Line height', type: 'size', min: 14, max: 36 },
            { token: '--mst-mes-avatar', label: 'Picture size', type: 'size', min: 20, max: 64 },
            { token: '--mst-bubble-max', label: 'Bubble width', type: 'size', unit: '%', min: 40, max: 100 },
            { flag: 'hideAvatars', label: 'Hide pictures beside messages', type: 'flag' },
            { flag: 'hideNames', label: 'Hide names', type: 'flag' },
            { flag: 'hideTimes', label: 'Hide times', type: 'flag' },
            { flag: 'hideSwipes', label: 'Hide the reply pager (swipes)', type: 'flag' },
        ],
    },
    {
        id: 'background', title: 'Chat background', items: [
            { token: '--mst-chat-bg', label: 'Color', type: 'color' },
            { token: '--mst-chat-bg-image', label: 'Picture (web address)', type: 'image' },
            {
                token: '--mst-chat-bg-size', label: 'Picture fit', type: 'select',
                options: [['cover', 'Fill'], ['contain', 'Fit'], ['auto', 'Actual size']],
            },
            { token: '--mst-chat-bg-dim', label: 'Fade the picture', type: 'size', unit: '%', min: 0, max: 100 },
        ],
    },
    {
        id: 'motion', title: 'Motion', items: [
            { token: '--mst-fast', label: 'Quick transitions', type: 'size', unit: 'ms', min: 0, max: 500, step: 10 },
            { token: '--mst-normal', label: 'Transitions', type: 'size', unit: 'ms', min: 0, max: 800, step: 10 },
            { flag: 'noMotion', label: 'Turn off animations', type: 'flag' },
        ],
    },
    {
        id: 'advanced', title: 'Advanced', items: [
            { css: true, label: 'Custom CSS', type: 'css' },
        ],
    },
];

const FLAGS = SECTIONS.flatMap(s => s.items.filter(i => i.flag).map(i => i.flag));
const TOKENS = SECTIONS.flatMap(s => s.items.filter(i => i.token).map(i => i.token));

/** Tokens set on the body by the last apply, so they can be taken off again */
let applied = [];

function t(text) {
    return SillyTavern.getContext().translate(text);
}

export function emptyCustomize() {
    return { version: VERSION, tokens: {}, flags: {}, css: '' };
}

/** The stored object, repaired if it's missing parts (older settings, hand edits). */
export function normalizeCustomize(value) {
    const result = emptyCustomize();
    if (!value || typeof value !== 'object') {
        return result;
    }
    for (const [key, val] of Object.entries(value.tokens ?? {})) {
        if (TOKENS.includes(key) && typeof val === 'string' && val.trim()) {
            result.tokens[key] = val.trim();
        }
    }
    for (const [key, val] of Object.entries(value.flags ?? {})) {
        if (FLAGS.includes(key) && val === true) {
            result.flags[key] = true;
        }
    }
    result.css = typeof value.css === 'string' ? value.css : '';
    return result;
}

/** Puts the customization on the page (or takes it off when the theme is off). */
export function applyCustomize(customize, enabled) {
    const body = document.body;
    for (const token of applied) {
        body.style.removeProperty(token);
    }
    applied = [];
    for (const flag of FLAGS) {
        body.classList.toggle(`mst-x-${flag}`, !!enabled && !!customize?.flags?.[flag]);
    }
    let style = document.getElementById(CSS_ID);
    if (!enabled || !customize) {
        style?.remove();
        return;
    }
    for (const [token, value] of Object.entries(customize.tokens)) {
        body.style.setProperty(token, value);
        applied.push(token);
    }
    const css = customize.css.trim();
    if (css) {
        if (!style) {
            style = document.createElement('style');
            style.id = CSS_ID;
            document.head.append(style);
        }
        // nested under the theme's class, so the rules only apply while it's on
        style.textContent = `body.ms-teams {\n${css}\n}`;
    } else {
        style?.remove();
    }
}

/** A CSS color as #rrggbb, for the color picker. */
function toHex(value) {
    const probe = document.createElement('span');
    probe.style.color = value;
    probe.style.display = 'none';
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    const parts = rgb.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    return '#' + parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
}

/** The value the base appearance gives a token, without any customization on top. */
function baseValue(token) {
    const body = document.body;
    const own = body.style.getPropertyValue(token);
    body.style.removeProperty(token);
    const value = getComputedStyle(body).getPropertyValue(token).trim();
    if (own) {
        body.style.setProperty(token, own);
    }
    return value;
}

function currentValue(customize, token) {
    return customize.tokens[token] ?? baseValue(token);
}

function imageUrl(value) {
    const match = String(value ?? '').match(/^url\("(.*)"\)$/);
    return match ? match[1].replace(/\\"/g, '"') : '';
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

/** A small Teams window drawn with the same tokens, so every change shows up at once. */
function buildPreview() {
    const preview = el('div', 'mst-cz-preview');
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = `
        <div class="mst-pv-title">
            <span class="mst-pv-dots"></span>
            <span class="mst-pv-search">Search</span>
            <span class="mst-pv-me">TR</span>
        </div>
        <div class="mst-pv-body">
            <div class="mst-pv-rail">
                <span class="mst-pv-app"></span><span class="mst-pv-app"></span><span class="mst-pv-app mst-pv-on"></span><span class="mst-pv-app"></span>
            </div>
            <div class="mst-pv-list">
                <div class="mst-pv-list-head">Chat</div>
                <div class="mst-pv-row mst-pv-sel"><span class="mst-pv-av">AM</span><span><b>Alex Morgan</b><small>See you at the review</small></span></div>
                <div class="mst-pv-row"><span class="mst-pv-av mst-pv-av2">PS</span><span><b>Priya Shah</b><small>Thanks!</small></span></div>
            </div>
            <div class="mst-pv-chat">
                <div class="mst-pv-head"><span class="mst-pv-av">AM</span><b>Alex Morgan</b><span class="mst-pv-tab">Chat</span></div>
                <div class="mst-pv-messages">
                    <div class="mst-pv-mes">
                        <span class="mst-pv-av mst-pv-mes-av">AM</span>
                        <div class="mst-pv-bubble"><div class="mst-pv-meta"><span class="mst-pv-name">Alex Morgan</span> <span class="mst-pv-time">10:42 AM</span></div><span class="mst-pv-text"><i>waves</i> Morning! <q>Ready for the review?</q></span></div>
                    </div>
                    <div class="mst-pv-mes mst-pv-mine">
                        <div class="mst-pv-bubble"><div class="mst-pv-meta"><span class="mst-pv-time">10:43 AM</span></div><span class="mst-pv-text">Yes, joining in five minutes.</span></div>
                    </div>
                </div>
                <div class="mst-pv-compose">Type a message <span class="mst-pv-send"></span></div>
            </div>
        </div>`;
    return preview;
}

/**
 * Opens the Customize page.
 * @param {object} options
 * @param {() => object} options.get The stored customization (live object)
 * @param {(value: object) => void} options.set Replaces it
 * @param {() => void} options.changed Apply and save
 */
export async function openCustomize({ get, set, changed }) {
    const { callGenericPopup, POPUP_TYPE } = SillyTavern.getContext();
    const page = el('div', 'mst-customize');
    const top = el('div', 'mst-cz-top');
    const heading = el('div', 'mst-cz-heading');
    heading.append(el('h3', '', t('Customize theme')));
    const tools = el('div', 'mst-cz-tools');
    const exportButton = el('button', 'menu_button mst-cz-tool', t('Export'));
    const importButton = el('button', 'menu_button mst-cz-tool', t('Import'));
    const resetAll = el('button', 'menu_button mst-cz-tool', t('Reset all'));
    for (const button of [exportButton, importButton, resetAll]) {
        button.type = 'button';
    }
    tools.append(exportButton, importButton, resetAll);
    heading.append(tools);
    top.append(heading, buildPreview());
    page.append(top);

    /** @type {(() => void)[]} */
    const refreshers = [];
    const refreshAll = () => refreshers.forEach(refresh => refresh());
    const commit = () => {
        changed();
        refreshAll();
    };

    for (const section of SECTIONS) {
        const box = el('section', 'mst-cz-section');
        box.dataset.section = section.id;
        const head = el('div', 'mst-cz-section-head');
        head.append(el('h4', '', t(section.title)));
        const reset = el('button', 'menu_button mst-cz-reset', t('Reset section'));
        reset.type = 'button';
        reset.addEventListener('click', () => {
            const customize = get();
            for (const item of section.items) {
                if (item.token) {
                    delete customize.tokens[item.token];
                } else if (item.flag) {
                    delete customize.flags[item.flag];
                } else if (item.css) {
                    customize.css = '';
                }
            }
            commit();
        });
        head.append(reset);
        box.append(head);
        const grid = el('div', 'mst-cz-grid');
        for (const item of section.items) {
            grid.append(buildControl(item, get, commit, refreshers));
        }
        box.append(grid);
        page.append(box);
    }

    exportButton.addEventListener('click', () => {
        const data = { themeId: THEME_ID, ...normalizeCustomize(get()) };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'teams-theme.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) {
                return;
            }
            try {
                const data = JSON.parse(await file.text());
                if (data?.themeId && data.themeId !== THEME_ID) {
                    toastr.warning(t('That file is for a different theme.'));
                    return;
                }
                set(normalizeCustomize(data));
                commit();
                toastr.success(t('Look imported.'));
            } catch {
                toastr.error(t('That file could not be read.'));
            }
        });
        input.click();
    });
    resetAll.addEventListener('click', () => {
        set(emptyCustomize());
        commit();
    });

    refreshAll();
    const shown = callGenericPopup(page, POPUP_TYPE.TEXT, '', { wide: true, large: true, allowVerticalScrolling: true, okButton: t('Done') });
    page.closest('dialog')?.classList.add('mst-cz-dialog');
    await shown;
}

function buildControl(item, get, commit, refreshers) {
    const row = el('div', `mst-cz-row mst-cz-${item.type}`);
    const id = `mst_cz_${(item.token ?? item.flag ?? 'css').replace(/[^a-z0-9]/gi, '_')}`;

    if (item.type === 'flag') {
        const label = el('label', 'checkbox_label');
        label.htmlFor = id;
        const box = /** @type {HTMLInputElement} */ (el('input'));
        box.type = 'checkbox';
        box.id = id;
        box.addEventListener('input', () => {
            const customize = get();
            if (box.checked) {
                customize.flags[item.flag] = true;
            } else {
                delete customize.flags[item.flag];
            }
            commit();
        });
        label.append(box, el('span', '', t(item.label)));
        row.append(label);
        refreshers.push(() => { box.checked = !!get().flags[item.flag]; });
        return row;
    }

    if (item.type === 'css') {
        const label = el('label', '', t(item.label));
        label.htmlFor = id;
        const area = /** @type {HTMLTextAreaElement} */ (el('textarea', 'text_pole mst-cz-css'));
        area.id = id;
        area.rows = 8;
        area.spellcheck = false;
        area.placeholder = '#chat .mes_text { letter-spacing: 0.2px; }';
        area.addEventListener('input', () => {
            get().css = area.value;
            commit();
        });
        const note = el('small', 'mst-cz-note', t('Rules apply inside the theme only, and switch off with it.'));
        row.append(label, area, note);
        refreshers.push(() => {
            if (document.activeElement !== area) {
                area.value = get().css;
            }
        });
        return row;
    }

    const label = el('label', 'mst-cz-label', t(item.label));
    label.htmlFor = id;
    const control = el('div', 'mst-cz-control');
    const clear = el('button', 'mst-cz-clear fa-solid fa-rotate-left');
    clear.type = 'button';
    clear.title = t('Back to default');
    clear.addEventListener('click', () => {
        delete get().tokens[item.token];
        commit();
    });
    const setToken = (value) => {
        const customize = get();
        if (value === '' || value === null) {
            delete customize.tokens[item.token];
        } else {
            customize.tokens[item.token] = value;
        }
        commit();
    };
    /** @type {() => void} */
    let refresh;

    if (item.type === 'color') {
        const picker = /** @type {HTMLInputElement} */ (el('input', 'mst-cz-color'));
        picker.type = 'color';
        picker.id = id;
        const text = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text'));
        text.type = 'text';
        text.spellcheck = false;
        picker.addEventListener('input', () => setToken(picker.value));
        text.addEventListener('change', () => {
            const value = text.value.trim();
            if (!value || CSS.supports('color', value)) {
                setToken(value);
            } else {
                refresh();
            }
        });
        control.append(picker, text);
        refresh = () => {
            const value = currentValue(get(), item.token);
            picker.value = toHex(value);
            if (document.activeElement !== text) {
                text.value = value;
            }
        };
    } else if (item.type === 'size') {
        const unit = item.unit ?? 'px';
        const range = /** @type {HTMLInputElement} */ (el('input', 'mst-cz-range'));
        range.type = 'range';
        range.id = id;
        const number = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-number'));
        number.type = 'number';
        for (const input of [range, number]) {
            input.min = String(item.min);
            input.max = String(item.max);
            input.step = String(item.step ?? 1);
        }
        const unitText = el('span', 'mst-cz-unit', unit);
        range.addEventListener('input', () => setToken(`${range.value}${unit}`));
        number.addEventListener('change', () => {
            const value = Number(number.value);
            if (Number.isFinite(value)) {
                setToken(`${value}${unit}`);
            }
        });
        control.append(range, number, unitText);
        refresh = () => {
            const value = parseFloat(currentValue(get(), item.token));
            const shown = Number.isFinite(value) ? value : item.min;
            range.value = String(shown);
            if (document.activeElement !== number) {
                number.value = String(shown);
            }
        };
    } else if (item.type === 'select' || item.type === 'font') {
        const select = /** @type {HTMLSelectElement} */ (el('select', 'text_pole mst-cz-select'));
        select.id = id;
        const options = item.type === 'font' ? FONTS : item.options;
        for (const [value, name] of options) {
            const option = /** @type {HTMLOptionElement} */ (el('option', '', t(name)));
            option.value = value;
            select.append(option);
        }
        control.append(select);
        let custom;
        if (item.type === 'font') {
            const other = /** @type {HTMLOptionElement} */ (el('option', '', t('Another font…')));
            other.value = '__custom';
            select.append(other);
            custom = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text'));
            custom.type = 'text';
            custom.placeholder = t('Font name, e.g. Inter');
            custom.addEventListener('change', () => {
                const name = custom.value.trim().replace(/[;{}]/g, '');
                setToken(name ? `${/\s/.test(name) && !/[,"']/.test(name) ? `"${name}"` : name}, sans-serif` : '');
            });
            control.append(custom);
        }
        select.addEventListener('input', () => {
            if (select.value === '__custom') {
                custom.hidden = false;
                custom.focus();
                return;
            }
            setToken(select.value);
        });
        refresh = () => {
            const stored = get().tokens[item.token];
            if (item.type === 'font') {
                const known = FONTS.some(([value]) => value === (stored ?? ''));
                select.value = known ? (stored ?? '') : '__custom';
                custom.hidden = known;
                if (!known && document.activeElement !== custom) {
                    custom.value = stored.replace(/, sans-serif$/, '').replace(/^"|"$/g, '');
                }
            } else {
                select.value = currentValue(get(), item.token);
            }
        };
    } else if (item.type === 'image') {
        const text = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text mst-cz-url'));
        text.type = 'url';
        text.id = id;
        text.placeholder = 'https://…';
        text.addEventListener('change', () => {
            const url = text.value.trim();
            setToken(url ? `url("${url.replace(/["\\\n]/g, encodeURIComponent)}")` : '');
        });
        control.append(text);
        refresh = () => {
            if (document.activeElement !== text) {
                text.value = imageUrl(get().tokens[item.token]);
            }
        };
    }

    control.append(clear);
    row.append(label, control);
    refreshers.push(() => {
        refresh();
        clear.hidden = !(item.token in get().tokens);
        row.classList.toggle('mst-cz-changed', item.token in get().tokens);
    });
    return row;
}
