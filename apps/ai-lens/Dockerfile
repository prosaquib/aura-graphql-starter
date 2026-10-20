FROM node:22-alpine AS build
WORKDIR /app
COPY apps/ai-lens/package*.json ./
RUN npm install
COPY apps/ai-lens/ ./
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY apps/ai-lens/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4103
CMD ["node", "dist/main.js"]
