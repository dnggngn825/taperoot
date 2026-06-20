FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services/api/package.json ./services/api/
COPY services/extraction/package.json ./services/extraction/
COPY web/package.json ./web/
RUN npm install
COPY tsconfig.json ./
COPY web ./web
WORKDIR /app/web
ARG VITE_API_URL=http://localhost:4000/graphql
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY web/package.json ./web/
WORKDIR /app/web
EXPOSE 8080
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
