# 双层 Staking 快速开始指南

## 🎯 快速部署

### 步骤 1: 编译合约

```bash
npm run compile
# 或
npx hardhat compile
```

### 步骤 2: 部署双层产品

**分别部署（推荐）**

```bash
# 部署普通 Staking（需要提供时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet

# 部署 Premium Staking（需要提供时间戳）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium:testnet
```

**注意**：部署时必须提供 `STAKE_START_TIME` 和 `STAKE_END_TIME` 环境变量（Unix 时间戳，秒级）。

部署后会输出两个合约地址，请保存：

```bash
# 示例输出
export NORMAL_STAKING_ADDRESS=0x...
export PREMIUM_STAKING_ADDRESS=0x...
```

### 步骤 3: 配置 Premium Staking 白名单

Premium Staking 产品需要白名单授权：

```bash
# 批量添加白名单（最多100个地址）
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet

# 批量移除白名单
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet
```

### 步骤 4: 充值奖励池

两个产品需要独立的奖励池：

```bash
# 为普通 Staking 充值（示例：10000 HSK）
REWARD_AMOUNT="10000" npm run rewards:add:testnet

# 为 Premium Staking 充值（示例：20000 HSK）
REWARD_AMOUNT="20000" npm run rewards:add:premium:testnet
```

## 💰 用户质押示例

### 普通用户质押（普通 Staking）

```bash
# 质押 2000 HSK（锁定期固定365天，8% APY）
STAKE_AMOUNT="2000" npm run stake:testnet
```

### 大户质押（Premium Staking）

```bash
# 质押 600000 HSK（锁定期固定365天，16% APY）
# 注意：需要先被添加到白名单
STAKE_AMOUNT="600000" npm run stake:premium:testnet
```

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

# 查看 Premium Staking 合约状态
npm run query:status:premium:testnet
```

**说明**: V2版本使用固定365天锁定期，无需查询锁定期选项。

## ⚙️ 产品配置对比

| 配置项 | 普通 Staking | Premium Staking |
|--------|-------------|-----------|
| 最小质押 | 1 HSK | 500,000 HSK |
| 年化收益 | 8%（部署时配置） | 16%（部署时配置） |
| 锁定期 | 365天（固定） | 365天（固定） |
| 白名单 | 关闭 | 启用 |
| 最大总质押 | 10,000,000 HSK（池子上限） | 20,000,000 HSK（池子上限） |

## 🔧 管理员操作

### 调整质押时间窗口

**设置质押开始时间**：

```bash
# 设置质押开始时间（使用 Unix 时间戳）
START_TIME="1735689600" npm run config:set-start-time:testnet
```

**说明**：部署时必须提供 `STAKE_START_TIME` 环境变量，可以通过此脚本调整。

**设置质押截止时间**：

```bash
# 设置质押结束时间（使用 Unix 时间戳）
END_TIME="1767225600" npm run config:set-end-time:testnet
```

### 调整最大总质押量

```bash
NEW_MAX_TOTAL_STAKED="20000000" npm run config:set-max-total-staked:testnet
```

## 📝 注意事项

1. **质押时间窗口**: 部署时必须提供 `STAKE_START_TIME` 和 `STAKE_END_TIME` 环境变量（Unix 时间戳，秒级），可以通过管理员函数调整
2. **独立部署**: 两个产品是完全独立的合约实例
3. **独立奖励池**: 每个产品需要独立的奖励池管理和充值
4. **白名单管理**: Premium Staking 必须启用白名单，需要管理员授权
5. **参数不可逆**: 已存在的质押位置不受配置更新影响
6. **奖励计算**: 奖励计算逻辑相同，但收益率不同

## 🆘 常见问题

### Q: 如何修改现有脚本使用新的合约地址？

A: 修改脚本中的合约地址，或使用命令行参数传入：

```bash
# 使用环境变量指定合约地址
NORMAL_STAKING_ADDRESS="<NEW_CONTRACT_ADDRESS>" STAKE_AMOUNT="1000" npm run stake:testnet
```

**说明**: V2版本使用固定365天锁定期，无需指定 period 参数。

### Q: 如何检查白名单状态？

```bash
# 查询用户白名单状态
USER_ADDRESS="0x..." npm run whitelist:check-user:premium:testnet

# 查询白名单配置和用户状态
USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:premium:testnet
```

### Q: 如何修改锁定期或收益率？

HSKStaking 采用固定锁定期（365天）和固定收益率设计，部署后不支持修改。

如需提供不同的锁定期或收益率配置，请部署新的合约实例。

## 📚 更多文档

- [主 README](../README.md)
- [合约架构说明](./CONTRACT_ARCHITECTURE.md) - **合约架构详解（开发必读）**
- [完整部署文档](./DUAL_TIER_STAKING.md) - 技术部署文档
- [产品方案详细文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [技术常见问题](./TECHNICAL_FAQ.md) - 技术机制说明
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 1.0.0  
**维护者**: HashKey 技术团队

