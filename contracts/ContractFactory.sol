//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

import "./IERC20.sol";
import "./Contract.sol";

contract ContractFactory {
    // Logs out added admin record
    event AdminAdded(address newAdmin);

    // Logs out created contract record
    event ContractCreated(
        address contractAddress,
        string contractId
    );

    // Logs out test token sent record
    event TestTokenSent(address to);

    IERC20 private token;

    // 1 ALZ
    uint256 maxTokensPerRequest = 1 * 10**6;

    address private tokenAddress;

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

    constructor(address _tokenAddress) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
        token = IERC20(_tokenAddress);
    }

    function addAdmin(address newAdmin) external onlyOwner {
        admins.push(newAdmin);

        emit AdminAdded(newAdmin);
    }

    function getAdmins() external view onlyOwner returns (address[] memory) {
        return admins;
    }

    function requestTestToken() external {
        require(token.balanceOf(address(this)) > maxTokensPerRequest, "Unsufficient balance");

        bool success = token.transfer(msg.sender, maxTokensPerRequest);
        require(success, "Unable to transfer money");

        emit TestTokenSent(msg.sender);
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
            tokenAddress,
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

        emit ContractCreated(address(c), contractId);

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
