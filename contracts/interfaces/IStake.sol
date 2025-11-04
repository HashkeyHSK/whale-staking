// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IStaking {
    /**
     * @dev Position structure for staking
     */
    struct Position {
        uint256 positionId;      // Position ID
        uint256 amount;          // Staked amount
        uint256 lockPeriod;      // Lock period in seconds
        uint256 stakedAt;        // Timestamp when staked
        uint256 lastRewardAt;    // Last reward claim timestamp
        uint256 rewardRate;      // Reward rate in basis points
        bool isUnstaked;         // Whether position is unstaked
    }

    /**
     * @dev Lock option structure
     */
    struct LockOption {
        uint256 period;          // Lock period
        uint256 rewardRate;      // Annual reward rate in basis points
    }

    /**
     * @dev Stake native token to create a new staking position
     * @param lockPeriod Lock period in seconds
     * @return positionId ID of the newly created staking position
     */
    function stake(uint256 lockPeriod) external payable returns (uint256 positionId);

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

    /**
     * @dev Get all staking positions for a user
     * @param user User address to check positions for
     * @return Array of staking positions
     */
    function getUserPositions(address user) external view returns (Position[] memory);

    /**
     * @dev Get the number of staking positions for a user
     * @param user User address to check
     * @return count Number of staking positions
     */
    function getUserPositionCount(address user) external view returns (uint256 count);

    function getLockOptions() external view returns (LockOption[] memory);

    function getRewardRate(uint256 lockPeriod) external view returns (uint256 rate);

    function getTotalStaked() external view returns (uint256 amount);

    function version() external pure returns (string memory);

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

    event LockOptionAdded(
        uint256 period,
        uint256 rewardRate,
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

    event MaxTotalStakeUpdated(uint256 oldLimit, uint256 newLimit);

    event ContractUpgraded(
        string indexed version,
        address indexed implementation,
        uint256 timestamp
    );
}