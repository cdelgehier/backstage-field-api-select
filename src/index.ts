// Plugin
export { apiSelectPlugin } from './plugin';

// Field extension (register this in your Backstage app)
export { ApiSelectFieldExtension } from './extensions';

// Types (useful for writing template validation or custom wrappers)
export type { ApiSelectFieldOptions } from './schema';
