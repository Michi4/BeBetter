FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --prefer-offline --omit=dev
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/ .
RUN mkdir -p uploads
COPY --from=frontend-build /frontend/dist ./public
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
