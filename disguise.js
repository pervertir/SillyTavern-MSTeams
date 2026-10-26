// Keeps the app's own name out of sight while the theme is on: the tab title reads like a
// Teams tab, the tab icon is a plain chat bubble, and the message box says "Type a message".
// Turning the theme off puts the originals back.

const TITLE_SUFFIX = 'Microsoft Teams';
const ICON = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#5b5fc7'/>"
    + "<path d='M16 7.5c5.25 0 9.5 3.5 9.5 7.9s-4.25 7.9-9.5 7.9c-1.15 0-2.25-.17-3.27-.48L8 24.5l1.37-3.8C7.84 19.3 6.5 17.47 6.5 15.4c0-4.4 4.25-7.9 9.5-7.9z' fill='#fff'/></svg>",
);
const PLACEHOLDER = 'Type a message';
const PLACEHOLDER_ATTRS = ['placeholder', 'connected_text', 'no_connection_text'];

let original = null;
let active = false;

function t(text) {
    return SillyTavern.getContext().translate(text);
}

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
    const context = SillyTavern.getContext();
    const group = context.groupId ? context.groups.find(x => String(x.id) === String(context.groupId)) : null;
    const character = !group && context.characterId !== undefined ? context.characters[context.characterId] : null;
    const name = group?.name || character?.name;
    document.title = [t('Chat'), name, TITLE_SUFFIX].filter(Boolean).join(' | ');
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
            link.setAttribute('type', 'image/svg+xml');
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
