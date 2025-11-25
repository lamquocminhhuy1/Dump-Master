# Stage 1: Build Frontend
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:18-alpine AS production-stage
WORKDIR /app
ENV NODE_ENV=production

# Copy server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server code
COPY server/ ./

# Copy frontend build from stage 1
COPY --from=build-stage /app/dist ../dist

# Expose port
EXPOSE 3000

# Create data directory for SQLite
RUN mkdir -p data

# Set env for DB path
ENV DB_PATH=/app/server/data/database.sqlite

# Start server
CMD ["node", "index.js"]
