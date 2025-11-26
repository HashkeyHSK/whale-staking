// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title StakingConstants
 * @dev Contract containing constants for staking system
 * These constants can be inherited or referenced by other contracts
 */
contract StakingConstants {
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000
    uint256 public constant PRECISION = 1e18;
    uint256 public constant LOCK_PERIOD = 365 days;
    uint256 public constant HSK_DECIMALS = 18; // HSK token decimals
    uint256 public constant EARLY_UNLOCK_PERIOD = 7 days;  // Early unlock waiting period
    uint256 public constant EARLY_UNSTAKE_PENALTY_RATE = 5000;  // Early unstake penalty rate (50% = 5000 basis points)
}