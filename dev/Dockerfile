FROM node:20-bookworm

ENV HOST=0.0.0.0

WORKDIR /workspace

# Root package.json (npm workspaces — no Yarn 4, no isolated-vm)
RUN node -e "require('fs').writeFileSync('package.json', JSON.stringify({ \
  name: 'root', private: true, workspaces: ['packages/app'] \
}, null, 2))"

# App package.json — frontend only, no backend
RUN mkdir -p packages/app/src packages/app/public
RUN node -e "require('fs').writeFileSync('packages/app/package.json', JSON.stringify({ \
  name: 'app', version: '0.0.0', private: true, \
  backstage: { role: 'frontend' }, \
  scripts: { start: 'backstage-cli package start' }, \
  dependencies: { \
    '@backstage/cli': '^0.36.1', \
    '@backstage/core-components': '^0.18.9', \
    '@backstage/core-plugin-api': '^1.12.5', \
    '@backstage/frontend-defaults': '^0.5.1', \
    '@backstage/frontend-plugin-api': '^0.16.0', \
    '@backstage/plugin-catalog': '^2.0.4', \
    '@backstage/plugin-scaffolder': '^1.36.2', \
    '@backstage/plugin-scaffolder-react': '^1.20.1', \
    'react': '^18.0.2', \
    'react-dom': '^18.0.2', \
    'react-router': '^6.30.2', \
    'react-router-dom': '^6.30.2' \
  } \
}, null, 2))"

RUN npm install --legacy-peer-deps

# App.tsx — new frontend system: scaffolderPlugin from /alpha (FrontendPlugin) + ApiSelectFieldExtension
RUN node -e " \
  const fs = require('fs'); \
  fs.writeFileSync('packages/app/src/App.tsx', [ \
    \"import { createApp } from '@backstage/frontend-defaults';\", \
    \"import catalogPlugin from '@backstage/plugin-catalog/alpha';\", \
    \"import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';\", \
    \"import { ApiSelectFieldExtension } from '@cdelgehier/backstage-field-api-select';\", \
    \"\", \
    \"export default createApp({\", \
    \"  features: [catalogPlugin, scaffolderPlugin, ApiSelectFieldExtension],\", \
    \"});\", \
    '' \
  ].join('\\n')); \
"

# index.tsx — new frontend system entry point
RUN node -e " \
  const fs = require('fs'); \
  fs.writeFileSync('packages/app/src/index.tsx', [ \
    \"import '@backstage/cli/asset-types';\", \
    \"import ReactDOM from 'react-dom/client';\", \
    \"import App from './App';\", \
    \"\", \
    \"ReactDOM.createRoot(document.getElementById('root')!).render(App.createRoot());\", \
    '' \
  ].join('\\n')); \
"

# HTML entry point required by backstage-cli
RUN printf '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>ApiSelectField Demo</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n' \
  > packages/app/public/index.html

# Backstage config
RUN printf 'app:\n  title: ApiSelectField Demo\n  baseUrl: http://localhost:3000\nbackend:\n  baseUrl: http://localhost:7007\n  listen:\n    port: 7007\n' \
  > app-config.yaml

# Install plugin from local tgz
COPY plugin.tgz /tmp/plugin.tgz
RUN mkdir -p local-plugins/backstage-field-api-select && \
    tar -xzf /tmp/plugin.tgz -C local-plugins/backstage-field-api-select --strip-components=1
RUN mkdir -p node_modules/@cdelgehier && \
    cp -r local-plugins/backstage-field-api-select node_modules/@cdelgehier/backstage-field-api-select

# Override the listening host — Backstage defaults to 127.0.0.1 which blocks Docker port forwarding.
RUN printf 'app:\n  listen:\n    host: "0.0.0.0"\n' > app-config.local.yaml

COPY proxy.cjs proxy.cjs

EXPOSE 3000 7007

CMD ["sh", "-c", "node proxy.cjs & npm start --workspace packages/app"]
