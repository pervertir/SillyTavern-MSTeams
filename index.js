// Microsoft Teams theme: toggles the scoped styles in style.css, builds the Teams frame
// (title bar, app rail, chat list, chat header) and exposes a small settings panel.

import { initChatList, markCurrentChat, scheduleRefresh } from './chatlist.js';
import { initShell, refreshHeader, refreshPersona } from './shell.js';
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
    body.classList.toggle('mst-presence-on', !!settings.presence);
    body.classList.toggle('mst-short-times', !!settings.shortTimes);
}

/** Phones show one pane at a time: the chat list, or the open chat. */
function showChatOnPhone() {
    if (window.matchMedia(MOBILE_QUERY).matches) {
        document.body.classList.add('mst-m-chat');
    }
}

function onChatChanged(chatId) {
    refreshHeader();
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
    const presence = /** @type {HTMLInputElement} */ (document.getElementById('mst_presence'));
    const shortTimes = /** @type {HTMLInputElement} */ (document.getElementById('mst_short_times'));
    const recentMax = /** @type {HTMLInputElement} */ (document.getElementById('mst_recent_max'));

    enabled.checked = settings.enabled;
    appearance.value = settings.appearance;
    chatList.checked = settings.chatList;
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
    bind(presence, 'presence', () => presence.checked);
    bind(shortTimes, 'shortTimes', () => shortTimes.checked, () => labelMessages());
    bind(recentMax, 'recentMax', () => Math.min(500, Math.max(5, Number(recentMax.value) || defaultSettings.recentMax)), () => scheduleRefresh());
}

async function init() {
    applySettings();
    darkQuery.addEventListener('change', applySettings);

    initShell();
    initChatList({ settings: getSettings, opened: showChatOnPhone });
    initTimes();

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_EDITED, refreshHeader);
    eventSource.on(eventTypes.CHARACTER_RENAMED, refreshHeader);
    eventSource.on(eventTypes.PERSONA_CHANGED, refreshPersona);
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
