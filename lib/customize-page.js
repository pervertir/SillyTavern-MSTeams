// The Customize page, for a theme with the shared format (customize-spec.md). A look exported from
// one theme opens in another and keeps whatever that theme understands:
//   customize = { tokens: { '--x-brand': '#…', … }, flags: { 'hide-search': true, density: 'compact', … }, css: '' }
// Tokens are CSS custom properties, set inline on the body so they sit on top of light and dark.
// hide-<part> flags become body classes (<prefix>-x-hide-<part>); the other flags are options that
// set tokens or classes of their own. The custom CSS is nested inside the theme's body class.
// The theme gives its sections and preview; everything here is the same for every theme.

const VERSION = 1;
const TOKEN_NAME = /^--[a-zA-Z0-9-]+$/;
const BAD_VALUE = /[;{}<>]/;

/**
 * @param {object} config
 * @param {string} config.themeId The id in exported files
 * @param {string} config.prefix The theme's class prefix, without the dash
 * @param {string} config.bodyClass
 * @param {string} config.exportName File name for Export Theme
 * @param {[string, string][]} config.fonts Font stacks and their names; the first has the value ''
 * @param {object[]} config.sections The page's sections in order. An item edits a token (token) or
 *   a flag (flag), as one of these controls: color, size, select, font, url, check (a true/false
 *   flag) or css. Flag items carry their default, which is never stored.
 * @param {(el: Function) => HTMLElement} config.buildPreview A small drawing of the theme using its tokens
 * @param {Record<string, string>} [config.avatarRadius] avatarShape flag → --<prefix>-avatar-radius
 * @param {Record<string, Record<string, string>>} [config.density] density flag → tokens
 * @param {Record<string, string>} [config.oldFlags] Flag names from older versions → their names now
 */
export function createCustomize({ themeId, prefix, bodyClass, exportName, fonts, sections, buildPreview, avatarRadius = {}, density = {}, oldFlags = {} }) {
    const cssId = `${prefix}-custom-css`;

    const ITEMS = sections.flatMap(s => s.items);
    const FLAG_ITEMS = new Map(ITEMS.filter(i => i.flag).map(i => [i.flag, i]));
    const HIDE_FLAGS = ITEMS.filter(i => i.type === 'check').map(i => i.flag);

    /** Tokens set on the body by the last apply, so they can be taken off again */
    let applied = [];

    function t(text) {
        return SillyTavern.getContext().translate(text);
    }

    function emptyCustomize() {
        return { version: VERSION, tokens: {}, flags: {}, css: '' };
    }

    function validToken(name, value) {
        return TOKEN_NAME.test(name) && typeof value === 'string' && !!value.trim() && !BAD_VALUE.test(value);
    }

    function validFlag(item, value) {
        if (item.type === 'check') {
            return value === true;
        }
        if (typeof value !== 'string' || BAD_VALUE.test(value) || value === item.default) {
            return false;
        }
        if (item.type === 'select') {
            return item.options.some(([option]) => option === value);
        }
        if (item.type === 'color') {
            return CSS.supports('color', value);
        }
        if (item.type === 'size') {
            return Number.isFinite(Number(value));
        }
        if (item.type === 'url') {
            return /^(https?:\/\/|\/)[^\s"'()\\]+$/.test(value);
        }
        return false;
    }

    /**
     * The stored object, cleaned: only this theme's valid tokens and the flags it knows are kept
     * (so a file from another of our themes keeps what fits), and nothing that could break CSS.
     */
    function normalizeCustomize(value) {
        const result = emptyCustomize();
        if (!value || typeof value !== 'object') {
            return result;
        }
        for (const [name, val] of Object.entries(value.tokens ?? {})) {
            if (name.startsWith(`--${prefix}-`) && validToken(name, val)) {
                result.tokens[name] = val.trim();
            }
        }
        for (const [name, val] of Object.entries(value.flags ?? {})) {
            const key = oldFlags[name] ?? name;
            const item = FLAG_ITEMS.get(key);
            const stored = typeof val === 'number' ? String(val) : val;
            if (item && validFlag(item, stored)) {
                result.flags[key] = stored;
            }
        }
        result.css = typeof value.css === 'string' ? value.css : '';
        return result;
    }

    function flagValue(customize, name) {
        return customize.flags[name] ?? FLAG_ITEMS.get(name)?.default;
    }

    /** Tokens the options stand for (pictures' shape, density, chat background). */
    function optionTokens(customize) {
        const tokens = {};
        const radius = avatarRadius[customize.flags.avatarShape];
        if (radius) {
            tokens[`--${prefix}-avatar-radius`] = radius;
        }
        Object.assign(tokens, density[customize.flags.density] ?? {});
        const mode = customize.flags.bgMode;
        if (mode === 'color') {
            tokens[`--${prefix}-chat-bg`] = flagValue(customize, 'bgColor');
        } else if (mode === 'gradient') {
            tokens[`--${prefix}-chat-bg-image`] = `linear-gradient(${Number(flagValue(customize, 'bgAngle'))}deg, ${flagValue(customize, 'bgFrom')}, ${flagValue(customize, 'bgTo')})`;
            tokens[`--${prefix}-chat-bg-size`] = 'cover';
        } else if (mode === 'image' && customize.flags.bgImage) {
            tokens[`--${prefix}-chat-bg-image`] = `url("${customize.flags.bgImage}")`;
            tokens[`--${prefix}-chat-bg-dim`] = `${Number(flagValue(customize, 'bgDim'))}%`;
        }
        return tokens;
    }

    /** Puts the customization on the page (or takes it off when the theme is off). */
    function applyCustomize(customize, enabled) {
        const body = document.body;
        for (const token of applied) {
            body.style.removeProperty(token);
        }
        applied = [];
        const on = !!enabled && !!customize;
        for (const flag of HIDE_FLAGS) {
            body.classList.toggle(`${prefix}-x-${flag}`, on && customize.flags[flag] === true);
        }
        const motion = on ? customize.flags.motion : undefined;
        body.classList.toggle(`${prefix}-x-motion-reduced`, motion === 'reduced');
        body.classList.toggle(`${prefix}-x-motion-off`, motion === 'off');
        let style = document.getElementById(cssId);
        if (!on) {
            style?.remove();
            return;
        }
        // options first, so a token set by hand wins over the option it overlaps
        for (const [token, value] of Object.entries({ ...optionTokens(customize), ...customize.tokens })) {
            if (validToken(token, value)) {
                body.style.setProperty(token, value);
                applied.push(token);
            }
        }
        const css = customize.css.trim();
        if (css) {
            if (!style) {
                style = document.createElement('style');
                style.id = cssId;
                document.head.append(style);
            }
            // nested under the theme's class, so the rules only apply while it's on
            style.textContent = `body.${bodyClass} {\n${css}\n}`;
        } else {
            style?.remove();
        }
    }

    /** A CSS color as #rrggbb, for the color picker. */
    function toHex(value) {
        const probe = document.createElement('span');
        probe.style.color = value;
        probe.style.display = 'none';
        document.body.append(probe);
        const rgb = getComputedStyle(probe).color;
        probe.remove();
        const parts = rgb.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
        return '#' + parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    }

    /** The value the base appearance gives a token, without any customization on top. */
    function baseValue(token) {
        const body = document.body;
        const own = body.style.getPropertyValue(token);
        body.style.removeProperty(token);
        const value = getComputedStyle(body).getPropertyValue(token).trim();
        if (own) {
            body.style.setProperty(token, own);
        }
        return value;
    }

    function el(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    /**
     * Reads an exported look. Refuses anything that isn't one; a look from another of our themes
     * is taken with a note, keeping what this theme understands.
     * @returns {object|null}
     */
    function readLook(text) {
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            toastr.error(t('That isn\'t a theme file.'));
            return null;
        }
        if (!data || typeof data !== 'object' || !data.themeId || typeof data.tokens !== 'object') {
            toastr.error(t('That isn\'t a theme file.'));
            return null;
        }
        if (data.themeId !== themeId) {
            toastr.info(t('That look was made for another theme; the options this theme has were kept.'));
        }
        return normalizeCustomize(data);
    }

    /**
     * Opens the Customize page.
     * @param {object} options
     * @param {() => object} options.get The stored customization (live object)
     * @param {(value: object) => void} options.set Replaces it
     * @param {() => void} options.changed Apply and save
     */
    async function openCustomize({ get, set, changed }) {
        const { callGenericPopup, POPUP_TYPE, POPUP_RESULT } = SillyTavern.getContext();
        const page = el('div', `${prefix}-customize`);
        const top = el('div', `${prefix}-cz-top`);
        const heading = el('div', `${prefix}-cz-heading`);
        heading.append(el('h3', '', t('Customize')));
        const tools = el('div', `${prefix}-cz-tools`);
        const exportButton = el('button', `menu_button ${prefix}-cz-tool`, t('Export Theme'));
        const importButton = el('button', `menu_button ${prefix}-cz-tool`, t('Import Theme'));
        const resetAll = el('button', `menu_button ${prefix}-cz-tool`, t('Reset All'));
        for (const button of [exportButton, importButton, resetAll]) {
            button.type = 'button';
        }
        tools.append(exportButton, importButton, resetAll);
        heading.append(tools);
        top.append(heading, buildPreview(el));
        page.append(top);

        /** @type {(() => void)[]} */
        const refreshers = [];
        const refreshAll = () => refreshers.forEach(refresh => refresh());
        const commit = () => {
            changed();
            refreshAll();
        };

        for (const section of sections) {
            const box = el('section', `${prefix}-cz-section`);
            box.dataset.section = section.id;
            const head = el('div', `${prefix}-cz-section-head`);
            head.append(el('h4', '', t(section.title)));
            const reset = el('button', `menu_button ${prefix}-cz-reset`, t('Reset section'));
            reset.type = 'button';
            reset.addEventListener('click', () => {
                const customize = get();
                for (const item of section.items) {
                    if (item.token) {
                        delete customize.tokens[item.token];
                    } else if (item.flag) {
                        delete customize.flags[item.flag];
                    } else if (item.css) {
                        customize.css = '';
                    }
                }
                commit();
            });
            head.append(reset);
            box.append(head);
            const grid = el('div', `${prefix}-cz-grid`);
            for (const item of section.items) {
                grid.append(buildControl(item, get, commit, refreshers));
            }
            box.append(grid);
            page.append(box);
        }

        exportButton.addEventListener('click', () => {
            const { tokens, flags, css } = normalizeCustomize(get());
            const data = { themeId: themeId, version: VERSION, tokens, flags, css };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = exportName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        });
        importButton.addEventListener('click', async () => {
            // paste the file's text, or leave the box empty and pick the file
            const text = await callGenericPopup(t('Paste a theme file\'s text, or leave this empty to choose the file.'), POPUP_TYPE.INPUT, '', { rows: 6, okButton: t('Import'), cancelButton: t('Cancel') });
            if (text === null || text === false || text === undefined) {
                return;
            }
            const apply = (look) => {
                if (look) {
                    set(look);
                    commit();
                    toastr.success(t('Look imported.'));
                }
            };
            if (String(text).trim()) {
                apply(readLook(String(text)));
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (file) {
                    apply(readLook(await file.text()));
                }
            });
            input.click();
        });
        resetAll.addEventListener('click', async () => {
            const answer = await callGenericPopup(t('Put every part of the theme back to how it was?'), POPUP_TYPE.CONFIRM, '', { okButton: t('Reset All'), cancelButton: t('Cancel') });
            if (answer === POPUP_RESULT.AFFIRMATIVE) {
                set(emptyCustomize());
                commit();
            }
        });

        refreshAll();
        const shown = callGenericPopup(page, POPUP_TYPE.TEXT, '', { wide: true, large: true, allowVerticalScrolling: true, okButton: t('Done') });
        page.closest('dialog')?.classList.add(`${prefix}-cz-dialog`);
        await shown;
    }

    function buildControl(item, get, commit, refreshers) {
        const row = el('div', `${prefix}-cz-row ${prefix}-cz-${item.type}`);
        const id = `${prefix}_cz_${(item.token ?? item.flag ?? 'css').replace(/[^a-z0-9]/gi, '_')}`;
        const isFlag = !!item.flag;

        /** What's stored for this item, or undefined */
        const stored = () => (isFlag ? get().flags[item.flag] : get().tokens[item.token]);
        /** What it shows: the stored value, or the default (the flag's, or the base theme's) */
        const shown = () => stored() ?? (isFlag ? item.default : baseValue(item.token));
        const store = (value) => {
            const customize = get();
            const bag = isFlag ? customize.flags : customize.tokens;
            const key = isFlag ? item.flag : item.token;
            if (value === '' || value === null || value === undefined || (isFlag && value === item.default)) {
                delete bag[key];
            } else {
                bag[key] = value;
            }
            commit();
        };

        if (item.type === 'check') {
            const label = el('label', 'checkbox_label');
            label.htmlFor = id;
            const box = /** @type {HTMLInputElement} */ (el('input'));
            box.type = 'checkbox';
            box.id = id;
            box.addEventListener('input', () => store(box.checked ? true : undefined));
            label.append(box, el('span', '', t(item.label)));
            row.append(label);
            refreshers.push(() => { box.checked = stored() === true; });
            return row;
        }

        if (item.type === 'css') {
            const label = el('label', '', t(item.label));
            label.htmlFor = id;
            const area = /** @type {HTMLTextAreaElement} */ (el('textarea', `text_pole ${prefix}-cz-css`));
            area.id = id;
            area.rows = 8;
            area.spellcheck = false;
            area.placeholder = '#chat .mes_text { letter-spacing: 0.2px; }';
            area.addEventListener('input', () => {
                get().css = area.value;
                commit();
            });
            const note = el('small', `${prefix}-cz-note`, t('Rules apply inside the theme only, and switch off with it.'));
            row.append(label, area, note);
            refreshers.push(() => {
                if (document.activeElement !== area) {
                    area.value = get().css;
                }
            });
            return row;
        }

        const label = el('label', `${prefix}-cz-label`, t(item.label));
        label.htmlFor = id;
        const control = el('div', `${prefix}-cz-control`);
        const clear = el('button', `${prefix}-cz-clear fa-solid fa-rotate-left`);
        clear.type = 'button';
        clear.title = t('Back to default');
        clear.addEventListener('click', () => store(undefined));
        /** @type {() => void} */
        let refresh;

        if (item.type === 'color') {
            const picker = /** @type {HTMLInputElement} */ (el('input', `${prefix}-cz-color`));
            picker.type = 'color';
            picker.id = id;
            const text = /** @type {HTMLInputElement} */ (el('input', `text_pole ${prefix}-cz-text`));
            text.type = 'text';
            text.spellcheck = false;
            picker.addEventListener('input', () => store(picker.value));
            text.addEventListener('change', () => {
                const value = text.value.trim();
                if (!value || (CSS.supports('color', value) && !BAD_VALUE.test(value))) {
                    store(value);
                } else {
                    refresh();
                }
            });
            control.append(picker, text);
            refresh = () => {
                const value = shown();
                picker.value = toHex(value);
                if (document.activeElement !== text) {
                    text.value = value;
                }
            };
        } else if (item.type === 'size') {
            const unit = item.unit ?? 'px';
            const range = /** @type {HTMLInputElement} */ (el('input', `${prefix}-cz-range`));
            range.type = 'range';
            range.id = id;
            const number = /** @type {HTMLInputElement} */ (el('input', `text_pole ${prefix}-cz-number`));
            number.type = 'number';
            for (const input of [range, number]) {
                input.min = String(item.min);
                input.max = String(item.max);
                input.step = String(item.step ?? 1);
            }
            // tokens hold CSS ("14px"); flags hold the bare number as a string ("180")
            const write = (value) => store(isFlag ? String(value) : `${value}${unit}`);
            range.addEventListener('input', () => write(range.value));
            number.addEventListener('change', () => {
                const value = Number(number.value);
                if (Number.isFinite(value)) {
                    write(value);
                }
            });
            control.append(range, number, el('span', `${prefix}-cz-unit`, unit === 'deg' ? '°' : unit));
            refresh = () => {
                const value = parseFloat(shown());
                const current = Number.isFinite(value) ? value : item.min;
                range.value = String(current);
                if (document.activeElement !== number) {
                    number.value = String(current);
                }
            };
        } else if (item.type === 'select') {
            const select = /** @type {HTMLSelectElement} */ (el('select', `text_pole ${prefix}-cz-select`));
            select.id = id;
            for (const [value, name] of item.options) {
                const option = /** @type {HTMLOptionElement} */ (el('option', '', t(name)));
                option.value = value;
                select.append(option);
            }
            select.addEventListener('input', () => store(select.value));
            control.append(select);
            refresh = () => { select.value = shown(); };
        } else if (item.type === 'font') {
            const select = /** @type {HTMLSelectElement} */ (el('select', `text_pole ${prefix}-cz-select`));
            select.id = id;
            for (const [value, name] of [...fonts, ['__custom', 'Another font…']]) {
                const option = /** @type {HTMLOptionElement} */ (el('option', '', t(name)));
                option.value = value;
                select.append(option);
            }
            const custom = /** @type {HTMLInputElement} */ (el('input', `text_pole ${prefix}-cz-text`));
            custom.type = 'text';
            custom.placeholder = t('Font name, e.g. Inter');
            custom.addEventListener('change', () => {
                const name = custom.value.trim().replace(/[;{}<>]/g, '');
                store(name ? `${/\s/.test(name) && !/[,"']/.test(name) ? `"${name}"` : name}, sans-serif` : '');
            });
            select.addEventListener('input', () => {
                if (select.value === '__custom') {
                    custom.hidden = false;
                    custom.focus();
                    return;
                }
                store(select.value);
            });
            control.append(select, custom);
            refresh = () => {
                const value = stored() ?? '';
                const known = fonts.some(([font]) => font === value);
                select.value = known ? value : '__custom';
                custom.hidden = known;
                if (!known && document.activeElement !== custom) {
                    custom.value = value.replace(/, sans-serif$/, '').replace(/^"|"$/g, '');
                }
            };
        } else if (item.type === 'url') {
            const text = /** @type {HTMLInputElement} */ (el('input', `text_pole ${prefix}-cz-text ${prefix}-cz-url`));
            text.type = 'url';
            text.id = id;
            text.placeholder = 'https://…';
            text.addEventListener('change', () => {
                const url = text.value.trim();
                if (!url || validFlag(item, url)) {
                    store(url);
                } else {
                    toastr.warning(t('Use a web address starting with https:// (or a path on this site).'));
                    refresh();
                }
            });
            control.append(text);
            refresh = () => {
                if (document.activeElement !== text) {
                    text.value = stored() ?? '';
                }
            };
        }

        control.append(clear);
        row.append(label, control);
        refreshers.push(() => {
            refresh();
            const changed = stored() !== undefined;
            clear.hidden = !changed;
            row.classList.toggle(`${prefix}-cz-changed`, changed);
            // background details show only for the background they belong to
            if (item.when) {
                row.hidden = flagValue(get(), 'bgMode') !== item.when;
            }
        });
        return row;
    }

    return { emptyCustomize, normalizeCustomize, applyCustomize, openCustomize };
}
