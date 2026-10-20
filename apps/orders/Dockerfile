FROM node:22-alpine AS build
WORKDIR /app
COPY apps/orders/package*.json ./
RUN npm install
COPY apps/orders/ ./
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY apps/orders/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4101
CMD ["node", "dist/main.js"]
