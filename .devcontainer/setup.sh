#!/bin/bash

echo "🚀 Setting up Shango Poly development environment in Codespaces..."
echo

# Install Node.js dependencies
echo "📦 [1/4] Installing Node.js dependencies..."
npm install
echo "✅ Node.js dependencies installed"
echo

# Build Rust engines
echo "🦀 [2/4] Building Rust Twin Turbo Engines..."
if command -v cargo &> /dev/null; then
    npm run build:rust
    echo "✅ Rust engines built successfully"
else
    echo "⚠️ Rust not found. The Rust feature should be installed automatically."
    echo "   Troubleshooting steps:"
    echo "   1. Try rebuilding the container: Command Palette → 'Dev Containers: Rebuild Container'"
    echo "   2. Check .devcontainer/devcontainer.json for Rust feature configuration"
    echo "   3. Verify the container build logs for any errors"
    echo "   Without Rust, the system will use JavaScript fallback with reduced performance."
fi
echo

# Setup environment file
echo "⚙️ [3/4] Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "📝 Remember to edit .env file with your configuration!"
else
    echo "ℹ️ .env file already exists, skipping..."
fi
echo

# Display welcome message
echo "🎉 [4/4] Setup complete!"
echo
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 Welcome to Shango Poly Development Environment!      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "📊 Architecture Overview:"
echo "  Layer 7: EXECUTION         → FlashLoanExecutor"
echo "  Layer 6: TRANSACTION       → Transaction builder"
echo "  Layer 5: VALIDATION        → Opportunity validator"
echo "  Layer 4: CALCULATION       → FlashLoanCalculator"
echo "  Layer 3: ROUTING           → DexInterface"
echo "  Layer 2: PRICE AGGREGATION → PriceOracle + 🦀 TurboAggregator"
echo "  Layer 1: DATA FETCH        → OpportunityScanner + 🦀 TurboScanner"
echo
echo "🎯 Quick Start:"
echo "  1. Edit .env file with your RPC URLs and private key:"
echo "     code .env"
echo
echo "  2. Run tests to verify everything is working:"
echo "     npm test"
echo
echo "  3. Run simulation to test the bot:"
echo "     npm run simulate"
echo
echo "  4. Start the bot (simulation mode without contract):"
echo "     npm start"
echo
echo "📚 Documentation:"
echo "  - README.md - Main documentation"
echo "  - docs/SETUP.md - Detailed setup guide"
echo "  - docs/ARCHITECTURE.md - System architecture"
echo "  - docs/PROTOCOL_EFFICIENCY.md - Advanced features"
echo
echo "🔗 Helpful Commands:"
echo "  npm test              - Run comprehensive tests"
echo "  npm run simulate      - Run 90-day backtesting simulation"
echo "  npm run benchmark     - Run performance benchmarks"
echo "  npm run compete       - Bot competition (vs TITAN 2.0)"
echo "  npm run test:validate - System validation"
echo
echo "✨ Happy coding!"
echo
