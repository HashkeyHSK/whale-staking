# HSK Staking Product Documentation

Based on the existing contract architecture, the HSKStaking contract can be deployed with different configuration parameters to create different staking instances.

## 📋 Product Overview

HSKStaking is a single staking contract type that supports flexible configuration through initialization parameters:

- **Contract Type**: HSKStaking (single contract implementation)
- **Lock Period**: 365 days (fixed, defined in contract constant)
- **Configurable Parameters**:
  - Minimum stake amount (`minStakeAmount`)
  - Annual yield rate (`rewardRate` in basis points)
  - Whitelist mode (`whitelistMode` - enables/disables whitelist requirement)
  - Maximum total staked (`maxTotalStaked` - pool limit, 0 means unlimited)
  - Staking time window (`stakeStartTime`, `stakeEndTime`)

## 🚀 Deployment Method

### Deploy Staking Contract Instance

```bash
# Deploy to testnet (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# Deploy to mainnet
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

**Note**: Each deployment creates an independent contract instance with its own proxy contract and configuration. You can deploy multiple instances with different parameters.

## 📝 Configuration Parameters

### Initialization Parameters

When deploying, the contract is initialized with the following parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `minStakeAmount` | Minimum stake amount (in wei) | 1 HSK = 1 * 10^18 wei |
| `rewardRate` | Annual reward rate in basis points | 500 = 5%, 1600 = 16% |
| `stakeStartTime` | Timestamp when staking begins | Unix timestamp |
| `stakeEndTime` | Timestamp when staking ends | Unix timestamp |
| `whitelistMode` | Enable whitelist mode | `false` = open, `true` = whitelist only |
| `maxTotalStaked` | Maximum total staked amount (0 = unlimited) | 30,000,000 HSK = 30M * 10^18 wei |

### Post-Deployment Configuration

#### 1. Whitelist Management (if whitelist mode is enabled)

```bash
# Batch add whitelist (max 100 addresses)
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:testnet

# Batch remove whitelist
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:testnet
```

#### 2. Deposit to Reward Pool

```bash
# Deposit to reward pool
REWARD_AMOUNT="10000" npm run rewards:add:testnet
```

#### 3. Verify Configuration

```bash
# Check contract configuration parameters
npm run query:status:testnet
```

## 💡 Usage Examples

### User Staking

```bash
# Stake tokens (fixed 365-day lock period)
STAKE_AMOUNT="2000" npm run stake:testnet
```

**Note**: HSKStaking uses a fixed 365-day lock period, no need to specify lock period parameter.

### Early Unstake (if needed)

```bash
# Request early unstake
POSITION_ID="1" npm run request-early-unstake:testnet

# Complete early unstake (after 7-day waiting period)
POSITION_ID="1" npm run complete-early-unstake:testnet
```

**Note**: Early unstake incurs a 50% penalty on rewards. The penalty goes to the penalty pool, which is distributed to users who complete the full staking period.

## 🔧 Admin Operations

### Set Staking Time Window

**Set Staking Start Time**:

```bash
START_TIME="1735689600" npm run config:set-start-time:testnet
```

**Notes**:
- Deployment script defaults start time to 7 days after deployment
- Users can only stake after the start time
- Admin can adjust start time at any time

**Set Staking End Time**:

```bash
END_TIME="1767225600" npm run config:set-end-time:testnet
```

**Notes**:
- Users can only stake between `stakeStartTime` and `stakeEndTime`
- End time must be a future time

### Adjust Configuration Parameters

**Set Minimum Stake Amount**:

```bash
NEW_MIN_STAKE_AMOUNT="1000" npm run config:set-min-stake-amount:testnet
```

**Set Maximum Total Staked**:

```bash
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet
```

**Toggle Whitelist Mode**:

```bash
WHITELIST_MODE="true" npm run config:set-whitelist-mode:testnet
```

### Important Notes

**Important**: HSKStaking uses a fixed lock period design (365 days), lock period modification is not supported.

If different lock periods or yield rate configurations are needed, deploy new contract instances with different initialization parameters.

## 🔄 Early Unstake Mechanism

### Overview

Users can request early unstake during the lock period, but must wait 7 days before completing the unstake. Early unstake incurs a 50% penalty on rewards.

### Process

1. **Request Early Unstake**: User calls `requestEarlyUnstake(positionId)`
   - Must be within lock period
   - Reward calculation stops at request time
   - Cannot request twice

2. **Waiting Period**: 7 days after request
   - No new rewards are generated during waiting period
   - User can complete unstake after waiting period

3. **Complete Early Unstake**: User calls `completeEarlyUnstake(positionId)`
   - User receives 50% of calculated rewards
   - 50% penalty goes to penalty pool
   - If user claimed more than 50%, excess is deducted from principal

### Penalty Pool Distribution

- Penalty pool is distributed to users who complete the full staking period (via `unstake()`)
- Distribution happens after staking period ends (`stakeEndTime`)
- Admin calls `distributePenaltyPool()` to distribute penalties proportionally based on staked amounts
- Only positions marked as `isCompletedStake = true` are eligible for penalty pool distribution

## 📊 Contract Features

| Feature | Description |
|---------|-------------|
| Lock Period | 365 days (fixed, contract constant) |
| Reward Calculation | Linear, per-second accumulation |
| Reward Cap | Rewards only calculated up to end of lock period |
| Early Unstake | Supported with 50% penalty and 7-day waiting period |
| Whitelist | Optional, configurable at deployment |
| Emergency Mode | Supported, allows principal withdrawal without rewards |
| Pause Function | Supported, admin can pause/unpause contract |

## ⚠️ Important Reminders

1. **Staking Time Window**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds). Admin can adjust staking time window via `setStakeStartTime` and `setStakeEndTime` functions
2. **Contract Instances**: Each deployment creates an independent contract instance with its own proxy contract and configuration
3. **Reward Pool**: Each instance needs an independent reward pool, need to manage and deposit separately
4. **Whitelist Management**: If whitelist mode is enabled, admin needs to manually add authorized users
5. **Parameter Configuration**: Parameters can be adjusted via admin functions after deployment, but existing staking positions are not affected
6. **Early Unstake**: Early unstake incurs 50% penalty. Penalty pool is distributed to users who complete full staking period

## 🔍 Monitoring and Queries

### Query User Staking Status

```bash
# Query user staking status
npm run query:stakes:testnet

# Query staking status for specific user
USER_ADDRESS="0x..." npm run query:stakes:testnet
```

### Query Contract Status

```bash
# Query contract status
npm run query:status:testnet
```

### Query Pending Rewards

```bash
# Query pending rewards for a position (can query any position, no owner restriction)
POSITION_ID="1" npm run query:pending-reward:testnet

# Query pending rewards for any user/position
POSITION_ID="1" npm run query:pending-reward-any-user:testnet

# Query all positions' pending rewards for a user
USER_ADDRESS="0x..." npm run query:pending-reward-any-user:testnet
```

**Note**: `pendingReward` function can be called by anyone - no need to be the position owner.

## 📚 Related Documentation

- [Main README](../README.md)
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling
- [Early Unstake Changelog](./EARLY_UNSTAKE_CHANGELOG.md) - Early unstake feature details

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team
