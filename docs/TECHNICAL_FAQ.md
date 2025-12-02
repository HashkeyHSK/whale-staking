# Frequently Asked Questions (FAQ)

This document is for quickly answering common user questions.

---

## I. Reward Related

### Q1: Are rewards linearly unlocked? Are they unlocked by block?

**A:** Rewards are linearly unlocked, calculated based on time (not by block).

- Rewards accumulate continuously per second, generating returns every second
- Unrelated to block production speed, only related to time
- Can claim accumulated rewards at any time, precise to the second

**Example**: Staking 10,000 HSK, 5% annual yield, can claim approximately 65.75 HSK rewards on day 30 (rewards accumulated over 2,592,000 seconds).

---

### Q2: What does annual yield rate mean? Does 5% APY for 365 days mean getting 5% returns after 365 days?

**A:** Yes. Annual yield rate is the yield rate calculated on an annual basis.

- **5% APY** means: If staking for full 365 days, returns are 5%
- Actual returns = Principal × Annual rate × (Actual staking seconds / Seconds in 365 days)
- If staking time is less than 365 days, returns are calculated proportionally (precise to the second)
- **Note**: APY (annual yield rate) is not in the contract, configured by admin

**Example 1**: Staking 10,000 HSK, 5% APY, staking for 365 days:
- Returns = 10,000 × 5% × (365/365) = 500 HSK

**Example 2**: Staking 10,000 HSK, 5% APY, staking for 365 days, but claiming rewards on day 100:
- Rewards claimable on day 100 = 10,000 × 5% × (100/365) ≈ 219.18 HSK
- Principal continues to be locked, continues to generate rewards

---

### Q3: When can rewards be claimed?

**A:** Rewards can be claimed at any time during the lock period, no need to wait until lock period ends.

- Rewards will continuously accumulate, can be claimed at any time
- After claiming rewards, principal continues to be locked, continues to earn rewards
- After lock period ends, all rewards are automatically claimed when unstaking

---

### Q4: If I don't claim after lock period ends, will rewards continue to increase?

**A:** No. Rewards are only calculated up to the end of lock period.

- Reward cap = Principal × Annual rate × (Lock period / 365 days)
- Time beyond lock period does not generate additional rewards
- Recommend claiming promptly after lock period ends

**Example**: Choose 365-day lock period, 5% APY, actually staked for 400 days:
- Rewards still calculated based on 365 days = 10,000 × 5% = 500 HSK
- Extra 35 days do not generate additional rewards

---

### Q5: What if reward pool balance is insufficient?

**A:** Reward pool is maintained by admin deposits.

- If reward pool balance is insufficient, cannot claim rewards
- Please contact admin to deposit to reward pool
- Rewards will accumulate, can claim after reward pool is deposited

---

## II. Staking Related

### Q6: What is staking time window?

**A:** Staking time window is the time range allowing users to stake.

- Admin can set staking start time (`stakeStartTime`) and end time (`stakeEndTime`)
- Users can only stake during `stakeStartTime <= current time < stakeEndTime`
- **Staking window is expected to be approximately 7 days**
- Deployment script defaults start time to 7 days after deployment
- Admin can adjust this time window at any time

**Important Notes**:
- Staking window is expected to be approximately 7 days, but lock period is 365 days
- After staking within the window, can request early unstake (with penalty)
- After staking window ends, cannot stake new positions, but existing stakes are not affected, can still claim rewards and unstake normally

**Example**:
- Staking window: 2026-11-08 00:00:00 to 2026-11-15 00:00:00 (7 days)
- Users can only stake new positions within 7 days
- After staking, lock period is 365 days, can request early unstake (with penalty)
- After staking window ends, cannot stake new positions, but existing stakes continue to run

---

### Q7: Will I receive st token-like tokens after staking?

**A:** No. Staking does not generate any tokens.

- After staking, only receive a `positionId` (staking position ID)
- No tradable tokens
- Staking positions are non-transferable, bound to your address

---

### Q8: What is the minimum staking amount?

**A:** Minimum staking amount is **1 HSK**.

- Each stake must be ≥ 1 HSK
- Can stake multiple times, each stake creates a new staking position

---

### Q9: What does maximum total staked mean? Is it a per-transaction limit?

**A:** No, it's not a per-transaction limit, it's the upper limit for the entire product pool.

- It's the upper limit for the sum of all users' staking amounts
- **Maximum total staked: 30,000,000 HSK (30 million HSK)**
- Can stake any amount per transaction (as long as it doesn't exceed pool limit)
- After reaching limit, new users cannot stake, need to wait for users to unstake

**Example**:
- If 25,000,000 HSK already staked, new users can stake at most 5,000,000 HSK
- If 30,000,000 HSK already staked, new users cannot stake, need to wait for other users to unstake

**Admin Function**:
- Admin can adjust maximum total staked via `setMaxTotalStaked()` function
- Setting to 0 means unlimited

---

### Q10: Can I stake multiple times?

**A:** Yes. Each stake creates a new staking position.

- Each staking position calculates rewards independently
- Can hold multiple staking positions simultaneously
- Each position can claim rewards and unstake independently

---

### Q11: Do I need whitelist?

**A:** **Whitelist is disabled by default**.

- Product is open by default, all users can participate in staking
- Admin can enable whitelist mode via `setWhitelistOnlyMode()` function if needed
- If whitelist mode is enabled, admin needs to add your address to whitelist to participate

---

## III. Lock Period and Withdrawal

### Q12: Can I unstake during lock period?

**A:** There are two ways to unstake during lock period:

1. **Normal Unstake**: After lock period ends (after 365 days), can unstake and withdraw principal + all rewards
2. **Early Unstake**: During lock period, can request early unstake, but need to:
   - Wait 7-day waiting period
   - Pay 50% of rewards as penalty
   - Stop generating new rewards from request time

**During lock period (within 365 days)**:
- ✅ Can claim rewards (principal continues to be locked)
- ✅ Can request early unstake (incurs penalty)
- ❌ Cannot unstake immediately (need to wait for waiting period)

**Early Unstake Process**:
1. Call `requestEarlyUnstake(positionId)` to request early unstake
2. Wait 7-day waiting period
3. Call `completeEarlyUnstake(positionId)` to complete unstake

---

### Q13: How long is the lock period?

**A:** HSKStaking uses fixed 365-day lock period.

- Lock period: 365 days (fixed, approximately 31,536,000 seconds)
- Lock period is contract constant `LOCK_PERIOD`, cannot be modified after deployment

---

### Q14: Must I withdraw immediately after lock period ends?

**A:** No. Can withdraw at any time after lock period ends.

- After lock period ends, can unstake at any time
- But time beyond lock period does not generate additional rewards
- Recommend withdrawing promptly to avoid idle funds

---

### Q15: Are rewards automatically claimed when unstaking?

**A:** Yes. When unstaking, principal + all accumulated rewards are automatically claimed.

- No need to claim rewards before unstaking
- One operation extracts principal and all rewards

---

### Q16: What is emergency withdrawal? When can it be used?

**A:** Emergency withdrawal is a function to withdraw principal in special circumstances.

- Only available after admin enables emergency mode
- Can withdraw at any time, not subject to lock period restrictions
- **Can only withdraw principal, giving up all rewards**
- For emergency situations, not recommended for regular use

---

### Q16-1: Can I request early unstake during lock period?

**A:** Yes, but need to pay penalty.

- **Early Unstake**: Can request early unstake during lock period
- **Waiting Period**: Need to wait 7 days after request before completing
- **Penalty**: Early unstake requires paying 50% of rewards as penalty
- **Reward Stop**: From the moment of requesting early unstake, no new rewards are generated

**Process**:
1. Call `requestEarlyUnstake(positionId)` to request early unstake
2. Wait 7-day waiting period
3. Call `completeEarlyUnstake(positionId)` to complete unstake

**Important Note**:
- **Phase 2 will not support early unstake due to real-time rewards**
- Current version supports early unstake functionality
- If future version changes to real-time reward mode, early unstake will not be supported

---

### Q16-2: How is the penalty calculated for early unstake?

**A:** Penalty = Total rewards × 50%

**Calculation Rules**:
- **Total Rewards**: Only calculated up to request time (`requestTime`)
- **User Retains**: 50% of total rewards (`EARLY_UNSTAKE_REWARD_RETAIN_RATE = 5000`)
- **Penalty**: 50% of total rewards, goes to penalty pool
- **During Waiting Period**: No new rewards generated, reward calculation stopped at request time

**Example**:
- Staking: 10,000 HSK, 5% APY
- Request early unstake on day 60, total rewards = 10,000 × 5% × (60/365) ≈ 82.19 HSK
- User retains: 82.19 × 50% = 41.10 HSK
- Penalty: 82.19 × 50% = 41.10 HSK (goes to penalty pool)
- Complete unstake on day 67 (after 7-day waiting period), rewards still calculated based on day 60

**Special Case**:
- If claimed rewards exceed allowed 50%, excess is deducted from principal
- Example: Total rewards 100 HSK, allowed to retain 50 HSK, but claimed 60 HSK
  - Excess: 60 - 50 = 10 HSK
  - Deducted from principal: 10 HSK, final principal returned = 10,000 - 10 = 9,990 HSK

**Penalty Pool Distribution Mechanism**:
- All penalties from early unstake (50% of rewards) go to penalty pool
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible

---

### Q16-3: Will rewards continue to generate during waiting period?

**A:** No. From the moment of requesting early unstake, reward calculation stops.

- **At Request Time**: Reward calculation stops at request time (`requestTime`)
- **During Waiting Period**: No new rewards generated
- **At Completion Time**: Still calculated based on request time rewards, will not increase

**Query Rewards**:
- When using `pendingReward(positionId)` to query, if early unstake has been requested, will show rewards at request time
- Rewards queried during waiting period will not increase

---

### Q16-4: How to query penalty for early unstake?

**A:** Backend can calculate through the following methods:

1. **Query if Requested**: `earlyUnstakeRequestTime[positionId]`
2. **Get Position Info**: `positions(positionId)`
3. **Calculate Total Rewards**: Rewards from `stakedAt` to `requestTime`
4. **Calculate Penalty**: Total rewards × 50%

**Calculation Formula**:
```
Total Rewards = Principal × Annual Rate × (requestTime - stakedAt) / 365 days
Penalty = Total Rewards × 50%
User Retains = Total Rewards × 50%
```

**Note**: Contract does not provide direct query function, need to get through `EarlyUnstakeCompleted` event, or backend calculates itself.

---

### Q16-5: When is penalty pool reward distributed?

**A:** Penalty pool reward is distributed **after staking activity ends, when all stakes have matured**.

- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible
- **Early Unstake Users**: Cannot receive penalty pool distribution

**Example**:
- Penalty pool total: 100,000 HSK
- User A staked: 1,000,000 HSK (completed full 365 days)
- User B staked: 500,000 HSK (completed full 365 days)
- Total completed staking: 10,000,000 HSK
- User A distribution: 100,000 × (1,000,000 / 10,000,000) = 10,000 HSK
- User B distribution: 100,000 × (500,000 / 10,000,000) = 5,000 HSK

---

## IV. Return Calculation

### Q17: How do I calculate my returns?

**A:** Return calculation formula:

```
Returns = Principal × Annual rate × (Actual staking days / 365 days)
```

**Limitation**: If actual staking days > lock period, calculate based on lock period.

**Normal Case Example**:
- Principal: 10,000 HSK
- Annual rate: 5%
- Lock period: 365 days
- Actual staking: 365 days
- Returns = 10,000 × 5% × (365/365) = 500 HSK

**Early Unstake Example**:
- Principal: 10,000 HSK
- Annual rate: 5%
- Request early unstake on day 60
- Total rewards = 10,000 × 5% × (60/365) ≈ 82.19 HSK
- User retains = 82.19 × 50% = 41.10 HSK
- Penalty = 82.19 × 50% = 41.10 HSK
- **Note**: Days 60-67 (waiting period) do not generate rewards

---

### Q18: What is the annual yield rate?

**A:** Base annual yield rate is **5%**.

- **Base APY**: 5% (contract real-time settlement)
- **Total Expected APY**: Up to 8% (frontend display, includes loyalty bonus)
  - Base returns: 5%
  - Loyalty bonus: +1% ~ +3% (off-chain distribution, not in contract)

**Distribution Mechanism**:
- Base APY (5%) is settled by contract in real-time
- Additional bonus (1%-3%) is distributed off-chain, not in contract
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible
- **Early Unstake Users**: Cannot receive loyalty bonus distribution

**Note**:

---

### Q18-1: Are rewards distributed daily or monthly?

**A:** Rewards accumulate linearly, calculated per second.

- Not distributed daily or monthly, but accumulating every second
- Rewards continuously accumulate, can be claimed at any time, precise to the second
- When claiming, calculates all rewards from last claim to now (precise to the second)

**Special Case - Early Unstake**:
- If early unstake has been requested, no new rewards generated from request time
- Reward calculation stops at request time, no increase during waiting period

---

## V. Campaign Rules and Additional Bonus

### Q19: Campaign Rules Explanation

**A:** Campaign rules are as follows:

**1. Return Composition**
- User final returns = Base APY (5%) + Additional Bonus APY (1%-3%)
- Base APY is settled by smart contract in real-time
- Additional bonus is one-time distribution, will be settled after staking period ends

**2. Bonus Eligibility**
- This bonus is only for returning users who participate in staking again

**3. Bonus Tiers**
Calculate additional bonus rate based on actual staking duration:
- ≥ 1 month and < 6 months: +1% APY
- ≥ 6 months and < 12 months: +2% APY
- 12 months (full 365 days): +3% APY

**4. Special Settlement Mechanism**
- **Early Redemption Mechanism**: If you set staking period to 12 months (original bonus 3%), but actually redeem at month 4, system will downgrade to "3-month standard" settlement, i.e., only distribute 1% additional bonus
- **Multiple Stakes Calculation**: If you have multiple staking orders simultaneously, additional bonus will be calculated uniformly based on the longest staking period you actually hold

**5. Distribution Mechanism**
- Additional bonus is distributed off-chain, not in contract
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible
- **Early Unstake Users**: Cannot receive loyalty bonus distribution

**6. Important Notes**
- Loyalty bonus is distributed off-chain, not in contract
- Bonus amount will be calculated and distributed uniformly after staking activity ends

---

### Q19-1: What is the total expected annual yield rate?

**A:** Total expected annual yield rate: **Up to 8%**

**Return Composition**:
- **Base Returns (Base)**: 5% (settled by smart contract in real-time)
- **Loyalty Bonus (Loyalty Bonus)**: +1% ~ +3% (off-chain distribution, not in contract)

**Loyalty Bonus Tiers**:
- ≥ 1 month and < 6 months: +1% APY
- ≥ 6 months and < 12 months: +2% APY
- 12 months (full 365 days): +3% APY

**Note**:
- Base APY (5%) is settled by smart contract in real-time
- Additional bonus (1%-3%) is distributed off-chain, not in contract
- Bonus amount will be calculated and distributed uniformly after staking activity ends

---

### Q19-2: How is loyalty bonus calculated?

**A:** Loyalty bonus calculates additional bonus rate based on actual staking duration.

**Bonus Tiers**:
- ≥ 1 month and < 6 months: +1% APY
- ≥ 6 months and < 12 months: +2% APY
- 12 months (full 365 days): +3% APY

**Special Settlement Mechanism**:
- **Early Redemption Mechanism**: If you set staking period to 12 months (original bonus 3%), but actually redeem at month 4, system will downgrade to "3-month standard" settlement, i.e., only distribute 1% additional bonus
- **Multiple Stakes Calculation**: If you have multiple staking orders simultaneously, additional bonus will be calculated uniformly based on the longest staking period you actually hold

**Bonus Eligibility**:
- This bonus is only for returning users who participate in staking again
- Need to complete full staking period to receive corresponding tier bonus

**Distribution Mechanism**:
- **Distribution Time**: After staking activity ends, when all stakes have matured
- **Distribution Method**: Off-chain calculation, one-time distribution
- **Distribution Rule**: Proportional distribution based on users' stake amounts in total staking
- **Distribution Condition**: Only users who completed full staking period (365 days) are eligible
- **Early Unstake Users**: Cannot receive loyalty bonus distribution

---

### Q20: Can I stake multiple times?

**A:** Yes. Each stake creates a new staking position.

- Can hold multiple staking positions simultaneously
- Each staking position calculates rewards independently
- Each position can claim rewards and unstake independently
- Multiple stakes' loyalty bonus calculated uniformly based on longest staking period tier

---

## VI. Technical Questions

### Q21: How do I query my staking information?

**A:** Query through contract functions.

- Use `getUserPositionIds(address)` to get all staking position IDs for a user (recommended)
- Use `positions(positionId)` to query specified position's detailed information
- Use `pendingReward(positionId)` to query pending rewards (can be called by anyone, no owner restriction)
- Use `earlyUnstakeRequestTime(positionId)` to query if early unstake has been requested
- Use `claimedRewards(positionId)` to query total claimed rewards
- Can query through frontend interface or calling contract functions
- **Note**: `pendingReward` can be called by anyone - no need to be the position owner

**Early Unstake Status Query**:
- If `earlyUnstakeRequestTime[positionId] > 0`, indicates early unstake has been requested
- Can calculate remaining waiting period: `requestTime + 7 days - current time`
- Penalty can be calculated by backend: Total rewards (to request time) × 50%

---

### Q23: Do I need to pay Gas fees for staking?

**A:** Yes. All on-chain operations require Gas fees.

- Staking, claiming rewards, unstaking, early unstake all require Gas fees
- Gas fees are determined by the network, not charged by the product

---

## VII. Other Questions

### Q23: If I encounter problems, how do I contact customer service?

**A:** Please contact official customer service or admin.

- Technical issues: Contact development team
- Whitelist application: Contact admin
- Reward pool issues: Contact admin

---

### Q24: Are there risks in staking?

**A:** Staking involves certain risks.

- **Smart Contract Risk**: Although audited, technical risks still exist
- **Lock Period Risk**: Cannot withdraw principal during lock period
- **Reward Pool Risk**: If reward pool balance is insufficient, may not be able to claim rewards
- **Emergency Mode Risk**: In emergency mode, can only withdraw principal, giving up rewards

Recommend participating cautiously based on your own risk tolerance.

---

## VIII. Quick Reference

### Product Information Table

| Item | Description |
|------|-------------|
| **Annual Yield Rate** | Base 5% (contract real-time settlement) + Loyalty Bonus 1%-3% (off-chain distribution) |
| **Total Expected APY** | Up to 8% (frontend display) |
| **Minimum Stake** | 1 HSK |
| **Lock Period** | 365 days (fixed, LOCK_PERIOD constant) |
| **Participation Method** | Open (whitelist disabled by default) |
| **Maximum Total Staked** | 30,000,000 HSK (30 million HSK) |
| **Staking Window** | Approximately 7 days |
| **Early Unstake** | Supported (7-day waiting period, 50% penalty) |

### Important Reminders

1. **Staking Time Window**: Staking window is expected to be approximately 7 days, can only stake within the time window set by admin
2. **Annual Yield Rate**: Base APY 5% is settled by contract in real-time, additional bonus 1%-3% is distributed off-chain (not in contract)
3. **Reward Cap**: Rewards are only calculated up to the end of lock period, extra time does not increase
4. **Lock Period Restrictions**: Can request early unstake during lock period, but need to pay 50% penalty and wait 7-day waiting period
5. **Early Unstake**: From request time, no new rewards generated, rewards do not increase during waiting period
6. **Penalty Pool Distribution**: After staking activity ends, when all stakes have matured, off-chain calculation, proportional distribution to full staking users
7. **Reward Pool**: Rewards are deposited by admin, if balance is insufficient may not be able to claim
8. **Emergency Mode**: In emergency mode, can only withdraw principal, giving up rewards
9. **Loyalty Bonus**: Distributed off-chain, calculated and distributed uniformly after staking activity ends

---

## 📚 Related Documentation

- [Main README](../README.md)
- [Contract Architecture](./CONTRACT_ARCHITECTURE.md) - **Detailed contract architecture (required reading for developers)**
- [Product Plan Documentation](./PRODUCT_PLANS.md) - **Operations documentation (recommended)**
- [Product Summary](./PRODUCT_SUMMARY.md) - Quick overview
- [Single-Tier Product Documentation](./DUAL_TIER_STAKING.md) - Technical deployment documentation
- [Product Development Documentation](./PRODUCT_PLANS_DEV.md) - Development team documentation
- [Quick Start Guide](./QUICK_START_DUAL_TIER.md) - Quick deployment guide
- [Error Handling Guide](./ERROR_HANDLING.md) - Common error handling

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team

