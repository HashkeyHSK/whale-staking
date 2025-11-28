# Scripts Directory Organization Plan

## 📋 Objective

Separate the `scripts/` directory by Staking and  to improve code organization and maintainability.

## ⚠️ Important Notes - Contract Architecture

Before starting, please understand the following key information:

### Contract Architecture Features

1. **Contract Structure**: 
   - `HSKStaking.sol` - Main implementation contract (inherits StakingStorage, StakingConstants, ReentrancyGuardUpgradeable, PausableUpgradeable)
   - `StakingStorage.sol` - Storage layer (inherits Initializable, Ownable2StepUpgradeable)
   - `StakingConstants.sol` - Constant definitions contract
   - `IStake.sol` - Interface definition
   - `StakingProxy.sol` / `.sol` - Proxy contracts

2. **Proxy Pattern**: Transparent Proxy (using OpenZeppelin's `TransparentUpgradeableProxy`)
   - Can independently upgrade Normal and Premium staking pools
   - ProxyAdmin used to manage proxy contract upgrades

3. **Native Token**: HSK is the chain's native token (native token), similar to ETH, not an ERC20 token
   - Uses `msg.value` to receive stakes
   - Uses `call{value: amount}("")` to send tokens

4. **Lock Period**: Fixed 365 days (`LOCK_PERIOD = 365 days`), defined in contract constants, cannot be dynamically modified

5. **Reward Rate**: Configured at contract level (`rewardRate` state variable), all positions share the same reward rate
   - Expressed in basis points (500 = 5%, )
   - `BASIS_POINTS = 10000` (100% = 10000)

6. **Position Structure**: 
   
   ⚠️ **Note**: Position does not contain `lockPeriod` and `rewardRate`, these are contract-level configurations.

7. **Contract Constants** (StakingConstants.sol):
   

### Key Contract Functions

**Staking Operations**
- `stake() external payable returns (uint256)`: 
  - Stake HSK, send native token using `msg.value`
  - No need to pass lockPeriod parameter (fixed 365 days)
  - Returns positionId
  - Requires: not paused, within staking time range, meets whitelist requirements (if enabled), not in emergency mode
- `unstake(uint256 positionId) external`: 
  - Unstake, automatically claim all accumulated rewards and return principal
  - Requires lock period expired (365 days) and position not unstaked
- `claimReward(uint256 positionId) external returns (uint256)`: 
  - Claim rewards for specified position, does not unstake
  - Requires: not paused, not in emergency mode
  - Returns claimed reward amount
- `pendingReward(uint256 positionId) external view returns (uint256)`: 
  - Query pending rewards for specified position (read-only function)
  - Can be called by anyone - no owner restriction
  - Returns 0 in emergency mode or if position is unstaked
- `emergencyWithdraw(uint256 positionId) external`: 
  - Emergency withdraw principal (only available in emergency mode)
  - No rewards, only returns principal
  - Updates totalPendingRewards and cachedAccruedRewards

**Reward Pool Management**
- `updateRewardPool() external payable`: 
  - Add funds to reward pool, send HSK using `msg.value`
  - Owner only
  - Triggers `RewardPoolUpdated` event
- `withdrawExcessRewardPool(uint256 amount) external`: 
  - Withdraw excess reward pool funds (portion exceeding totalPendingRewards)
  - Owner only
  - Cannot withdraw reserved rewards

**Whitelist Management**
- `updateWhitelistBatch(address[] calldata users, bool status) external`: 
  - Batch update whitelist (max 100 addresses)
  - Owner only
  - `status = true` to add, `status = false` to remove
  - Triggers `WhitelistStatusChanged` event
- `setWhitelistOnlyMode(bool enabled) external`: 
  - Enable/disable whitelist mode
  - Owner only
  - Triggers `WhitelistModeChanged` event

**Contract Configuration**
- `setMinStakeAmount(uint256 newAmount) external`: 
  - Set minimum staking amount
  - Owner only, callable when not in emergency mode
- `setStakeStartTime(uint256 newStartTime) external`: 
  - Set staking start time
  - Requires > 0 and < stakeEndTime
  - Owner only
- `setStakeEndTime(uint256 newEndTime) external`: 
  - Set staking end time
  - Requires > block.timestamp and > stakeStartTime
  - Owner only
- `pause() external`: 
  - Pause contract (prohibits new staking and reward claiming)
  - Owner only
- `unpause() external`: 
  - Resume contract
  - Owner only
- `enableEmergencyMode() external`: 
  - Enable emergency mode (irreversible)
  - After enabling, users can only call `emergencyWithdraw` to withdraw principal
  - Owner only

**State Queries**
- `positions(uint256 positionId)`: Query position details
- `getUserPositionIds(address user)`: Query all positionId array for user (recommended method)
- `whitelisted(address user)`: Query if user is in whitelist
- `minStakeAmount()`: Query minimum staking amount
- `rewardRate()`: Query reward rate (basis points)
- `totalStaked()`: Query total staked amount
- `rewardPoolBalance()`: Query reward pool balance
- `totalPendingRewards()`: Query total pending rewards
- `stakeStartTime()`: Query staking start time
- `stakeEndTime()`: Query staking end time
- `onlyWhitelistCanStake()`: Query if whitelist mode is enabled
- `emergencyMode()`: Query if in emergency mode
- `paused()`: Query if paused

**Contract Events**
- `PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint256 lockPeriod, uint256 timestamp)`: Staking created
- `PositionUnstaked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: Unstaked
- `RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: Reward claimed
- `StakingPaused(address indexed operator, uint256 timestamp)`: Contract paused
- `StakingUnpaused(address indexed operator, uint256 timestamp)`: Contract resumed
- `EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: Emergency withdrawal
- `WhitelistStatusChanged(address indexed user, bool status)`: Whitelist status changed
- `WhitelistModeChanged(bool oldMode, bool newMode)`: Whitelist mode changed
- `RewardPoolUpdated(uint256 newBalance)`: Reward pool updated
- `StakeStartTimeUpdated(uint256 oldStartTime, uint256 newStartTime)`: Start time updated
- `StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime)`: End time updated
- `MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount)`: Minimum staking amount updated
- `EmergencyModeEnabled(address indexed operator, uint256 timestamp)`: Emergency mode enabled
- `Received(address indexed sender, uint256 amount)`: Received native token

**Custom Errors**
- `AlreadyUnstaked()`: Position already unstaked
- `StillLocked()`: Still in lock period
- `NoReward()`: No rewards to claim
- `PositionNotFound()`: Position does not exist or does not belong to caller
- `NotWhitelisted()`: Not in whitelist

### Initialization Parameters

**Parameter Description**:
- `_minStakeAmount`: Minimum staking amount (wei unit)
  - Staking: 1 HSK = `1e18` wei
  - : 500,000 HSK = `500000e18` wei
- `_rewardRate`: Annual yield rate (basis points)
  - Staking: 500 (5% APY)
  - : 1600 (16% APY)
- `_stakeStartTime`: Staking start time (Unix timestamp)
- `_stakeEndTime`: Staking end time (Unix timestamp)
- `_whitelistMode`: Whitelist mode
  - ✅ **Staking**: `false` (all users can stake)
  - ✅ ****: `true` (only whitelisted users can stake)

**Whitelist Mode Design**:

Now can directly specify whitelist mode at initialization, no need to manually modify after deployment:

**Subsequent Operations**:
- **Staking**: No additional operations needed, can start staking after deployment
- ****: Use `updateWhitelistBatch(addresses, true)` to add authorized users

---

## 🏗️ Current Directory Structure

```
scripts/
├── README.md                 # Usage guide
├── shared/                   # Shared modules
│   ├── constants.ts          # Configuration and addresses
│   ├── types.ts              # Type definitions
│   ├── helpers.ts            # Helper functions
│   └── utils.ts              # Utility functions
├── normal/                   # Normal staking scripts
│   ├── deploy.ts             # Deploy contract
│   ├── upgrade.ts            # Upgrade contract
│   ├── stake.ts              # Staking operation
│   ├── unstake.ts            # Unstake
│   ├── claim-rewards.ts      # Claim rewards
│   ├── add-rewards.ts        # Add reward pool
│   ├── emergency-withdraw.ts # Emergency withdraw principal
│   ├── withdraw-excess.ts    # Withdraw excess rewards
│   ├── verify-forge.ts       # Verify contract
│   ├── config/               # Configuration management
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   ├── enable-emergency.ts
│   │   ├── transfer-ownership.ts  # Step 1: Initiate ownership transfer
│   │   └── accept-ownership.ts     # Step 2: Accept ownership transfer
│   └── query/                # State queries
│       ├── check-status.ts
│       ├── check-stakes.ts
│       ├── pending-reward.ts
│       └── pending-reward-any-user.ts
├── premium/                  # Premium staking scripts (✅ Completed)
│   ├── deploy.ts             # Deploy contract
│   ├── upgrade.ts            # Upgrade contract
│   ├── stake.ts              # Staking operation (requires whitelist)
│   ├── unstake.ts            # Unstake
│   ├── claim-rewards.ts      # Claim rewards
│   ├── add-rewards.ts        # Add reward pool
│   ├── emergency-withdraw.ts # Emergency withdraw principal
│   ├── withdraw-excess.ts    # Withdraw excess rewards
│   ├── verify-forge.ts       # Verify contract
│   ├── whitelist/            # Whitelist management
│   │   ├── add-batch.ts
│   │   ├── remove-batch.ts
│   │   ├── check-user.ts
│   │   └── toggle-mode.ts
│   ├── config/               # Configuration management
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   ├── enable-emergency.ts
│   │   ├── transfer-ownership.ts  # Step 1: Initiate ownership transfer
│   │   └── accept-ownership.ts     # Step 2: Accept ownership transfer
│   └── query/                # State queries
│       ├── check-status.ts
│       ├── check-stakes.ts
│       ├── pending-reward.ts
│       ├── pending-reward-any-user.ts
│       └── check-whitelist.ts
├── dev/                      # Development scripts
│   ├── compile.ts            # Compile contracts
│   ├── clean.ts              # Clean build artifacts
│   ├── test-all.ts           # Run all tests
│   └── coverage.ts           # Generate coverage report
├── test/                     # Test scripts
│   ├── helpers/              # Test helper functions
│   │   ├── fixtures.ts       # Test fixtures
│   │   └── test-utils.ts     # Test utilities
│   └── integration/          # Integration tests
│       ├── deploy-test.ts
│       ├── stake-test.ts
│       └── whitelist-test.ts
└── tools/                    # Tool scripts
    ├── extract-abi.ts        # Extract ABI
    ├── generate-types.ts      # Generate types
    └── compare-contracts.ts   # Compare contracts
```

**Notes**:
- ✅ Staking related scripts completed (14 scripts)
- ✅  related scripts completed (23 scripts, including whitelist management)
- ✅ Test scripts completed (5 scripts, including  test support)
- ✅ Development scripts completed (4 scripts)
- ✅ Tool scripts completed (3 scripts)

** Scripts Include**:
- Basic operation scripts: 9 scripts
- Whitelist management scripts: 4 scripts
- Configuration management scripts: 6 scripts
- Query scripts: 4 scripts

---

## 📊 Script Mapping Table

The following table lists script completion status:

### Staking Scripts (✅ Completed)

| Script File | Status | Description |
|------------|--------|-------------|
| `scripts/staking/deploy.ts` | ✅ Completed | Deploy normal staking contract |
| `scripts/staking/stake.ts` | ✅ Completed | Staking operation |
| `scripts/staking/unstake.ts` | ✅ Completed | Unstake |
| `scripts/staking/claim-rewards.ts` | ✅ Completed | Claim rewards |
| `scripts/staking/add-rewards.ts` | ✅ Completed | Add reward pool |
| `scripts/staking/emergency-withdraw.ts` | ✅ Completed | Emergency withdraw principal |
| `scripts/staking/withdraw-excess.ts` | ✅ Completed | Withdraw excess rewards |
| `scripts/staking/verify-forge.ts` | ✅ Completed | Verify contract (using Foundry) |
| `scripts/staking/config/pause.ts` | ✅ Completed | Pause contract |
| `scripts/staking/config/unpause.ts` | ✅ Completed | Resume contract |
| `scripts/staking/config/set-start-time.ts` | ✅ Completed | Set start time |
| `scripts/staking/config/set-end-time.ts` | ✅ Completed | Set end time |
| `scripts/staking/config/set-min-stake.ts` | ✅ Completed | Set minimum staking amount |
| `scripts/staking/config/enable-emergency.ts` | ✅ Completed | Enable emergency mode |
| `scripts/staking/config/transfer-ownership.ts` | ✅ Completed | Step 1: Initiate ownership transfer |
| `scripts/staking/config/accept-ownership.ts` | ✅ Completed | Step 2: Accept ownership transfer |
| `scripts/staking/query/check-status.ts` | ✅ Completed | Query contract status |
| `scripts/staking/query/check-stakes.ts` | ✅ Completed | Query staking information |
| `scripts/staking/query/pending-reward.ts` | ✅ Completed | Query pending rewards (for own positions) |
| `scripts/staking/query/pending-reward-any-user.ts` | ✅ Completed | Query pending rewards for any user/position |
| `scripts/staking/upgrade.ts` | ✅ Completed | Upgrade contract |

### Shared Modules (✅ Completed)

| Script File | Status | Description |
|------------|--------|-------------|
| `scripts/shared/constants.ts` | ✅ Completed | Configuration and addresses |
| `scripts/shared/types.ts` | ✅ Completed | Type definitions |
| `scripts/shared/helpers.ts` | ✅ Completed | Helper functions |
| `scripts/shared/utils.ts` | ✅ Completed | Utility functions |

###  Scripts (✅ Completed)

**Architecture Support Status**: ✅ Completed
- Shared modules fully support 
- `PREMIUM_STAKING_CONFIG` defined
- `getStakingAddress(StakingType.PREMIUM, network)` implemented
- Test scripts include  test support

**Script Implementation Status**: ✅ Completed

| Script File | Status | Description |
|------------|--------|-------------|
| `/deploy.ts` | ✅ Completed | Deploy premium staking contract |
| `/stake.ts` | ✅ Completed | Staking operation (requires whitelist check) |
| `/unstake.ts` | ✅ Completed | Unstake |
| `/claim-rewards.ts` | ✅ Completed | Claim rewards |
| `/add-rewards.ts` | ✅ Completed | Add reward pool |
| `/emergency-withdraw.ts` | ✅ Completed | Emergency withdraw principal |
| `/withdraw-excess.ts` | ✅ Completed | Withdraw excess rewards |
| `/verify-forge.ts` | ✅ Completed | Verify contract |
| `/upgrade.ts` | ✅ Completed | Upgrade contract |
| `/whitelist/add-batch.ts` | ✅ Completed | Batch add whitelist |
| `/whitelist/remove-batch.ts` | ✅ Completed | Batch remove whitelist |
| `/whitelist/check-user.ts` | ✅ Completed | Query user whitelist status |
| `/whitelist/toggle-mode.ts` | ✅ Completed | Toggle whitelist mode |
| `/config/pause.ts` | ✅ Completed | Pause contract |
| `/config/unpause.ts` | ✅ Completed | Resume contract |
| `/config/set-start-time.ts` | ✅ Completed | Set start time |
| `/config/set-end-time.ts` | ✅ Completed | Set end time |
| `/config/set-min-stake.ts` | ✅ Completed | Set minimum staking amount |
| `/config/enable-emergency.ts` | ✅ Completed | Enable emergency mode |
| `/config/transfer-ownership.ts` | ✅ Completed | Step 1: Initiate ownership transfer |
| `/config/accept-ownership.ts` | ✅ Completed | Step 2: Accept ownership transfer |
| `/query/check-status.ts` | ✅ Completed | Query contract status |
| `/query/check-stakes.ts` | ✅ Completed | Query staking information |
| `/query/pending-reward.ts` | ✅ Completed | Query pending rewards (for own positions) |
| `/query/pending-reward-any-user.ts` | ✅ Completed | Query pending rewards for any user/position |
| `/query/check-whitelist.ts` | ✅ Completed | Query whitelist configuration |

### Development Scripts (✅ Completed)

| Script File | Status | Description |
|------------|--------|-------------|
| `scripts/dev/compile.ts` | ✅ Completed | Compile contracts |
| `scripts/dev/clean.ts` | ✅ Completed | Clean build artifacts |
| `scripts/dev/coverage.ts` | ✅ Completed | Generate test coverage report |
| `scripts/dev/test-all.ts` | ✅ Completed | Run all tests |

### Test Scripts (✅ Completed)

| Script File | Status | Description |
|------------|--------|-------------|
| `scripts/test/helpers/fixtures.ts` | ✅ Completed | Test fixtures and helper functions |
| `scripts/test/helpers/test-utils.ts` | ✅ Completed | Test utility functions |
| `scripts/test/integration/deploy-test.ts` | ✅ Completed | Deployment integration test |
| `scripts/test/integration/stake-test.ts` | ✅ Completed | Staking operation integration test |
| `scripts/test/integration/whitelist-test.ts` | ✅ Completed | Whitelist functionality integration test |

### Tool Scripts (✅ Completed)

| Script File | Status | Description |
|------------|--------|-------------|
| `scripts/tools/extract-abi.ts` | ✅ Completed | Extract ABI |
| `scripts/tools/generate-types.ts` | ✅ Completed | Generate TypeScript types |
| `scripts/tools/compare-contracts.ts` | ✅ Completed | Compare contract differences |

### ✅ Script Completion Summary

**Currently Implemented**: 57 script files

- ✅ Staking: 14 scripts (including upgrade.ts)
- ✅ : 23 scripts (including upgrade.ts and whitelist management)
- ✅ Development scripts: 4 scripts
- ✅ Test scripts: 5 scripts (including  test support)
- ✅ Tool scripts: 3 scripts
- ✅ Shared modules: 4 files (fully support )

** Script Categories**:
- ✅ Basic operation scripts: 9 scripts (deploy, upgrade, stake, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge)
- ✅ Whitelist management scripts: 4 scripts (add-batch, remove-batch, check-user, toggle-mode)
- ✅ Configuration management scripts: 6 scripts (pause, unpause, set-start-time, set-end-time, set-min-stake, enable-emergency)
- ✅ Query scripts: 5 scripts (check-status, check-stakes, pending-reward, pending-reward-any-user, check-whitelist)

**Architecture Support Status**:
- ✅  configuration defined (`PREMIUM_STAKING_CONFIG`)
- ✅  address management implemented (`getStakingAddress`)
- ✅  type definitions implemented (`StakingType.PREMIUM`)
- ✅  test support implemented (`fixtures.ts`)
- ✅  all scripts implemented (23 scripts)

---

## 📦 Implementation Plan

The following content can serve as reference for  implementation.

### Step 1: Create Shared Modules (✅ Completed)

#### 1. `scripts/shared/constants.ts` (✅ Completed)

#### 2. `scripts/shared/types.ts`

#### 3. `scripts/shared/helpers.ts`

#### 4. `scripts/shared/utils.ts` (✅ Completed)

General utility functions are located in `scripts/shared/utils.ts`.

---

### Step 2: Implement Staking Scripts (✅ Completed)

#### 1. `scripts/staking/deploy.ts` (✅ Completed)

#### 2. `scripts/staking/stake.ts`

#### 3. `scripts/staking/add-rewards.ts`

#### 4. `scripts/staking/query/check-status.ts`

---

### Step 3: Implement  Scripts (✅ Completed)

Premium staking scripts are similar to normal staking but require additional whitelist management functionality. Completed by referencing Staking implementation.

#### 1. `/deploy.ts` (✅ Completed)

Similar to `scripts/staking/deploy.ts`, uses `PREMIUM_STAKING_CONFIG`, and enables whitelist mode.

#### 2. `/whitelist/add-batch.ts` (✅ Completed)

#### 3. `/whitelist/remove-batch.ts` (✅ Completed)

#### 4. `/whitelist/toggle-mode.ts` (✅ Completed)

#### 5. `/whitelist/check-user.ts` (✅ Completed)

---

### Step 4: Create Development and Test Scripts

#### 1. `scripts/dev/compile.ts`

#### 2. `scripts/dev/clean.ts`

#### 3. `scripts/dev/test-all.ts`

#### 4. `scripts/dev/coverage.ts`

#### 5. `scripts/test/helpers/fixtures.ts`

#### 6. `scripts/test/helpers/test-utils.ts`

#### 7. `scripts/test/integration/deploy-test.ts`

#### 8. `scripts/test/integration/stake-test.ts`

#### 9. `scripts/test/integration/whitelist-test.ts`

#### 10. Tool Scripts

- `scripts/tools/extract-abi.ts` - Extract ABI (TypeScript)

---

## 📝 Implementation Steps

### Step 1: Create Directory Structure

### Step 2: Create Shared Modules

1. Create `scripts/shared/constants.ts`
2. Create `scripts/shared/types.ts`
3. Create `scripts/shared/helpers.ts`
4. Create `scripts/shared/utils.ts`

### Step 3: Implement Staking Scripts

1. Create `scripts/staking/deploy.ts`
2. Create `scripts/staking/stake.ts`
3. Create `scripts/staking/add-rewards.ts`
4. Create `scripts/staking/upgrade.ts`
5. Create query scripts (under config/ and query/ directories)

### Step 4: Implement  Scripts (✅ Completed)

1. ✅ Create `/deploy.ts`
2. ✅ Create `/stake.ts`
3. ✅ Create whitelist management scripts (under whitelist/ directory, including batch add, batch remove, query, and toggle mode)
4. ✅ Create query scripts (under config/ and query/ directories)
5. ✅ Create all basic operation scripts (upgrade, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge)
6. ✅ Create all configuration management scripts (pause, unpause, set-start-time, set-end-time, set-min-stake, enable-emergency)
7. ✅ Create all query scripts (check-status, check-stakes, pending-reward, pending-reward-any-user, check-whitelist)

### Step 5: Create Development and Test Scripts

1. Create `scripts/dev/compile.ts`
2. Create `scripts/dev/clean.ts`
3. Create `scripts/dev/test-all.ts`
4. Create `scripts/dev/coverage.ts`
5. Create test helper functions:
   - `scripts/test/helpers/fixtures.ts`
   - `scripts/test/helpers/test-utils.ts`
6. Create integration tests:
   - `scripts/test/integration/deploy-test.ts`
   - `scripts/test/integration/stake-test.ts`
   - `scripts/test/integration/whitelist-test.ts`

### Step 6: Create Tool Scripts (✅ Completed)

1. ✅ Create `scripts/tools/extract-abi.ts` (TypeScript)
2. ✅ Create `scripts/tools/generate-types.ts`
3. ✅ Create `scripts/tools/compare-contracts.ts`

### Step 7: Update package.json scripts

Update script commands in `package.json`:

### Usage Examples

---

## ✅ Verification Checklist

After completion, please verify the following:

### Basic Verification

- [ ] All new scripts compile successfully (`npm run build`)
- [ ] TypeScript type checking passes (no compilation errors)
- [ ] Directory structure conforms to design specifications
- [ ] All files have correct import paths

### Shared Module Verification

- [ ] `scripts/shared/constants.ts` correctly exports constant configurations
- [ ] `scripts/shared/types.ts` correctly defines all types
- [ ] `scripts/shared/helpers.ts` helper functions work correctly
- [ ] `scripts/shared/utils.ts` general utility functions work correctly

### Development Script Verification

- [x] `npm run compile` can successfully compile contracts
- [x] `npm run dev:compile` can successfully compile contracts (via script)
- [x] `npm run clean` can clean build artifacts
- [x] `npm run dev:clean` can clean build artifacts (via script)
- [x] `npm run build` complete build process works correctly
- [x] `npm run dev:test` runs all tests correctly
- [x] `npm run dev:coverage` generates coverage report correctly

### Test Script Verification

- [x] `npm run test` runs all tests correctly
- [x] `npm run dev:test` runs all tests correctly (via script)
- [x] `npm run test:integration:deploy` deployment integration test passes
- [x] `npm run test:integration:stake` staking operation integration test passes
- [x] `npm run test:integration:whitelist` whitelist functionality integration test passes
- [x] `npm run dev:coverage` generates coverage report
- [x] Test helper functions (fixtures, test-utils) work correctly
- [x] All test cases execute correctly

### Deployment Script Verification

- [ ] Staking deployment script can successfully deploy contract
- [ ]  deployment script can successfully deploy contract
- [ ] Deployment scripts correctly configure contract parameters
- [ ] Testnet deployment commands work correctly

### Staking Operation Verification

- [ ] Staking staking script executes correctly
- [ ]  staking script executes correctly
- [ ] Unstaking script works correctly
- [ ] Reward claiming script works correctly
- [ ] Add rewards script works correctly

### Whitelist Management Verification (Premium Exclusive)

- [ ] Batch add users to whitelist works correctly
- [ ] Batch remove users works correctly
- [ ] Query user whitelist status works correctly
- [ ] Toggle whitelist mode works correctly

### Configuration Management Verification

- [ ] Pause/resume contract functionality works correctly
- [ ] Set staking start time works correctly
- [ ] Set staking end time works correctly
- [ ] Configuration script permission checks work correctly

### Query Script Verification

- [ ] Query contract status script works correctly
- [ ] Query staking information script works correctly
- [ ] Query reward information script works correctly
- [ ] Query whitelist configuration script works correctly
- [ ] Data formatting output is correct

### Upgrade and Verification Scripts

- [x] Contract upgrade script can successfully upgrade
- [x] Contract verification script works correctly
- [x] State remains correct after upgrade
- [x] Supports both ProxyAdmin contract and EOA modes
- [x] Pre-upgrade state verification
- [x] Post-upgrade state verification
- [x] Auto-detect ProxyAdmin address (read from storage slot)
- [x] Smart Fallback mechanism (automatically try upgradeAndCall() if upgrade() fails)
- [x] Automatically print browser link after successful upgrade
- [x] Automatically verify implementation address and state consistency

#### Upgrade Script Detailed Description

**`scripts/staking/upgrade.ts`** and **`/upgrade.ts`** implement intelligent upgrade functionality:

**Core Features**:
1. **Auto-detect ProxyAdmin**:
   - Read actual ProxyAdmin address from EIP-1967 storage slot
   - Supports environment variable override (`PROXY_ADMIN_ADDRESS`)
   - Automatically verify if current signer is ProxyAdmin or ProxyAdmin's owner

2. **Single Mode Support**:
   - **ProxyAdmin Contract Mode**: Use OpenZeppelin ProxyAdmin ABI to call `upgrade()` or `upgradeAndCall()`
   - **EOA Mode**: Directly call proxy's `upgradeTo()` or `upgradeToAndCall()`

3. **Smart Fallback**:
   - If `upgrade()` fails, automatically try `upgradeAndCall()` (with empty data)
   - If `upgradeTo()` fails, automatically try `upgradeToAndCall()`

4. **State Verification**:
   - Record all key states before upgrade (totalStaked, rewardPoolBalance, totalPendingRewards, etc.)
   - Verify state consistency after upgrade
   - Verify new implementation address is correctly set

5. **User Friendly**:
   - Automatically print transaction hash and browser link after successful upgrade
   - Prompt command to verify implementation contract after upgrade
   - Clear error messages and warnings

**Usage Examples**:
```bash
# Auto-detect ProxyAdmin (recommended)
npm run upgrade:normal:testnet

# Manually specify ProxyAdmin address
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:normal:testnet

# Use already deployed implementation contract
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:normal:testnet
```

**Notes**:
- Upgrade transaction will appear on ProxyAdmin contract page, not Proxy page
- Ensure new implementation contract is compatible with existing storage layout
- Need to verify new implementation contract after upgrade (script will prompt command)

### Tool Script Verification

- [x] ABI extraction tool works correctly (`npm run tools:extract-abi`)
- [x] TypeScript type generation works correctly (`npm run tools:generate-types`)
- [x] Contract comparison tool works correctly (`npm run tools:compare-contracts`)

### package.json Verification

- [ ] All npm scripts correctly point to new files
- [ ] Command names are clear and understandable
- [ ] Testnet and mainnet commands are clearly separated
- [ ] Environment variable passing works correctly

### Documentation Verification

- [ ] Each subdirectory has README documentation
- [ ] All scripts have comment documentation
- [ ] Usage examples are clear and accurate
- [ ] Documentation is complete

---

## 📚 Additional Recommendations

### 1. Add Configuration File

Create `scripts/config.json` to store environment-related configurations:

### 2. Add Environment Variable Support

Create `.env.example`:

### 3. Add README Files

Add `README.md` in each subdirectory, explaining the purpose and usage of scripts in that directory.

### 4. Add Script Templates

Create script template files to facilitate quick creation of new scripts:

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

