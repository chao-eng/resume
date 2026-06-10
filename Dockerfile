FROM node:22-alpine

RUN apk add --no-cache sqlite ca-certificates

WORKDIR /app

COPY package.json ./
COPY server.js index.html components.jsx resume.css ./

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000
VOLUME ["/data"]

CMD ["npm", "start"]
