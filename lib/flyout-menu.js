// A theme's pop-up menus (the … menus, a launcher, More): one shared menu, opened beside or below
// the button that asked for it. The theme styles #<prefix>-flyout and .<prefix>-more-item, placing
// the menu with --<prefix>-flyout-top, -left, -start and -right.

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

/**
 * @param {object} config
 * @param {string} config.prefix The theme's class prefix, without the dash
 * @param {(node: HTMLElement) => HTMLElement} config.own Marks a node as the theme's
 * @param {string} config.anchorClass Class on the button while its menu is open
 * @param {boolean} [config.flip] A menu that wouldn't fit opens upwards
 */
export function createFlyout({ prefix, own, anchorClass, flip = false }) {
    /** @type {HTMLElement|null} */
    let flyout = null;
    /** @type {HTMLElement|null} */
    let flyoutAnchor = null;

    function closeFlyout() {
        if (flyout) {
            flyout.hidden = true;
        }
        flyoutAnchor?.classList.remove(anchorClass);
        flyoutAnchor = null;
    }

    /** The menu, made the first time one opens. */
    function getFlyout() {
        if (flyout) {
            return flyout;
        }
        flyout = element('div');
        flyout.id = `${prefix}-flyout`;
        flyout.setAttribute('role', 'menu');
        flyout.hidden = true;
        document.body.append(own(flyout));
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
     * Opens a menu next to a button, or closes it when it's already open there.
     * @param {HTMLElement} anchor
     * @param {{label: string, icon: string, run: () => void}[]} items
     * @param {'beside'|'below-end'|'below-start'} placement
     */
    function toggleFlyout(anchor, items, placement) {
        getFlyout();
        if (!flyout.hidden && flyoutAnchor === anchor) {
            closeFlyout();
            return;
        }
        closeFlyout();
        const { translate } = SillyTavern.getContext();
        flyout.replaceChildren(...items.map(({ label, icon, run }) => {
            const item = /** @type {HTMLButtonElement} */ (element('button', `${prefix}-more-item`));
            item.type = 'button';
            item.setAttribute('role', 'menuitem');
            item.append(element('i', icon), element('span', '', translate(label)));
            item.addEventListener('click', () => {
                closeFlyout();
                run();
            });
            return item;
        }));
        flyout.dataset.placement = placement;
        flyout.hidden = false;
        flyoutAnchor = anchor;
        anchor.classList.add(anchorClass);
        const box = anchor.getBoundingClientRect();
        const top = `${Math.round(placement === 'beside' ? box.top : box.bottom + 4)}px`;
        flyout.style.setProperty(`--${prefix}-flyout-top`, top);
        flyout.style.setProperty(`--${prefix}-flyout-left`, `${Math.round(box.right + 4)}px`);
        flyout.style.setProperty(`--${prefix}-flyout-start`, `${Math.round(box.left)}px`);
        flyout.style.setProperty(`--${prefix}-flyout-right`, `${Math.round(window.innerWidth - box.right)}px`);
        if (flip) {
            // above its button when there's room (measured from the top, since its height is capped
            // by the room below where it starts)
            flyout.style.setProperty(`--${prefix}-flyout-top`, '8px');
            const height = flyout.offsetHeight;
            const above = box.top - height - 2;
            const fits = box.bottom + 4 + height <= window.innerHeight;
            flyout.style.setProperty(`--${prefix}-flyout-top`, fits ? top : `${above >= 8 ? above : Math.max(8, window.innerHeight - height - 8)}px`);
        }
        /** @type {HTMLElement} */ (flyout.querySelector(`.${prefix}-more-item`))?.focus();
    }

    return { closeFlyout, toggleFlyout };
}
