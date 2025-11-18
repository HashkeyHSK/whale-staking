# Common Error Handling Guide

This document lists common errors that may be encountered when using the Whale Staking contract and their solutions.

## User Operation Errors

### 1. "Insufficient stake amount" - Insufficient Staking Amount

**Error Message**:
```
Error: Insufficient stake amount
```

**Cause**:
- Staking amount is less than the minimum staking amount requirement

**Solution**:
- Check minimum staking amount requirements:
  - Normal Staking: 1 HSK
  - Premium Staking: 500,000 HSK
- Ensure sent amount >= minimum staking amount

**Example**:
```typescript
// ❌ Error: Insufficient staking amount
await staking.stake({ value: ethers.parseEther("0.5") });

// ✅ Correct: Meets minimum staking amount
await staking.stake({ value: ethers.parseEther("1") });
```

**Note**: V2 version uses fixed 365-day lock period, `stake()` function does not require `lockPeriod` parameter.

---

### 2. "Not whitelisted" - Not in Whitelist

**Error Message**:
```
Error: Not whitelisted
```

**Cause**:
- Contract has whitelist mode enabled
- Current address is not in the whitelist

**Solution**:
- Check whitelist mode status: `await staking.onlyWhitelistCanStake()`
- If it's Premium Staking, contact admin to be added to whitelist
- Use script to check whitelist status:
  ```bash
  npx hardhat run scripts/checkWhitelist.ts --network <network> \
    -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
  ```

---

### 3. "Still locked" - Lock Period Not Ended

**Error Message**:
```
Error: Still locked
```

**Cause**:
- Attempting to unstake before lock period ends
- Current time < unlock time (staking time + 365 days)

**Solution**:
- Query staking position information to confirm unlock time
- Wait for lock period to end (365 days)
- Can only claim rewards during lock period, cannot unstake

**Example**:
```typescript
// Note: userPositions is a mapping, need to iterate through indices
const position = await staking.positions(positionId);
const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365 days
const unlockTime = position.stakedAt + LOCK_PERIOD;
const currentTime = Math.floor(Date.now() / 1000);
const timeRemaining = unlockTime - currentTime;

if (timeRemaining > 0) {
  console.log(`Need to wait ${timeRemaining} seconds before unstaking`);
  console.log(`Expected unlock time: ${new Date(unlockTime * 1000).toLocaleString()}`);
}
```

**Note**: V2 version strictly enforces 365-day lock period, no early unlock mechanism.

---

### 4. "Position not found" - Staking Position Not Found

**Error Message**:
```
Error: Position not found
```

**Cause**:
- Provided `positionId` does not exist
- Staking position does not belong to current user

**Solution**:
- Query user's staking positions: `await staking.getUserPositionIds(userAddress)` (recommended method)
- Confirm `positionId` is correct
- Confirm if you are the position owner

---

### 5. "Already unstaked" - Already Unstaked

**Error Message**:
```
Error: Already unstaked
```

**Cause**:
- This staking position has already been unstaked

**Solution**:
- Query staking position status: `position.isUnstaked`
- Use other valid `positionId`

---

### 6. "Stake amount exceed" - Staking Amount Exceeds Reward Pool Payment Capacity

**Error Message**:
```
Error: Stake amount exceed
```

**Cause**:
- Reward pool balance is insufficient to pay expected rewards
- When staking, contract checks: `rewardPoolBalance >= totalPendingRewards + potentialReward`
- If reward pool balance is insufficient, cannot create new staking

**Solution**:
- Contact admin to deposit to reward pool (via `updateRewardPool()` function)
- Query reward pool balance: `await staking.rewardPoolBalance()`
- Query total pending rewards: `await staking.totalPendingRewards()`
- Wait for admin to deposit before attempting to stake again

---

### 6b. "Insufficient reward pool" - Insufficient Reward Pool Balance (When Withdrawing)

**Error Message**:
```
Error: Insufficient reward pool
```

**Cause**:
- When claiming rewards or unstaking, reward pool balance is insufficient
- This is an abnormal situation that should not normally occur (rewards are reserved when staking)

**Solution**:
- Contact admin to immediately deposit to reward pool
- This may require emergency handling

---

### 7. "Staking has not started yet" - Staking Time Window Not Started

**Error Message**:
```
Error: Staking has not started yet
```

**Cause**:
- Current time is earlier than staking start time (`block.timestamp < stakeStartTime`)
- Staking time window has not started

**Solution**:
- Query staking start time: `await staking.stakeStartTime()`
- Wait for staking start time to arrive before attempting to stake
- Contact admin to confirm staking start time

---

### 8. "Staking period has ended" - Staking Time Window Has Ended

**Error Message**:
```
Error: Staking period has ended
```

**Cause**:
- Current time is later than or equal to staking end time (`block.timestamp >= stakeEndTime`)
- Staking time window has ended

**Solution**:
- Query staking end time: `await staking.stakeEndTime()`
- Contact admin to see if staking time window will be extended
- Wait for next staking cycle

---

## Admin Operation Errors

### 9. "Contract is in emergency mode" - Contract in Emergency Mode

**Error Message**:
```
Error: Contract is in emergency mode
```

**Cause**:
- Contract is in emergency mode (`emergencyMode == true`)
- In emergency mode, new staking is blocked

**Solution**:
- Wait for admin to disable emergency mode
- Use `emergencyWithdraw()` to withdraw principal (giving up rewards)
- Contact admin to understand emergency situation

---

### 10. "OwnableUnauthorizedAccount" - Only Owner Can Operate

**Error Message**:
```
Error: OwnableUnauthorizedAccount(address account)
```

**Cause**:
- Attempting to execute operations that only Owner can perform
- Current account is not the contract owner

**Solution**:
- Confirm if current account is Owner (query using `owner()` function)
- Use Owner account to execute operations

**Admin Operations Include**:
- Set minimum staking amount (`setMinStakeAmount`)
- Set staking time window (`setStakeStartTime`, `setStakeEndTime`)
- Manage whitelist (`updateWhitelistBatch`, `setWhitelistOnlyMode`)
- Deposit/withdraw reward pool (`updateRewardPool`, `withdrawExcessRewardPool`)
- Pause/resume contract (`pause`, `unpause`)
- Enable emergency mode (`enableEmergencyMode`)

---

## Emergency Mode Related

### 11. "Not in emergency mode" - Emergency Mode Not Enabled

**Error Message**:
```
Error: Not in emergency mode
```

**Cause**:
- Attempting to use `emergencyWithdraw()` for emergency withdrawal, but emergency mode is not enabled

**Solution**:
- Admin needs to enable emergency mode first: `await staking.enableEmergencyMode()`
- Regular users cannot enable emergency mode
- If not an emergency, use normal `unstake()` to unstake

---

## General Error Handling

### 12. "Transfer failed" - Transfer Failed

**Error Message**:
```
Error: Transfer failed
```

**Cause**:
- Contract failed to transfer to user (using low-level call)
- May be receiving address is a contract without receive/fallback function
- May be insufficient Gas

**Solution**:
- Check if receiving address is valid
- If it's a contract address, ensure `receive()` or `fallback()` function is implemented
- Ensure sufficient Gas
- Retry operation

---

### 13. "EnforcedPause" / "Contract paused" - Contract Paused

**Error Message**:
```
Error: EnforcedPause
```
or
```
Error: Contract paused
```

**Cause**:
- Contract was paused by admin (via `pause()` function)
- When paused, staking (`stake`) and reward claiming (`claimReward`) functions are disabled

**Solution**:
- Wait for admin to unpause (via `unpause()` function)
- Query pause status: `await staking.paused()`
- Note: Unstaking (`unstake`) function is also disabled when paused

---

## Debugging Tips

### Query Contract Status

```typescript
// Query total staked amount
const totalStaked = await staking.totalStaked();
console.log(`Total staked: ${ethers.formatEther(totalStaked)} HSK`);

// Query reward pool balance
const rewardPool = await staking.rewardPoolBalance();
console.log(`Reward pool balance: ${ethers.formatEther(rewardPool)} HSK`);

// Query whitelist mode
const whitelistMode = await staking.onlyWhitelistCanStake();
console.log(`Whitelist mode: ${whitelistMode ? 'Enabled' : 'Disabled'}`);

// Query emergency mode
const emergencyMode = await staking.emergencyMode();
console.log(`Emergency mode: ${emergencyMode ? 'Enabled' : 'Disabled'}`);

// Query user staking positions (need to iterate through indices)
// Note: userPositions is a mapping, need to query one by one through indices
let positionCount = 0;
try {
  while (true) {
    await staking.userPositions(userAddress, positionCount);
    positionCount++;
  }
} catch (e) {
  // Exception thrown when index is out of range
}
console.log(`User staking position count: ${positionCount}`);
```

### Use Scripts to Check

```bash
# Check user staking status
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>

# Check whitelist status
npx hardhat run scripts/checkWhitelist.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

**Note**: V2 version uses fixed 365-day lock period (`LOCK_PERIOD = 365 days`), no need to check lock period options.

### Query Contract Constants

```typescript
// Query fixed lock period (constant)
const LOCK_PERIOD = await staking.LOCK_PERIOD();
console.log(`Lock period: ${LOCK_PERIOD / 86400} days`); // 365 days

// Query annual yield rate
const rewardRate = await staking.rewardRate();
console.log(`Annual yield rate: ${rewardRate / 100}%`); // 800 = 8%, 1600 = 16%

// Query staking time window
const stakeStartTime = await staking.stakeStartTime();
const stakeEndTime = await staking.stakeEndTime();
console.log(`Staking start time: ${new Date(stakeStartTime * 1000).toLocaleString()}`);
console.log(`Staking end time: ${new Date(stakeEndTime * 1000).toLocaleString()}`);
```

---

## Contact Support

If you encounter errors not covered in this document, please:

1. Check contract event logs to get detailed error information
2. Query contract status to confirm configuration is correct
3. Contact development team or admin

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team

