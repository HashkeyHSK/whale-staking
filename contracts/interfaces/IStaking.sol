// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IStaking {
    struct Position {
        uint256 amount;
        uint256 stakedAt;
        uint256 lockPeriod;
        uint256 lastRewardAt;
        bool isUnstaked;
    }

    struct LockOption {
        uint256 period;
        uint256 rewardRate;
    }
} 