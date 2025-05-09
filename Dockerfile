# Base image
FROM node:18

# Set working directory
WORKDIR /

# Copy package.json and package-lock.json
COPY package*.json ./
# Copy server.js
COPY server.js ./
# Copy the rest of the app


# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Run server
CMD ["node", "server.js"]
