//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

contract Contract {
    // Logs out created contract record
    event ContractDeployed(
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

    address private owner;
    address private customer;
    address payable private performer;
    string private customerId;
    string private performerId;
    string private contractId;
    string private title;
    string private description;
    uint256 private price;

    enum States { Deployed, Funded, Approved, Closed }
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
        require(_customer != address(0), "Invalid customer");
        require(_performer != address(0), "Invalid performer");

        require(_customer != msg.sender, "Customer cannot deploy contract");
        require(_performer != msg.sender, "Performer cannot deploy contract");

        require(_customer != _performer, "Customer is equal to performer");

        require(_price > 0, "Price must be greater than zero");
        require(bytes(_customerId).length > 0, "CustomerId cannot be empty");
        require(bytes(_performerId).length > 0, "PerformerID cannot be empty");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

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

        state = States.Deployed;

        emit ContractDeployed(
            address(this),
            contractId,
            customer
        );
    }

    // TODO: Add function addFunds() to fund extra money to contract
    // TODO: Add function decline() to decline contract by Performer or Customer

    function fund() external payable onlyCustomer inState(States.Deployed) {
        require(msg.value >= price, "Amount is too small");

        state = States.Funded;

        emit ContractFunded(contractId, price);
    }

    function approve() external onlyCustomer inState(States.Funded) {
        state = States.Approved;

        emit ContractApproved(contractId);
    }

    function withdraw() external onlyPerformer inState(States.Approved) {
        state = States.Closed;

        (bool success, ) = performer.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function isFunded() external authorized view returns (bool) {
        return address(this).balance >= price;
    }

    function isApproved() external authorized view returns (bool) {
        return state == States.Approved;
    }

    function isClosed() external authorized view returns (bool) {
        return state == States.Closed;
    }

    function getBalance() external authorized view returns (uint256) {
        return address(this).balance;
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
