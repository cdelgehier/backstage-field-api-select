## v0.5.1 (2026-05-21)

### Fix

- **ci**: switch npm publish to OIDC Trusted Publisher

## v0.5.0 (2026-05-21)

### Feat

- export ApiSelectFieldExtension as default for auto-discovery
- add backstage role and exports for auto-discovery

### Fix

- restore ignoreDeprecations 6.0 for TypeScript 6 compatibility

### Refactor

- migrate plugin.ts to new frontend-plugin-api

## v0.4.0 (2026-04-29)

### Feat

- **field**: add CascadeSelectField, extend substitute() for dotted paths, clear stale values on refetch

### Fix

- **field**: fix multiselect native required, empty-path guard, and null pre-population

## v0.3.1 (2026-04-18)

### Fix

- publish scoped package as public

## v0.3.0 (2026-04-18)

### Feat

- add maxItems validation and option cap for multiselect
- scope package as @cdelgehier/backstage-field-api-select

### Fix

- **tests**: silence MUI v5/v9 compat warnings and isolate test scope

## v0.2.0 (2026-04-18)

### Feat

- initial release — ApiSelectField with standalone demo proxy
