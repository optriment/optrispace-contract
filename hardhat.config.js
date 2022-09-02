require('dotenv').config()

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
require('hardhat-gas-reporter')
require('solidity-coverage')

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// specify mnemonic with env or .env file
const mnemonic = process.env.MNEMONIC

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.13',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    'bsc-testnet': {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: { mnemonic: mnemonic },
    },
    'mumbai-testnet': {
      url: 'https://matic-mumbai.chainstacklabs.com',
      chainId: 80001,
      accounts: { mnemonic: mnemonic },
    },
  },
  // https://www.npmjs.com/package/hardhat-gas-reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || null,
    gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',
    token: 'BNB',
    currency: 'USD',
    codechecks: true,
    showTimeSpent: true,
    onlyCalledMethods: false,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}
