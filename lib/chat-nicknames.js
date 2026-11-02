// Nicknames per chat, shared unchanged between our themes. A nickname is kept in the chat's
// metadata and only changes what's shown: messages keep their real names, so prompts are the same.
//
// registerNicknames({ isOn, changed, t }) once when the theme starts;
// nameFor(avatar, realName, fileId) wherever the theme writes a person's name; openNicknames() to edit.
// A persona is the avatar USER. Nothing is marked on the page: names are drawn from the chat's data.

const META_KEY = 'st_nicknames';
const CHANGED_EVENT = 'sillytavern-nicknames-changed';
export const USER = 'user';

let options = { isOn: () => false, changed: () => {}, t: text => text };

function context() {
    return SillyTavern.getContext();
}

/** A person's nickname in the open chat, or ''. */
export function nicknameOf(avatar) {
    return context().chatMetadata?.[META_KEY]?.[avatar] ?? '';
}

/** The name to show. With a chat file given, a nickname only counts if that chat is the open one. */
export function nameFor(avatar, realName, fileId = '') {
    if (!options.isOn() || (fileId && fileId !== context().getCurrentChatId())) {
        return realName;
    }
    return nicknameOf(avatar) || realName;
}

function setNickname(avatar, value) {
    const metadata = context().chatMetadata;
    const all = metadata[META_KEY] ??= {};
    if (value) {
        all[avatar] = value;
    } else {
        delete all[avatar];
    }
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
    const rows = mesId === null ? document.querySelectorAll('#chat > .mes') : document.querySelectorAll(`#chat > .mes[mesid="${Number(mesId)}"]`);
    for (const row of rows) {
        const message = chat[Number(row.getAttribute('mesid'))];
        const label = row.querySelector('.ch_name .name_text');
        if (!message || !label || message.is_system) {
            continue;
        }
        const wanted = nameFor(avatarOf(message), message.name);
        if (label.textContent !== wanted) {
            label.textContent = wanted;
        }
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
    const form = document.createElement('div');
    form.className = 'st-nicknames';
    form.style.cssText = 'display:flex;flex-direction:column;gap:10px;text-align:left;min-width:min(360px,80vw)';
    const title = document.createElement('h3');
    title.textContent = t('Nicknames');
    title.style.margin = '0';
    const note = document.createElement('small');
    note.textContent = t('Only in this chat. The AI still uses their real names.');
    form.append(title, note);
    const fields = peopleInChat().map(({ avatar, name }) => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        label.textContent = avatar === USER ? `${name} (${t('You')})` : name;
        const input = document.createElement('input');
        input.className = 'text_pole';
        input.value = nicknameOf(avatar);
        input.placeholder = name;
        input.maxLength = 80;
        label.append(input);
        form.append(label);
        return { avatar, input };
    });
    const { Popup, POPUP_TYPE, POPUP_RESULT } = context();
    const result = await new Popup(form, POPUP_TYPE.CONFIRM, '', { okButton: t('Save'), cancelButton: t('Cancel') }).show();
    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        return;
    }
    for (const { avatar, input } of fields) {
        setNickname(avatar, input.value.trim());
    }
    await context().saveMetadata();
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
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
        helpString: 'Sets a nickname in this chat, for the open character or the member named by for=. Empty clears it. for=user is you.',
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'for', description: 'a member\'s name, or user', typeList: [ARGUMENT_TYPE.STRING] })],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: 'the nickname', typeList: [ARGUMENT_TYPE.STRING] })],
        callback: async (args, value) => {
            if (!canUseNicknames()) {
                return '';
            }
            const people = peopleInChat();
            const wanted = String(args.for ?? '').toLowerCase();
            const person = wanted === USER ? people.at(-1) : wanted ? people.find(x => x.name.toLowerCase() === wanted) : people[0];
            if (person) {
                setNickname(person.avatar, String(value ?? '').trim());
                await context().saveMetadata();
                window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
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
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, whenOn(id => paintMessages(id)));
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, whenOn(id => paintMessages(id)));
    for (const type of [eventTypes.CHAT_CHANGED, eventTypes.MORE_MESSAGES_LOADED, eventTypes.MESSAGE_UPDATED, eventTypes.MESSAGE_DELETED, eventTypes.MESSAGE_SWIPED]) {
        eventSource.on(type, whenOn(() => setTimeout(paintMessages, 0)));
    }
    window.addEventListener(CHANGED_EVENT, whenOn(redraw));
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
