# HSK Staking Quick Start Guide

## 🎯 Quick Deployment

### Step 1: Compile Contracts

```bash
npm run compile
# or
npx hardhat compile
```

### Step 2: Deploy Staking Contract

```bash
# Deploy to testnet (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# Deploy to mainnet
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

**Note**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds).

After deployment, contract address will be output, please save it:

```bash
# Example output
export STAKING_ADDRESS=0x...
```

### Step 3: Configure Whitelist (if whitelist mode is enabled)

If the contract was deployed with whitelist mode enabled, you need to add authorized users:

```bash
# Batch add whitelist (max 100 addresses)
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:testnet

# Batch remove whitelist
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:testnet
```

### Step 4: Deposit to Reward Pool

```bash
# Deposit to reward pool (example: 10000 HSK)
REWARD_AMOUNT="10000" npm run rewards:add:testnet
```

## 💰 User Staking Examples

### Staking Tokens

```bash
# Stake tokens (fixed 365-day lock period, minimum: 1 HSK)
STAKE_AMOUNT="100" npm run stake:testnet
```

**Note**: HSKStaking uses a fixed 365-day lock period, no need to specify lock period parameter.

### Early Unstake

```bash
# Request early unstake
POSITION_ID="1" npm run request-early-unstake:testnet

# Complete early unstake (after 7-day waiting period)
POSITION_ID="1" npm run complete-early-unstake:testnet
```

**Note**: Early unstake incurs a 50% penalty on rewards. The penalty goes to the penalty pool, which is distributed to users who complete the full staking period.

## 📊 Queries and Monitoring

### Query User Staking Status

```bash
# Query user staking status
npm run query:stakes:testnet

# Query staking status for specific user
USER_ADDRESS="0x..." npm run query:stakes:testnet
```

### Query Contract Configuration

```bash
# View contract status and configuration
npm run query:status:testnet
```

**Note**: HSKStaking uses fixed 365-day lock period, no need to query lock period options.

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

## 🔧 Admin Operations

### Adjust Staking Time Window

**Set Staking Start Time**:

```bash
# Set staking start time (using Unix timestamp)
START_TIME="1735689600" npm run config:set-start-time:testnet
```

**Note**: Must provide `STAKE_START_TIME` environment variable at deployment, can be adjusted via this script.

**Set Staking End Time**:

```bash
# Set staking end time (using Unix timestamp)
END_TIME="1767225600" npm run config:set-end-time:testnet
```

### Adjust Configuration Parameters

**Set Minimum Stake Amount**:

```bash
NEW_MIN_STAKE_AMOUNT="1000" npm run config:set-min-stake-amount:testnet
```

**Set Maximum Total Staked**:

```bash
NEW_MAX_TOTAL_STAKED="20000000" npm run config:set-max-total-staked:testnet
```

**Toggle Whitelist Mode**:

```bash
WHITELIST_MODE="true" npm run config:set-whitelist-mode:testnet
```

### Distribute Penalty Pool

After staking period ends, admin can distribute penalty pool to users who completed full staking period:

```bash
# Distribute penalty pool (requires position IDs)
POSITION_IDS="1,2,3" npm run distribute-penalty-pool:testnet
```

**Note**: Only positions that completed full staking period (via `unstake()`) are eligible for penalty pool distribution.

## 📝 Important Notes

1. **Staking Time Window**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds), can be adjusted via admin functions
2. **Contract Instances**: Each deployment creates an independent contract instance with its own proxy contract and configuration
3. **Reward Pool**: Each instance needs an independent reward pool, need to manage and deposit separately
4. **Whitelist Management**: If whitelist mode is enabled, admin needs to manually add authorized users
5. **Parameters are Irreversible**: Existing staking positions are not affected by configuration updates
6. **Early Unstake**: Early unstake incurs 50% penalty. Penalty pool is distributed to users who complete full staking period
7. **Lock Period**: HSKStaking uses fixed lock period (365 days), modification is not supported after deployment

## 🆘 Common Questions

### Q: How to modify existing scripts to use new contract addresses?

A: Modify contract addresses in scripts, or pass via command line parameters:

```bash
# Use environment variables to specify contract address
STAKING_ADDRESS="<NEW_CONTRACT_ADDRESS>" STAKE_AMOUNT="1000" npm run stake:testnet
```

**Note**: HSKStaking uses fixed 365-day lock period, no need to specify period parameter.

### Q: How to check whitelist status?

```bash
# Query user whitelist status
USER_ADDRESS="0x..." npm run whitelist:check-user:testnet

# Query whitelist configuration and user status
USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:testnet
```

### Q: How to modify lock period or yield rate?

HSKStaking uses fixed lock period (365 days) design. Lock period modification is not supported after deployment.

If different lock periods or yield rate configurations are needed, deploy new contract instances with different initialization parameters.

### Q: How does early unstake work?

1. **Request**: User calls `requestEarlyUnstake(positionId)` during lock period
2. **Waiting Period**: Must wait 7 days after request
3. **Complete**: After 7 days, user calls `completeEarlyUnstake(positionId)`
4. **Penalty**: User receives 50% of calculated rewards, 50% goes to penalty pool
5. **Reward Calculation**: Rewards calculated up to request time, not completion time

### Q: Who gets the penalty pool?

Penalty pool is distributed to users who complete the full staking period (via `unstake()`). Distribution happens after staking period ends (`stakeEndTime`), and admin calls `distributePenaltyPool()` to distribute proportionally based on staked amounts.

## 📚 More Documentation

- [Main README](../README.md)
- [HSK Staking Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling
- [Early Unstake Changelog](./EARLY_UNSTAKE_CHANGELOG.md) - Early unstake feature details

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team
