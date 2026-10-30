// The Teams chat list: SillyTavern's recent chats (the same list as its welcome screen) as
// Favorites and Chats, group chats as teams with their channels, and back/forward between chats.

import { createMonogram, monogramizeAll } from './monograms.js';
import { toggleFlyout } from './flyout.js';
import { formatListTime } from './times.js';
import { isOn, own } from './own.js';
import { button, channelName, el, fluentButton, iconButton, t, toggleDrawer } from './util.js';

const LIST_ID = 'mst-list';
/** SillyTavern's own pinned chats, kept in account storage by welcome-screen.js */
const PINNED_KEY = 'pinnedChats';
const COLLAPSED_KEY = 'mst-collapsed-sections';
const COLLAPSED_TEAMS_KEY = 'mst-collapsed-teams';

let getSettings = () => ({ recentMax: 50, chatListLines: 'message' });
/** @type {Array<object>} */
let entries = [];
let filterText = '';
let requestId = 0;
let refreshTimer = 0;
let onOpen = () => {};
let onCustomize = () => {};

/** Opens or closes every section and team in the list. */
function setAllCollapsed(list, collapsed) {
    list.querySelectorAll('.mst-section').forEach(section => section.classList.toggle('mst-section-collapsed', collapsed));
    list.querySelectorAll('.mst-team').forEach(team => team.classList.toggle('mst-team-collapsed', collapsed));
    setCollapsed(collapsed ? [...list.querySelectorAll('.mst-section')].map(x => x.dataset.section) : []);
    setCollapsed(collapsed ? [...list.querySelectorAll('.mst-team')].map(x => x.dataset.group) : [], COLLAPSED_TEAMS_KEY);
}

/** SillyTavern's key for a pinned chat (welcome-screen.js), so its pins and these favorites are one list */
function pinKey({ group, avatar, fileName }) {
    return `${group ? 'group_' + group : ''}${avatar ? 'char_' + avatar : ''}_${fileName}`;
}

function getPinState() {
    try {
        return JSON.parse(SillyTavern.getContext().accountStorage.getItem(PINNED_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

function getPinned() {
    return Object.values(getPinState());
}

function isFavorite(place) {
    return Object.hasOwn(getPinState(), pinKey(place));
}

/** Adds a chat to Favorites, or takes it off. */
function toggleFavorite(place) {
    const state = getPinState();
    const key = pinKey(place);
    if (Object.hasOwn(state, key)) {
        delete state[key];
    } else {
        state[key] = { group: place.group || undefined, avatar: place.avatar || undefined, file_name: place.fileName };
    }
    SillyTavern.getContext().accountStorage.setItem(PINNED_KEY, JSON.stringify(state));
    refreshChatList();
}

/** The … menu of a chat or channel (also its right-click menu). */
function openItemMenu(anchor, place) {
    const favorite = isFavorite(place);
    toggleFlyout(anchor, [
        { label: 'Open', icon: 'fa-regular fa-comment', run: () => openEntry(place) },
        favorite
            ? { label: 'Remove from favorites', icon: 'fa-solid fa-star', run: () => toggleFavorite(place) }
            : { label: 'Favorite', icon: 'fa-regular fa-star', run: () => toggleFavorite(place) },
        { label: 'Delete', icon: 'fa-solid fa-trash-can', run: () => deleteChat(place) },
    ], 'below-end');
}

/**
 * Deletes a chat so its row leaves the list. An open chat is closed first: deleting the open one
 * from Chat History makes SillyTavern start a new chat at once when it was the character's last.
 */
async function deleteChat(place) {
    const context = SillyTavern.getContext();
    const confirmed = await context.callGenericPopup(`<h3>${t('Delete this chat?')}</h3>`, context.POPUP_TYPE.CONFIRM);
    if (confirmed !== context.POPUP_RESULT.AFFIRMATIVE) {
        return;
    }
    const { closeCurrentChat, deleteCharacterChatByName } = await import('/script.js');
    const open = place.group ? String(context.groupId) === String(place.group) : isCurrent(place);
    if (open && context.getCurrentChatId() === place.fileId && !await closeCurrentChat()) {
        return;
    }
    if (isFavorite(place)) {
        toggleFavorite(place);
    }
    if (place.group) {
        const { deleteGroupChatByName } = await import('/scripts/group-chats.js');
        await deleteGroupChatByName(place.group, place.fileId);
    } else {
        await deleteCharacterChatByName(String(context.characters.findIndex(x => x.avatar === place.avatar)), place.fileId);
    }
    // back and forward must not lead to the deleted chat
    for (let i = visited.length - 1; i >= 0; i--) {
        if (visited[i].fileId === place.fileId) {
            visited.splice(i, 1);
            if (i <= visitIndex) {
                visitIndex--;
            }
        }
    }
    onHistoryChange();
    refreshChatList();
}

function moreButton() {
    return iconButton('mst-chat-more', t('More options'), 'fa-solid fa-ellipsis');
}

function getCollapsed(key = COLLAPSED_KEY) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function setCollapsed(list, key = COLLAPSED_KEY) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
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
    const item = el('div', 'mst-chat');
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.dataset.key = entry.key;
    item.title = entry.title;
    if (isCurrent(entry)) {
        item.classList.add('mst-chat-active');
        item.setAttribute('aria-current', 'true');
    }

    const avatar = el('span', 'mst-avatar');
    if (entry.group) {
        avatar.style.background = 'none';
        avatar.append(createMonogram(entry.team, 'mst-team-avatar'));
    } else {
        const img = /** @type {HTMLImageElement} */ (el('img'));
        img.width = img.height = 32;
        img.src = entry.thumb;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        avatar.append(img, el('span', 'mst-presence'));
    }

    // the setting picks what the two lines show; a group chat's name is already its channel
    const lines = getSettings().chatListLines;
    const title = lines === 'chat-title' && !entry.group ? entry.fileId : entry.name;
    const detail = lines === 'chat' ? (entry.group ? entry.team : entry.fileId) : entry.preview;
    item.dataset.mstPerson = entry.name;

    const top = el('span', 'mst-chat-top');
    top.append(el('span', 'mst-chat-name', title), el('span', 'mst-chat-time', entry.time));
    const text = el('span', 'mst-chat-text');
    text.append(top, el('span', 'mst-chat-preview', detail));

    item.append(avatar, text, moreButton());
    return item;
}

/** Each group is a team, and each of its chats a channel under it. */
function buildTeams(needle) {
    const context = SillyTavern.getContext();
    const collapsed = new Set(getCollapsed(COLLAPSED_TEAMS_KEY));
    const groups = [...context.groups].sort((a, b) => (Number(b.date_last_chat) || 0) - (Number(a.date_last_chat) || 0));
    const teams = [];
    for (const group of groups) {
        const chats = Array.isArray(group.chats) ? group.chats : [];
        const teamMatches = !needle || group.name.toLowerCase().includes(needle);
        const channels = chats.filter(chatId => teamMatches || channelName(group, chatId).toLowerCase().includes(needle));
        if (!teamMatches && !channels.length) {
            continue;
        }
        const id = String(group.id);
        const team = el('div', 'mst-team');
        team.dataset.group = id;
        const isCollapsed = collapsed.has(id) && !needle;
        team.classList.toggle('mst-team-collapsed', isCollapsed);

        const head = el('div', 'mst-team-head');
        head.setAttribute('role', 'button');
        head.tabIndex = 0;
        head.setAttribute('aria-expanded', String(!isCollapsed));
        head.title = group.name;
        head.append(el('i', 'fa-solid fa-chevron-down mst-team-chevron'), createMonogram(group.name, 'mst-team-avatar'), el('span', 'mst-team-name', group.name));

        const list = el('div', 'mst-channels');
        for (const chatId of channels) {
            const channel = el('div', 'mst-channel');
            channel.setAttribute('role', 'button');
            channel.tabIndex = 0;
            channel.dataset.group = id;
            channel.dataset.file = chatId;
            channel.title = chatId;
            channel.append(document.createTextNode(channelName(group, chatId)), moreButton());
            list.append(channel);
        }
        team.append(head, list);
        teams.push(team);
    }
    return teams;
}

function buildSection(id, label, items, children) {
    const collapsed = getCollapsed().includes(id);
    const section = el('section', 'mst-section');
    section.dataset.section = id;
    section.classList.toggle('mst-section-collapsed', collapsed);

    const head = button('mst-section-head');
    head.setAttribute('aria-expanded', String(!collapsed));
    head.append(el('i', 'fa-solid fa-chevron-down'), el('span', '', label));

    const body = el('div', 'mst-section-items');
    body.append(...(children ?? items.map(buildItem)));
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

    // Favorites are SillyTavern's pinned chats; group chats otherwise live under their team
    const favorites = visible.filter(entry => entry.pinned);
    const chats = visible.filter(entry => !entry.pinned && !entry.group);
    const teams = buildTeams(needle);
    const sections = [];
    // Favorites is always there, as in Teams
    const hint = el('div', 'mst-list-hint', t('Use … on a chat to add it to Favorites.'));
    sections.push(buildSection('pinned', t('Favorites'), favorites, favorites.length ? undefined : [hint]));
    sections.push(buildSection('recent', t('Chats'), chats));
    if (teams.length) {
        sections.push(buildSection('teams', t('Teams and channels'), [], teams));
    }
    body.replaceChildren(...sections);

    if (!visible.length && !teams.length) {
        body.append(el('div', 'mst-list-empty', needle ? t('No chats match your search') : t('No chats yet. Start one with the pen button above.')));
    }
    markCurrentChat();
    monogramizeAll(body, '.mst-chat .mst-avatar img', img => img.closest('.mst-chat')?.dataset.mstPerson ?? '');
}

/** Moves the highlight to the open chat without fetching the list again. */
export function markCurrentChat() {
    const list = document.getElementById(LIST_ID);
    if (!list) {
        return;
    }
    const context = SillyTavern.getContext();
    for (const channel of list.querySelectorAll('.mst-channel')) {
        const current = String(context.groupId) === channel.dataset.group && context.getCurrentChatId() === channel.dataset.file;
        channel.classList.toggle('mst-chat-active', current);
        channel.toggleAttribute('aria-current', current);
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
            // a group chat is a channel: its name, with its team's picture
            name: character?.name || (group ? channelName(group, fileId) : ''),
            team: group?.name || '',
            title: `${character?.name || group?.name || ''}: ${fileId}`,
            avatar: chat.avatar || '',
            group: chat.group || '',
            thumb: character ? context.getThumbnailUrl('avatar', character.avatar) : '',
            fileId,
            fileName: chat.file_name,
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
    if (!isOn()) {
        return;
    }
    refreshTimer = setTimeout(refreshChatList, delay);
}

export function filterChatList(text) {
    filterText = String(text ?? '');
    render();
}

/** Where a chat list row leads: { group, avatar, fileId, fileName } */
function placeOf(row) {
    if (row?.classList.contains('mst-channel')) {
        return { group: row.dataset.group, avatar: '', fileId: row.dataset.file, fileName: `${row.dataset.file}.jsonl` };
    }
    const entry = row && entries.find(x => x.key === row.dataset.key);
    return entry ? { group: entry.group, avatar: entry.avatar, fileId: entry.fileId, fileName: entry.fileName } : null;
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
                const card = el('div', 'group_select mst-hidden-card');
                card.setAttribute('data-grid', entry.group);
                document.body.append(own(card));
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
    list = el('aside');
    list.id = LIST_ID;
    list.setAttribute('aria-label', t('Chat'));

    const head = el('div', 'mst-list-head');
    const title = el('h2', '', t('Chat'));
    const actions = el('div', 'mst-list-actions');

    const listButton = (className, label, icon) => fluentButton(`mst-icon-button ${className}`, t(label), icon);
    const openCharacters = (buttonId) => {
        const drawer = document.getElementById('right-nav-panel');
        if (drawer && !drawer.classList.contains('openDrawer')) {
            toggleDrawer('rightNavHolder');
        }
        document.getElementById(buttonId)?.click();
    };

    // Teams' list header: Chat, then … , search, and new chat with its dropdown
    const listMore = listButton('mst-list-more', 'More options', 'more');
    listMore.addEventListener('click', () => toggleFlyout(listMore, [
        { label: 'Expand all', icon: 'fa-solid fa-angles-down', run: () => setAllCollapsed(list, false) },
        { label: 'Collapse all', icon: 'fa-solid fa-angles-up', run: () => setAllCollapsed(list, true) },
        { label: 'Refresh', icon: 'fa-solid fa-arrows-rotate', run: () => refreshChatList() },
        { label: 'Customize theme', icon: 'fa-solid fa-palette', run: () => onCustomize() },
    ], 'below-end'));
    const filterButton = listButton('mst-list-search', 'Search', 'search');
    const newGroup = el('div', 'mst-split');
    const newButton = listButton('mst-split-main', 'New chat', 'compose');
    newButton.addEventListener('click', () => openCharacters('rm_button_characters'));
    const newMenu = listButton('mst-split-menu', 'More ways to start a chat', 'chevron-down');
    newMenu.addEventListener('click', () => toggleFlyout(newMenu, [
        { label: 'New chat', icon: 'fa-regular fa-comment', run: () => openCharacters('rm_button_characters') },
        { label: 'New group chat', icon: 'fa-solid fa-user-group', run: () => openCharacters('rm_button_group_chats') },
        { label: 'New contact', icon: 'fa-solid fa-user-plus', run: () => openCharacters('rm_button_create') },
    ], 'below-end'));
    newGroup.append(newButton, newMenu);

    actions.append(listMore, filterButton, newGroup);
    // Teams mobile starts the bar with your picture, which opens your profiles
    const me = iconButton('mst-list-me', t('Persona'));
    me.addEventListener('click', () => document.getElementById('mst-me')?.click());
    head.append(me, title, actions);

    const filterRow = el('div', 'mst-list-filter');
    filterRow.hidden = true;
    const filterInput = /** @type {HTMLInputElement} */ (el('input', 'mst-input'));
    filterInput.type = 'search';
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

    const body = el('div', 'mst-list-body');
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
        const more = /** @type {HTMLElement} */ (target.closest('.mst-chat-more'));
        if (more) {
            const place = placeOf(more.parentElement);
            if (place) {
                openItemMenu(more, place);
            }
            return;
        }
        const teamHead = /** @type {HTMLElement} */ (target.closest('.mst-team-head'));
        if (teamHead) {
            const team = /** @type {HTMLElement} */ (teamHead.closest('.mst-team'));
            const collapsed = team.classList.toggle('mst-team-collapsed');
            teamHead.setAttribute('aria-expanded', String(!collapsed));
            const ids = new Set(getCollapsed(COLLAPSED_TEAMS_KEY));
            collapsed ? ids.add(team.dataset.group) : ids.delete(team.dataset.group);
            setCollapsed([...ids], COLLAPSED_TEAMS_KEY);
            return;
        }
        const channel = /** @type {HTMLElement} */ (target.closest('.mst-channel'));
        if (channel) {
            openEntry({ group: channel.dataset.group, avatar: '', fileId: channel.dataset.file });
            return;
        }
        const item = target.closest('.mst-chat');
        const entry = item && entries.find(x => x.key === item.dataset.key);
        if (entry) {
            openEntry(entry);
        }
    });
    body.addEventListener('contextmenu', (event) => {
        const row = /** @type {HTMLElement} */ (event.target).closest?.('.mst-chat, .mst-channel');
        const place = row && placeOf(row);
        if (place) {
            event.preventDefault();
            openItemMenu(row.querySelector('.mst-chat-more') ?? row, place);
        }
    });
    body.addEventListener('keydown', (event) => {
        const item = /** @type {HTMLElement} */ (event.target).closest?.('.mst-chat, .mst-channel, .mst-team-head');
        if (item && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            item.click();
        }
    });

    list.append(head, filterRow, body);
    document.body.append(own(list));
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
 * @param {() => void} options.opened Called once a chat from the list is open
 * @param {() => void} [options.historyChanged] Called when back/forward availability changes
 * @param {() => void} [options.customize] Opens the Customize page
 * @returns {Promise<void>} Resolves once the list has its first chats.
 */
export function initChatList({ settings, opened, historyChanged, customize }) {
    getSettings = settings;
    onCustomize = customize ?? onCustomize;
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
    return refreshChatList();
}
