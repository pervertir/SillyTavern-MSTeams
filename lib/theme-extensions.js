// Extensions that switch off with a theme. Shared by the Discord, iMessage, Microsoft Teams and
// Yodayo themes; each copies this file unchanged.
//
// The person picks third-party extensions that clash with the theme. While the theme is on they
// are in SillyTavern's disabled extensions; when it goes off, the ones the theme disabled come
// back. An extension the person had disabled themselves is left disabled. SillyTavern loads
// extensions once, at page load, so every change needs a reload: the theme does that.
//
// Uses only SillyTavern.getContext(): extensionSettings, getRequestHeaders, saveSettingsDebounced,
// translate (if present).

export const VERSION = 1;

/** Our own themes switch through theme-exclusive.js, never here. */
const OUR_THEMES = /^third-party\/SillyTavern-(Discord|iMessage|MSTeams|YodayoTavernTheme)(-dev)?$/;

function context() {
    return SillyTavern.getContext();
}

function tr(text) {
    return context().translate?.(text) ?? text;
}

/**
 * Works out the new disabled list. Pure, so it can be tested.
 * @param {object} state
 * @param {string[]} state.disabled SillyTavern's disabled extensions
 * @param {string[]} state.chosen The extensions the person picked
 * @param {string[]} state.paused The ones this theme has disabled
 * @param {boolean} state.on Whether the theme is on
 * @returns {{disabled: string[], paused: string[], changed: boolean}}
 */
export function nextState({ disabled, chosen, paused, on }) {
    const wanted = on ? chosen : [];
    const release = paused.filter(name => !wanted.includes(name));
    const add = wanted.filter(name => !disabled.includes(name));
    return {
        disabled: [...disabled.filter(name => !release.includes(name)), ...add],
        paused: [...paused.filter(name => wanted.includes(name)), ...add],
        changed: release.length > 0 || add.length > 0,
    };
}

/**
 * @param {object} options
 * @param {() => object} options.settings The theme's settings; keeps switchExtensions (picked)
 *   and switchedExtensions (disabled by this theme) there
 * @param {() => boolean} options.isEnabled Whether the theme is on now
 * @param {(message: string) => void} options.reload Reloads the page once settings are saved
 * @returns {{sync: () => boolean, renderPicker: (container: HTMLElement) => Promise<void>}}
 */
export function registerExtensionSwitch({ settings, isEnabled, reload }) {
    /** Brings SillyTavern's list in line with the theme; true when a reload is needed. */
    const sync = () => {
        const own = settings();
        const { extensionSettings, saveSettingsDebounced } = context();
        const result = nextState({
            disabled: extensionSettings.disabledExtensions ?? [],
            chosen: own.switchExtensions ?? [],
            paused: own.switchedExtensions ?? [],
            on: isEnabled(),
        });
        if (result.changed) {
            extensionSettings.disabledExtensions = result.disabled;
            own.switchedExtensions = result.paused;
            saveSettingsDebounced();
        }
        return result.changed;
    };

    const renderPicker = async (container) => {
        const box = document.createElement('div');
        box.className = 'st-theme-ext-switch';
        const title = document.createElement('b');
        title.textContent = tr('Turn off while this theme is on');
        const note = document.createElement('small');
        note.textContent = tr('For extensions that clash with the theme. They come back when the theme is turned off.');
        note.style.display = 'block';
        const list = document.createElement('div');
        list.style.cssText = 'max-height:220px;overflow-y:auto;margin:6px 0';
        const apply = document.createElement('div');
        apply.className = 'menu_button';
        apply.textContent = tr('Apply and reload');
        apply.style.cssText = 'display:none;width:fit-content';
        apply.addEventListener('click', () => {
            sync();
            reload(tr('Extensions updated.'));
        });

        let names = [];
        try {
            const response = await fetch('/api/extensions/discover', { headers: context().getRequestHeaders() });
            names = (await response.json()).map(x => x.name).filter(name => name.startsWith('third-party/') && !OUR_THEMES.test(name));
        } catch (error) {
            console.warn('[Theme] Could not list extensions', error);
        }
        const labels = await Promise.all(names.map(async (name) => {
            try {
                const manifest = await (await fetch(`/scripts/extensions/${name}/manifest.json`)).json();
                return manifest.display_name || name.replace('third-party/', '');
            } catch {
                return name.replace('third-party/', '');
            }
        }));
        names.map((name, i) => ({ name, label: labels[i] }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .forEach(({ name, label }) => {
                const row = document.createElement('label');
                row.className = 'checkbox_label';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = (settings().switchExtensions ?? []).includes(name);
                input.addEventListener('input', () => {
                    const own = settings();
                    const chosen = new Set(own.switchExtensions ?? []);
                    input.checked ? chosen.add(name) : chosen.delete(name);
                    own.switchExtensions = [...chosen];
                    context().saveSettingsDebounced();
                    // takes effect at once only with a reload, so that's the person's call
                    if (isEnabled()) {
                        apply.style.display = '';
                    }
                });
                const text = document.createElement('span');
                text.textContent = label;
                row.append(input, text);
                list.append(row);
            });
        if (!names.length) {
            const empty = document.createElement('small');
            empty.textContent = tr('No other extensions installed.');
            list.append(empty);
        }
        box.append(title, note, list, apply);
        container.append(box);
    };

    return { sync, renderPicker };
}
