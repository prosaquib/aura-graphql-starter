FROM node:22-alpine AS build
WORKDIR /app
COPY apps/products/package*.json ./
RUN npm install
COPY apps/products/ ./
RUN npm run build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY apps/products/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4102
CMD ["node", "dist/main.js"]
