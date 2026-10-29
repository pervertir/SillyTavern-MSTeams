// Keeps the app's own name out of sight while the theme is on: the tab title reads like a
// Teams tab with Teams' own icon, and the message box says "Type a message".
// Turning the theme off puts the originals back.

import { channelName, getChatOwner, t } from './util.js';

const TITLE_SUFFIX = 'Microsoft Teams';
/** Teams' own tab icon, linked from Microsoft's site rather than copied into the theme */
const ICON = 'https://teams.microsoft.com/favicon.ico';
const PLACEHOLDER = 'Type a message';
const PLACEHOLDER_ATTRS = ['placeholder', 'connected_text', 'no_connection_text'];

let original = null;
let active = false;

function getIconLinks() {
    return [...document.querySelectorAll('link[rel~="icon"]')];
}

function remember() {
    if (original) {
        return;
    }
    const textarea = document.getElementById('send_textarea');
    original = {
        title: document.title,
        icons: getIconLinks().map(link => [link, link.getAttribute('href'), link.getAttribute('type')]),
        placeholder: Object.fromEntries(PLACEHOLDER_ATTRS.map(name => [name, textarea?.getAttribute(name)])),
    };
}

/** The tab title Teams would show for the open chat. */
export function refreshTitle() {
    if (!active) {
        return;
    }
    const { group, character } = getChatOwner();
    if (group) {
        // a group is a team and its chat a channel, titled like a Teams channel tab
        const channel = channelName(group, SillyTavern.getContext().getCurrentChatId() ?? '');
        document.title = [channel, group.name, TITLE_SUFFIX].filter(Boolean).join(' | ');
        return;
    }
    document.title = [t('Chat'), character?.name, TITLE_SUFFIX].filter(Boolean).join(' | ');
}

function applyPlaceholder(textarea) {
    for (const name of PLACEHOLDER_ATTRS) {
        textarea.setAttribute(name, t(PLACEHOLDER));
    }
}

export function setDisguise(enabled) {
    const textarea = document.getElementById('send_textarea');
    if (enabled) {
        remember();
        active = true;
        refreshTitle();
        for (const link of getIconLinks()) {
            link.setAttribute('href', ICON);
            link.setAttribute('type', 'image/x-icon');
        }
        if (textarea) {
            applyPlaceholder(textarea);
        }
        return;
    }
    if (!active || !original) {
        return;
    }
    active = false;
    document.title = original.title;
    for (const [link, href, type] of original.icons) {
        link.setAttribute('href', href);
        if (type) {
            link.setAttribute('type', type);
        } else {
            link.removeAttribute('type');
        }
    }
    if (textarea) {
        for (const name of PLACEHOLDER_ATTRS) {
            const value = original.placeholder[name];
            if (value === null || value === undefined) {
                textarea.removeAttribute(name);
            } else {
                textarea.setAttribute(name, value);
            }
        }
        // SillyTavern's own text for the current connection state
        const connected = !document.getElementById('send_form')?.classList.contains('no-connection');
        textarea.setAttribute('placeholder', textarea.getAttribute(connected ? 'connected_text' : 'no_connection_text') ?? '');
    }
    original = null;
}
