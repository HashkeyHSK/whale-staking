// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IStake.sol";

/**
 * @title StakingStorage
 * @dev Defines the storage layout for the staking contract
 * This contract contains all state variables used in the staking system
 * and handles their initialization
 */
abstract contract StakingStorage is Initializable {
    // Constants for calculations and configurations
    uint256 internal constant HSK_DECIMALS = 18;    // Decimal places for HSK token
    uint256 public constant LOCK_PERIOD = 365 days; // Fixed lock period
    
    // Staking parameters
    uint256 public minStakeAmount;    // Minimum amount that can be staked
    uint256 public totalStaked;       // Total amount currently staked
    uint256 public nextPositionId;    // Counter for generating unique position IDs
    uint256 public rewardRate;        // Fixed reward rate (800 for 8%, 1600 for 16%)
    
    // User positions
    mapping(address => IStaking.Position[]) public userPositions;    // User's staking positions
    
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
    mapping(address => bool) public whitelisted;     // Whitelisted addresses
    
    // Staking limits and timing
    uint256 public maxTotalStake;     // Maximum total stake allowed
    uint256 public stakeStartTime;    // Start time for new stakes
    uint256 public stakeEndTime;      // Deadline for new stakes
    bool public onlyWhitelistCanStake;    // Whitelist-only mode flag
    
    // Position index mapping for efficient lookup (positionId => array index)
    mapping(uint256 => uint256) internal positionIndexMap;
    
    // Gap for future storage variables (reserves 50 slots for upgrades)
    uint256[50] private __gap;

    // Add event for admin changes
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);

    // Add event for reward pool updates
    event RewardPoolUpdated(uint256 newBalance);

    /**
     * @dev Initializes the storage contract with basic settings
     * @param _admin Address of the contract administrator
     * @param _rewardRate Annual reward rate in basis points (800 for 8%, 1600 for 16%)
     */
    function __StakingStorage_init(
        address _admin,
        uint256 _rewardRate
    ) internal onlyInitializing {
        require(_admin != address(0), "StakingStorage: zero admin");
        require(_rewardRate > 0 && _rewardRate <= 10000, "Invalid reward rate");
        
        // Initialize basic parameters
        admin = _admin;
        rewardRate = _rewardRate;           // Set fixed reward rate
        minStakeAmount = 100 * 10**HSK_DECIMALS;
        nextPositionId = 1;
        
        // Set maximum total stake limit
        maxTotalStake = 10_000 * 10**HSK_DECIMALS;

        // Initialize timing and access controls
        stakeStartTime = type(uint256).max;  // Set to max to prevent staking before admin configures
        stakeEndTime = type(uint256).max;    // No initial end time
        onlyWhitelistCanStake = true;        // Start in whitelist-only mode
    }
}
