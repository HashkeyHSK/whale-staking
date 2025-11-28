# Whale Staking Contract

A decentralized staking contract based on HashKey Layer2 network, supporting fixed lock periods, whitelist mechanisms, and upgradeable proxy patterns.

## 📋 Table of Contents

- [Features](#features)
- [Contract Architecture](#contract-architecture)
- [Quick Start](#quick-start)
- [Contract Interface](#contract-interface)
- [Lock Period and Yield](#lock-period-and-yield)
- [Reward Calculation](#reward-calculation)
- [Security Features](#security-features)
- [Deployment Guide](#deployment-guide)
- [Scripts](#scripts)
- [Testing](#testing)
- [License](#license)

## ✨ Features

### Core Features
- **Fixed Lock Period**: Fixed 365-day lock period, simplifying user choices and unified management
- **Early Unstake**: Supports early unstake with 50% penalty and 7-day waiting period
- **Penalty Pool**: Penalties from early unstake are distributed to users who complete full staking period
- **Upgradeable Proxy**: Uses Transparent Proxy pattern, supporting contract upgrades
- **Whitelist Mechanism**: Supports whitelist mode, can restrict staking to whitelisted users only
- **Staking Time Control**: Supports setting staking start and end times, flexible control of staking time windows
- **Reward Pool Management**: Independent reward pool system ensuring security of reward distribution
- **Configurable Yield Rate**: Annual yield rate configured at deployment (in basis points), flexible and explicit

### Security Features
- **Reentrancy Attack Protection**: Uses OpenZeppelin's ReentrancyGuard
- **Emergency Mode**: Supports emergency pause and emergency withdrawal (principal only)
- **Pause Mechanism**: Owner can pause contract functions
- **Access Control**: Ownership management based on OpenZeppelin Ownable

## 🏗️ Contract Architecture

### Contract File Structure

```
contracts/
├── implementation/          # Implementation contract directory
│   ├── HSKStaking.sol      # Main implementation contract (core staking logic)
│   └── StakingStorage.sol  # Storage layer contract (defines all state variables)
├── constants/               # Constants definition directory
│   └── StakingConstants.sol # Staking constants (lock period, precision, etc.)
├── interfaces/              # Interface definition directory
│   └── IStake.sol          # Staking interface definition
└── StakingProxy.sol          # Staking proxy contract
```

### Contract Inheritance

```
HSKStaking (Main Implementation Contract)
├── IStaking (Interface Definition)
├── StakingStorage (Storage Layer)
│   ├── Initializable (Initialization Control)
│   └── Ownable2StepUpgradeable (Two-Step Ownership Management)
├── StakingConstants (Constants Definition)
├── ReentrancyGuardUpgradeable (Reentrancy Protection)
└── PausableUpgradeable (Pause Functionality)

Proxy Contract Architecture
└── StakingProxy (TransparentUpgradeableProxy)
    ├── Points to HSKStaking implementation
    ├── Minimum stake: 1 HSK
    ├── Annual yield: 5% (500 basis points)
    └── Max total staked: 30,000,000 HSK
```

**Architecture Notes**:
- Single staking pool with unified configuration
- Product features are configured through parameters in the `initialize()` function
- Fixed lock period of 365 days is defined by `StakingConstants.LOCK_PERIOD`
- Annual yield rate is set at deployment through the `rewardRate` parameter (basis points: 100% = 10000)
- Maximum total staked amount is 30,000,000 HSK

## 🚀 Quick Start

### Requirements

- Node.js >= 16.0.0
- npm, yarn, or pnpm

### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Configure Environment Variables

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key_here
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

## 📖 Contract Interface

### User Functions

#### `stake() payable → uint256 positionId`
Create a new staking position (fixed 365-day lock period)
- **Parameters**: No parameters, send staking amount via `msg.value`, lock period is fixed at 365 days
- **Returns**: `positionId` - Staking position ID
- **Requirements**: 
  - Current time must be within staking time window (`block.timestamp >= stakeStartTime && block.timestamp < stakeEndTime`)
  - If whitelist mode is enabled, must be a whitelisted user (checked via `whitelistCheck` modifier)
  - Staking amount >= minimum staking amount (`minStakeAmount`)
  - If max total staked is set, total staked + current staking amount <= max total staked
  - Sufficient reward pool balance (`rewardPoolBalance >= actualAccruedRewards + potentialReward`)
  - Contract not paused (`whenNotPaused`)
  - Not in emergency mode (`whenNotEmergency`)
- **Events**: Emits `PositionCreated` event

#### `unstake(uint256 positionId)`
Unstake and withdraw principal and rewards
- **Parameters**: `positionId` - Staking position ID
- **Returns**: Automatically transfers principal and rewards to caller's address
- **Requirements**: 
  - Must be position owner (checked via `validPosition` modifier)
  - Lock period has ended (`block.timestamp >= position.stakedAt + LOCK_PERIOD`, i.e., 365 days)
  - Position not unstaked (`!position.isUnstaked`)
- **Withdrawal Amount**: Principal + all accrued rewards
- **Reentrancy Protection**: Uses `nonReentrant` modifier to prevent reentrancy attacks

#### `claimReward(uint256 positionId) → uint256 reward`
Claim rewards (without unstaking)
- **Parameters**: `positionId` - Staking position ID
- **Returns**: `reward` - Claimed reward amount
- **Requirements**: 
  - Must be position owner (checked via `validPosition` modifier)
  - Must have unclaimed rewards (`reward > 0`)
  - Contract not paused (`whenNotPaused`)
  - Not in emergency mode (`whenNotEmergency`)
- **Reentrancy Protection**: Uses `nonReentrant` modifier to prevent reentrancy attacks

#### `pendingReward(uint256 positionId) view → uint256 reward`
Query pending rewards for any position
- **Parameters**: `positionId` - Staking position ID
- **Returns**: `reward` - Pending reward amount
- **Notes**: 
  - **Anyone can query** - No owner restriction, can query any position's pending reward
  - Returns 0 in emergency mode
  - Returns 0 if position is unstaked
  - Rewards accumulate continuously per second, precise to the second
  - View function, no gas cost for read-only queries

#### `getUserPositionIds(address user) view → uint256[] memory`
Get all staking position IDs for a user
- **Parameters**: `user` - User address
- **Returns**: `uint256[]` - Array of all positionIds for this user
- **Notes**: 
  - Get all IDs in a single call
  - Most efficient method

#### `calculatePotentialReward(uint256 amount) view → uint256`
Calculate potential reward for a specified amount
- **Parameters**: `amount` - Staking amount (wei)
- **Returns**: `uint256` - Potential reward amount after 365-day lock period
- **Notes**: 
  - Used to preview rewards before staking
  - Calculated based on current reward rate

#### `requestEarlyUnstake(uint256 positionId)`
Request early unstake for a position
- **Parameters**: `positionId` - Staking position ID
- **Requirements**: 
  - Must be position owner (checked via `validPosition` modifier)
  - Position not unstaked (`!position.isUnstaked`)
  - Must be within lock period (`block.timestamp < position.stakedAt + LOCK_PERIOD`)
  - Early unstake not already requested (`earlyUnstakeRequestTime[positionId] == 0`)
  - Contract not paused (`whenNotPaused`)
- **Errors**:
  - `"Early unstake already requested"` - If position already has an early unstake request
  - `"Lock period already ended"` - If lock period has ended (should use normal `unstake()`)
  - `AlreadyUnstaked()` - If position is already unstaked
- **Effects**: 
  - Records request time (`earlyUnstakeRequestTime[positionId] = block.timestamp`)
  - Reward calculation stops at request time
- **Events**: Emits `EarlyUnstakeRequested` event
- **Reentrancy Protection**: Uses `nonReentrant` modifier

#### `completeEarlyUnstake(uint256 positionId)`
Complete early unstake after 7-day waiting period
- **Parameters**: `positionId` - Staking position ID
- **Requirements**: 
  - Must be position owner (checked via `validPosition` modifier)
  - Position not unstaked (`!position.isUnstaked`)
  - Early unstake requested (`earlyUnstakeRequestTime[positionId] > 0`)
  - Waiting period completed (`block.timestamp >= requestTime + 7 days`)
  - Contract not paused (`whenNotPaused`)
- **Errors**:
  - `AlreadyUnstaked()` - If position is already unstaked (cannot complete twice)
  - `"Early unstake not requested"` - If no early unstake request exists
  - `"Waiting period not completed"` - If 7-day waiting period has not passed
- **Withdrawal Amount**: 
  - Principal (may be reduced if excess rewards claimed)
  - 50% of calculated rewards (based on request time)
  - 50% penalty goes to penalty pool
- **Reentrancy Protection**: Uses `nonReentrant` modifier
- **Events**: Emits `EarlyUnstakeCompleted` and `PositionUnstaked` events

### Admin Functions

#### `updateWhitelistBatch(address[] calldata users, bool status)`
Batch update whitelist
- **Parameters**: 
  - `users` - Array of user addresses (max 100)
  - `status` - true to add to whitelist, false to remove from whitelist
- **Requirements**: Only admin can call (`onlyOwner`)
- **Events**: Emits `WhitelistStatusChanged` event for each user with changed status

#### `setWhitelistOnlyMode(bool enabled)`
Enable/disable whitelist mode
- **Parameters**: `enabled` - true to enable whitelist mode, false to disable
- **Requirements**: Only admin can call (`onlyOwner`)
- **Events**: Emits `WhitelistModeChanged` event

#### `setStakeStartTime(uint256 newStartTime)`
Set staking start time
- **Parameters**: `newStartTime` - Staking start timestamp (seconds)
- **Requirements**: 
  - Only admin can call (`onlyOwner`)
  - `newStartTime > 0` - Must be a valid time
  - `newStartTime < stakeEndTime` - Must be earlier than end time
- **Notes**: Users can only start staking after `stakeStartTime`
- **Events**: Emits `StakeStartTimeUpdated` event

#### `setStakeEndTime(uint256 newEndTime)`
Set staking end time
- **Parameters**: `newEndTime` - Staking end timestamp (seconds)
- **Requirements**: 
  - Only admin can call (`onlyOwner`)
  - `newEndTime > block.timestamp` - Must be a future time
  - `newEndTime > stakeStartTime` - Must be later than start time
- **Notes**: Users can only stake before `stakeEndTime`
- **Events**: Emits `StakeEndTimeUpdated` event

#### `setMinStakeAmount(uint256 newAmount)`
Set minimum staking amount
- **Parameters**: `newAmount` - New minimum staking amount (wei)
- **Requirements**: 
  - Only admin can call (`onlyOwner`)
  - Not in emergency mode (`whenNotEmergency`)
- **Events**: Emits `MinStakeAmountUpdated` event

#### `setMaxTotalStaked(uint256 newAmount)`
Set maximum total staked amount
- **Parameters**: `newAmount` - New maximum total staked amount (wei, 0 means unlimited)
- **Requirements**: Only admin can call (`onlyOwner`)
- **Events**: Emits `MaxTotalStakedUpdated` event
- **Notes**: Sets the upper limit for the entire product pool, total staking amount of all users cannot exceed this limit

#### `updateRewardPool() payable`
Deposit to reward pool
- **Parameters**: Send deposit amount via `msg.value`
- **Requirements**: Only admin can call (`onlyOwner`)
- **Effects**: Increases `rewardPoolBalance`
- **Events**: Emits `RewardPoolUpdated` event

#### `withdrawExcessRewardPool(uint256 amount)`
Withdraw excess reward pool funds
- **Parameters**: `amount` - Withdrawal amount
- **Requirements**: 
  - Only admin can call (`onlyOwner`)
  - `rewardPoolBalance >= totalPendingRewards` - Sufficient reward pool balance
  - `amount <= excess` - Cannot withdraw allocated rewards
- **Effects**: Decreases `rewardPoolBalance`, transfers to owner
- **Events**: Emits `RewardPoolUpdated` event

#### `enableEmergencyMode()`
Enable emergency mode (pause reward distribution)
- **Requirements**: Only admin can call (`onlyOwner`)
- **Effects**: 
  - Sets `emergencyMode = true`
  - Pauses reward distribution (all reward-related functions return 0)
  - Prevents new staking
  - Allows emergency withdrawal (principal only)
- **Events**: Emits `EmergencyModeEnabled` event
- **Note**: Current version cannot disable emergency mode once enabled via function, may require contract upgrade

#### `emergencyWithdraw(uint256 positionId)`
Emergency withdrawal (principal only, no rewards)
- **Parameters**: `positionId` - Staking position ID
- **Requirements**: 
  - Must be in emergency mode (`emergencyMode == true`)
  - Must be position owner (`position.owner == msg.sender`)
  - Position not unstaked (`!position.isUnstaked`)
  - **Not subject to lock period restrictions** (can withdraw at any time)
- **Withdrawal Amount**: Principal only, **no rewards**
- **Reentrancy Protection**: Uses `nonReentrant` modifier to prevent reentrancy attacks
- **Events**: Emits `EmergencyWithdrawn` event

#### `distributePenaltyPool(uint256[] calldata positionIds)`
Distribute penalty pool to users who completed full staking period
- **Parameters**: `positionIds` - Array of position IDs eligible for distribution
- **Requirements**: 
  - Only admin can call (`onlyOwner`)
  - Staking period ended (`block.timestamp >= stakeEndTime`)
  - Penalty pool not empty (`penaltyPoolBalance > 0`)
  - All positions must be completed (`position.isCompletedStake == true`)
  - All positions must be unstaked (`position.isUnstaked == true`)
- **Distribution**: Proportional based on staked amounts
- **Reentrancy Protection**: Uses `nonReentrant` modifier
- **Events**: Emits `PenaltyPoolDistributed` event for each distribution

## 🔒 Lock Period and Yield

### Fixed Lock Period

HSKStaking uses a fixed lock period design:

| Parameter | Configuration | Notes |
|-----------|---------------|-------|
| Lock Period | 365 days | Fixed, cannot be modified |
| Yield Rate | 5% | Configured at deployment |

### Reward Calculation Notes

**Important Mechanism**:
- Rewards accumulate continuously per second, precise to the second, can be claimed at any time
- Rewards are only calculated up to the end of the lock period, even if actual staking time is longer

Example:
- Fixed 365-day lock period (5% APY)
- Actually staked for 400 days before withdrawal
- **Important**: Time beyond the lock period does not generate additional rewards, rewards are only calculated up to the end of the lock period

### Design Philosophy

V2 version simplified lock period selection:
- **User-Friendly**: No need to choose lock period, simplifies operation flow
- **Unified Management**: Fixed 365 days, easy for operations and user understanding
- **Clear and Explicit**: Fixed yield rate of 5% APY

## 🔓 Unstake Mechanism

### Unstake (Normal)

**Time Restrictions**:
- Must wait for lock period to fully end (365 days)
- Unlock condition: `block.timestamp >= stakedAt + 365 days`

**Withdrawal Amount**:
- ✅ Principal + all accrued rewards
- Rewards calculated based on actual staking time (but not exceeding lock period)
- Position marked as `isCompletedStake = true` (eligible for penalty pool distribution)

**Example**:
```
Staking time: 2026-11-01 00:00:00
Lock period: 365 days
Unlock time: 2027-11-01 00:00:00

Can withdraw: After 2027-11-01 00:00:00
Withdrawal amount: Principal + rewards within 365 days
```

### Early Unstake

**Process**:
1. **Request**: User calls `requestEarlyUnstake(positionId)` during lock period
2. **Waiting Period**: Must wait 7 days after request
3. **Complete**: After 7 days, call `completeEarlyUnstake(positionId)`

**Penalty**:
- User receives 50% of calculated rewards (based on request time)
- 50% penalty goes to penalty pool
- If user claimed more than 50% before request, excess is deducted from principal
- Rewards calculated up to request time, not completion time

**Example**:
```
Staking time: Day 0
Request early unstake: Day 60
Complete early unstake: Day 67 (after 7-day waiting period)

Rewards calculated: Up to Day 60 only
User receives: 50% of calculated rewards
Penalty pool: 50% of calculated rewards
```

**Important Notes**:
- Reward calculation stops at request time
- Waiting period (7 days) does not generate additional rewards
- Early unstake positions are NOT eligible for penalty pool distribution

### Penalty Pool Distribution

**Mechanism**:
- Penalties from early unstake accumulate in penalty pool
- After staking period ends (`stakeEndTime`), admin distributes penalty pool
- Only users who completed full staking period (via `unstake()`) are eligible
- Distribution is proportional based on staked amounts

**Example**:
```
Penalty pool: 1000 HSK
Completed positions:
  - Position 1: 1000 HSK
  - Position 2: 2000 HSK
  - Position 3: 2000 HSK
Total: 5000 HSK

Distribution:
  - Position 1: 1000 * 1000 / 5000 = 200 HSK
  - Position 2: 1000 * 2000 / 5000 = 400 HSK
  - Position 3: 1000 * 2000 / 5000 = 400 HSK
```

### Emergency Withdrawal

**Trigger Conditions**:
- Admin must enable emergency mode (`enableEmergencyMode()`)
- Not subject to lock period restrictions, can withdraw at any time

**Withdrawal Amount**:
- ✅ Principal only
- ❌ No rewards

**Use Cases**:
- Contract emergency situations
- Need to quickly recover funds
- Give up rewards for early exit

### Summary Comparison

| Withdrawal Method | Time Restrictions | Withdrawable Amount | Penalty | Use Case |
|------------------|-------------------|---------------------|---------|----------|
| Unstake | Lock period ended (365 days) | Principal + rewards | None | Standard situations |
| Early unstake | 7-day waiting period after request | Principal + 50% rewards | 50% penalty | Need early exit |
| Emergency withdrawal | No restrictions (requires emergency mode) | Principal only | 100% penalty (no rewards) | Emergency situations |

### Important Notes

1. **Normal Unstake**: Must wait for the full 365-day lock period, receives full rewards
2. **Early Unstake**: Can request during lock period, incurs 50% penalty, eligible for penalty pool distribution
3. **Rewards can be claimed during lock period**: Although unstaking is not allowed, accumulated rewards can be claimed at any time
4. **Penalty Pool**: Distributed to users who complete full staking period, proportional to staked amounts
5. **Emergency Mode**: Emergency withdrawal function can only be used after admin enables emergency mode

## 💰 Reward Calculation

Reward calculation formula (`HSKStaking._calculateReward`):

```solidity
// Annual rate = rewardRate (basis points) / 10000
// Time ratio = timeElapsed / 365 days
// Reward = principal × (annual rate / 10000) × (timeElapsed / 365 days)
//
// Simplified formula:
// reward = (amount × rewardRate × timeElapsed) / (10000 × 365 days)
```

**Implementation Details**:
```solidity
uint256 annualRate = (rewardRate × PRECISION) / BASIS_POINTS;
uint256 timeRatio = (timeElapsed × PRECISION) / SECONDS_PER_YEAR;
uint256 totalReward = (amount × annualRate × timeRatio) / (PRECISION × PRECISION);
```

**Calculation Characteristics**:
- Rewards accumulate continuously per second, precise to the second
- If `timeElapsed > LOCK_PERIOD`, rewards are only calculated up to `LOCK_PERIOD` end
- Uses 18-decimal precision (`PRECISION = 1e18`) for high-precision calculations
- BASIS_POINTS = 10000 (100% = 10000 basis points)
- SECONDS_PER_YEAR = 365 days = 31,536,000 seconds

## 🛡️ Security Features

### Reentrancy Attack Protection
- Uses OpenZeppelin's `ReentrancyGuardUpgradeable`
- All functions involving fund transfers use `nonReentrant` modifier

### Emergency Mode
- Admin can enable emergency mode
- In emergency mode:
  - Reward distribution is paused
  - Users can only withdraw principal (via `emergencyWithdraw`)
  - New staking is blocked
  - Unstaking (`unstake`) is disabled
- Note: In emergency mode, only `emergencyWithdraw` can be used to withdraw principal (giving up rewards), `unstake` cannot be used

### Pause Mechanism
- Admin can pause contract (`pause()`)
- When paused:
  - Staking function is disabled
  - Reward claiming is disabled
  - Unstaking function is disabled

### Access Control
- **Owner**: Contract owner, responsible for all administrative functions (including upgrades, parameter configuration, etc.)
- Uses OpenZeppelin's Ownable2StepUpgradeable standard implementation (two-step ownership transfer)
- Supports two-step ownership transfer:
  - Step 1: Current owner calls `transferOwnership(newOwner)` to set pending transfer address
  - Step 2: New owner calls `acceptOwnership()` to accept ownership
- Supports renouncing ownership (`renounceOwnership`)
- Advantages: Prevents address errors, provides revocation opportunity, enhances security

## 📝 Deployment Guide

### Deployment

#### Deploy to Testnet

```bash
# Deploy Staking contract (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
```

#### Deploy to Mainnet

```bash
# Deploy Staking contract
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

**Note**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds).

#### Product Configuration

| Feature | Staking |
|---------|---------|
| Target Users | All users |
| Minimum Stake | 1 HSK |
| Annual Yield | 5% |
| Max Total Staked | 30,000,000 HSK |
| Whitelist Mode | Disabled (Open) |

#### Post-Deployment Configuration

**Note**: Deployment scripts require `STAKE_START_TIME` and `STAKE_END_TIME` environment variables. To adjust, use the following scripts:

```bash
# Set staking start time (using environment variables)
START_TIME="1735689600" npm run config:set-start-time:testnet

# Set staking end time (using environment variables)
END_TIME="1767225600" npm run config:set-end-time:testnet
```

Other configurations:


2. **Deposit to reward pool**
   ```bash
   # Staking reward pool
   REWARD_AMOUNT="10000" npm run rewards:add:testnet
   ```

For detailed information, please refer to:
- [Product Plan Documentation](./docs/PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./docs/PRODUCT_SUMMARY.md) - Quick overview
- [Technical FAQ](./docs/TECHNICAL_FAQ.md) - Technical mechanism explanations

### Verify Contracts

```bash
# Verify implementation contract using Foundry (recommended)
IMPLEMENTATION_ADDRESS="0x..." npm run verify:forge:testnet

# Verify Staking implementation contract

```

### Upgrade Contracts

Upgrade scripts automatically detect ProxyAdmin type (contract or EOA) and use the correct method to execute upgrades:

```bash
# Upgrade Staking contract (auto-deploy new implementation, auto-detect ProxyAdmin)
npm run upgrade:testnet

# If ProxyAdmin address differs from current signer, can manually specify
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:testnet

# Use already deployed implementation contract for upgrade
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:testnet


```

**Upgrade Script Features**:
- ✅ Automatically reads actual ProxyAdmin address from storage slot
- ✅ Supports both ProxyAdmin contract and EOA modes
- ✅ Automatically verifies state consistency before and after upgrade
- ✅ Automatically prints browser link after successful upgrade
- ✅ Provides command to verify implementation contract after upgrade

**Upgrade Notes**:
- Ensure new implementation contract is compatible with existing storage layout
- All state data will be preserved after upgrade
- Recommend testing on testnet before upgrading
- Need to verify new implementation contract after upgrade (script will prompt command)

## 🔧 Scripts

### Common Scripts

| Script | Function | npm Command |
|--------|----------|-------------|
| `staking/deploy.ts` | Deploy Staking product | `npm run deploy:testnet` |
| `` |  | `` |
| `staking/stake.ts` | Execute staking | `npm run stake:testnet` |
| `stake.ts` |  | `` |
| `staking/unstake.ts` | Unstake | `npm run unstake:testnet` |
| `staking/claim-rewards.ts` | Claim rewards | `npm run claim:testnet` |
| `staking/request-early-unstake.ts` | Request early unstake | `npm run request-early-unstake:testnet` |
| `staking/complete-early-unstake.ts` | Complete early unstake | `npm run complete-early-unstake:testnet` |
| `staking/distribute-penalty-pool.ts` | Distribute penalty pool | `npm run distribute-penalty-pool:testnet` |
| `staking/query/check-stakes.ts` | Query user staking status | `npm run query:stakes:testnet` |
| `staking/config/set-start-time.ts` | Set staking start time | `npm run config:set-start-time:testnet` |
| `staking/config/set-end-time.ts` | Set staking end time | `npm run config:set-end-time:testnet` |
| `staking/config/set-min-stake.ts` | Set minimum staking amount | `npm run config:set-min-stake:testnet` |
| `staking/config/set-max-total-staked.ts` | Set maximum total staked | `npm run config:set-max-total-staked:testnet` |
| `staking/add-rewards.ts` | Deposit to reward pool | `npm run rewards:add:testnet` |
| `staking/withdraw-excess.ts` | Withdraw excess reward pool funds | `npm run withdraw-excess:testnet` |
| `staking/emergency-withdraw.ts` | Emergency withdraw principal | `npm run emergency-withdraw:testnet` |
| `staking/config/enable-emergency.ts` | Enable emergency mode | `npm run config:enable-emergency:testnet` |

### Query Scripts

| Script | Function | npm Command |
|--------|----------|-------------|
| `staking/query/check-status.ts` | Query contract status | `npm run query:status:testnet` |
| `check-status.ts` |  | `` |
| `staking/query/check-stakes.ts` | Query user staking status | `npm run query:stakes:testnet` |
| `check-stakes.ts` |  | `` |
| `staking/query/pending-reward.ts` | Query pending rewards (for own positions) | `npm run query:pending-reward:testnet` |
| `staking/query/pending-reward-any-user.ts` | Query pending rewards for any user/position | `npm run query:pending-reward-any-user:testnet` |
| `staking/query/position-info.ts` | Query position details | `npm run query:position-info:testnet` |
| `check-whitelist.ts` | Check whitelist status | `` |

## 🧪 Testing

Run test suite:

```bash
npm test
# or
npm run test
```

Run specific test file:

```bash
npm test -- test/staking/staking.test.ts
npm test -- test/whitelist.test.ts
```

Generate test coverage report:

```bash
npm run coverage
# or
npm run dev:coverage
```

### Test Structure

```
test/
├── staking/             # Staking unit tests
│   ├── deployment.test.ts
│   ├── staking.test.ts
│   ├── rewards.test.ts
│   ├── unstaking.test.ts
│   ├── reward-pool.test.ts
│   ├── config.test.ts
│   ├── emergency.test.ts
│   └── edge-cases.test.ts
│   ├── deployment.test.ts
│   ├── staking.test.ts
│   ├── rewards.test.ts
│   ├── unstaking.test.ts
│   ├── reward-pool.test.ts
│   ├── config.test.ts
│   ├── emergency.test.ts
│   ├── edge-cases.test.ts
│   └── whitelist.test.ts
├── e2e/                 # E2E tests
│   ├── user-journey.test.ts
│   └── emergency-scenarios.test.ts
├── performance/         # Performance tests
│   ├── gas-optimization.test.ts
│   ├── batch-operations.test.ts
│   └── stress-test.test.ts
└── helpers/             # Test helper functions
    ├── fixtures.ts
    ├── test-utils.ts
    └── state-sync.ts
```

For detailed testing guide, please refer to: [Testing Guide](./docs/TESTING_GUIDE.md)

## 📊 Network Configuration

### HashKey Testnet
- **Chain ID**: 133
- **RPC URL**: https://hashkeychain-testnet.alt.technology
- **Explorer**: https://hashkeychain-testnet-explorer.alt.technology

### HashKey Mainnet
- **Chain ID**: 177
- **RPC URL**: https://mainnet.hsk.xyz
- **Explorer**: https://explorer.hsk.xyz

## 📚 Tech Stack

- **Solidity**: ^0.8.27
- **Hardhat**: ^3.0.12
- **OpenZeppelin Contracts Upgradeable**: ^5.4.0
- **TypeScript**: ^5.7.3
- **Proxy Pattern**: Transparent Proxy

## 🔍 Contract Version

### Current Version: HSKStaking V2.1.0

**Core Features**:
- **Fixed 365-day lock period**: Simplifies user operations, no need to choose lock period
- **Early unstake mechanism**: Supports early unstake with 50% penalty and 7-day waiting period
- **Penalty pool**: Penalties from early unstake distributed to users who complete full staking period
- **Single proxy architecture**: Single staking pool with unified configuration through `StakingProxy`
- **Transparent Proxy pattern**: Upgrades controlled by ProxyAdmin, secure and reliable
- **Unified implementation contract**: `HSKStaking.sol` as common implementation, configured with different products through initialization parameters
- **Simplified stake() interface**: No need to pass lockPeriod parameter
- **Constants separation**: Constants definitions separated into `StakingConstants.sol`

**Architecture Advantages**:
- **Modular design**: Implementation, storage, constants, interfaces separated, clear and maintainable
- **Reusability**: Same implementation contract supports multiple product instances
- **Independent upgrades**: Proxy contracts can be upgraded independently
- **Flexible configuration**: Different product features configured through initialization parameters

**Version History**:
- V1.0.0 (`staking.sol`): Initial version, supported multiple lock period options
- V2.0.0 (`HSKStaking.sol`): Fixed lock period + single proxy architecture
- V2.1.0 (`HSKStaking.sol`): Added early unstake mechanism with penalty pool distribution

## ⚠️ Important Reminders

1. **Staking Time Window**: Contract supports setting staking start and end times. Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds). Admin can adjust via `setStakeStartTime` and `setStakeEndTime` functions
2. **Reward Calculation Limit**: Rewards are only calculated up to the end of lock period, extra staking time does not increase rewards
3. **Whitelist Mode**: Contract supports whitelist mode, can be configured at deployment. Current configuration has whitelist disabled (open to all users)
4. **Minimum Staking Amount**: Configured as 1 HSK at deployment, can be modified after deployment via `setMinStakeAmount`
5. **Maximum Total Staked**: Configured as 30,000,000 HSK at deployment, can be modified after deployment via `setMaxTotalStaked`. Sets the upper limit for the entire staking pool, total staking amount of all users cannot exceed this limit
6. **Reward Pool**: Ensure reward pool has sufficient funds, otherwise new staking may fail. Contract checks if reward pool balance is sufficient to pay all pending rewards
7. **Reward Pool Withdrawal**: Admin can withdraw excess reward pool funds via `withdrawExcessRewardPool` (amount exceeding totalPendingRewards)
8. **Early Unstake**: Users can request early unstake during lock period, but must wait 7 days and incur 50% penalty. Penalties go to penalty pool, distributed to users who complete full staking period
9. **Penalty Pool Distribution**: Admin distributes penalty pool after staking period ends (`stakeEndTime`), only to users who completed full staking period (via `unstake()`)

### Product Configuration

- **Staking**:
  - Minimum stake: 1 HSK
  - Annual yield: 5%
  - Lock period: 365 days
  - Whitelist: Disabled (Open)
  - Maximum total staked: 30,000,000 HSK (pool limit)

For detailed product plans, please refer to:
- [Product Plan Documentation](./docs/PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./docs/PRODUCT_SUMMARY.md) - Quick overview
- [Product Development Documentation](./docs/PRODUCT_PLANS_DEV.md) - Development team documentation

## 📄 License

MIT License

---

**Note**: This contract has passed security audits, but please conduct thorough testing before deploying to mainnet.

---

## 📚 Related Documentation

### Core Documentation
- [Script Usage Guide](./scripts/README.md) - **Complete script usage guide (recommended)**
- [Script Architecture Documentation](./docs/SCRIPTS_ARCHITECTURE.md) - Detailed script architecture
- [Testing Guide](./docs/TESTING_GUIDE.md) - Test case writing guide
- [Product Plan Documentation](./docs/PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./docs/PRODUCT_SUMMARY.md) - Quick product overview

### Deployment and Development
- [Product Development Documentation](./docs/PRODUCT_PLANS_DEV.md) - Development team documentation

### Reference Documentation
- [Technical FAQ](./docs/TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./docs/ERROR_HANDLING.md) - Common error handling
- [Early Unstake Changelog](./docs/EARLY_UNSTAKE_CHANGELOG.md) - Early unstake feature details

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team
