# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code from backend
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]

# Start application
CMD ["npm", "run", "start"]
