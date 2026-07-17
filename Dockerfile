FROM node:20-slim AS build
WORKDIR /app

# Toolchain for better-sqlite3 in case no prebuilt binary matches
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/lively.db

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
