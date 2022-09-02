const { expect } = require('chai')
const { ethers } = require('hardhat')
const { expectRevert, expectEvent } = require('./helpers')

describe('Contract', function () {
  let Contract
  let contract
  const contractId = 'cntr42'
  let owner
  let customer
  let contractor
  let other
  const price = 42.12
  const priceInGwei = ethers.utils.parseEther(price.toString())
  const customerId = 'cstmr1'
  const contractorId = 'cntrctr1'
  const title = 'title'

  beforeEach(async function () {
    ;[owner, customer, contractor, other] = await ethers.getSigners()

    Contract = await ethers.getContractFactory('Contract')
  })

  const deployContract = async (
    _signer,
    _contractId,
    _customerAddress,
    _contractorAddress,
    _priceInEth,
    _customerId,
    _contractorId,
    _title
  ) => {
    contract = await Contract.connect(_signer).deploy(
      _contractId,
      _customerAddress,
      _contractorAddress,
      ethers.utils.parseEther(_priceInEth.toString()),
      _customerId,
      _contractorId,
      _title
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
      it('Reverts when customer address is zero', async function () {
        const tx = deployContract(
          owner,
          contractId,
          ethers.constants.AddressZero,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'Invalid address')
      })

      it('Reverts when contractor address is zero', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          ethers.constants.AddressZero,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'Invalid address')
      })

      it('Reverts when owner == customer', async function () {
        const tx = deployContract(
          owner,
          contractId,
          owner.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'OwnerOnly()')
      })

      it('Reverts when owner == contractor', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          owner.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'OwnerOnly()')
      })

      it('Reverts when customer == contractor', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          customer.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'Customer is equal to contractor')
      })

      it('Reverts when price == 0', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          0,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'Price is zero')
      })

      it('Reverts when contractId is empty', async function () {
        const tx = deployContract(
          owner,
          '',
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'ContractID is empty')
      })

      it('Reverts when customerId is empty', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          '',
          contractorId,
          title
        )

        await expectRevert(tx, 'CustomerID is empty')
      })

      it('Reverts when contractorId is empty', async function () {
        const tx = deployContract(owner, contractId, customer.address, contractor.address, price, customerId, '', title)

        await expectRevert(tx, 'ContractorID is empty')
      })

      it('Reverts when title is empty', async function () {
        const tx = deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          ''
        )

        await expectRevert(tx, 'Title is empty')
      })

      it('Deploys successfully', async function () {
        const c = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        const contractAddress = c.address

        expect(contractAddress).not.to.equal(0x0)
        expect(contractAddress).not.to.equal('')
        expect(contractAddress).not.to.equal(null)
        expect(contractAddress).not.to.equal(undefined)
      })

      xit('Emits event ContractDeployed')
    })

    describe('Send ethers directly', function () {
      it('Reverts because there is no fallback nor receive function', async function () {
        const c = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        const contractAddress = c.address

        await expect(
          owner.sendTransaction({
            to: contractAddress,
            value: ethers.utils.parseEther('1'), // 1 ether
          })
        ).to.be.reverted
      })
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(fundContractAs(owner, price), 'CustomerOnly()')
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(approveContractAs(owner), 'CustomerOnly()')
      })
    })

    describe('withdraw', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(withdrawTokensAs(owner), 'ContractorOnly()')
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
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
            await withdrawTokensAs(contractor)

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

      describe('getContractor', function () {
        it('Returns contractor address', async function () {
          const result = await contract.connect(owner).getContractor()
          expect(result).to.eq(contractor.address)
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

      describe('getContractorId', function () {
        it('Returns contract contractorId', async function () {
          const result = await contract.connect(owner).getContractorId()
          expect(result).to.eq(contractorId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(owner).getTitle()
          expect(result).to.eq(title)
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
          contractor.address,
          price,
          customerId,
          contractorId,
          title,
          price
        )

        await expectRevert(tx, 'OwnerOnly()')
      })
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title,
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
          contractor.address,
          price,
          customerId,
          contractorId,
          title,
          price
        )
      })

      describe('when not funded', async function () {
        it('Reverts because contract is not funded', async function () {
          await expectRevert(approveContractAs(customer), 'TooEarly()')
        })
      })

      it('Emits event ContractApproved', async function () {
        await fundContractAs(customer, price)

        await expectEvent(approveContractAs(customer), contract, 'ContractApproved', [contractId])
      })
    })

    describe('withdraw', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(withdrawTokensAs(customer), 'ContractorOnly()')
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title,
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
            await withdrawTokensAs(contractor)

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

      describe('getContractor', function () {
        it('Returns contractor address', async function () {
          const result = await contract.connect(customer).getContractor()
          expect(result).to.eq(contractor.address)
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

      describe('getContractorId', function () {
        it('Returns contract contractorId', async function () {
          const result = await contract.connect(customer).getContractorId()
          expect(result).to.eq(contractorId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(customer).getTitle()
          expect(result).to.eq(title)
        })
      })
    })
  })

  describe('As contractor', function () {
    describe('Deploy', function () {
      it('Reverts because restricted to owner', async function () {
        const tx = deployContract(
          contractor,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )

        await expectRevert(tx, 'OwnerOnly()')
      })
    })

    describe('fund', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(contractor).fund(), 'CustomerOnly()')
      })
    })

    describe('approve', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(contractor).approve(), 'CustomerOnly()')
      })
    })

    describe('withdraw', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      it('Reverts because contract is not approved', async function () {
        await fundContractAs(customer, price)

        await expectRevert(withdrawTokensAs(contractor), '')
      })

      it('Transfers money from contract to contractor', async function () {
        await fundContractAs(customer, price)
        await approveContractAs(customer)

        expect(await ethers.provider.getBalance(contract.address)).to.eq(priceInGwei)
        const contractorBalanceBefore = await ethers.provider.getBalance(contractor.address)
        const contractorBalanceBeforeInEth = ethers.utils.formatEther(contractorBalanceBefore.toString())

        await withdrawTokensAs(contractor)

        expect(await ethers.provider.getBalance(contract.address)).to.eq(0)

        // NOTE: We should check not exact value, because of gas fee
        const contractorBalanceAfter = await ethers.provider.getBalance(contractor.address)
        const contractorBalanceAfterInEth = ethers.utils.formatEther(contractorBalanceAfter.toString())
        const diff = contractorBalanceAfterInEth - contractorBalanceBeforeInEth

        expect(diff).to.be.gt(parseFloat(price) - 2)
      })
    })

    describe('getters', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          title
        )
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)

            expect(await contract.connect(contractor).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApproved', function () {
        describe('when contract is not approved', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isApproved()).to.eq(false)
          })
        })

        describe('when contract is approved', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)

            expect(await contract.connect(contractor).isApproved()).to.eq(true)
          })
        })
      })

      describe('isClosed', function () {
        describe('when contract not closed', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isClosed()).to.eq(false)
          })
        })

        describe('when contract is closed', function () {
          it('Returns true', async function () {
            await fundContractAs(customer, price)
            await approveContractAs(customer)
            await withdrawTokensAs(contractor)

            expect(await contract.connect(contractor).isClosed()).to.eq(true)
          })
        })
      })

      describe('getBalance', function () {
        describe('when contract is not funded', function () {
          it('Returns zero', async function () {
            const result = await contract.connect(contractor).getBalance()
            expect(result).to.eq(0)
          })
        })

        describe('when contract is funded', function () {
          it('Returns contract balance', async function () {
            await fundContractAs(customer, price)

            const result = await contract.connect(contractor).getBalance()
            expect(result).to.eq(priceInGwei)
          })
        })
      })

      describe('getCustomer', function () {
        it('Returns customer address', async function () {
          const result = await contract.connect(contractor).getCustomer()
          expect(result).to.eq(customer.address)
        })
      })

      describe('getContractor', function () {
        it('Returns contractor address', async function () {
          const result = await contract.connect(contractor).getContractor()
          expect(result).to.eq(contractor.address)
        })
      })

      describe('getContractId', function () {
        it('Returns contract ID', async function () {
          const result = await contract.connect(contractor).getContractId()
          expect(result).to.eq(contractId)
        })
      })

      describe('getPrice', function () {
        it('Returns contract price', async function () {
          const result = await contract.connect(contractor).getPrice()
          expect(result).to.eq(priceInGwei)
        })
      })

      describe('getCustomerId', function () {
        it('Returns contract customerId', async function () {
          const result = await contract.connect(contractor).getCustomerId()
          expect(result).to.eq(customerId)
        })
      })

      describe('getContractorId', function () {
        it('Returns contract contractorId', async function () {
          const result = await contract.connect(contractor).getContractorId()
          expect(result).to.eq(contractorId)
        })
      })

      describe('getTitle', function () {
        it('Returns contract title', async function () {
          const result = await contract.connect(contractor).getTitle()
          expect(result).to.eq(title)
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
        contractor.address,
        price,
        customerId,
        contractorId,
        title
      )
    })

    describe('fund', function () {
      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(other).fund(), 'CustomerOnly()')
      })
    })

    describe('approve', function () {
      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(other).approve(), 'CustomerOnly()')
      })
    })

    describe('withdraw', function () {
      it('Reverts because restricted to performer', async function () {
        await expectRevert(contract.connect(other).withdraw(), 'ContractorOnly()')
      })
    })

    describe('isFunded', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isFunded(), 'Unauthorized()')
      })
    })

    describe('isApproved', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isApproved(), 'Unauthorized()')
      })
    })

    describe('isClosed', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isClosed(), 'Unauthorized()')
      })
    })

    describe('getBalance', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getBalance(), 'Unauthorized()')
      })
    })

    describe('getCustomer', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getCustomer(), 'Unauthorized()')
      })
    })

    describe('getContractor', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getContractor(), 'Unauthorized()')
      })
    })

    describe('getContractId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getContractId(), 'Unauthorized()')
      })
    })

    describe('getPrice', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getPrice(), 'Unauthorized()')
      })
    })

    describe('getCustomerId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getCustomerId(), 'Unauthorized()')
      })
    })

    describe('getContractorId', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getContractorId(), 'Unauthorized()')
      })
    })

    describe('getTitle', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getTitle(), 'Unauthorized()')
      })
    })
  })
})
