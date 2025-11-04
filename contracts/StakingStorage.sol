// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IStake.sol";

/**
 * @title StakingStorage
 * @dev Defines the storage layout for the staking contract
 * This contract contains all state variables used in the staking system
 * and handles their initialization
 */
abstract contract StakingStorage is Initializable {
    // Gap for future storage variables
    uint256[48] private __gap;

    // Constants for calculations and configurations
    uint256 internal constant HSK_DECIMALS = 18;    // Decimal places for HSK token
    
    // Staking parameters
    uint256 public minStakeAmount;    // Minimum amount that can be staked
    uint256 public totalStaked;       // Total amount currently staked
    uint256 public nextPositionId;    // Counter for generating unique position IDs
    
    // Staking options and user positions
    IStaking.LockOption[] public lockOptions;    // Available staking periods and rates
    mapping(address => IStaking.Position[]) public userPositions;    // User's staking positions
    mapping(address => uint256) public userPositionCount;    // Number of positions per user
    
    // Emergency and admin controls
    bool public emergencyMode;    // Emergency stop mechanism
    mapping(uint256 => address) public positionOwner;    // Maps position IDs to owners
    address public admin;         // Admin address
    address public pendingAdmin;  // Pending admin for two-step transfer
    
    // Reward and stake tracking
    mapping(address => uint256) public userTotalStaked;    // Total staked per user
    uint256 public totalPendingRewards;     // Total rewards that need to be paid
    uint256 public rewardPoolBalance;       // Current balance of reward pool
    
    // Access control
    mapping(address => bool) public blacklisted;     // Blacklisted addresses
    mapping(address => bool) public whitelisted;     // Whitelisted addresses
    uint256 public whitelistBonusRate;              // Extra reward rate for whitelisted users
    
    // Staking limits and timing
    uint256 public maxTotalStake;     // Maximum total stake allowed
    uint256 public stakeEndTime;      // Deadline for new stakes
    bool public onlyWhitelistCanStake;    // Whitelist-only mode flag

    // Add event for admin changes
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);

    // Add event for reward pool updates
    event RewardPoolUpdated(uint256 newBalance);
    event InsufficientRewardPool(uint256 required, uint256 available);

    /**
     * @dev Initializes the storage contract with basic settings
     * @param _admin Address of the contract administrator
     */
    function __StakingStorage_init(
        address _admin
    ) internal onlyInitializing {
        require(_admin != address(0), "StakingStorage: zero admin");
        
        // Initialize basic parameters
        admin = _admin;
        minStakeAmount = 100 * 10**HSK_DECIMALS;
        nextPositionId = 1;

        lockOptions.push(IStaking.LockOption({
            period: 120 days,    // 6-month lock period
            rewardRate: 700      // 7% annual reward rate
        }));
        
        lockOptions.push(IStaking.LockOption({
            period: 305 days,    // 1-year lock period
            rewardRate: 1500     // 15% annual reward rate
        }));
        
        // Set maximum total stake limit
        maxTotalStake = 10_000 * 10**HSK_DECIMALS;

        // Initialize timing and access controls
        stakeEndTime = type(uint256).max;    // No initial end time
        onlyWhitelistCanStake = true;        // Start in whitelist-only mode
    }
}

/**
 * @title StakingStorageV2
 * @dev Reserved storage space for future upgrades
 */
abstract contract StakingStorageV2 is StakingStorage {
    // Reserved storage slots for future versions
    uint256[50] private __gap_v2;
}