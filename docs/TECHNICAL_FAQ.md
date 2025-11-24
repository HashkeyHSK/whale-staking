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

**Example 1**: Staking 10,000 HSK, 5% APY, staking for 365 days:
- Returns = 10,000 × 5% × (365/365) = 500 HSK

**Example 2**: Staking 10,000 HSK, 5% APY, staking for 365 days, but claiming rewards on day 100:
- Rewards claimable on day 100 = 10,000 × 5% × (100/365) ≈ 219.18 HSK
- Principal continues to be locked, continues to generate rewards
- Note: V2 version does not support unstaking during lock period

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
- Deployment script defaults start time to 7 days after deployment
- Admin can adjust this time window at any time

**Example**:
- Start time: 2026-11-08 00:00:00
- End time: 2027-11-08 00:00:00
- Can only stake new positions within this year
- Existing stakes are not affected, can still claim rewards and unstake normally

---

### Q7: Will I receive st token-like tokens after staking?

**A:** No. Staking does not generate any tokens.

- After staking, only receive a `positionId` (staking position ID)
- No tradable tokens
- Staking positions are non-transferable, bound to your address

---

### Q8: What is the minimum staking amount?

**A:** 
- **Staking**: Starting from 1000 HSK

---

### Q9: What does maximum total staked mean? Is it a per-transaction limit?

**A:** No, it's not a per-transaction limit, it's the upper limit for the entire product pool.

- It's the upper limit for the sum of all users' staking amounts
- Can stake any amount per transaction (as long as it doesn't exceed pool limit)
- After reaching limit, new users cannot stake, need to wait for users to unstake

**Example**:
- Staking maximum total staked: 30,000,000 HSK
- If 9,000,000 HSK already staked, new users can stake at most 1,000,000 HSK
-  maximum total staked: 30,000,000 HSK

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

### Q11: Why does  require whitelist?

**A:**  targets whales and institutions, requires approval.

- Need admin to add your address to whitelist
- Only whitelisted users can participate in 
- Please contact admin to apply for whitelist

---

## III. Lock Period and Withdrawal

### Q12: Can I unstake during lock period?

**A:** Cannot unstake during lock period, can only claim rewards.

- **During lock period (within 365 days)**: Can only claim rewards, principal continues to be locked
- **After lock period ends (after 365 days)**: Can unstake, withdraw principal + all rewards

---

### Q13: How long is the lock period?

**A:** HSKStaking uses fixed 365-day lock period.

- Staking: 365 days (fixed, approximately 31,536,000 seconds)
- : 365 days (fixed, approximately 31,536,000 seconds)
- V2 version simplified lock period selection, all staking unified to 365 days
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

## IV. Return Calculation

### Q17: How do I calculate my returns?

**A:** Return calculation formula:

```
Returns = Principal × Annual rate × (Actual staking days / 365 days)
```

**Limitation**: If actual staking days > lock period, calculate based on lock period.

**Example**:
- Principal: 10,000 HSK
- Annual rate: 5%
- Lock period: 365 days
- Actual staking: 365 days
- Returns = 10,000 × 5% × (365/365) = 500 HSK

---

### Q18: What's the difference in returns between Staking and ?

**A:** 

| Product | Annual Yield Rate | Minimum Stake | Participation Method |
|---------|-------------------|---------------|---------------------|
| Staking | 5% | 1000 HSK | Open (no approval required) |

---

### Q18: Are rewards distributed daily or monthly?

**A:** Rewards accumulate linearly, calculated per second.

- Not distributed daily or monthly, but accumulating every second
- Rewards continuously accumulate, can be claimed at any time, precise to the second
- When claiming, calculates all rewards from last claim to now (precise to the second)

---

## V. Product Selection

### Q19: How do I participate in staking?

**A:** 

**Staking Requirements:**
- Minimum staking amount: 1000 HSK
- No approval needed, open to all users
- 5% annual returns
- 365-day lock period

---

### Q20: Can I participate in both products simultaneously?

**A:** Yes. Both products are completely independent.

- Can stake in both products simultaneously
- Each product calculates rewards independently
- Do not affect each other

---

## VI. Technical Questions

### Q21: How do I query my staking information?

**A:** Query through contract functions.

- Use `userPositions(address, uint256)` to query user's Nth staking position ID (need to iterate through indices)
- Use `positions(positionId)` to query specified position's detailed information
- Use `pendingReward(positionId)` to query pending rewards
- Can query through frontend interface or calling contract functions
- **Note**: `userPositions` is a public mapping, returns positionId, need to query details through `positions`

---

### Q22: Do I need to pay Gas fees for staking?

**A:** Yes. All on-chain operations require Gas fees.

- Staking, claiming rewards, unstaking all require Gas fees
- Gas fees are determined by the network, not charged by the product

---

### Q23: Can the contract be upgraded? Will it affect my staking?

**A:** Contract uses upgradeable proxy pattern (Transparent Proxy).

**Upgrade Mechanism**:
- Contract can be upgraded, but existing stakes are not affected
- All staking data will be completely preserved (totalStaked, positions, rewards, etc.)
- Upgrade only updates implementation logic, does not change storage layout
- Upgrade is executed by admin, users need no action

**Upgrade Script Features**:
- ✅ Auto-detect ProxyAdmin type (contract or EOA)
- ✅ Auto-read actual ProxyAdmin address from storage slot
- ✅ Smart Fallback mechanism (if one method fails, automatically try another)
- ✅ Auto-verify state consistency before and after upgrade
- ✅ Auto-print browser link after successful upgrade

**View Upgrade Transaction**:
- Upgrade transaction will appear on ProxyAdmin contract page, not Proxy page
- Script will print transaction hash and browser link after successful upgrade

---

## VII. Other Questions

### Q24: What is Whale DID?

**A:** Whale DID is a special identity identifier for users staking more than 50,000 HSK.

- Users staking more than 50,000 HSK can mint Whale DID
- This is an off-chain function, unrelated to staking contract
- Please consult operations team for specific rules

---

### Q25: How do I contact customer service if I encounter problems?

**A:** Please contact official customer service or admin.

- Technical issues: Contact development team
- Whitelist application: Contact admin
- Reward pool issues: Contact admin

---

### Q26: Are there risks in staking?

**A:** Staking involves certain risks.

- **Smart Contract Risk**: Although audited, technical risks still exist
- **Lock Period Risk**: Cannot withdraw principal during lock period
- **Reward Pool Risk**: If reward pool balance is insufficient, may not be able to claim rewards
- **Emergency Mode Risk**: In emergency mode, can only withdraw principal, giving up rewards

Recommend participating cautiously based on your own risk tolerance.

---

## VIII. Quick Reference

### Product Comparison Table

| Item | Staking |  |
|------|---------------|----------------|
| **Annual Yield Rate** | 5% (500 basis points) | 16% (1600 basis points) |
| **Minimum Stake** | 1000 HSK |
| **Lock Period** | 365 days (fixed, LOCK_PERIOD constant) | 365 days (fixed, LOCK_PERIOD constant) |
| **Participation Method** | Open (whitelist disabled) | Whitelist (enabled) |
| **Maximum Total Staked** | 30,000,000 HSK (pool limit) | 30,000,000 HSK (pool limit) |

### Important Reminders

1. **Staking Time Window**: Can only stake within the time window set by admin, deployment script defaults start time to 7 days after deployment
2. **Annual Yield Rate**: Calculated on an annual basis, not total returns after lock period ends
3. **Reward Cap**: Rewards are only calculated up to the end of lock period, extra time does not increase
4. **Lock Period Restrictions**: Cannot unstake during lock period, can only claim rewards
5. **Reward Pool**: Rewards are deposited by admin, if balance is insufficient may not be able to claim
6. **Emergency Mode**: In emergency mode, can only withdraw principal, giving up rewards

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

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

