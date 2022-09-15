//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Contract.sol";

contract ContractFactory {
    // Logs out added admin record
    event AdminAdded(address newAdmin);

    // Logs out created contract record
    event ContractDeployed(address contractAddress, string contractId);

    /// Sender not authorized for this operation
    error Unauthorized();

    /// Available to owner only
    error OwnerOnly();

    address private immutable owner;

    address[] private admins;

    // key – Contract ID
    mapping(string => Contract) private contracts;

    // key – Contract ID
    mapping(string => bool) private contractExists;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OwnerOnly();
        }

        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addAdmin(address newAdmin) external onlyOwner {
        admins.push(newAdmin);

        emit AdminAdded(newAdmin);
    }

    function getAdmins() external view onlyOwner returns (address[] memory) {
        return admins;
    }

    function createContract(
        string memory contractId,
        address contractor,
        uint256 price,
        string memory customerId,
        string memory contractorId
    ) external returns (address) {
        require(bytes(contractId).length > 0, "ContractID is empty");
        require(!contractExists[contractId], "Contract exists");

        Contract c = new Contract(
            contractId,
            msg.sender, // customer
            contractor,
            price,
            customerId,
            contractorId
        );

        contracts[contractId] = c;
        contractExists[contractId] = true;

        emit ContractDeployed(address(c), contractId);

        return address(c);
    }

    function getContractById(string memory contractId)
        external
        view
        returns (
            address _address,
            uint256 _balance,
            address _customer,
            address _contractor,
            string memory _contractId,
            uint256 _price,
            string memory _customerId,
            string memory _contractorId,
            string memory _state
        )
    {
        require(contractExists[contractId], "Contract does not exist");

        Contract c = contracts[contractId];

        if (msg.sender != owner && msg.sender != c.getCustomer() && msg.sender != c.getContractor()) {
            revert Unauthorized();
        }

        _address = address(c);
        _balance = c.getBalance();
        _customer = c.getCustomer();
        _contractor = c.getContractor();
        _contractId = c.getContractId();
        _price = c.getPrice();
        _customerId = c.getCustomerId();
        _contractorId = c.getContractorId();
        _state = c.getState();
    }
}
