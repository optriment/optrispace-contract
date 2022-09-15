//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract Contract {
    string public constant VERSION = "1.0.0";

    // Logs out created contract record
    event ContractCreated(address contractAddress, string contractId, address customer);

    // Logs out accepted contract record
    event ContractAccepted(string contractId);

    // Logs out funded contract record
    event ContractFunded(string contractId, uint256 amount);

    // Logs out approval requested contract record
    event ContractApprovalRequested(string contractId, uint256 timestamp);

    // Logs out approved contract record
    event ContractApproved(string contractId);

    // Logs out closed contract record
    event ContractClosed(string contractId);

    address private owner = msg.sender;
    address private customer;
    address payable private contractor;
    string private customerId;
    string private contractorId;
    string private contractId;
    uint256 private price;

    // key – State index, value - Timestamp
    mapping(uint8 => uint256) private timestamps;

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

    enum States {
        Created,
        Accepted,
        Funded,
        ApprovalRequested,
        Approved,
        Closed
    }
    States private state;

    modifier inState(States _state) {
        if (state != _state) {
            revert TooEarly();
        }

        _;
    }

    // NOTE: https://docs.soliditylang.org/en/v0.8.12/common-patterns.html#example
    function nextState() internal {
        // solhint-disable-next-line not-rely-on-time
        timestamps[uint8(state) + 1] = block.timestamp;
        state = States(uint256(state) + 1);
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
        string memory _contractorId
    ) {
        create(_contractId, _customer, _contractor, _price, _customerId, _contractorId);
    }

    function create(
        string memory _contractId,
        address _customer,
        address _contractor,
        uint256 _price,
        string memory _customerId,
        string memory _contractorId
    ) private {
        require(msg.sender != address(0) && _customer != address(0) && _contractor != address(0), "Invalid address");

        if (_customer == msg.sender || _contractor == msg.sender) {
            revert OwnerOnly();
        }

        require(_customer != _contractor, "Customer == Contractor");

        require(_price != 0, "Price is zero");

        require(bytes(_contractId).length > 0, "ContractID is empty");
        require(bytes(_customerId).length > 0, "CustomerID is empty");
        require(bytes(_contractorId).length > 0, "ContractorID is empty");

        require(
            keccak256(abi.encodePacked(_customerId)) != keccak256(abi.encodePacked(_contractorId)),
            "CustomerID == ContractorID"
        );

        customer = _customer;
        contractor = payable(_contractor);

        // Internal information from our backend
        price = _price;
        contractId = _contractId;
        customerId = _customerId;
        contractorId = _contractorId;

        state = States.Created;
        // solhint-disable-next-line not-rely-on-time
        timestamps[0] = block.timestamp;

        emit ContractCreated(address(this), contractId, customer);
    }

    function accept() external onlyContractor inState(States.Created) transitionNext {
        emit ContractAccepted(contractId);
    }

    function fund() external payable onlyCustomer inState(States.Accepted) transitionNext {
        require(msg.value >= price, "Amount is too small");

        emit ContractFunded(contractId, price);
    }

    function requestApproval() external onlyContractor inState(States.Funded) transitionNext {
        // solhint-disable-next-line not-rely-on-time
        emit ContractApprovalRequested(contractId, block.timestamp);
    }

    function approve() external onlyCustomer inState(States.ApprovalRequested) transitionNext {
        emit ContractApproved(contractId);
    }

    function withdraw() external onlyContractor inState(States.Approved) transitionNext {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = contractor.call{value: address(this).balance}("");
        require(success, "Withdraw failed");

        emit ContractClosed(contractId);
    }

    function isAccepted() external view authorized returns (bool) {
        return state == States.Accepted;
    }

    function isFunded() external view authorized returns (bool) {
        return address(this).balance >= price;
    }

    function isApprovalRequested() external view authorized returns (bool) {
        return state == States.ApprovalRequested;
    }

    function isApproved() external view authorized returns (bool) {
        return state == States.Approved;
    }

    function isClosed() external view authorized returns (bool) {
        return state == States.Closed;
    }

    // TODO: Add tests
    function getState() external view authorized returns (string memory) {
        if (state == States.Created) return "Created";
        if (state == States.Accepted) return "Accepted";
        if (state == States.Funded) return "Funded";
        if (state == States.ApprovalRequested) return "ApprovalRequested";
        if (state == States.Approved) return "Approved";
        if (state == States.Closed) return "Closed";

        return "";
    }

    // TODO: Add tests
    function getStateTimestamp(uint8 index) external view authorized returns (uint256) {
        return timestamps[index];
    }

    function getBalance() external view authorized returns (uint256) {
        return address(this).balance;
    }

    function getCustomer() external view authorized returns (address) {
        return customer;
    }

    function getContractor() external view authorized returns (address) {
        return contractor;
    }

    function getContractId() external view authorized returns (string memory) {
        return contractId;
    }

    function getPrice() external view authorized returns (uint256) {
        return price;
    }

    function getCustomerId() external view authorized returns (string memory) {
        return customerId;
    }

    function getContractorId() external view authorized returns (string memory) {
        return contractorId;
    }
}
