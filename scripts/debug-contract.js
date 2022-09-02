const { ethers } = require('hardhat')

async function main() {
  const [owner] = await ethers.getSigners()

  console.log('Script running with owner', owner.address)

  const ContractFactory = await ethers.getContractFactory('ContractFactory')
  const contractFactory = await ContractFactory.attach('INSERT DEPLOYED CONTRACT FACTORY ADDRESS')

  const contractId = 'INSERT CONTRACT ID'

  console.log('Fetching contract through ContractFactory by contractId')
  const deployedContract = await contractFactory.getContractById(contractId)

  console.log({ deployedContract })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error({ error })
  process.exitCode = 1
})
