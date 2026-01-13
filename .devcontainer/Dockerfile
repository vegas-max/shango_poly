# Use the official Node.js image as base
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install build essentials and dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    pkg-config \
    libssl-dev \
    git \
    curl \
    ca-certificates

# The features in devcontainer.json will install Node.js and Rust
# This Dockerfile provides the base image with additional system dependencies
