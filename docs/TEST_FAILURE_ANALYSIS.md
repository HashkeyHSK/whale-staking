# Premium Staking 测试失败原因分析

## 概述

**当前测试状态：**
- 总测试数：213
- 通过：210（98.6%）
- 失败：3（1.4%）
- 所有失败测试都属于 Premium Staking

**主要问题：** 所有失败都是由于账户余额不足导致的。

---

## 失败测试列表

### 1. Edge Cases - 应该正确处理最大金额的质押

**文件位置：** `test/premium/edge-cases.test.ts:53`

**当前代码：**
```typescript
const maxAmount = parseEther("10000"); // Large amount for Premium Staking (reduced for testing)
await fundAccount(fixture.user1, parseEther("30000")); // Fund 30,000 HSK total to ensure enough
```

**失败原因：**
- **余额不足**：账户余额只有 `10000000000000000000000` wei = 10,000 HSK
- 需要 `10000000017948804317200` wei = 10,000.00179488043172 HSK（包括 gas 费用）
- `fundAccount` 是累加的，但 before hook 中已经充值了 10,000,000 HSK，测试中又充值了 30,000 HSK，理论上应该有 40,000 HSK，但实际只有 10,000 HSK
- **可能原因**：`fundAccount` 函数在 Hardhat EDR 中可能没有正确累加余额，或者 before hook 的充值被覆盖了

**错误信息：**
```
Error [ProviderError]: Sender doesn't have enough funds to send tx. 
The max upfront cost is: 10000000017948804317200 
and the sender's balance is: 10000000000000000000000.
```

**解决方案：**
- 在测试中直接设置足够的余额，不依赖 before hook
- 或者检查 `fundAccount` 函数在 Hardhat EDR 中的实现
- 增加 gas buffer 的金额

---

### 2. Staking - 应该拒绝超过最大总质押量的质押

**文件位置：** `test/premium/staking.test.ts:260`

**当前代码：**
```typescript
const gasBuffer = parseEther("100000000"); // Extra for gas (100M wei = 100 HSK)
// ... 测试逻辑尝试质押接近上限的金额
```

**失败原因：**
- **余额不足**：账户余额只有 `9300999933115145394520` wei ≈ 9.3 HSK
- 需要 `9998999000002775681536160` wei ≈ 9,998,999 HSK（包括 gas 费用）
- 测试逻辑需要质押接近上限的大额金额，但账户余额不足
- **可能原因**：`gasBuffer` 设置为 100 HSK 不够，需要更大的金额

**错误信息：**
```
Error [ProviderError]: Sender doesn't have enough funds to send tx. 
The max upfront cost is: 9998999000002775681536160 
and the sender's balance is: 9300999933115145394520.
```

**解决方案：**
- 大幅增加 `gasBuffer` 的金额（从 100 HSK 增加到 10,000 HSK 或更多）
- 或者简化测试逻辑，使用固定的小额金额而不是动态计算大额金额

---

### 3. Staking - 应该拒绝奖励池余额不足的质押

**文件位置：** `test/premium/staking.test.ts:331`

**当前代码：**
```typescript
const stakeAmount = parseEther("10000"); // Large stake requiring significant rewards (reduced for testing)
await fundAccount(fixture.user1, stakeAmount + parseEther("100000000")); // Extra for gas
```

**失败原因：**
- **余额不足**：账户余额只有 `9300999933115145394520` wei ≈ 9.3 HSK
- 需要 `10000000002775681536160` wei ≈ 10,000.000277568153616 HSK（包括 gas 费用）
- 测试期望的错误是 "Stake amount exceed"（奖励池余额不足），但实际得到的是余额不足错误
- **可能原因**：`fundAccount` 充值没有生效，或者余额被之前的测试消耗了

**错误信息：**
```
AssertionError [ERR_ASSERTION]: Expected error message to include "Stake amount exceed", 
but got: Sender doesn't have enough funds to send tx. 
The max upfront cost is: 10000000002775681536160 
and the sender's balance is: 9300999933115145394520.
```

**解决方案：**
- 在测试开始时确保账户有足够的余额
- 增加 gas buffer 的金额
- 或者先验证账户余额，如果不足则跳过测试

---

## 问题总结

### 主要问题：账户余额不足

所有3个失败测试都是因为账户余额不足导致的。主要原因是：

1. **`fundAccount` 函数可能没有正确累加余额**
   - `fundAccount` 函数使用 `hardhat_setBalance` 来设置余额
   - 函数逻辑是：`targetBalance = currentBalance + amount`
   - 但在 Hardhat EDR 中，`currentBalance` 可能没有正确获取，导致余额设置失败

2. **Before hook 中的充值可能被覆盖**
   - Before hook 中充值了 10,000,000 HSK
   - 但测试运行时账户余额只有 10,000 HSK
   - 说明 before hook 的充值可能没有生效，或者被后续操作覆盖了

3. **Gas 费用估算不准确**
   - 测试中设置的 gas buffer 可能不够
   - Hardhat EDR 的 gas 费用可能比预期高

### 解决方案建议

1. **检查 `fundAccount` 函数实现**
   - 确认 `hardhat_setBalance` 在 Hardhat EDR 中是否正常工作
   - 如果不行，使用 fallback 方法（发送交易）来充值

2. **在每个测试中独立充值**
   - 不依赖 before hook 的充值
   - 在每个测试开始时直接充值足够的金额

3. **增加 gas buffer**
   - 将 gas buffer 从 100 HSK 增加到 10,000 HSK 或更多
   - 确保有足够的余额支付 gas 费用

4. **简化测试逻辑**
   - 对于需要大额金额的测试，使用固定的小额金额
   - 避免动态计算大额金额

---

## 修复优先级

1. **高优先级**：修复余额不足问题
   - 检查并修复 `fundAccount` 函数
   - 在每个测试中确保账户有足够的余额

2. **中优先级**：简化测试逻辑
   - 对于复杂的测试（如"应该拒绝超过最大总质押量的质押"），使用固定金额

3. **低优先级**：改进错误处理
   - 当余额不足时，提供更清晰的错误信息
   - 添加余额检查，如果不足则跳过测试
