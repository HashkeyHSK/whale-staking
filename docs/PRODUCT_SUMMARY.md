# Single-Tier Staking Product Plan - Executive Summary

## 🎯 Product Overview

| Product | Staking |  |
|---------|---------------|----------------|
| **Positioning** | Delegated Staking |  |
| **Users** | General users | Whales/Institutions |
| **Threshold** | 1 HSK | 500,000 HSK |
| **Yield** | 5% annual (configured at deployment) | 16% annual (configured at deployment) |
| **Participation** | Open (no approval required) | Whitelist (requires approval) |
| **Lock Period** | 365 days (fixed) | 365 days (fixed) |

---

## 📋 Product 1: Staking (Delegated Staking)

### One-Sentence Positioning
Low-threshold staking product for general users, starting from 1 HSK, 5% annual yield.

### Core Mechanisms

**Participation Method**
- ✅ No approval required, all users can participate
- ✅ Minimum stake 1000 HSK
- ✅ Staking time window: Can only stake within the time range set by admin
- ✅ Fixed lock period of 365 days

**Reward Rules**
- ✅ Fixed 5% annual yield rate
- ✅ Rewards calculated based on actual staking days
- ✅ Can claim rewards separately during lock period

**Unlock and Withdrawal Rules**
- 🔒 **During lock period (365 days)**: Cannot unstake, can only claim rewards
- ✅ **After lock period ends (after 365 days)**: Can unstake, withdraw principal + all rewards
- ✅ **Unlock time**: Unlock time = Staking time + 365 days
- ✅ **Reward withdrawal**: Can withdraw accumulated rewards at any time during lock period
- ⚠️ **Reward calculation**: Rewards are only calculated up to the end of lock period (365 days)
- 🚨 **Emergency withdrawal**: Can withdraw principal at any time in emergency mode (giving up rewards)

**Risk Control**
- ✅ Maximum total staked: 30,000,000 HSK (pool limit, not per-transaction limit)
- ✅ Reward pool balance check: Contract checks if reward pool balance is sufficient to pay all pending rewards
- ✅ Emergency mode: Can only withdraw principal in special circumstances

### Target Users
- General retail investors
- Users seeking stable returns
- Small capital holders

---

## 📋 Product 2:  ()

### One-Sentence Positioning
High-yield staking product for whales and institutions, starting from 500,000 HSK, 16% annual yield, requires whitelist approval.

### Core Mechanisms

**Participation Method**
- ✅ Requires whitelist approval
- ✅ Minimum stake 500,000 HSK
- ✅ Staking time window: Can only stake within the time range set by admin
- ✅ Fixed lock period of 365 days

**Reward Rules**
- ✅ Fixed 16% annual yield rate (calculated automatically on-chain)
- ✅ Rewards calculated based on actual staking days
- ✅ Can claim rewards separately during lock period

**Unlock and Withdrawal Rules**
- 🔒 **During lock period (365 days)**: Cannot unstake, can only claim rewards
- ✅ **After lock period ends (after 365 days)**: Can unstake, withdraw principal + all rewards
- ✅ **Unlock time**: Unlock time = Staking time + 365 days
- ✅ **Reward withdrawal**: Can withdraw accumulated rewards at any time during lock period
- ⚠️ **Reward calculation**: Rewards are only calculated up to the end of lock period (365 days)
- 🚨 **Emergency withdrawal**: Can withdraw principal at any time in emergency mode (giving up rewards)

**Risk Control**
- ✅ Maximum total staked: 30,000,000 HSK (pool limit, not per-transaction limit)
- ✅ Reward pool balance check: Contract checks if reward pool balance is sufficient to pay all pending rewards
- ✅ Whitelist approval mechanism
- ✅ Emergency mode: Can only withdraw principal in special circumstances

### Target Users
- Whale investors
- Institutional investors
- Node operators
- High-net-worth users

---

## ⚠️ Important Mechanism Explanations

### 1. Unlock Rules

**Key Points**:
- **During lock period**: Cannot unstake, can only claim rewards
- **After lock period ends**: Can unstake, withdraw principal + all rewards
- **Unlock time**: Unlock time = Staking time + Lock period

**Example**:
- User stakes on 2026-11-01, fixed 365-day lock period
- Unlock time: 2027-11-01 (365 days later)
- During lock period (until 2027-11-01): Can only claim rewards, cannot unstake
- After lock period ends (after 2027-11-01): Can unstake, withdraw principal + all rewards

**Operational Significance**:
- Ensures fund locking, prevents users from exiting too early
- Protects effectiveness of staking mechanism
- Encourages users to hold long-term

### 2. Reward Calculation Rules

**Key Points**: Rewards are only calculated up to the end of lock period, extra time does not increase rewards

**Example**:
- User chooses 365-day lock period, 5% annual yield
- Actually staked for 400 days before withdrawal
- Rewards still calculated based on 365 days
- **Important**: Time beyond lock period does not generate additional rewards, rewards are only calculated up to the end of lock period

**Operational Significance**:
- Encourages users to withdraw on time
- Improves fund turnover efficiency
- Ensures sufficient reward pool funds

### 4. Whitelist Mechanism

**Staking**:
- Whitelist: Disabled
- All users can participate freely

****:
- Whitelist: Enabled
- Only whitelisted users can stake
- Requires admin approval to add

### 5. Reward Pool Management

**Independent Management**:
- Both products have independent reward pools
- Need to manage and deposit separately
- Cannot be used interchangeably

**Fund Requirements**:
- **Staking**: Calculate required rewards based on 5% APY
- ****: Calculate required rewards based on 16% APY (needs more funds)

### 6. Emergency Withdrawal Mechanism

**Mechanism Overview**:
- Only available after admin enables emergency mode
- Allows users to withdraw principal during lock period, but gives up all rewards
- Not subject to lock period restrictions, can withdraw at any time

**Trigger Conditions**:
- Admin must enable emergency mode

**Function Description**:
- **Emergency withdrawal**:
  - Not subject to lock period restrictions, can withdraw at any time
  - Can only withdraw principal, does not include rewards
  - Staking position closes after withdrawal

- **Other restrictions in emergency mode**:
  - Reward distribution paused
  - New staking blocked
  - Normal unstaking function paused

**Use Cases**:
- Contract emergency situations or security risks
- Need to quickly recover user principal
- System maintenance or upgrades
- Unforeseen emergency situations

**Operational Recommendations**:
- ⚠️ Use emergency mode cautiously, only enable in truly emergency situations
- ⚠️ Notify all users promptly that emergency mode has been enabled
- ⚠️ Clearly inform users that emergency withdrawal will give up rewards

---

## 📊 Key Operational Metrics

### Staking
- Total staked amount
- Number of participating users
- Average staking amount
- Reward pool balance
- Lock period distribution

### 
- Total staked amount
- Number of whitelisted users
- Average staking amount
- Reward pool balance (needs more)
- Lock period distribution

---

## 🎯 Operational Recommendations

### Staking
- **Promotion**: Emphasize low threshold, stable returns
- **User Education**: Focus on explaining lock period and reward calculation
- **Reward Pool**: Regular deposits, ensure sufficient funds

### 
- **Promotion**: Targeted invitations to whales and institutions, emphasize high yield (16% annual)
- **Whitelist Management**: Establish approval standards, regular reviews
- **Reward Pool**:
  - High yield requires more fund support (16% APY)
  - Regularly monitor reward pool balance, ensure sufficient funds to pay rewards

---

## 📝 Operational Notes

1. **Reward Pool Management**
   - Both products managed independently
   - Regular balance checks
   - Plan deposits in advance

2. **Whitelist Management**
   - Establish approval standards
   - Regular user reviews
   - Add/remove promptly

3. **User Communication**
   - Publish information promptly
   - Answer questions
   - Provide usage guides

4. **Risk Control**
   - Monitor total staked amount
   - Pay attention to anomalies
   - Develop emergency plans

---

## 🔑 Key Differences Summary

| Dimension | Staking |  |
|-----------|---------------|----------------|
| **Threshold** | Low (1 HSK) | High (500,000 HSK) |
| **Yield** | Stable (5%) | High (16%) |
| **Participation** | Open | Requires approval |
| **Lock Period** | Mainly short-term | Mainly long-term |
| **Users** | General users | Whales/Institutions |
| **Risk** | Low | Medium-High |
| **Fund Requirements** | Less | More |
| **Additional Rewards** | None | None |

---

**For complete documentation, please refer to**: [Product Plan Documentation](./PRODUCT_PLANS.md)

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Single-Tier Product Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

