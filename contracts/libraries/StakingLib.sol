// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IStake.sol";

/**
 * @title StakingLib
 * @dev Library containing core staking calculations and validations
 * This library handles all the complex calculations and validations for the staking contract
 */
library StakingLib {
    
    // Custom errors for better gas efficiency and clearer error messages
    error InvalidAmount();
    error InvalidPeriod();
    error InvalidRate();
    error CalculationOverflow();
    error ZeroAddress();

    // Constants used in calculations
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
        // Early return for zero values
        if (amount == 0 || timeElapsed == 0 || rewardRate == 0) {
            return 0;
        }
        
        // If current time is beyond lock period, only calculate rewards up to lock end
        if (timeElapsed > lockPeriod) {
            timeElapsed = lockPeriod;
        }
        
        // High precision calculations using 18 decimals
        uint256 PRECISION = 1e18;
        
        // Input validation to prevent overflow
        require(amount <= type(uint256).max / PRECISION, "Amount too large");
        require(rewardRate <= BASIS_POINTS, "Rate too large");

        // Calculate annual rate with high precision
        uint256 annualRate = (rewardRate * PRECISION) / BASIS_POINTS;
        require(annualRate <= type(uint256).max / PRECISION, "Annual rate overflow");
        
        // Calculate complete years and remaining time
        uint256 completeYears = timeElapsed / SECONDS_PER_YEAR;
        uint256 remainingTime = timeElapsed % SECONDS_PER_YEAR;
        
        // Calculate rewards for complete years
        uint256 totalReward = calculateYearlyReward(amount, annualRate, PRECISION) * completeYears;
        
        // Calculate rewards for remaining time
        if (remainingTime > 0) {
            totalReward += calculateRemainingTimeReward(
                amount,
                annualRate,
                remainingTime,
                PRECISION
            );
        }
        
        // Validation check
        require(totalReward <= amount * rewardRate * (timeElapsed / SECONDS_PER_YEAR + 1) / BASIS_POINTS, 
            "Reward overflow");
        
        return totalReward;
    }

    /**
     * @dev Validates lock period and reward rate for staking options
     * @param period Lock period in seconds
     * @param rewardRate Annual reward rate in basis points
     * @return bool True if the lock option is valid
     */
    function isValidLockOption(
        uint256 period,
        uint256 rewardRate
    ) public pure returns (bool) {
        // Period must be between 1 day and 2 years
        if (period < 1 days || period > 730 days) {
            return false;
        }
        
        // Rate must not exceed 100%
        if (rewardRate > BASIS_POINTS) {
            return false;
        }
        
        return true;
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

    /**
     * @dev Calculates when a staking position will be unlocked
     * @param stakedAt Timestamp when the position was staked
     * @param lockPeriod Duration of the lock in seconds
     * @return Timestamp when the position will be unlocked
     */
    function calculateUnlockTime(
        uint256 stakedAt,
        uint256 lockPeriod
    ) public pure returns (uint256) {
        return stakedAt + lockPeriod;
    }

    /**
     * @dev Validates that an address is not zero
     * @param addr Address to validate
     * @custom:throws ZeroAddress if address is zero
     */
    function validateAddress(address addr) public pure {
        if (addr == address(0)) {
            revert ZeroAddress();
        }
    }

    /**
     * @dev Calculates new total after adding or subtracting an amount
     * @param currentTotal Current total amount
     * @param amount Amount to add or subtract
     * @param isAdd True if adding, false if subtracting
     * @return New total amount after operation
     */
    function calculateNewTotal(
        uint256 currentTotal,
        uint256 amount,
        bool isAdd
    ) public pure returns (uint256) {
        if (isAdd) {
            return currentTotal + amount;
        } else {
            return currentTotal - amount; 
        }
    }

    /**
     * @dev Checks if a position needs reward update and updates last reward time
     * @param position Staking position to check
     * @param currentTime Current timestamp
     * @return updated Updated position if needed
     * @return shouldUpdate True if position needs update
     */
    function checkAndUpdatePosition(
        IStaking.Position memory position,
        uint256 currentTime
    ) public pure returns (IStaking.Position memory updated, bool shouldUpdate) {
        if (position.isUnstaked) {
            return (position, false);
        }

        shouldUpdate = currentTime > position.lastRewardAt;
        if (shouldUpdate) {
            updated = position;
            updated.lastRewardAt = currentTime;
        }

        return (updated, shouldUpdate);
    }

    /**
     * @dev Gets the reward rate for a specific lock period
     * @param lockPeriod Lock period to check
     * @param options Array of available lock options
     * @param historicalRates Mapping of historical lock periods to their rates
     * @return rate Reward rate for the specified period
     * @custom:throws InvalidPeriod if period is not found in options
     */
    function validateAndGetRate(
        uint256 lockPeriod,
        IStaking.LockOption[] memory options,
        mapping(uint256 => uint256) storage historicalRates
    ) public view returns (uint256 rate) {
        // First check current options
        for (uint256 i = 0; i < options.length; i++) {
            if (options[i].period == lockPeriod) {
                return options[i].rewardRate;
            }
        }
        
        // If not found in current options, check historical rates
        rate = historicalRates[lockPeriod];
        if (rate > 0) {
            return rate;
        }
        
        revert InvalidPeriod();
    }

    /**
     * @dev Calculates rewards for multiple staking positions
     * @param positions Array of staking positions
     * @param currentTime Current timestamp
     * @param options Available lock options
     * @param historicalRates Mapping of historical lock periods to their rates
     * @return rewards Array of calculated rewards for each position
     */
    function calculateBatchRewards(
        IStaking.Position[] memory positions,
        uint256 currentTime,
        IStaking.LockOption[] memory options,
        mapping(uint256 => uint256) storage historicalRates
    ) public view returns (uint256[] memory rewards) {
        rewards = new uint256[](positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (!positions[i].isUnstaked) {
                uint256 timeElapsed = currentTime - positions[i].lastRewardAt;
                uint256 rate = validateAndGetRate(
                    positions[i].lockPeriod, 
                    options,
                    historicalRates
                );
                rewards[i] = calculateReward(
                    positions[i].amount, 
                    timeElapsed, 
                    rate,
                    positions[i].lockPeriod
                );
            }
        }
        
        return rewards;
    }
}