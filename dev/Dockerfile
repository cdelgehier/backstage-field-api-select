FROM node:20-bookworm

ENV HOST=0.0.0.0
ENV YARN_IGNORE_ENGINES=true

WORKDIR /workspace

# Create Backstage app (old frontend system, compatible with ScaffolderFieldExtensions)
RUN echo "backstage" | npx --yes @backstage/create-app@0.5.17

WORKDIR /workspace/backstage

RUN yarn install --force

# Fix missing platform-specific @swc/core native binding
RUN arch=$(uname -m); \
    if [ "$arch" = "aarch64" ]; then \
      yarn add @swc/core-linux-arm64-gnu -W; \
    elif [ "$arch" = "x86_64" ]; then \
      yarn add @swc/core-linux-x64-gnu -W; \
    fi

# Register ApiSelectFieldExtension in App.tsx
RUN sed -i \
  "s|import { ScaffolderPage|import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';\nimport { ApiSelectFieldExtension } from 'backstage-field-api-select';\nimport { ScaffolderPage|" \
  packages/app/src/App.tsx

RUN sed -i \
  "s|element={<ScaffolderPage />} />|element={<ScaffolderPage />}>\n          <ScaffolderFieldExtensions>\n            <ApiSelectFieldExtension />\n          </ScaffolderFieldExtensions>\n        </Route>|" \
  packages/app/src/App.tsx

# Copy and install plugin
COPY plugin.tgz /tmp/plugin.tgz
RUN mkdir -p local-plugins/backstage-field-api-select && \
    tar -xzf /tmp/plugin.tgz -C local-plugins/backstage-field-api-select --strip-components=1
RUN node -e " \
  const fs = require('fs'); \
  const p = JSON.parse(fs.readFileSync('packages/app/package.json')); \
  p.dependencies['backstage-field-api-select'] = 'file:../../local-plugins'; \
  fs.writeFileSync('packages/app/package.json', JSON.stringify(p, null, 2)); \
"
RUN yarn install && \
    rm -rf node_modules/backstage-field-api-select && \
    mkdir -p node_modules/backstage-field-api-select && \
    cp -r local-plugins/backstage-field-api-select/. node_modules/backstage-field-api-select/

# Minimal proxy server — replaces the full Backstage backend for the demo.
# The Backstage backend (yarn start-backend) crashes due to a version mismatch between
# @backstage/backend-defaults and @backstage/backend-app-api that create-app@0.5.17 ships with.
# The demo only needs a proxy on :7007 for ApiSelectField to reach the external API.
ARG PROXY_TARGET=https://jsonplaceholder.typicode.com
ENV PROXY_TARGET=${PROXY_TARGET}
COPY proxy.cjs /workspace/backstage/proxy.cjs

# Override the listening host — Backstage defaults to 127.0.0.1 which blocks Docker port forwarding.
# app-config.local.yaml is auto-merged on top of app-config.yaml by Backstage.
RUN printf 'app:\n  listen:\n    host: "0.0.0.0"\n' > app-config.local.yaml

EXPOSE 3000 7007

CMD ["sh", "-c", "node proxy.cjs & yarn workspace app start"]
