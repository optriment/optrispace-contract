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
  let multiplier
  const price = 42.12
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
    const mintTx = await token.connect(owner).mint(tokenAddress, 100500)
    await mintTx.wait()

    expect(await token.balanceOf(tokenAddress)).to.eq(100500)

    Contract = await ethers.getContractFactory('Contract')
  })

  const deployContract = async (
    _tokenAddress,
    _signer,
    _contractId,
    _customerAddress,
    _performerAddress,
    _price,
    _customerId,
    _performerId,
    _title,
    _description
  ) => {
    contract = await Contract.connect(_signer).deploy(
      _tokenAddress,
      _contractId,
      _customerAddress,
      _performerAddress,
      _price * multiplier,
      _customerId,
      _performerId,
      _title,
      _description
    )

    return await contract.deployed()
  }

  const mintTokensTo = async (_address, _amount) => {
    const tx = await token.connect(owner).mint(_address, _amount * multiplier)
    await tx.wait()

    return tx
  }

  const approveTokensTransfer = async (_signer, _addressTo, _amount) => {
    const tx = await token.connect(_signer).approve(_addressTo, _amount * multiplier)
    await tx.wait()

    return tx
  }

  const fundContractAs = async (_signer) => {
    const tx = await contract.connect(_signer).fund()
    await tx.wait()

    return tx
  }

  const approveContractAs = async (_signer) => {
    const tx = await contract.connect(_signer).approve()
    await tx.wait()

    return tx
  }

  const requestMoneyFromTokenAs = async (_signer, _addressTo, _amount) => {
    const tx = await token.connect(_signer).transferFrom(contract.address, _addressTo, _amount * multiplier)
    await tx.wait()

    return tx
  }

  describe('As owner', function () {
    describe('Deploy', function () {
      it('Reverts when owner == customer', async function () {
        const tx = deployContract(
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
        await expectRevert(fundContractAs(owner), 'Available to customer only')
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          tokenAddress,
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
          tokenAddress,
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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)

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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)
            await approveContractAs(customer)

            expect(await contract.connect(owner).isApproved()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when not funded', function () {
          it('Returns zero', async function () {
            const expected = await contract.connect(owner).getBalance()
            expect(expected).to.eq(0)
          })
        })

        describe('when funded', function () {
          beforeEach(async function () {
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)
          })

          it('Returns contract balance', async function () {
            const expected = await contract.connect(owner).getBalance()
            expect(expected).to.eq(price * multiplier)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const expected = await contract.connect(owner).getCustomer()
          expect(expected).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const expected = await contract.connect(owner).getPerformer()
          expect(expected).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const expected = await contract.connect(owner).getContractId()
          expect(expected).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const expected = await contract.connect(owner).getPrice()
          expect(expected).to.eq(price * multiplier)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const expected = await contract.connect(owner).getCustomerId()
          expect(expected).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const expected = await contract.connect(owner).getPerformerId()
          expect(expected).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const expected = await contract.connect(owner).getTitle()
          expect(expected).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const expected = await contract.connect(owner).getDescription()
          expect(expected).to.eq(description)
        })
      })
    })
  })

  describe('As customer', function () {
    describe('Deploy', function () {
      it('Reverts because restricted to owner', async function () {
        const tx = deployContract(
          tokenAddress,
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
      describe('when tokens transfer is not approved', function () {
        beforeEach(async function () {
          contract = await deployContract(
            tokenAddress,
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

          await mintTokensTo(customer.address, price)
        })

        it('Reverts because of insufficient allowance', async function () {
          await expectRevert(fundContractAs(customer), 'ERC20: insufficient allowance')
        })
      })

      describe('when tokens transfer approved', function () {
        beforeEach(async function () {
          contract = await deployContract(
            tokenAddress,
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

          await mintTokensTo(customer.address, price)
          await approveTokensTransfer(customer, contract.address, price)
        })

        it('Emits event ContractFunded', async function () {
          await expectEvent(fundContractAs(customer), contract, 'ContractFunded', [contractId, price * multiplier])
        })
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          tokenAddress,
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

        await mintTokensTo(customer.address, price)
        await approveTokensTransfer(customer, contract.address, price)
      })

      describe('when not funded', async function () {
        it('Reverts because contract is not funded', async function () {
          await expectRevert(approveContractAs(customer), 'Cannot be called at this time')
        })
      })

      it('Emits event ContractApproved', async function () {
        await fundContractAs(customer)

        await expectEvent(approveContractAs(customer), contract, 'ContractApproved', [contractId])
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          tokenAddress,
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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)

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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)
            await approveContractAs(customer)

            expect(await contract.connect(customer).isApproved()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when contract is not funded', function () {
          it('Returns zero', async function () {
            const expected = await contract.connect(customer).getBalance()
            expect(expected).to.eq(0)
          })
        })

        describe('when contract is funded', function () {
          beforeEach(async function () {
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)

            const tx = await contract.connect(customer).fund()
            await tx.wait()
          })

          it('Returns contract balance', async function () {
            const expected = await contract.connect(customer).getBalance()
            expect(expected).to.eq(price * multiplier)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const expected = await contract.connect(customer).getCustomer()
          expect(expected).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const expected = await contract.connect(customer).getPerformer()
          expect(expected).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const expected = await contract.connect(customer).getContractId()
          expect(expected).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const expected = await contract.connect(customer).getPrice()
          expect(expected).to.eq(price * multiplier)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const expected = await contract.connect(customer).getCustomerId()
          expect(expected).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const expected = await contract.connect(customer).getPerformerId()
          expect(expected).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const expected = await contract.connect(customer).getTitle()
          expect(expected).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const expected = await contract.connect(customer).getDescription()
          expect(expected).to.eq(description)
        })
      })
    })
  })

  describe('As performer', function () {
    describe('Deploy', function () {
      it('Reverts because restricted to owner', async function () {
        const tx = deployContract(
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
          tokenAddress,
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
        await mintTokensTo(customer.address, price)
        await approveTokensTransfer(customer, contract.address, price)
        await fundContractAs(customer)

        await expectRevert(
          requestMoneyFromTokenAs(performer, performer.address, price),
          'ERC20: insufficient allowance'
        )
      })

      it('Transfers money from contract to performer', async function () {
        await mintTokensTo(customer.address, price)
        await approveTokensTransfer(customer, contract.address, price)
        await fundContractAs(customer)
        await approveContractAs(customer)

        expect(await token.balanceOf(contract.address)).to.eq(price * multiplier)
        expect(await token.balanceOf(performer.address)).to.eq(0)

        await requestMoneyFromTokenAs(performer, performer.address, price)

        expect(await token.balanceOf(contract.address)).to.eq(0)
        expect(await token.balanceOf(performer.address)).to.eq(price * multiplier)
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          tokenAddress,
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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)

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
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)
            await fundContractAs(customer)
            await approveContractAs(customer)

            expect(await contract.connect(performer).isApproved()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when contract is not funded', function () {
          it('Returns zero', async function () {
            const expected = await contract.connect(performer).getBalance()
            expect(expected).to.eq(0)
          })
        })

        describe('when contract is funded', function () {
          beforeEach(async function () {
            await mintTokensTo(customer.address, price)
            await approveTokensTransfer(customer, contract.address, price)

            const tx = await contract.connect(customer).fund()
            await tx.wait()
          })

          it('Returns contract balance', async function () {
            const expected = await contract.connect(performer).getBalance()
            expect(expected).to.eq(price * multiplier)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const expected = await contract.connect(performer).getCustomer()
          expect(expected).to.eq(customer.address)
        })
      })

      describe('getPerformer', function () {
        it('Returns performer address', async function () {
          const expected = await contract.connect(performer).getPerformer()
          expect(expected).to.eq(performer.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const expected = await contract.connect(performer).getContractId()
          expect(expected).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const expected = await contract.connect(performer).getPrice()
          expect(expected).to.eq(price * multiplier)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const expected = await contract.connect(performer).getCustomerId()
          expect(expected).to.eq(customerId)
        })
      })

      describe('getPerformerId', function () {
        it('Returns contract performerId', async function () {
          const expected = await contract.connect(performer).getPerformerId()
          expect(expected).to.eq(performerId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const expected = await contract.connect(performer).getTitle()
          expect(expected).to.eq(title)
        })
      })

      describe('getDescription', function () {
        it('Returns contract description', async function () {
          const expected = await contract.connect(performer).getDescription()
          expect(expected).to.eq(description)
        })
      })
    })
  })

  describe('As other', function () {
    beforeEach(async function () {
      contract = await deployContract(
        tokenAddress,
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
