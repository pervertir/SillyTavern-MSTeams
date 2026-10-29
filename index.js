// Microsoft Teams theme: toggles the scoped styles in style.css, builds the Teams frame
// (title bar, app rail, chat list, chat header) and exposes a small settings panel.

import { initApps, refreshCopilotGreeting } from './apps.js';
import { initChatList, markCurrentChat, scheduleRefresh, travel } from './chatlist.js';
import { applyCustomize, emptyCustomize, normalizeCustomize, openCustomize } from './customize.js';
import { refreshTitle, setDisguise } from './disguise.js';
import { registerTheme } from './lib/theme-exclusive.js';
import { initMonograms, monogramizeMessages } from './monograms.js';
import { isOn, parkOwned, restoreOwned } from './own.js';
import { initShortcuts } from './shortcuts.js';
import { focusSearch, initShell, refreshDrawerState, refreshHeader, refreshNavigation, refreshPersona, refreshRailToggle, setRailTooltips, startNewChat } from './shell.js';
import { initTimes, labelMessages } from './times.js';
import { isPhone } from './util.js';

const MODULE_NAME = 'msTeamsTheme';
/** Folder path under scripts/extensions/, e.g. third-party/SillyTavern-MSTeams */
const EXTENSION_FOLDER = new URL('.', import.meta.url).pathname
    .replace(/^.*\/scripts\/extensions\//, '')
    .replace(/\/$/, '');
const BODY_CLASS = 'ms-teams';

const defaultSettings = Object.freeze({
    enabled: true,
    /** light, dark or system */
    appearance: 'light',
    chatList: true,
    /** App names under the rail icons; Teams leaves them off */
    railLabels: false,
    /** App rail hidden with the title bar's button */
    railHidden: false,
    /** Monogram of the persona's name in the title bar even when it has a picture */
    personaMonogram: false,
    presence: true,
    shortTimes: true,
    recentMax: 50,
    /** While the theme is on, SillyTavern's own UI theme preset and Custom CSS are paused */
    pauseUserTheme: true,
    /** Customize page: { version, tokens, flags, css }, layered on the appearance */
    customize: { version: 1, tokens: {}, flags: {}, css: '' },
});

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let customizeChecked = false;
/** init() has run, so the frame may be built */
let ready = false;
/** The frame has been built (it may be parked while the theme is off) */
let built = false;
/** @type {Promise<void>|null} */
let building = null;
/** One theme at a time: set up in init() */
let exclusive = { activated: () => {}, changed: () => {} };

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    const settings = extensionSettings[MODULE_NAME];
    // the persona picture became the default; the old opt-in setting is gone
    delete settings.personaPicture;
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = structuredClone(defaultSettings[key]);
        }
    }
    // cleaned once per load (older flag names, hand edits)
    if (!customizeChecked) {
        settings.customize = normalizeCustomize(settings.customize);
        customizeChecked = true;
    }
    return settings;
}

function saveSettings() {
    SillyTavern.getContext().saveSettingsDebounced();
}

function isDark(settings) {
    return settings.appearance === 'dark' || (settings.appearance === 'system' && darkQuery.matches);
}

/** Body classes that follow a setting while the theme is on */
const SETTING_CLASSES = {
    'mst-dark': isDark,
    'mst-no-list': settings => !settings.chatList,
    'mst-rail-labels': settings => settings.railLabels,
    'mst-rail-hidden': settings => settings.railHidden,
    'mst-persona-monogram': settings => settings.personaMonogram,
    'mst-presence-on': settings => settings.presence,
    'mst-short-times': settings => settings.shortTimes,
};

function applySettings() {
    const settings = getSettings();
    const on = !!settings.enabled;
    const body = document.body.classList;
    body.toggle(BODY_CLASS, on);
    document.documentElement.classList.toggle('mst-html', on);
    for (const [name, test] of Object.entries(SETTING_CLASSES)) {
        body.toggle(name, on && !!test(settings));
    }
    refreshRailToggle(!!settings.railHidden);
    setDisguise(on);
    setRailTooltips(on);
    if (!on) {
        // the frame's own state classes (open menus, phone pane, group chat)
        body.remove(...[...body].filter(name => name.startsWith('mst-') && name !== 'mst-booting' && name !== 'mst-boot-done'));
    }
    applyCustomize(settings.customize, on);
    // the Teams frame exists only while the theme is on: built the first time it's turned on,
    // taken out when it's switched off, and put back as it was when it's on again
    if (!on) {
        parkOwned();
    } else if (built) {
        restoreOwned();
        refreshFrame();
    } else if (ready) {
        build();
    }
}

/** Opens the Customize page; changes show at once and are saved as they're made. */
function customizeTheme() {
    const settings = getSettings();
    return openCustomize({
        get: () => settings.customize,
        set: (value) => { settings.customize = value ?? emptyCustomize(); },
        changed: () => {
            applySettings();
            saveSettings();
        },
    });
}

/** Phones show one pane at a time: the chat list, or the open chat. */
function showChatOnPhone() {
    if (isPhone()) {
        document.body.classList.add('mst-m-chat');
    }
}

function setTheme(appearance) {
    const settings = getSettings();
    settings.appearance = appearance;
    applySettings();
    saveSettings();
    const select = /** @type {HTMLSelectElement} */ (document.getElementById('mst_appearance'));
    if (select) {
        select.value = appearance;
    }
}

function toggleRail() {
    const settings = getSettings();
    settings.railHidden = !settings.railHidden;
    applySettings();
    saveSettings();
}

function onChatChanged(chatId) {
    if (!isOn()) {
        return;
    }
    refreshHeader();
    refreshTitle();
    if (chatId) {
        showChatOnPhone();
    } else {
        document.body.classList.remove('mst-m-chat');
    }
}

async function renderSettingsPanel() {
    const { renderExtensionTemplateAsync } = SillyTavern.getContext();
    const html = await renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
    const container = document.getElementById('extensions_settings2');
    if (!container || document.querySelector('.mst-settings')) {
        return;
    }
    container.insertAdjacentHTML('beforeend', html);

    const settings = getSettings();
    const checkbox = (id, key, after) => {
        const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
        input.checked = !!settings[key];
        return [input, key, () => input.checked, after];
    };
    const appearance = /** @type {HTMLSelectElement} */ (document.getElementById('mst_appearance'));
    appearance.value = settings.appearance;
    const recentMax = /** @type {HTMLInputElement} */ (document.getElementById('mst_recent_max'));
    recentMax.value = String(settings.recentMax);

    const controls = [
        // turning the theme on turns the other themes off
        checkbox('mst_enabled', 'enabled', () => (settings.enabled ? exclusive.activated() : exclusive.changed())),
        checkbox('mst_pause_user_theme', 'pauseUserTheme', () => exclusive.changed()),
        [appearance, 'appearance', () => appearance.value],
        checkbox('mst_chat_list', 'chatList'),
        checkbox('mst_rail_labels', 'railLabels'),
        checkbox('mst_persona_monogram', 'personaMonogram'),
        checkbox('mst_presence', 'presence'),
        checkbox('mst_short_times', 'shortTimes', () => labelMessages()),
        [recentMax, 'recentMax', () => Math.min(500, Math.max(5, Number(recentMax.value) || defaultSettings.recentMax)), () => scheduleRefresh()],
    ];
    for (const [element, key, read, after] of controls) {
        element.addEventListener('input', () => {
            settings[key] = read();
            applySettings();
            saveSettings();
            after?.();
        });
    }
    document.getElementById('mst_customize')?.addEventListener('click', () => customizeTheme());
}

async function init() {
    exclusive = registerTheme({
        id: 'msteams',
        name: 'Microsoft Teams',
        folder: EXTENSION_FOLDER.split('/').pop(),
        settingsKey: MODULE_NAME,
        bodyClass: BODY_CLASS,
        isEnabled: () => !!getSettings().enabled,
        disable: () => {
            getSettings().enabled = false;
            applySettings();
            const toggle = /** @type {HTMLInputElement|null} */ (document.getElementById('mst_enabled'));
            if (toggle) {
                toggle.checked = false;
            }
            saveSettings();
        },
        pauseUserTheme: () => !!getSettings().pauseUserTheme,
    });
    darkQuery.addEventListener('change', applySettings);
    ready = true;
    applySettings();
    if (building) {
        await building;
    }
    endBoot();

    try {
        await renderSettingsPanel();
    } catch (error) {
        console.error('[MS Teams] Could not render the settings panel', error);
    }
}

/** Builds the Teams frame around SillyTavern; once, the first time the theme is on. */
function build() {
    built = true;
    building = buildFrame();
    return building;
}

async function buildFrame() {
    initShell({ toggleRail, setTheme, customize: customizeTheme });
    initApps();
    const listLoaded = initChatList({ settings: getSettings, opened: showChatOnPhone, historyChanged: refreshNavigation, customize: customizeTheme });
    applySettings();
    initTimes();
    initMonograms();
    initShortcuts({
        enabled: () => !!getSettings().enabled,
        focusSearch,
        newChat: startNewChat,
        travel,
    });

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_EDITED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_RENAMED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_RENAMED, refreshTitle);
    eventSource.on(eventTypes.GROUP_UPDATED, refreshTitle);
    eventSource.on(eventTypes.PERSONA_CHANGED, refreshPersona);
    eventSource.on(eventTypes.PERSONA_CHANGED, () => refreshCopilotGreeting());
    eventSource.on(eventTypes.PERSONA_RENAMED, () => refreshPersona());
    eventSource.on(eventTypes.SETTINGS_UPDATED, () => refreshPersona());
    onChatChanged(SillyTavern.getContext().getCurrentChatId());
    markCurrentChat();
    await Promise.race([listLoaded, delay(3000)]);
}

/** Brings the frame up to date after it was put back (things may have changed while it was out). */
function refreshFrame() {
    refreshDrawerState();
    refreshHeader();
    refreshPersona();
    refreshNavigation();
    refreshTitle();
    markCurrentChat();
    scheduleRefresh(0);
    monogramizeMessages();
    labelMessages();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Lifts the loading screen once the Teams UI has painted. */
function endBoot() {
    const body = document.body;
    if (!body.classList.contains('mst-booting')) {
        return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
        body.classList.add('mst-boot-done');
        setTimeout(() => body.classList.remove('mst-booting', 'mst-boot-done'), 250);
    }));
}

/** Teams' loading screen from the moment this code loads (SillyTavern has its settings by then). */
function bootLook() {
    const settings = SillyTavern.getContext().extensionSettings?.[MODULE_NAME];
    if (settings?.enabled === false) {
        return;
    }
    document.body.classList.add('mst-booting');
    if (settings) {
        applyCustomize(normalizeCustomize(settings.customize), true);
    }
    // never leave the cover up if something fails on the way
    setTimeout(endBoot, 20000);
    document.body.classList.toggle('mst-dark', !!settings && isDark({ ...defaultSettings, ...settings }));
    const logo = /** @type {HTMLImageElement} */ (document.querySelector('#loader .splash-logo'));
    if (logo) {
        logo.alt = '';
        logo.removeAttribute('aria-label');
    }
}

/**
 * SillyTavern calls this (manifest "hooks") after it updates the extension from its update button,
 * where it would otherwise ask for a manual reload. The page reloads once, after pending settings
 * are saved, so the new version runs; an up-to-date extension isn't updated again, so it can't loop.
 */
export function onUpdate() {
    toastr.info(SillyTavern.getContext().translate('Reloading to finish the update…'), 'Microsoft Teams Theme');
    setTimeout(() => location.reload(), 2000);
}

bootLook();

const { eventSource, eventTypes } = SillyTavern.getContext();
eventSource.on(eventTypes.APP_READY, init);
