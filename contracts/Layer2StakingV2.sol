// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "./StakingStorage.sol";
import "./libraries/StakingLib.sol";
import "./interfaces/IStake.sol";

/**
 * @title Layer2StakingV2
 * @dev Main staking contract for Layer2 network - Version 2
 * Implements staking functionality with fixed 365-day lock period
 * Reward rate is configurable at deployment (e.g., 800 for 8% APY, 1600 for 16% APY)
 * Features include:
 * - Upgradeable proxy pattern (Transparent Proxy)
 * - Whitelist system for access control
 * - Emergency withdrawal mechanism
 * - Automatic reward calculation and distribution
 * - Pause functionality
 */
contract Layer2StakingV2 is 
    IStaking, 
    StakingStorage, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    event Received(address indexed sender, uint256 amount);
    event WhitelistStatusChanged(address indexed user, bool status);
    event StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime);
    event EmergencyModeEnabled(address indexed operator, uint256 timestamp);
    event WhitelistModeChanged(bool oldMode, bool newMode);

    error AlreadyUnstaked();
    error StillLocked();
    error NoReward();
    error PositionNotFound();
    error NotWhitelisted();

    modifier validPosition(uint256 positionId) {
        if (positions[positionId].owner != msg.sender) revert PositionNotFound();
        _;
    }

    modifier whitelistCheck() {
        if (onlyWhitelistCanStake && !whitelisted[msg.sender]) {
            revert NotWhitelisted();
        }
        _;
    }

    modifier whenNotEmergency() {
        require(!emergencyMode, "Contract is in emergency mode");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with custom settings
     * Sets up initial staking parameters and enables whitelist-only mode
     * @param _minStakeAmount Minimum stake amount (in wei)
     * @param _rewardRate Annual reward rate in basis points (800 for 8%, 1600 for 16%)
     * @param _stakeStartTime Timestamp when staking begins
     * @param _stakeEndTime Timestamp when staking ends
     */
    function initialize(
        uint256 _minStakeAmount,
        uint256 _rewardRate,
        uint256 _stakeStartTime,
        uint256 _stakeEndTime
    ) external initializer {
        require(_stakeStartTime > 0, "Invalid start time");
        require(_stakeEndTime > _stakeStartTime, "End time must be after start time");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __StakingStorage_init(msg.sender, _minStakeAmount, _rewardRate);
        
        stakeStartTime = _stakeStartTime;
        stakeEndTime = _stakeEndTime;
    }

    /**
     * @dev Calculates time elapsed for reward calculation, capped at lock period
     * @param position The staking position
     * @return timeElapsed Time elapsed since last reward, capped at lock end
     */
    function _calculateTimeElapsed(Position memory position) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        uint256 endTime = block.timestamp < lockEndTime ? block.timestamp : lockEndTime;
        return endTime - position.lastRewardAt;
    }

    /**
     * @dev Creates a new staking position with fixed 365-day lock period
     * @return uint256 ID of the newly created position
     */
    function stake() external 
        payable 
        nonReentrant 
        whenNotPaused 
        whitelistCheck
        whenNotEmergency
        returns (uint256) 
    {
        require(block.timestamp >= stakeStartTime, "Staking has not started yet");
        require(block.timestamp < stakeEndTime, "Staking period has ended");

        uint256 amount = msg.value;
        amount = StakingLib.validateAndFormatAmount(amount, minStakeAmount);

        uint256 potentialReward = StakingLib.calculateReward(
            amount,
            LOCK_PERIOD,
            rewardRate
        );

        require(
            rewardPoolBalance >= totalPendingRewards + potentialReward,
            "Insufficient reward pool"
        );

        totalPendingRewards += potentialReward;

        uint256 positionId = nextPositionId++;
        
        positions[positionId] = Position({
            positionId: positionId,
            owner: msg.sender,
            amount: amount,
            stakedAt: block.timestamp,
            lastRewardAt: block.timestamp,
            isUnstaked: false
        });
        
        userPositions[msg.sender].push(positionId);
        totalStaked += amount;

        emit PositionCreated(
            msg.sender,
            positionId,
            amount,
            LOCK_PERIOD,
            block.timestamp
        );

        return positionId;
    }

    function unstake(
        uint256 positionId
    ) external override nonReentrant validPosition(positionId) {
        Position storage position = positions[positionId];
        
        if (position.isUnstaked) revert AlreadyUnstaked();
        if (block.timestamp < position.stakedAt + LOCK_PERIOD) revert StillLocked();

        uint256 reward = _updateReward(positionId);
        uint256 amount = position.amount;
        uint256 totalPayout = amount + reward;

        position.isUnstaked = true;
        totalStaked -= amount;

        emit RewardClaimed(msg.sender, positionId, reward, block.timestamp);
        emit PositionUnstaked(msg.sender, positionId, amount, block.timestamp);

        (bool success, ) = msg.sender.call{value: totalPayout}("");
        require(success, "Transfer failed");
    }

    function claimReward(
        uint256 positionId
    ) external override nonReentrant whenNotPaused whenNotEmergency validPosition(positionId) returns (uint256) {
        uint256 reward = _updateReward(positionId);
        
        if (reward == 0) revert NoReward();

        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");
        emit RewardClaimed(msg.sender, positionId, reward, block.timestamp);

        return reward;
    }

    function pendingReward(
        uint256 positionId
    ) external view override returns (uint256) {
        if (emergencyMode) return 0;
        
        Position memory position = positions[positionId];
        if (position.owner != msg.sender) return 0;
        
        return _calculatePendingReward(position);
    }

    function enableEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeEnabled(msg.sender, block.timestamp);
    }

    function pause() external override onlyOwner {
        _pause();
        emit StakingPaused(msg.sender, block.timestamp);
    }


    function unpause() external override onlyOwner {
        _unpause();
        emit StakingUnpaused(msg.sender, block.timestamp);
    }


    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        require(emergencyMode, "Not in emergency mode");
        
        Position storage position = positions[positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(!position.isUnstaked, "Position already unstaked");

        uint256 amount = position.amount;
        
        uint256 reservedReward = StakingLib.calculateReward(
            position.amount,
            LOCK_PERIOD,
            rewardRate
        );
        require(totalPendingRewards >= reservedReward, "Pending rewards accounting error");
        totalPendingRewards -= reservedReward;
        
        position.isUnstaked = true;
        totalStaked -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Emergency withdraw failed");
        
        emit EmergencyWithdrawn(msg.sender, positionId, amount, block.timestamp);
    }

    function _updateReward(
        uint256 positionId
    ) internal returns (uint256 reward) {
        if (emergencyMode) return 0;

        Position storage position = positions[positionId];
        if (position.isUnstaked) return 0;

        uint256 timeElapsed = _calculateTimeElapsed(position);
        if (timeElapsed == 0) return 0;

        reward = StakingLib.calculateReward(
            position.amount, 
            timeElapsed, 
            rewardRate
        );
        
        if (reward > 0) {
            require(rewardPoolBalance >= reward, "Insufficient reward pool");
            rewardPoolBalance -= reward;
            totalPendingRewards -= reward;
            emit RewardPoolUpdated(rewardPoolBalance);
        }

        uint256 currentTime = block.timestamp;
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        position.lastRewardAt = currentTime > lockEndTime ? lockEndTime : currentTime;
    }


    function setStakeEndTime(uint256 newEndTime) external onlyOwner {
        require(newEndTime > block.timestamp, "End time must be in future");
        require(newEndTime > stakeStartTime, "End time must be after start time");
        
        uint256 oldEndTime = stakeEndTime;
        stakeEndTime = newEndTime;
        emit StakeEndTimeUpdated(oldEndTime, newEndTime);
    }


    /**
     * @dev Updates whitelist status for multiple users
     * @param users Array of user addresses
     * @param status True to add to whitelist, false to remove
     */
    function updateWhitelistBatch(address[] calldata users, bool status) 
        external 
        onlyOwner 
    {
        uint256 length = users.length;
        require(length <= 100, "Batch too large");
        
        for (uint256 i = 0; i < length;) {
            if (whitelisted[users[i]] != status) {
                whitelisted[users[i]] = status;
                emit WhitelistStatusChanged(users[i], status);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @dev Toggles whitelist-only mode
     * @param enabled True to enable whitelist-only mode, false to disable
     */
    function setWhitelistOnlyMode(bool enabled) external onlyOwner {
        bool oldMode = onlyWhitelistCanStake;
        onlyWhitelistCanStake = enabled;
        emit WhitelistModeChanged(oldMode, enabled);
    }

    function updateRewardPool() external payable onlyOwner {
        rewardPoolBalance += msg.value;
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    function _calculatePendingReward(
        Position memory position
    ) internal view returns (uint256) {
        if (position.isUnstaked) return 0;
        
        uint256 timeElapsed = _calculateTimeElapsed(position);
        if (timeElapsed == 0) return 0;

        return StakingLib.calculateReward(
            position.amount,
            timeElapsed,
            rewardRate
        );
    }

    /**
     * @dev Withdraws excess reward pool balance that is not reserved for pending rewards
     * @param amount Amount to withdraw
     */
    function withdrawExcessRewardPool(uint256 amount) external onlyOwner {
        require(rewardPoolBalance >= totalPendingRewards, "Insufficient reward pool");
        uint256 excess = rewardPoolBalance - totalPendingRewards;
        require(amount <= excess, "Cannot withdraw required rewards");
        
        rewardPoolBalance -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    /**
     * @dev Receives ETH and automatically adds it to the reward pool
     * This allows anyone to contribute to the reward pool
     */
    receive() external payable {
        rewardPoolBalance += msg.value;
        emit Received(msg.sender, msg.value);
        emit RewardPoolUpdated(rewardPoolBalance);
    }
} 