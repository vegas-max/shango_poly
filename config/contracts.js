// Smart contract addresses on Polygon
module.exports = {
  // Aave V3 addresses
  aave: {
    poolAddressProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    flashLoanFee: 9 // 0.09% in basis points
  },

  // Our deployed flash loan arbitrage contract
  flashLoanArbitrage: {
    address: process.env.CONTRACT_ADDRESS || '',
    deploymentBlock: 0
  },

  // Chainlink price feeds
  chainlink: {
    usdcUsd: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    ethUsd: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    maticUsd: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    btcUsd: '0xc907E116054Ad103354f2D350FD2514433D57F6f'
  }
};
