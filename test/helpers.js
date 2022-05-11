const { expect } = require('chai')

// NOTE: https://github.com/volt-protocol/volt-protocol-core/blob/develop/test/helpers.ts

async function expectEvent(tx, contract, event, args = []) {
  await expect(tx)
    .to.emit(contract, event)
    .withArgs(...args)
}

const expectRevert = async (tx, errorMessage) => {
  await expect(tx).to.be.revertedWith(errorMessage)
}

module.exports = {
  expectRevert,
  expectEvent,
}
