const { expect } = require('chai')
const { ethers } = require('hardhat')
const { expectRevert, expectEvent } = require('./helpers')

describe('Contract', function () {
  let Contract
  let contract
  const contractId = 'cntr42'
  let owner
  let customer
  let performer
  let other
  const price = 42.12
  const priceInGwei = ethers.utils.parseEther(price.toString())
  const customerId = 'cstmr1'
  const performerId = 'prfrmr1'
  const title = 'title'
  const description = 'description'

  beforeEach(async function () {
    ;[owner, customer, performer, other] = await ethers.getSigners()

    Contract = await ethers.getContractFactory('Contract')
  })

  const deployContract = async (
    _signer,
    _contractId,
    _customerAddress,
    _performerAddress,
    _priceInEth,
    _customerId,
    _performerId,
    _title,
    _description
  ) => {
    contract = await Contract.connect(_signer).deploy(
      _contractId,
      _customerAddress,
      _performerAddress,
      ethers.utils.parseEther(_priceInEth.toString()),
      _customerId,
      _performerId,
      _title,
      _description
    )

    return await contract.deployed()
  }

  const fundContractAs = async (_signer, _amountInEth) => {
    const tx = await contract.connect(_signer).fund({ value: ethers.utils.parseEther(_amountInEth.toString()) })
    await tx.wait()

    return tx
  }

  const approveContractAs = async (_signer) => {
    const tx = await contract.connect(_signer).approve()
    await tx.wait()

    return tx
  }

  const withdrawTokensAs = async (_signer) => {
    const tx = await contract.connect(_signer).withdraw()
    await tx.wait()

    return tx
  }

  describe('As owner', function () {
    describe('Deploy', function () {
      it('Reverts when owner == customer', async function () {
        const tx = deployContract(
          owner,
          contractId,
          owner.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )

        await expectRevert(tx, 'Customer cannot deploy contract')
      })

      it('Reverts when owner == performer', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          owner.address,
          price,
          customerId,
          performerId,
          title,
          description
        )

        await expectRevert(tx, 'Performer cannot deploy contract')
      })

      it('Reverts when customer == performer', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          customer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )

        await expectRevert(tx, 'Customer is equal to performer')
      })

      it('Reverts when price == 0', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          0,
          customerId,
          performerId,
          title,
          description
        )

        await expectRevert(tx, 'Price must be greater than zero')
      })

      it('Deploys successfully', async function () {
        const c = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )

        const contractAddress = c.address

        expect(contractAddress).not.to.equal(0x0)
        expect(contractAddress).not.to.equal('')
        expect(contractAddress).not.to.equal(null)
        expect(contractAddress).not.to.equal(undefined)
      })

      xit('Emits event ContractCreated')
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(fundContractAs(owner, price), 'Available to customer only')
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(approveContractAs(owner), 'Available to customer only')
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)

            expect(await contract.connect(owner).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApproved', function () {
        describe('when contract not approved', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isApproved()).to.eq(false)
          })
        })

        describe('when contract is approved', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)

            expect(await contract.connect(owner).isApproved()).to.eq(true)
          })
        })
      })

      describe('isClosed', function () {
        describe('when contract not closed', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isClosed()).to.eq(false)
          })
        })

        describe('when contract is closed', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)
            await withdrawTokensAs(performer)

            expect(await contract.connect(owner).isClosed()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when not funded', function () {
          it('Returns zero', async function () {
            const result = await contract.connect(owner).getBalance()
            expect(result).to.eq(0)
          })
        })

        describe('when funded', function () {
          beforeEach(async function () {
            await fundContractAs(customer, price)
          })

          it('Returns contract balance', async function () {
            const result = await contract.connect(owner).getBalance()
            expect(result).to.eq(priceInGwei)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const result = await contract.connect(owner).getCustomer()
          expect(result).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const result = await contract.connect(owner).getPerformer()
          expect(result).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const result = await contract.connect(owner).getContractId()
          expect(result).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const result = await contract.connect(owner).getPrice()
          expect(result).to.eq(priceInGwei)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const result = await contract.connect(owner).getCustomerId()
          expect(result).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const result = await contract.connect(owner).getPerformerId()
          expect(result).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(owner).getTitle()
          expect(result).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const result = await contract.connect(owner).getDescription()
          expect(result).to.eq(description)
        })
      })
    })
  })

  describe('As customer', function () {
    describe('Deploy', function () {
      it('Reverts because restricted to owner', async function () {
        const tx = deployContract(
          customer,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description,
          price
        )

        await expectRevert(tx, 'Customer cannot deploy contract')
      })
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description,
          price
        )
      })

      it('Emits event ContractFunded', async function () {
        await expectEvent(fundContractAs(customer, price), contract, 'ContractFunded', [contractId, priceInGwei])
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description,
          price
        )
      })

      describe('when not funded', async function () {
        it('Reverts because contract is not funded', async function () {
          await expectRevert(approveContractAs(customer), 'Cannot be called at this time')
        })
      })

      it('Emits event ContractApproved', async function () {
        await fundContractAs(customer, price)

        await expectEvent(approveContractAs(customer), contract, 'ContractApproved', [contractId])
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description,
          price
        )
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)

            expect(await contract.connect(customer).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApproved', function () {
        describe('when contract is not approved', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isApproved()).to.eq(false)
          })
        })

        describe('when contract is approved', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)

            expect(await contract.connect(customer).isApproved()).to.eq(true)
          })
        })
      })

      describe('isClosed', function () {
        describe('when contract not closed', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isClosed()).to.eq(false)
          })
        })

        describe('when contract is closed', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)
            await withdrawTokensAs(performer)

            expect(await contract.connect(customer).isClosed()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when contract is not funded', function () {
          it('Returns zero', async function () {
            const result = await contract.connect(customer).getBalance()
            expect(result).to.eq(0)
          })
        })

        describe('when contract is funded', function () {
          it('Returns contract balance', async function () {
            await fundContractAs(customer, price)

            const result = await contract.connect(customer).getBalance()
            expect(result).to.eq(priceInGwei)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const result = await contract.connect(customer).getCustomer()
          expect(result).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const result = await contract.connect(customer).getPerformer()
          expect(result).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const result = await contract.connect(customer).getContractId()
          expect(result).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const result = await contract.connect(customer).getPrice()
          expect(result).to.eq(priceInGwei)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const result = await contract.connect(customer).getCustomerId()
          expect(result).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const result = await contract.connect(customer).getPerformerId()
          expect(result).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(customer).getTitle()
          expect(result).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const result = await contract.connect(customer).getDescription()
          expect(result).to.eq(description)
        })
      })
    })
  })

  describe('As performer', function () {
    describe('Deploy', function () {
      it('Reverts because restricted to owner', async function () {
        const tx = deployContract(
          performer,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )

        await expectRevert(tx, 'Performer cannot deploy contract')
      })
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(performer).fund(), 'Available to customer only')
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(performer).approve(), 'Available to customer only')
      })
    })

    describe('withdraw money from token', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      it('Reverts because contract is not approved', async function () {
        await fundContractAs(customer, price)

        await expectRevert(withdrawTokensAs(performer), '')
      })

      it('Transfers money from contract to performer', async function () {
        await fundContractAs(customer, price)
        await approveContractAs(customer)

        expect(await ethers.provider.getBalance(contract.address)).to.eq(priceInGwei)
        const performerBalanceBefore = await ethers.provider.getBalance(performer.address)
        const performerBalanceBeforeInEth = ethers.utils.formatEther(performerBalanceBefore.toString())

        await withdrawTokensAs(performer)

        expect(await ethers.provider.getBalance(contract.address)).to.eq(0)

        // NOTE: We should check not exact value, because of gas fee
        const performerBalanceAfter = await ethers.provider.getBalance(performer.address)
        const performerBalanceAfterInEth = ethers.utils.formatEther(performerBalanceAfter.toString())
        const diff = performerBalanceAfterInEth - performerBalanceBeforeInEth

        expect(diff).to.be.gt(parseFloat(price) - 2)
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          performer.address,
          price,
          customerId,
          performerId,
          title,
          description
        )
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(performer).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)

            expect(await contract.connect(performer).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApproved', function () {
        describe('when contract is not approved', function () {
          it('Returns false', async function () {
            expect(await contract.connect(performer).isApproved()).to.eq(false)
          })
        })

        describe('when contract is approved', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)

            expect(await contract.connect(performer).isApproved()).to.eq(true)
          })
        })
      })

      describe('isClosed', function () {
        describe('when contract not closed', function () {
          it('Returns false', async function () {
            expect(await contract.connect(performer).isClosed()).to.eq(false)
          })
        })

        describe('when contract is closed', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)
            await withdrawTokensAs(performer)

            expect(await contract.connect(performer).isClosed()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when contract is not funded', function () {
          it('Returns zero', async function () {
            const result = await contract.connect(performer).getBalance()
            expect(result).to.eq(0)
          })
        })

        describe('when contract is funded', function () {
          it('Returns contract balance', async function () {
            await fundContractAs(customer, price)

            const result = await contract.connect(performer).getBalance()
            expect(result).to.eq(priceInGwei)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const result = await contract.connect(performer).getCustomer()
          expect(result).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const result = await contract.connect(performer).getPerformer()
          expect(result).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const result = await contract.connect(performer).getContractId()
          expect(result).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const result = await contract.connect(performer).getPrice()
          expect(result).to.eq(priceInGwei)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const result = await contract.connect(performer).getCustomerId()
          expect(result).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const result = await contract.connect(performer).getPerformerId()
          expect(result).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(performer).getTitle()
          expect(result).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const result = await contract.connect(performer).getDescription()
          expect(result).to.eq(description)
        })
      })
    })
  })

  describe('As other', function () {
    beforeEach(async function () {
      contract = await deployContract(
        owner,
        contractId,
        customer.address,
        performer.address,
        price,
        customerId,
        performerId,
        title,
        description
      )
    })

    describe('fund', function () {
      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(other).fund(), 'Available to customer only')
      })
    })

    describe('approve', function () {
      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(other).approve(), 'Available to customer only')
      })
    })

    describe('isFunded', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isFunded(), 'Authorized only')
      })
    })

    describe('isApproved', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isApproved(), 'Authorized only')
      })
    })

    describe('isClosed', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isClosed(), 'Authorized only')
      })
    })

    describe('getBalance', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getBalance(), 'Authorized only')
      })
    })

    describe('getCustomer', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getCustomer(), 'Authorized only')
      })
    })

    describe('getPerformer', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getPerformer(), 'Authorized only')
      })
    })

    describe('getContractId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getContractId(), 'Authorized only')
      })
    })

    describe('getPrice', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getPrice(), 'Authorized only')
      })
    })

    describe('getCustomerId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getCustomerId(), 'Authorized only')
      })
    })

    describe('getPerformerId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getPerformerId(), 'Authorized only')
      })
    })

    describe('getTitle', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getTitle(), 'Authorized only')
      })
    })

    describe('getDescription', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getDescription(), 'Authorized only')
      })
    })
  })
})
