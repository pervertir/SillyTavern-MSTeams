// The Teams chat list: SillyTavern's recent chats (the same list as its welcome screen),
// split into Pinned and Recent, with the open chat highlighted.

import { formatListTime } from './times.js';

const LIST_ID = 'mst-list';
/** SillyTavern's own pinned chats, kept in account storage by welcome-screen.js */
const PINNED_KEY = 'pinnedChats';
const COLLAPSED_KEY = 'mst-collapsed-sections';

let getSettings = () => ({ recentMax: 50 });
/** @type {Array<object>} */
let entries = [];
let filterText = '';
let requestId = 0;
let refreshTimer = 0;
let onOpen = () => {};

function t(text) {
    return SillyTavern.getContext().translate(text);
}

function getPinned() {
    try {
        const value = SillyTavern.getContext().accountStorage.getItem(PINNED_KEY);
        return value ? Object.values(JSON.parse(value)) : [];
    } catch {
        return [];
    }
}

function getCollapsed() {
    try {
        return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]');
    } catch {
        return [];
    }
}

function setCollapsed(list) {
    try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(list));
    } catch {
        // private windows can refuse storage; the section just won't remember
    }
}

/** Plain one-line preview of the last message, without markup. */
function toPreview(text) {
    const div = document.createElement('div');
    div.innerHTML = SillyTavern.libs.DOMPurify.sanitize(String(text ?? ''), { ALLOWED_TAGS: [] });
    return (div.textContent || '')
        .replace(/[*_~`#>]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);
}

function isCurrent(entry) {
    const context = SillyTavern.getContext();
    if (context.getCurrentChatId() !== entry.fileId) {
        return false;
    }
    if (entry.group) {
        return String(context.groupId) === String(entry.group);
    }
    const character = context.characters[context.characterId];
    return character?.avatar === entry.avatar;
}

function buildItem(entry) {
    const item = document.createElement('div');
    item.className = 'mst-chat';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.dataset.key = entry.key;
    item.title = entry.title;
    if (isCurrent(entry)) {
        item.classList.add('mst-chat-active');
        item.setAttribute('aria-current', 'true');
    }

    const avatar = document.createElement('span');
    avatar.className = 'mst-avatar';
    if (entry.group) {
        avatar.classList.add('mst-avatar-group');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-users';
        avatar.append(icon);
    } else {
        const img = document.createElement('img');
        img.src = entry.thumb;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        avatar.append(img);
        const presence = document.createElement('span');
        presence.className = 'mst-presence';
        avatar.append(presence);
    }

    const text = document.createElement('span');
    text.className = 'mst-chat-text';
    const top = document.createElement('span');
    top.className = 'mst-chat-top';
    const name = document.createElement('span');
    name.className = 'mst-chat-name';
    name.textContent = entry.name;
    const time = document.createElement('span');
    time.className = 'mst-chat-time';
    time.textContent = entry.time;
    top.append(name, time);
    const preview = document.createElement('span');
    preview.className = 'mst-chat-preview';
    preview.textContent = entry.preview;
    text.append(top, preview);

    item.append(avatar, text);
    return item;
}

function buildSection(id, label, items) {
    const collapsed = getCollapsed().includes(id);
    const section = document.createElement('section');
    section.className = 'mst-section';
    section.dataset.section = id;
    section.classList.toggle('mst-section-collapsed', collapsed);

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'mst-section-head';
    head.setAttribute('aria-expanded', String(!collapsed));
    const chevron = document.createElement('i');
    chevron.className = 'fa-solid fa-chevron-down';
    const title = document.createElement('span');
    title.textContent = label;
    head.append(chevron, title);

    const body = document.createElement('div');
    body.className = 'mst-section-items';
    body.append(...items.map(buildItem));
    section.append(head, body);
    return section;
}

function render() {
    const body = document.querySelector(`#${LIST_ID} .mst-list-body`);
    if (!body) {
        return;
    }
    const needle = filterText.trim().toLowerCase();
    const visible = needle
        ? entries.filter(entry => entry.name.toLowerCase().includes(needle) || entry.preview.toLowerCase().includes(needle) || entry.fileId.toLowerCase().includes(needle))
        : entries;

    const pinned = visible.filter(entry => entry.pinned);
    const recent = visible.filter(entry => !entry.pinned);
    const sections = [];
    if (pinned.length) {
        sections.push(buildSection('pinned', t('Pinned'), pinned));
    }
    sections.push(buildSection('recent', t('Recent'), recent));
    body.replaceChildren(...sections);

    if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'mst-list-empty';
        empty.textContent = needle ? t('No chats match your search') : t('No chats yet. Pick someone from Characters to start one.');
        body.append(empty);
    }
}

/** Moves the highlight to the open chat without fetching the list again. */
export function markCurrentChat() {
    const list = document.getElementById(LIST_ID);
    if (!list) {
        return;
    }
    for (const item of list.querySelectorAll('.mst-chat')) {
        const entry = entries.find(x => x.key === item.dataset.key);
        const current = !!entry && isCurrent(entry);
        item.classList.toggle('mst-chat-active', current);
        if (current) {
            item.setAttribute('aria-current', 'true');
        } else {
            item.removeAttribute('aria-current');
        }
    }
}

export async function refreshChatList() {
    const context = SillyTavern.getContext();
    const id = ++requestId;
    let data = [];
    try {
        const response = await fetch('/api/chats/recent', {
            method: 'POST',
            headers: context.getRequestHeaders(),
            body: JSON.stringify({ max: getSettings().recentMax, pinned: getPinned() }),
            cache: 'no-cache',
        });
        if (response.ok) {
            data = await response.json();
        }
    } catch (error) {
        console.warn('[MS Teams] Could not load recent chats', error);
    }
    // a newer refresh started while this one was waiting
    if (id !== requestId || !Array.isArray(data)) {
        return;
    }

    const pinned = getPinned();
    entries = data.map((chat) => {
        const character = chat.avatar ? context.characters.find(x => x.avatar === chat.avatar) : null;
        const group = chat.group ? context.groups.find(x => x.id === chat.group) : null;
        if (!character && !group) {
            return null;
        }
        const fileId = String(chat.file_name || '').replace(/\.jsonl$/, '');
        const isPinned = pinned.some(p => p.file_name === chat.file_name && (p.avatar === chat.avatar || (p.group && p.group === chat.group)));
        return {
            key: `${chat.group ? 'g_' + chat.group : 'c_' + chat.avatar}_${fileId}`,
            name: character?.name || group?.name || '',
            title: `${character?.name || group?.name || ''}: ${fileId}`,
            avatar: chat.avatar || '',
            group: chat.group || '',
            thumb: character ? context.getThumbnailUrl('avatar', character.avatar) : '',
            fileId,
            preview: toPreview(chat.mes),
            lastMes: Number(chat.last_mes) || 0,
            time: formatListTime(chat.last_mes),
            pinned: isPinned,
        };
    }).filter(Boolean);
    entries.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.lastMes - a.lastMes));
    render();
}

/** Refreshes after a pause, so a burst of events costs one request. */
export function scheduleRefresh(delay = 600) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshChatList, delay);
}

export function filterChatList(text) {
    filterText = String(text ?? '');
    render();
}

export async function openEntry(entry) {
    const context = SillyTavern.getContext();
    if (isCurrent(entry)) {
        onOpen();
        return;
    }
    try {
        if (entry.group) {
            const group = context.groups.find(x => x.id === entry.group);
            if (!group) {
                return;
            }
            if (String(context.groupId) !== String(entry.group)) {
                // SillyTavern opens a group from a click on a .group_select card; a stand-in card
                // reaches the same handlers when the real one is on another page of the list
                const card = document.createElement('div');
                card.className = 'group_select mst-hidden-card';
                card.setAttribute('data-grid', entry.group);
                document.body.append(card);
                card.click();
                card.remove();
                await new Promise((resolve) => {
                    context.eventSource.once(context.eventTypes.CHAT_CHANGED, resolve);
                    setTimeout(resolve, 5000);
                });
            }
            if (context.getCurrentChatId() !== entry.fileId) {
                await context.openGroupChat(entry.group, entry.fileId);
            }
        } else {
            const characterId = context.characters.findIndex(x => x.avatar === entry.avatar);
            if (characterId === -1) {
                return;
            }
            if (String(context.characterId) !== String(characterId) || context.groupId) {
                await context.selectCharacterById(characterId);
            }
            if (SillyTavern.getContext().getCurrentChatId() !== entry.fileId) {
                await context.openCharacterChat(entry.fileId);
            }
        }
        onOpen();
    } catch (error) {
        console.error('[MS Teams] Could not open the chat', error);
        toastr.error(t('Could not open that chat. See the console for details.'));
    }
}

export function createChatList() {
    let list = document.getElementById(LIST_ID);
    if (list) {
        return list;
    }
    list = document.createElement('aside');
    list.id = LIST_ID;
    list.setAttribute('aria-label', t('Chat'));

    const head = document.createElement('div');
    head.className = 'mst-list-head';
    const title = document.createElement('h2');
    title.textContent = t('Chat');
    const actions = document.createElement('div');
    actions.className = 'mst-list-actions';

    const filterButton = document.createElement('button');
    filterButton.type = 'button';
    filterButton.className = 'mst-icon-button';
    filterButton.title = t('Filter');
    filterButton.innerHTML = '<i class="fa-solid fa-filter"></i>';

    const newButton = document.createElement('button');
    newButton.type = 'button';
    newButton.className = 'mst-icon-button';
    newButton.title = t('New chat');
    newButton.innerHTML = '<i class="fa-regular fa-pen-to-square"></i>';
    newButton.addEventListener('click', () => {
        const drawer = document.getElementById('right-nav-panel');
        if (drawer && !drawer.classList.contains('openDrawer')) {
            document.querySelector('#rightNavHolder > .drawer-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        // show the character list rather than the last character's card
        document.getElementById('rm_button_characters')?.click();
    });

    actions.append(filterButton, newButton);
    head.append(title, actions);

    const filterRow = document.createElement('div');
    filterRow.className = 'mst-list-filter';
    filterRow.hidden = true;
    const filterInput = document.createElement('input');
    filterInput.type = 'search';
    filterInput.className = 'mst-input';
    filterInput.placeholder = t('Filter by name or message');
    filterInput.addEventListener('input', () => filterChatList(filterInput.value));
    filterRow.append(filterInput);
    filterButton.addEventListener('click', () => {
        filterRow.hidden = !filterRow.hidden;
        filterButton.classList.toggle('mst-icon-button-on', !filterRow.hidden);
        if (filterRow.hidden) {
            filterInput.value = '';
            filterChatList('');
        } else {
            filterInput.focus();
        }
    });

    const body = document.createElement('div');
    body.className = 'mst-list-body';
    body.addEventListener('click', (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        const sectionHead = target.closest('.mst-section-head');
        if (sectionHead) {
            const section = sectionHead.closest('.mst-section');
            const collapsed = section.classList.toggle('mst-section-collapsed');
            sectionHead.setAttribute('aria-expanded', String(!collapsed));
            const ids = new Set(getCollapsed());
            collapsed ? ids.add(section.dataset.section) : ids.delete(section.dataset.section);
            setCollapsed([...ids]);
            return;
        }
        const item = target.closest('.mst-chat');
        const entry = item && entries.find(x => x.key === item.dataset.key);
        if (entry) {
            openEntry(entry);
        }
    });
    body.addEventListener('keydown', (event) => {
        const item = /** @type {HTMLElement} */ (event.target).closest?.('.mst-chat');
        if (item && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            item.click();
        }
    });

    list.append(head, filterRow, body);
    document.body.append(list);
    return list;
}

/* Back and forward between chats, like Teams' title bar arrows */
const visited = [];
let visitIndex = -1;
let travelling = false;
let onHistoryChange = () => {};

function getCurrentPlace() {
    const context = SillyTavern.getContext();
    const fileId = context.getCurrentChatId();
    if (!fileId) {
        return null;
    }
    if (context.groupId) {
        return { group: String(context.groupId), avatar: '', fileId };
    }
    const character = context.characters[context.characterId];
    return character ? { group: '', avatar: character.avatar, fileId } : null;
}

function samePlace(a, b) {
    return !!a && !!b && a.fileId === b.fileId && a.group === b.group && a.avatar === b.avatar;
}

let visitTimer = 0;

/** Records the open chat once it settles: picking a character opens its last chat first. */
function scheduleVisit() {
    clearTimeout(visitTimer);
    visitTimer = setTimeout(recordVisit, 400);
}

function recordVisit() {
    if (travelling) {
        return;
    }
    const place = getCurrentPlace();
    if (!place || samePlace(place, visited[visitIndex])) {
        return;
    }
    visited.splice(visitIndex + 1);
    visited.push(place);
    if (visited.length > 50) {
        visited.shift();
    }
    visitIndex = visited.length - 1;
    onHistoryChange();
}

export function canGoBack() {
    return visitIndex > 0;
}

export function canGoForward() {
    return visitIndex < visited.length - 1;
}

/** Opens the previous (-1) or next (+1) chat in the history. */
export async function travel(step) {
    const index = visitIndex + step;
    const place = visited[index];
    if (!place || travelling) {
        return;
    }
    travelling = true;
    try {
        await openEntry(place);
        visitIndex = index;
    } finally {
        // outlast the pending visit record, so the trip itself isn't recorded
        setTimeout(() => {
            travelling = false;
            onHistoryChange();
        }, 500);
    }
}

/**
 * @param {object} options
 * @param {() => object} options.settings Returns the theme settings
 * @param {() => void} [options.historyChanged] Called when back/forward availability changes
 * @param {() => void} options.opened Called once a chat from the list is open
 */
export function initChatList({ settings, opened, historyChanged }) {
    getSettings = settings;
    onOpen = opened;
    onHistoryChange = historyChanged ?? onHistoryChange;
    createChatList();

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        scheduleVisit();
        markCurrentChat();
        scheduleRefresh(300);
    });
    for (const type of [eventTypes.MESSAGE_SENT, eventTypes.MESSAGE_RECEIVED, eventTypes.MESSAGE_DELETED, eventTypes.MESSAGE_EDITED,
        eventTypes.CHAT_DELETED, eventTypes.GROUP_CHAT_DELETED, eventTypes.CHAT_CREATED, eventTypes.GROUP_CHAT_CREATED,
        eventTypes.CHAT_RENAMED, eventTypes.CHARACTER_DELETED, eventTypes.CHARACTER_RENAMED, eventTypes.GROUP_UPDATED]) {
        if (type) {
            eventSource.on(type, () => scheduleRefresh());
        }
    }
    recordVisit();
    refreshChatList();
}
