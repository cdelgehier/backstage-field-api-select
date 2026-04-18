![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=React&logoColor=black)
![Backstage](https://img.shields.io/badge/Backstage-1.36+-9BF0E1.svg?style=for-the-badge&logo=backstage&logoColor=black)
![MUI](https://img.shields.io/badge/MUI-9-007FFF.svg?style=for-the-badge&logo=mui&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1.svg?style=for-the-badge&logo=zod&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)
![Tests](https://img.shields.io/github/actions/workflow/status/cdelgehier/backstage-field-api-select/bump-version.yml?style=for-the-badge&label=CI)

# backstage-field-api-select

A Backstage Scaffolder field extension that loads its dropdown options from an external API via the Backstage proxy.

Designed as a drop-in replacement for Roadie's `SelectFieldFromApi` with full support for features that Roadie's plugin does not cover.

| Feature | Roadie `SelectFieldFromApi` | `ApiSelectField` |
|---|---|---|
| Simple key=value params | ✅ | ✅ |
| Array params (`?key=a&key=b`) | ❌ | ✅ |
| Autocomplete / typeahead | ❌ | ✅ |
| Multiselect | ❌ | ✅ |
| `minItems` validation | ❌ | ✅ |
| Dynamic params from other fields | ❌ | ✅ |
| Dynamic path segments from other fields | ❌ | ✅ |
| No external dependency | ❌ | ✅ |

---

## Getting Started

Three steps to see the field running locally, from zero.

### 1. Build the package

```bash
git clone https://github.com/cdelgehier/backstage-field-api-select.git
cd backstage-field-api-select
task install
task build        # compiles to dist/
```

### 2. Spin up a local Backstage demo

The demo runs in Docker (Node 20) — no local Node version constraint.

```bash
task backstage:setup   # builds the plugin, packs it, and builds the Docker image (~10 min, once)
task backstage:start   # docker run — Backstage frontend on :3000 + proxy on :7007
```

> `task backstage:setup` must be re-run whenever the plugin source changes.

`task backstage:start` runs **two processes inside the same container**: the Backstage frontend on port 3000
and a lightweight proxy on port 7007. The proxy forwards `/api/proxy/demo-api/*` to `PROXY_TARGET`
(default: [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com)).
The browser fetches data from `:3000`, which calls `:7007`, which calls the upstream API.

To point the demo at a different API, pass `PROXY_TARGET` at build time:

```bash
task backstage:setup PROXY_TARGET=https://my-api.example.com
```

#### Using a VPN-only or internal API

Docker containers run in an isolated network (Lima VM on macOS) and **cannot reach VPN-protected hosts**.
In that case, split the two processes: run the proxy on your Mac (which has VPN access) and the frontend in Docker.

```bash
# Terminal 1 — proxy on the host (has VPN access), port 7007
task backstage:proxy PROXY_TARGET=https://my-internal-api.example.com

# Terminal 2 — frontend only in Docker, port 3000 (no proxy inside)
task backstage:start:frontend
```

The browser calls `localhost:7007` (Mac host proxy) → your internal API. The frontend container never touches the VPN.

### 3. Try the full example template

Open the Template Editor at [http://localhost:3000/create/template-form](http://localhost:3000/create/template-form) and paste the block below.
It covers every `ui:options` the field supports.

> **What is `demo-api`?**
> In the template examples, `path: demo-api/posts` maps to the proxy endpoint `/api/proxy/demo-api/posts`.
> `demo-api` is the proxy prefix configured in the demo's `app-config.yaml` and forwarded to `PROXY_TARGET`
> by the built-in proxy server. In a real Backstage app, replace `demo-api` with the key you define under
> `proxy.endpoints` in your own `app-config.yaml`.

> The Template Editor accepts only `parameters:` + `steps:` — leave out `apiVersion / kind / metadata / spec`.

```yaml
parameters:
  - title: Full ApiSelectField demo
    properties:

      # --- Single select, flat array response ----------------------------
      # API returns: [{ value: "1", label: "Post 1" }, ...]
      single_select:
        title: Single select (flat array)
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          valueSelector: id       # key used as the option value
          labelSelector: title    # key used as the option label

      # --- Single select, nested response --------------------------------
      # API returns: { data: { items: [{ code: "a", name: "Alpha" }] } }
      nested_response:
        title: Single select (nested response)
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          arraySelector: ''       # dot-separated path, e.g. "data.items"
          valueSelector: id
          labelSelector: title

      # --- Static query parameters ---------------------------------------
      # Calls: /proxy/demo-api/posts?userId=1&_limit=5
      with_params:
        title: With static query params
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          params:
            userId: '1'
            _limit: '5'
          valueSelector: id
          labelSelector: title

      # --- Array query parameters ----------------------------------------
      # Calls: /proxy/demo-api/posts?id=1&id=2&id=3
      # Use this when the API expects the same key repeated, not comma-separated.
      with_array_params:
        title: With array query params
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          arrayParams:
            id:
              - '1'
              - '2'
              - '3'
          valueSelector: id
          labelSelector: title

      # --- Placeholder text -----------------------------------------------
      with_placeholder:
        title: With placeholder
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          valueSelector: id
          labelSelector: title
          placeholder: Start typing to search…

      # --- Multiselect ----------------------------------------------------
      # type must be array + items: type: string
      multiselect:
        title: Multiselect
        type: array
        items:
          type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          valueSelector: id
          labelSelector: title
          multiple: true

      # --- Multiselect with minimum required selections -------------------
      multiselect_min:
        title: Multiselect (min 2 required)
        type: array
        items:
          type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/posts
          valueSelector: id
          labelSelector: title
          multiple: true
          minItems: 2
          placeholder: Pick at least 2…

      # --- Dynamic query param from another field -------------------------
      # ${{ parameters.xxx }} is substituted at render time from live form data.
      dynamic_param:
        title: Dynamic param (depends on single_select above)
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: demo-api/comments
          params:
            postId: '${{ parameters.single_select }}'
          valueSelector: id
          labelSelector: name

steps:
  - id: log
    name: Log selections
    action: debug:log
    input:
      message: |
        single_select:      ${{ parameters.single_select }}
        nested_response:    ${{ parameters.nested_response }}
        with_params:        ${{ parameters.with_params }}
        with_array_params:  ${{ parameters.with_array_params }}
        multiselect:        ${{ parameters.multiselect }}
        multiselect_min:    ${{ parameters.multiselect_min }}
        dynamic_param:      ${{ parameters.dynamic_param }}
```

---

## Installation

```bash
npm install backstage-field-api-select
```

---

## Setup

### 1. Register the field extension

In `packages/app/src/App.tsx`, add `ApiSelectFieldExtension` inside `ScaffolderFieldExtensions`:

```tsx
import { ApiSelectFieldExtension } from 'backstage-field-api-select';

// Inside your FlatRoutes:
<Route path="/create" element={<ScaffolderPage />}>
  <ScaffolderFieldExtensions>
    <ApiSelectFieldExtension />
  </ScaffolderFieldExtensions>
</Route>
```

### 2. Configure the proxy

In your `app-config.yaml`, expose the API you want to query via the Backstage proxy:

```yaml
proxy:
  endpoints:
    /my-api:
      target: https://my-internal-api.example.com
      changeOrigin: true
```

The field will call `${backstageProxyBase}/my-api/<path>`.

---

## Usage

Use `ui:field: ApiSelectField` in any Scaffolder template:

```yaml
parameters:
  - title: Choose a resource
    properties:
      bucket:
        title: S3 Bucket
        type: string
        ui:field: ApiSelectField
        ui:options:
          path: my-api/accounts/123456789/s3-buckets
          params:
            region_name: eu-west-1
            include_empty: 'true'
          arrayParams:
            exclude_patterns:
              - '^prod-logs-.*'
              - '^backup-.*'
          valueSelector: value
          labelSelector: label
```

### All `ui:options`

| Option | Type | Default | Description |
|---|---|---|---|
| `path` | `string` | **required** | API path appended to the proxy base URL. Supports `${{ parameters.xxx }}` for dynamic path segments. |
| `params` | `Record<string, string>` | — | Static query parameters (`?key=value`). Values support `${{ parameters.xxx }}`. |
| `arrayParams` | `Record<string, string[]>` | — | Array query parameters (`?key=a&key=b`). |
| `arraySelector` | `string` | — | Dot-separated path into the response before reading options. Example: `"data.items"`. |
| `valueSelector` | `string` | `"value"` | Key used as the option value from each item. If the API already returns `{ value: ..., label: ... }`, you can omit both selectors. |
| `labelSelector` | `string` | `"label"` | Key used as the option label. Falls back to `valueSelector` if absent from the item. |
| `multiple` | `boolean` | `false` | Allow the user to select more than one option. |
| `minItems` | `number` | — | Minimum number of options that must be selected (multiselect only). |
| `placeholder` | `string` | — | Placeholder text shown before the user types. |

---

## Examples

### Single select from a nested response

The API returns `{ result: { items: [{ id: "eu-west-1", name: "EU West 1" }, ...] } }`.

```yaml
region:
  title: AWS Region
  type: string
  ui:field: ApiSelectField
  ui:options:
    path: my-api/regions
    arraySelector: result.items
    valueSelector: id
    labelSelector: name
```

### Multiselect with a minimum selection

```yaml
securityGroups:
  title: Security Groups
  type: array
  items:
    type: string
  ui:field: ApiSelectField
  ui:options:
    path: my-api/accounts/123456789/security-groups
    params:
      region_name: eu-west-1
    arrayParams:
      exclude_patterns:
        - '^default$'
    multiple: true
    minItems: 1
    placeholder: Choose at least one security group…
```

### Dynamic param from another field

Use `${{ parameters.xxx }}` in `params` values — the field re-fetches automatically when the referenced field changes:

```yaml
subnet:
  title: Subnet
  type: string
  ui:field: ApiSelectField
  ui:options:
    path: my-api/subnets
    params:
      region_name: '${{ parameters.region }}'
      env: '${{ parameters.env }}'
    valueSelector: value
    labelSelector: label
```

### Dynamic path segment from another field

Use `${{ parameters.xxx }}` directly in `path` for APIs with path parameters — useful when filtering depends on a resource ID selected in a previous field:

```yaml
vpc:
  title: VPC
  type: string
  ui:field: ApiSelectField
  ui:options:
    path: my-api/accounts/123456789/vpcs
    valueSelector: value
    labelSelector: label

subnets:
  title: Subnets
  type: array
  items:
    type: string
  ui:field: ApiSelectField
  ui:options:
    path: my-api/accounts/123456789/vpcs/${{ parameters.vpc }}/subnets
    valueSelector: value
    labelSelector: label
    multiple: true
    minItems: 1
```

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Task](https://taskfile.dev/) — task runner (`brew install go-task`)
- [pre-commit](https://pre-commit.com/) — git hooks (`brew install pre-commit` or `pip install pre-commit`)

### Setup

```bash
git clone https://github.com/cdelgehier/backstage-field-api-select.git
cd backstage-field-api-select

task install

# Install git hooks (run once after cloning)
pre-commit install
pre-commit install --hook-type commit-msg
```

### Available tasks

```
task install                Install all dependencies
task build                  Compile the package to dist/
task test                   Run all tests
task test:watch             Run tests in watch mode
task test:coverage          Run tests with coverage report
task lint                   Check code style with ESLint
task type-check             Check TypeScript types
task ci                     Run the full CI pipeline (lint + type-check + test)
task clean                  Remove all build artifacts
task backstage:setup        Build the plugin and Docker demo image (re-run after source changes)
task backstage:start        Start the demo (frontend + proxy for jsonplaceholder)
task backstage:proxy        Run the proxy on the host — use for VPN-protected APIs
task backstage:start:frontend  Start only the frontend — pair with backstage:proxy
```

### Commit convention

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec — enforced by the `commitizen` pre-commit hook on every commit and verified by the CI on every push and PR.

```bash
# Good
git commit -m "feat: add support for dynamic params from other fields"
git commit -m "fix: avoid re-fetch when unrelated props change"
git commit -m "docs: add multiselect example to README"
```

---

## License

MIT © [Cédric Delgehier](https://github.com/cdelgehier)
