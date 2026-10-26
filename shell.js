// The Teams frame around SillyTavern: the title bar with search, the app rail built from
// SillyTavern's own menu buttons, and the chat header above the messages.

import { filterChatList } from './chatlist.js';

const TITLEBAR_ID = 'mst-titlebar';
const CHAT_APP_ID = 'mst-app-chat';
const HEADER_ID = 'mst-chat-head';

/** Rail labels for SillyTavern's menu buttons, in the order they appear on the rail */
const RAIL_APPS = [
    ['rightNavHolder', 'Characters'],
    ['persona-management-button', 'Personas'],
    ['WI-SP-button', 'Lore'],
    ['ai-config-button', 'Generation'],
    ['advanced-formatting-button', 'Formatting'],
    ['sys-settings-button', 'API'],
    ['backgrounds-button', 'Wallpaper'],
    ['extensions-settings-button', 'Extensions'],
    ['user-settings-button', 'Settings'],
];

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
    meAvatar.append(meImg, presence);
    me.append(meAvatar);
    me.addEventListener('click', () => toggleDrawer('persona-management-button'));
    right.append(more, me);

    bar.append(left, search, right);
    document.body.append(bar);
}

/** Shows the user's persona picture in the title bar. */
export function refreshPersona(avatarId) {
    const img = /** @type {HTMLImageElement} */ (document.querySelector('#mst-me img'));
    if (!img) {
        return;
    }
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

function createRail() {
    const holder = document.getElementById('top-settings-holder');
    if (!holder) {
        return;
    }
    if (!document.getElementById(CHAT_APP_ID)) {
        const chat = document.createElement('div');
        chat.id = CHAT_APP_ID;
        chat.className = 'mst-app';
        chat.setAttribute('role', 'button');
        chat.tabIndex = 0;
        chat.title = t('Chat');
        const icon = document.createElement('i');
        icon.className = 'fa-regular fa-comments mst-app-icon';
        const label = document.createElement('span');
        label.className = 'mst-app-label';
        label.textContent = t('Chat');
        chat.append(icon, label);
        chat.addEventListener('click', () => {
            closeDrawers();
            document.body.classList.remove('mst-m-chat');
        });
        chat.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                chat.click();
            }
        });
        holder.prepend(chat);
    }
    RAIL_APPS.forEach(([id, label], index) => {
        const drawer = document.getElementById(id);
        const toggle = drawer?.querySelector(':scope > .drawer-toggle');
        if (!toggle) {
            return;
        }
        drawer.style.setProperty('--mst-order', String(index + 1));
        toggle.dataset.mstLabel = t(label);
    });
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
