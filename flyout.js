// Teams' pop-up menus (the … menus, the app launcher, More): one shared menu, opened beside or
// below the button that asked for it.

import { own } from './own.js';
import { button, el, t } from './util.js';

/** @type {HTMLElement|null} */
let flyout = null;
/** @type {HTMLElement|null} */
let flyoutAnchor = null;

export function closeFlyout() {
    if (flyout) {
        flyout.hidden = true;
    }
    flyoutAnchor?.classList.remove('mst-app-open');
    flyoutAnchor = null;
}

/** The menu, made the first time one opens. */
function getFlyout() {
    if (flyout) {
        return flyout;
    }
    flyout = el('div');
    flyout.id = 'mst-flyout';
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
 * Opens a Teams menu next to a button, or closes it when it's already open there.
 * @param {HTMLElement} anchor
 * @param {{label: string, icon: string, run: () => void}[]} items
 * @param {'beside'|'below-end'} placement
 */
export function toggleFlyout(anchor, items, placement) {
    getFlyout();
    if (!flyout.hidden && flyoutAnchor === anchor) {
        closeFlyout();
        return;
    }
    closeFlyout();
    flyout.replaceChildren(...items.map(({ label, icon, run }) => {
        const item = button('mst-more-item');
        item.setAttribute('role', 'menuitem');
        item.append(el('i', icon), el('span', '', t(label)));
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
