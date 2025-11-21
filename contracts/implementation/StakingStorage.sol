// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/IStake.sol";

/**
 * @title StakingStorage
 * @dev Defines the storage layout for the staking contract
 * This contract contains all state variables used in the staking system
 * and handles their initialization
 */
abstract contract StakingStorage is Initializable, Ownable2StepUpgradeable {
    uint256 public minStakeAmount;
    uint256 public totalStaked;
    uint256 public nextPositionId;
    uint256 public rewardRate;
    
    mapping(uint256 => IStaking.Position) public positions;
    mapping(address => uint256[]) public userPositions;
    
    bool public emergencyMode;
    
    uint256 public totalPendingRewards;
    uint256 public rewardPoolBalance;
    
    mapping(address => bool) public whitelisted;
    
    uint256 public stakeStartTime;
    uint256 public stakeEndTime;
    bool public onlyWhitelistCanStake;
    
    uint256 public maxTotalStaked;
    
    // Gap for future storage variables (reserves 50 slots for upgrades)
    uint256[50] private __gap;

    event RewardPoolUpdated(uint256 newBalance);

    /**
     * @dev Initializes the storage contract with basic settings
     * @param _owner Address of the contract owner
     * @param _minStakeAmount Minimum stake amount (in wei)
     * @param _rewardRate Annual reward rate in basis points (800 for 8%, 1600 for 16%)
     * @param _whitelistMode Enable whitelist mode (true for Premium, false for Normal)
     * @param _maxTotalStaked Maximum total staked amount (in wei, 0 means no limit)
     */
    function __StakingStorage_init(
        address _owner,
        uint256 _minStakeAmount,
        uint256 _rewardRate,
        bool _whitelistMode,
        uint256 _maxTotalStaked
    ) internal onlyInitializing {
        require(_owner != address(0), "StakingStorage: zero owner");
        require(_minStakeAmount > 0, "Invalid min stake amount");
        require(_rewardRate > 0 && _rewardRate <= 10000, "Invalid reward rate");
        
        __Ownable_init(_owner);
        
        minStakeAmount = _minStakeAmount;
        rewardRate = _rewardRate;
        nextPositionId = 1;
        maxTotalStaked = _maxTotalStaked;

        stakeStartTime = type(uint256).max;
        stakeEndTime = type(uint256).max;
        onlyWhitelistCanStake = _whitelistMode;
    }
}
