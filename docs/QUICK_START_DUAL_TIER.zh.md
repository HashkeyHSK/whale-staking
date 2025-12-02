# HSK Staking 快速开始指南

## 🎯 快速部署

### 步骤 1: 编译合约

```bash
npm run compile
# 或
npx hardhat compile
```

### 步骤 2: 部署质押合约

```bash
# 部署到测试网（需要提供时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# 部署到主网
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

**注意**：部署时必须提供 `STAKE_START_TIME` 和 `STAKE_END_TIME` 环境变量（Unix 时间戳，秒级）。

部署后会输出合约地址，请保存：

```bash
# 示例输出
export STAKING_ADDRESS=0x...
```

### 步骤 3: 配置白名单（如果启用了白名单模式）

如果合约部署时启用了白名单模式，需要添加授权用户：

```bash
# 批量添加白名单（最多100个地址）
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:testnet

# 批量移除白名单
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:testnet
```

### 步骤 4: 充值奖励池

```bash
# 向奖励池充值（示例：10000 HSK）
REWARD_AMOUNT="10000" npm run rewards:add:testnet
```

## 💰 用户质押示例

### 质押代币

```bash
# 质押代币（固定 365 天锁定期，最小：1 HSK）
STAKE_AMOUNT="100" npm run stake:testnet
```

**注意**：HSKStaking 使用固定 365 天锁定期，无需指定锁定期参数。

### 提前解除质押

```bash
# 申请提前解除质押
POSITION_ID="1" npm run request-early-unstake:testnet

# 完成提前解除质押（7 天等待期后）
POSITION_ID="1" npm run complete-early-unstake:testnet
```

**注意**：提前解除质押会产生 50% 的罚金。罚金转入罚金池，分配给完成完整质押周期的用户。

## 📊 查询和监控

### 查询用户质押情况

```bash
# 查询用户质押情况
npm run query:stakes:testnet

# 查询指定用户的质押情况
USER_ADDRESS="0x..." npm run query:stakes:testnet
```

### 查询合约配置

```bash
# 查看合约状态和配置
npm run query:status:testnet
```

**说明**: HSKStaking 使用固定 365 天锁定期，无需查询锁定期选项。

### 查询待提取奖励

```bash
# 查询指定位置的待提取奖励（可以查询任何位置，无所有者限制）
POSITION_ID="1" npm run query:pending-reward:testnet

# 查询任何用户/位置的待提取奖励
POSITION_ID="1" npm run query:pending-reward-any-user:testnet

# 查询用户所有位置的待提取奖励
USER_ADDRESS="0x..." npm run query:pending-reward-any-user:testnet
```

**注意**：`pendingReward` 函数可以被任何人调用 - 不需要是位置所有者。

## 🔧 管理员操作

### 调整质押时间窗口

**设置质押开始时间**：

```bash
# 设置质押开始时间（使用 Unix 时间戳）
START_TIME="1735689600" npm run config:set-start-time:testnet
```

**说明**：
- 部署脚本默认开始时间为部署后 7 天
- 用户只能在开始时间之后进行质押
- 管理员可以随时调整开始时间

**设置质押结束时间**：

```bash
# 设置质押结束时间（使用 Unix 时间戳）
END_TIME="1767225600" npm run config:set-end-time:testnet
```

**说明**：
- 用户只能在 `stakeStartTime` 和 `stakeEndTime` 之间进行质押
- 结束时间必须是未来时间

### 调整配置参数

**设置最小质押金额**：

```bash
# 设置最小质押金额（示例：1 HSK）
NEW_MIN_STAKE_AMOUNT="1" npm run config:set-min-stake-amount:testnet
```

**设置最大总质押量**：

```bash
# 设置最大总质押量（示例：3000万 HSK）
NEW_MAX_TOTAL_STAKED="30000000" npm run config:set-max-total-staked:testnet
```

**切换白名单模式**：

```bash
# 启用白名单模式
WHITELIST_MODE="true" npm run config:set-whitelist-mode:testnet

# 禁用白名单模式
WHITELIST_MODE="false" npm run config:set-whitelist-mode:testnet
```

### 重要说明

**重要**：HSKStaking 使用固定锁定期设计（365 天），不支持修改锁定期。

如果需要不同的锁定期或收益率配置，请使用不同的初始化参数部署新的合约实例。

## 🔄 提前解除质押机制

### 概述

用户可以在锁定期内申请提前解除质押，但必须等待 7 天才能完成解除。提前解除质押会产生 50% 的收益罚金。

### 流程

1. **申请提前解除质押**：用户调用 `requestEarlyUnstake(positionId)`
   - 必须在锁定期内
   - 收益计算在申请时停止
   - 不能重复申请

2. **等待期**：申请后 7 天
   - 等待期内不产生新收益
   - 等待期后用户可以完成解除质押

3. **完成提前解除质押**：用户调用 `completeEarlyUnstake(positionId)`
   - 用户收到 50% 的计算收益
   - 50% 罚金转入罚金池
   - 如果用户已领取超过 50%，超出部分从本金扣除

### 罚金池分配

- 罚金池从提前解除质押的罚金中累积
- 分配机制单独管理，不属于核心质押合约

## 📊 合约特性

| 特性 | 说明 |
|---------|-------------|
| 锁定期 | 365 天（固定，合约常量） |
| 收益计算 | 线性，按秒累积 |
| 收益上限 | 收益只计算到锁定期结束 |
| 提前解除质押 | 支持（50% 罚金，7 天等待期） |
| 白名单 | 可选，部署时可配置 |
| 紧急模式 | 支持，允许提取本金但不包含奖励 |
| 暂停功能 | 支持，管理员可以暂停/恢复合约 |

## ⚠️ 重要提醒

1. **质押时间窗口**：部署时必须提供 `STAKE_START_TIME` 和 `STAKE_END_TIME` 环境变量（Unix 时间戳，秒级）。管理员可以通过 `setStakeStartTime` 和 `setStakeEndTime` 函数调整质押时间窗口
2. **合约实例**：每次部署都会创建一个独立的合约实例，包含自己的代理合约和配置
3. **奖励池**：每个实例需要独立的奖励池，需要分别管理和充值
4. **白名单管理**：如果启用了白名单模式，管理员需要手动添加授权用户
5. **参数配置**：部署后可以通过管理员函数调整参数，但现有质押位置不受影响
6. **提前解除质押**：提前解除质押会产生 50% 罚金。罚金池分配给完成完整质押周期的用户

## 🔍 监控和查询

### 查询用户质押状态

```bash
# 查询用户质押状态
npm run query:stakes:testnet

# 查询指定用户的质押状态
USER_ADDRESS="0x..." npm run query:stakes:testnet
```

### 查询合约状态

```bash
# 查询合约状态
npm run query:status:testnet
```

### 查询待提取奖励

```bash
# 查询指定位置的待提取奖励（可以查询任何位置，无所有者限制）
POSITION_ID="1" npm run query:pending-reward:testnet

# 查询任何用户/位置的待提取奖励
POSITION_ID="1" npm run query:pending-reward-any-user:testnet

# 查询用户所有位置的待提取奖励
USER_ADDRESS="0x..." npm run query:pending-reward-any-user:testnet
```

**注意**：`pendingReward` 函数可以被任何人调用 - 不需要是位置所有者。

## 📚 相关文档

- [主 README](../README.md)
- [产品方案文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [技术 FAQ](./TECHNICAL_FAQ.md) - 技术机制说明
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理
- [提前解除质押更新日志](./EARLY_UNSTAKE_CHANGELOG.md) - 提前解除质押功能详情

---

**文档版本**: 2.0.0  
**维护者**: HashKey 技术团队
