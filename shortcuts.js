// Teams' keyboard shortcuts (the Teams web set, since the theme runs in a browser where
// Ctrl+1 and friends belong to the browser), written the way each OS writes them:
// "Ctrl+Shift+1" on Windows and Linux, "⌘⇧1" on macOS. Tooltips show them, they work, and
// Ctrl+. / ⌘. lists them all, as in Teams.

export const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);

const MAC_KEYS = { Mod: '⌘', Shift: '⇧', Alt: '⌥', Ctrl: '⌃', Enter: '↩', Left: '←', Right: '→', Esc: 'esc', '.': '.' };
const PC_KEYS = { Mod: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Ctrl: 'Ctrl', Enter: 'Enter', Left: 'Left', Right: 'Right', Esc: 'Esc', '.': '.' };

/** Rail apps from top to bottom, opened with Mod+Shift+1 … 8 */
export const RAIL_SHORTCUTS = [
    { id: 'ai-config-button', label: 'Activity' },
    { id: 'mst-app-chat', label: 'Chat' },
    { id: 'sys-settings-button', label: 'Calendar' },
    { id: 'advanced-formatting-button', label: 'Calls' },
    { id: 'WI-SP-button', label: 'OneDrive' },
    { id: 'user-settings-button', label: 'Copilot' },
    { id: 'mst-app-more', label: 'More apps' },
    { id: 'extensions-settings-button', label: 'Apps' },
].map((app, index) => ({ ...app, keys: ['Mod', 'Shift', String(index + 1)] }));

export const SHORTCUTS = {
    search: ['Mod', 'Alt', 'E'],
    newChat: ['Mod', 'Alt', 'N'],
    shortcuts: ['Mod', '.'],
    back: ['Alt', 'Left'],
    forward: ['Alt', 'Right'],
};

/** Writes a shortcut the way this OS does: ⌘⇧1 on a Mac, Ctrl+Shift+1 elsewhere. */
export function formatKeys(keys) {
    if (IS_MAC) {
        return keys.map(key => MAC_KEYS[key] ?? key.toUpperCase()).join('');
    }
    return keys.map(key => PC_KEYS[key] ?? key.toUpperCase()).join('+');
}

/** "Label (shortcut)", as Teams writes its tooltips. */
export function withShortcut(label, keys) {
    return `${label} (${formatKeys(keys)})`;
}

function t(text) {
    return SillyTavern.getContext().translate(text);
}

function matches(event, keys) {
    const wantMod = keys.includes('Mod');
    const mod = IS_MAC ? event.metaKey : event.ctrlKey;
    const otherMod = IS_MAC ? event.ctrlKey : event.metaKey;
    if (mod !== wantMod || otherMod || event.shiftKey !== keys.includes('Shift') || event.altKey !== keys.includes('Alt')) {
        return false;
    }
    const key = keys[keys.length - 1];
    if (/^\d$/.test(key)) {
        return event.code === `Digit${key}` || event.code === `Numpad${key}`;
    }
    if (key === 'Left' || key === 'Right') {
        return event.key === `Arrow${key}`;
    }
    if (key === '.') {
        return event.code === 'Period';
    }
    return event.code === `Key${key}`;
}

function isTyping(target) {
    return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Opens a rail app the way a click on it would. */
function openRailApp(id) {
    const element = document.getElementById(id);
    if (!element) {
        return;
    }
    const target = element.classList.contains('drawer') ? element.querySelector(':scope > .drawer-toggle') : element;
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/** Teams' "Keyboard shortcuts" dialog. */
export async function showShortcuts() {
    const { callGenericPopup, POPUP_TYPE } = SillyTavern.getContext();
    const rows = (items) => items.map(([label, keys]) => `<tr><td>${escapeHtml(t(label))}</td><td><kbd>${escapeHtml(formatKeys(keys))}</kbd></td></tr>`).join('');
    const section = (title, items) => `<h4>${escapeHtml(t(title))}</h4><table>${rows(items)}</table>`;
    const html = `<div class="mst-shortcuts">
        <h3>${escapeHtml(t('Keyboard shortcuts'))}</h3>
        ${section('General', [
            ['Show keyboard shortcuts', SHORTCUTS.shortcuts],
            ['Go to Search', SHORTCUTS.search],
            ['Start a new chat', SHORTCUTS.newChat],
            ['Go back', SHORTCUTS.back],
            ['Go forward', SHORTCUTS.forward],
        ])}
        ${section('Navigation', RAIL_SHORTCUTS.map(app => [`Open ${app.label}`, app.keys]))}
        ${section('Messaging', [
            ['Send a message', ['Enter']],
            ['Start a new line', ['Shift', 'Enter']],
            ['Close a menu or dialog', ['Esc']],
        ])}
    </div>`;
    await callGenericPopup(html, POPUP_TYPE.TEXT, '', { wide: false, allowVerticalScrolling: true });
}

/**
 * @param {object} actions
 * @param {() => boolean} actions.enabled Whether the theme is on
 * @param {() => void} actions.focusSearch
 * @param {() => void} actions.newChat
 * @param {(step: number) => void} actions.travel
 */
export function initShortcuts(actions) {
    document.addEventListener('keydown', (event) => {
        if (!actions.enabled() || event.repeat) {
            return;
        }
        let handled = true;
        const app = RAIL_SHORTCUTS.find(x => matches(event, x.keys));
        if (app) {
            openRailApp(app.id);
        } else if (matches(event, SHORTCUTS.search)) {
            actions.focusSearch();
        } else if (matches(event, SHORTCUTS.newChat)) {
            actions.newChat();
        } else if (matches(event, SHORTCUTS.shortcuts)) {
            showShortcuts();
        } else if (!isTyping(event.target) && matches(event, SHORTCUTS.back)) {
            actions.travel(-1);
        } else if (!isTyping(event.target) && matches(event, SHORTCUTS.forward)) {
            actions.travel(1);
        } else {
            handled = false;
        }
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}
