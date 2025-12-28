// Test RPC connection script
require('dotenv').config();
const { ethers } = require('ethers');
const logger = require('../src/utils/logger');

async function testConnection() {
  console.log('Testing Polygon RPC connection...\n');

  try {
    // Test primary RPC
    console.log('Primary RPC:', process.env.POLYGON_RPC_URL);
    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    
    const network = await provider.getNetwork();
    console.log('✓ Connected to network:', network.name);
    console.log('✓ Chain ID:', network.chainId);
    
    const blockNumber = await provider.getBlockNumber();
    console.log('✓ Current block:', blockNumber);
    
    const gasPrice = await provider.getGasPrice();
    console.log('✓ Current gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'Gwei');
    
    // Test wallet
    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here') {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const balance = await wallet.getBalance();
      console.log('✓ Wallet address:', wallet.address);
      console.log('✓ Wallet balance:', ethers.utils.formatEther(balance), 'MATIC');
      
      if (balance.eq(0)) {
        console.log('\n⚠️  Warning: Wallet has no MATIC for gas fees');
      }
    }
    
    console.log('\n✅ Connection test successful!');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
