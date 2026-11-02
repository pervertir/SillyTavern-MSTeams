// Customize: every part of the theme can be changed from one page, live. The page itself is
// lib/customize-page.js; here are this theme's parts of it.

import { createCustomize } from './lib/customize-page.js';

const FONTS = [
    ['', 'Segoe UI (Teams)'],
    ['system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'System'],
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['Verdana, Geneva, sans-serif', 'Verdana'],
    ['Georgia, "Times New Roman", serif', 'Georgia'],
    ['"Courier New", Menlo, Consolas, monospace', 'Monospace'],
];

const SECTIONS = [
    {
        id: 'colors', title: 'Colors', items: [
            { token: '--mst-brand', label: 'Accent', type: 'color' },
            { token: '--mst-brand-hover', label: 'Accent (hover)', type: 'color' },
            { token: '--mst-brand-fg', label: 'Accent text and icons', type: 'color' },
            { token: '--mst-brand-soft', label: 'Selected background', type: 'color' },
            { token: '--mst-on-brand', label: 'Text on accent', type: 'color' },
            { token: '--mst-shell', label: 'Window frame', type: 'color' },
            { token: '--mst-list', label: 'Side panels', type: 'color' },
            { token: '--mst-canvas', label: 'Main area', type: 'color' },
            { token: '--mst-card', label: 'Cards', type: 'color' },
            { token: '--mst-raised', label: 'Menus and dialogs', type: 'color' },
            { token: '--mst-hover', label: 'Hovered rows', type: 'color' },
            { token: '--mst-input', label: 'Text boxes', type: 'color' },
            { token: '--mst-fg', label: 'Text', type: 'color' },
            { token: '--mst-fg-2', label: 'Secondary text', type: 'color' },
            { token: '--mst-fg-3', label: 'Muted text', type: 'color' },
            { token: '--mst-fg-4', label: 'Faint text', type: 'color' },
            { token: '--mst-stroke', label: 'Borders', type: 'color' },
            { token: '--mst-stroke-2', label: 'Dividers', type: 'color' },
            { token: '--mst-available', label: 'Available', type: 'color' },
            { token: '--mst-danger', label: 'Alerts and errors', type: 'color' },
            { token: '--mst-warning', label: 'Warnings', type: 'color' },
            { token: '--mst-success', label: 'Success', type: 'color' },
        ],
    },
    {
        id: 'text', title: 'Text', items: [
            { token: '--mst-font', label: 'Font', type: 'font' },
            { token: '--mst-text', label: 'Body text', type: 'size', min: 11, max: 20 },
            { token: '--mst-text-sm', label: 'Small text', type: 'size', min: 9, max: 18 },
            { token: '--mst-text-xs', label: 'Tiny text', type: 'size', min: 8, max: 14 },
            { token: '--mst-text-md', label: 'Headings', type: 'size', min: 12, max: 24 },
            { token: '--mst-text-lg', label: 'Page titles', type: 'size', min: 14, max: 32 },
        ],
    },
    {
        id: 'shape', title: 'Shape', items: [
            {
                flag: 'avatarShape', label: 'Pictures', type: 'select', default: 'round',
                options: [['round', 'Circle'], ['squircle', 'Rounded square'], ['square', 'Square']],
            },
            { token: '--mst-radius-sm', label: 'Small corners', type: 'size', min: 0, max: 12 },
            { token: '--mst-radius', label: 'Buttons and fields', type: 'size', min: 0, max: 16 },
            { token: '--mst-radius-md', label: 'Cards', type: 'size', min: 0, max: 20 },
            { token: '--mst-radius-lg', label: 'Panels and dialogs', type: 'size', min: 0, max: 24 },
            { token: '--mst-radius-xl', label: 'Large tiles', type: 'size', min: 0, max: 32 },
            { token: '--mst-bubble-radius', label: 'Message bubbles', type: 'size', min: 0, max: 24 },
        ],
    },
    {
        id: 'spacing', title: 'Spacing', items: [
            {
                flag: 'density', label: 'Density', type: 'select', default: 'default',
                options: [['compact', 'Compact'], ['default', 'Default'], ['roomy', 'Roomy']],
            },
            { token: '--mst-titlebar-h', label: 'Title bar height', type: 'size', min: 36, max: 72 },
            { token: '--mst-rail-w', label: 'App rail width', type: 'size', min: 48, max: 100 },
            { token: '--mst-list-w', label: 'Chat list width', type: 'size', min: 220, max: 480 },
            { token: '--mst-head-h', label: 'Chat header height', type: 'size', min: 40, max: 80 },
            { token: '--mst-chat-pad', label: 'Chat side margins', type: 'size', min: 0, max: 80 },
            { token: '--mst-mes-gap', label: 'Space between messages', type: 'size', min: 0, max: 24 },
            { token: '--mst-bubble-pad-y', label: 'Bubble padding (top and bottom)', type: 'size', min: 2, max: 24 },
            { token: '--mst-bubble-pad-x', label: 'Bubble padding (sides)', type: 'size', min: 4, max: 32 },
        ],
    },
    {
        id: 'layout', title: 'Layout', items: [
            { flag: 'hide-launcher', label: 'Hide the app launcher (9 dots)', type: 'check' },
            { flag: 'hide-nav', label: 'Hide back and forward', type: 'check' },
            { flag: 'hide-search', label: 'Hide search', type: 'check' },
            { flag: 'hide-me', label: 'Hide your picture in the title bar', type: 'check' },
            { flag: 'hide-favorites', label: 'Hide Favorites in the chat list', type: 'check' },
            { flag: 'hide-teams', label: 'Hide Teams and channels in the chat list', type: 'check' },
            { flag: 'hide-previews', label: 'Hide message previews in the chat list', type: 'check' },
            { flag: 'hide-tabs', label: 'Hide the Chat and Shared tabs', type: 'check' },
            { flag: 'hide-calls', label: 'Hide the video and call buttons', type: 'check' },
            { flag: 'hide-emoji', label: 'Hide the paperclip button in the message box (extensions menu)', type: 'check' },
            { flag: 'hide-plus', label: 'Hide the + button in the message box (chat options)', type: 'check' },
        ],
    },
    {
        id: 'messages', title: 'Messages', items: [
            { token: '--mst-bubble-in', label: 'Their bubbles', type: 'color' },
            { token: '--mst-bubble-out', label: 'Your bubbles', type: 'color' },
            { token: '--mst-mes-em', label: 'Actions (italics)', type: 'color' },
            { token: '--mst-mes-quote', label: 'Quotes', type: 'color' },
            { token: '--mst-mes-text', label: 'Message text', type: 'size', min: 11, max: 24 },
            { token: '--mst-mes-line', label: 'Line height', type: 'size', min: 14, max: 36 },
            { token: '--mst-mes-avatar', label: 'Picture size', type: 'size', min: 20, max: 64 },
            { token: '--mst-bubble-max', label: 'Bubble width', type: 'size', unit: '%', min: 40, max: 100 },
            { flag: 'hide-avatars', label: 'Hide pictures beside messages', type: 'check' },
            { flag: 'hide-names', label: 'Hide names', type: 'check' },
            { flag: 'hide-timestamps', label: 'Hide times', type: 'check' },
            { flag: 'hide-swipes', label: 'Hide the reply pager (swipes)', type: 'check' },
        ],
    },
    {
        id: 'background', title: 'Chat Background', items: [
            {
                flag: 'bgMode', label: 'Background', type: 'select', default: 'none',
                options: [['none', 'Theme default'], ['color', 'Color'], ['gradient', 'Gradient'], ['image', 'Picture']],
            },
            { flag: 'bgColor', label: 'Color', type: 'color', default: '#ffffff', when: 'color' },
            { flag: 'bgFrom', label: 'From', type: 'color', default: '#e8ebfa', when: 'gradient' },
            { flag: 'bgTo', label: 'To', type: 'color', default: '#ffffff', when: 'gradient' },
            { flag: 'bgAngle', label: 'Angle', type: 'size', unit: 'deg', min: 0, max: 360, step: 5, default: '180', when: 'gradient' },
            { flag: 'bgImage', label: 'Picture (web address)', type: 'url', default: '', when: 'image' },
            { flag: 'bgDim', label: 'Fade the picture', type: 'size', unit: '%', min: 0, max: 100, default: '0', when: 'image' },
        ],
    },
    {
        id: 'motion', title: 'Motion', items: [
            {
                flag: 'motion', label: 'Animations', type: 'select', default: 'full',
                options: [['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']],
            },
            { token: '--mst-fast', label: 'Quick transitions', type: 'size', unit: 'ms', min: 0, max: 500, step: 10 },
            { token: '--mst-normal', label: 'Transitions', type: 'size', unit: 'ms', min: 0, max: 800, step: 10 },
        ],
    },
    {
        id: 'advanced', title: 'Advanced', items: [
            { css: true, label: 'Custom CSS', type: 'css' },
        ],
    },
];

/** Flag names from the first version of this page */
const OLD_FLAGS = {
    hideLauncher: 'hide-launcher', hideNav: 'hide-nav', hideSearch: 'hide-search', hideMe: 'hide-me',
    hideFavorites: 'hide-favorites', hideTeams: 'hide-teams', hidePreviews: 'hide-previews', hideTabs: 'hide-tabs',
    hideCalls: 'hide-calls', hideEmoji: 'hide-emoji', hidePlus: 'hide-plus', hideAvatars: 'hide-avatars',
    hideNames: 'hide-names', hideTimes: 'hide-timestamps', hideSwipes: 'hide-swipes',
};
const AVATAR_RADIUS = { squircle: '30%', square: '4px' };
const DENSITY = {
    compact: { '--mst-mes-gap': '2px', '--mst-bubble-pad-y': '5px', '--mst-bubble-pad-x': '12px' },
    roomy: { '--mst-mes-gap': '12px', '--mst-bubble-pad-y': '11px', '--mst-bubble-pad-x': '20px' },
};

/** A small Teams window drawn with the same tokens, so every change shows up at once. */
function buildPreview(el) {
    const preview = el('div', 'mst-cz-preview');
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = `
        <div class="mst-pv-title">
            <span class="mst-pv-dots"></span>
            <span class="mst-pv-search">Search</span>
            <span class="mst-pv-me">TR</span>
        </div>
        <div class="mst-pv-body">
            <div class="mst-pv-rail">
                <span class="mst-pv-app"></span><span class="mst-pv-app"></span><span class="mst-pv-app mst-pv-on"></span><span class="mst-pv-app"></span>
            </div>
            <div class="mst-pv-list">
                <div class="mst-pv-list-head">Chat</div>
                <div class="mst-pv-row mst-pv-sel"><span class="mst-pv-av">AM</span><span><b>Alex Morgan</b><small>See you at the review</small></span></div>
                <div class="mst-pv-row"><span class="mst-pv-av mst-pv-av2">PS</span><span><b>Priya Shah</b><small>Thanks!</small></span></div>
            </div>
            <div class="mst-pv-chat">
                <div class="mst-pv-head"><span class="mst-pv-av">AM</span><b>Alex Morgan</b><span class="mst-pv-tab">Chat</span></div>
                <div class="mst-pv-messages">
                    <div class="mst-pv-mes">
                        <span class="mst-pv-av mst-pv-mes-av">AM</span>
                        <div class="mst-pv-bubble"><div class="mst-pv-meta"><span class="mst-pv-name">Alex Morgan</span> <span class="mst-pv-time">10:42 AM</span></div><span class="mst-pv-text"><i>waves</i> Morning! <q>Ready for the review?</q></span></div>
                    </div>
                    <div class="mst-pv-mes mst-pv-mine">
                        <div class="mst-pv-bubble"><div class="mst-pv-meta"><span class="mst-pv-time">10:43 AM</span></div><span class="mst-pv-text">Yes, joining in five minutes.</span></div>
                    </div>
                </div>
                <div class="mst-pv-compose">Type a message <span class="mst-pv-send"></span></div>
            </div>
        </div>`;
    return preview;
}

export const { applyCustomize, emptyCustomize, normalizeCustomize, openCustomize } = createCustomize({
    themeId: 'msteams',
    prefix: 'mst',
    bodyClass: 'ms-teams',
    exportName: 'teams-theme.json',
    fonts: FONTS,
    sections: SECTIONS,
    buildPreview,
    avatarRadius: AVATAR_RADIUS,
    density: DENSITY,
    oldFlags: OLD_FLAGS,
});
