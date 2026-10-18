# Build from the repo root (the bot reads the game's src/ to know which animals spawn):
#   docker build -f discord-bot/Dockerfile -t animal-rescue-bot .
#   docker run -d --name animal-rescue-bot --restart unless-stopped --env-file discord-bot/.env animal-rescue-bot
FROM node:22-alpine
WORKDIR /app
COPY src ./src
COPY discord-bot/package.json ./discord-bot/
RUN cd discord-bot && npm install --omit=dev
COPY discord-bot ./discord-bot
RUN rm -f discord-bot/.env
WORKDIR /app/discord-bot
CMD ["node", "index.js"]
