# Single-Tier Staking Product Plan - Development Version

> **Document Note**: This document is for the development team, containing technical implementation details, contract interfaces, deployment configurations, and other development-related information.  
> **Operations Version**: Please refer to [PRODUCT_PLANS.md](./PRODUCT_PLANS.md)

---

## I. Technical Architecture Overview

### 1.1 Product Plan

This plan is based on the `HSKStaking` contract, implementing two products by deploying two independent proxy contracts (`StakingProxy` and ``):

| Product | Contract Instance | Target Users | Minimum Stake | Annual Yield | Whitelist |
|---------|------------------|--------------|---------------|--------------|-----------|
| Staking | Independent Instance A | General users | 1 HSK | 5% | Disabled |
|  | Independent Instance B | Whales/Institutions | 500,000 HSK | 16% | Enabled |

### 1.2 Technology Stack

- **Solidity**: ^0.8.27
- **Proxy Pattern**: Transparent Proxy
- **Upgrade Library**: OpenZeppelin Contracts ^5.1.0
- **Development Framework**: Hardhat ^2.22.17
- **Network**: HashKey Layer2 (Testnet/Mainnet)

### 1.3 Contract Architecture

#### Implementation Contract Layer
```
HSKStaking (Main Implementation Contract)
├── IStaking (Interface Definition)
├── StakingStorage (Storage Layer)
│   ├── Initializable (Initialization Control)
│   └── Ownable2StepUpgradeable (Two-Step Ownership Management)
├── StakingConstants (Constant Definitions)
├── ReentrancyGuardUpgradeable (Reentrancy Protection)
└── PausableUpgradeable (Pause Functionality)
```

#### Proxy Contract Layer
```
Proxy Contract Architecture
├── StakingProxy (TransparentUpgradeableProxy)
│   └── Points to HSKStaking Implementation
└──  (TransparentUpgradeableProxy)
    └── Points to HSKStaking Implementation
```

**Architecture Notes**:
- Uses Transparent Proxy pattern, upgrades controlled by ProxyAdmin
- Both proxy contracts share the same `HSKStaking` implementation
- Different product characteristics configured through initialization parameters
- Both proxy contracts can be upgraded independently

---

## II. Product Configuration Parameters

### 2.1 Staking Configuration

| Parameter | Value | Contract Function |
|-----------|-------|-------------------|
| `minStakeAmount` | 1000 HSK (1000e18) | `setMinStakeAmount(1000e18)` |
| `LOCK_PERIOD` | 365 days (31,536,000 seconds) | Fixed constant, set at deployment |
| `rewardRate` | 5% (500 basis points) | Set via initialize() at deployment |
| `stakeStartTime` | 7 days after deployment | `setStakeStartTime(timestamp)` |
| `stakeEndTime` | `type(uint256).max` | `setStakeEndTime(timestamp)` |
| `onlyWhitelistCanStake` | `false` | `setWhitelistOnlyMode(false)` |

### 2.2  Configuration

| Parameter | Value | Contract Function |
|-----------|-------|-------------------|
| `minStakeAmount` | 500,000 HSK (5e23) | `setMinStakeAmount(500000e18)` |
| `LOCK_PERIOD` | 365 days (31,536,000 seconds) | Fixed constant, set at deployment |
| `rewardRate` | 16% (1600 basis points) | Set via initialize() at deployment |
| `stakeStartTime` | 7 days after deployment | `setStakeStartTime(timestamp)` |
| `stakeEndTime` | `type(uint256).max` | `setStakeEndTime(timestamp)` |
| `onlyWhitelistCanStake` | `true` | `setWhitelistOnlyMode(true)` |

### 2.3 Key Data Structures

```solidity
// Position structure (defined in IStaking interface)
struct Position {
    uint256 positionId;      // Staking position ID
    address owner;           // Position owner
    uint256 amount;          // Staking amount
    uint256 stakedAt;        // Staking timestamp
    uint256 lastRewardAt;    // Last reward claim timestamp
    bool isUnstaked;         // Whether unstaked
}

// Note: V2 version uses fixed LOCK_PERIOD constant (365 days), no longer uses LockOption structure
// Note: Position structure does not contain rewardRate field, rewardRate is a contract-level state variable
```

**Storage Variables (defined in StakingStorage)**:
```solidity
uint256 public minStakeAmount;        // Minimum staking amount
uint256 public totalStaked;           // Total staked amount
uint256 public nextPositionId;        // Next position ID
uint256 public rewardRate;            // Annual yield rate (basis points)
uint256 public totalPendingRewards;   // Total pending rewards
uint256 public rewardPoolBalance;     // Reward pool balance
uint256 public stakeStartTime;        // Staking start time
uint256 public stakeEndTime;          // Staking end time
bool public onlyWhitelistCanStake;    // Whether only whitelist can stake
bool public emergencyMode;            // Emergency mode

mapping(uint256 => Position) public positions;       // Position ID => Position info
mapping(address => uint256[]) public userPositions;  // User address => Position ID array
mapping(address => bool) public whitelisted;         // Whitelist mapping
```

---

## III. Deployment Process

### 3.1 Deployment Scripts

#### Method 1: Deploy Separately (Recommended for Testing)

```bash
# Deploy Staking
STAKE_START_TIME="<timestamp>" STAKE_END_TIME="<timestamp>" npx hardhat run scripts/staking/deploy.ts --network hashkeyTestnet

# Deploy 
STAKE_START_TIME="<timestamp>" STAKE_END_TIME="<timestamp>" npx hardhat run /deploy.ts --network hashkeyTestnet
```

**Note**: Deployment scripts require `STAKE_START_TIME` and `STAKE_END_TIME` environment variables (Unix timestamp in seconds).

### 3.2 Post-Deployment Configuration Checklist

#### Staking
- [ ] Verify `minStakeAmount` = 1000 HSK
- [ ] Verify `rewardRate: 500 (5% APY)
- [ ] Verify `LOCK_PERIOD` = 365 days (fixed)
- [ ] Verify `onlyWhitelistCanStake` = false
- [ ] Deposit to reward pool (via `updateRewardPool()`)

#### 
- [ ] Verify `minStakeAmount` = 500,000 HSK
- [ ] Verify `rewardRate` = 1600 (16% APY)
- [ ] Verify `LOCK_PERIOD` = 365 days (fixed)
- [ ] Verify `onlyWhitelistCanStake` = true
- [ ] Add whitelist users (via `updateWhitelistBatch()`)
- [ ] Deposit to reward pool (via `updateRewardPool()`)

### 3.3 Deployment Verification Scripts

```bash
# Check configuration parameters and contract status
npx hardhat run scripts/staking/query/check-status.ts --network hashkeyTestnet \
  -- --contract <CONTRACT_ADDRESS>

# Check user staking status
npx hardhat run scripts/staking/query/check-stakes.ts --network hashkeyTestnet \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>

# Check whitelist status ()
npx hardhat run /query/check-whitelist.ts --network hashkeyTestnet \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

---

## IV. Core Contract Interfaces

### 4.1 User Interfaces

#### `stake() payable → uint256 positionId`
Create a new staking position (fixed 365-day lock period).

**Parameters**:
- No parameters, send staking amount via `msg.value`

**Requirements**:
- `block.timestamp >= stakeStartTime` - Staking time window has started
- `block.timestamp < stakeEndTime` - Staking time window has not ended
- `msg.value >= minStakeAmount` - Meets minimum staking amount
- If whitelist enabled: `whitelisted[msg.sender] == true` - In whitelist
- `!emergencyMode` - Not in emergency mode
- `!paused()` - Contract not paused
- `rewardPoolBalance >= totalPendingRewards + potentialReward` - Sufficient reward pool balance

**Returns**: Newly created staking position ID

#### `unstake(uint256 positionId)`
Unstake and withdraw principal and rewards.

**Parameters**:
- `positionId`: Staking position ID

**Requirements**:
- `msg.sender == position.owner` - Position owner
- `block.timestamp >= position.stakedAt + LOCK_PERIOD` - Lock period has ended (365 days)
- `!position.isUnstaked` - Position not unstaked

**Effects**:
- Withdraw principal + all accumulated rewards
- Mark position as unstaked

#### `claimReward(uint256 positionId) → uint256 reward`
Claim rewards (without unstaking).

**Parameters**:
- `positionId`: Staking position ID

**Returns**: Claimed reward amount

**Requirements**:
- `msg.sender == position.owner` - Position owner
- `reward > 0` - Has unclaimed rewards
- `!emergencyMode` - Not in emergency mode
- `!paused()` - Contract not paused

#### `pendingReward(uint256 positionId) view → uint256`
Query pending rewards for any position.

**Parameters**:
- `positionId`: Staking position ID

**Returns**: Pending reward amount

**Notes**:
- **Anyone can query** - No owner restriction, can query any position's pending reward
- Returns 0 in emergency mode
- Returns 0 if position is unstaked
- View function, no gas cost for read-only queries

#### View User Staking Positions

**Method 1 - Via positions mapping**:
```solidity
positions(uint256 positionId) view → Position
```
Directly query position information for specified positionId.

**Method 2 - Via getUserPositionIds function (Recommended)**:
```solidity
getUserPositionIds(address user) view → uint256[] memory
```
Get all staking position ID array for user, then query details via positions.

- **Note**: This is the most convenient method, can get all position IDs in one call.

### 4.2 Admin Interfaces

**Note**: V2 version uses fixed 365-day lock period and fixed yield rate (set at deployment), does not support dynamically adding or modifying lock period options.

#### `setMinStakeAmount(uint256 newAmount)`
Set minimum staking amount.
- **Requirement**: Only admin can call (`onlyOwner`)
- **Requirement**: Not in emergency mode (`whenNotEmergency`)

#### `setWhitelistOnlyMode(bool enabled)`
Enable/disable whitelist mode.
- **Requirement**: Only admin can call (`onlyOwner`)
- **Event**: Triggers `WhitelistModeChanged` event

#### `updateWhitelistBatch(address[] calldata users, bool status)`
Batch manage whitelist users.

**Parameters**:
- `users`: User address array (max 100)
- `status`: true to add to whitelist, false to remove from whitelist

**Requirement**: Only admin can call (`onlyOwner`)
**Event**: Triggers `WhitelistStatusChanged` event for each user with status change

#### `updateRewardPool() payable`
Deposit to reward pool.

**Parameter**: Send deposit amount via `msg.value`
**Requirement**: Only admin can call (`onlyOwner`)
**Effect**: Increases `rewardPoolBalance`
**Event**: Triggers `RewardPoolUpdated` event

**Important**:
- Reward pools need independent management (Staking and  managed separately)

#### `withdrawExcessRewardPool(uint256 amount)`
Withdraw excess reward pool funds.

**Parameter**: `amount` - Withdrawal amount
**Requirements**: 
- Only admin can call (`onlyOwner`)
- `rewardPoolBalance >= totalPendingRewards` - Sufficient reward pool balance
- `amount <= excess` - Cannot withdraw allocated rewards

#### `enableEmergencyMode()`
Enable emergency mode.

**Requirement**: Only admin can call (`onlyOwner`)
**Effects**: 
- Sets `emergencyMode = true`
- Pauses reward distribution (all reward-related functions return 0)
- Blocks new staking
- Allows emergency withdrawal (principal only)
**Event**: Triggers `EmergencyModeEnabled` event
**Note**: Current version emergency mode cannot be disabled via function once enabled, may require contract upgrade

**Restrictions in Emergency Mode**:
- Pauses reward distribution (all reward-related functions return 0)
- Blocks new staking
- Allows emergency withdrawal (principal only)
- Note: If unlock conditions are met, normal `unstake` can still execute but rewards are 0; if not expired, can use `emergencyWithdraw` (principal only)

#### `emergencyWithdraw(uint256 positionId)`
Emergency withdrawal (principal only, forfeit rewards).

**Parameter**: `positionId` - Staking position ID
**Requirements**:
- Must be in emergency mode (`emergencyMode == true`)
- Position owner (`position.owner == msg.sender`)
- Position not unstaked (`!position.isUnstaked`)
- Not subject to lock period restrictions

**Reentrancy Protection**: Uses `nonReentrant` modifier
**Event**: Triggers `EmergencyWithdrawn` event

### 4.3 Query Interfaces

**Note**: V2 version does not provide `getLockOptions()` function, as lock period is fixed at 365 days.

#### `totalStaked() view → uint256`
Get total staked amount.

#### `rewardPoolBalance() view → uint256`
Get reward pool balance.

#### `onlyWhitelistCanStake() view → bool`
Query whitelist mode status.

#### `emergencyMode() view → bool`
Query emergency mode status.

#### `LOCK_PERIOD() view → uint256`
Get fixed lock period (365 days = 31,536,000 seconds).

#### `rewardRate() view → uint256`
Get annual yield rate (basis points, e.g., 500 = 5%, ).

#### `stakeStartTime() view → uint256`
Get staking start timestamp.

#### `stakeEndTime() view → uint256`
Get staking end timestamp.

#### `positions(uint256 positionId) view → Position`
Get detailed information for specified position.

#### `getUserPositionIds(address user) view → uint256[] memory`
Get all staking position ID array for user (recommended).

---

## V. Reward Calculation Mechanism

### 5.1 Calculation Formula

Reward calculation implemented by `HSKStaking._calculateReward()`:

```solidity
// Annual rate = rewardRate (basis points) / 10000
// Time ratio = timeElapsed / 365 days
// Reward = Principal × (Annual rate / 10000) × (timeElapsed / 365 days)
//
// Simplified formula:
// reward = (amount × rewardRate × timeElapsed) / (10000 × 365 days)
//
// Limitation: If timeElapsed > LOCK_PERIOD, then timeElapsed = LOCK_PERIOD
```

**Implementation Details**:
```solidity
uint256 annualRate = (rewardRate × PRECISION) / BASIS_POINTS;
uint256 timeRatio = (timeElapsed × PRECISION) / SECONDS_PER_YEAR;
uint256 totalReward = (amount × annualRate × timeRatio) / (PRECISION × PRECISION);
```

**Constant Definitions**:
- `PRECISION = 1e18` - 18 decimal precision
- `BASIS_POINTS = 10000` - 100% = 10000 basis points
- `SECONDS_PER_YEAR = 365 days` - 31,536,000 seconds
- `LOCK_PERIOD = 365 days` - Fixed lock period

### 5.2 Calculation Examples

**Staking (5% APY, 365-day lock period)**:
- Stake: 10,000 HSK
- Lock period: 365 days
- Actual staking: 365 days
- Reward = 10,000 × 0.08 × (365/365) = 500 HSK

** (16% APY, 365-day lock period)**:
- Stake: 1,000,000 HSK
- Lock period: 365 days
- Actual staking: 365 days
- Reward = 1,000,000 × 0.16 × (365/365) = 160,000 HSK

### 5.3 Reward Cap Rules

**Important**: Rewards are only calculated up to the end of lock period.

Example:
- User chooses 365-day lock period
- Actually staked for 400 days before withdrawal
- Rewards still calculated based on 365 days, extra 35 days do not generate rewards

**Implementation Location**: Limiting logic in `HSKStaking._calculateReward()` and `_calculateTimeElapsed()`

**Implementation Code**:
```solidity
function _calculateTimeElapsed(Position memory position) 
    internal 
    view 
    returns (uint256) 
{
    uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
    uint256 endTime = block.timestamp < lockEndTime ? block.timestamp : lockEndTime;
    return endTime - position.lastRewardAt;
}
```

---

## VII. Security Mechanisms

### 7.1 Reentrancy Attack Protection

- Uses `ReentrancyGuardUpgradeable`
- All functions involving fund transfers use `nonReentrant` modifier

### 7.2 Access Control

- **Owner**: Contract owner, responsible for all administrative functions (including upgrades, parameter configuration, etc.)
- Uses OpenZeppelin's Ownable2StepUpgradeable standard implementation (two-step ownership transfer)
- Supports two-step ownership transfer:
  - Step 1: Current owner calls `transferOwnership(newOwner)` to set pending transfer address
  - Step 2: New owner calls `acceptOwnership()` to accept ownership
- Supports renouncing ownership (`renounceOwnership`)
- Advantages: Prevents address errors, provides revocation opportunity, enhances security

### 7.3 Emergency Mode

- Admin can enable emergency mode
- In emergency mode:
  - Pauses reward distribution
  - Blocks new staking
  - Allows emergency withdrawal (principal only)

### 7.4 Pause Mechanism

- Admin can pause contract (`pause()`)
- When paused: Staking, reward claiming, and unstaking are all disabled

---

## VIII. Development Notes

### 8.1 Precision Handling

- All amounts use 18 decimals (`ethers.parseEther()`)
- Annual yield rate uses basis points (100% = 10000)
- Time uses seconds as unit

### 8.2 Reward Pool Check

Contract checks if reward pool balance is sufficient in `stake()`. Need to ensure:
- Reward pool has sufficient funds to pay expected rewards
- Regularly monitor reward pool balance
- Plan deposit schedule in advance

### 8.3 Reward Pool Management

- Contract checks if reward pool balance is sufficient in `stake()`
- Need to ensure reward pool has sufficient funds to pay expected rewards
- Admin can withdraw excess reward pool funds via `withdrawExcessRewardPool`
- Regularly monitor reward pool balance and totalPendingRewards

### 8.4 Proxy Upgrade

**Upgrade Mechanism**:
- Uses Transparent Proxy pattern
- Upgrades controlled by ProxyAdmin contract or EOA
- Upgrade scripts automatically detect ProxyAdmin type and use correct method

**Upgrade Script Features**:
- ✅ Automatically reads actual ProxyAdmin address from EIP-1967 storage slot
- ✅ Supports both ProxyAdmin contract and EOA modes
- ✅ Smart Fallback: If `upgrade()` fails, automatically tries `upgradeAndCall()`
- ✅ Automatically verifies state consistency before and after upgrade
- ✅ Automatically prints browser link after successful upgrade

**Upgrade Commands**:
```bash
# Auto-detect ProxyAdmin (recommended)
npm run upgrade:normal:testnet

# Manually specify ProxyAdmin address
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:normal:testnet

# Use already deployed implementation contract
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:normal:testnet
```

**Notes**:
- Need to fully test new implementation contract before upgrade
- Ensure new implementation contract is compatible with existing storage layout
- Upgrade transaction will appear on ProxyAdmin contract page, not Proxy page
- Need to verify new implementation contract after upgrade

### 8.5 Event Listening

Important events:
- `PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint256 lockPeriod, uint256 timestamp)`
- `PositionUnstaked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`
- `RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`
- `RewardPoolUpdated(uint256 newBalance)`
- `EmergencyModeEnabled(address indexed operator, uint256 timestamp)`
- `EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`
- `WhitelistStatusChanged(address indexed user, bool status)`
- `StakeStartTimeUpdated(uint256 oldStartTime, uint256 newStartTime)`
- `StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime)`
- `MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount)`

---

## IX. Testing Requirements

### 9.1 Unit Tests

- [ ] Reward calculation correctness
- [ ] Lock period verification
- [ ] Whitelist mechanism
- [ ] Emergency mode
- [ ] Reentrancy attack protection
- [ ] Boundary condition tests

### 9.2 Integration Tests

- [ ] Complete staking flow
- [ ] Reward claiming flow
- [ ] Unstaking flow
- [ ] Whitelist approval flow
- [ ] Reward pool deposit flow
- [ ] Emergency mode flow

### 9.3 Stress Tests

- [ ] Large number of users staking concurrently
- [ ] Reward pool depletion scenario
- [ ] Large number of position query performance
- [ ] Staking failure scenario when reward pool balance is insufficient

### 9.4 Security Tests

- [ ] Reentrancy attack tests
- [ ] Permission control tests
- [ ] Boundary value tests
- [ ] Overflow/underflow tests

---

## X. Frontend Integration Points

### 10.1 User Operation Flows

#### Staking Flow
1. Check whitelist status ()
2. Check staking time window (`stakeStartTime` and `stakeEndTime`)
3. Check if reward pool balance is sufficient (contract automatically checks)
4. Call `stake()` and send HSK (fixed 365-day lock period)
5. Listen for `PositionCreated` event

#### Reward Claiming Flow
1. Query user staking positions (`getUserPositionIds(user)`, recommended method)
2. Query pending rewards (`pendingReward(positionId)`)
3. Call `claimReward(positionId)`
4. Listen for `RewardClaimed` event

#### Unstaking Flow
1. Check if lock period has ended (staking time + 365 days)
2. Query user staking positions (`getUserPositionIds(user)` or `positions(positionId)`)
3. Call `unstake(positionId)`
4. Listen for `PositionUnstaked` and `RewardClaimed` events

### 10.2 Display Data

- **Total Staked**: `totalStaked()`
- **Reward Pool Balance**: `rewardPoolBalance()`
- **Total Pending Rewards**: `totalPendingRewards()`
- **Lock Period**: `LOCK_PERIOD()` (fixed 365 days)
- **Annual Yield Rate**: `rewardRate: 500 = 5%)
- **User Staking Positions**: `getUserPositionIds(user)` (recommended method, returns all position ID array)
- **Position Details**: `positions(positionId)`
- **Pending Rewards**: `pendingReward(positionId)`

### 10.3 Error Handling

Common errors:
- `"Amount below minimum"` - Insufficient staking amount (less than minStakeAmount)
- `NotWhitelisted` - Not in whitelist ()
- `StillLocked` - Lock period not ended (365 days)
- `"Stake amount exceed"` - Insufficient reward pool balance (cannot pay expected rewards)
- `"Insufficient reward pool"` - Insufficient reward pool balance (when claiming rewards)
- `"Staking has not started yet"` - Staking time window has not started
- `"Staking period has ended"` - Staking time window has ended
- `"Contract is in emergency mode"` - Contract is in emergency mode
- `AlreadyUnstaked` - Position already unstaked
- `NoReward` - No rewards to claim
- `PositionNotFound` - Position does not exist or does not belong to caller

---

## XI. Monitoring and Alerts

### 11.1 Key Metrics Monitoring

#### Staking
- `totalStaked` - Total staked amount
- `rewardPoolBalance` - Reward pool balance
- User count statistics (via events)

#### 
- `totalStaked` - Total staked amount
- `rewardPoolBalance` - Reward pool balance
- Whitelist user count

### 11.2 Alert Thresholds

- ⚠️ Reward pool balance < Total pending rewards (totalPendingRewards)
- ⚠️ Emergency mode enabled
- ⚠️ Contract paused

### 11.3 Logging

Recommended to log:
- All staking/unstaking operations
- Reward claiming operations
- Reward pool deposit operations
- Whitelist change operations
- Emergency mode enable/disable

---

## XII. Deployment Checklist

### 12.1 Pre-Deployment Checks

- [ ] Contract code audited
- [ ] Test coverage meets requirements
- [ ] Deployment scripts verified
- [ ] Network configuration correct (RPC, private key)
- [ ] Reward pool funds prepared sufficiently

### 12.2 Post-Deployment Verification

- [ ] Contract addresses correctly recorded
- [ ] Configuration parameters verified
- [ ] Permissions set correctly (Owner)
- [ ] Reward pool deposit successful
- [ ] Whitelist users added successfully ()
- [ ] Test staking/claiming flow

### 12.3 Pre-Launch Preparation

- [ ] Frontend integration completed
- [ ] Monitoring system configured
- [ ] Alert mechanism configured
- [ ] Operations documentation prepared
- [ ] User guide prepared

---

## XIII. Common Questions

### Q: How to modify lock period or yield rate?

A: V2 version uses fixed lock period (365 days) and fixed yield rate (set at deployment), does not support dynamic modification. If different configuration is needed, deploy new contract instance.

### Q: What if reward pool balance is insufficient?

A: Use `updateRewardPool()` to deposit, ensure sufficient funds to pay rewards.

### Q: How to batch add whitelist users?

A: Use `updateWhitelistBatch(address[] calldata users, bool status)`, max 100.
- `status = true` to add to whitelist
- `status = false` to remove from whitelist

### Q: How to enable/disable emergency mode?

A: Use `enableEmergencyMode()` to enable. Note: In current contract version, emergency mode cannot be disabled via function once enabled, may require contract upgrade to disable.

---

## XIV. Related Resources

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Single-Tier Product Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team
