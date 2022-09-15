const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')
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
    _contractorId
  ) => {
    contract = await Contract.connect(_signer).deploy(
      _contractId,
      _customerAddress,
      _contractorAddress,
      ethers.utils.parseEther(_priceInEth.toString()),
      _customerId,
      _contractorId
    )

    return await contract.deployed()
  }

  const acceptContractAs = async (_signer) => {
    const tx = await contract.connect(_signer).accept()
    await tx.wait()

    return tx
  }

  const fundContractAs = async (_signer, _amountInEth) => {
    const tx = await contract.connect(_signer).fund({ value: ethers.utils.parseEther(_amountInEth.toString()) })
    await tx.wait()

    return tx
  }

  const requestApprovalAs = async (_signer) => {
    const tx = await contract.connect(_signer).requestApproval()
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

  describe('Version', function () {
    beforeEach(async function () {
      contract = await deployContract(
        owner,
        contractId,
        customer.address,
        contractor.address,
        price,
        customerId,
        contractorId
      )
    })

    it('Returns actual version', async function () {
      expect(await contract.version()).to.equal('1.0.0')
    })
  })

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
          contractorId
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
          contractorId
        )

        await expectRevert(tx, 'Invalid address')
      })

      it('Reverts when owner == customer', async function () {
        const tx = deployContract(owner, contractId, owner.address, contractor.address, price, customerId, contractorId)

        await expectRevert(tx, 'OwnerOnly()')
      })

      it('Reverts when owner == contractor', async function () {
        const tx = deployContract(owner, contractId, customer.address, owner.address, price, customerId, contractorId)

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
          contractorId
        )

        await expectRevert(tx, 'Customer is equal to contractor')
      })

      it('Reverts when price == 0', async function () {
        const tx = deployContract(owner, contractId, customer.address, contractor.address, 0, customerId, contractorId)

        await expectRevert(tx, 'Price is zero')
      })

      it('Reverts when contractId is empty', async function () {
        const tx = deployContract(owner, '', customer.address, contractor.address, price, customerId, contractorId)

        await expectRevert(tx, 'ContractID is empty')
      })

      it('Reverts when customerId is empty', async function () {
        const tx = deployContract(owner, contractId, customer.address, contractor.address, price, '', contractorId)

        await expectRevert(tx, 'CustomerID is empty')
      })

      it('Reverts when contractorId is empty', async function () {
        const tx = deployContract(owner, contractId, customer.address, contractor.address, price, customerId, '')

        await expectRevert(tx, 'ContractorID is empty')
      })

      it('Reverts when customerId is equal to contractorId', async function () {
        const tx = deployContract(owner, contractId, customer.address, contractor.address, price, 'qwe', 'qwe')

        await expectRevert(tx, 'CustomerID is equal to ContractorID')
      })

      it('Deploys successfully', async function () {
        const c = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId
        )

        const contractAddress = c.address

        expect(contractAddress).not.to.equal(ethers.constants.AddressZero)
        expect(contractAddress).not.to.equal('')
        expect(contractAddress).not.to.equal(null)
        expect(contractAddress).not.to.equal(undefined)

        const _contractId = await Contract.attach(contractAddress).connect(owner).getContractId()
        expect(_contractId).to.eq(contractId)

        expect(await contract.connect(owner).getState()).to.eq('Created')
        expect(await contract.connect(owner).getStateTimestamp(0)).to.be.above(0)
      })

      xit('Emits event ContractCreated')
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
          contractorId
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

    describe('accept', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(acceptContractAs(owner, price), 'ContractorOnly()')
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
          contractorId
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(fundContractAs(owner, price), 'CustomerOnly()')
      })
    })

    describe('requestApproval', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(requestApprovalAs(owner), 'ContractorOnly()')
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
          contractorId
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
          contractorId
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
          contractorId
        )
      })

      describe('isAccepted', function () {
        describe('when contract is not accepted', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isAccepted()).to.eq(false)
          })
        })

        describe('when contract is accepted', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor, price)

            expect(await contract.connect(owner).isAccepted()).to.eq(true)
          })
        })
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)

            expect(await contract.connect(owner).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApprovalRequested', function () {
        describe('when contract approval is not requested', function () {
          it('Returns false', async function () {
            expect(await contract.connect(owner).isApprovalRequested()).to.eq(false)
          })
        })

        describe('when contract approval is requested', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)

            expect(await contract.connect(owner).isApprovalRequested()).to.eq(true)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
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
          price
        )

        await expectRevert(tx, 'OwnerOnly()')
      })
    })

    describe('accept', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          price
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(acceptContractAs(customer), 'ContractorOnly()')
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
          price
        )
      })

      describe('when not accepted', async function () {
        it('Reverts because contract is not accepted', async function () {
          await expectRevert(fundContractAs(customer, price), 'TooEarly()')
        })
      })

      describe('when accepted', async function () {
        it('Emits event ContractFunded', async function () {
          await acceptContractAs(contractor)

          await expectEvent(fundContractAs(customer, price), contract, 'ContractFunded', [contractId, priceInGwei])
        })

        it('Transitions to Funded', async function () {
          await acceptContractAs(contractor)
          await fundContractAs(customer, price)

          expect(await contract.connect(customer).getState()).to.eq('Funded')
          expect(await contract.connect(customer).getStateTimestamp(2)).to.be.above(0)
        })
      })
    })

    describe('requestApproval', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId,
          price
        )
      })

      it('Reverts because restricted to contractor', async function () {
        await expectRevert(requestApprovalAs(customer), 'ContractorOnly()')
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
          price
        )
      })

      describe('when not funded', async function () {
        it('Reverts because contract is not funded', async function () {
          await expectRevert(approveContractAs(customer), 'TooEarly()')
        })
      })

      it('Emits event ContractApproved', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)

        await expectEvent(approveContractAs(customer), contract, 'ContractApproved', [contractId])
      })

      it('Transitions to Approved', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)
        await approveContractAs(customer)

        expect(await contract.connect(customer).getState()).to.eq('Approved')
        expect(await contract.connect(customer).getStateTimestamp(4)).to.be.above(0)
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
          contractorId
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
          price
        )
      })

      describe('isAccepted', function () {
        describe('when contract is not accepted', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isAccepted()).to.eq(false)
          })
        })

        describe('when contract is accepted', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor, price)

            expect(await contract.connect(customer).isAccepted()).to.eq(true)
          })
        })
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)

            expect(await contract.connect(customer).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApprovalRequested', function () {
        describe('when contract approval is not requested', function () {
          it('Returns false', async function () {
            expect(await contract.connect(customer).isApprovalRequested()).to.eq(false)
          })
        })

        describe('when contract approval is requested', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)

            expect(await contract.connect(customer).isApprovalRequested()).to.eq(true)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
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
          contractorId
        )

        await expectRevert(tx, 'OwnerOnly()')
      })
    })

    describe('accept', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId
        )
      })

      it('Emits event ContractAccepted', async function () {
        await expectEvent(acceptContractAs(contractor), contract, 'ContractAccepted', [contractId])
      })

      it('Transitions to Accepted', async function () {
        await acceptContractAs(contractor)

        expect(await contract.connect(contractor).getState()).to.eq('Accepted')
        expect(await contract.connect(contractor).getStateTimestamp(1)).to.be.above(0)
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
          contractorId
        )
      })

      it('Reverts because restricted to customer', async function () {
        await expectRevert(contract.connect(contractor).fund(), 'CustomerOnly()')
      })
    })

    describe('requestApproval', function () {
      beforeEach(async function () {
        contract = await deployContract(
          owner,
          contractId,
          customer.address,
          contractor.address,
          price,
          customerId,
          contractorId
        )
      })

      it('Emits event ContractApprovalRequested', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)

        const timestamp = +new Date()
        await time.setNextBlockTimestamp(timestamp)

        await expectEvent(requestApprovalAs(contractor), contract, 'ContractApprovalRequested', [contractId, timestamp])
      })

      it('Transitions to ApprovalRequested', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)

        expect(await contract.connect(contractor).getState()).to.eq('ApprovalRequested')
        expect(await contract.connect(contractor).getStateTimestamp(3)).to.be.above(0)
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
          contractorId
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
          contractorId
        )
      })

      it('Reverts because contract is not approved', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)

        await expectRevert(withdrawTokensAs(contractor), '')
      })

      it('Transfers money from contract to contractor', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)
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

      it('Emits event ContractClosed', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)
        await approveContractAs(customer)

        await expectEvent(withdrawTokensAs(contractor), contract, 'ContractClosed', [contractId])
      })

      it('Transitions to Closed', async function () {
        await acceptContractAs(contractor)
        await fundContractAs(customer, price)
        await requestApprovalAs(contractor)
        await approveContractAs(customer)
        await withdrawTokensAs(contractor)

        expect(await contract.connect(contractor).getState()).to.eq('Closed')
        expect(await contract.connect(contractor).getStateTimestamp(5)).to.be.above(0)
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
          contractorId
        )
      })

      describe('isAccepted', function () {
        describe('when contract is not accepted', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isAccepted()).to.eq(false)
          })
        })

        describe('when contract is accepted', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor, price)

            expect(await contract.connect(contractor).isAccepted()).to.eq(true)
          })
        })
      })

      describe('isFunded', function () {
        describe('when contract is not funded', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isFunded()).to.eq(false)
          })
        })

        describe('when contract is funded', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)

            expect(await contract.connect(contractor).isFunded()).to.eq(true)
          })
        })
      })

      describe('isApprovalRequested', function () {
        describe('when contract approval is not requested', function () {
          it('Returns false', async function () {
            expect(await contract.connect(contractor).isApprovalRequested()).to.eq(false)
          })
        })

        describe('when contract approval is requested', function () {
          it('Returns true', async function () {
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)

            expect(await contract.connect(contractor).isApprovalRequested()).to.eq(true)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
            await fundContractAs(customer, price)
            await requestApprovalAs(contractor)
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
            await acceptContractAs(contractor)
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
        contractorId
      )
    })

    describe('accept', function () {
      it('Reverts because restricted to contractor', async function () {
        await expectRevert(contract.connect(other).accept(), 'ContractorOnly()')
      })
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

    describe('isAccepted', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).isAccepted(), 'Unauthorized()')
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

    describe('getState', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getState(), 'Unauthorized()')
      })
    })

    describe('getStateTimestamp', function () {
      it('Reverts because restricted to participants', async function () {
        await expectRevert(contract.connect(other).getStateTimestamp(0), 'Unauthorized()')
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
  })
})
