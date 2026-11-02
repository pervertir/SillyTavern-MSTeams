// Nicknames, shared unchanged between our themes, at three levels: this chat (in the chat's metadata),
// this group and everywhere (both in extension settings). The closest one wins. Chats always keep real
// names: nicknames are put in when text is shown or sent to the AI, and taken out of what the AI writes,
// so changing or clearing one changes every message.
//
// registerNicknames({ isOn, changed, t }) once when the theme starts;
// nameFor(avatar, realName, fileId) wherever the theme writes a person's name; openNicknames() to edit.
// A persona is the avatar USER. Nothing is marked on the page: names are drawn from the chat's data.

const META_KEY = 'st_nicknames';
const SETTINGS_KEY = 'stNicknames';
const CHANGED_EVENT = 'sillytavern-nicknames-changed';
export const USER = 'user';

let options = { isOn: () => false, changed: () => {}, t: text => text };

function context() {
    return SillyTavern.getContext();
}

function stored() {
    const settings = context().extensionSettings;
    settings[SETTINGS_KEY] ??= {};
    settings[SETTINGS_KEY].everywhere ??= {};
    settings[SETTINGS_KEY].groups ??= {};
    return settings[SETTINGS_KEY];
}

/** You're kept by persona name everywhere, as a persona has no file to name here */
function everywhereKey(avatar) {
    return avatar === USER ? `user:${context().name1}` : avatar;
}

/** The nickname set at one level: 'chat', 'group' or 'everywhere'. */
function nicknameAt(level, avatar) {
    const { chatMetadata, groupId } = context();
    if (level === 'chat') {
        return chatMetadata?.[META_KEY]?.[avatar] ?? '';
    }
    if (level === 'group') {
        return groupId ? stored().groups[groupId]?.[avatar] ?? '' : '';
    }
    return stored().everywhere[everywhereKey(avatar)] ?? '';
}

/** A person's nickname right now, the closest level first, or ''. */
export function nicknameOf(avatar) {
    return nicknameAt('chat', avatar) || nicknameAt('group', avatar) || nicknameAt('everywhere', avatar);
}

/** The name to show. For another chat's file, only the everywhere nickname counts. */
export function nameFor(avatar, realName, fileId = '') {
    if (!options.isOn()) {
        return realName;
    }
    if (fileId && fileId !== context().getCurrentChatId()) {
        return nicknameAt('everywhere', avatar) || realName;
    }
    return nicknameOf(avatar) || realName;
}

function setNickname(level, avatar, value) {
    const { chatMetadata, groupId } = context();
    let all;
    let key = avatar;
    if (level === 'chat') {
        all = chatMetadata[META_KEY] ??= {};
    } else if (level === 'group') {
        all = stored().groups[groupId] ??= {};
    } else {
        all = stored().everywhere;
        key = everywhereKey(avatar);
    }
    if (value) {
        all[key] = value;
    } else {
        delete all[key];
    }
}

/** Saves after a change, and tells whichever theme is on. */
async function saved() {
    context().saveSettingsDebounced();
    await context().saveMetadata();
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

/** The avatar a message belongs to. */
function avatarOf(message) {
    const { characters, characterId } = context();
    if (message.is_user) {
        return USER;
    }
    return message.original_avatar ?? characters.find(x => x.name === message.name)?.avatar ?? characters[characterId]?.avatar ?? '';
}

/** Writes the right name on messages: all of them, or one by its id. */
function paintMessages(mesId = null) {
    const { chat } = context();
    const list = options.isOn() ? renames() : [];
    const rows = mesId === null ? document.querySelectorAll('#chat > .mes') : document.querySelectorAll(`#chat > .mes[mesid="${Number(mesId)}"]`);
    for (const row of rows) {
        const message = chat[Number(row.getAttribute('mesid'))];
        const label = row.querySelector('.ch_name .name_text');
        if (!message || message.is_system) {
            continue;
        }
        const wanted = nameFor(avatarOf(message), message.name);
        if (label && label.textContent !== wanted) {
            label.textContent = wanted;
        }
        paintText(row.querySelector('.mes_text'), list);
    }
}

/** What each text on screen really says: text nodes -> { real, shown }. Nothing is marked on the page. */
const texts = new WeakMap();

/** Shows nicknames in a message's text, from its real text, so they can change or go back. */
function paintText(root, list) {
    if (!root) {
        return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let known = texts.get(node);
        // drawn anew since we were last here
        if (!known || known.shown !== node.data) {
            known = { real: node.data };
        }
        const shown = applyNicknames(known.real, list);
        if (node.data !== shown) {
            node.data = shown;
        }
        known.shown = shown;
        texts.set(node, known);
    }
}

/** The people in the open chat: its character or a group's members, then you. */
function peopleInChat() {
    const { characters, characterId, groupId, groups, name1 } = context();
    const group = groupId ? groups.find(x => String(x.id) === String(groupId)) : null;
    const members = group
        ? (group.members ?? []).map(avatar => characters.find(x => x.avatar === avatar)).filter(Boolean)
        : [characters[characterId]].filter(Boolean);
    return [...members.map(x => ({ avatar: x.avatar, name: x.name })), { avatar: USER, name: name1 }];
}

/** Whether there's a chat to keep nicknames in. */
export function canUseNicknames() {
    return !!context().getCurrentChatId();
}

/** Opens the editor for the people in the open chat. */
export async function openNicknames() {
    if (!canUseNicknames()) {
        return;
    }
    const { t } = options;
    const levels = [['chat', t('This chat')], ...(context().groupId ? [['group', t('This group')]] : []), ['everywhere', t('Everywhere')]];
    const form = document.createElement('div');
    form.className = 'st-nicknames';
    form.style.cssText = 'display:flex;flex-direction:column;gap:12px;text-align:left;min-width:min(480px,80vw)';
    const title = document.createElement('h3');
    title.textContent = t('Nicknames');
    title.style.margin = '0';
    const note = document.createElement('small');
    note.textContent = t('The closest one wins. Nicknames are also used with the AI. Clearing one puts the real name back everywhere.');
    form.append(title, note);
    const fields = [];
    for (const { avatar, name } of peopleInChat()) {
        const person = document.createElement('div');
        person.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        const label = document.createElement('b');
        label.textContent = avatar === USER ? `${name} (${t('You')})` : name;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
        for (const [level, levelName] of levels) {
            const cell = document.createElement('label');
            cell.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1 1 130px;min-width:0;font-size:0.85em';
            cell.textContent = levelName;
            const input = document.createElement('input');
            input.className = 'text_pole';
            input.value = nicknameAt(level, avatar);
            input.placeholder = name;
            input.maxLength = 80;
            cell.append(input);
            row.append(cell);
            fields.push({ level, avatar, input });
        }
        person.append(label, row);
        form.append(person);
    }
    const { Popup, POPUP_TYPE, POPUP_RESULT } = context();
    const result = await new Popup(form, POPUP_TYPE.CONFIRM, '', { okButton: t('Save'), cancelButton: t('Cancel') }).show();
    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        return;
    }
    for (const { level, avatar, input } of fields) {
        setNickname(level, avatar, input.value.trim());
    }
    await saved();
}

/* ---------- with the AI ---------- */

/** Everyone in the open chat with a nickname: longest real name first, so names inside names are safe. */
function renames() {
    return peopleInChat()
        .map(({ avatar, name }) => ({ name, nickname: nicknameOf(avatar) }))
        .filter(({ name, nickname }) => name && nickname && nickname !== name)
        .sort((a, b) => b.name.length - a.name.length);
}

/** Writes nicknames over whole-word real names. */
export function applyNicknames(text, list = renames()) {
    let result = String(text ?? '');
    for (const { name, nickname } of list) {
        const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${safe}(?![\\p{L}\\p{N}_])`, 'gu'), () => nickname);
    }
    return result;
}

/** The prompt, as text or as messages. */
function renamePrompt(data) {
    const list = renames();
    if (!list.length) {
        return;
    }
    if (typeof data.prompt === 'string') {
        data.prompt = applyNicknames(data.prompt, list);
    }
    for (const message of Array.isArray(data.chat) ? data.chat : []) {
        if (typeof message.content === 'string') {
            message.content = applyNicknames(message.content, list);
        } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
                if (typeof part.text === 'string') {
                    part.text = applyNicknames(part.text, list);
                }
            }
        }
        if (typeof message.name === 'string') {
            // chat APIs only take simple names here
            message.name = applyNicknames(message.name, list).replace(/[^a-zA-Z0-9_-]/g, '_');
        }
    }
}

/** The AI now writes nicknames, so it must stop at them too, as SillyTavern stops at real names. */
function addStops(data) {
    const stops = renames().map(({ nickname }) => `\n${nickname}:`);
    for (const key of ['stop', 'stopping_strings', 'stop_sequence', 'stop_sequences']) {
        if (stops.length && Array.isArray(data?.[key])) {
            data[key].push(...stops.filter(stop => !data[key].includes(stop)));
        }
    }
}

/** A reply: nicknames the AI wrote become real names in what's kept, and show again as nicknames. */
function keepRealNames(id) {
    const list = renames();
    const context_ = context();
    const message = context_.chat[Number(id)];
    if (!list.length || !message || message.is_user || message.is_system) {
        return;
    }
    const wanted = applyNicknames(message.mes, list.map(({ name, nickname }) => ({ name: nickname, nickname: name })));
    // SillyTavern takes "Name:" off the start of a reply only for the real name, and the AI knows the nickname
    const prefix = `${message.name}:`;
    const text = wanted.startsWith(prefix) ? wanted.slice(prefix.length).trimStart() : wanted;
    if (text === message.mes) {
        return;
    }
    message.mes = text;
    if (Array.isArray(message.swipes) && message.swipes[message.swipe_id ?? 0] !== undefined) {
        message.swipes[message.swipe_id ?? 0] = text;
    }
    if (document.querySelector(`#chat > .mes[mesid="${Number(id)}"]`)) {
        context_.updateMessageBlock?.(Number(id), message);
        paintMessages(id);
    }
    context_.saveChat?.();
}

/** /nickname, for scripts and quick replies; the first theme to start adds it. */
function addCommand() {
    if (globalThis.stNicknameCommand) {
        return;
    }
    globalThis.stNicknameCommand = true;
    const { SlashCommandParser, SlashCommand, SlashCommandNamedArgument, SlashCommandArgument, ARGUMENT_TYPE } = context();
    if (!SlashCommandParser || !SlashCommand) {
        return;
    }
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'nickname',
        helpString: 'Sets a nickname, for the open character or the member named by for= (for=user is you), in this chat or with level=group or level=everywhere. Empty clears it.',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({ name: 'for', description: 'a member\'s name, or user', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'level', description: 'chat, group or everywhere', typeList: [ARGUMENT_TYPE.STRING], enumList: ['chat', 'group', 'everywhere'] }),
        ],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: 'the nickname', typeList: [ARGUMENT_TYPE.STRING] })],
        callback: async (args, value) => {
            if (!canUseNicknames()) {
                return '';
            }
            const people = peopleInChat();
            const wanted = String(args.for ?? '').toLowerCase();
            const person = wanted === USER ? people.at(-1) : wanted ? people.find(x => x.name.toLowerCase() === wanted) : people[0];
            const level = ['group', 'everywhere'].includes(args.level) ? args.level : 'chat';
            if (person && (level !== 'group' || context().groupId)) {
                setNickname(level, person.avatar, String(value ?? '').trim());
                await saved();
            }
            return '';
        },
    }));
}

/**
 * @param {{isOn: () => boolean, changed?: () => void, t?: (text: string) => string}} given
 */
export function registerNicknames(given) {
    options = { ...options, ...given };
    const { eventSource, eventTypes } = context();
    const whenOn = handler => (...args) => options.isOn() && handler(...args);
    const redraw = () => {
        paintMessages();
        options.changed();
    };
    // themes may draw a message again just after this, as Discord's short messages do
    const paintSoon = (id) => {
        paintMessages(id);
        setTimeout(() => paintMessages(id), 0);
        setTimeout(() => paintMessages(id), 400);
    };
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, whenOn(paintSoon));
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, whenOn(paintSoon));
    for (const type of [eventTypes.CHAT_CHANGED, eventTypes.MORE_MESSAGES_LOADED, eventTypes.MESSAGE_UPDATED, eventTypes.MESSAGE_DELETED, eventTypes.MESSAGE_SWIPED]) {
        eventSource.on(type, whenOn(() => {
            setTimeout(() => paintMessages(), 0);
            setTimeout(() => paintMessages(), 400);
        }));
    }
    window.addEventListener(CHANGED_EVENT, whenOn(redraw));
    eventSource.on(eventTypes.GENERATE_AFTER_COMBINE_PROMPTS, whenOn(renamePrompt));
    eventSource.on(eventTypes.CHAT_COMPLETION_PROMPT_READY, whenOn(renamePrompt));
    eventSource.on(eventTypes.GENERATE_AFTER_DATA, whenOn(addStops));
    eventSource.on(eventTypes.CHAT_COMPLETION_SETTINGS_READY, whenOn(addStops));
    eventSource.on(eventTypes.MESSAGE_RECEIVED, whenOn(keepRealNames));
    // turned on or off: the names follow
    let wasOn = options.isOn();
    new MutationObserver(() => {
        const on = options.isOn();
        if (on !== wasOn) {
            wasOn = on;
            paintMessages();
        }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    addCommand();
    if (wasOn) {
        paintMessages();
    }
}
