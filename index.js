// Microsoft Teams theme: toggles the scoped styles in style.css, builds the Teams frame
// (title bar, app rail, chat list, chat header) and exposes a small settings panel.

import { initChatList, markCurrentChat, scheduleRefresh } from './chatlist.js';
import { setDisguise, refreshTitle } from './disguise.js';
import { initShell, refreshHeader, refreshNavigation, refreshPersona, refreshRailToggle } from './shell.js';
import { initTimes, labelMessages } from './times.js';

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
    /** Persona picture in the title bar instead of a monogram of its name */
    personaPicture: false,
    presence: true,
    shortTimes: true,
    recentMax: 50,
});

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    const settings = extensionSettings[MODULE_NAME];
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = structuredClone(defaultSettings[key]);
        }
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
    body.classList.toggle('mst-dark', !!settings.enabled && isDark(settings));
    body.classList.toggle('mst-no-list', !settings.chatList);
    body.classList.toggle('mst-rail-labels', !!settings.railLabels);
    body.classList.toggle('mst-rail-hidden', !!settings.railHidden);
    refreshRailToggle(!!settings.railHidden);
    setDisguise(!!settings.enabled);
    body.classList.toggle('mst-persona-picture', !!settings.personaPicture);
    body.classList.toggle('mst-presence-on', !!settings.presence);
    body.classList.toggle('mst-short-times', !!settings.shortTimes);
}

/** Phones show one pane at a time: the chat list, or the open chat. */
function showChatOnPhone() {
    if (window.matchMedia(MOBILE_QUERY).matches) {
        document.body.classList.add('mst-m-chat');
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
    const personaPicture = /** @type {HTMLInputElement} */ (document.getElementById('mst_persona_picture'));
    const presence = /** @type {HTMLInputElement} */ (document.getElementById('mst_presence'));
    const shortTimes = /** @type {HTMLInputElement} */ (document.getElementById('mst_short_times'));
    const recentMax = /** @type {HTMLInputElement} */ (document.getElementById('mst_recent_max'));

    enabled.checked = settings.enabled;
    appearance.value = settings.appearance;
    chatList.checked = settings.chatList;
    railLabels.checked = settings.railLabels;
    personaPicture.checked = settings.personaPicture;
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
    bind(personaPicture, 'personaPicture', () => personaPicture.checked);
    bind(presence, 'presence', () => presence.checked);
    bind(shortTimes, 'shortTimes', () => shortTimes.checked, () => labelMessages());
    bind(recentMax, 'recentMax', () => Math.min(500, Math.max(5, Number(recentMax.value) || defaultSettings.recentMax)), () => scheduleRefresh());
}

async function init() {
    applySettings();
    darkQuery.addEventListener('change', applySettings);

    initShell({ toggleRail });
    initChatList({ settings: getSettings, opened: showChatOnPhone, historyChanged: refreshNavigation });
    applySettings();
    initTimes();

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_EDITED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_RENAMED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_RENAMED, refreshTitle);
    eventSource.on(eventTypes.GROUP_UPDATED, refreshTitle);
    eventSource.on(eventTypes.PERSONA_CHANGED, refreshPersona);
    eventSource.on(eventTypes.PERSONA_RENAMED, () => refreshPersona());
    eventSource.on(eventTypes.SETTINGS_UPDATED, () => refreshPersona());
    onChatChanged(SillyTavern.getContext().getCurrentChatId());
    markCurrentChat();

    try {
        await renderSettingsPanel();
    } catch (error) {
        console.error('[MS Teams] Could not render the settings panel', error);
    }
}

const { eventSource, eventTypes } = SillyTavern.getContext();
eventSource.on(eventTypes.APP_READY, init);
