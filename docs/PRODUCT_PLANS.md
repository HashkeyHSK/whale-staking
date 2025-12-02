# HSK Staking Product Plan

## I. Product Overview

This plan is based on the Whale Staking contract architecture, providing a single staking pool for all users:

- **HSK Staking**: Single pool, open to all users, stable returns

---

## II. Product Configuration

### Product Positioning
Single staking pool product for all users, providing stable staking returns with low participation threshold.

### Target Users
- All users (no whitelist required by default)
- Retail investors
- Small and large capital holders
- Users seeking stable returns

### Core Parameters

| Parameter | Configuration | Notes |
|-----------|---------------|-------|
| **Minimum Stake Threshold** | 1 HSK | Minimum amount per user stake |
| **Base Annual Yield Rate** | 5% | Base APY (contract real-time settlement) |
| **Total Expected APY** | Up to 8% | Frontend display (includes loyalty bonus 1%-3%) |
| **Lock Period** | 365 days | Fixed 365-day lock period |
| **Whitelist Mode** | Disabled by default | All users can freely participate in staking |
| **Maximum Total Staked** | 30,000,000 HSK | Upper limit for entire product pool (upper limit for sum of all users' staking amounts, not per-transaction limit) |
| **Staking Window** | Approximately 7 days | Can only stake within specified time window |

### Product Mechanisms

#### 1. Participation Mechanism
- **Open Participation**: No approval required, any user can participate in staking (whitelist disabled by default)
- **Staking Time Window**: Approximately 7 days, can only stake within specified time window (start and end times set by admin)
- **Fixed Lock Period**: Lock period fixed at 365 days (no need to choose)
- **Multiple Stakes**: Same user can stake multiple times, creating multiple staking positions

#### 2. Reward Mechanism
- **Base Annual Yield**: 5% base APY (contract real-time settlement)
- **Total Expected APY**: Up to 8% (frontend display, includes loyalty bonus 1%-3%)
- **Loyalty Bonus**: 1%-3% (off-chain distribution, not in contract)
  - ≥ 1 month and < 6 months: +1% APY
  - ≥ 6 months and < 12 months: +2% APY
  - 12 months (full 365 days): +3% APY
  - **Distribution**: After staking activity ends, proportional distribution based on users' stake amounts in total staking, only for users who completed full staking period (365 days)
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
- **Early Unstake**: Principal + 50% of rewards (50% penalty goes to penalty pool)
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

---

## III. Penalty Pool Distribution Mechanism

### Penalty Pool Source
- All penalties from early unstake (50% of rewards) go to penalty pool
- Penalty pool accumulates in the contract

### Distribution Rules
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible
- **Early Unstake Users**: Cannot receive penalty pool distribution

### Example
- Penalty pool total: 100,000 HSK
- User A staked: 1,000,000 HSK (completed full 365 days)
- User B staked: 500,000 HSK (completed full 365 days)
- Total completed staking: 10,000,000 HSK
- User A distribution: 100,000 × (1,000,000 / 10,000,000) = 10,000 HSK
- User B distribution: 100,000 × (500,000 / 10,000,000) = 5,000 HSK

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
- User chooses 365-day lock period, 5% annual yield
- Actually staked for 400 days before withdrawal
- Rewards still calculated based on 365 days: `Principal × 5% × (365/365) = Principal × 5%`
- **Important**: Time beyond lock period does not generate additional rewards, rewards only calculated up to end of lock period

**Operational Significance**:
- Encourages users to withdraw on time, avoids long-term fund occupation
- Improves fund turnover efficiency
- Ensures sufficient reward pool funds

### 3. Whitelist Mechanism

**Configuration**:
- Whitelist mode: Disabled by default
- All users can freely participate
- No approval required
- Admin can enable whitelist mode if needed

**Operational Recommendations**:
- If whitelist enabled, establish whitelist approval standards
- Regularly review whitelist users
- Promptly add/remove whitelist users

### 4. Reward Pool Management

**Reward Pool Requirements**:
- Calculate required rewards based on 5% base APY
- Need sufficient reward pool fund support
- Contract checks if reward pool balance is sufficient before allowing new stakes

**Operational Recommendations**:
- Regularly check reward pool balance
- Ensure sufficient funds to pay fixed annual rewards (5% base APY)
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

### Operational Strategy

1. **User Acquisition**
   - Emphasize low threshold (can participate with 1 HSK)
   - Highlight stable returns (5% base APY, up to 8% total expected APY)
   - Reduce participation difficulty (no approval required by default)
   - Promote loyalty bonus (1%-3% additional APY)

2. **User Retention**
   - Lock period is 365 days
   - Support early unstake (with penalty)
   - Regularly publish return reports
   - Build user community

3. **Reward Pool Management**
   - Regularly monitor reward pool balance
   - Plan deposit schedule in advance
   - Ensure timely reward distribution
   - Calculate based on 5% base APY

4. **Penalty Pool Management**
   - Monitor penalty pool accumulation
   - Plan distribution after activity ends
   - Ensure fair distribution to full staking users

5. **Loyalty Bonus Management**
   - Monitor loyalty bonus calculation
   - Plan distribution after activity ends (same as penalty pool)
   - Ensure fair distribution to full staking users based on stake amounts

---

## VIII. Key Metrics Monitoring

### Staking Monitoring Metrics

- **Total Staked**: Monitor total staking amount for product
- **User Count**: Count participating users
- **Average Staking Amount**: Understand user staking scale
- **Reward Pool Balance**: Ensure sufficient funds to pay rewards
- **Total Pending Rewards**: Monitor totalPendingRewards, ensure reward pool balance is sufficient
- **Penalty Pool Balance**: Monitor penalty pool accumulation
- **Early Unstake Requests**: Track number of early unstake requests

---

## IX. Operational Notes

### 1. Reward Pool Management
- ✅ Product needs reward pool
- ✅ Regularly check reward pool balance
- ✅ Plan deposit schedule in advance
- ⚠️ Ensure sufficient funds to pay rewards (based on 5% base APY)

### 2. Whitelist Management (if enabled)
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

## X. Summary

The HSK Staking product plan provides a single staking pool for all users:

- **Single Pool**: Low threshold (1 HSK), stable returns (5% base APY, up to 8% total expected APY), open to all users
- **Early Unstake**: Supported with 50% penalty and 7-day waiting period
- **Penalty Pool**: Distributed to users who complete full staking period after activity ends

Through reasonable mechanism design, ensures product security and provides flexible user experience, providing clear operational strategies and monitoring metrics for operations.

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Single-Tier Product Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

