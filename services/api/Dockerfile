FROM node:22-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY services/extraction/package.json ./services/extraction/
COPY web/package.json ./web/
RUN npm install
COPY tsconfig.json ./
COPY proto ./proto
COPY services/api ./services/api
RUN cd services/api && npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "cd services/api && npx prisma migrate deploy && npx prisma db seed && cd /app && npx tsx services/api/src/index.ts"]
