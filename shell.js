// The Teams frame around SillyTavern: the title bar with search, the app rail built from
// SillyTavern's own menu buttons, and the chat header above the messages.

import { canGoBack, canGoForward, filterChatList, travel } from './chatlist.js';
import { closeFlyout, toggleFlyout } from './flyout.js';
import { createMonogram, isPlaceholder, monogramize, paintMonogram } from './monograms.js';
import { RAIL_SHORTCUTS, SHORTCUTS, showShortcuts, withShortcut } from './shortcuts.js';
import { isOn, own } from './own.js';
import { button, channelName, el, fluentButton, getChatOwner, iconButton, isPhone, t, toggleDrawer } from './util.js';

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

/** What the frame asks index.js to do; set by initShell */
let shellOptions = { toggleRail: () => {}, setTheme: (_appearance) => {}, customize: () => {} };

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
    const bar = el('header');
    bar.id = TITLEBAR_ID;

    const left = el('div', 'mst-tb-left');
    const railToggle = fluentButton('mst-icon-button mst-tb-rail', t('Hide app bar'), 'panel');
    railToggle.id = 'mst-rail-toggle';
    railToggle.addEventListener('click', () => shellOptions.toggleRail());
    const nav = el('div', 'mst-tb-nav');
    const back = fluentButton('mst-icon-button', withShortcut(t('Back'), SHORTCUTS.back), 'arrow-left');
    back.id = 'mst-nav-back';
    back.addEventListener('click', () => travel(-1));
    const forward = fluentButton('mst-icon-button', withShortcut(t('Forward'), SHORTCUTS.forward), 'arrow-right');
    forward.id = 'mst-nav-forward';
    forward.addEventListener('click', () => travel(1));
    nav.append(back, forward);
    // Microsoft's app launcher: every app, rail or not
    const waffle = iconButton('mst-icon-button mst-waffle', t('App launcher'), ...Array.from({ length: 9 }, () => el('span')));
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
    const leftTools = el('div', 'mst-tb-launch');
    leftTools.append(waffle, railToggle);
    left.append(leftTools, nav);

    const search = el('label', 'mst-search');
    const icon = el('i', 'fa-solid fa-magnifying-glass');
    const input = /** @type {HTMLInputElement} */ (el('input'));
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

    const right = el('div', 'mst-tb-right');
    const more = fluentButton('mst-icon-button', t('Settings and more'), 'more');
    more.addEventListener('click', () => toggleFlyout(more, [
        { label: 'User Settings', icon: 'fa-solid fa-gear', run: () => toggleDrawer('user-settings-button') },
        { label: 'Keyboard shortcuts', icon: 'fa-regular fa-keyboard', run: showShortcuts },
        { label: 'Customize theme', icon: 'fa-solid fa-palette', run: () => shellOptions.customize() },
        document.body.classList.contains('mst-dark')
            ? { label: 'Switch to light theme', icon: 'fa-regular fa-sun', run: () => shellOptions.setTheme('light') }
            : { label: 'Switch to dark theme', icon: 'fa-regular fa-moon', run: () => shellOptions.setTheme('dark') },
    ], 'below-end'));
    const meAvatar = el('span', 'mst-avatar');
    const meImg = /** @type {HTMLImageElement} */ (el('img'));
    meImg.alt = '';
    meImg.width = meImg.height = 32;
    const monogram = el('span', 'mst-monogram');
    monogram.setAttribute('aria-hidden', 'true');
    meAvatar.append(meImg, monogram, el('span', 'mst-presence mst-presence-on'));
    const me = iconButton('', t('Persona'), meAvatar);
    me.id = 'mst-me';
    me.addEventListener('click', () => toggleDrawer('persona-management-button'));
    right.append(more, me);

    bar.append(left, search, right);
    document.body.append(own(bar));
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
        paintMonogram(monogram, name);
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
    const app = el('div', 'mst-app');
    app.id = id;
    app.setAttribute('role', 'button');
    app.tabIndex = 0;
    app.title = railTooltip(id, label);
    app.dataset.mstIcon = icon;
    app.append(el('i', 'mst-app-icon'), el('span', 'mst-app-label', t(label)));
    app.addEventListener('click', onClick);
    app.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            app.click();
        }
    });
    return app;
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
    const items = (isPhone() ? PHONE_MORE_APPS : MORE_APPS)
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
        holder.prepend(own(railApp(CHAT_APP_ID, 'Chat', 'chat', () => {
            closeDrawers();
            closeFlyout();
            document.body.classList.remove('mst-m-chat');
        })));
    }
    if (!document.getElementById(MORE_APP_ID)) {
        holder.append(own(railApp(MORE_APP_ID, 'More', 'more', toggleMoreMenu)));
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
    const head = el('div');
    head.id = HEADER_ID;

    const back = iconButton('mst-icon-button mst-back', t('Back'), 'fa-solid fa-arrow-left');
    back.addEventListener('click', () => document.body.classList.remove('mst-m-chat'));

    const who = button('mst-head-who');
    who.title = t('View profile');
    who.append(el('span', 'mst-avatar'), el('span', 'mst-head-name'));
    who.addEventListener('click', openProfile);

    const tabs = el('nav', 'mst-tabs');
    const tab = el('span', 'mst-tab mst-tab-active', t('Chat'));
    const shared = button('mst-tab', t('Shared'));
    shared.addEventListener('click', openProfile);
    const add = fluentButton('mst-tab mst-tab-add', t('Add a tab'), 'add');
    add.addEventListener('click', () => toggleDrawer('extensions-settings-button'));
    tabs.append(tab, shared, add);

    const actions = el('div', 'mst-head-actions');
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
    sheld.prepend(own(head));
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

    const { group, character } = getChatOwner();
    const temporary = !group && !character && isTemporaryChat();
    const hasChat = !!(group || character || temporary);
    document.body.classList.toggle('mst-no-chat', !hasChat);

    head.classList.toggle('mst-head-channel', !!group);
    document.body.classList.toggle('mst-in-channel', !!group);
    if (group) {
        // a group is a team and its chat a channel: the team's square picture, then "Team › Channel"
        avatar.append(createMonogram(group.name, 'mst-team-avatar'));
        const channel = channelName(group, context.getCurrentChatId() ?? '');
        name.replaceChildren(el('span', 'mst-head-team', group.name), el('span', '', channel));
    } else if (character) {
        const img = /** @type {HTMLImageElement} */ (el('img'));
        img.alt = '';
        img.width = img.height = 32;
        img.src = context.getThumbnailUrl('avatar', character.avatar);
        avatar.append(img, el('span', 'mst-presence'));
        name.textContent = character.name;
        monogramize(img, character.name);
    } else if (temporary) {
        avatar.append(createMonogram(context.name2 || t('Assistant')));
        name.textContent = context.name2 || t('Assistant');
    } else {
        name.textContent = '';
    }
}

/**
 * A chat with no character or group behind it: SillyTavern's temporary chat with the assistant, or the
 * welcome screen once you have written something on it. The bare welcome screen is not one.
 */
function isTemporaryChat() {
    const chat = document.getElementById('chat');
    if (!chat?.querySelector('.mes')) {
        return false;
    }
    return !chat.querySelector('.welcomePanel') || !!chat.querySelector('.mes[is_user="true"]');
}

/** Teams' empty chat pane, shown while no chat is open */
function createEmptyState() {
    const sheld = document.getElementById('sheld');
    if (!sheld || document.getElementById('mst-empty')) {
        return;
    }
    const empty = el('div');
    empty.id = 'mst-empty';
    const art = el('div', 'mst-empty-art');
    art.setAttribute('aria-hidden', 'true');
    const action = button('menu_button mst-primary', t('New chat'));
    action.addEventListener('click', openProfile);
    empty.append(art, el('h2', '', t('Start a new chat')), el('p', '', t('Pick a conversation from the list, or start a new one.')), action);
    sheld.append(own(empty));
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

/** SillyTavern's drawers on the rail, watched for opening and closing */
let drawers = [];

/**
 * Mirrors which menus are open as classes (drawer.mst-open; body.mst-menu-open, mst-more-open,
 * mst-phone-more-open), so the styles don't need page-wide :has() checks, which make the browser
 * re-check the whole page on every change (each streamed word of a reply, for one).
 * Also re-run after the frame is put back.
 */
export function refreshDrawerState() {
    if (!isOn()) {
        return;
    }
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
}

function trackDrawers() {
    drawers = [...document.querySelectorAll('#top-settings-holder > .drawer')];
    const observer = new MutationObserver(refreshDrawerState);
    for (const drawer of drawers) {
        const content = drawer.querySelector(':scope > .drawer-content');
        if (content) {
            observer.observe(content, { attributes: true, attributeFilter: ['class'] });
        }
    }
    refreshDrawerState();
}

/**
 * @param {object} options
 * @param {() => void} options.toggleRail Hides or shows the app rail
 * @param {(appearance: string) => void} options.setTheme Switches between light and dark
 * @param {() => void} options.customize Opens the Customize page
 */
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
