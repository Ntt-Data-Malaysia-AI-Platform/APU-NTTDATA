# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server ./server
RUN npm run build

# ---- runtime ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY public ./public
COPY knowledge ./knowledge
USER node
# Cloud Run sets PORT (8080 by default).
EXPOSE 8080
CMD ["node", "dist/server/index.js"]
