# 单层 Staking 产品方案

基于现有合约架构，通过部署一个独立的合约实例来实现一套不同的产品方案。

## 📋 产品方案概览

### 产品 1: Staking（委托质押）
- **目标用户**: 普通用户
- **最小质押门槛**: 1 HSK
- **年化收益率**: 5%（部署时配置）
- **锁定期**: 365天（固定）
- **白名单模式**: 关闭（所有用户可自由质押）

### 产品 2: （高级质押）
- **目标用户**: 大户/机构
- **最小质押门槛**: 500,000 HSK
- **年化收益率**: 16%（部署时配置）
- **锁定期**: 365天（固定）
- **白名单模式**: 启用（需要管理员授权）

## 🚀 部署方式

### 方式一：分别部署（推荐）

#### 部署Staking
```bash
# 部署到测试网（需要提供时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# 部署到主网
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy
```

#### 部署 
```bash
# 部署到测试网（需要提供时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium:testnet

# 部署到主网
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium
```

**注意**：一个产品需要分别部署，每个产品都有独立的代理合约和配置。

## 📝 部署后配置

### 1. 为  添加白名单用户

 产品启用了白名单模式，需要手动添加授权用户：

```bash
# 批量添加白名单（最多100个地址）
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet

# 批量移除白名单
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet
```

### 2. 向奖励池充值

一个产品需要独立的奖励池，需要分别充值：

```bash
# 为Staking 充值
REWARD_AMOUNT="10000" npm run rewards:add:testnet

# 为  充值
REWARD_AMOUNT="20000" npm run rewards:add:premium:testnet
```

### 3. 验证配置

部署完成后，可以验证一个产品的配置：

```bash
# 检查Staking 的配置参数
npm run query:status:testnet

# 检查  的配置参数
npm run query:status:premium:testnet
```

## 💡 使用示例

### 普通用户质押（Staking）

```bash
# 使用 stake 脚本（锁定期固定365天）
STAKE_AMOUNT="2000" npm run stake:testnet
```

**说明**: V2版本使用固定365天锁定期，无需指定锁定期参数。

### 大户质押（）

```bash
# 使用 stake 脚本（锁定期固定365天）
STAKE_AMOUNT="600000" npm run stake:premium:testnet
```

**说明**: V2版本使用固定365天锁定期，无需指定锁定期参数。需要先被添加到白名单才能质押。

## 🔧 管理员操作

### 设置质押时间窗口

**设置质押开始时间**：

```bash
START_TIME="1735689600" npm run config:set-start-time:testnet
```

**说明**：
- 部署脚本默认设置开始时间为部署后7天
- 用户只能在开始时间之后进行质押
- 管理员可以随时调整开始时间

**设置质押截止时间**：

```bash
END_TIME="1767225600" npm run config:set-end-time:testnet
```

**说明**：
- 用户只能在 `stakeStartTime` 到 `stakeEndTime` 之间进行质押
- 结束时间必须是未来的时间

### 注意事项

**重要**：HSKStaking 采用固定锁定期设计（365天），不支持修改锁定期。

如需提供不同的锁定期或收益率配置，请部署新的合约实例。

### 调整最大质押量

```bash
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet
```

## 📊 产品对比

| 特性 | Staking |  |
|------|-------------|-----------|
| 目标用户 | 普通用户 | 大户/机构 |
| 最小质押 | 1 HSK | 500,000 HSK |
| 年化收益 | 5%（部署时配置） | 16%（部署时配置） |
| 白名单 | 否 | 是 |
| 锁定期 | 365天（固定） | 365天（固定） |
| 最大总质押量 | 30,000,000 HSK（池子上限） | 30,000,000 HSK（池子上限） |

## ⚠️ 重要提醒

1. **质押时间窗口**: 部署时必须提供 `STAKE_START_TIME` 和 `STAKE_END_TIME` 环境变量（Unix 时间戳，秒级）。管理员可以通过 `setStakeStartTime` 和 `setStakeEndTime` 函数调整质押时间窗口
2. **独立部署**: 一个产品是完全独立的合约实例，互不影响
3. **独立奖励池**: 每个产品需要独立的奖励池，需要分别管理和充值
4. **白名单管理**:  产品启用白名单，需要管理员手动添加授权用户
5. **参数配置**: 部署后可以通过管理员函数调整参数，但已存在的质押位置不受影响
6. **奖励计算**: 奖励计算逻辑相同，但收益率不同（5% vs 16%）

## 🔍 监控和查询

### 查询用户质押情况

```bash
# 查询用户质押情况
npm run query:stakes:testnet

# 查询指定用户的质押情况
USER_ADDRESS="0x..." npm run query:stakes:testnet
```

### 查询合约状态

```bash
# 查询合约状态
npm run query:status:testnet

# 查询  合约状态
npm run query:status:premium:testnet
```

## 📚 相关文档

- [主 README](../README.md)
- [合约架构说明](./CONTRACT_ARCHITECTURE.md) - **合约架构详解（开发必读）**
- [产品方案详细文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [快速开始指南](./QUICK_START_DUAL_TIER.md) - 快速部署指南
- [技术常见问题](./TECHNICAL_FAQ.md) - 技术机制说明
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 1.0.0  
**维护者**: HashKey 技术团队

