const { ethers } = require('hardhat')

async function main() {
  const [owner] = await ethers.getSigners()
  console.log('Script running with owner', owner.address)

  const ContractFactory = await ethers.getContractFactory('ContractFactory')
  const contractFactory = await ContractFactory.deploy()

  await contractFactory.deployed()

  console.log('ContractFactory deployed to:', contractFactory.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
