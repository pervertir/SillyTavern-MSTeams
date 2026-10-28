// The Teams frame around SillyTavern: the title bar with search, the app rail built from
// SillyTavern's own menu buttons, and the chat header above the messages.

import { canGoBack, canGoForward, filterChatList, travel } from './chatlist.js';
import { isPlaceholder, monogramize } from './monograms.js';
import { RAIL_SHORTCUTS, SHORTCUTS, showShortcuts, withShortcut } from './shortcuts.js';

const TITLEBAR_ID = 'mst-titlebar';
const CHAT_APP_ID = 'mst-app-chat';
const HEADER_ID = 'mst-chat-head';

/** SillyTavern's menus down the rail, each wearing a Teams-style icon under a short name (tooltips
    give SillyTavern's full names, from RAIL_SHORTCUTS). Chat (the chat list, order 3) sits between
    them, then More (…) holds Backgrounds, Persona and Characters; Extensions sits at the bottom. */
const RAIL_APPS = [
    { id: 'ai-config-button', label: 'AI Config', icon: 'bell', order: 1 },
    { id: 'sys-settings-button', label: 'API', icon: 'calendar', order: 2 },
    { id: 'advanced-formatting-button', label: 'Response Format', icon: 'call', order: 4 },
    { id: 'WI-SP-button', label: 'World Info', icon: 'cloud', order: 5 },
    { id: 'user-settings-button', label: 'User Settings', icon: 'copilot', order: 6 },
    { id: 'backgrounds-button', label: 'Backgrounds', icon: 'image', order: 7 },
    { id: 'persona-management-button', label: 'Persona', icon: 'person', order: 8 },
    { id: 'rightNavHolder', label: 'Characters', icon: 'people', order: 9 },
    { id: 'extensions-settings-button', label: 'Extensions', icon: 'apps', order: 20 },
];

/** On phones the bottom bar has room for five tabs, as in Teams mobile; these move under More */
const PHONE_MORE_APPS = [
    { id: 'WI-SP-button', label: 'World Info', icon: 'fa-solid fa-cloud' },
    { id: 'user-settings-button', label: 'User Settings', icon: 'fa-regular fa-comment-dots' },
    { id: 'backgrounds-button', label: 'Backgrounds', icon: 'fa-regular fa-image' },
    { id: 'persona-management-button', label: 'Persona', icon: 'fa-regular fa-id-badge' },
    { id: 'rightNavHolder', label: 'Characters', icon: 'fa-regular fa-address-book' },
    { id: 'extensions-settings-button', label: 'Extensions', icon: 'fa-regular fa-square-plus' },
];

const MORE_APP_ID = 'mst-app-more';

function t(text) {
    return SillyTavern.getContext().translate(text);
}

/** An icon button drawn with one of the theme's Fluent icons (--mst-icon-<name>). */
function fluentButton(className, title, iconName) {
    const element = button(className, title, 'mst-fluent');
    element.querySelector('i').style.setProperty('--mst-glyph', `var(--mst-icon-${iconName})`);
    return element;
}

function button(className, title, icon) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.title = title;
    element.setAttribute('aria-label', title);
    const glyph = document.createElement('i');
    glyph.className = icon;
    element.append(glyph);
    return element;
}

/** Clicks a SillyTavern drawer's toggle, the way its own top bar does. */
function toggleDrawer(drawerId) {
    document.querySelector(`#${drawerId} > .drawer-toggle`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Closes every open drawer. */
export function closeDrawers() {
    for (const content of document.querySelectorAll('#top-settings-holder .drawer-content.openDrawer')) {
        if (content.classList.contains('pinnedOpen')) {
            // Teams has no pinned panels and the theme hides the pins, so a pinned one gets unpinned
            /** @type {HTMLInputElement} */ (content.querySelector('input[id$="_panel_pin"]'))?.click();
        }
        const drawer = content.closest('.drawer');
        if (drawer?.id) {
            toggleDrawer(drawer.id);
        }
    }
}

/** Clicks an entry of SillyTavern's chat options menu (the ☰ by the message box). */
function clickOption(id) {
    const options = [...document.querySelectorAll(`#options #${id}`)];
    (options.find(x => !x.classList.contains('displayNone')) ?? options[0])?.click();
}

function createTitlebar() {
    if (document.getElementById(TITLEBAR_ID)) {
        return;
    }
    const bar = document.createElement('header');
    bar.id = TITLEBAR_ID;

    const left = document.createElement('div');
    left.className = 'mst-tb-left';
    const railToggle = fluentButton('mst-icon-button mst-tb-rail', t('Hide app bar'), 'panel');
    railToggle.id = 'mst-rail-toggle';
    railToggle.addEventListener('click', () => shellOptions.toggleRail());
    const nav = document.createElement('div');
    nav.className = 'mst-tb-nav';
    const back = fluentButton('mst-icon-button', withShortcut(t('Back'), SHORTCUTS.back), 'arrow-left');
    back.id = 'mst-nav-back';
    back.addEventListener('click', () => travel(-1));
    const forward = fluentButton('mst-icon-button', withShortcut(t('Forward'), SHORTCUTS.forward), 'arrow-right');
    forward.id = 'mst-nav-forward';
    forward.addEventListener('click', () => travel(1));
    nav.append(back, forward);
    // Microsoft's app launcher: every app, rail or not
    const waffle = document.createElement('button');
    waffle.type = 'button';
    waffle.className = 'mst-icon-button mst-waffle';
    waffle.title = t('App launcher');
    waffle.setAttribute('aria-label', t('App launcher'));
    for (let i = 0; i < 9; i++) {
        waffle.append(document.createElement('span'));
    }
    waffle.addEventListener('click', () => toggleFlyout(waffle, [
        { label: 'AI Config', icon: 'fa-regular fa-bell', run: () => toggleDrawer('ai-config-button') },
        { label: 'API', icon: 'fa-regular fa-calendar', run: () => toggleDrawer('sys-settings-button') },
        {
            label: 'Chat', icon: 'fa-regular fa-comments', run: () => {
                closeDrawers();
                document.body.classList.remove('mst-m-chat');
            },
        },
        { label: 'Response Format', icon: 'fa-solid fa-phone', run: () => toggleDrawer('advanced-formatting-button') },
        ...PHONE_MORE_APPS.map(({ id, label, icon }) => ({ label, icon, run: () => toggleDrawer(id) })),
    ], 'beside'));
    const leftTools = document.createElement('div');
    leftTools.className = 'mst-tb-launch';
    leftTools.append(waffle, railToggle);
    left.append(leftTools, nav);

    const search = document.createElement('label');
    search.className = 'mst-search';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-magnifying-glass';
    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'mst-search-input';
    input.placeholder = withShortcut(t('Search'), SHORTCUTS.search);
    input.autocomplete = 'off';
    input.addEventListener('input', () => {
        filterChatList(input.value);
        if (input.value) {
            document.body.classList.remove('mst-m-chat');
        }
    });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            input.value = '';
            filterChatList('');
            input.blur();
        }
    });
    search.append(icon, input);

    const right = document.createElement('div');
    right.className = 'mst-tb-right';
    const more = fluentButton('mst-icon-button', t('Settings and more'), 'more');
    more.addEventListener('click', () => toggleFlyout(more, [
        { label: 'User Settings', icon: 'fa-solid fa-gear', run: () => toggleDrawer('user-settings-button') },
        { label: 'Keyboard shortcuts', icon: 'fa-regular fa-keyboard', run: showShortcuts },
        { label: 'Customize theme', icon: 'fa-solid fa-palette', run: () => shellOptions.customize?.() },
        document.body.classList.contains('mst-dark')
            ? { label: 'Switch to light theme', icon: 'fa-regular fa-sun', run: () => shellOptions.setTheme('light') }
            : { label: 'Switch to dark theme', icon: 'fa-regular fa-moon', run: () => shellOptions.setTheme('dark') },
    ], 'below-end'));
    const me = document.createElement('button');
    me.type = 'button';
    me.id = 'mst-me';
    me.title = t('Persona');
    me.setAttribute('aria-label', t('Persona'));
    const meAvatar = document.createElement('span');
    meAvatar.className = 'mst-avatar';
    const meImg = document.createElement('img');
    meImg.alt = '';
    const presence = document.createElement('span');
    presence.className = 'mst-presence mst-presence-on';
    const monogram = document.createElement('span');
    monogram.className = 'mst-monogram';
    monogram.setAttribute('aria-hidden', 'true');
    meAvatar.append(meImg, monogram, presence);
    me.append(meAvatar);
    me.addEventListener('click', () => toggleDrawer('persona-management-button'));
    right.append(more, me);

    bar.append(left, search, right);
    document.body.append(bar);
}

/** Teams' square team picture with the team's initials */
function buildTeamMonogram(name) {
    const monogram = document.createElement('span');
    monogram.className = 'mst-monogram mst-team-avatar';
    monogram.textContent = getInitials(name);
    monogram.dataset.mstColor = String(getMonogramColor(name));
    return monogram;
}

/** Teams' colorful avatar palette; a name always gets the same color */
const MONOGRAM_COLORS = 10;

/** Initials the way Teams shows them: first and last word, or one letter for a single word. */
export function getInitials(name) {
    const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return '?';
    }
    const first = [...words[0]][0] ?? '';
    const last = words.length > 1 ? [...words[words.length - 1]][0] ?? '' : '';
    return (first + last).toUpperCase();
}

function getMonogramColor(name) {
    let hash = 0;
    for (const char of String(name ?? '')) {
        hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }
    return hash % MONOGRAM_COLORS;
}

/** Shows the user's persona in the title bar: a monogram of its name, or its picture. */
export function refreshPersona(avatarId) {
    const img = /** @type {HTMLImageElement} */ (document.querySelector('#mst-me img'));
    if (!img) {
        return;
    }
    const name = SillyTavern.getContext().name1;
    const monogram = /** @type {HTMLElement} */ (document.querySelector('#mst-me .mst-monogram'));
    if (monogram) {
        monogram.textContent = getInitials(name);
        monogram.dataset.mstColor = String(getMonogramColor(name));
    }
    const me = document.getElementById('mst-me');
    me.title = name ? `${name} (${t('Persona')})` : t('Persona');
    const { getThumbnailUrl } = SillyTavern.getContext();
    let src = '';
    if (avatarId) {
        src = getThumbnailUrl('persona', avatarId);
    } else {
        const selected = document.querySelector('#user_avatar_block .avatar-container.selected');
        const id = selected?.getAttribute('data-avatar-id') || selected?.getAttribute('imgfile');
        src = id ? getThumbnailUrl('persona', id) : (selected?.querySelector('img')?.getAttribute('src') ?? '');
    }
    if (src) {
        img.src = src;
    }
    // no picture of its own (SillyTavern's default silhouette): the monogram stands in
    isPlaceholder(img.getAttribute('src') ?? '').then((placeholder) => {
        document.getElementById('mst-me')?.classList.toggle('mst-me-placeholder', placeholder);
        mirrorPersona();
    });
    mirrorPersona();
}

/** The chat list's picture button on phones shows the same persona picture as the title bar. */
function mirrorPersona() {
    const source = document.querySelector('#mst-me .mst-avatar');
    for (const button of document.querySelectorAll('.mst-list-me')) {
        button.replaceChildren(...(source ? [source.cloneNode(true)] : []));
        button.classList.toggle('mst-me-placeholder', !!document.getElementById('mst-me')?.classList.contains('mst-me-placeholder'));
    }
}

/** A rail app of the theme's own (Chat, More), built like SillyTavern's drawer toggles. */
function railApp(id, label, icon, onClick) {
    const app = document.createElement('div');
    app.id = id;
    app.className = 'mst-app';
    app.setAttribute('role', 'button');
    app.tabIndex = 0;
    app.title = railTooltip(id, label);
    app.dataset.mstIcon = icon;
    const glyph = document.createElement('i');
    glyph.className = 'mst-app-icon';
    const text = document.createElement('span');
    text.className = 'mst-app-label';
    text.textContent = t(label);
    app.append(glyph, text);
    app.addEventListener('click', onClick);
    app.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            app.click();
        }
    });
    return app;
}

const FLYOUT_ID = 'mst-flyout';
let flyoutAnchor = null;

function closeFlyout() {
    const flyout = document.getElementById(FLYOUT_ID);
    if (flyout) {
        flyout.hidden = true;
    }
    flyoutAnchor?.classList.remove('mst-app-open');
    flyoutAnchor = null;
}

function getFlyout() {
    let flyout = document.getElementById(FLYOUT_ID);
    if (flyout) {
        return flyout;
    }
    flyout = document.createElement('div');
    flyout.id = FLYOUT_ID;
    flyout.setAttribute('role', 'menu');
    flyout.hidden = true;
    document.body.append(flyout);
    document.addEventListener('pointerdown', (event) => {
        const target = /** @type {Node} */ (event.target);
        if (!flyout.hidden && !flyout.contains(target) && !flyoutAnchor?.contains(target)) {
            closeFlyout();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !flyout.hidden) {
            closeFlyout();
        }
    });
    return flyout;
}

/**
 * Opens a Teams menu next to a button, or closes it when it's already open there.
 * @param {HTMLElement} anchor
 * @param {{label: string, icon: string, run: () => void}[]} items
 * @param {'beside'|'below-end'} placement
 */
export function toggleFlyout(anchor, items, placement) {
    const flyout = getFlyout();
    if (!flyout.hidden && flyoutAnchor === anchor) {
        closeFlyout();
        return;
    }
    closeFlyout();
    flyout.replaceChildren(...items.map(({ label, icon, run }) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'mst-more-item';
        item.setAttribute('role', 'menuitem');
        const glyph = document.createElement('i');
        glyph.className = icon;
        const text = document.createElement('span');
        text.textContent = t(label);
        item.append(glyph, text);
        item.addEventListener('click', () => {
            closeFlyout();
            run();
        });
        return item;
    }));
    flyout.dataset.placement = placement;
    flyout.hidden = false;
    flyoutAnchor = anchor;
    anchor.classList.add('mst-app-open');
    const box = anchor.getBoundingClientRect();
    flyout.style.setProperty('--mst-flyout-top', `${Math.round(placement === 'beside' ? box.top : box.bottom + 4)}px`);
    flyout.style.setProperty('--mst-flyout-left', `${Math.round(box.right + 4)}px`);
    flyout.style.setProperty('--mst-flyout-right', `${Math.round(window.innerWidth - box.right)}px`);
    /** @type {HTMLElement} */ (flyout.querySelector('.mst-more-item'))?.focus();
}

/** Ctrl+Alt+E / ⌘⌥E: the title bar's search, or the list's filter on phones where the bar is hidden. */
export function focusSearch() {
    const search = /** @type {HTMLInputElement} */ (document.getElementById('mst-search-input'));
    if (search && search.offsetParent) {
        search.focus();
        search.select();
        return;
    }
    document.body.classList.remove('mst-m-chat');
    const filter = document.querySelector('#mst-list .mst-list-filter');
    if (filter?.hidden) {
        /** @type {HTMLElement} */ (document.querySelector('#mst-list .mst-list-search'))?.click();
    } else {
        /** @type {HTMLInputElement} */ (filter?.querySelector('input'))?.focus();
    }
}

export function startNewChat() {
    clickOption('option_start_new_chat');
}

function openProfile() {
    const panel = document.getElementById('right-nav-panel');
    if (!panel?.classList.contains('openDrawer')) {
        toggleDrawer('rightNavHolder');
    }
}

/** Menus that open from More (…) on the desktop rail */
const MORE_APPS = PHONE_MORE_APPS.filter(({ id }) => ['backgrounds-button', 'persona-management-button', 'rightNavHolder'].includes(id));

/** More: the menus without a rail icon of their own (on phones, everything past the first four) */
function toggleMoreMenu() {
    const app = document.getElementById(MORE_APP_ID);
    const phone = window.matchMedia('(max-width: 1000px)').matches;
    const items = (phone ? PHONE_MORE_APPS : MORE_APPS)
        .filter(({ id }) => document.getElementById(id))
        .map(({ id, label, icon }) => ({
            label,
            icon,
            run: () => {
                if (!document.querySelector(`#${id} > .drawer-content`)?.classList.contains('openDrawer')) {
                    toggleDrawer(id);
                }
            },
        }));
    toggleFlyout(app, items, 'beside');
}

/** Teams' tooltip for a rail app: its full name and shortcut. */
function railTooltip(id, label) {
    const shortcut = RAIL_SHORTCUTS.find(x => x.id === id);
    return shortcut ? withShortcut(t(shortcut.label), shortcut.keys) : t(label);
}

/** Gives one of SillyTavern's menu buttons a Teams tooltip, keeping its own for when the theme is off. */
function nameRailApp(drawer, label) {
    const tooltip = railTooltip(drawer.id, label);
    for (const element of drawer.querySelectorAll(':scope > .drawer-toggle, :scope > .drawer-toggle > .drawer-icon')) {
        if (element.dataset.mstTitle === undefined) {
            element.dataset.mstTitle = element.getAttribute('title') ?? '';
        }
        element.setAttribute('title', tooltip);
    }
}

/** Puts SillyTavern's own tooltips back on its menu buttons (theme off), or Teams' (theme on). */
export function setRailTooltips(teams) {
    for (const { id, label } of RAIL_APPS) {
        const drawer = document.getElementById(id);
        if (!drawer) {
            continue;
        }
        if (teams) {
            nameRailApp(drawer, label);
            continue;
        }
        for (const element of drawer.querySelectorAll('[data-mst-title]')) {
            if (element.dataset.mstTitle) {
                element.setAttribute('title', element.dataset.mstTitle);
            } else {
                element.removeAttribute('title');
            }
            delete element.dataset.mstTitle;
        }
    }
}

function createRail() {
    const holder = document.getElementById('top-settings-holder');
    if (!holder) {
        return;
    }
    if (!document.getElementById(CHAT_APP_ID)) {
        holder.prepend(railApp(CHAT_APP_ID, 'Chat', 'chat', () => {
            closeDrawers();
            closeFlyout();
            document.body.classList.remove('mst-m-chat');
        }));
    }
    if (!document.getElementById(MORE_APP_ID)) {
        holder.append(railApp(MORE_APP_ID, 'More', 'more', toggleMoreMenu));
    }
    for (const { id, label, icon, order } of RAIL_APPS) {
        const drawer = document.getElementById(id);
        const toggle = drawer?.querySelector(':scope > .drawer-toggle');
        if (!toggle) {
            continue;
        }
        drawer.style.setProperty('--mst-order', String(order));
        drawer.dataset.mstIcon = icon;
        toggle.dataset.mstLabel = t(label);
        nameRailApp(drawer, label);
        toggle.addEventListener('click', closeFlyout);
    }
    for (const { id } of PHONE_MORE_APPS) {
        document.getElementById(id)?.classList.add('mst-more-drawer');
    }
    for (const { id } of MORE_APPS) {
        document.getElementById(id)?.classList.add('mst-more-only');
    }
}

function createHeader() {
    const sheld = document.getElementById('sheld');
    if (!sheld || document.getElementById(HEADER_ID)) {
        return;
    }
    const head = document.createElement('div');
    head.id = HEADER_ID;

    const back = button('mst-icon-button mst-back', t('Back'), 'fa-solid fa-arrow-left');
    back.addEventListener('click', () => document.body.classList.remove('mst-m-chat'));

    const who = document.createElement('button');
    who.type = 'button';
    who.className = 'mst-head-who';
    who.title = t('View profile');
    const avatar = document.createElement('span');
    avatar.className = 'mst-avatar';
    const name = document.createElement('span');
    name.className = 'mst-head-name';
    who.append(avatar, name);
    who.addEventListener('click', openProfile);

    const tabs = document.createElement('nav');
    tabs.className = 'mst-tabs';
    const tab = document.createElement('span');
    tab.className = 'mst-tab mst-tab-active';
    tab.textContent = t('Chat');
    const shared = document.createElement('button');
    shared.type = 'button';
    shared.className = 'mst-tab';
    shared.textContent = t('Shared');
    shared.addEventListener('click', openProfile);
    const add = fluentButton('mst-tab mst-tab-add', t('Add a tab'), 'add');
    add.addEventListener('click', () => toggleDrawer('extensions-settings-button'));
    tabs.append(tab, shared, add);

    const actions = document.createElement('div');
    actions.className = 'mst-head-actions';
    const fresh = fluentButton('mst-icon-button', withShortcut(t('New chat'), SHORTCUTS.newChat), 'video');
    fresh.addEventListener('click', () => clickOption('option_start_new_chat'));
    const history = fluentButton('mst-icon-button', t('Chat history'), 'call');
    history.addEventListener('click', () => clickOption('option_select_chat'));
    const more = fluentButton('mst-icon-button', t('More options'), 'more');
    more.addEventListener('click', () => toggleFlyout(more, [
        { label: 'New chat', icon: 'fa-regular fa-pen-to-square', run: () => clickOption('option_start_new_chat') },
        { label: 'Chat history', icon: 'fa-solid fa-clock-rotate-left', run: () => clickOption('option_select_chat') },
        { label: 'View profile', icon: 'fa-regular fa-id-card', run: openProfile },
        {
            label: 'Close chat', icon: 'fa-solid fa-xmark', run: () => {
                clickOption('option_close_chat');
                document.body.classList.remove('mst-m-chat');
            },
        },
    ], 'below-end'));
    actions.append(fresh, history, more);

    head.append(back, who, tabs, actions);
    sheld.prepend(head);
}

/** Puts the open chat's character or group in the header. */
export function refreshHeader() {
    const head = document.getElementById(HEADER_ID);
    if (!head) {
        return;
    }
    const context = SillyTavern.getContext();
    const avatar = head.querySelector('.mst-avatar');
    const name = head.querySelector('.mst-head-name');
    avatar.replaceChildren();
    avatar.classList.remove('mst-avatar-group');

    const group = context.groupId ? context.groups.find(x => String(x.id) === String(context.groupId)) : null;
    const character = !group && context.characterId !== undefined ? context.characters[context.characterId] : null;
    const hasChat = !!(group || character);
    document.body.classList.toggle('mst-no-chat', !hasChat);

    head.classList.toggle('mst-head-channel', !!group);
    document.body.classList.toggle('mst-in-channel', !!group);
    if (group) {
        // a group is a team and its chat a channel: the team's square picture, then "Team › Channel"
        avatar.append(buildTeamMonogram(group.name));
        const chatId = context.getCurrentChatId() ?? '';
        const prefix = `${group.name} - `;
        const team = document.createElement('span');
        team.className = 'mst-head-team';
        team.textContent = group.name;
        const channel = document.createElement('span');
        channel.textContent = chatId.startsWith(prefix) ? chatId.slice(prefix.length) : chatId;
        name.replaceChildren(team, channel);
    } else if (character) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = context.getThumbnailUrl('avatar', character.avatar);
        const presence = document.createElement('span');
        presence.className = 'mst-presence';
        avatar.append(img, presence);
        name.textContent = character.name;
        monogramize(img, character.name);
    } else {
        name.textContent = '';
    }
}

/** Teams' empty chat pane, shown while no chat is open */
function createEmptyState() {
    const sheld = document.getElementById('sheld');
    if (!sheld || document.getElementById('mst-empty')) {
        return;
    }
    const empty = document.createElement('div');
    empty.id = 'mst-empty';
    const art = document.createElement('div');
    art.className = 'mst-empty-art';
    art.setAttribute('aria-hidden', 'true');
    const title = document.createElement('h2');
    title.textContent = t('Start a new chat');
    const text = document.createElement('p');
    text.textContent = t('Pick a conversation from the list, or start a new one.');
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'menu_button mst-primary';
    action.textContent = t('New chat');
    action.addEventListener('click', openProfile);
    empty.append(art, title, text, action);
    sheld.append(empty);
}

/** Enables back/forward to match the chat history. */
export function refreshNavigation() {
    const back = /** @type {HTMLButtonElement} */ (document.getElementById('mst-nav-back'));
    const forward = /** @type {HTMLButtonElement} */ (document.getElementById('mst-nav-forward'));
    if (back) {
        back.disabled = !canGoBack();
    }
    if (forward) {
        forward.disabled = !canGoForward();
    }
}

/** Names the title bar's rail button for what it will do. */
export function refreshRailToggle(hidden) {
    const toggle = document.getElementById('mst-rail-toggle');
    if (toggle) {
        const label = t(hidden ? 'Show app bar' : 'Hide app bar');
        toggle.title = label;
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('aria-pressed', String(!hidden));
    }
}

let shellOptions = { toggleRail: () => {}, setTheme: (_appearance) => {} };

/**
 * @param {object} options
 * @param {() => void} options.toggleRail Hides or shows the app rail
 * @param {(appearance: string) => void} options.setTheme Switches between light and dark
 */
/**
 * Mirrors which menus are open as classes (drawer.mst-open; body.mst-menu-open, mst-more-open,
 * mst-phone-more-open), so the styles don't need page-wide :has() checks, which make the browser
 * re-check the whole page on every change (each streamed word of a reply, for one).
 */
function trackDrawers() {
    const drawers = [...document.querySelectorAll('#top-settings-holder > .drawer')];
    const update = () => {
        let any = false, more = false, phoneMore = false;
        for (const drawer of drawers) {
            const open = !!drawer.querySelector(':scope > .drawer-content.openDrawer');
            drawer.classList.toggle('mst-open', open);
            any ||= open;
            more ||= open && drawer.classList.contains('mst-more-only');
            phoneMore ||= open && drawer.classList.contains('mst-more-drawer');
        }
        const body = document.body.classList;
        body.toggle('mst-menu-open', any);
        body.toggle('mst-more-open', more);
        body.toggle('mst-phone-more-open', phoneMore);
    };
    const observer = new MutationObserver(update);
    for (const drawer of drawers) {
        const content = drawer.querySelector(':scope > .drawer-content');
        if (content) {
            observer.observe(content, { attributes: true, attributeFilter: ['class'] });
        }
    }
    update();
}

export function initShell(options) {
    shellOptions = options;
    createTitlebar();
    createRail();
    trackDrawers();
    createHeader();
    createEmptyState();
    refreshHeader();
    refreshNavigation();
    refreshPersona();
}
