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
- 检查最小质押金额要求：
  - 普通 Staking：1 HSK
  - Premium Staking：500,000 HSK
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
- 如果是 Premium Staking，需要联系管理员添加到白名单
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

**说明**: V2版本严格执行365天锁定期，无提前解锁机制。

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
- 查询用户的质押位置：`await staking.userPositions(userAddress, index)`（需遍历索引）
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

### 6. "Insufficient reward pool" - 奖励池余额不足

**错误信息**：
```
Error: Insufficient reward pool
```

**原因**：
- 奖励池余额不足以支付预期奖励
- 新质押时，合约会检查奖励池是否充足

**解决方法**：
- 联系管理员充值奖励池
- 查询奖励池余额：`await staking.rewardPoolBalance()`
- 等待管理员充值后再尝试质押

---

### 7. "Blacklisted" - 地址被列入黑名单

**错误信息**：
```
Error: Blacklisted
```

**原因**：
- 当前地址被列入黑名单

**解决方法**：
- 联系管理员了解原因
- 等待管理员移除黑名单

---

## 管理员操作错误

### 8. "Only owner" - 仅所有者可操作

**错误信息**：
```
Error: Only owner
```

**原因**：
- 尝试执行只有 Owner 才能执行的操作（如升级合约）
- 当前账户不是 Owner

**解决方法**：
- 确认当前账户是否为 Owner
- 使用 Owner 账户执行操作

---

### 9. "OwnableUnauthorizedAccount" - 仅所有者可操作

**错误信息**：
```
Error: OwnableUnauthorizedAccount
```

**原因**：
- 尝试执行只有 Owner 才能执行的操作
- 当前账户不是合约所有者

**解决方法**：
- 确认当前账户是否为 Owner（使用 `owner()` 函数查询）
- 使用 Owner 账户执行操作

---

## 紧急模式相关

### 10. "Emergency mode not enabled" - 紧急模式未启用

**错误信息**：
```
Error: Emergency mode not enabled
```

**原因**：
- 尝试使用紧急提取，但紧急模式未启用

**解决方法**：
- 管理员需要先启用紧急模式：`await staking.enableEmergencyMode()`
- 普通用户无法启用紧急模式

---

## 通用错误处理

### 11. "Transfer failed" - 转账失败

**错误信息**：
```
Error: Transfer failed
```

**原因**：
- 合约向用户转账时失败
- 可能是接收地址问题或 Gas 不足

**解决方法**：
- 检查接收地址是否有效
- 确保有足够的 Gas
- 重试操作

---

### 12. "Contract paused" - 合约已暂停

**错误信息**：
```
Error: Contract paused
```

**原因**：
- 合约被管理员暂停
- 暂停时，质押和奖励提取功能被禁用

**解决方法**：
- 等待管理员解除暂停
- 解除质押功能不受暂停影响

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

// 查询用户质押位置（需要遍历索引）
// 注意: userPositions 是 mapping，需要通过索引逐个查询
let positionCount = 0;
try {
  while (true) {
    await staking.userPositions(userAddress, positionCount);
    positionCount++;
  }
} catch (e) {
  // 当索引超出范围时会抛出异常
}
console.log(`用户质押位置数: ${positionCount}`);
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

**说明**: V2版本使用固定365天锁定期，无需检查锁定期选项。

---

## 联系支持

如果遇到本文档未涵盖的错误，请：

1. 检查合约事件日志，获取详细错误信息
2. 查询合约状态，确认配置是否正确
3. 联系开发团队或管理员

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11

