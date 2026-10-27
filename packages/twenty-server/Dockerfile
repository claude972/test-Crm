FROM node:20-alpine
WORKDIR /app
COPY packages/twenty-server/package.json ./
RUN npm install
COPY packages/twenty-server/src ./src
COPY packages/twenty-server/prisma ./prisma
COPY packages/twenty-server/tsconfig.json ./
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
