import { isOn } from './own.js';

// Sharp pictures on any screen. SillyTavern shows small thumbnails (backgrounds 160×90 and
// avatars 96×144 by default); where one is drawn bigger than it is, counting the screen's pixel
// density, the full image is shown instead. It goes in a --mst-full custom property that CSS
// uses only while the theme is on, so SillyTavern's own src and styles never change.

const FOLDERS = { avatar: 'characters', persona: 'User Avatars', bg: 'backgrounds' };
const CANDIDATES = 'img[src*="thumbnail?"], .thumbnail-clipper';
/** Drawn at up to this much over its own size, a thumbnail still looks sharp */
const MAX_UPSCALE = 1.05;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;

/** @type {Map<string, Promise<number[]|null>>} thumbnail URL → its size */
const sizes = new Map();
const watched = new WeakSet();
let resizes = null;

/** The full-size image behind a SillyTavern thumbnail URL, or null. It's absolute: a relative
 * url() in a custom property would resolve against the theme's stylesheet. */
function fullSizeUrl(url) {
    const query = url.match(/(?:^|\/)thumbnail\?(.*)$/)?.[1];
    if (!query) {
        return null;
    }
    const params = new URLSearchParams(query);
    const file = params.get('file');
    const folder = FOLDERS[params.get('type') ?? ''];
    return file && folder && !VIDEO.test(file) ? new URL(`${folder}/${encodeURIComponent(file)}`, document.baseURI).href : null;
}

function naturalSize(url) {
    if (!sizes.has(url)) {
        sizes.set(url, new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
            image.onerror = () => resolve(null);
            image.src = url;
        }));
    }
    return sizes.get(url);
}

/** The thumbnail an img or a background tile shows. */
function thumbnailOf(element) {
    if (element instanceof HTMLImageElement) {
        return element.getAttribute('src') ?? '';
    }
    return element.style.backgroundImage.match(/url\((["']?)(.*?)\1\)/)?.[2] ?? '';
}

function setFull(element, value) {
    if (element.style.getPropertyValue('--mst-full') === value) {
        return;
    }
    if (value) {
        element.style.setProperty('--mst-full', value);
    } else {
        element.style.removeProperty('--mst-full');
    }
}

async function check(element) {
    if (!isOn()) {
        return;
    }
    const url = thumbnailOf(element);
    const full = fullSizeUrl(url);
    const rect = element.getBoundingClientRect();
    if (!full || !rect.width || !rect.height) {
        if (!full) {
            setFull(element, '');
        }
        return;
    }
    const size = await naturalSize(url);
    if (!size || thumbnailOf(element) !== url) {
        return;
    }
    // drawn to cover its box, so the scale is set by the side that has to stretch most
    const ratio = window.devicePixelRatio || 1;
    const upscale = Math.max(rect.width * ratio / size[0], rect.height * ratio / size[1]);
    setFull(element, upscale > MAX_UPSCALE ? `url("${full}")` : '');
}

function watch(element) {
    if (!watched.has(element)) {
        watched.add(element);
        resizes.observe(element);
    }
    void check(element);
}

function checkAll() {
    document.querySelectorAll(CANDIDATES).forEach(watch);
}

/** Starts watching every thumbnail on the page, now and as SillyTavern adds them. */
export function initSharpImages() {
    resizes = new ResizeObserver(entries => entries.forEach(entry => void check(entry.target)));
    new MutationObserver((records) => {
        if (!isOn()) {
            return;
        }
        for (const record of records) {
            if (record.type === 'attributes') {
                if (/** @type {Element} */ (record.target).matches(CANDIDATES)) {
                    watch(/** @type {HTMLElement} */ (record.target));
                }
                continue;
            }
            for (const node of record.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.matches(CANDIDATES)) {
                        watch(node);
                    }
                    node.querySelectorAll(CANDIDATES).forEach(watch);
                }
            }
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style'] });
    // zooming changes the pixel density
    window.addEventListener('resize', () => isOn() && checkAll());
    checkAll();
}
