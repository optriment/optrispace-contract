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

    address private owner = msg.sender;
    address private customer;
    address payable private contractor;
    string private customerId;
    string private contractorId;
    string private contractId;
    string private title;
    uint256 private price;

    /// Sender not authorized for this operation
    error Unauthorized();

    /// Available to owner only
    error OwnerOnly();

    /// Available to customer only
    error CustomerOnly();

    /// Available to contractor only
    error ContractorOnly();

    /// Function called too early
    error TooEarly();

    enum States { Deployed, Funded, Approved, Closed }
    States private state;

    modifier inState(States _state) {
        if (state != _state) {
            revert TooEarly();
        }

        _;
    }

    // NOTE: https://docs.soliditylang.org/en/v0.8.12/common-patterns.html#example
    function nextState() internal {
        state = States(uint(state) + 1);
    }

    // This modifier goes to the next stage after the function is done.
    modifier transitionNext() {
        _;
        nextState();
    }

    modifier onlyCustomer() {
        if (msg.sender != customer) {
            revert CustomerOnly();
        }

        _;
    }

    modifier onlyContractor() {
        if (msg.sender != contractor) {
            revert ContractorOnly();
        }

        _;
    }

    modifier authorized() {
        if (msg.sender != owner && msg.sender != customer && msg.sender != contractor) {
            revert Unauthorized();
        }

        _;
    }

    constructor(
        string memory _contractId,
        address _customer,
        address _contractor,
        uint256 _price,
        string memory _customerId,
        string memory _contractorId,
        string memory _title
    ) {
        create(_contractId, _customer, _contractor, _price, _customerId, _contractorId, _title);
    }

    function create(
        string memory _contractId,
        address _customer,
        address _contractor,
        uint256 _price,
        string memory _customerId,
        string memory _contractorId,
        string memory _title
    ) private {
        require(msg.sender != address(0) && _customer != address(0) && _contractor != address(0), "Invalid address");

        if (_customer == msg.sender || _contractor == msg.sender) {
            revert OwnerOnly();
        }

        require(_customer != _contractor, "Customer is equal to contractor");

        require(_price != 0, "Price is zero");

        require(bytes(_contractId).length > 0, "ContractID is empty");

        // TODO: Do we need to store this information in Blockchain?
        require(bytes(_customerId).length > 0, "CustomerID is empty");
        require(bytes(_contractorId).length > 0, "ContractorID is empty");
        require(bytes(_title).length > 0, "Title is empty");

        customer = _customer;
        contractor = payable(_contractor);

        // Internal information from our backend
        price = _price;
        contractId = _contractId;
        customerId = _customerId;
        contractorId = _contractorId;
        title =_title;

        state = States.Deployed;

        emit ContractDeployed(
            address(this),
            contractId,
            customer
        );
    }

    function fund() external payable onlyCustomer inState(States.Deployed) transitionNext {
        require(msg.value >= price, "Amount is too small");

        emit ContractFunded(contractId, price);
    }

    function approve() external onlyCustomer inState(States.Funded) transitionNext {
        emit ContractApproved(contractId);
    }

    function withdraw() external onlyContractor inState(States.Approved) transitionNext {
        (bool success, ) = contractor.call{value: address(this).balance}("");
        require(success, "Withdraw failed");
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

    function getContractor() external authorized view returns (address) {
        return contractor;
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

    function getContractorId() external authorized view returns (string memory) {
        return contractorId;
    }

    function getTitle() external authorized view returns (string memory) {
        return title;
    }
}
