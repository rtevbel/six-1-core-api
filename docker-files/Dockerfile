#six1-core-api/Dockerfile.dev
# Use the official Node.js image as the base image
FROM node:16

# Install passwd package (replacement for shadow-utils) and vim
RUN apt-get update || cat /var/log/apt/term.log && \
    apt-get install -y vim \
    && rm -rf /var/lib/apt/lists/* 

#Create a non-root user for running application (to avoid running as root)    
RUN groupadd -r six1capig202507 && useradd -m -r -g six1capig202507 six1capiu202507

#Set environment variables
ENV HOME=/home/six1capiu202507
ENV NODE_ENV =development

# Set the working directory
WORKDIR /src/local/app

#Copy package.json and package-local.json files to the working directory
COPY package*.json /src/local/app/

#Install the dependencies in development mode
RUN npm install -g @nestjs/cli nodemon && npm install

#Copy the rest of appllication code to the working directory
COPY . /src/local/app/

#Change ownership of /src/local/app directory to a non-root user
RUN chown -R six1capiu202507:six1capig202507 /src/local/app /home/six1capiu202507

#Switch to non-root user
USER six1capiu202507

# Build the application
RUN npm run build


# Command to run application
CMD ["npm","run", "start:dev"]
