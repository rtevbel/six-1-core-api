#user-service/Dockerfile

# Use the official Node.js image as the base image
FROM node:16

ENV NODE_ENV =development

# Set the working directory
WORKDIR /usr/local/app

#Copy package.json and package-local.json files to the working directory
COPY package*.json ./

#Install the dependencies in development mode
RUN npm install -g @nestjs/cli nodemon && npm install

#Install the dependencies
#RUN npm install -g @nestjs/cli && npm install

#Copy the rest of appllication code to the working directory
COPY . .

# Build the application
RUN npm run build

# Command to run application
CMD ["npm","run", "start:dev"]
