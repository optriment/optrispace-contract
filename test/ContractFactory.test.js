const { expect } = require('chai')
const { ethers } = require('hardhat')
const { expectRevert, expectEvent } = require('./helpers')

describe('ContractFactory', function () {
  let contractFactory
  const contractId = 'cntr42'
  let owner
  let customer
  let performer
  let other
  let contractFactoryAddress
  let multiplier
  const price = 42
  const customerId = 'cstmr1'
  const performerId = 'prfrmr1'
  const title = 'title'
  const description = 'description'

  let token
  let tokenAddress

  beforeEach(async function () {
    ;[owner, customer, performer, other] = await ethers.getSigners()

    const Token = await ethers.getContractFactory('Almaz')
    token = await Token.connect(owner).deploy()
    await token.deployed()

    tokenAddress = token.address

    const decimals = await token.decimals()
    multiplier = 10 ** decimals

    // Закидываем алмазы на токен
    const mintTx = await token.connect(owner).mint(tokenAddress, 100500 * multiplier)
    await mintTx.wait()

    const ContractFactory = await ethers.getContractFactory('ContractFactory')
    contractFactory = await ContractFactory.deploy(tokenAddress)
    const c = await contractFactory.deployed()
    contractFactoryAddress = c.address

    // Закидываем алмазы на фабрику
    const mintFactoryTx = await token.connect(owner).mint(contractFactoryAddress, 5 * multiplier)
    await mintFactoryTx.wait()
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
    it('Reverts when customer == performer', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, customer.address, price, customerId, performerId, title, description)

      await expectRevert(tx, 'Customer is equal to performer')
    })

    it('Reverts when ContractID is empty', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract('', performer.address, price, customerId, performerId, title, description)

      await expectRevert(tx, 'ContractID cannot be empty')
    })

    it('Reverts when contract already exists', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, price, customerId, performerId, title, description)
      await createContractTx.wait()

      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, price, customerId, performerId, title, description)

      await expectRevert(tx, 'Contract already exists')
    })

    it('Reverts when price is equal to zero', async function () {
      const tx = contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, 0, customerId, performerId, title, description)

      await expectRevert(tx, 'Price must be greater than zero')
    })

    it('Emits event ContractCreated', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, price, customerId, performerId, title, description)

      await createContractTx.wait()

      const [contractAddress] = await contractFactory.connect(customer).getContractById(contractId)

      await expectEvent(createContractTx, contractFactory, 'ContractCreated', [contractAddress, contractId])
    })

    it('Creates contract', async function () {
      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, price, customerId, performerId, title, description)
      await createContractTx.wait()

      const [
        contractAddress,
        contractBalance,
        contractCustomer,
        contractPerformer,
        contractContractId,
        contractPrice,
        contractCustomerId,
        contractPerformerId,
        contractTitle,
        contractDescription,
      ] = await contractFactory.connect(customer).getContractById(contractId)

      expect(contractAddress).not.to.eq('')
      expect(contractBalance).to.eq(0)
      expect(contractCustomer).to.eq(customer.address)
      expect(contractPerformer).to.eq(performer.address)
      expect(contractContractId).to.eq(contractId)
      expect(contractPrice).to.eq(price)
      expect(contractCustomerId).to.eq(customerId)
      expect(contractPerformerId).to.eq(performerId)
      expect(contractTitle).to.eq(title)
      expect(contractDescription).to.eq(description)
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

        await expectRevert(tx, 'Only for owner')
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

        await expectRevert(tx, 'Only for owner')
      })
    })
  })

  describe('getContractById', function () {
    beforeEach(async () => {
      const mintTx = await token.connect(owner).mint(customer.address, 1000)
      await mintTx.wait()

      const createContractTx = await contractFactory
        .connect(customer)
        .createContract(contractId, performer.address, price, customerId, performerId, title, description)
      await createContractTx.wait()

      const [contractAddress] = await contractFactory.getContractById(contractId)

      const approveTx = await token.connect(customer).approve(contractAddress, price)
      await approveTx.wait()

      const Contract = await ethers.getContractFactory('Contract')
      const contract = Contract.attach(contractAddress)

      const fundTx = await contract.connect(customer).fund()
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
          contractPerformer,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractPerformerId,
          contractTitle,
          contractDescription,
        ] = await contractFactory.connect(owner).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(price)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractPerformer).to.eq(performer.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(price)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractPerformerId).to.eq(performerId)
        expect(contractTitle).to.eq(title)
        expect(contractDescription).to.eq(description)
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
          contractPerformer,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractPerformerId,
          contractTitle,
          contractDescription,
        ] = await contractFactory.connect(customer).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(price)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractPerformer).to.eq(performer.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(price)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractPerformerId).to.eq(performerId)
        expect(contractTitle).to.eq(title)
        expect(contractDescription).to.eq(description)
      })
    })

    describe('As performer', function () {
      describe('When contract does not exist', function () {
        it('Reverts', async function () {
          const tx = contractFactory.connect(performer).getContractById('qwe')

          await expectRevert(tx, 'Contract does not exist')
        })
      })

      it('Returns contract attributes', async function () {
        const [
          contractAddress,
          contractBalance,
          contractCustomer,
          contractPerformer,
          contractContractId,
          contractPrice,
          contractCustomerId,
          contractPerformerId,
          contractTitle,
          contractDescription,
        ] = await contractFactory.connect(performer).getContractById(contractId)

        expect(contractAddress).not.to.eq('')
        expect(contractBalance).to.eq(price)
        expect(contractCustomer).to.eq(customer.address)
        expect(contractPerformer).to.eq(performer.address)
        expect(contractContractId).to.eq(contractId)
        expect(contractPrice).to.eq(price)
        expect(contractCustomerId).to.eq(customerId)
        expect(contractPerformerId).to.eq(performerId)
        expect(contractTitle).to.eq(title)
        expect(contractDescription).to.eq(description)
      })
    })

    describe('As other', function () {
      it('Reverts because not authorized', async function () {
        const tx = contractFactory.connect(other).getContractById(contractId)

        await expectRevert(tx, 'Authorized only')
      })

      it('Reverts because contract does not exist', async function () {
        const tx = contractFactory.connect(other).getContractById('qwe')

        await expectRevert(tx, 'Contract does not exist')
      })
    })
  })

  describe('requestTestToken', function () {
    describe('sends money', function () {
      it('Emits event TestTokenSent', async function () {
        const tx = contractFactory.connect(other).requestTestToken()

        await expectEvent(tx, contractFactory, 'TestTokenSent', [other.address])
      })

      it('Changes balances', async function () {
        await contractFactory.connect(other).requestTestToken()

        const b = await token.balanceOf(other.address)
        expect(b).to.eq(1 * multiplier)

        const c = await token.balanceOf(contractFactoryAddress)
        expect(c).to.eq(4 * multiplier)
      })
    })
  })
})
