FROM node:26-alpine
WORKDIR /SmartStudy
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
EXPOSE 3001
CMD ["npm", "run", "dev"]