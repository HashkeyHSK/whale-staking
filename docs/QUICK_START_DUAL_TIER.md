# Single-Tier Staking Quick Start Guide

## 🎯 Quick Deployment

### Step 1: Compile Contracts

```bash
npm run compile
# or
npx hardhat compile
```

### Step 2: Deploy Single-Tier Products

**Deploy Separately (Recommended)**

```bash
# Deploy Staking (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# Deploy  (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium:testnet
```

**Note**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds).

After deployment, two contract addresses will be output, please save them:

```bash
# Example output
export NORMAL_STAKING_ADDRESS=0x...
export PREMIUM_STAKING_ADDRESS=0x...
```

### Step 3: Configure  Whitelist

 product requires whitelist authorization:

```bash
# Batch add whitelist (max 100 addresses)
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet

# Batch remove whitelist
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet
```

### Step 4: Deposit to Reward Pools

Both products need independent reward pools:

```bash
# Deposit for Staking (example: 10000 HSK)
REWARD_AMOUNT="10000" npm run rewards:add:testnet

# Deposit for  (example: 20000 HSK)
REWARD_AMOUNT="20000" npm run rewards:add:premium:testnet
```

## 💰 User Staking Examples

### Normal User Staking (Staking)

```bash
# Stake 2000 HSK (fixed 365-day lock period, 5% APY)
STAKE_AMOUNT="2000" npm run stake:testnet
```

### Whale Staking ()

```bash
# Stake 600000 HSK (fixed 365-day lock period, 16% APY)
# Note: Must be added to whitelist first
STAKE_AMOUNT="600000" npm run stake:premium:testnet
```

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

# View  contract status
npm run query:status:premium:testnet
```

**Note**: V2 version uses fixed 365-day lock period, no need to query lock period options.

## ⚙️ Product Configuration Comparison

| Configuration | Staking |  |
|---------------|---------------|----------------|
| Minimum Stake | 1000 HSK | 500,000 HSK |
| Annual Yield | 5% (configured at deployment) | 16% (configured at deployment) |
| Lock Period | 365 days (fixed) | 365 days (fixed) |
| Whitelist | Disabled | Enabled |
| Maximum Total Staked | 30,000,000 HSK (pool limit) | 30,000,000 HSK (pool limit) |

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

### Adjust Maximum Total Staked

```bash
NEW_MAX_TOTAL_STAKED="20000000" npm run config:set-max-total-staked:testnet
```

## 📝 Important Notes

1. **Staking Time Window**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds), can be adjusted via admin functions
2. **Independent Deployment**: Both products are completely independent contract instances
3. **Independent Reward Pools**: Each product needs independent reward pool management and deposits
4. **Whitelist Management**:  must have whitelist enabled, requires admin authorization
5. **Parameters are Irreversible**: Existing staking positions are not affected by configuration updates
6. **Reward Calculation**: Reward calculation logic is the same, but yield rates differ

## 🆘 Common Questions

### Q: How to modify existing scripts to use new contract addresses?

A: Modify contract addresses in scripts, or pass via command line parameters:

```bash
# Use environment variables to specify contract address
NORMAL_STAKING_ADDRESS="<NEW_CONTRACT_ADDRESS>" STAKE_AMOUNT="1000" npm run stake:testnet
```

**Note**: V2 version uses fixed 365-day lock period, no need to specify period parameter.

### Q: How to check whitelist status?

```bash
# Query user whitelist status
USER_ADDRESS="0x..." npm run whitelist:check-user:premium:testnet

# Query whitelist configuration and user status
USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:premium:testnet
```

### Q: How to modify lock period or yield rate?

HSKStaking uses fixed lock period (365 days) and fixed yield rate design, modification is not supported after deployment.

If different lock periods or yield rate configurations are needed, deploy new contract instances.

## 📚 More Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Complete Deployment Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team
