FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy server code (from the server directory)
COPY server.js .

# Create temp_code directory
RUN mkdir -p temp_code

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]