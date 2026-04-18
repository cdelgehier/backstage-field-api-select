import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { ApiSelectField } from './components/ApiSelectField';

/**
 * Registers ApiSelectField as a Scaffolder field extension.
 *
 * Add this to your Backstage app in packages/app/src/App.tsx:
 *
 * ```tsx
 * import { ApiSelectFieldExtension } from 'backstage-field-api-select';
 *
 * // Inside your routes:
 * <Route path="/create" element={<ScaffolderPage />}>
 *   <ScaffolderFieldExtensions>
 *     <ApiSelectFieldExtension />
 *   </ScaffolderFieldExtensions>
 * </Route>
 * ```
 *
 * Then use it in any template.yaml:
 *
 * ```yaml
 * myField:
 *   type: string
 *   ui:field: ApiSelectField
 *   ui:options:
 *     path: myapi/items
 * ```
 */
export const ApiSelectFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'ApiSelectField',
    component: ApiSelectField,
  }),
);
