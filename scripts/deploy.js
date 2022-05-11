const { ethers } = require('hardhat')

const { BSC_TN_ALMAZ_ADDRESS, ACCOUNT_ALMAZ, ACCOUNT_CHAD, ACCOUNT_EVA } = require('./const')

async function main() {
  const [owner] = await ethers.getSigners()
  console.log('Script running with owner', owner.address)

  const ContractFactory = await ethers.getContractFactory('ContractFactory')
  const contractFactory = await ContractFactory.deploy(BSC_TN_ALMAZ_ADDRESS)

  await contractFactory.deployed()

  console.log('ContractFactory deployed to:', contractFactory.address)

  const addAdminTx1 = await contractFactory.addAdmin(ACCOUNT_CHAD)
  await addAdminTx1.wait()

  const addAdminTx2 = await contractFactory.addAdmin(ACCOUNT_ALMAZ)
  await addAdminTx2.wait()

  const addAdminTx3 = await contractFactory.addAdmin(ACCOUNT_EVA)
  await addAdminTx3.wait()

  console.log('Admins were added')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
