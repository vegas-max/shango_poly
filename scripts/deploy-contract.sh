#!/bin/bash

# Contract Deployment Helper for Polygon
# This script helps deploy the FlashLoanArbitrage contract to Polygon mainnet or testnet

set -e

echo "================================================"
echo "Flash Loan Arbitrage Contract Deployment Helper"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env from .env.example and configure it"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ "$PRIVATE_KEY" == "your_private_key_here" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not configured in .env"
    exit 1
fi

# Determine network
NETWORK=${NETWORK:-mainnet}
if [ "$NETWORK" == "testnet" ]; then
    RPC_URL=${POLYGON_MUMBAI_RPC_URL}
    CHAIN_ID=80001
    NETWORK_NAME="Mumbai Testnet"
else
    RPC_URL=${POLYGON_RPC_URL}
    CHAIN_ID=137
    NETWORK_NAME="Polygon Mainnet"
fi

echo "Network: $NETWORK_NAME (Chain ID: $CHAIN_ID)"
echo "RPC URL: $RPC_URL"
echo ""

# Warning for mainnet
if [ "$NETWORK" == "mainnet" ]; then
    echo "⚠️  WARNING: You are about to deploy to MAINNET ⚠️"
    echo "This will use real funds. Are you sure? (yes/no)"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

echo ""
echo "Deployment Steps:"
echo "1. Compile the contract using Hardhat or Foundry"
echo "2. Deploy using your preferred tool"
echo "3. Update CONTRACT_ADDRESS in .env with the deployed address"
echo ""
echo "Example using Hardhat:"
echo "  npx hardhat run scripts/deploy.js --network polygon"
echo ""
echo "Example using Foundry:"
echo "  forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY contracts/FlashLoanArbitrage.sol:FlashLoanArbitrage"
echo ""
echo "After deployment, verify the contract on PolygonScan:"
echo "  npx hardhat verify --network polygon <DEPLOYED_ADDRESS> <CONSTRUCTOR_ARGS>"
echo ""

# Check if contract is already deployed
if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "" ]; then
    echo "⚠️  Note: CONTRACT_ADDRESS is already set in .env: $CONTRACT_ADDRESS"
    echo "If you want to deploy a new contract, update .env after deployment"
fi

echo ""
echo "For more information, see docs/DEPLOYMENT.md"
