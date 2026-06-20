FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY services/extraction/package.json ./services/extraction/
COPY web/package.json ./web/
RUN npm install
COPY tsconfig.json ./
COPY proto ./proto
COPY services/extraction ./services/extraction
EXPOSE 50051
CMD ["npx", "tsx", "services/extraction/src/index.ts"]
