# The Discord bot, alone. Build context is the directory bot/deploy.sh stages:
# bot/, the lib files it imports (two, plus lib/shift-island/live for the moving
# island), tsconfig.json (for the @/ paths) and a
# package.json pinned to this repo's versions. The web app is not in it.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

COPY . .

USER node
# Healthy while heartbeats keep reaching the database (bot/src/shift/voice.ts).
HEALTHCHECK --interval=60s --timeout=10s --start-period=120s --retries=3 \
  CMD node -e "process.exit(Date.now() - require('fs').statSync('/tmp/shift-voice-healthy').mtimeMs < 180000 ? 0 : 1)"
# One process, so SIGTERM from `docker stop` reaches the bot, which closes open
# voice rows before exiting.
CMD ["node", "--import", "tsx", "bot/src/index.ts"]
