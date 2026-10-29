// Everything the theme puts into SillyTavern's page is marked as its own (data-mst-own), so it
// can all be taken out while the theme is off and put back, as it was, when it's on again.
// Nothing is built at all until the theme is first turned on.

/** Taken-out parts and where they were */
let parked = [];
/** SillyTavern's own elements with the theme's classes, attributes or sizes, and what those were */
let marks = [];

const OWN_ATTR = 'data-mst-own';
const SETTINGS_PANEL = '.mst-settings';

/** Whether the theme is on: watchers and listeners do nothing while it's off. */
export function isOn() {
    return document.body.classList.contains('ms-teams');
}

/** Marks a node the theme added to the page. */
export function own(node) {
    node.dataset.mstOwn = '';
    return node;
}

/** Takes every part the theme added out of the page (the theme was switched off). */
export function parkOwned() {
    for (const node of document.querySelectorAll('[data-mst-own]')) {
        // parts inside another part go with it
        if (!node.isConnected || node.parentElement?.closest('[data-mst-own]')) {
            continue;
        }
        parked.push({ node, parent: node.parentNode, next: node.nextSibling });
        node.remove();
    }
    // the marks left on SillyTavern's own elements (the body's own classes are the theme's
    // settings, kept by index.js, and its settings panel stays as it is)
    for (const element of document.body.querySelectorAll('[class*="mst-"], [data-mst-label], [data-mst-icon], [data-mst-call], [data-mst-show], [data-mst-time], [data-mst-mono-for], [style*="--mst-"]')) {
        if (element.closest(SETTINGS_PANEL)) {
            continue;
        }
        const classes = [...element.classList].filter(name => name.startsWith('mst-'));
        const attributes = [...element.attributes].filter(a => a.name.startsWith('data-mst-') && a.name !== OWN_ATTR).map(a => [a.name, a.value]);
        const styles = [...element.style].filter(name => name.startsWith('--mst-')).map(name => [name, element.style.getPropertyValue(name)]);
        if (!classes.length && !attributes.length && !styles.length) {
            continue;
        }
        marks.push({ element, classes, attributes, styles });
        element.classList.remove(...classes);
        attributes.forEach(([name]) => element.removeAttribute(name));
        styles.forEach(([name]) => element.style.removeProperty(name));
    }
}

/** Puts them back where they were (the theme was switched on again). */
export function restoreOwned() {
    // in reverse, so each one's next sibling is already back in place
    for (const { node, parent, next } of parked.reverse()) {
        if (!parent?.isConnected || node.isConnected) {
            continue;
        }
        parent.insertBefore(node, next?.parentNode === parent ? next : null);
    }
    parked = [];
    for (const { element, classes, attributes, styles } of marks) {
        if (!element.isConnected) {
            continue;
        }
        element.classList.add(...classes);
        attributes.forEach(([name, value]) => element.setAttribute(name, value));
        styles.forEach(([name, value]) => element.style.setProperty(name, value));
    }
    marks = [];
}
