# Build stage
FROM --platform=linux/amd64 node:20 as builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Compile TypeScript
WORKDIR /usr/src/app/
RUN npx tsc -p ./tsconfig.json

# Production stage
FROM --platform=linux/amd64 node:20

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy compiled JS from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set environment variable
ENV VERSION=0.1.0

# Set the working directory to where the compiled JavaScript files are
WORKDIR /usr/src/app/dist/src/

CMD [ "node", "app.js" ]
