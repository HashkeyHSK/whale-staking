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
- Check minimum staking amount requirement: 1 HSK
- Ensure sent amount >= minimum staking amount

**Example**:
```typescript
// ❌ Error: Insufficient staking amount
await staking.stake({ value: ethers.parseEther("500") });

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
- If it's , contact admin to be added to whitelist
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

**Note**: V2 version supports early unstake mechanism. Users can request early unstake during lock period, but must wait 7 days and incur a 50% penalty.

---

### 3a. "Early unstake already requested" - Early Unstake Already Requested

**Error Message**:
```
Error: Early unstake already requested
```

**Cause**:
- Attempting to request early unstake for a position that already has an early unstake request
- `earlyUnstakeRequestTime[positionId] > 0` means request already exists

**Solution**:
- Check if early unstake was already requested: `await staking.earlyUnstakeRequestTime(positionId)`
- If request exists, wait for 7-day waiting period and then call `completeEarlyUnstake()`
- Cannot request early unstake twice for the same position

**Example**:
```typescript
const requestTime = await staking.earlyUnstakeRequestTime(positionId);
if (requestTime > 0) {
  const waitingPeriod = 7 * 24 * 60 * 60; // 7 days
  const canComplete = (await time.latest()) >= requestTime + waitingPeriod;
  if (canComplete) {
    // Can complete early unstake
    await staking.completeEarlyUnstake(positionId);
  } else {
    // Still in waiting period
    console.log("Still in 7-day waiting period");
  }
}
```

---

### 3b. "Early unstake not requested" - Early Unstake Not Requested

**Error Message**:
```
Error: Early unstake not requested
```

**Cause**:
- Attempting to complete early unstake without first requesting it
- `earlyUnstakeRequestTime[positionId] == 0` means no request exists

**Solution**:
- First call `requestEarlyUnstake(positionId)` to request early unstake
- Wait for 7-day waiting period
- Then call `completeEarlyUnstake(positionId)`

**Example**:
```typescript
// Step 1: Request early unstake
await staking.requestEarlyUnstake(positionId);

// Step 2: Wait 7 days (or advance time in test)
await time.increase(7 * 24 * 60 * 60);

// Step 3: Complete early unstake
await staking.completeEarlyUnstake(positionId);
```

---

### 3c. "Waiting period not completed" - Early Unstake Waiting Period Not Completed

**Error Message**:
```
Error: Waiting period not completed
```

**Cause**:
- Attempting to complete early unstake before 7-day waiting period ends
- Current time < request time + 7 days

**Solution**:
- Wait for 7-day waiting period to complete
- Query request time: `await staking.earlyUnstakeRequestTime(positionId)`
- Calculate remaining time: `remainingTime = requestTime + 7 days - currentTime`

**Example**:
```typescript
const requestTime = await staking.earlyUnstakeRequestTime(positionId);
const EARLY_UNLOCK_PERIOD = 7 * 24 * 60 * 60; // 7 days
const currentTime = await time.latest();
const unlockTime = requestTime + EARLY_UNLOCK_PERIOD;

if (currentTime < unlockTime) {
  const remaining = unlockTime - currentTime;
  console.log(`Need to wait ${remaining} seconds (${remaining / 86400} days)`);
}
```

---

### 3d. `AlreadyUnstaked()` - Cannot Complete Early Unstake Twice

**Error Message**:
```
Error: AlreadyUnstaked()
```

**Error Type**: Custom Error (not a string message)

**Cause**:
- Attempting to complete early unstake for a position that is already unstaked
- `position.isUnstaked == true` means position was already unstaked
- Cannot complete early unstake twice for the same position

**Solution**:
- Check if position is already unstaked: `const position = await staking.positions(positionId); if (position.isUnstaked) { ... }`
- Once a position is unstaked, it cannot be unstaked again
- If you need to stake again, create a new position by calling `stake()`

**Example**:
```typescript
const position = await staking.positions(positionId);
if (position.isUnstaked) {
  console.log("Position already unstaked, cannot complete again");
  return;
}

// Only proceed if not unstaked
await staking.completeEarlyUnstake(positionId);
```

**Note**: This error also occurs when trying to call `unstake()` or `completeEarlyUnstake()` on an already unstaked position.

---

### 3e. "Lock period already ended" - Cannot Request Early Unstake After Lock Period

**Error Message**:
```
Error: Lock period already ended
```

**Cause**:
- Attempting to request early unstake after lock period has ended
- `block.timestamp >= position.stakedAt + LOCK_PERIOD`
- After lock period ends, should use normal `unstake()` instead

**Solution**:
- Check if lock period has ended
- If lock period ended, use `unstake()` instead of early unstake
- Early unstake is only available during lock period

**Example**:
```typescript
const position = await staking.positions(positionId);
const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365 days
const lockEndTime = position.stakedAt + LOCK_PERIOD;
const currentTime = await time.latest();

if (currentTime >= lockEndTime) {
  // Lock period ended, use normal unstake
  await staking.unstake(positionId);
} else {
  // Still in lock period, can request early unstake
  await staking.requestEarlyUnstake(positionId);
}
```

---

### 3e. "EarlyUnstakeRequested" - Cannot Claim Reward After Requesting Early Unstake

**Error Message**:
```
Error: EarlyUnstakeRequested
```

**Cause**:
- Attempting to claim reward after requesting early unstake
- Once early unstake is requested, reward calculation stops at request time
- Cannot claim additional rewards after request

**Solution**:
- If early unstake is requested, rewards are calculated up to request time only
- Complete early unstake to receive 50% of calculated rewards
- Cannot claim rewards separately after requesting early unstake

**Note**: This is a design decision - once early unstake is requested, rewards stop accumulating and are calculated at completion time based on request time.

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
- Distribute penalty pool (`distributePenaltyPool`)

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

// Query user staking positions (recommended method)
const positionIds = await staking.getUserPositionIds(userAddress);
console.log(`User staking position count: ${positionIds.length}`);

// Query early unstake status
for (const positionId of positionIds) {
  const requestTime = await staking.earlyUnstakeRequestTime(positionId);
  if (requestTime > 0) {
    const EARLY_UNLOCK_PERIOD = 7 * 24 * 60 * 60; // 7 days
    const canComplete = (await time.latest()) >= requestTime + EARLY_UNLOCK_PERIOD;
    console.log(`Position ${positionId}: Early unstake requested, can complete: ${canComplete}`);
  }
}
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

**Note**: V2 version uses fixed 365-day lock period (`LOCK_PERIOD = 365 days`). Early unstake is supported with 7-day waiting period and 50% penalty.

### Query Contract Constants

```typescript
// Query fixed lock period (constant)
const LOCK_PERIOD = await staking.LOCK_PERIOD();
console.log(`Lock period: ${LOCK_PERIOD / 86400} days`); // 365 days

// Query annual yield rate
const rewardRate = await staking.rewardRate();
console.log(`Annual yield rate: ${rewardRate: 500 = 5%, 

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

## Early Unstake Related Errors Summary

| Error | Function | Cause | Solution |
|-------|----------|-------|----------|
| "Early unstake already requested" | `requestEarlyUnstake` | Already requested | Wait and complete instead |
| `AlreadyUnstaked()` | `completeEarlyUnstake` | Position already unstaked | Cannot complete twice |
| "Early unstake not requested" | `completeEarlyUnstake` | No request exists | Request first |
| "Waiting period not completed" | `completeEarlyUnstake` | Less than 7 days passed | Wait for 7 days |
| "Lock period already ended" | `requestEarlyUnstake` | Lock period ended | Use `unstake()` instead |

---

**Document Version**: 2.0.0  
**Maintainer**: HashKey Technical Team

