# Multi-stage Docker build for Danny Game with Linera
FROM rust:1.75-bullseye as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install wasm32 target for WebAssembly compilation
RUN rustup target add wasm32-unknown-unknown

# Set working directory
WORKDIR /app

# Clone and build Linera (specific version matching your project)
RUN git clone https://github.com/linera-io/linera-protocol.git && \
    cd linera-protocol && \
    git checkout v0.14.2 && \
    cargo install --path linera-service && \
    cargo install --path linera-client

# Copy project files
COPY . .

# Build the Danny Game contract and service
RUN cargo build --release --target wasm32-unknown-unknown

# Verify build artifacts
RUN ls -la target/wasm32-unknown-unknown/release/ && \
    test -f target/wasm32-unknown-unknown/release/player_name_contract.wasm && \
    test -f target/wasm32-unknown-unknown/release/player_name_service.wasm

# Production stage
FROM node:18-bullseye-slim

# Install system dependencies for production
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1001 -s /bin/bash appuser

# Set working directory
WORKDIR /app

# Copy Linera binaries from builder
COPY --from=builder /usr/local/cargo/bin/linera* /usr/local/bin/

# Copy built WebAssembly files
COPY --from=builder /app/target/wasm32-unknown-unknown/release/*.wasm ./wasm/

# Copy project files
COPY package*.json ./
COPY player-name-orchestrator.js ./
COPY danny-game/frontend ./frontend/
COPY danny-game/cargo.toml ./
COPY danny-game/rust-toolchain.toml ./

# Install Node.js dependencies
RUN npm ci --only=production

# Create necessary directories
RUN mkdir -p /app/wallet && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

# Copy startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to app user
USER appuser

# Expose ports
EXPOSE 8080 8082 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/status || exit 1

# Entry point
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["start"]