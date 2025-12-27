// DEX configurations on Polygon
module.exports = {
  quickswap: {
    name: 'QuickSwap',
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    fee: 30 // 0.3%
  },

  sushiswap: {
    name: 'SushiSwap',
    router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    fee: 30 // 0.3%
  },

  uniswapv3: {
    name: 'UniswapV3',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    fees: [500, 3000, 10000] // 0.05%, 0.3%, 1%
  }
};
