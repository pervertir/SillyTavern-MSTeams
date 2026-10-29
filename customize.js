// Customize: every part of the theme can be changed from one page, live. The format is the one
// all our themes share (shared/customize-spec.md), so a look exported from one opens in another
// and keeps whatever this theme understands:
//   customize = { tokens: { '--mst-brand': '#…', … }, flags: { 'hide-search': true, density: 'compact', … }, css: '' }
// Tokens are CSS custom properties, set inline on the body so they sit on top of Light and Dark.
// hide-<part> flags become body classes (mst-x-hide-<part>); the other flags are options that
// set tokens or classes of their own. The custom CSS is nested inside body.ms-teams.

const VERSION = 1;
const THEME_ID = 'msteams';
const CSS_ID = 'mst-custom-css';
const TOKEN_NAME = /^--[a-zA-Z0-9-]+$/;
const BAD_VALUE = /[;{}<>]/;

const FONTS = [
    ['', 'Segoe UI (Teams)'],
    ['system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'System'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['Verdana, Geneva, sans-serif', 'Verdana'],
    ['Georgia, "Times New Roman", serif', 'Georgia'],
    ['"Courier New", Menlo, Consolas, monospace', 'Monospace'],
];

/**
 * The page's sections in order. An item edits a token (token) or a flag (flag), as one of
 * these controls: color, size, select, font, url, check (a true/false flag) or css.
 * Flag items carry their default, which is never stored.
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
            {
                flag: 'avatarShape', label: 'Pictures', type: 'select', default: 'round',
                options: [['round', 'Circle'], ['squircle', 'Rounded square'], ['square', 'Square']],
            },
            { token: '--mst-radius-sm', label: 'Small corners', type: 'size', min: 0, max: 12 },
            { token: '--mst-radius', label: 'Buttons and fields', type: 'size', min: 0, max: 16 },
            { token: '--mst-radius-md', label: 'Cards', type: 'size', min: 0, max: 20 },
            { token: '--mst-radius-lg', label: 'Panels and dialogs', type: 'size', min: 0, max: 24 },
            { token: '--mst-radius-xl', label: 'Large tiles', type: 'size', min: 0, max: 32 },
            { token: '--mst-bubble-radius', label: 'Message bubbles', type: 'size', min: 0, max: 24 },
        ],
    },
    {
        id: 'spacing', title: 'Spacing', items: [
            {
                flag: 'density', label: 'Density', type: 'select', default: 'default',
                options: [['compact', 'Compact'], ['default', 'Default'], ['roomy', 'Roomy']],
            },
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
            { flag: 'hide-launcher', label: 'Hide the app launcher (9 dots)', type: 'check' },
            { flag: 'hide-nav', label: 'Hide back and forward', type: 'check' },
            { flag: 'hide-search', label: 'Hide search', type: 'check' },
            { flag: 'hide-me', label: 'Hide your picture in the title bar', type: 'check' },
            { flag: 'hide-favorites', label: 'Hide Favorites in the chat list', type: 'check' },
            { flag: 'hide-teams', label: 'Hide Teams and channels in the chat list', type: 'check' },
            { flag: 'hide-previews', label: 'Hide message previews in the chat list', type: 'check' },
            { flag: 'hide-tabs', label: 'Hide the Chat and Shared tabs', type: 'check' },
            { flag: 'hide-calls', label: 'Hide the video and call buttons', type: 'check' },
            { flag: 'hide-emoji', label: 'Hide the emoji button in the message box (extensions menu)', type: 'check' },
            { flag: 'hide-plus', label: 'Hide the + button in the message box (chat options)', type: 'check' },
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
            { flag: 'hide-avatars', label: 'Hide pictures beside messages', type: 'check' },
            { flag: 'hide-names', label: 'Hide names', type: 'check' },
            { flag: 'hide-timestamps', label: 'Hide times', type: 'check' },
            { flag: 'hide-swipes', label: 'Hide the reply pager (swipes)', type: 'check' },
        ],
    },
    {
        id: 'background', title: 'Chat Background', items: [
            {
                flag: 'bgMode', label: 'Background', type: 'select', default: 'none',
                options: [['none', 'Theme default'], ['color', 'Color'], ['gradient', 'Gradient'], ['image', 'Picture']],
            },
            { flag: 'bgColor', label: 'Color', type: 'color', default: '#ffffff', when: 'color' },
            { flag: 'bgFrom', label: 'From', type: 'color', default: '#e8ebfa', when: 'gradient' },
            { flag: 'bgTo', label: 'To', type: 'color', default: '#ffffff', when: 'gradient' },
            { flag: 'bgAngle', label: 'Angle', type: 'size', unit: 'deg', min: 0, max: 360, step: 5, default: '180', when: 'gradient' },
            { flag: 'bgImage', label: 'Picture (web address)', type: 'url', default: '', when: 'image' },
            { flag: 'bgDim', label: 'Fade the picture', type: 'size', unit: '%', min: 0, max: 100, default: '0', when: 'image' },
        ],
    },
    {
        id: 'motion', title: 'Motion', items: [
            {
                flag: 'motion', label: 'Animations', type: 'select', default: 'full',
                options: [['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']],
            },
            { token: '--mst-fast', label: 'Quick transitions', type: 'size', unit: 'ms', min: 0, max: 500, step: 10 },
            { token: '--mst-normal', label: 'Transitions', type: 'size', unit: 'ms', min: 0, max: 800, step: 10 },
        ],
    },
    {
        id: 'advanced', title: 'Advanced', items: [
            { css: true, label: 'Custom CSS', type: 'css' },
        ],
    },
];

const ITEMS = SECTIONS.flatMap(s => s.items);
const FLAG_ITEMS = new Map(ITEMS.filter(i => i.flag).map(i => [i.flag, i]));
const HIDE_FLAGS = ITEMS.filter(i => i.type === 'check').map(i => i.flag);
/** Flag names from the first version of this page */
const OLD_FLAGS = {
    hideLauncher: 'hide-launcher', hideNav: 'hide-nav', hideSearch: 'hide-search', hideMe: 'hide-me',
    hideFavorites: 'hide-favorites', hideTeams: 'hide-teams', hidePreviews: 'hide-previews', hideTabs: 'hide-tabs',
    hideCalls: 'hide-calls', hideEmoji: 'hide-emoji', hidePlus: 'hide-plus', hideAvatars: 'hide-avatars',
    hideNames: 'hide-names', hideTimes: 'hide-timestamps', hideSwipes: 'hide-swipes',
};
const AVATAR_RADIUS = { squircle: '30%', square: '4px' };
const DENSITY = {
    compact: { '--mst-mes-gap': '2px', '--mst-bubble-pad-y': '5px', '--mst-bubble-pad-x': '12px' },
    roomy: { '--mst-mes-gap': '12px', '--mst-bubble-pad-y': '11px', '--mst-bubble-pad-x': '20px' },
};

/** Tokens set on the body by the last apply, so they can be taken off again */
let applied = [];

function t(text) {
    return SillyTavern.getContext().translate(text);
}

export function emptyCustomize() {
    return { version: VERSION, tokens: {}, flags: {}, css: '' };
}

function validToken(name, value) {
    return TOKEN_NAME.test(name) && typeof value === 'string' && !!value.trim() && !BAD_VALUE.test(value);
}

function validFlag(item, value) {
    if (item.type === 'check') {
        return value === true;
    }
    if (typeof value !== 'string' || BAD_VALUE.test(value) || value === item.default) {
        return false;
    }
    if (item.type === 'select') {
        return item.options.some(([option]) => option === value);
    }
    if (item.type === 'color') {
        return CSS.supports('color', value);
    }
    if (item.type === 'size') {
        return Number.isFinite(Number(value));
    }
    if (item.type === 'url') {
        return /^(https?:\/\/|\/)[^\s"'()\\]+$/.test(value);
    }
    return false;
}

/**
 * The stored object, cleaned: only this theme's valid tokens and the flags it knows are kept
 * (so a file from another of our themes keeps what fits), and nothing that could break CSS.
 */
export function normalizeCustomize(value) {
    const result = emptyCustomize();
    if (!value || typeof value !== 'object') {
        return result;
    }
    for (const [name, val] of Object.entries(value.tokens ?? {})) {
        if (name.startsWith('--mst-') && validToken(name, val)) {
            result.tokens[name] = val.trim();
        }
    }
    for (const [name, val] of Object.entries(value.flags ?? {})) {
        const key = OLD_FLAGS[name] ?? name;
        const item = FLAG_ITEMS.get(key);
        const stored = typeof val === 'number' ? String(val) : val;
        if (item && validFlag(item, stored)) {
            result.flags[key] = stored;
        }
    }
    result.css = typeof value.css === 'string' ? value.css : '';
    return result;
}

function flagValue(customize, name) {
    return customize.flags[name] ?? FLAG_ITEMS.get(name)?.default;
}

/** Tokens the options stand for (pictures' shape, density, chat background). */
function optionTokens(customize) {
    const tokens = {};
    const radius = AVATAR_RADIUS[customize.flags.avatarShape];
    if (radius) {
        tokens['--mst-avatar-radius'] = radius;
    }
    Object.assign(tokens, DENSITY[customize.flags.density] ?? {});
    const mode = customize.flags.bgMode;
    if (mode === 'color') {
        tokens['--mst-chat-bg'] = flagValue(customize, 'bgColor');
    } else if (mode === 'gradient') {
        tokens['--mst-chat-bg-image'] = `linear-gradient(${Number(flagValue(customize, 'bgAngle'))}deg, ${flagValue(customize, 'bgFrom')}, ${flagValue(customize, 'bgTo')})`;
        tokens['--mst-chat-bg-size'] = 'cover';
    } else if (mode === 'image' && customize.flags.bgImage) {
        tokens['--mst-chat-bg-image'] = `url("${customize.flags.bgImage}")`;
        tokens['--mst-chat-bg-dim'] = `${Number(flagValue(customize, 'bgDim'))}%`;
    }
    return tokens;
}

/** Puts the customization on the page (or takes it off when the theme is off). */
export function applyCustomize(customize, enabled) {
    const body = document.body;
    for (const token of applied) {
        body.style.removeProperty(token);
    }
    applied = [];
    const on = !!enabled && !!customize;
    for (const flag of HIDE_FLAGS) {
        body.classList.toggle(`mst-x-${flag}`, on && customize.flags[flag] === true);
    }
    const motion = on ? customize.flags.motion : undefined;
    body.classList.toggle('mst-x-motion-reduced', motion === 'reduced');
    body.classList.toggle('mst-x-motion-off', motion === 'off');
    let style = document.getElementById(CSS_ID);
    if (!on) {
        style?.remove();
        return;
    }
    // options first, so a token set by hand wins over the option it overlaps
    for (const [token, value] of Object.entries({ ...optionTokens(customize), ...customize.tokens })) {
        if (validToken(token, value)) {
            body.style.setProperty(token, value);
            applied.push(token);
        }
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
 * Reads an exported look. Refuses anything that isn't one; a look from another of our themes
 * is taken with a note, keeping what this theme understands.
 * @returns {object|null}
 */
function readLook(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        toastr.error(t('That isn\'t a theme file.'));
        return null;
    }
    if (!data || typeof data !== 'object' || !data.themeId || typeof data.tokens !== 'object') {
        toastr.error(t('That isn\'t a theme file.'));
        return null;
    }
    if (data.themeId !== THEME_ID) {
        toastr.info(t('That look was made for another theme; the options this theme has were kept.'));
    }
    return normalizeCustomize(data);
}

/**
 * Opens the Customize page.
 * @param {object} options
 * @param {() => object} options.get The stored customization (live object)
 * @param {(value: object) => void} options.set Replaces it
 * @param {() => void} options.changed Apply and save
 */
export async function openCustomize({ get, set, changed }) {
    const { callGenericPopup, POPUP_TYPE, POPUP_RESULT } = SillyTavern.getContext();
    const page = el('div', 'mst-customize');
    const top = el('div', 'mst-cz-top');
    const heading = el('div', 'mst-cz-heading');
    heading.append(el('h3', '', t('Customize')));
    const tools = el('div', 'mst-cz-tools');
    const exportButton = el('button', 'menu_button mst-cz-tool', t('Export Theme'));
    const importButton = el('button', 'menu_button mst-cz-tool', t('Import Theme'));
    const resetAll = el('button', 'menu_button mst-cz-tool', t('Reset All'));
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
        const { tokens, flags, css } = normalizeCustomize(get());
        const data = { themeId: THEME_ID, version: VERSION, tokens, flags, css };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'teams-theme.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    importButton.addEventListener('click', async () => {
        // paste the file's text, or leave the box empty and pick the file
        const text = await callGenericPopup(t('Paste a theme file\'s text, or leave this empty to choose the file.'), POPUP_TYPE.INPUT, '', { rows: 6, okButton: t('Import'), cancelButton: t('Cancel') });
        if (text === null || text === false || text === undefined) {
            return;
        }
        const apply = (look) => {
            if (look) {
                set(look);
                commit();
                toastr.success(t('Look imported.'));
            }
        };
        if (String(text).trim()) {
            apply(readLook(String(text)));
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (file) {
                apply(readLook(await file.text()));
            }
        });
        input.click();
    });
    resetAll.addEventListener('click', async () => {
        const answer = await callGenericPopup(t('Put every part of the theme back to how it was?'), POPUP_TYPE.CONFIRM, '', { okButton: t('Reset All'), cancelButton: t('Cancel') });
        if (answer === POPUP_RESULT.AFFIRMATIVE) {
            set(emptyCustomize());
            commit();
        }
    });

    refreshAll();
    const shown = callGenericPopup(page, POPUP_TYPE.TEXT, '', { wide: true, large: true, allowVerticalScrolling: true, okButton: t('Done') });
    page.closest('dialog')?.classList.add('mst-cz-dialog');
    await shown;
}

function buildControl(item, get, commit, refreshers) {
    const row = el('div', `mst-cz-row mst-cz-${item.type}`);
    const id = `mst_cz_${(item.token ?? item.flag ?? 'css').replace(/[^a-z0-9]/gi, '_')}`;
    const isFlag = !!item.flag;

    /** What's stored for this item, or undefined */
    const stored = () => (isFlag ? get().flags[item.flag] : get().tokens[item.token]);
    /** What it shows: the stored value, or the default (the flag's, or the base theme's) */
    const shown = () => stored() ?? (isFlag ? item.default : baseValue(item.token));
    const store = (value) => {
        const customize = get();
        const bag = isFlag ? customize.flags : customize.tokens;
        const key = isFlag ? item.flag : item.token;
        if (value === '' || value === null || value === undefined || (isFlag && value === item.default)) {
            delete bag[key];
        } else {
            bag[key] = value;
        }
        commit();
    };

    if (item.type === 'check') {
        const label = el('label', 'checkbox_label');
        label.htmlFor = id;
        const box = /** @type {HTMLInputElement} */ (el('input'));
        box.type = 'checkbox';
        box.id = id;
        box.addEventListener('input', () => store(box.checked ? true : undefined));
        label.append(box, el('span', '', t(item.label)));
        row.append(label);
        refreshers.push(() => { box.checked = stored() === true; });
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
    clear.addEventListener('click', () => store(undefined));
    /** @type {() => void} */
    let refresh;

    if (item.type === 'color') {
        const picker = /** @type {HTMLInputElement} */ (el('input', 'mst-cz-color'));
        picker.type = 'color';
        picker.id = id;
        const text = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text'));
        text.type = 'text';
        text.spellcheck = false;
        picker.addEventListener('input', () => store(picker.value));
        text.addEventListener('change', () => {
            const value = text.value.trim();
            if (!value || (CSS.supports('color', value) && !BAD_VALUE.test(value))) {
                store(value);
            } else {
                refresh();
            }
        });
        control.append(picker, text);
        refresh = () => {
            const value = shown();
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
        // tokens hold CSS ("14px"); flags hold the bare number as a string ("180")
        const write = (value) => store(isFlag ? String(value) : `${value}${unit}`);
        range.addEventListener('input', () => write(range.value));
        number.addEventListener('change', () => {
            const value = Number(number.value);
            if (Number.isFinite(value)) {
                write(value);
            }
        });
        control.append(range, number, el('span', 'mst-cz-unit', unit === 'deg' ? '°' : unit));
        refresh = () => {
            const value = parseFloat(shown());
            const current = Number.isFinite(value) ? value : item.min;
            range.value = String(current);
            if (document.activeElement !== number) {
                number.value = String(current);
            }
        };
    } else if (item.type === 'select') {
        const select = /** @type {HTMLSelectElement} */ (el('select', 'text_pole mst-cz-select'));
        select.id = id;
        for (const [value, name] of item.options) {
            const option = /** @type {HTMLOptionElement} */ (el('option', '', t(name)));
            option.value = value;
            select.append(option);
        }
        select.addEventListener('input', () => store(select.value));
        control.append(select);
        refresh = () => { select.value = shown(); };
    } else if (item.type === 'font') {
        const select = /** @type {HTMLSelectElement} */ (el('select', 'text_pole mst-cz-select'));
        select.id = id;
        for (const [value, name] of [...FONTS, ['__custom', 'Another font…']]) {
            const option = /** @type {HTMLOptionElement} */ (el('option', '', t(name)));
            option.value = value;
            select.append(option);
        }
        const custom = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text'));
        custom.type = 'text';
        custom.placeholder = t('Font name, e.g. Inter');
        custom.addEventListener('change', () => {
            const name = custom.value.trim().replace(/[;{}<>]/g, '');
            store(name ? `${/\s/.test(name) && !/[,"']/.test(name) ? `"${name}"` : name}, sans-serif` : '');
        });
        select.addEventListener('input', () => {
            if (select.value === '__custom') {
                custom.hidden = false;
                custom.focus();
                return;
            }
            store(select.value);
        });
        control.append(select, custom);
        refresh = () => {
            const value = stored() ?? '';
            const known = FONTS.some(([font]) => font === value);
            select.value = known ? value : '__custom';
            custom.hidden = known;
            if (!known && document.activeElement !== custom) {
                custom.value = value.replace(/, sans-serif$/, '').replace(/^"|"$/g, '');
            }
        };
    } else if (item.type === 'url') {
        const text = /** @type {HTMLInputElement} */ (el('input', 'text_pole mst-cz-text mst-cz-url'));
        text.type = 'url';
        text.id = id;
        text.placeholder = 'https://…';
        text.addEventListener('change', () => {
            const url = text.value.trim();
            if (!url || validFlag(item, url)) {
                store(url);
            } else {
                toastr.warning(t('Use a web address starting with https:// (or a path on this site).'));
                refresh();
            }
        });
        control.append(text);
        refresh = () => {
            if (document.activeElement !== text) {
                text.value = stored() ?? '';
            }
        };
    }

    control.append(clear);
    row.append(label, control);
    refreshers.push(() => {
        refresh();
        const changed = stored() !== undefined;
        clear.hidden = !changed;
        row.classList.toggle('mst-cz-changed', changed);
        // background details show only for the background they belong to
        if (item.when) {
            row.hidden = flagValue(get(), 'bgMode') !== item.when;
        }
    });
    return row;
}
