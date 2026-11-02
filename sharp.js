import { createSharpImages } from './lib/sharp-images.js';
import { isOn } from './own.js';

export const initSharpImages = createSharpImages({ prefix: 'mst', isOn });
