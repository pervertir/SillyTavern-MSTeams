// Teams-style message times: "10:42 AM" today, "Yesterday 10:42 AM", "10/21 3:15 PM" this year.
// The short time goes in a data attribute on SillyTavern's own .timestamp; CSS shows it in place of the long date.

import { isOn } from './own.js';
import { t } from './util.js';

/** Formats a message's send date the way Teams labels a message. */
export function formatMessageTime(sendDate) {
    const { timestampToMoment } = SillyTavern.getContext();
    const time = timestampToMoment(sendDate);
    if (!time?.isValid?.()) {
        return '';
    }
    const now = timestampToMoment(Date.now());
    if (time.isSame(now, 'day')) {
        return time.format('LT');
    }
    if (time.isSame(now.clone().subtract(1, 'day'), 'day')) {
        return `${t('Yesterday')} ${time.format('LT')}`;
    }
    if (time.isSame(now, 'year')) {
        return time.format('M/D LT');
    }
    return time.format('l LT');
}

/** Formats a chat list time: the clock today, the weekday this week, else the date. */
export function formatListTime(timestamp) {
    const { timestampToMoment } = SillyTavern.getContext();
    const time = timestampToMoment(timestamp);
    if (!time?.isValid?.()) {
        return '';
    }
    const now = timestampToMoment(Date.now());
    if (time.isSame(now, 'day')) {
        return time.format('LT');
    }
    if (now.diff(time, 'days') < 7) {
        return time.format('ddd');
    }
    return time.format(time.isSame(now, 'year') ? 'M/D' : 'l');
}

function labelMessage(mes) {
    const message = SillyTavern.getContext().chat[Number(mes.getAttribute('mesid'))];
    const stamp = mes.querySelector('.timestamp');
    if (!message || !stamp) {
        return;
    }
    const label = message.send_date ? formatMessageTime(message.send_date) : '';
    if (label) {
        stamp.dataset.mstTime = label;
    } else {
        delete stamp.dataset.mstTime;
    }
}

/** Labels one message by id, or every message in the chat. */
export function labelMessages(mesId) {
    const chat = document.getElementById('chat');
    // nothing is added to SillyTavern's messages while the theme is off
    if (!chat || !isOn()) {
        return;
    }
    if (mesId !== undefined && mesId !== null && mesId !== '') {
        const mes = chat.querySelector(`.mes[mesid="${Number(mesId)}"]`);
        if (mes) {
            labelMessage(mes);
        }
        return;
    }
    chat.querySelectorAll(':scope > .mes[mesid]').forEach(labelMessage);
}

export function initTimes() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    const one = (mesId) => labelMessages(mesId);
    // a whole chat is printed before CHAT_CHANGED settles, so label after the current task
    const all = () => setTimeout(() => labelMessages(), 0);

    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, one);
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, one);
    eventSource.on(eventTypes.MESSAGE_SWIPED, one);
    eventSource.on(eventTypes.MESSAGE_UPDATED, one);
    eventSource.on(eventTypes.MESSAGE_EDITED, one);
    eventSource.on(eventTypes.CHAT_CHANGED, all);
    eventSource.on(eventTypes.MORE_MESSAGES_LOADED, all);
    eventSource.on(eventTypes.MESSAGE_DELETED, all);
    all();
}
