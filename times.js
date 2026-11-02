import { createTimes, formatListTime, formatMessageTime } from './lib/message-times.js';
import { isOn } from './own.js';

export { formatListTime, formatMessageTime };
export const { initTimes, labelMessages } = createTimes({ prefix: 'mst', isOn });
