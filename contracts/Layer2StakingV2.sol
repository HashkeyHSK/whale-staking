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
 * Implements staking functionality with multiple lock periods and reward rates
 * Features include:
 * - Upgradeable proxy pattern
 * - Whitelist system
 * - Emergency withdrawal
 * - Reward calculation and distribution
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
    event WhitelistBonusRateUpdated(uint256 oldRate, uint256 newRate);
    event StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime);
    event LockOptionUpdated(uint256 indexed index, uint256 newPeriod, uint256 newRate);
    event MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event BlacklistStatusChanged(address indexed user, bool isBlacklisted);
    event EmergencyModeEnabled(address indexed admin, uint256 timestamp);
    event AdminTransferCancelled(address indexed canceledAdmin);
    event WhitelistModeChanged(bool oldMode, bool newMode);

    // Custom errors for better gas efficiency and clearer error messages
    error OnlyAdmin();
    error InvalidAmount();
    error InvalidPeriod();
    error AlreadyUnstaked();
    error StillLocked();
    error NoReward();
    error InsufficientReward();
    error PositionNotFound();
    error Blacklisted();
    error EmergencyOnly();
    error MaxTotalStakeExceeded();
    error InvalidMaxStakeLimit();

    // Access control modifiers
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier notBlacklisted() {
        if (blacklisted[msg.sender]) revert Blacklisted();
        _;
    }

    modifier validPosition(uint256 positionId) {
        if (positionOwner[positionId] != msg.sender) revert PositionNotFound();
        _;
    }

    // Add whitelist validation modifier
    modifier whitelistCheck() {
        if (onlyWhitelistCanStake) {
            require(whitelisted[msg.sender], "Not whitelisted");
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

    // Add a mapping to store historical lock periods and their rates
    mapping(uint256 => uint256) private historicalRates;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with default settings
     * Sets up initial staking parameters and enables whitelist-only mode
     */
    function initialize() external initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __StakingStorage_init(msg.sender);
        
        // Set initial values
        stakeEndTime = type(uint256).max;    // No initial end time
        onlyWhitelistCanStake = true;        // Start in whitelist-only mode
    }

    /**
     * @dev Creates a new staking position
     * @param lockPeriod Duration for which tokens will be locked
     * @return uint256 ID of the newly created position
     */
    function stake(
        uint256 lockPeriod
    ) external 
        payable 
        nonReentrant 
        whenNotPaused 
        notBlacklisted 
        whitelistCheck
        whenNotEmergency  // Add emergency mode check
        returns (uint256) 
    {
        require(block.timestamp < stakeEndTime, "Staking period has ended");

        // Add validation for lockPeriod
        StakingLib.validateAndGetRate(
            lockPeriod, 
            lockOptions,
            historicalRates
        );

        uint256 amount = msg.value;
        amount = StakingLib.validateAndFormatAmount(amount, minStakeAmount);
        
        if (totalStaked + amount > maxTotalStake) revert MaxTotalStakeExceeded();

        // Calculate potential reward for this new stake
        uint256 rewardRate = StakingLib.validateAndGetRate(
            lockPeriod, 
            lockOptions,
            historicalRates
        );
        uint256 potentialReward = StakingLib.calculateReward(
            amount,
            lockPeriod,  // timeElapsed
            rewardRate,
            lockPeriod
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
            lockPeriod: lockPeriod,
            stakedAt: block.timestamp,
            lastRewardAt: block.timestamp,
            rewardRate: rewardRate,
            isUnstaked: false
        });

        userPositions[msg.sender].push(newPosition);
        userPositionCount[msg.sender]++;
        positionOwner[positionId] = msg.sender;
        userTotalStaked[msg.sender] += amount;
        totalStaked += amount;

        historicalTotalStaked += amount;

        emit PositionCreated(
            msg.sender,
            positionId,
            amount,
            lockPeriod,
            block.timestamp
        );

        return positionId;
    }

    function unstake(
        uint256 positionId
    ) external override nonReentrant validPosition(positionId) {
        Position[] storage positions = userPositions[msg.sender];
        Position storage position;
        uint256 posIndex;
        bool found = false;

        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId) {
                position = positions[i];
                posIndex = i;
                found = true;
                break;
            }
        }

        if (!found) revert PositionNotFound();
        
        position = positions[posIndex];
        if (position.isUnstaked) revert AlreadyUnstaked();
        require(
            block.timestamp + TIME_TOLERANCE >= position.stakedAt + position.lockPeriod,
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
    ) external override nonReentrant whenNotPaused validPosition(positionId) returns (uint256) {
        require(!emergencyMode, "Rewards disabled in emergency mode");
        
        Position[] storage positions = userPositions[msg.sender];
        uint256 posIndex;
        bool found = false;

        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId) {
                posIndex = i;
                found = true;
                break;
            }
        }

        if (!found) revert PositionNotFound();
        
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
        
        Position[] memory positions = userPositions[msg.sender];
        
        for (uint256 i = 0; i < positions.length; i++) {
            Position memory position = positions[i];
            if (position.positionId == positionId && !position.isUnstaked) {
                uint256 currentTime = block.timestamp;
                uint256 lockEndTime = position.stakedAt + position.lockPeriod;
                
                // Calculate time elapsed, capped at lock period
                uint256 timeElapsed;
                if (currentTime >= lockEndTime) {
                    timeElapsed = lockEndTime - position.lastRewardAt;
                    if (timeElapsed == 0) return 0;
                } else {
                    timeElapsed = currentTime - position.lastRewardAt;
                    if (timeElapsed == 0) return 0;
                }

                return StakingLib.calculateReward(
                    position.amount,
                    timeElapsed,
                    position.rewardRate,
                    position.lockPeriod
                );
            }
        }
        
        return 0;
    }

    function getUserPositions(
        address user
    ) external view override returns (Position[] memory) {
        return userPositions[user];
    }


    function getUserPositionCount(
        address user
    ) external view override returns (uint256) {
        return userPositionCount[user];
    }

    function getLockOptions() external view override returns (LockOption[] memory) {
        return lockOptions;
    }


    function getRewardRate(
        uint256 lockPeriod
    ) external view override returns (uint256) {
        return StakingLib.validateAndGetRate(
            lockPeriod, 
            lockOptions,
            historicalRates
        );
    }

    
    function getTotalStaked() external view override returns (uint256) {
        return totalStaked;
    }


    function addLockOption(
        uint256 period,
        uint256 rewardRate
    ) external onlyAdmin whenNotEmergency {
        require(StakingLib.isValidLockOption(period, rewardRate), "Invalid lock option");
        
        for (uint256 i = 0; i < lockOptions.length; i++) {
            if (lockOptions[i].period == period) revert InvalidPeriod();
        }

        lockOptions.push(LockOption({
            period: period,
            rewardRate: rewardRate
        }));

        emit LockOptionAdded(period, rewardRate, block.timestamp);
    }

    function setMinStakeAmount(uint256 newAmount) external onlyAdmin whenNotEmergency {
        uint256 oldAmount = minStakeAmount;
        minStakeAmount = newAmount;
        emit MinStakeAmountUpdated(oldAmount, newAmount);
    }


    function addToBlacklist(address user) external onlyAdmin {
        blacklisted[user] = true;
        emit BlacklistStatusChanged(user, true);
    }

    function removeFromBlacklist(address user) external onlyAdmin {
        blacklisted[user] = false;
        emit BlacklistStatusChanged(user, false);
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

        Position[] storage positions = userPositions[msg.sender];
        Position storage position;
        uint256 posIndex;
        bool found = false;

        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId && !positions[i].isUnstaked) {
                position = positions[i];
                posIndex = i;
                found = true;
                break;
            }
        }

        require(found, "Position not found or already unstaked");

        uint256 amount = positions[posIndex].amount;
        positions[posIndex].isUnstaked = true;
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

        uint256 currentTime = block.timestamp;
        uint256 lockEndTime = position.stakedAt + position.lockPeriod;
        
        // Calculate time elapsed, capped at lock period
        uint256 timeElapsed;
        if (currentTime >= lockEndTime) {
            // If current time is beyond lock period, only calculate rewards up to lock end
            timeElapsed = lockEndTime - position.lastRewardAt;
            if (timeElapsed == 0) return 0;
        } else {
            // If still in lock period, calculate rewards normally
            timeElapsed = currentTime - position.lastRewardAt;
            if (timeElapsed == 0) return 0;
        }

        reward = StakingLib.calculateReward(
            position.amount, 
            timeElapsed, 
            position.rewardRate,
            position.lockPeriod   
        );
        
        // Update reward pool balance
        if (reward > 0) {
            require(rewardPoolBalance >= reward, "Insufficient reward pool");
            rewardPoolBalance -= reward;
            totalPendingRewards -= reward;
            emit RewardPoolUpdated(rewardPoolBalance);
        }

        position.lastRewardAt = currentTime > lockEndTime ? lockEndTime : currentTime;
    }


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

        // 更新最后升级时间
        lastUpgradeTime = block.timestamp;

        // 发出升级事件
        emit ContractUpgraded(newVersion, newImplementation, block.timestamp);
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function addToWhitelist(address user) external onlyAdmin {
        if (!whitelisted[user]) {
            whitelisted[user] = true;
            emit WhitelistStatusChanged(user, true);
        }
    }
    
    function removeFromWhitelist(address user) external onlyAdmin {
        if (whitelisted[user]) {
            whitelisted[user] = false;
            emit WhitelistStatusChanged(user, false);
        }
    }
    
    function setWhitelistBonusRate(uint256 newRate) external onlyAdmin {
        require(newRate <= 5000, "Bonus rate too high"); // 最高50%额外APY
        uint256 oldRate = whitelistBonusRate;
        whitelistBonusRate = newRate;
        emit WhitelistBonusRateUpdated(oldRate, newRate);
    }

    function setMaxTotalStake(uint256 newLimit) external onlyAdmin {
        require(newLimit >= totalStaked, "New limit below current stake");
        uint256 oldLimit = maxTotalStake;
        maxTotalStake = newLimit;
        emit MaxTotalStakeUpdated(oldLimit, newLimit);
    }

    function remainingStakeCapacity() external view returns (uint256) {
        if (totalStaked >= maxTotalStake) {
            return 0;
        }
        return maxTotalStake - totalStaked;
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

    function setStakeEndTime(uint256 newEndTime) external onlyAdmin {
        require(newEndTime > block.timestamp, "End time must be in future");
        uint256 oldEndTime = stakeEndTime;
        stakeEndTime = newEndTime;
        emit StakeEndTimeUpdated(oldEndTime, newEndTime);
    }

    function getHistoricalTotalStaked() external view returns (uint256) {
        return historicalTotalStaked;
    }
    
    function addToWhitelistBatch(address[] calldata users) external onlyAdmin {
        uint256 length = users.length;
        require(length <= 100, "Batch too large");
        for (uint256 i = 0; i < length;) {
            if (!whitelisted[users[i]]) {
                whitelisted[users[i]] = true;
                emit WhitelistStatusChanged(users[i], true);
            }
            unchecked { ++i; }
        }
    }

    function removeFromWhitelistBatch(address[] calldata users) external onlyAdmin {
        require(users.length <= 100, "Batch too large");
        for (uint256 i = 0; i < users.length;) {
            if (whitelisted[users[i]]) {
                whitelisted[users[i]] = false;
                emit WhitelistStatusChanged(users[i], false);
            }
            unchecked { ++i; }
        }
    }

    function checkWhitelistBatch(address[] calldata users) 
        external 
        view 
        returns (bool[] memory results) 
    {
        results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = whitelisted[users[i]];
        }
        return results;
    }

    uint256 private constant TIME_TOLERANCE = 900; 
    uint256 private constant UPGRADE_COOLDOWN = 1 days;
    uint256 public lastUpgradeTime;
    string public constant VERSION = "1.0.1"; // 更新版本号

    // Add a function to check if a lock period is in use
    function isLockPeriodInUse(uint256 period) internal view returns (bool) {
        for (uint256 i = 0; i < userPositions[msg.sender].length; i++) {
            if (!userPositions[msg.sender][i].isUnstaked && 
                userPositions[msg.sender][i].lockPeriod == period) {
                return true;
            }
        }
        return false;
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

    // Add function to update reward pool balance
    function updateRewardPool() public payable onlyAdmin {
        rewardPoolBalance += msg.value;
        emit RewardPoolUpdated(rewardPoolBalance);
    }

    // Add function to check reward pool sufficiency
    function checkRewardPoolSufficiency() public view returns (bool, uint256) {
        uint256 requiredRewards = calculateTotalPendingRewards();
        return (rewardPoolBalance >= requiredRewards, requiredRewards);
    }

    // Internal function to calculate pending reward
    function _calculatePendingReward(
        Position memory position
    ) internal view returns (uint256) {
        if (position.isUnstaked) return 0;
        
        uint256 currentTime = block.timestamp;
        uint256 lockEndTime = position.stakedAt + position.lockPeriod;
        
        // Calculate time elapsed, capped at lock period
        uint256 timeElapsed;
        if (currentTime >= lockEndTime) {
            timeElapsed = lockEndTime - position.lastRewardAt;
            if (timeElapsed == 0) return 0;
        } else {
            timeElapsed = currentTime - position.lastRewardAt;
            if (timeElapsed == 0) return 0;
        }

        return StakingLib.calculateReward(
            position.amount,
            timeElapsed,
            position.rewardRate,
            position.lockPeriod
        );
    }

    // Calculate total pending rewards for all active positions
    function calculateTotalPendingRewards() public view returns (uint256 total) {
        for (uint256 i = 0; i < nextPositionId; i++) {
            address owner = positionOwner[i];
            if (owner != address(0)) {
                Position[] memory positions = userPositions[owner];
                for (uint256 j = 0; j < positions.length; j++) {
                    if (!positions[j].isUnstaked) {
                        total += _calculatePendingReward(positions[j]);
                    }
                }
            }
        }
        return total;
    }

    function withdrawExcessRewardPool(uint256 amount) external onlyAdmin {
        uint256 excess = rewardPoolBalance - calculateTotalPendingRewards();     
        require(amount <= excess, "Cannot withdraw required rewards"); //
        rewardPoolBalance -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RewardPoolUpdated(rewardPoolBalance);
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

    /**
     * @dev Returns the timestamp when a position was staked
     * @param positionId The ID of the staking position
     * @return The timestamp when the position was staked
     */
    function getStakeTime(uint256 positionId) external view returns (uint256) {
        Position[] memory positions = userPositions[msg.sender];
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].positionId == positionId) {
                return positions[i].stakedAt;
            }
        }
        revert PositionNotFound();
    }
} 