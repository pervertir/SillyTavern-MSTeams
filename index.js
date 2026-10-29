// Microsoft Teams theme: toggles the scoped styles in style.css, builds the Teams frame
// (title bar, app rail, chat list, chat header) and exposes a small settings panel.

import { initChatList, markCurrentChat, scheduleRefresh, travel } from './chatlist.js';
import { initApps, refreshCopilotGreeting } from './apps.js';
import { initMonograms } from './monograms.js';
import { setDisguise, refreshTitle } from './disguise.js';
import { initShortcuts } from './shortcuts.js';
import { focusSearch, initShell, refreshHeader, refreshNavigation, refreshPersona, refreshRailToggle, setRailTooltips, startNewChat } from './shell.js';
import { initTimes, labelMessages } from './times.js';
import { applyCustomize, emptyCustomize, normalizeCustomize, openCustomize } from './customize.js';

const MODULE_NAME = 'msTeamsTheme';
/** Folder path under scripts/extensions/, e.g. third-party/SillyTavern-MSTeams */
const EXTENSION_FOLDER = new URL('.', import.meta.url).pathname
    .replace(/^.*\/scripts\/extensions\//, '')
    .replace(/\/$/, '');
const BODY_CLASS = 'ms-teams';
const MOBILE_QUERY = '(max-width: 1000px)';

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
    /** Customize page: { version, tokens, flags, css }, layered on the appearance */
    customize: { version: 1, tokens: {}, flags: {}, css: '' },
});

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let customizeChecked = false;

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

function applySettings() {
    const settings = getSettings();
    const body = document.body;
    body.classList.toggle(BODY_CLASS, !!settings.enabled);
    document.documentElement.classList.toggle('mst-html', !!settings.enabled);
    body.classList.toggle('mst-dark', !!settings.enabled && isDark(settings));
    body.classList.toggle('mst-no-list', !settings.chatList);
    body.classList.toggle('mst-rail-labels', !!settings.railLabels);
    body.classList.toggle('mst-rail-hidden', !!settings.railHidden);
    refreshRailToggle(!!settings.railHidden);
    setDisguise(!!settings.enabled);
    setRailTooltips(!!settings.enabled);
    body.classList.toggle('mst-persona-monogram', !!settings.personaMonogram);
    body.classList.toggle('mst-presence-on', !!settings.presence);
    body.classList.toggle('mst-short-times', !!settings.shortTimes);
    applyCustomize(settings.customize, !!settings.enabled);
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
    if (window.matchMedia(MOBILE_QUERY).matches) {
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
    const enabled = /** @type {HTMLInputElement} */ (document.getElementById('mst_enabled'));
    const appearance = /** @type {HTMLSelectElement} */ (document.getElementById('mst_appearance'));
    const chatList = /** @type {HTMLInputElement} */ (document.getElementById('mst_chat_list'));
    const railLabels = /** @type {HTMLInputElement} */ (document.getElementById('mst_rail_labels'));
    const personaMonogram = /** @type {HTMLInputElement} */ (document.getElementById('mst_persona_monogram'));
    const presence = /** @type {HTMLInputElement} */ (document.getElementById('mst_presence'));
    const shortTimes = /** @type {HTMLInputElement} */ (document.getElementById('mst_short_times'));
    const recentMax = /** @type {HTMLInputElement} */ (document.getElementById('mst_recent_max'));

    enabled.checked = settings.enabled;
    appearance.value = settings.appearance;
    chatList.checked = settings.chatList;
    railLabels.checked = settings.railLabels;
    personaMonogram.checked = settings.personaMonogram;
    presence.checked = settings.presence;
    shortTimes.checked = settings.shortTimes;
    recentMax.value = String(settings.recentMax);

    const bind = (element, key, read, after) => {
        element.addEventListener('input', () => {
            settings[key] = read();
            applySettings();
            saveSettings();
            after?.();
        });
    };
    bind(enabled, 'enabled', () => enabled.checked);
    bind(appearance, 'appearance', () => appearance.value);
    bind(chatList, 'chatList', () => chatList.checked);
    bind(railLabels, 'railLabels', () => railLabels.checked);
    bind(personaMonogram, 'personaMonogram', () => personaMonogram.checked);
    bind(presence, 'presence', () => presence.checked);
    bind(shortTimes, 'shortTimes', () => shortTimes.checked, () => labelMessages());
    document.getElementById('mst_customize')?.addEventListener('click', () => customizeTheme());
    bind(recentMax, 'recentMax', () => Math.min(500, Math.max(5, Number(recentMax.value) || defaultSettings.recentMax)), () => scheduleRefresh());
}

async function init() {
    applySettings();
    darkQuery.addEventListener('change', applySettings);

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
    endBoot();

    try {
        await renderSettingsPanel();
    } catch (error) {
        console.error('[MS Teams] Could not render the settings panel', error);
    }
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

bootLook();

const { eventSource, eventTypes } = SillyTavern.getContext();
eventSource.on(eventTypes.APP_READY, init);
