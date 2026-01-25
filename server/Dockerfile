FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create data directory for persistent storage
RUN mkdir -p /data

ENV DATA_FILE=/data/messages.json
ENV PORT=9001

EXPOSE 9001

CMD ["node", "server.js"]
