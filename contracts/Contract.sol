//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

import "./IERC20.sol";

contract Contract {
    // Logs out created contract record
    event ContractCreated(
        address contractAddress,
        string contractId,
        address customer
    );

    // Logs out funded contract record
    event ContractFunded(
        string contractId,
        uint256 amount
    );

    // Logs out approved contract record
    event ContractApproved(string contractId);

    IERC20 private token;
    address private owner;
    address private customer;
    address payable private performer;
    string private customerId;
    string private performerId;
    string private contractId;
    string private title;
    string private description;
    uint256 private price;

    enum States { Created, Funded, Approved }
    States private state;

    modifier inState(States _state) {
        require(state == _state, "Cannot be called at this time");
        _;
    }

    modifier onlyCustomer() {
        require(msg.sender == customer, "Available to customer only");
        _;
    }

    modifier onlyPerformer() {
        require(msg.sender == performer, "Available to performer only");
        _;
    }

    modifier authorized() {
        require(
            msg.sender == owner || msg.sender == customer || msg.sender == performer,
            "Authorized only"
        );
        _;
    }

    constructor(
        address _tokenAddress,
        string memory _contractId,
        address _customer,
        address _performer,
        uint256 _price,
        string memory _customerId,
        string memory _performerId,
        string memory _title,
        string memory _description
    ) {
        require(msg.sender != address(0), "Invalid sender");
        require(_tokenAddress != address(0), "Invalid token address");
        require(_customer != address(0), "Invalid customer");
        require(_performer != address(0), "Invalid performer");

        require(_tokenAddress != msg.sender, "Invalid token address");
        require(_customer != msg.sender, "Customer cannot deploy contract");
        require(_performer != msg.sender, "Performer cannot deploy contract");

        require(_tokenAddress != _customer, "Invalid token address");
        require(_tokenAddress != _performer, "Invalid token address");
        require(_customer != _performer, "Customer is equal to performer");

        require(_price > 0, "Price must be greater than zero");
        require(bytes(_customerId).length > 0, "CustomerId cannot be empty");
        require(bytes(_performerId).length > 0, "PerformerID cannot be empty");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        token = IERC20(_tokenAddress);

        owner = msg.sender;
        customer = _customer;
        performer = payable(_performer);

        // Internal information from our backend
        price = _price;
        contractId = _contractId;
        customerId = _customerId;
        performerId = _performerId;
        title =_title;
        description = _description;

        state = States.Created;

        emit ContractCreated(
            address(this),
            contractId,
            customer
        );
    }

    // TODO: Add function addFunds() to fund extra money to contract
    // TODO: Add function decline() to decline contract by Performer or Customer

    function fund() external onlyCustomer inState(States.Created) {
        address contractAddress = address(this);

        bool success = token.transferFrom(msg.sender, contractAddress, price);
        require(success, "Unable to transfer money");

        require(token.balanceOf(contractAddress) >= price, "Contract balance is not valid");

        state = States.Funded;

        emit ContractFunded(contractId, price);
    }

    function approve() external onlyCustomer inState(States.Funded) {
        state = States.Approved;

        emit ContractApproved(contractId);

        bool success = token.approve(performer, price);
        require(success, "Unable to approve performer");
    }

    function isFunded() external authorized view returns (bool) {
        return token.balanceOf(address(this)) >= price;
    }

    function isApproved() external authorized view returns (bool) {
        return state == States.Approved;
    }

    function getBalance() external authorized view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getCustomer() external authorized view returns (address) {
        return customer;
    }

    function getPerformer() external authorized view returns (address) {
        return performer;
    }

    function getContractId() external authorized view returns (string memory) {
        return contractId;
    }

    function getPrice() external authorized view returns (uint256) {
        return price;
    }

    function getCustomerId() external authorized view returns (string memory) {
        return customerId;
    }

    function getPerformerId() external authorized view returns (string memory) {
        return performerId;
    }

    function getTitle() external authorized view returns (string memory) {
        return title;
    }

    function getDescription() external authorized view returns (string memory) {
        return description;
    }
}
