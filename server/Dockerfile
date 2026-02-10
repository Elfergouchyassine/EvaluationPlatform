FROM node:18-alpine

WORKDIR /app

# Install Java + sonar-scanner
RUN apk add --no-cache openjdk17-jre curl unzip \
  && curl -sSLo /tmp/sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
  && unzip /tmp/sonar-scanner.zip -d /opt \
  && rm /tmp/sonar-scanner.zip

# Patch the scanner wrapper to use system Java
RUN sed -i 's|use_embedded_jre=true|use_embedded_jre=false|g' /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner \
  && ln -s /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy server code
COPY server.js .

# Create temp_code directory
RUN mkdir -p temp_code

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]