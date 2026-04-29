import { FormFieldBlueprint, createFormField } from '@backstage/plugin-scaffolder-react/alpha';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ApiSelectField } from './components/ApiSelectField';
import { CascadeSelectField } from './components/CascadeSelectField';

/**
 * Registers ApiSelectField as a Scaffolder field extension.
 *
 * Add this to your Backstage app in packages/app/src/App.tsx:
 *
 * ```tsx
 * import { ApiSelectFieldExtension } from '@cdelgehier/backstage-field-api-select';
 *
 * export default createApp({
 *   features: [catalogPlugin, ApiSelectFieldExtension],
 * });
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
const ApiSelectFieldBlueprint = FormFieldBlueprint.make({
  name: 'api-select-field',
  params: {
    field: async () => createFormField({
      name: 'ApiSelectField',
      component: ApiSelectField,
    }),
  },
});

const CascadeSelectFieldBlueprint = FormFieldBlueprint.make({
  name: 'cascade-select-field',
  params: {
    field: async () => createFormField({
      name: 'CascadeSelectField',
      component: CascadeSelectField,
    }),
  },
});

export const ApiSelectFieldExtension = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [ApiSelectFieldBlueprint, CascadeSelectFieldBlueprint],
});
