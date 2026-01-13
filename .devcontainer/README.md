# Development Container Configuration

This directory contains the configuration for GitHub Codespaces and VS Code Dev Containers.

## What's Included

- **Node.js 20**: Latest LTS version for JavaScript/TypeScript development
- **Rust**: Latest stable version for building high-performance Rust engines
- **Git**: Version control integration
- **VS Code Extensions**: 
  - ESLint for JavaScript linting
  - Prettier for code formatting
  - Rust Analyzer for Rust development
  - LLDB debugger for Rust debugging
  - Crates for Cargo.toml management
  - Better TOML for TOML file editing

## Features

✨ **Instant Setup** - No local installation required, ready in minutes
🔄 **Consistent Environment** - Same setup for all developers
🧪 **CI/CD Testing** - Test locally before pushing
🚀 **Easy Onboarding** - New contributors start immediately
💰 **Free Tier** - 60 hours/month included with GitHub

## Quick Start with GitHub Codespaces

1. Click the **Code** button on the GitHub repository
2. Select **Codespaces** tab
3. Click **Create codespace on main** (or your branch)
4. Wait for the environment to build (2-3 minutes first time)
5. Edit `.env` file with your configuration
6. Start coding!

## Quick Start with VS Code Dev Containers

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open the repository in VS Code
4. Click the popup to "Reopen in Container" or run command: `Dev Containers: Reopen in Container`
5. Wait for the container to build
6. Edit `.env` file with your configuration
7. Start coding!

## What Happens During Setup

The `setup.sh` script automatically:

1. ✅ Installs all Node.js dependencies (`npm install`)
2. ✅ Builds the Rust Twin Turbo Engines (`npm run build:rust`)
3. ✅ Creates `.env` file from template if it doesn't exist
4. ✅ Displays helpful getting started information

## Configuration Files

- **devcontainer.json**: Main configuration file for the dev container
- **Dockerfile**: Custom Docker image with system dependencies
- **setup.sh**: Post-creation setup script

## Customization

You can customize the development environment by editing:

- `devcontainer.json`: Add more VS Code extensions, change settings, or modify features
- `Dockerfile`: Add system-level dependencies or tools
- `setup.sh`: Add additional setup steps

## Troubleshooting

### Container fails to build
- Check Docker Desktop is running (for local dev containers)
- Check your internet connection
- Try rebuilding: Command Palette → `Dev Containers: Rebuild Container`

### Rust engines not building
- Ensure Rust feature is installed in devcontainer.json
- Check build logs during container creation
- Manually run: `npm run build:rust`

### Port 8080 not accessible
- Check if port is forwarded in devcontainer.json
- In VS Code, check Ports panel (View → Ports)
- Add manual port forwarding if needed

## Resources

- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Development Container Specification](https://containers.dev/)
