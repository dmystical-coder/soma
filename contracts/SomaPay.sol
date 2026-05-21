// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title SomaPay
/// @notice Accepts USDC payments for Soma wallet oracle readings and emits
///         on-chain events that The Graph indexes for the /stats dashboard.
contract SomaPay {
    address public owner;
    IERC20  public immutable usdc;

    // Prices in USDC (6 decimals)
    uint256 public constant ORACLE_PRICE   = 50_000; // 0.05 USDC
    uint256 public constant FOLLOWUP_PRICE = 20_000; // 0.02 USDC

    enum QueryType { ORACLE, FOLLOWUP }

    event QueryPaid(
        address indexed user,
        QueryType indexed queryType,
        uint256 amount,
        uint256 timestamp
    );

    uint256 public totalQueries;
    mapping(address => uint256) public readingCount;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc) {
        owner = msg.sender;
        usdc  = IERC20(_usdc);
    }

    /// @notice User must call usdc.approve(address(this), price) first
    function payForReading(QueryType queryType) external {
        uint256 price = queryType == QueryType.ORACLE ? ORACLE_PRICE : FOLLOWUP_PRICE;
        require(usdc.transferFrom(msg.sender, address(this), price), "Payment failed");
        totalQueries++;
        readingCount[msg.sender]++;
        emit QueryPaid(msg.sender, queryType, price, block.timestamp);
    }

    function withdraw() external onlyOwner {
        usdc.transfer(owner, usdc.balanceOf(address(this)));
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
