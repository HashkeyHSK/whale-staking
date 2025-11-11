// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../interfaces/IStake.sol";

/**
 * @title StakingLib
 * @dev Library containing core staking calculations and validations
 * Handles reward calculations with high precision (18 decimals)
 * Optimized for fixed 365-day lock period staking system
 */
library StakingLib {
    error InvalidAmount();

    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BASIS_POINTS = 10000; // 100% = 10000
    uint256 private constant PRECISION = 1e18;
    
    /**
     * @dev Calculates the reward for a staking position
     * @param amount The staked amount
     * @param timeElapsed Time since last reward claim
     * @param rewardRate Annual reward rate in basis points (100% = 10000)
     * @param lockPeriod Duration of the lock in seconds
     * @return reward The calculated reward amount
     * @notice Optimized for fixed 365-day lock period (timeElapsed always <= 365 days)
     */
    function calculateReward(
        uint256 amount,
        uint256 timeElapsed,
        uint256 rewardRate,
        uint256 lockPeriod
    ) public pure returns (uint256 reward) {
        if (amount == 0 || timeElapsed == 0 || rewardRate == 0) {
            return 0;
        }
        
        if (timeElapsed > lockPeriod) {
            timeElapsed = lockPeriod;
        }
        
        require(rewardRate <= BASIS_POINTS, "Rate too large");

        uint256 annualRate = (rewardRate * PRECISION) / BASIS_POINTS;
        require(annualRate <= type(uint256).max / PRECISION, "Annual rate overflow");
        
        // Direct calculation since timeElapsed <= 365 days (always < 1 year)
        uint256 timeRatio = (timeElapsed * PRECISION) / SECONDS_PER_YEAR;
        uint256 totalReward = (amount * annualRate * timeRatio) / (PRECISION * PRECISION);
        
        require(totalReward <= amount * rewardRate / BASIS_POINTS, "Reward overflow");
        
        return totalReward;
    }


    /**
     * @dev Validates and formats the staking amount
     * @param amount Amount to be staked
     * @param minAmount Minimum allowed staking amount
     * @return The validated amount
     * @custom:throws InvalidAmount if amount is less than minimum
     */
    function validateAndFormatAmount(
        uint256 amount,
        uint256 minAmount
    ) public pure returns (uint256) {
        if (amount < minAmount) {
            revert InvalidAmount();
        }
        return amount;
    }

}