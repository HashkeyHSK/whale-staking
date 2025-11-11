// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IStaking {
    /**
     * @dev Position structure for staking
     * Note: lockPeriod is always 365 days (constant LOCK_PERIOD)
     */
    struct Position {
        uint256 positionId;      // Position ID
        address owner;           // Position owner
        uint256 amount;          // Staked amount
        uint256 stakedAt;        // Timestamp when staked
        uint256 lastRewardAt;    // Last reward claim timestamp
        bool isUnstaked;         // Whether position is unstaked
    }

    /**
     * @dev Stake native token to create a new staking position with fixed 365-day lock period
     * @return positionId ID of the newly created staking position
     */
    function stake() external payable returns (uint256 positionId);

    /**
     * @dev Unstake from a specific position
     * @param positionId Position ID to unstake from
     */
    function unstake(uint256 positionId) external;

    /**
     * @dev Claim rewards from a specific position
     * @param positionId Position ID to claim rewards from
     * @return reward Amount of rewards claimed
     */
    function claimReward(uint256 positionId) external returns (uint256 reward);

    /**
     * @dev Get pending rewards for a specific position
     * @param positionId Position ID to check rewards for
     * @return reward Amount of pending rewards
     */
    function pendingReward(uint256 positionId) external view returns (uint256 reward);

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