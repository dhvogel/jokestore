# build env
FROM node:current-alpine3.14 as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN NODE_OPTIONS="--openssl-legacy-provider --max_old_space_size=2048" npm run build

# production environment
FROM nginx:1.21.0-alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]