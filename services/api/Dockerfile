FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY services/extraction/package.json ./services/extraction/
COPY web/package.json ./web/
RUN npm install
COPY tsconfig.json ./
COPY services/api ./services/api
EXPOSE 4000
CMD ["npx", "tsx", "services/api/src/index.ts"]
