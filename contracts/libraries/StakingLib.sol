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
    
    function calculateYearlyReward(
        uint256 amount,
        uint256 annualRate,
        uint256 PRECISION
    ) private pure returns (uint256) {
        return (amount * annualRate) / PRECISION;
    }

    function calculateRemainingTimeReward(
        uint256 amount,
        uint256 annualRate,
        uint256 remainingTime,
        uint256 PRECISION
    ) private pure returns (uint256) {
        uint256 timeRatio = (remainingTime * PRECISION) / SECONDS_PER_YEAR;
        return (amount * annualRate * timeRatio) / (PRECISION * PRECISION);
    }

    /**
     * @dev Calculates the reward for a staking position
     * @param amount The staked amount
     * @param timeElapsed Time since last reward claim
     * @param rewardRate Annual reward rate in basis points (100% = 10000)
     * @param lockPeriod Duration of the lock in seconds
     * @return reward The calculated reward amount
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
        
        uint256 PRECISION = 1e18;
        
        require(amount <= type(uint256).max / PRECISION, "Amount too large");
        require(rewardRate <= BASIS_POINTS, "Rate too large");

        uint256 annualRate = (rewardRate * PRECISION) / BASIS_POINTS;
        require(annualRate <= type(uint256).max / PRECISION, "Annual rate overflow");
        
        uint256 completeYears = timeElapsed / SECONDS_PER_YEAR;
        uint256 remainingTime = timeElapsed % SECONDS_PER_YEAR;
        
        uint256 totalReward = calculateYearlyReward(amount, annualRate, PRECISION) * completeYears;
        
        if (remainingTime > 0) {
            totalReward += calculateRemainingTimeReward(
                amount,
                annualRate,
                remainingTime,
                PRECISION
            );
        }
        
        require(totalReward <= amount * rewardRate * (timeElapsed / SECONDS_PER_YEAR + 1) / BASIS_POINTS, 
            "Reward overflow");
        
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