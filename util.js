// Small helpers shared by the theme's modules.

export const PHONE_QUERY = '(max-width: 1000px)';

export function t(text) {
    return SillyTavern.getContext().translate(text);
}

export function isPhone() {
    return window.matchMedia(PHONE_QUERY).matches;
}

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

/** One of the theme's Fluent icons (--mst-icon-<name>), 20px unless sized. */
export function fluentIcon(name, size = 20) {
    const icon = el('i', 'mst-fluent');
    icon.style.setProperty('--mst-glyph', `var(--mst-icon-${name})`);
    if (size !== 20) {
        icon.style.width = icon.style.height = `${size}px`;
        icon.style.setProperty('mask-size', `${size}px ${size}px`);
        icon.style.setProperty('-webkit-mask-size', `${size}px ${size}px`);
    }
    return icon;
}

/** A plain `<button type="button">`. */
export function button(className, text) {
    const element = /** @type {HTMLButtonElement} */ (el('button', className, text));
    element.type = 'button';
    return element;
}

/**
 * A button labelled only by its tooltip.
 * @param {string} className
 * @param {string} title
 * @param {...(string|Node)} content A Font Awesome class list for an icon, or nodes
 */
export function iconButton(className, title, ...content) {
    const element = button(className);
    element.title = title;
    element.setAttribute('aria-label', title);
    element.append(...content.map(x => (typeof x === 'string' ? el('i', x) : x)));
    return element;
}

/** An icon button drawn with a Fluent icon. */
export function fluentButton(className, title, iconName) {
    return iconButton(className, title, fluentIcon(iconName));
}

/** Clicks a SillyTavern drawer's toggle, the way its own top bar does. */
export function toggleDrawer(drawerId) {
    document.querySelector(`#${drawerId} > .drawer-toggle`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Clicks the first element matching a selector. */
export function click(selector) {
    /** @type {HTMLElement|null} */ (document.querySelector(selector))?.click();
}

/** The open chat's group, or its character when it isn't a group chat. */
export function getChatOwner() {
    const context = SillyTavern.getContext();
    const group = context.groupId ? context.groups.find(x => String(x.id) === String(context.groupId)) : null;
    const character = !group && context.characterId !== undefined ? context.characters[context.characterId] : null;
    return { group, character };
}

/** A group chat's channel name: SillyTavern names them "<group> - <date>", so the group part goes. */
export function channelName(group, chatId) {
    const prefix = `${group.name} - `;
    return chatId.startsWith(prefix) ? chatId.slice(prefix.length) : chatId;
}
