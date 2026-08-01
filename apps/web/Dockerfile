FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_BASE_PATH=/dimohod
ARG API_BASE_URL=http://backend:8000
ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_PUBLIC_BASE_PATH=/dimohod
ENV NEXT_TELEMETRY_DISABLED=1 \
    API_BASE_URL=${API_BASE_URL} \
    NEXT_BASE_PATH=${NEXT_BASE_PATH} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    API_BASE_URL=http://backend:8000 \
    NEXT_BASE_PATH=/dimohod \
    NEXT_PUBLIC_BASE_PATH=/dimohod
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
