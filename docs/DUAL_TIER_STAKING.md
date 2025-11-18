# Dual-Tier Staking Product Plan

Based on the existing contract architecture, two different product schemes are implemented by deploying two independent contract instances.

## 📋 Product Overview

### Product 1: Normal Staking (Delegated Staking)
- **Target Users**: General users
- **Minimum Stake**: 1 HSK
- **Annual Yield Rate**: 8% (configured at deployment)
- **Lock Period**: 365 days (fixed)
- **Whitelist Mode**: Disabled (all users can stake freely)

### Product 2: Premium Staking (Premium Staking)
- **Target Users**: Whales/Institutions
- **Minimum Stake**: 500,000 HSK
- **Annual Yield Rate**: 16% (configured at deployment)
- **Lock Period**: 365 days (fixed)
- **Whitelist Mode**: Enabled (requires admin authorization)

## 🚀 Deployment Method

### Method 1: Deploy Separately (Recommended)

#### Deploy Normal Staking
```bash
# Deploy to testnet (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# Deploy to mainnet
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

#### Deploy Premium Staking
```bash
# Deploy to testnet (requires timestamps)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium:testnet

# Deploy to mainnet
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium
```

**Note**: Both products need to be deployed separately, each product has its own proxy contract and configuration.

## 📝 Post-Deployment Configuration

### 1. Add Whitelist Users for Premium Staking

Premium Staking product has whitelist mode enabled and requires manual addition of authorized users:

```bash
# Batch add whitelist (max 100 addresses)
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet

# Batch remove whitelist
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet
```

### 2. Deposit to Reward Pools

Both products need independent reward pools and need to be deposited separately:

```bash
# Deposit for Normal Staking
REWARD_AMOUNT="10000" npm run rewards:add:testnet

# Deposit for Premium Staking
REWARD_AMOUNT="20000" npm run rewards:add:premium:testnet
```

### 3. Verify Configuration

After deployment, you can verify the configuration of both products:

```bash
# Check Normal Staking configuration parameters
npm run query:status:testnet

# Check Premium Staking configuration parameters
npm run query:status:premium:testnet
```

## 💡 Usage Examples

### Normal User Staking (Normal Staking)

```bash
# Use stake script (fixed 365-day lock period)
STAKE_AMOUNT="2000" npm run stake:testnet
```

**Note**: V2 version uses fixed 365-day lock period, no need to specify lock period parameter.

### Whale Staking (Premium Staking)

```bash
# Use stake script (fixed 365-day lock period)
STAKE_AMOUNT="600000" npm run stake:premium:testnet
```

**Note**: V2 version uses fixed 365-day lock period, no need to specify lock period parameter. Must be added to whitelist before staking.

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

### Important Notes

**Important**: HSKStaking uses a fixed lock period design (365 days), lock period modification is not supported.

If different lock periods or yield rate configurations are needed, deploy new contract instances.

### Adjust Maximum Staked Amount

```bash
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet
```

## 📊 Product Comparison

| Feature | Normal Staking | Premium Staking |
|---------|---------------|----------------|
| Target Users | General users | Whales/Institutions |
| Minimum Stake | 1 HSK | 500,000 HSK |
| Annual Yield | 8% (configured at deployment) | 16% (configured at deployment) |
| Whitelist | No | Yes |
| Lock Period | 365 days (fixed) | 365 days (fixed) |
| Maximum Total Staked | 10,000,000 HSK (pool limit) | 20,000,000 HSK (pool limit) |

## ⚠️ Important Reminders

1. **Staking Time Window**: Must provide `STAKE_START_TIME` and `STAKE_END_TIME` environment variables at deployment (Unix timestamp, in seconds). Admin can adjust staking time window via `setStakeStartTime` and `setStakeEndTime` functions
2. **Independent Deployment**: Both products are completely independent contract instances, do not affect each other
3. **Independent Reward Pools**: Each product needs an independent reward pool, need to manage and deposit separately
4. **Whitelist Management**: Premium Staking product has whitelist enabled, admin needs to manually add authorized users
5. **Parameter Configuration**: Parameters can be adjusted via admin functions after deployment, but existing staking positions are not affected
6. **Reward Calculation**: Reward calculation logic is the same, but yield rates differ (8% vs 16%)

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

# Query Premium Staking contract status
npm run query:status:premium:testnet
```

## 📚 Related Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team
