# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=24.15.0

FROM node:${NODE_VERSION}-bookworm-slim

# Use production node environment by default.
ENV NODE_ENV=production


WORKDIR /usr/src/app

# RUN apk --update add build-base make libtool autoconf automake

# Enable pnpm via corepack (bundled with Node 24+).
RUN corepack enable

# Download dependencies as a separate step to take advantage of Docker's caching.
# Bind-mount package.json and pnpm-lock.yaml so the layer is invalidated only when they change.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=cache,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --prod --frozen-lockfile

# Create the data directory owned by the non-root user so the SQLite volume mount inherits
# correct permissions on first run.
RUN mkdir -p /data && chown node:node /data

# Run the application as a non-root user.
USER node

# Copy the rest of the source files into the image.
COPY . .

# Run the application.
CMD ["pnpm", "start"]
