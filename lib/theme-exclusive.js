// One theme at a time. Shared by the Discord, iMessage, Microsoft Teams and Yodayo themes;
// each copies this file unchanged (see theme-exclusive.md).
//
// - Turning one of our themes on turns the others off live (no reload), through their own
//   settings and a window event they listen to. If several are on at load (old settings),
//   the most recently turned on wins.
// - Other theme extensions (Moonlit Echoes and the rest of THIRD_PARTY_THEMES) can't be
//   turned off live: they're added to SillyTavern's disabled extensions and the page reloads once
//   the settings are saved (at most once a minute, so a reload that didn't take never loops).
// - reloadPage() is the one way our themes reload the page (when installed, turned on or
//   updated too), so two themes or two causes never reload it twice.
// - While one of our themes is on, SillyTavern's own UI theme preset and the Custom CSS are
//   paused without changing any saved setting: the Custom CSS style element is switched
//   off (media "not all"), and preset-driven body classes and sizes are held back. Turning the
//   theme off (or its "Pause my Custom CSS and UI theme" setting) puts everything back.
// - It never touches other extensions, never deletes anything, and does nothing when a theme
//   is turned off.
//
// Uses only SillyTavern.getContext(): extensionSettings, powerUserSettings,
// saveSettingsDebounced, translate (if present), and the global toastr.

export const VERSION = 3;

export const EVENT = 'sillytavern-theme-activated';

/** Theme extensions by other authors, by folder name, with a readable name. */
export const THIRD_PARTY_THEMES = {
    'SillyTavern-MoonlitEchoesTheme': 'Moonlit Echoes',
    'SillyTavern-Moonlit-Echoes-Theme': 'Moonlit Echoes',
    'MoonlitEchoesTheme': 'Moonlit Echoes',
    'SillyTavern-Not-A-Discord-Theme': 'Not A Discord Theme',
    'Not-A-Discord-Theme': 'Not A Discord Theme',
    'SillyTavern-Dreamy-Theme': 'Dreamy Theme',
    'SillyTavern-NoAss-Theme': 'NoAss Theme',
    'SillyTavern-ThemeLab': 'Theme Lab',
    'SillyTavern-CustomTheme': 'Custom Theme',
};

/** SillyTavern body classes a UI theme preset turns on, held back while a theme is on. */
export const PRESET_CLASSES = ['bubblechat', 'documentstyle', 'waifuMode', 'big-avatars', 'square-avatars', 'rounded-avatars', 'movingUI'];

/** Preset-driven sizes, put back to SillyTavern's defaults inside the theme. */
export const PRESET_DEFAULTS = {
    '--blurStrength': '10',
    '--shadowWidth': '2',
    '--fontScale': '1',
    '--sheldWidth': '50vw',
};

const CUSTOM_STYLE_ID = 'custom-style';
const PAUSE_STYLE_ID = 'st-theme-exclusive-defaults';

/** State shared by every copy of this file on the page. */
const shared = /** @type {any} */ (globalThis).__stThemeExclusive ??= {
    /** @type {Map<string, any>} */
    themes: new Map(),
    /** ids of the themes that are pausing the user's theme */
    pausing: new Set(),
    /** preset classes taken off the body, to put back */
    held: new Set(),
    observer: null,
    headObserver: null,
    /** a reload is waiting for the settings to be saved */
    reloading: false,
};

function context() {
    return SillyTavern.getContext();
}

function tr(text) {
    return context().translate?.(text) ?? text;
}

/** Whether an extension folder is loaded on this page (its script or stylesheet). */
export function isLoaded(folder) {
    const path = `/extensions/third-party/${folder}/`;
    return !!document.querySelector(`script[src*="${CSS.escape(path)}"], link[href*="${CSS.escape(path)}"]`)
        || [...document.querySelectorAll('script[src], link[href]')].some(x => (x.getAttribute('src') || x.getAttribute('href') || '').includes(path));
}

/** Joins names as "A", "A and B", "A, B and C". */
export function listNames(names) {
    const list = [...new Set(names)];
    if (list.length < 2) {
        return list.join('');
    }
    return `${list.slice(0, -1).join(', ')} ${tr('and')} ${list[list.length - 1]}`;
}

/**
 * The winner among themes that are on: the latest activatedAt; equal (or missing) times go
 * to the id that sorts first, so every copy agrees.
 * @param {{id: string, activatedAt?: number}[]} candidates
 */
export function pickWinner(candidates) {
    return [...candidates].sort((a, b) => (Number(b.activatedAt) || 0) - (Number(a.activatedAt) || 0) || a.id.localeCompare(b.id))[0] ?? null;
}

/* ---------- pausing the user's own UI theme and Custom CSS ---------- */

function powerUser() {
    return context().powerUserSettings ?? {};
}

/** The preset classes SillyTavern's settings want on the body right now. */
function wantedClasses() {
    const p = powerUser();
    const wanted = new Set();
    if (p.chat_display === 1) wanted.add('bubblechat');
    if (p.chat_display === 2) wanted.add('documentstyle');
    if (p.waifuMode) wanted.add('waifuMode');
    if (p.avatar_style === 1) wanted.add('big-avatars');
    if (p.avatar_style === 2) wanted.add('square-avatars');
    if (p.avatar_style === 3) wanted.add('rounded-avatars');
    if (p.movingUI) wanted.add('movingUI');
    return wanted;
}

function holdClasses() {
    for (const name of PRESET_CLASSES) {
        if (document.body.classList.contains(name)) {
            shared.held.add(name);
            document.body.classList.remove(name);
        }
    }
}

function muteCustomCss() {
    const style = document.getElementById(CUSTOM_STYLE_ID);
    if (style && style.getAttribute('media') !== 'not all') {
        style.dataset.stThemeMedia = style.getAttribute('media') ?? '';
        style.setAttribute('media', 'not all');
    }
}

function pauseDefaults() {
    const classes = [...shared.pausing].map(id => shared.themes.get(id)?.bodyClass).filter(Boolean);
    let style = document.getElementById(PAUSE_STYLE_ID);
    if (!style) {
        style = document.createElement('style');
        style.id = PAUSE_STYLE_ID;
        document.head.append(style);
    }
    style.textContent = classes.length
        ? `${classes.map(name => `body.${CSS.escape(name)}`).join(', ')} {\n${Object.entries(PRESET_DEFAULTS).map(([key, value]) => `    ${key}: ${value};`).join('\n')}\n}`
        : '';
}

function startWatching() {
    if (shared.observer) {
        return;
    }
    // SillyTavern re-adds preset classes when a preset is applied, and recreates the Custom
    // CSS element if it goes missing; both are held back again as they appear
    shared.observer = new MutationObserver(() => {
        if (shared.pausing.size) {
            holdClasses();
        }
    });
    shared.observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    shared.headObserver = new MutationObserver(() => {
        if (shared.pausing.size) {
            muteCustomCss();
        }
    });
    shared.headObserver.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['media'] });
}

function stopWatching() {
    shared.observer?.disconnect();
    shared.headObserver?.disconnect();
    shared.observer = null;
    shared.headObserver = null;
}

/** Whether anything of the user's own look is there to pause. */
export function hasUserTheme() {
    const p = powerUser();
    return !!String(p.custom_css ?? '').trim() || wantedClasses().size > 0
        || (Number(p.font_scale) || 1) !== 1 || (p.chat_width !== undefined && Number(p.chat_width) !== 50);
}

function pause(id) {
    shared.pausing.add(id);
    holdClasses();
    muteCustomCss();
    pauseDefaults();
    startWatching();
}

function resume(id) {
    if (!shared.pausing.delete(id)) {
        return;
    }
    pauseDefaults();
    if (shared.pausing.size) {
        return;
    }
    stopWatching();
    // put back what SillyTavern's settings want now (they may have changed meanwhile)
    const wanted = wantedClasses();
    for (const name of new Set([...shared.held, ...wanted])) {
        document.body.classList.toggle(name, wanted.has(name));
    }
    shared.held.clear();
    const style = document.getElementById(CUSTOM_STYLE_ID);
    if (style && style.getAttribute('media') === 'not all') {
        const media = style.dataset.stThemeMedia;
        if (media) {
            style.setAttribute('media', media);
        } else {
            style.removeAttribute('media');
        }
        delete style.dataset.stThemeMedia;
    }
}

/* ---------- turning other themes off ---------- */

/** Our other themes that are on, as registered on this page or found in the settings. */
function othersOn(self) {
    const settings = context().extensionSettings;
    const found = [];
    for (const theme of shared.themes.values()) {
        if (theme.id !== self.id && theme.isEnabled()) {
            found.push({ id: theme.id, name: theme.name, settingsKey: theme.settingsKey, activatedAt: settings[theme.settingsKey]?.activatedAt, live: theme });
        }
    }
    // known themes not registered (yet) on this page, whose extension is loaded
    for (const known of KNOWN_THEMES) {
        if (known.id === self.id || shared.themes.has(known.id) || !isLoaded(known.folder)) {
            continue;
        }
        const own = settings[known.settingsKey];
        if (own?.enabled) {
            found.push({ id: known.id, name: known.name, settingsKey: known.settingsKey, activatedAt: own.activatedAt, live: null });
        }
    }
    return found;
}

/** Our four themes, so one can turn another off even before that one has loaded. */
export const KNOWN_THEMES = [
    { id: 'discord', name: 'Discord', folder: 'SillyTavern-Discord', settingsKey: 'discordTheme', bodyClass: 'discord-theme' },
    { id: 'imessage', name: 'iMessage', folder: 'SillyTavern-iMessage', settingsKey: 'iMessageTheme', bodyClass: 'imessage' },
    { id: 'msteams', name: 'Microsoft Teams', folder: 'SillyTavern-MSTeams', settingsKey: 'msTeamsTheme', bodyClass: 'ms-teams' },
    { id: 'yodayo', name: 'Yodayo Tavern', folder: 'SillyTavern-YodayoTavernTheme', settingsKey: 'yodayoTavernTheme', bodyClass: 'yodayo-tavern' },
];

/** Third-party theme extensions that are loaded and not yet disabled. */
function thirdPartyOn() {
    const disabled = context().extensionSettings.disabledExtensions ?? [];
    return Object.entries(THIRD_PARTY_THEMES)
        .filter(([folder]) => isLoaded(folder) && !disabled.includes(`third-party/${folder}`))
        .map(([folder, name]) => ({ folder, name }));
}

/** sessionStorage key: when one of our themes last reloaded the page by itself, while loading */
const RELOADED_AT_KEY = 'st-theme-reloaded-at';
const RELOAD_GUARD_MS = 60 * 1000;
/** SillyTavern saves settings this long after saveSettingsDebounced() */
const SAVE_DELAY_MS = 1000;

function reloadedRecently() {
    try {
        return Date.now() - (Number(sessionStorage.getItem(RELOADED_AT_KEY)) || 0) < RELOAD_GUARD_MS;
    } catch {
        // storage blocked: treat as never reloaded
        return false;
    }
}

/**
 * Reloads the page once SillyTavern has saved the settings. One reload at a time on the page,
 * however many themes ask for it.
 * @param {string} message Shown while the page reloads, already translated
 * @param {object} [options]
 * @param {boolean} [options.guard] The reload is asked for while the page loads, so it could
 *   repeat on every load: it's skipped if the page reloaded this way within the last minute
 * @param {() => boolean} [options.stillWanted] Checked right before reloading
 * @returns {boolean} Whether a reload is on its way
 */
export function reloadPage(message, { guard = false, stillWanted = () => true } = {}) {
    if (shared.reloading) {
        return true;
    }
    if (guard && reloadedRecently()) {
        return false;
    }
    shared.reloading = true;
    const notice = toast(`${message} ${tr('Reloading…')}`.trim());
    const go = () => {
        shared.reloading = false;
        if (!stillWanted()) {
            notice && toastr.clear(notice);
            return;
        }
        if (guard) {
            try {
                sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
            } catch {
                // the guard is best effort
            }
        }
        location.reload();
    };
    const { eventSource, eventTypes, saveSettingsDebounced } = context();
    if (!eventSource || !eventTypes?.SETTINGS_UPDATED) {
        setTimeout(go, 1500);
        return true;
    }
    // a save already in flight finishes first and doesn't hold the change: wait for the next one
    const since = Date.now();
    const onSaved = () => {
        if (Date.now() - since < SAVE_DELAY_MS - 100) {
            eventSource.once(eventTypes.SETTINGS_UPDATED, onSaved);
            return;
        }
        go();
    };
    eventSource.once(eventTypes.SETTINGS_UPDATED, onSaved);
    saveSettingsDebounced();
    return true;
}

function toast(message) {
    if (typeof toastr === 'undefined') {
        return null;
    }
    const text = message.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return toastr.info(text, '', { timeOut: 8000, extendedTimeOut: 4000, closeButton: true, escapeHtml: false });
}

/** Makes this theme the only one: turns the others off and pauses the user's own theme. */
function takeOver(theme, { announce = true } = {}) {
    const { extensionSettings, saveSettingsDebounced } = context();
    const own = extensionSettings[theme.settingsKey];
    if (own) {
        own.activatedAt = Date.now();
    }
    const offNames = [];
    for (const other of othersOn(theme)) {
        // a theme running on this page turns itself off on the event below (its own
        // disable()); one that isn't running yet is switched off in its settings
        const settings = extensionSettings[other.settingsKey];
        if (!other.live && settings) {
            settings.enabled = false;
        }
        offNames.push(other.name);
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { id: theme.id } }));
    const external = thirdPartyOn();
    if (external.length) {
        extensionSettings.disabledExtensions ??= [];
        for (const { folder } of external) {
            extensionSettings.disabledExtensions.push(`third-party/${folder}`);
        }
        offNames.push(...external.map(x => x.name));
    }
    saveSettingsDebounced();
    theme.changed();
    if (!announce) {
        return;
    }
    const parts = [];
    if (offNames.length) {
        parts.push(tr('Turned off {0} so the themes don\'t clash.').replace('{0}', listNames(offNames)));
    }
    // the pause is mentioned once per theme
    if (theme.pauseUserTheme() && own && !own.pauseNoticeShown && hasUserTheme()) {
        parts.push(tr('Your Custom CSS and UI theme are paused while {0} is on.').replace('{0}', theme.name));
        own.pauseNoticeShown = true;
        saveSettingsDebounced();
    }
    // after a reload that didn't take (the guard), the notice still says what was turned off
    if (!(external.length && reloadPage(parts.join(' '), { guard: true })) && parts.length) {
        toast(parts.join(' '));
    }
}

/**
 * Registers a theme. Call once when the theme loads, after its settings are ready.
 * @param {object} options
 * @param {string} options.id 'discord', 'imessage', 'msteams' or 'yodayo'
 * @param {string} options.name Shown in the notice, e.g. 'Discord'
 * @param {string} options.folder The extension's folder name
 * @param {string} options.settingsKey Its key in extensionSettings
 * @param {string} options.bodyClass The class it puts on the body while on
 * @param {() => boolean} options.isEnabled Whether the theme is on now
 * @param {() => void} options.disable Turns the theme off live: set its enabled setting to
 *   false, apply it, update its toggle and save (another theme turned on)
 * @param {() => boolean} [options.pauseUserTheme] The theme's "Pause my Custom CSS and UI
 *   theme" setting (default on)
 * @returns {{activated: () => void, changed: () => void}} Call activated() when the user
 *   turns the theme on; call changed() after the theme's enabled or pause setting changes
 */
export function registerTheme(options) {
    const theme = {
        pauseUserTheme: () => true,
        ...options,
        changed: () => {
            if (theme.isEnabled() && theme.pauseUserTheme()) {
                pause(theme.id);
            } else {
                resume(theme.id);
            }
        },
    };
    shared.themes.set(theme.id, theme);

    window.addEventListener(EVENT, (event) => {
        const by = /** @type {CustomEvent} */ (event).detail?.id;
        if (by && by !== theme.id && theme.isEnabled()) {
            theme.disable();
        }
        if (by && by !== theme.id) {
            theme.changed();
        }
    });

    if (theme.isEnabled()) {
        const settings = context().extensionSettings;
        const own = settings[theme.settingsKey] ?? {};
        const rivals = othersOn(theme);
        const winner = pickWinner([{ id: theme.id, activatedAt: own.activatedAt }, ...rivals]);
        if (winner && winner.id !== theme.id) {
            // another theme was turned on more recently: this one steps aside
            theme.disable();
            theme.changed();
        } else {
            // first run (never stamped) counts as being turned on
            const firstRun = !own.activatedAt;
            if (rivals.length || thirdPartyOn().length || firstRun) {
                takeOver(theme);
            } else {
                theme.changed();
            }
        }
    }

    return {
        activated: () => takeOver(theme),
        changed: () => theme.changed(),
    };
}
