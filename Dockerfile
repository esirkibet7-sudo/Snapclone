# ==============================================================================
# Kenyatube Backend - Render Dockerfile
# ==============================================================================
FROM node:22-bookworm-slim

# Install system dependencies: Python 3, pip, ffmpeg, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Ensure python points to python3
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install yt-dlp for media extraction
RUN pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]" bgutil-ytdlp-pot-provider

# Set working directory
WORKDIR /app

# Copy server package definition and install production dependencies
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Copy server application source code
COPY server/ ./server/

# Render sets PORT automatically (defaulting to 10000)
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# Health check to ensure Render marks the service healthy promptly
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

# Start the Node.js backend
CMD ["node", "server/index.js"]
