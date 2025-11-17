# Dual-Tier Staking Product Plan

## I. Product Overview

This plan is based on the Whale Staking contract architecture, providing two independent product schemes targeting different user groups:

- **Normal Staking (Delegated Staking)**: For general users, low threshold, stable returns
- **Premium Staking (Premium Staking)**: For whales/institutions, high threshold, high returns

---

## II. Product 1: Normal Staking (Delegated Staking)

### Product Positioning
Delegated staking product for general users, lowering participation threshold, providing stable staking returns.

### Target Users
- General retail investors
- Small capital holders
- Users seeking stable returns

### Core Parameters

| Parameter | Configuration | Notes |
|-----------|---------------|-------|
| **Minimum Stake Threshold** | 1 HSK | Minimum amount per user stake |
| **Annual Yield Rate** | 8% | Fixed annual yield rate (configured at deployment) |
| **Lock Period** | 365 days | Fixed 365-day lock period |
| **Whitelist Mode** | Disabled | All users can freely participate in staking |
| **Maximum Total Staked** | 10,000,000 HSK | Upper limit for entire product pool (upper limit for sum of all users' staking amounts, not per-transaction limit) |

### Product Mechanisms

#### 1. Participation Mechanism
- **Open Participation**: No approval required, any user can participate in staking
- **Staking Time Window**: Can only stake within specified time window (start and end times set by admin)
- **Fixed Lock Period**: Lock period fixed at 365 days (no need to choose)
- **Multiple Stakes**: Same user can stake multiple times, creating multiple staking positions

#### 2. Reward Mechanism
- **Fixed Annual Yield**: All lock period options unified to 8% annual yield rate
- **Per-Second Interest**: Rewards accumulate continuously per actual staking seconds, precise to the second
- **Reward Cap**: Rewards only calculated up to end of lock period, extra staking time does not increase rewards

#### 3. Withdrawal Mechanism

**Unlock Rules**:
- **Lock Period Restriction**: During lock period (365 days) cannot unstake, can only claim rewards
- **Unlock Condition**: Can unstake after lock period ends (after 365 days)
- **Unlock Time Calculation**: Unlock time = Staking time + 365 days (e.g., stake on 2026-11-01, unlock time 2027-11-01)

**Withdrawal Methods**:
1. **Reward Claim** (during lock period):
   - Can claim accumulated rewards at any time
   - After claiming rewards, staking position remains
   - Principal continues to be locked, continues to earn rewards

2. **Unstake** (after lock period ends):
   - After lock period ends, can unstake
   - When unstaking, automatically claim principal + all accumulated rewards
   - After unstaking, staking position closes, no longer earns rewards

3. **Emergency Withdrawal** (under special circumstances):
   - Only available after admin enables emergency mode
   - Can withdraw at any time, not subject to lock period restrictions
   - Can only withdraw principal, giving up all rewards

**Withdrawal Amounts**:
- **Reward Claim**: Only claim accumulated reward amount
- **Unstake**: Principal + all accumulated rewards (including unclaimed rewards)
- **Emergency Withdrawal**: Principal only, no rewards

#### 4. Risk Control
- **Minimum Stake Threshold**: Set reasonable participation threshold (minimum amount per stake)
- **Maximum Total Staked Limit**: Upper limit for entire product pool (upper limit for sum of all users' staking amounts), prevents over-concentration, ensures system stability
- **Reward Pool Balance Check**: Contract checks if reward pool balance is sufficient to pay all pending rewards, ensures system stability
- **Emergency Withdrawal Mechanism**: Admin can enable emergency mode under special circumstances, users can withdraw principal at any time (giving up rewards)

### Use Cases
✅ Suitable for users holding HSK long-term  
✅ Investors seeking stable returns  
✅ Small capital participation in staking  
✅ Users not needing high returns but pursuing stability  

### Operational Recommendations
- **Promotion Strategy**: Emphasize low threshold, stable returns, attract general users to participate
- **User Education**: Focus on explaining lock period and return calculation methods
- **Reward Pool Management**: Need to regularly deposit to reward pool, ensure sufficient funds to pay rewards
- **Whale DID Reminder**: When staking amount reaches 50,000 HSK, remind users to mint Whale DID

---

## III. Product 2: Premium Staking (Premium Staking)

### Product Positioning
Premium staking product for whales and institutions, providing high returns but requiring high capital threshold and approval mechanism.

### Target Users
- Whale investors
- Institutional investors
- High-net-worth users

### Core Parameters

| Parameter | Configuration | Notes |
|-----------|---------------|-------|
| **Minimum Stake Threshold** | 500,000 HSK | Minimum amount per user stake (500K HSK) |
| **Annual Yield Rate** | 16% | Fixed annual yield rate (configured at deployment, calculated automatically on-chain) |
| **Lock Period** | 365 days | Fixed 365-day lock period |
| **Whitelist Mode** | Enabled | Only approved users can participate in staking |
| **Maximum Total Staked** | 20,000,000 HSK | Upper limit for entire product pool (upper limit for sum of all users' staking amounts, not per-transaction limit) |

### Product Mechanisms

#### 1. Participation Mechanism
- **Whitelist Approval**: Users need to apply to join whitelist first, can only participate after approval
- **Staking Time Window**: Can only stake within specified time window (start and end times set by admin)
- **High Threshold Setting**: Minimum staking amount is 500K HSK, ensures participating users have sufficient capital strength
- **Fixed Lock Period**: Lock period fixed at 365 days, encourages long-term staking

#### 2. Reward Mechanism

**Reward Rules**:
- **Fixed Annual Yield**: All lock period options unified to 16% annual yield rate (calculated automatically on-chain)
- **Per-Second Interest**: Rewards accumulate continuously per actual staking seconds, precise to the second
- **Reward Cap**: Rewards only calculated up to end of lock period, extra staking time does not increase rewards

#### 3. Withdrawal Mechanism

**Unlock Rules**:
- **Lock Period Restriction**: During lock period (365 days) cannot unstake, can only claim rewards
- **Unlock Condition**: Can unstake after lock period ends (after 365 days)
- **Unlock Time Calculation**: Unlock time = Staking time + 365 days (e.g., stake on 2026-11-01, unlock time 2027-11-01)

**Withdrawal Methods**:
1. **Reward Claim** (during lock period):
   - Can claim accumulated rewards at any time
   - After claiming rewards, staking position remains
   - Principal continues to be locked, continues to earn rewards

2. **Unstake** (after lock period ends):
   - After lock period ends, can unstake
   - When unstaking, automatically claim principal + all accumulated rewards
   - After unstaking, staking position closes, no longer earns rewards

3. **Emergency Withdrawal** (under special circumstances):
   - Only available after admin enables emergency mode
   - Can withdraw at any time, not subject to lock period restrictions
   - Can only withdraw principal, giving up all rewards

**Withdrawal Amounts**:
- **Reward Claim**: Only claim accumulated reward amount
- **Unstake**: Principal + all accumulated rewards
- **Emergency Withdrawal**: Principal only, no rewards

#### 4. Risk Control
- **Whitelist Approval**: Strict user approval mechanism, ensures fund security
- **High Threshold Restriction**: Filters qualified investors through high threshold (minimum amount per stake)
- **Maximum Total Staked Limit**: Upper limit for entire product pool (upper limit for sum of all users' staking amounts), controls product scale, ensures system stability
- **Reward Pool Balance Check**: Contract checks if reward pool balance is sufficient to pay all pending rewards, ensures system stability
- **Emergency Withdrawal Mechanism**: Admin can enable emergency mode under special circumstances, users can withdraw principal at any time (giving up rewards)

### Use Cases
✅ Suitable for users with larger capital  
✅ Investors pursuing high returns  
✅ Users willing to lock long-term  
✅ Approved institutional investors  

### Operational Recommendations
- **Promotion Strategy**: Emphasize high returns (16% annual), high threshold, attract quality whales and institutions
- **Whitelist Management**: Establish complete approval process, ensure whitelist user quality
- **Reward Pool Management**:
  - Need sufficient reward pool fund support (16% APY requires more funds)
  - Regularly monitor reward pool balance, ensure sufficient funds to pay rewards
- **User Communication**: Timely communication with whales, provide exclusive services
- **Whale DID Reminder**: Premium Staking users all meet Whale DID conditions (minimum threshold 500K HSK), timely remind users to mint Whale DID

---

## IV. Product Comparison

| Feature | Normal Staking | Premium Staking |
|---------|---------------|----------------|
| **Target Users** | General users | Whales/Institutions |
| **Minimum Stake** | 1 HSK | 500,000 HSK |
| **Annual Yield** | 8% | 16% |
| **Lock Period** | 365 days | 365 days |
| **Participation Method** | Open (no approval required) | Whitelist (requires approval) |
| **Maximum Total Staked** | 10,000,000 HSK (pool limit) | 20,000,000 HSK (pool limit) |
| **Return Level** | Stable | High returns |

---

## V. Product Design Logic

### Why Design Two Products?

1. **User Segmentation**: Users with different capital amounts have different needs and risk tolerance
2. **Return Differentiation**: Attract different user groups through different return levels
3. **Risk Control**: High-return products need higher thresholds and stricter approval
4. **Fund Management**: Better manage funds of different scales through product segmentation

### Why is Normal Staking 8%?

- **Market Positioning**: 8% is a stable return level, suitable for general users
- **Controllable Risk**: Lower returns mean lower risk and fund requirements
- **User Acceptance**: General users more easily accept stable return levels

### Why is Premium Staking 16%?

- **High Threshold Compensation**: High threshold needs relatively higher returns to attract users
- **Long-Term Locking**: Encourages users to lock funds long-term
- **Risk Premium**: Returns cover higher risks and capital costs
- **Market Positioning**: 16% is a reasonable return level, suitable for whale and institutional investors

### Why Does Premium Staking Need Whitelist?

- **Fund Security**: High-return products need to ensure quality of participating users
- **Risk Control**: Filter qualified investors through approval mechanism
- **Compliance Requirements**: May need to meet certain compliance requirements

---

## VI. Important Mechanism Explanations

### 1. Unlock Mechanism

**Core Rules**:
- **During lock period**: Cannot unstake, can only claim rewards
- **After lock period ends**: Can unstake, withdraw principal + all rewards
- **Unlock time**: Unlock time = Staking time + Lock period

**Unlock Conditions**:
- Must wait for lock period to fully end
- Cannot unstake early during lock period
- Can unstake at any time after lock period ends (no time limit)

**Example**:
- User stakes on 2026-11-01 00:00:00, fixed 365-day lock period
- Unlock time: 2027-11-01 00:00:00 (365 days later)
- During lock period (2026-11-01 to 2027-11-01): Can only claim rewards, cannot unstake
- After lock period ends (after 2027-11-01): Can unstake, withdraw principal + all rewards

**Operational Significance**:
- Ensures fund locking, prevents users from exiting too early
- Protects effectiveness of staking mechanism
- Encourages users to hold long-term

### 2. Reward Calculation Mechanism

**Core Rule**: Rewards only calculated up to end of lock period

**Example**:
- User chooses 365-day lock period, 8% annual yield
- Actually staked for 400 days before withdrawal
- Rewards still calculated based on 365 days: `Principal × 8% × (365/365) = Principal × 8%`
- **Important**: Time beyond lock period does not generate additional rewards, rewards only calculated up to end of lock period

**Operational Significance**:
- Encourages users to withdraw on time, avoids long-term fund occupation
- Improves fund turnover efficiency
- Ensures sufficient reward pool funds

### 3. Whitelist Mechanism

**Normal Staking**:
- Whitelist mode: Disabled
- All users can freely participate
- No approval required

**Premium Staking**:
- Whitelist mode: Enabled
- Only whitelisted users can stake
- Requires admin approval to add

**Operational Recommendations**:
- Establish whitelist approval standards
- Regularly review whitelist users
- Promptly add/remove whitelist users

### 4. Reward Pool Management

**Independent Reward Pools**:
- Both products have independent reward pools
- Need to manage and deposit separately
- Cannot be used interchangeably

**Reward Pool Requirements**:
- **Normal Staking**: Calculate required rewards based on 8% APY
- **Premium Staking**: Calculate required rewards based on 16% APY (needs more funds)

**Operational Recommendations**:
- Regularly check reward pool balance
- Ensure sufficient funds to pay fixed annual rewards (16% APY)
- Plan reward pool deposit schedule in advance

### 5. Emergency Withdrawal Mechanism

**Mechanism Overview**:
- Emergency withdrawal is a withdrawal method under special circumstances
- Only available after admin enables emergency mode
- Allows users to withdraw principal during lock period, but gives up all rewards

**Trigger Conditions**:
- Admin must enable emergency mode
- After emergency mode is enabled, users can use emergency withdrawal function at any time

**Function Description**:
- **Emergency Withdrawal**:
  - Not subject to lock period restrictions, can withdraw at any time
  - Can only withdraw principal, does not include rewards
  - Staking position closes after withdrawal

- **Other Restrictions in Emergency Mode**:
  - Reward distribution paused
  - New staking blocked
  - If unlock conditions are met, can unstake normally but rewards are 0; if not expired, can use emergency withdrawal (principal only)

**Use Cases**:
- Contract emergency situations or security risks
- Need to quickly recover user principal
- System maintenance or upgrades
- Unforeseen emergency situations

**Operation Process**:
1. Admin enables emergency mode
2. System notifies users that emergency mode is enabled
3. Users can choose emergency withdrawal (withdraw principal, give up rewards)
4. After emergency situation is resolved, admin can disable emergency mode

**Operational Recommendations**:
- ⚠️ Use emergency mode cautiously, only enable in truly emergency situations
- ⚠️ Promptly notify all users that emergency mode is enabled
- ⚠️ Develop detailed emergency handling procedures
- ⚠️ Clearly inform users that emergency withdrawal will give up rewards
- ⚠️ Ensure users fully understand consequences of emergency withdrawal

---

## VII. Operational Strategy Recommendations

### Normal Staking Operational Strategy

1. **User Acquisition**
   - Emphasize low threshold (can participate with 1 HSK)
   - Highlight stable returns (8% annual)
   - Reduce participation difficulty (no approval required)

2. **User Retention**
   - Lock period is 365 days
   - Regularly publish return reports
   - Build user community

3. **Reward Pool Management**
   - Regularly monitor reward pool balance
   - Plan deposit schedule in advance
   - Ensure timely reward distribution

### Premium Staking Operational Strategy

1. **User Acquisition**
   - Targeted invitations to whales and institutions
   - Emphasize high returns (16% annual)
   - Provide exclusive services

2. **User Approval**
   - Establish approval standards
   - Verify user qualifications
   - Regularly review whitelist

3. **Reward Pool Management**
   - High returns require more fund support (16% APY)
   - Need stricter fund management
   - Regularly assess reward pool sufficiency

---

## VIII. Key Metrics Monitoring

### Normal Staking Monitoring Metrics

- **Total Staked**: Monitor total staking amount for product
- **User Count**: Count participating users
- **Average Staking Amount**: Understand user staking scale
- **Reward Pool Balance**: Ensure sufficient funds to pay rewards
- **Total Pending Rewards**: Monitor totalPendingRewards, ensure reward pool balance is sufficient

### Premium Staking Monitoring Metrics

- **Total Staked**: Monitor total staking amount for product
- **Whitelist User Count**: Count authorized users
- **Average Staking Amount**: Understand whale staking scale
- **Reward Pool Balance**: Ensure sufficient funds to pay rewards (needs more)
- **Total Pending Rewards**: Monitor totalPendingRewards, ensure reward pool balance is sufficient

---

## IX. Operational Notes

### 1. Reward Pool Management
- ✅ Both products need independent reward pools
- ✅ Regularly check reward pool balance
- ✅ Plan deposit schedule in advance
- ⚠️ Ensure sufficient funds to pay rewards

### 2. Whitelist Management
- ✅ Establish approval standards
- ✅ Regularly review whitelist users
- ✅ Promptly add/remove users
- ⚠️ Ensure approval process transparency

### 3. User Communication
- ✅ Promptly publish product information
- ✅ Answer user questions
- ✅ Provide usage guides
- ⚠️ Keep communication channels open

### 4. Risk Control
- ✅ Monitor product total staked amount and reward pool balance
- ✅ Pay attention to anomalies (insufficient reward pool balance, emergency mode, etc.)
- ✅ Develop emergency plans
- ⚠️ Ensure system stable operation
- ⚠️ Regularly check if reward pool balance is sufficient to pay all pending rewards

---

## X. Product Additional Features

### Whale DID (Decentralized Identity)

**Function Description**:
- Provides exclusive decentralized identity identifier (DID) for users staking ≥ 50,000 HSK
- When user staking amount reaches 50,000 HSK, system automatically reminds user to mint Whale DID
- Users need to actively mint DID, system only provides reminder, does not auto-mint

---

## XI. Summary

The dual-tier Staking product plan meets needs of different user groups through differentiated product design:

- **Normal Staking**: Low threshold, stable returns, targeting general users
- **Premium Staking**: High threshold, high returns, targeting whales and institutions

Through reasonable mechanism design, both ensures product security and provides flexible user experience, providing clear operational strategies and monitoring metrics for operations.

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Dual-Tier Product Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

