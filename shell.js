// The Teams frame around SillyTavern: the title bar with search, the app rail built from
// SillyTavern's own menu buttons, and the chat header above the messages.

import { filterChatList } from './chatlist.js';

const TITLEBAR_ID = 'mst-titlebar';
const CHAT_APP_ID = 'mst-app-chat';
const HEADER_ID = 'mst-chat-head';

/** SillyTavern's menus in their own order, each wearing a Teams app's icon and name.
    Chat (the chat list) sits second and "More" seventh, as in Teams; Apps sits at the bottom. */
const RAIL_APPS = [
    { id: 'ai-config-button', label: 'Activity', icon: 'bell', order: 1 },
    { id: 'sys-settings-button', label: 'Calendar', icon: 'calendar', order: 3 },
    { id: 'advanced-formatting-button', label: 'Calls', icon: 'call', order: 4 },
    { id: 'WI-SP-button', label: 'OneDrive', icon: 'cloud', order: 5 },
    { id: 'user-settings-button', label: 'Copilot', icon: 'copilot', order: 6 },
    { id: 'extensions-settings-button', label: 'Apps', icon: 'apps', order: 20 },
];

/** Menus that don't get a rail icon of their own: they're under "More" (…), like Teams' extra apps */
const MORE_APPS = [
    { id: 'backgrounds-button', label: 'Backgrounds', icon: 'fa-solid fa-panorama' },
    { id: 'persona-management-button', label: 'Persona Management', icon: 'fa-solid fa-face-smile' },
    { id: 'rightNavHolder', label: 'Character Management', icon: 'fa-solid fa-address-card' },
];

const MORE_APP_ID = 'mst-app-more';
const MORE_MENU_ID = 'mst-more-menu';

function t(text) {
    return SillyTavern.getContext().translate(text);
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

/** Closes every open drawer that isn't pinned open. */
export function closeDrawers() {
    for (const content of document.querySelectorAll('#top-settings-holder .drawer-content.openDrawer')) {
        if (content.classList.contains('pinnedOpen')) {
            continue;
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
    const waffle = document.createElement('span');
    waffle.className = 'mst-waffle';
    waffle.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 9; i++) {
        waffle.append(document.createElement('span'));
    }
    const brand = document.createElement('span');
    brand.className = 'mst-brand';
    brand.textContent = 'SillyTavern';
    left.append(waffle, brand);

    const search = document.createElement('label');
    search.className = 'mst-search';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-magnifying-glass';
    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'mst-search-input';
    input.placeholder = t('Search');
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
    const more = button('mst-icon-button', t('Settings and more'), 'fa-solid fa-ellipsis');
    more.addEventListener('click', () => toggleDrawer('user-settings-button'));
    const me = document.createElement('button');
    me.type = 'button';
    me.id = 'mst-me';
    me.title = t('Persona Management');
    me.setAttribute('aria-label', t('Persona Management'));
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
    me.title = name ? `${name} (${t('Persona Management')})` : t('Persona Management');
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
}

/** A rail app of the theme's own (Chat, More), built like SillyTavern's drawer toggles. */
function railApp(id, label, icon, onClick) {
    const app = document.createElement('div');
    app.id = id;
    app.className = 'mst-app';
    app.setAttribute('role', 'button');
    app.tabIndex = 0;
    app.title = t(label);
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

function closeMoreMenu() {
    const menu = document.getElementById(MORE_MENU_ID);
    if (menu) {
        menu.hidden = true;
    }
    document.getElementById(MORE_APP_ID)?.classList.remove('mst-app-open');
}

function toggleMoreMenu() {
    const app = document.getElementById(MORE_APP_ID);
    let menu = document.getElementById(MORE_MENU_ID);
    if (!menu) {
        menu = document.createElement('div');
        menu.id = MORE_MENU_ID;
        menu.setAttribute('role', 'menu');
        menu.hidden = true;
        for (const { id, label, icon } of MORE_APPS) {
            if (!document.getElementById(id)) {
                continue;
            }
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
                closeMoreMenu();
                const content = document.querySelector(`#${id} > .drawer-content`);
                if (!content?.classList.contains('openDrawer')) {
                    toggleDrawer(id);
                }
            });
            menu.append(item);
        }
        document.body.append(menu);
        document.addEventListener('pointerdown', (event) => {
            const target = /** @type {Node} */ (event.target);
            if (!menu.hidden && !menu.contains(target) && !app.contains(target)) {
                closeMoreMenu();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !menu.hidden) {
                closeMoreMenu();
            }
        });
    }
    const opening = menu.hidden;
    menu.hidden = !opening;
    app.classList.toggle('mst-app-open', opening);
    if (opening) {
        const box = app.getBoundingClientRect();
        menu.style.setProperty('--mst-more-top', `${Math.round(box.top)}px`);
        menu.style.setProperty('--mst-more-left', `${Math.round(box.right + 4)}px`);
        menu.style.setProperty('--mst-more-bottom', `${Math.round(window.innerHeight - box.top + 4)}px`);
        /** @type {HTMLElement} */ (menu.querySelector('.mst-more-item'))?.focus();
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
            closeMoreMenu();
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
        toggle.addEventListener('click', closeMoreMenu);
    }
    for (const { id } of MORE_APPS) {
        document.getElementById(id)?.classList.add('mst-more-drawer');
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
    who.title = t('Character Management');
    const avatar = document.createElement('span');
    avatar.className = 'mst-avatar';
    const name = document.createElement('span');
    name.className = 'mst-head-name';
    who.append(avatar, name);
    who.addEventListener('click', () => {
        const panel = document.getElementById('right-nav-panel');
        if (!panel?.classList.contains('openDrawer')) {
            toggleDrawer('rightNavHolder');
        }
    });

    const tabs = document.createElement('nav');
    tabs.className = 'mst-tabs';
    const tab = document.createElement('span');
    tab.className = 'mst-tab mst-tab-active';
    tab.textContent = t('Chat');
    tabs.append(tab);

    const actions = document.createElement('div');
    actions.className = 'mst-head-actions';
    const history = button('mst-icon-button', t('Manage chat files'), 'fa-solid fa-clock-rotate-left');
    history.addEventListener('click', () => clickOption('option_select_chat'));
    const fresh = button('mst-icon-button', t('Start new chat'), 'fa-regular fa-pen-to-square');
    fresh.addEventListener('click', () => clickOption('option_start_new_chat'));
    const close = button('mst-icon-button', t('Close chat'), 'fa-solid fa-xmark');
    close.addEventListener('click', () => {
        clickOption('option_close_chat');
        document.body.classList.remove('mst-m-chat');
    });
    actions.append(history, fresh, close);

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

    if (group) {
        avatar.classList.add('mst-avatar-group');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-users';
        avatar.append(icon);
        name.textContent = group.name;
    } else if (character) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = context.getThumbnailUrl('avatar', character.avatar);
        const presence = document.createElement('span');
        presence.className = 'mst-presence';
        avatar.append(img, presence);
        name.textContent = character.name;
    } else {
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-mug-hot';
        avatar.classList.add('mst-avatar-group');
        avatar.append(icon);
        name.textContent = 'SillyTavern';
    }
}

export function initShell() {
    createTitlebar();
    createRail();
    createHeader();
    refreshHeader();
    refreshPersona();
}
