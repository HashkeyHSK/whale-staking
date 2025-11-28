// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "./StakingStorage.sol";
import "../constants/StakingConstants.sol";
import "../interfaces/IStake.sol";

/**
 * @title HSKStaking
 * @dev Main staking contract for HSK token
 * Implements staking functionality with fixed 365-day lock period
 * Reward rate is configurable at deployment (e.g., 800 for 8% APY, 1600 for 16% APY)
 * Features include:
 * - Upgradeable proxy pattern (Transparent Proxy)
 * - Whitelist system for access control
 * - Emergency withdrawal mechanism
 * - Automatic reward calculation and distribution
 * - Pause functionality
 */
contract HSKStaking is 
    IStaking, 
    StakingStorage,
    StakingConstants,
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    event Received(address indexed sender, uint256 amount);
    event WhitelistStatusChanged(address indexed user, bool status);
    event StakeStartTimeUpdated(uint256 oldStartTime, uint256 newStartTime);
    event StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime);
    event MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxTotalStakedUpdated(uint256 oldAmount, uint256 newAmount);
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
     * Sets up initial staking parameters with configurable whitelist mode
     * @param _minStakeAmount Minimum stake amount (in wei)
     * @param _rewardRate Annual reward rate in basis points (800 for 8%, 1600 for 16%)
     * @param _stakeStartTime Timestamp when staking begins
     * @param _stakeEndTime Timestamp when staking ends
     * @param _whitelistMode Enable whitelist mode (false for Normal Staking, true for Premium Staking)
     * @param _maxTotalStaked Maximum total staked amount (in wei, 0 means no limit)
     */
    function initialize(
        uint256 _minStakeAmount,
        uint256 _rewardRate,
        uint256 _stakeStartTime,
        uint256 _stakeEndTime,
        bool _whitelistMode,
        uint256 _maxTotalStaked
    ) external initializer {
        require(_stakeStartTime > 0, "Invalid start time");
        require(_stakeEndTime > _stakeStartTime, "End time must be after start time");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __StakingStorage_init(msg.sender, _minStakeAmount, _rewardRate, _whitelistMode, _maxTotalStaked);
        
        stakeStartTime = _stakeStartTime;
        stakeEndTime = _stakeEndTime;
    }

    // ==================== EXTERNAL USER FUNCTIONS ====================

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
        require(amount >= minStakeAmount, "Amount below minimum");

        if (maxTotalStaked > 0) {
            require(totalStaked + amount <= maxTotalStaked, "Max total staked exceeded");
        }

        uint256 potentialReward = _calculateReward(
            amount,
            LOCK_PERIOD,
            rewardRate
        );

        totalPendingRewards += potentialReward;

        uint256 positionId = nextPositionId++;
        
        positions[positionId] = Position({
            positionId: positionId,
            owner: msg.sender,
            amount: amount,
            stakedAt: block.timestamp,
            lastRewardAt: block.timestamp,
            isUnstaked: false,
            isCompletedStake: false
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
    ) external override nonReentrant whenNotPaused whenNotEmergency validPosition(positionId) {
        Position storage position = positions[positionId];
        
        if (position.isUnstaked) revert AlreadyUnstaked();
        if (block.timestamp < position.stakedAt + LOCK_PERIOD) revert StillLocked();

        uint256 reward = _updateReward(positionId);
        uint256 amount = position.amount;
        uint256 totalPayout = amount + reward;

        position.isUnstaked = true;
        position.isCompletedStake = true;  // Mark as completed full staking period
        totalStaked -= amount;

        emit RewardClaimed(msg.sender, positionId, reward, block.timestamp);
        emit PositionUnstaked(msg.sender, positionId, amount, block.timestamp);

        (bool success, ) = msg.sender.call{value: totalPayout}("");
        require(success, "Transfer failed");
    }

    function claimReward(
        uint256 positionId
    ) external override nonReentrant whenNotPaused whenNotEmergency validPosition(positionId) returns (uint256) {
        Position storage position = positions[positionId];
        
        uint256 reward = _updateReward(positionId);
        
        if (reward == 0) revert NoReward();

        // Record total claimed rewards
        claimedRewards[positionId] += reward;

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
        return _calculatePendingReward(position);
    }

    function getUserPositionIds(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function calculatePotentialReward(uint256 amount) external view returns (uint256) {
        return _calculateReward(amount, LOCK_PERIOD, rewardRate);
    }

    /**
     * @dev Request early unstake for a position
     * User can request early unstake during lock period, but must wait 7 days before completing
     * @param positionId The position ID to request early unstake for
     */
    function requestEarlyUnstake(uint256 positionId) external override nonReentrant whenNotPaused validPosition(positionId) {
        Position storage position = positions[positionId];
        
        if (position.isUnstaked) revert AlreadyUnstaked();
        // Must be within lock period to request early exit
        require(block.timestamp < position.stakedAt + LOCK_PERIOD, "Lock period already ended");
        // Cannot request twice
        require(earlyUnstakeRequestTime[positionId] == 0, "Early unstake already requested");

        earlyUnstakeRequestTime[positionId] = block.timestamp;
        
        emit EarlyUnstakeRequested(msg.sender, positionId, block.timestamp);
    }

    /**
     * @dev Complete early unstake after 7-day waiting period
     * User loses 50% of rewards, which goes to penalty pool
     * If user has claimed more than 50% of rewards, excess is deducted from principal
     * @param positionId The position ID to complete early unstake for
     */
    function completeEarlyUnstake(uint256 positionId) external override nonReentrant whenNotPaused validPosition(positionId) {
        Position storage position = positions[positionId];
        
        if (position.isUnstaked) revert AlreadyUnstaked();
        
        uint256 requestTime = earlyUnstakeRequestTime[positionId];
        require(requestTime > 0, "Early unstake not requested");
        require(block.timestamp >= requestTime + EARLY_UNLOCK_PERIOD, "Waiting period not completed");
        
        // Calculate total reward (based on actual staking time)
        // Important: Reward is calculated up to the early unstake request time (requestTime), not the completion time
        // From the moment of requesting early unstake, no new rewards are generated
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        uint256 endTime = requestTime;
        
        // Calculate total reward from stakedAt to endTime (includes both claimed and unclaimed rewards)
        // This is the complete reward earned during the staking period up to the request time
        uint256 totalTimeElapsed = endTime > position.stakedAt ? endTime - position.stakedAt : 0;
        uint256 totalReward = _calculateReward(position.amount, totalTimeElapsed, rewardRate);
        
        // Calculate allowed reward (after deducting penalty rate)
        uint256 allowedReward = (totalReward * EARLY_UNSTAKE_PENALTY_RATE) / BASIS_POINTS;
        
        // Calculate claimed rewards
        uint256 claimed = claimedRewards[positionId];
        
        // Calculate amount to deduct from principal (if claimed exceeds allowed)
        uint256 excessClaimed = claimed > allowedReward ? claimed - allowedReward : 0;
        
        // Calculate penalty amount (goes to penalty pool)
        uint256 penalty = totalReward - allowedReward;
        
        // Calculate actual return amount
        uint256 principalReturn = position.amount;
        if (excessClaimed > 0) {
            require(principalReturn >= excessClaimed, "Insufficient principal to deduct");
            principalReturn -= excessClaimed;
        }
        
        // Calculate reward return (allowed reward - claimed reward)
        uint256 rewardReturn = allowedReward > claimed ? allowedReward - claimed : 0;
        
        // Update reward pool and pending rewards
        if (rewardReturn > 0) {
            require(rewardPoolBalance >= rewardReturn, "Insufficient reward pool");
            rewardPoolBalance -= rewardReturn;
        }
        
        // Update totalPendingRewards
        // Calculate reward that should be reserved from stake to early unstake request time
        // Reward is only calculated up to request time (requestTime), so need to subtract reward from requestTime to lock period end
        uint256 remainingTime = lockEndTime > requestTime ? lockEndTime - requestTime : 0;
        uint256 remainingReward = _calculateReward(position.amount, remainingTime, rewardRate);
        
        // Subtract remaining unexpired rewards from totalPendingRewards (this part no longer needs to be reserved)
        // Note: Claimed rewards have already been subtracted from totalPendingRewards in claimReward
        if (totalPendingRewards >= remainingReward) {
            totalPendingRewards -= remainingReward;
        } else {
            // If totalPendingRewards is insufficient, there may be other issues, but set to 0 for safety
            totalPendingRewards = 0;
        }
        
        // Penalized rewards go to penalty pool (penalty rate defined by EARLY_UNSTAKE_PENALTY_RATE)
        // Calculate unclaimed rewards
        uint256 unclaimedReward = totalReward - claimed;
        
        // Penalty should be the penalized portion of total reward (totalReward - allowedReward), but can only be deducted from unclaimed rewards
        // If unclaimed reward >= allowed reward, penalty = allowedReward
        // If unclaimed reward < allowed reward, penalty = unclaimedReward (user has claimed more than 50%, excess already deducted from principal)
        uint256 penaltyToPool = unclaimedReward < allowedReward ? unclaimedReward : allowedReward;
        
        // Transfer penalty from unclaimed rewards to penalty pool
        // This needs to be deducted from rewardPoolBalance (because it was originally reserved reward for the user)
        if (penaltyToPool > 0) {
            // Transfer penalty amount to penalty pool (take smaller value to prevent insufficient balance)
            uint256 actualPenalty = penaltyToPool < rewardPoolBalance ? penaltyToPool : rewardPoolBalance;
            rewardPoolBalance -= actualPenalty;
            penaltyPoolBalance += actualPenalty;
        }
        
        // Mark position as unstaked
        // Note: Early unstake does NOT mark as completed stake (isCompletedStake remains false)
        position.isUnstaked = true;
        totalStaked -= position.amount;
        
        // Total return amount = principal + reward return
        // Note: Early unstake positions do not receive penalty pool distribution
        uint256 totalReturn = principalReturn + rewardReturn;
        
        emit EarlyUnstakeCompleted(
            msg.sender,
            positionId,
            principalReturn,
            rewardReturn,
            penalty,
            block.timestamp
        );
        emit PositionUnstaked(msg.sender, positionId, position.amount, block.timestamp);
        
        (bool success, ) = msg.sender.call{value: totalReturn}("");
        require(success, "Transfer failed");
    }


    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        require(emergencyMode, "Not in emergency mode");
        
        Position storage position = positions[positionId];
        require(position.owner == msg.sender, "Not position owner");
        require(!position.isUnstaked, "Position already unstaked");

        uint256 amount = position.amount;
        
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        uint256 timeElapsed = lockEndTime > position.lastRewardAt 
            ? lockEndTime - position.lastRewardAt 
            : 0;

        uint256 reservedReward = _calculateReward(
            position.amount,
            timeElapsed,
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

    // ==================== EXTERNAL SETTER FUNCTIONS ====================

    function setMinStakeAmount(uint256 newAmount) external onlyOwner whenNotEmergency {
        uint256 oldAmount = minStakeAmount;
        minStakeAmount = newAmount;
        emit MinStakeAmountUpdated(oldAmount, newAmount);
    }

    function setMaxTotalStaked(uint256 newAmount) external onlyOwner {
        uint256 oldAmount = maxTotalStaked;
        maxTotalStaked = newAmount;
        emit MaxTotalStakedUpdated(oldAmount, newAmount);
    }

    function setStakeStartTime(uint256 newStartTime) external onlyOwner {
        require(newStartTime > 0, "Invalid start time");
        require(newStartTime < stakeEndTime, "Start time must be before end time");
        
        uint256 oldStartTime = stakeStartTime;
        stakeStartTime = newStartTime;
        emit StakeStartTimeUpdated(oldStartTime, newStartTime);
    }

    function setStakeEndTime(uint256 newEndTime) external onlyOwner {
        require(newEndTime > block.timestamp, "End time must be in future");
        require(newEndTime > stakeStartTime, "End time must be after start time");
        
        uint256 oldEndTime = stakeEndTime;
        stakeEndTime = newEndTime;
        emit StakeEndTimeUpdated(oldEndTime, newEndTime);
    }

    function setWhitelistOnlyMode(bool enabled) external onlyOwner {
        bool oldMode = onlyWhitelistCanStake;
        onlyWhitelistCanStake = enabled;
        emit WhitelistModeChanged(oldMode, enabled);
    }

    // ==================== EXTERNAL ADMIN FUNCTIONS ====================

    function pause() external onlyOwner {
        _pause();
        emit StakingPaused(msg.sender, block.timestamp);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit StakingUnpaused(msg.sender, block.timestamp);
    }

    function enableEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeEnabled(msg.sender, block.timestamp);
    }

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

    function updateRewardPool() external payable onlyOwner {
        rewardPoolBalance += msg.value;
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    function withdrawExcessRewardPool(uint256 amount) external onlyOwner {
        require(rewardPoolBalance >= totalPendingRewards, "Insufficient reward pool");
        uint256 excess = rewardPoolBalance - totalPendingRewards;
        require(amount <= excess, "Cannot withdraw required rewards");
        
        rewardPoolBalance -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    // ==================== INTERNAL FUNCTIONS ====================

    function _calculateTimeElapsed(Position memory position) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        uint256 endTime = block.timestamp < lockEndTime ? block.timestamp : lockEndTime;
        
        return endTime > position.lastRewardAt ? endTime - position.lastRewardAt : 0;
    }

    function _calculateReward(
        uint256 amount,
        uint256 timeElapsed,
        uint256 _rewardRate
    ) internal pure returns (uint256 reward) {
        if (amount == 0 || timeElapsed == 0 || _rewardRate == 0) {
            return 0;
        }
        
        // Direct calculation since timeElapsed <= 365 days (always < 1 year)
        uint256 annualRate = (_rewardRate * PRECISION) / BASIS_POINTS;
        uint256 timeRatio = (timeElapsed * PRECISION) / SECONDS_PER_YEAR;
        uint256 totalReward = (amount * annualRate * timeRatio) / (PRECISION * PRECISION);
        
        return totalReward;
    }

    function _updateReward(
        uint256 positionId
    ) internal returns (uint256 reward) {
        if (emergencyMode) return 0;

        Position storage position = positions[positionId];
        if (position.isUnstaked) return 0;

        uint256 timeElapsed = _calculateTimeElapsed(position);

        reward = _calculateReward(
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

        // Update lastRewardAt
        uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
        uint256 currentTime = block.timestamp;
        position.lastRewardAt = currentTime > lockEndTime ? lockEndTime : currentTime;
    }

    function _calculatePendingReward(
        Position memory position
    ) internal view returns (uint256) {
        if (position.isUnstaked) return 0;
        
        uint256 timeElapsed = _calculateTimeElapsed(position);

        return _calculateReward(
            position.amount,
            timeElapsed,
            rewardRate
        );
    }

    receive() external payable {
        rewardPoolBalance += msg.value;
        emit Received(msg.sender, msg.value);
        emit RewardPoolUpdated(rewardPoolBalance);
    }
}
