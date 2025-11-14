// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IStaking {
    struct Position {
        uint256 positionId;      // Position ID
        address owner;           // Position owner
        uint256 amount;          // Staked amount
        uint256 stakedAt;        // Timestamp when staked
        uint256 lastRewardAt;    // Last reward claim timestamp
        bool isUnstaked;         // Whether position is unstaked
    }

    function stake() external payable returns (uint256 positionId);

    function unstake(uint256 positionId) external;

    function claimReward(uint256 positionId) external returns (uint256 reward);

    function pendingReward(uint256 positionId) external view returns (uint256 reward);

    function getUserPositionIds(address user) external view returns (uint256[] memory);

    function calculatePotentialReward(uint256 amount) external view returns (uint256);

    event PositionCreated(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 lockPeriod,
        uint256 timestamp
    );

    event PositionUnstaked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 timestamp
    );

    event RewardClaimed(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 timestamp
    );

    event StakingPaused(address indexed operator, uint256 timestamp);

    event StakingUnpaused(address indexed operator, uint256 timestamp);

    event EmergencyWithdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 timestamp
    );
}