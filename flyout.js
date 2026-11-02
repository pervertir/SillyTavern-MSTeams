import { createFlyout } from './lib/flyout-menu.js';
import { own } from './own.js';

export const { closeFlyout, toggleFlyout } = createFlyout({
    prefix: 'mst',
    own,
    anchorClass: 'mst-app-open',
});
