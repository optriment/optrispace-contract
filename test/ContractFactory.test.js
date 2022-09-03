const { expect } = require('chai')
const { ethers } = require('hardhat')
const { expectRevert, expectEvent } = require('./helpers')

describe('ContractFactory', function () {
  let contractFactory
  const contractId = 'cntr42'
  let owner
  let customer
  let contractor
  let other
  let contractFactoryAddress
  const price = 42.12
  const priceInGwei = ethers.utils.parseEther(price.toString())
  const customerId = 'cstmr1'
  const contractorId = 'cntrctr1'
  const title = 'title'

  beforeEach(async function () {
    ;[owner, customer, contractor, other] = await ethers.getSigners()

    const ContractFactory = await ethers.getContractFactory('ContractFactory')
    contractFactory = await ContractFactory.deploy()
    const c = await contractFactory.deployed()
    contractFactoryAddress = c.address
  })

  describe('Deploy', function () {
    it('Has address', async function () {
      expect(contractFactoryAddress).not.to.equal(0x0)
      expect(contractFactoryAddress).not.to.equal('')
      expect(contractFactoryAddress).not.to.equal(null)
      expect(contractFactoryAddress).not.to.equal(undefined)
    })
  })

  describe('createContract', function () {
    it('Reverts when customer == contractor', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, customer.address, priceInGwei, customerId, contractorId, title)

      await expectRevert(tx, 'Customer is equal to contractor')
    })

    it('Reverts when ContractID is empty', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract('', contractor.address, priceInGwei, customerId, contractorId, title)

      await expectRevert(tx, 'ContractID is empty')
    })

    it('Reverts when contract already exists', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, priceInGwei, customerId, contractorId, title)
      await createContractTx.wait()

      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, priceInGwei, customerId, contractorId, title)

      await expectRevert(tx, 'Contract exists')
    })

    it('Reverts when price is equal to zero', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, 0, customerId, contractorId, title)

      await expectRevert(tx, 'Price is zero')
    })

    it('Emits event ContractDeployed', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, priceInGwei, customerId, contractorId, title)

      await createContractTx.wait()

      const [contractAddress] = await contractFactory.connect(customer).getContractById(contractId)

      await expectEvent(createContractTx, contractFactory, 'ContractDeployed', [contractAddress, contractId])
    })

    it('Creates contract', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, priceInGwei, customerId, contractorId, title)
      await createContractTx.wait()

      const [
        contractAddress,
        contractBalance,
        contractCustomer,
        contractContractor,
        contractContractId,
        contractPrice,
        contractCustomerId,
        contractContractorId,
        contractTitle,
      ] = await contractFactory.connect(customer).getContractById(contractId)

      expect(contractAddress).not.to.eq('')
      expect(contractBalance).to.eq(0)
      expect(contractCustomer).to.eq(customer.address)
      expect(contractContractor).to.eq(contractor.address)
      expect(contractContractId).to.eq(contractId)
      expect(contractPrice).to.eq(priceInGwei)
      expect(contractCustomerId).to.eq(customerId)
      expect(contractContractorId).to.eq(contractorId)
      expect(contractTitle).to.eq(title)
    })
  })

  describe('addAdmin', function () {
    describe('As owner', function () {
      it('Emits event AdminAdded', async function () {
        const tx = contractFactory.connect(owner).addAdmin(customer.address)

        await expectEvent(tx, contractFactory, 'AdminAdded', [customer.address])
      })
    })

    describe('As other', function () {
      it('Reverts', async function () {
        const tx = contractFactory.connect(customer).addAdmin(customer.address)

        await expectRevert(tx, 'OwnerOnly()')
      })
    })
  })

  describe('getAdmins', function () {
    describe('As owner', function () {
      it('Returns no admins', async function () {
        const admins = await contractFactory.connect(owner).getAdmins()
        expect(admins).to.be.length(0)
      })

      it('Contains added admin', async function () {
        const addAdminTx = await contractFactory.connect(owner).addAdmin(customer.address)
        await addAdminTx.wait()

        const admins = await contractFactory.connect(owner).getAdmins()
        expect(admins).to.include(customer.address.toString())
      })
    })

    describe('As other', function () {
      it('Reverts', async function () {
        const tx = contractFactory.connect(customer).getAdmins()

        await expectRevert(tx, 'OwnerOnly()')
      })
    })
  })

  describe('getContractById', function () {
    beforeEach(async () => {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, contractor.address, priceInGwei, customerId, contractorId, title)
      await createContractTx.wait()

      const [contractAddress] = await contractFactory.getContractById(contractId)

      const Contract = await ethers.getContractFactory('Contract')
      const contract = Contract.attach(contractAddress)

      const fundTx = await contract.connect(customer).fund({ value: priceInGwei })
      await fundTx.wait()
    })

    describe('As owner', function () {
      describe('When contract does not exist', function () {
        it('Reverts', async function () {
          const tx = contractFactory.connect(owner).getContractById('qwe')

          await expectRevert(tx, 'Contract does not exist')
        })
      })

      it('Returns contract attributes', async function () {
        const [
          contractAddress,
          contractBalance,
          contractCustomer,
          contractContractor,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractContractorId,
          contractTitle,
        ] = await contractFactory.connect(owner).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(priceInGwei)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractContractor).to.eq(contractor.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(priceInGwei)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractContractorId).to.eq(contractorId)
        expect(contractTitle).to.eq(title)
      })
    })

    describe('As customer', function () {
      describe('When contract does not exist', function () {
        it('Reverts', async function () {
          const tx = contractFactory.connect(customer).getContractById('qwe')

          await expectRevert(tx, 'Contract does not exist')
        })
      })

      it('Returns contract attributes', async function () {
        const [
          contractAddress,
          contractBalance,
          contractCustomer,
          contractContractor,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractContractorId,
          contractTitle,
        ] = await contractFactory.connect(customer).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(priceInGwei)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractContractor).to.eq(contractor.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(priceInGwei)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractContractorId).to.eq(contractorId)
        expect(contractTitle).to.eq(title)
      })
    })

    describe('As contractor', function () {
      describe('When contract does not exist', function () {
        it('Reverts', async function () {
          const tx = contractFactory.connect(contractor).getContractById('qwe')

          await expectRevert(tx, 'Contract does not exist')
        })
      })

      it('Returns contract attributes', async function () {
        const [
          contractAddress,
          contractBalance,
          contractCustomer,
          contractContractor,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractContractorId,
          contractTitle,
        ] = await contractFactory.connect(contractor).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(priceInGwei)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractContractor).to.eq(contractor.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(priceInGwei)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractContractorId).to.eq(contractorId)
        expect(contractTitle).to.eq(title)
      })
    })

    describe('As other', function () {
      it('Reverts because not authorized', async function () {
        const tx = contractFactory.connect(other).getContractById(contractId)

        await expectRevert(tx, 'Unauthorized()')
      })

      it('Reverts because contract does not exist', async function () {
        const tx = contractFactory.connect(other).getContractById('qwe')

        await expectRevert(tx, 'Contract does not exist')
      })
    })
  })
})
