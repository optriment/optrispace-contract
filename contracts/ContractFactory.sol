//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

import "./Contract.sol";

contract ContractFactory {
    // Logs out added admin record
    event AdminAdded(address newAdmin);

    // Logs out created contract record
    event ContractDeployed(
        address contractAddress,
        string contractId
    );

    address private immutable owner;

    address[] private admins;

    // key – Contract ID
    mapping(string => Contract) private contracts;

    // key – Contract ID
    mapping(string => bool) private contractExists;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only for owner");
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
        address performer,
        uint256 price,
        string memory customerId,
        string memory performerId,
        string memory title,
        string memory description
    ) external returns (address) {
        require(bytes(contractId).length > 0, "ContractID cannot be empty");
        require(!contractExists[contractId], "Contract already exists");

        Contract c = new Contract(
            contractId,
            msg.sender, // customer
            performer,
            price,
            customerId,
            performerId,
            title,
            description
        );

        contracts[contractId] = c;
        contractExists[contractId] = true;

        emit ContractDeployed(address(c), contractId);

        return address(c);
    }

    function getContractById(string memory contractId) external view returns (
        address _address,
        uint256 _balance,
        address _customer,
        address _performer,
        string memory _contractId,
        uint256 _price,
        string memory _customerId,
        string memory _performerId,
        string memory _title,
        string memory _description
    ) {
        require(contractExists[contractId], "Contract does not exist");

        Contract c = contracts[contractId];

        require(
            owner == msg.sender || c.getCustomer() == msg.sender || c.getPerformer() == msg.sender,
            "Authorized only"
        );

        return (
            address(c),
            c.getBalance(),
            c.getCustomer(),
            c.getPerformer(),
            c.getContractId(),
            c.getPrice(),
            c.getCustomerId(),
            c.getPerformerId(),
            c.getTitle(),
            c.getDescription()
        );
    }
}
