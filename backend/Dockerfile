FROM node:20-alpine

WORKDIR /app

COPY backend/package.json /app/backend/package.json
RUN cd /app/backend && npm install --omit=dev

COPY backend /app/backend
COPY infrastructure /app/infrastructure

WORKDIR /app/backend

CMD ["npm", "run", "start"]
