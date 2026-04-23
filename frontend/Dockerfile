FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build # Vite's build command

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine
# Copy the built application from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom Nginx configuration (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose the port Nginx listens on
EXPOSE 80
# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
