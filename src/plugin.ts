import { createPlugin } from '@backstage/core-plugin-api';

/**
 * The Backstage plugin definition for backstage-field-api-select.
 * This is used internally by the field extension — you do not need to import it directly.
 */
export const apiSelectPlugin = createPlugin({
  id: 'api-select-field',
});
