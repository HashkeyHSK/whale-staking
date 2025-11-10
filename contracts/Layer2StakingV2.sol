// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./StakingStorage.sol";
import "./libraries/StakingLib.sol";
import "./interfaces/IStake.sol";

/**
 * @title Layer2StakingV2
 * @dev Main staking contract for Layer2 network - Version 2
 * Implements staking functionality with fixed 365-day lock period
 * Supports two product tiers: Normal (8% APY) and Premium (16% APY)
 * Features include:
 * - Upgradeable proxy pattern (UUPS)
 * - Whitelist system for Premium tier
 * - Emergency withdrawal mechanism
 * - Automatic reward calculation and distribution
 * - Pause functionality
 */
contract Layer2StakingV2 is 
    IStaking, 
    StakingStorage, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    // Events for tracking contract state changes
    event Received(address indexed sender, uint256 amount);
    event WhitelistStatusChanged(address indexed user, bool status);
    event StakeStartTimeUpdated(uint256 oldStartTime, uint256 newStartTime);
    event StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime);
    event MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event EmergencyModeEnabled(address indexed admin, uint256 timestamp);
    event AdminTransferCancelled(address indexed canceledAdmin);
    event WhitelistModeChanged(bool oldMode, bool newMode);

    // Custom errors for better gas efficiency and clearer error messages
    error OnlyAdmin();
    error InvalidAmount();
    error AlreadyUnstaked();
    error StillLocked();
    error NoReward();
    error PositionNotFound();
    error NotWhitelisted();
    error MaxTotalStakeExceeded();

    // Access control modifiers
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier validPosition(uint256 positionId) {
        if (positionOwner[positionId] != msg.sender) revert PositionNotFound();
        _;
    }

    // Add whitelist validation modifier
    modifier whitelistCheck() {
        if (onlyWhitelistCanStake && !whitelisted[msg.sender]) {
            revert NotWhitelisted();
        }
        _;
    }

    // Add emergency mode check modifier
    modifier whenNotEmergency() {
        require(!emergencyMode, "Contract is in emergency mode");
        _;
    }

    // Historical total staked amount tracking
    uint256 public historicalTotalStaked;

    // Constants
    uint256 private constant UPGRADE_COOLDOWN = 1 days; // Cooldown period between upgrades
    uint256 public lastUpgradeTime;
    string public constant VERSION = "2.0.0";

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with custom settings
     * Sets up initial staking parameters and enables whitelist-only mode
     * @param _minStakeAmount Minimum stake amount (in wei)
     * @param _rewardRate Annual reward rate in basis points (800 for 8%, 1600 for 16%)
     */
    function initialize(uint256 _minStakeAmount, uint256 _rewardRate) external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __StakingStorage_init(msg.sender, _rewardRate);
        
        // Set custom minimum stake amount if provided, otherwise use default from StakingStorage
        if (_minStakeAmount > 0) {
            minStakeAmount = _minStakeAmount;
        }
        // Note: stakeEndTime and onlyWhitelistCanStake are already set in __StakingStorage_init
    }

    // ========== INTERNAL HELPER FUNCTIONS ==========

    /**
     * @dev Finds the position index for a given position ID
     * Uses positionIndexMap for O(1) lookup efficiency
     * @param user User address
     * @param positionId Position ID to find
     * @return posIndex Index of the position in the user's positions array
     */
    function _findPosition(address user, uint256 positionId) 
        internal 
        view 
        returns (uint256 posIndex) 
    {
        // Use the index map for efficient O(1) lookup
        posIndex = positionIndexMap[positionId];
        
        // Verify the position belongs to the user and is valid
        Position[] storage positions = userPositions[user];
        if (posIndex >= positions.length || positions[posIndex].positionId != positionId) {
        revert PositionNotFound();
        }
        
        return posIndex;
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

    // ========== PUBLIC STAKING FUNCTIONS ==========

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
        
        if (totalStaked + amount > maxTotalStake) revert MaxTotalStakeExceeded();

        // Calculate potential reward for this new stake using fixed parameters
        uint256 potentialReward = StakingLib.calculateReward(
            amount,
            LOCK_PERIOD,
            rewardRate,
            LOCK_PERIOD
        );

        // Check if reward pool can cover this new stake
        require(
            rewardPoolBalance >= totalPendingRewards + potentialReward,
            "Insufficient reward pool"
        );

        // Update total pending rewards
        totalPendingRewards += potentialReward;

        uint256 positionId = nextPositionId++;
        Position memory newPosition = Position({
            positionId: positionId,
            amount: amount,
            stakedAt: block.timestamp,
            lastRewardAt: block.timestamp,
            rewardRate: rewardRate,
            isUnstaked: false
        });

        // Get the index where this position will be stored
        uint256 positionIndex = userPositions[msg.sender].length;
        userPositions[msg.sender].push(newPosition);
        
        // Update the position index map for efficient lookup
        positionIndexMap[positionId] = positionIndex;
        positionOwner[positionId] = msg.sender;
        userTotalStaked[msg.sender] += amount;
        totalStaked += amount;

        historicalTotalStaked += amount;

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
        uint256 posIndex = _findPosition(msg.sender, positionId);
        Position storage position = userPositions[msg.sender][posIndex];
        
        if (position.isUnstaked) revert AlreadyUnstaked();
        require(
            block.timestamp >= position.stakedAt + LOCK_PERIOD,
            "Still locked"
        );

        uint256 reward = _updateReward(msg.sender, posIndex);
        uint256 amount = position.amount;
        uint256 totalPayout = amount + reward;

        position.isUnstaked = true;
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;

        emit RewardClaimed(msg.sender, positionId, reward, block.timestamp);
        emit PositionUnstaked(msg.sender, positionId, amount, block.timestamp);

        (bool success, ) = msg.sender.call{value: totalPayout}("");
        require(success, "Transfer failed");
    }

    function claimReward(
        uint256 positionId
    ) external override nonReentrant whenNotPaused whenNotEmergency validPosition(positionId) returns (uint256) {
        uint256 posIndex = _findPosition(msg.sender, positionId);
        uint256 reward = _updateReward(msg.sender, posIndex);
        
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
        
        // Verify position ownership
        if (positionOwner[positionId] != msg.sender) return 0;
        
        Position[] memory positions = userPositions[msg.sender];
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId) {
                return _calculatePendingReward(positions[i]);
            }
        }
        
        return 0;
    }

    // ========== VIEW FUNCTIONS ==========

    function getUserPositions(
        address user
    ) external view override returns (Position[] memory) {
        return userPositions[user];
    }

    function getUserPositionCount(
        address user
    ) external view override returns (uint256) {
        return userPositions[user].length;
    }

    function getRewardRate() external view returns (uint256) {
        return rewardRate;
    }

    function getLockPeriod() external pure returns (uint256) {
        return LOCK_PERIOD;
    }
    
    function getTotalStaked() external view override returns (uint256) {
        return totalStaked;
    }

    function getHistoricalTotalStaked() external view returns (uint256) {
        return historicalTotalStaked;
    }

    function remainingStakeCapacity() external view returns (uint256) {
        return totalStaked >= maxTotalStake ? 0 : maxTotalStake - totalStaked;
    }

    function getStakingProgress() external view returns (
        uint256 total,
        uint256 current,
        uint256 remaining,
        uint256 progressPercentage
    ) {
        total = maxTotalStake;
        current = totalStaked;
        remaining = totalStaked >= maxTotalStake ? 0 : maxTotalStake - totalStaked;
        
        // Add safe math to prevent overflow
        if (total == 0) {
            progressPercentage = 0;
        } else {
            progressPercentage = (current * 10000) / total;
        }
        
        return (total, current, remaining, progressPercentage);
    }

    /**
     * @dev Returns the timestamp when a position was staked
     * @param positionId The ID of the staking position
     * @return The timestamp when the position was staked
     */
    function getStakeTime(uint256 positionId) external view returns (uint256) {
        // Verify position ownership
        if (positionOwner[positionId] != msg.sender) revert PositionNotFound();
        
        Position[] memory positions = userPositions[msg.sender];
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId) {
                return positions[i].stakedAt;
            }
        }
        revert PositionNotFound();
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    // ========== ADMIN FUNCTIONS ==========


    function setMinStakeAmount(uint256 newAmount) external onlyAdmin whenNotEmergency {
        uint256 oldAmount = minStakeAmount;
        minStakeAmount = newAmount;
        emit MinStakeAmountUpdated(oldAmount, newAmount);
    }

    function enableEmergencyMode() external onlyAdmin {
        emergencyMode = true;
        emit EmergencyModeEnabled(msg.sender, block.timestamp);
    }

    function pause() external onlyAdmin {
        _pause();
        emit StakingPaused(msg.sender, block.timestamp);
    }


    function unpause() external onlyAdmin {
        _unpause();
        emit StakingUnpaused(msg.sender, block.timestamp);
    }


    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        require(emergencyMode, "Not in emergency mode");
        require(positionOwner[positionId] == msg.sender, "Not position owner");

        uint256 posIndex = _findPosition(msg.sender, positionId);
        Position storage position = userPositions[msg.sender][posIndex];
        
        require(!position.isUnstaked, "Position already unstaked");

        uint256 amount = position.amount;
        
        // Calculate and deduct the reserved pending reward for this position
        uint256 reservedReward = StakingLib.calculateReward(
            position.amount,
            LOCK_PERIOD,
            position.rewardRate,
            LOCK_PERIOD
        );
        if (totalPendingRewards >= reservedReward) {
            totalPendingRewards -= reservedReward;
        }
        
        position.isUnstaked = true;
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;

        // Only transfer principal in emergency mode
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Emergency withdraw failed");
        
        emit EmergencyWithdrawn(msg.sender, positionId, amount, block.timestamp);
    }

    function _updateReward(
        address _staker,
        uint256 _positionIndex
    ) internal returns (uint256 reward) {
        // Return 0 rewards if in emergency mode
        if (emergencyMode) return 0;

        Position storage position = userPositions[_staker][_positionIndex];
        if (position.isUnstaked) return 0;

        uint256 timeElapsed = _calculateTimeElapsed(position);
        if (timeElapsed == 0) return 0;

        reward = StakingLib.calculateReward(
            position.amount, 
            timeElapsed, 
            position.rewardRate,
            LOCK_PERIOD   
        );
        
        // Update reward pool balance
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


    function setMaxTotalStake(uint256 newLimit) external onlyAdmin {
        require(newLimit > 0, "Limit must be positive");
        require(newLimit >= totalStaked, "New limit below current stake");
        require(newLimit <= type(uint128).max, "Limit too large");
        
        uint256 oldLimit = maxTotalStake;
        maxTotalStake = newLimit;
        emit MaxTotalStakeUpdated(oldLimit, newLimit);
    }

    function setStakeStartTime(uint256 newStartTime) external onlyAdmin {
        require(newStartTime > 0, "Invalid start time");
        require(newStartTime < stakeEndTime, "Start time must be before end time");
        
        uint256 oldStartTime = stakeStartTime;
        stakeStartTime = newStartTime;
        emit StakeStartTimeUpdated(oldStartTime, newStartTime);
    }

    function setStakeEndTime(uint256 newEndTime) external onlyAdmin {
        require(newEndTime > block.timestamp, "End time must be in future");
        require(newEndTime > stakeStartTime, "End time must be after start time");
        
        uint256 oldEndTime = stakeEndTime;
        stakeEndTime = newEndTime;
        emit StakeEndTimeUpdated(oldEndTime, newEndTime);
    }

    /**
     * @dev Initiates the transfer of admin role to a new address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        require(newAdmin != admin, "Same as current admin");
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    /**
     * @dev Completes the admin transfer process
     * Only callable by the pending admin
     */
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Caller is not pending admin");
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferCompleted(oldAdmin, admin);
    }

    /**
     * @dev Cancels a pending admin transfer
     * Only callable by the current admin
     */
    function cancelAdminTransfer() external onlyAdmin {
        require(pendingAdmin != address(0), "No pending admin");
        address canceledAdmin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferCancelled(canceledAdmin);
    }
    
    // ========== WHITELIST FUNCTIONS ==========

    /**
     * @dev Sets whitelist status for a single user
     * @param user User address
     * @param status True to add to whitelist, false to remove
     */
    function setWhitelist(address user, bool status) external onlyAdmin {
        if (whitelisted[user] != status) {
            whitelisted[user] = status;
            emit WhitelistStatusChanged(user, status);
        }
    }

    /**
     * @dev Updates whitelist status for multiple users
     * @param users Array of user addresses
     * @param status True to add to whitelist, false to remove
     */
    function updateWhitelistBatch(address[] calldata users, bool status) 
        external 
        onlyAdmin 
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

    function checkWhitelistBatch(address[] calldata users) 
        external 
        view 
        returns (bool[] memory results) 
    {
        require(users.length <= 100, "Batch too large");
        results = new bool[](users.length);
        for (uint256 i = 0; i < users.length;) {
            results[i] = whitelisted[users[i]];
            unchecked { ++i; }
        }
        return results;
    }

    /**
     * @dev Toggles whitelist-only mode
     * @param enabled True to enable whitelist-only mode, false to disable
     */
    function setWhitelistOnlyMode(bool enabled) external onlyAdmin {
        bool oldMode = onlyWhitelistCanStake;
        onlyWhitelistCanStake = enabled;
        emit WhitelistModeChanged(oldMode, enabled);
    }

    // ========== REWARD POOL FUNCTIONS ==========

    // Add function to update reward pool balance
    function updateRewardPool() external payable onlyAdmin {
        rewardPoolBalance += msg.value;
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    // Add function to check reward pool sufficiency
    function checkRewardPoolSufficiency() external view returns (bool, uint256) {
        return (rewardPoolBalance >= totalPendingRewards, totalPendingRewards);
    }

    // Internal function to calculate pending reward
    function _calculatePendingReward(
        Position memory position
    ) internal view returns (uint256) {
        if (position.isUnstaked) return 0;
        
        uint256 timeElapsed = _calculateTimeElapsed(position);
        if (timeElapsed == 0) return 0;

        return StakingLib.calculateReward(
            position.amount,
            timeElapsed,
            position.rewardRate,
            LOCK_PERIOD
        );
    }

    /**
     * @dev Withdraws excess reward pool balance that is not reserved for pending rewards
     * @param amount Amount to withdraw
     */
    function withdrawExcessRewardPool(uint256 amount) external onlyAdmin {
        require(rewardPoolBalance >= totalPendingRewards, "Insufficient reward pool");
        uint256 excess = rewardPoolBalance - totalPendingRewards;
        require(amount <= excess, "Cannot withdraw required rewards");
        
        rewardPoolBalance -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    // ========== INTERNAL FUNCTIONS ==========

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        require(
            block.timestamp >= lastUpgradeTime + UPGRADE_COOLDOWN,
            "Upgrade cooldown not expired"
        );

        require(newImplementation != address(0), "Invalid implementation");
        
        string memory newVersion = IStaking(newImplementation).version();
        require(
            keccak256(abi.encodePacked(newVersion)) != 
            keccak256(abi.encodePacked(VERSION)),
            "Same version"
        );

        lastUpgradeTime = block.timestamp;
        emit ContractUpgraded(newVersion, newImplementation, block.timestamp);
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