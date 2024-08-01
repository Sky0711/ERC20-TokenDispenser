// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./TimeDateLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Inheritance Token Dispenser
/// @dev Distributes ERC20 tokens to a beneficiary over time with a monthly cap.
contract InheritanceTokenDispenser {
    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public immutable startDate; // Start date of the distribution.
    uint256 public totalDistributed;

    uint256 private constant MAX_MONTHLY_DISTRIBUTION = 10000 ether;
    uint256 private constant TOTAL_TOKENS = 700000 ether;

    // Distribution percentages by year, based on maximum monthly distribution.
    uint256 private constant DISTRIBUTION_YEAR_1 = MAX_MONTHLY_DISTRIBUTION * 10 / 100;
    uint256 private constant DISTRIBUTION_YEAR_2 = MAX_MONTHLY_DISTRIBUTION * 25 / 100;
    uint256 private constant DISTRIBUTION_YEAR_3 = MAX_MONTHLY_DISTRIBUTION * 50 / 100;
    uint256 private constant DISTRIBUTION_YEAR_4 = MAX_MONTHLY_DISTRIBUTION;

    mapping(uint => mapping(uint => bool)) public hasDistributed;

    event TokensDistributed(
        address indexed beneficiary,
        uint256 amount,
        uint year,
        uint month,
        uint timestamp
    );

    /**
     * @param _tokenAddress The ERC20 token address.
     * @param _beneficiary Address of the beneficiary who can distribute tokens.
     */
    constructor(address _tokenAddress, address _beneficiary) {
        // Requirments
        require(_tokenAddress != address(0), "Token address cannot be zero");
        require(_beneficiary != address(0), "Beneficiary address cannot be zero");
        require(isContract(_tokenAddress), "Provided token address must be a contract");

        token = IERC20(_tokenAddress);
        beneficiary = _beneficiary;
        startDate = TimeDateLibrary.timestampFromDate(
            TimeDateLibrary.getYear(block.timestamp),
            TimeDateLibrary.getMonth(block.timestamp),
            1  // Start of the month
        );
    }

    /**
     * @dev Distributes tokens to the beneficiary based on the predefined(hardcoded) schedule.
     */
    function distribute() external {
        require(msg.sender == beneficiary, "Only beneficiary can distribute tokens");

        uint year = TimeDateLibrary.getYear(block.timestamp);
        uint month = TimeDateLibrary.getMonth(block.timestamp);
        require(!hasDistributed[year][month], "Already distributed this month");

        uint256 monthIndex = TimeDateLibrary.diffMonths(startDate, block.timestamp);
        uint256 amount = calculateMonthlyDistribution(monthIndex);
        require(amount > 0, "No tokens left to distribute");

        hasDistributed[year][month] = true;
        totalDistributed += amount;
        token.transfer(beneficiary, amount);

        emit TokensDistributed(beneficiary, amount, year, month, block.timestamp);
    }

    /**
     * @dev Calculates the amount of tokens to distribute based on the elapsed months.
     * @param monthsElapsed Number of calendar months elapsed since the start date (for distirbution).
     * @return tokensThisMonth => Amount of tokens to distribute this month.
     */
    function calculateMonthlyDistribution(uint monthsElapsed) internal view returns (uint256) {
        uint256 year = monthsElapsed / 12;
        uint256 tokensThisMonth;

        if (year == 0) {
            tokensThisMonth = DISTRIBUTION_YEAR_1;
        } else if (year == 1) {
            tokensThisMonth = DISTRIBUTION_YEAR_2;
        } else if (year == 2) {
            tokensThisMonth = DISTRIBUTION_YEAR_3;
        } else if (year == 3) {
            tokensThisMonth = DISTRIBUTION_YEAR_4;
        } else {
            // Halve the distributed ammount every 4 years
            uint256 fourYearPeriods = (year - 4) / 4;
            tokensThisMonth = MAX_MONTHLY_DISTRIBUTION / (2 ** (fourYearPeriods + 1));
        }

        uint256 remainingTokens = TOTAL_TOKENS - totalDistributed;

        if (tokensThisMonth <= 100 ether) {
            tokensThisMonth = remainingTokens;
        }

        return tokensThisMonth;
    }
    
    /**
     * @dev Checks if an address is a contract.
     * @param account The address to check.
     * @return True if the address hosts a contract, false otherwise.
     * NOTE: Implemented for user convenience and mistake neutralization, NOT safety concerns
     */
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}
