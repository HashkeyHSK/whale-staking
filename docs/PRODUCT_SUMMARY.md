# HSK Staking Product Summary

## 🎯 Product Overview

HSKStaking is a single staking pool with fixed configuration parameters. All users participate in the same staking pool.

| Feature | Description |
|---------|-------------|
| **Contract Type** | HSKStaking (single contract implementation) |
| **Lock Period** | 365 days (fixed, contract constant) |
| **Minimum Stake** | 1 HSK |
| **Annual Yield Rate** | 5% (base APY, contract real-time settlement) |
| **Total Expected APY** | Up to 8% (frontend display, includes loyalty bonus 1%-3%) |
| **Maximum Total Staked** | 30,000,000 HSK (30 million HSK) |
| **Whitelist Mode** | Disabled by default (open to all users) |
| **Staking Window** | Approximately 7 days (configurable by admin) |
| **Early Unstake** | Supported with 50% penalty and 7-day waiting period |
| **Reward Calculation** | Linear, per-second accumulation |

---

## 📋 Core Mechanisms

### Participation Method
- ✅ Minimum stake amount: 1 HSK
- ✅ Whitelist mode: Disabled by default (open to all users)
- ✅ Staking time window: Approximately 7 days (can only stake within the time range set by admin)
- ✅ Fixed lock period of 365 days
- ✅ Maximum total staked: 30,000,000 HSK (pool limit)

### Reward Rules
- ✅ Base annual yield rate: 5% (contract real-time settlement)
- ✅ Total expected APY: Up to 8% (frontend display, includes loyalty bonus 1%-3%)
- ✅ Loyalty bonus: 1%-3% (off-chain distribution, not in contract)
- ✅ Loyalty bonus distribution: After staking activity ends, proportional distribution based on users' stake amounts in total staking, only for users who completed full staking period (365 days)
- ✅ Rewards calculated based on actual staking seconds
- ✅ Can claim rewards separately during lock period
- ✅ Rewards only calculated up to the end of lock period (365 days)

### Unlock and Withdrawal Rules

**Normal Unstake**:
- 🔒 **During lock period (365 days)**: Cannot unstake, can only claim rewards
- ✅ **After lock period ends (after 365 days)**: Can unstake, withdraw principal + all rewards
- ✅ **Unlock time**: Unlock time = Staking time + 365 days
- ✅ **Reward withdrawal**: Can withdraw accumulated rewards at any time during lock period

**Early Unstake**:
- ✅ **Request early unstake**: Can request during lock period
- ⏳ **Waiting period**: 7 days after request
- ⚠️ **Penalty**: 50% of rewards are forfeited (goes to penalty pool)
- ✅ **Complete early unstake**: After 7-day waiting period, can complete and receive principal + 50% of rewards
- ⚠️ **Reward calculation**: Rewards calculated up to request time, not completion time

**Emergency Withdrawal**:
- 🚨 **Emergency mode**: Can withdraw principal at any time in emergency mode (giving up rewards)
- ⚠️ **Requires admin**: Admin must enable emergency mode first

### Risk Control
- ✅ Maximum total staked: 30,000,000 HSK (fixed pool limit)
- ✅ Reward pool balance check: Contract checks if reward pool balance is sufficient to pay all pending rewards
- ✅ Whitelist mechanism: Disabled by default (can be enabled by admin if needed)
- ✅ Emergency mode: Can only withdraw principal in special circumstances
- ✅ Pause function: Admin can pause/unpause contract

---

## ⚠️ Important Mechanism Explanations

### 1. Unlock Rules

**Key Points**:
- **During lock period**: Cannot unstake normally, can only claim rewards or request early unstake
- **After lock period ends**: Can unstake, withdraw principal + all rewards
- **Unlock time**: Unlock time = Staking time + 365 days

**Example**:
- User stakes on 2026-11-01, fixed 365-day lock period
- Unlock time: 2027-11-01 (365 days later)
- During lock period (until 2027-11-01): Can only claim rewards or request early unstake
- After lock period ends (after 2027-11-01): Can unstake, withdraw principal + all rewards

### 2. Early Unstake Mechanism

**Key Points**:
- **Request**: User can request early unstake during lock period
- **Waiting Period**: Must wait 7 days after request before completing
- **Penalty**: 50% of rewards are forfeited (goes to penalty pool)
- **Reward Calculation**: Rewards calculated up to request time, not completion time
- **Penalty Pool**: Distributed to users who complete full staking period

**Example**:
- User stakes 100 HSK on Day 0
- User requests early unstake on Day 60
- Rewards calculated up to Day 60 only (not Day 67)
- User receives 50% of calculated rewards
- 50% penalty goes to penalty pool

### 3. Reward Calculation Rules

**Key Points**: Rewards are only calculated up to the end of lock period, extra time does not increase rewards

**Example**:
- User stakes with 365-day lock period, 5% annual yield
- Actually staked for 400 days before withdrawal
- Rewards still calculated based on 365 days
- **Important**: Time beyond lock period does not generate additional rewards

### 4. Whitelist Mechanism

**Configuration**:
- Whitelist mode: Disabled by default (open to all users)
- Admin can enable whitelist mode after deployment if needed
- If enabled: Only whitelisted users can stake
- If disabled: All users can stake freely

### 5. Reward Pool Management

**Management**:
- Each contract instance has an independent reward pool
- Admin must deposit funds to reward pool
- Contract checks if reward pool balance is sufficient before allowing new stakes
- Admin can withdraw excess rewards (above total pending rewards)

### 6. Penalty Pool Distribution

**Mechanism**:
- Penalties from early unstake (50% of rewards) go to penalty pool
- Penalty pool accumulates in the contract
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible

### 7. Emergency Withdrawal Mechanism

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

---

## 📊 Key Operational Metrics

- Total staked amount
- Number of participating users
- Average staking amount
- Reward pool balance
- Total pending rewards
- Penalty pool balance
- Number of early unstake requests
- Number of completed full staking periods

---

## 🎯 Operational Recommendations

- **Promotion**: Emphasize flexible configuration and stable returns
- **User Education**: Focus on explaining lock period, reward calculation, and early unstake mechanism
- **Reward Pool**: Regular deposits, ensure sufficient funds
- **Penalty Pool**: Monitor penalty pool balance, plan distribution after staking period ends
- **Whitelist Management**: If whitelist enabled, establish approval standards and regular reviews

---

## 📝 Operational Notes

1. **Reward Pool Management**
   - Each contract instance needs independent reward pool
   - Regular balance checks
   - Plan deposits in advance
   - Ensure sufficient funds to pay all pending rewards

2. **Whitelist Management** (if enabled)
   - Establish approval standards
   - Regular user reviews
   - Add/remove promptly

3. **Early Unstake**
   - Users can request early unstake during lock period
   - 7-day waiting period required
   - 50% penalty applies
   - Penalty pool distributed to users who complete full staking period

4. **Penalty Pool Distribution**
   - Only after staking period ends (`stakeEndTime`)
   - Only to users who completed full staking period
   - Proportional distribution based on staked amounts

5. **Risk Control**
   - Monitor total staked amount
   - Pay attention to reward pool balance
   - Develop emergency plans

---

## 🔑 Key Features Summary

| Feature | Description |
|---------|-------------|
| **Minimum Stake** | 1 HSK |
| **Lock Period** | 365 days (fixed) |
| **Base APY** | 5% (contract real-time settlement) |
| **Total Expected APY** | Up to 8% (frontend display) |
| **Maximum Total Staked** | 30,000,000 HSK |
| **Whitelist** | Disabled by default |
| **Staking Window** | Approximately 7 days |
| **Early Unstake** | Supported with 50% penalty, 7-day waiting period |
| **Reward Calculation** | Per-second, linear accumulation |
| **Emergency Mode** | Supported |
| **Pause Function** | Supported |
| **Penalty Pool** | Distributed to full staking users after activity ends |

---

**For complete documentation, please refer to**: [Product Plan Documentation](./PRODUCT_PLANS.md)

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [HSK Staking Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Technical FAQ](./TECHNICAL_FAQ.md) - Technical mechanism explanations
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling
- [Early Unstake Changelog](./EARLY_UNSTAKE_CHANGELOG.md) - Early unstake feature details

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team
