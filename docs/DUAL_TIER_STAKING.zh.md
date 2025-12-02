# HSK Staking 产品文档

基于现有合约架构，HSKStaking 合约可以通过不同的配置参数部署，创建不同的质押实例。

## 📋 产品概览

HSKStaking 是具有固定配置的单一质押池：

- **合约类型**：HSKStaking（单一合约实现）
- **锁定期**：365 天（固定，合约常量定义）
- **最小质押**：1 HSK
- **基础年化收益率**：5%（500 basis points）
- **总预期年化**：Up to 8%（前端展示，包含忠诚度补贴 1%-3%）
- **最大总质押量**：30,000,000 HSK（3000 万 HSK）
- **白名单模式**：默认禁用
- **质押时间窗口**：约 7 天（管理员可配置）
- **提前解除质押**：支持（50% 罚金，7 天等待期）

## 🚀 部署方式

### 部署质押合约实例

```bash
# 部署到测试网（需要时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# 部署到主网
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

**注意**：每次部署都会创建一个独立的合约实例，包含自己的代理合约和配置。您可以部署多个具有不同参数的实例。

## 📝 配置参数

### 初始化参数

部署时，合约通过以下参数进行初始化：

| 参数 | 说明 | 示例 |
|-----------|-------------|---------|
| `minStakeAmount` | 最小质押金额（以 wei 为单位） | 1 HSK = 1 * 10^18 wei |
| `rewardRate` | 年化奖励率（basis points） | 500 = 5%（基础 APY） |
| `stakeStartTime` | 质押开始时间戳 | Unix 时间戳 |
| `stakeEndTime` | 质押结束时间戳 | Unix 时间戳 |
| `whitelistMode` | 启用白名单模式 | `false` = 开放（默认），`true` = 仅白名单 |
| `maxTotalStaked` | 最大总质押金额 | 30,000,000 HSK = 30M * 10^18 wei |

### 部署后配置

#### 1. 白名单管理（如果启用了白名单模式）

```bash
# 批量添加白名单（最多100个地址）
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:testnet

# 批量移除白名单
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:testnet
```

#### 2. 向奖励池充值

```bash
# 向奖励池充值
REWARD_AMOUNT="10000" npm run rewards:add:testnet
```

#### 3. 验证配置

```bash
# 检查合约配置参数
npm run query:status:testnet
```

## 💡 使用示例

### 用户质押

```bash
# 质押代币（固定 365 天锁定期）
STAKE_AMOUNT="2000" npm run stake:testnet
```

**注意**：HSKStaking 使用固定 365 天锁定期，无需指定锁定期参数。

### 提前解除质押（如需要）

```bash
# 申请提前解除质押
POSITION_ID="1" npm run request-early-unstake:testnet

# 完成提前解除质押（7 天等待期后）
POSITION_ID="1" npm run complete-early-unstake:testnet
```

**注意**：提前解除质押会产生 50% 的罚金。罚金转入罚金池，分配给完成完整质押周期的用户。

## 🔧 管理员操作

### 设置质押时间窗口

**设置质押开始时间**：
```bash
NEW_START_TIME="1735689600" npm run admin:set-start-time:testnet
```

**设置质押结束时间**：
```bash
NEW_END_TIME="1767225600" npm run admin:set-end-time:testnet
```

### 白名单管理

**批量添加白名单**：
```bash
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:testnet
```

**批量移除白名单**：
```bash
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:testnet
```

**切换白名单模式**：
```bash
# 启用白名单模式
ENABLED="true" npm run admin:set-whitelist-mode:testnet

# 禁用白名单模式
ENABLED="false" npm run admin:set-whitelist-mode:testnet
```

### 奖励池管理

**向奖励池充值**：
```bash
REWARD_AMOUNT="10000" npm run rewards:add:testnet
```

**提取超额奖励**：
```bash
AMOUNT="5000" npm run admin:withdraw-excess-rewards:testnet
```

### 紧急模式

**启用紧急模式**：
```bash
npm run admin:enable-emergency:testnet
```

**注意**：紧急模式下，用户只能提取本金，放弃所有奖励。

### 暂停/恢复合约

**暂停合约**：
```bash
npm run admin:pause:testnet
```

**恢复合约**：
```bash
npm run admin:unpause:testnet
```

## 📊 查询功能

### 查询用户质押信息

```bash
# 查询用户的所有质押位置ID
USER_ADDRESS="0x123..." npm run query:user-positions:testnet

# 查询指定位置的详细信息
POSITION_ID="1" npm run query:position-info:testnet

# 查询待提取奖励
POSITION_ID="1" npm run query:pending-reward:testnet
```

### 查询合约状态

```bash
# 查询合约配置参数
npm run query:status:testnet

# 查询奖励池余额
npm run query:reward-pool:testnet
```

## ⚠️ 重要注意事项

1. **质押时间窗口**：用户只能在管理员设置的时间窗口内进行质押
2. **锁定期**：固定为 365 天，无法修改
3. **奖励池**：管理员必须定期向奖励池充值，确保有足够资金支付奖励
4. **提前解除质押**：会产生 50% 罚金，罚金转入罚金池
5. **罚金池分配**：活动结束后，按比例分配给完成完整质押周期的用户
6. **白名单**：默认禁用，管理员可以启用

## 🔍 故障排查

### 常见问题

1. **无法质押**
   - 检查是否在质押时间窗口内
   - 检查是否启用了白名单模式（如果启用，需要先添加到白名单）
   - 检查是否达到最大总质押量上限

2. **无法提取奖励**
   - 检查奖励池余额是否充足
   - 检查合约是否处于暂停状态
   - 检查是否处于紧急模式

3. **无法解除质押**
   - 检查锁定期是否已结束
   - 检查是否申请了提前解除质押（需要完成提前解除质押流程）
   - 检查合约是否处于暂停状态

---

## 📚 相关文档

- [主 README](../README.md)
- [产品方案文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [快速开始指南](./QUICK_START_DUAL_TIER.md) - 快速部署指南
- [技术 FAQ](./TECHNICAL_FAQ.md) - 技术机制说明
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 2.0.0  
**维护者**: HashKey 技术团队
