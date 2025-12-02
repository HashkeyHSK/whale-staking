# 常见错误处理指南

本文档列出了使用 Whale Staking 合约时可能遇到的常见错误及其解决方法。

## 用户操作错误

### 1. "Insufficient stake amount" - 质押金额不足

**错误信息**：
```
Error: Insufficient stake amount
```

**原因**：
- 质押金额小于最小质押金额要求

**解决方法**：
- 检查最小质押金额要求：1 HSK
- 确保发送的金额 >= 最小质押金额

**示例**：
```typescript
// ❌ 错误：质押金额不足
await staking.stake({ value: ethers.parseEther("0.5") });

// ✅ 正确：满足最小质押金额
await staking.stake({ value: ethers.parseEther("1") });
```

**说明**: V2版本使用固定365天锁定期，stake() 函数无需传入 lockPeriod 参数。

---

### 2. "Not whitelisted" - 未在白名单中

**错误信息**：
```
Error: Not whitelisted
```

**原因**：
- 合约启用了白名单模式
- 当前地址不在白名单中

**解决方法**：
- 检查白名单模式状态：`await staking.onlyWhitelistCanStake()`
- 如果是 ，需要联系管理员添加到白名单
- 使用脚本检查白名单状态：
  ```bash
  npx hardhat run scripts/checkWhitelist.ts --network <network> \
    -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
  ```

---

### 3. "Still locked" - 锁定期未结束

**错误信息**：
```
Error: Still locked
```

**原因**：
- 尝试在锁定期结束前解除质押
- 当前时间 < 解锁时间（质押时间 + 365天）

**解决方法**：
- 查询质押位置信息，确认解锁时间
- 等待锁定期结束（365天）
- 锁定期内只能提取奖励，不能解除质押

**示例**：
```typescript
// 注意: userPositions 是 mapping，需要遍历索引
const position = await staking.positions(positionId);
const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365天
const unlockTime = position.stakedAt + LOCK_PERIOD;
const currentTime = Math.floor(Date.now() / 1000);
const timeRemaining = unlockTime - currentTime;

if (timeRemaining > 0) {
  console.log(`还需等待 ${timeRemaining} 秒才能解除质押`);
  console.log(`预计解锁时间: ${new Date(unlockTime * 1000).toLocaleString()}`);
}
```

**说明**: V2版本支持提前解除质押机制。用户可以在锁定期内申请提前解除质押，但必须等待7天并支付50%罚金。

---

### 3a. "Early unstake already requested" - 已申请提前解除质押

**错误信息**：
```
Error: Early unstake already requested
```

**原因**：
- 尝试为已申请提前解除质押的位置再次申请
- `earlyUnstakeRequestTime[positionId] > 0` 表示已存在申请

**解决方法**：
- 检查是否已申请提前解除质押：`await staking.earlyUnstakeRequestTime(positionId)`
- 如果已申请，等待7天等待期后调用 `completeEarlyUnstake()`
- 不能为同一位置重复申请提前解除质押

**示例**：
```typescript
const requestTime = await staking.earlyUnstakeRequestTime(positionId);
if (requestTime > 0) {
  const waitingPeriod = 7 * 24 * 60 * 60; // 7天
  const canComplete = (await time.latest()) >= requestTime + waitingPeriod;
  if (canComplete) {
    // 可以完成提前解除质押
    await staking.completeEarlyUnstake(positionId);
  } else {
    // 仍在等待期内
    console.log("仍在7天等待期内");
  }
}
```

---

### 3b. "Early unstake not requested" - 未申请提前解除质押

**错误信息**：
```
Error: Early unstake not requested
```

**原因**：
- 尝试完成提前解除质押，但之前未申请
- `earlyUnstakeRequestTime[positionId] == 0` 表示不存在申请

**解决方法**：
- 先调用 `requestEarlyUnstake(positionId)` 申请提前解除质押
- 等待7天等待期
- 然后调用 `completeEarlyUnstake(positionId)`

**示例**：
```typescript
// 步骤1：申请提前解除质押
await staking.requestEarlyUnstake(positionId);

// 步骤2：等待7天（或在测试中推进时间）
await time.increase(7 * 24 * 60 * 60);

// 步骤3：完成提前解除质押
await staking.completeEarlyUnstake(positionId);
```

---

### 3c. "Waiting period not completed" - 提前解除质押等待期未完成

**错误信息**：
```
Error: Waiting period not completed
```

**原因**：
- 尝试在7天等待期结束前完成提前解除质押
- 当前时间 < 申请时间 + 7天

**解决方法**：
- 等待7天等待期完成
- 查询申请时间：`await staking.earlyUnstakeRequestTime(positionId)`
- 计算剩余时间：`remainingTime = requestTime + 7天 - currentTime`

**示例**：
```typescript
const requestTime = await staking.earlyUnstakeRequestTime(positionId);
const EARLY_UNLOCK_PERIOD = 7 * 24 * 60 * 60; // 7天
const currentTime = await time.latest();
const unlockTime = requestTime + EARLY_UNLOCK_PERIOD;

if (currentTime < unlockTime) {
  const remaining = unlockTime - currentTime;
  console.log(`还需等待 ${remaining} 秒（${remaining / 86400} 天）`);
}
```

---

### 3d. `AlreadyUnstaked()` - 无法重复完成提前解除质押

**错误信息**：
```
Error: AlreadyUnstaked()
```

**错误类型**：自定义错误（不是字符串消息）

**原因**：
- 尝试完成已解除质押的位置的提前解除质押
- `position.isUnstaked == true` 表示位置已被解除质押
- 不能为同一位置重复完成提前解除质押

**解决方法**：
- 检查位置是否已解除质押：`const position = await staking.positions(positionId); if (position.isUnstaked) { ... }`
- 一旦位置被解除质押，就不能再次解除质押
- 如果需要再次质押，通过调用 `stake()` 创建新位置

**示例**：
```typescript
const position = await staking.positions(positionId);
if (position.isUnstaked) {
  console.log("位置已解除质押，无法再次完成");
  return;
}

// 只有在未解除质押时才继续
await staking.completeEarlyUnstake(positionId);
```

**注意**：当尝试对已解除质押的位置调用 `unstake()` 或 `completeEarlyUnstake()` 时也会出现此错误。

---

### 3e. "Lock period already ended" - 锁定期结束后无法申请提前解除质押

**错误信息**：
```
Error: Lock period already ended
```

**原因**：
- 尝试在锁定期结束后申请提前解除质押
- `block.timestamp >= position.stakedAt + LOCK_PERIOD`
- 锁定期结束后，应使用正常的 `unstake()` 代替

**解决方法**：
- 检查锁定期是否已结束
- 如果锁定期已结束，使用 `unstake()` 代替提前解除质押
- 提前解除质押仅在锁定期内可用

**示例**：
```typescript
const position = await staking.positions(positionId);
const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365天
const lockEndTime = position.stakedAt + LOCK_PERIOD;
const currentTime = await time.latest();

if (currentTime >= lockEndTime) {
  // 锁定期已结束，使用正常解除质押
  await staking.unstake(positionId);
} else {
  // 仍在锁定期内，可以申请提前解除质押
  await staking.requestEarlyUnstake(positionId);
}
```

---

### 3f. "EarlyUnstakeRequested" - 申请提前解除质押后无法领取奖励

**错误信息**：
```
Error: EarlyUnstakeRequested
```

**原因**：
- 申请提前解除质押后尝试领取奖励
- 一旦申请提前解除质押，收益计算在申请时停止
- 申请后无法领取额外奖励

**解决方法**：
- 如果已申请提前解除质押，收益只计算到申请时间
- 完成提前解除质押以接收50%的计算收益
- 申请提前解除质押后无法单独领取奖励

**注意**：这是设计决策 - 一旦申请提前解除质押，收益停止累积，并在完成时基于申请时间计算。

---

### 4. "Position not found" - 质押位置不存在

**错误信息**：
```
Error: Position not found
```

**原因**：
- 提供的 `positionId` 不存在
- 质押位置不属于当前用户

**解决方法**：
- 查询用户的质押位置：`await staking.getUserPositionIds(userAddress)`（推荐方法）
- 确认 `positionId` 是否正确
- 确认是否为位置所有者

---

### 5. "Already unstaked" - 已解除质押

**错误信息**：
```
Error: Already unstaked
```

**原因**：
- 该质押位置已经解除质押

**解决方法**：
- 查询质押位置状态：`position.isUnstaked`
- 使用其他有效的 `positionId`

---

### 6. "Stake amount exceed" - 质押金额超出奖励池支付能力

**错误信息**：
```
Error: Stake amount exceed
```

**原因**：
- 奖励池余额不足以支付预期奖励
- 新质押时，合约会检查：`rewardPoolBalance >= totalPendingRewards + potentialReward`
- 如果奖励池余额不足，无法创建新质押

**解决方法**：
- 联系管理员充值奖励池（通过 `updateRewardPool()` 函数）
- 查询奖励池余额：`await staking.rewardPoolBalance()`
- 查询总待发放奖励：`await staking.totalPendingRewards()`
- 等待管理员充值后再尝试质押

---

### 6b. "Insufficient reward pool" - 奖励池余额不足（提取时）

**错误信息**：
```
Error: Insufficient reward pool
```

**原因**：
- 提取奖励或解除质押时，奖励池余额不足
- 这是一个异常情况，通常不应该发生（因为质押时已经预留了奖励）

**解决方法**：
- 联系管理员立即充值奖励池
- 这可能需要紧急处理

---

### 7. "Staking has not started yet" - 质押时间窗口未开始

**错误信息**：
```
Error: Staking has not started yet
```

**原因**：
- 当前时间早于质押开始时间（`block.timestamp < stakeStartTime`）
- 质押时间窗口还未开始

**解决方法**：
- 查询质押开始时间：`await staking.stakeStartTime()`
- 等待质押开始时间到达后再尝试质押
- 联系管理员确认质押开始时间

---

### 8. "Staking period has ended" - 质押时间窗口已结束

**错误信息**：
```
Error: Staking period has ended
```

**原因**：
- 当前时间晚于或等于质押结束时间（`block.timestamp >= stakeEndTime`）
- 质押时间窗口已结束

**解决方法**：
- 查询质押结束时间：`await staking.stakeEndTime()`
- 联系管理员了解是否会延长质押时间窗口
- 等待下一个质押周期

---

## 管理员操作错误

### 9. "Contract is in emergency mode" - 合约处于紧急模式

**错误信息**：
```
Error: Contract is in emergency mode
```

**原因**：
- 合约处于紧急模式（`emergencyMode == true`）
- 紧急模式下，新质押被阻止

**解决方法**：
- 等待管理员解除紧急模式
- 使用 `emergencyWithdraw()` 提取本金（放弃奖励）
- 联系管理员了解紧急情况

---

### 10. "OwnableUnauthorizedAccount" - 仅所有者可操作

**错误信息**：
```
Error: OwnableUnauthorizedAccount(address account)
```

**原因**：
- 尝试执行只有 Owner 才能执行的操作
- 当前账户不是合约所有者

**解决方法**：
- 确认当前账户是否为 Owner（使用 `owner()` 函数查询）
- 使用 Owner 账户执行操作

**管理员操作包括**：
- 设置最小质押金额（`setMinStakeAmount`）
- 设置质押时间窗口（`setStakeStartTime`, `setStakeEndTime`）
- 管理白名单（`updateWhitelistBatch`, `setWhitelistOnlyMode`）
- 充值/提取奖励池（`updateRewardPool`, `withdrawExcessRewardPool`）
- 暂停/恢复合约（`pause`, `unpause`）
- 启用紧急模式（`enableEmergencyMode`）

---

## 紧急模式相关

### 11. "Not in emergency mode" - 紧急模式未启用

**错误信息**：
```
Error: Not in emergency mode
```

**原因**：
- 尝试使用 `emergencyWithdraw()` 紧急提取，但紧急模式未启用

**解决方法**：
- 管理员需要先启用紧急模式：`await staking.enableEmergencyMode()`
- 普通用户无法启用紧急模式
- 如果不是紧急情况，请使用正常的 `unstake()` 解除质押

---

## 通用错误处理

### 12. "Transfer failed" - 转账失败

**错误信息**：
```
Error: Transfer failed
```

**原因**：
- 合约向用户转账时失败（使用 low-level call）
- 可能是接收地址是合约且没有 receive/fallback 函数
- 可能是 Gas 不足

**解决方法**：
- 检查接收地址是否有效
- 如果是合约地址，确保实现了 `receive()` 或 `fallback()` 函数
- 确保有足够的 Gas
- 重试操作

---

### 13. "EnforcedPause" / "Contract paused" - 合约已暂停

**错误信息**：
```
Error: EnforcedPause
```
或
```
Error: Contract paused
```

**原因**：
- 合约被管理员暂停（通过 `pause()` 函数）
- 暂停时，质押（`stake`）和奖励提取（`claimReward`）功能被禁用

**解决方法**：
- 等待管理员解除暂停（通过 `unpause()` 函数）
- 查询暂停状态：`await staking.paused()`
- 注意：解除质押（`unstake`）功能在暂停状态下也被禁用

---

## 调试技巧

### 查询合约状态

```typescript
// 查询总质押量
const totalStaked = await staking.totalStaked();
console.log(`总质押量: ${ethers.formatEther(totalStaked)} HSK`);

// 查询奖励池余额
const rewardPool = await staking.rewardPoolBalance();
console.log(`奖励池余额: ${ethers.formatEther(rewardPool)} HSK`);

// 查询白名单模式
const whitelistMode = await staking.onlyWhitelistCanStake();
console.log(`白名单模式: ${whitelistMode ? '启用' : '关闭'}`);

// 查询紧急模式
const emergencyMode = await staking.emergencyMode();
console.log(`紧急模式: ${emergencyMode ? '启用' : '关闭'}`);

// 查询用户质押位置（推荐方法）
const positionIds = await staking.getUserPositionIds(userAddress);
console.log(`用户质押位置数: ${positionIds.length}`);

// 查询提前解除质押状态
for (const positionId of positionIds) {
  const requestTime = await staking.earlyUnstakeRequestTime(positionId);
  if (requestTime > 0) {
    const EARLY_UNLOCK_PERIOD = 7 * 24 * 60 * 60; // 7天
    const canComplete = (await time.latest()) >= requestTime + EARLY_UNLOCK_PERIOD;
    console.log(`位置 ${positionId}: 已申请提前解除质押，可以完成: ${canComplete}`);
  }
}
```

### 使用脚本检查

```bash
# 检查用户质押情况
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>

# 检查白名单状态
npx hardhat run scripts/checkWhitelist.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

**说明**: V2版本使用固定365天锁定期（`LOCK_PERIOD = 365 days`）。支持提前解除质押，需等待7天等待期并支付50%罚金。

### 查询合约常量

```typescript
// 查询固定锁定期（常量）
const LOCK_PERIOD = await staking.LOCK_PERIOD();
console.log(`锁定期: ${LOCK_PERIOD / 86400} 天`); // 365天

// 查询年化收益率
const rewardRate = await staking.rewardRate();
console.log(`年化收益率: ${rewardRate} basis points (${rewardRate / 100}%)`); // 500 = 5%

// 查询质押时间窗口
const stakeStartTime = await staking.stakeStartTime();
const stakeEndTime = await staking.stakeEndTime();
console.log(`质押开始时间: ${new Date(stakeStartTime * 1000).toLocaleString()}`);
console.log(`质押结束时间: ${new Date(stakeEndTime * 1000).toLocaleString()}`);
```

---

## 联系支持

如果遇到本文档未涵盖的错误，请：

1. 检查合约事件日志，获取详细错误信息
2. 查询合约状态，确认配置是否正确
3. 联系开发团队或管理员

---

## 提前解除质押相关错误总结

| 错误 | 函数 | 原因 | 解决方法 |
|-------|----------|-------|----------|
| "Early unstake already requested" | `requestEarlyUnstake` | 已申请 | 等待并完成 |
| `AlreadyUnstaked()` | `completeEarlyUnstake` | 位置已解除质押 | 无法重复完成 |
| "Early unstake not requested" | `completeEarlyUnstake` | 不存在申请 | 先申请 |
| "Waiting period not completed" | `completeEarlyUnstake` | 未满7天 | 等待7天 |
| "Lock period already ended" | `requestEarlyUnstake` | 锁定期已结束 | 使用 `unstake()` 代替 |

---

**文档版本**: 2.0.0  
**维护者**: HashKey 技术团队

