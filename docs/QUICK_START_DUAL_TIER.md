# 双层 Staking 快速开始指南

## 🎯 快速部署

### 步骤 1: 编译合约

```bash
npx hardhat compile
```

### 步骤 2: 部署双层产品

选择以下任一方式：

**方式一：一次性部署（推荐）**

```bash
npx hardhat run scripts/deployDualTier.ts --network hashkeyTestnet
```

**方式二：分别部署**

```bash
# 部署普通 Staking
npx hardhat run scripts/deployNormalStaking.ts --network hashkeyTestnet

# 部署 Premium Staking
npx hardhat run scripts/deployReStaking.ts --network hashkeyTestnet
```

部署后会输出两个合约地址，请保存：

```bash
# 示例输出
export NORMAL_STAKING_ADDRESS=0x...
export PREMIUM_STAKING_ADDRESS=0x...
```

### 步骤 3: 配置 Premium Staking 白名单

Premium Staking 产品需要白名单授权：

```bash
# 添加单个用户
npx hardhat run scripts/addToWhitelist.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS --user 0xYourUserAddress

# 或批量添加
npx hardhat run scripts/addToWhitelistBatch.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS --users 0xUser1,0xUser2,0xUser3
```

### 步骤 4: 充值奖励池

两个产品需要独立的奖励池：

```bash
# 为普通 Staking 充值（示例：1000 HSK）
npx hardhat run scripts/add-rewards.ts --network hashkeyTestnet \
  -- --contract $NORMAL_STAKING_ADDRESS --amount 1000

# 为 Premium Staking 充值（示例：10000 HSK）
npx hardhat run scripts/add-rewards.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS --amount 10000
```

## 💰 用户质押示例

### 普通用户质押（普通 Staking）

```bash
# 质押 2000 HSK（锁定期固定365天，8% APY）
npx hardhat run scripts/stake.ts --network hashkeyTestnet \
  -- --contract $NORMAL_STAKING_ADDRESS \
  --amount 2000
```

### 大户质押（Premium Staking）

```bash
# 质押 600000 HSK（锁定期固定365天，16% APY）
# 注意：需要先被添加到白名单
npx hardhat run scripts/stake.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS \
  --amount 600000
```

## 📊 查询和监控

### 查看锁定期选项

```bash
# 普通 Staking
npx hardhat run scripts/checkLockPeriods.ts --network hashkeyTestnet \
  -- --contract $NORMAL_STAKING_ADDRESS

# Premium Staking
npx hardhat run scripts/checkLockPeriods.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS
```

### 查询用户质押情况

```bash
npx hardhat run scripts/checkStakes.ts --network hashkeyTestnet \
  -- --contract $NORMAL_STAKING_ADDRESS \
  --user 0xYourUserAddress
```

### 分析 APY

```bash
npx hardhat run scripts/analyzeAPY.ts --network hashkeyTestnet \
  -- --contract $NORMAL_STAKING_ADDRESS
```

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
# 设置为当前时间（立即开始）
const startTime = Math.floor(Date.now() / 1000);
npx hardhat run scripts/setStakeStartTime.ts --network hashkeyTestnet \
  -- --contract $CONTRACT_ADDRESS --startTime $startTime
```

**说明**：部署脚本默认设置开始时间为部署后7天，可以通过此脚本调整。

**设置质押截止时间**：

```bash
# 设置 30 天后截止
const endTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
npx hardhat run scripts/setStakeEndTime.ts --network hashkeyTestnet \
  -- --contract $CONTRACT_ADDRESS --endTime $endTime
```

### 调整最大质押量

```bash
npx hardhat run scripts/setMaxStake.ts --network hashkeyTestnet \
  -- --contract $CONTRACT_ADDRESS --max 20000000
```

## 📝 注意事项

1. **质押时间窗口**: 部署脚本默认设置开始时间为部署后7天，可以通过管理员函数调整
2. **独立部署**: 两个产品是完全独立的合约实例
3. **独立奖励池**: 每个产品需要独立的奖励池管理和充值
4. **白名单管理**: Premium Staking 必须启用白名单，需要管理员授权
5. **参数不可逆**: 已存在的质押位置不受配置更新影响
6. **奖励计算**: 奖励计算逻辑相同，但收益率不同

## 🆘 常见问题

### Q: 如何修改现有脚本使用新的合约地址？

A: 修改脚本中的合约地址，或使用命令行参数传入：

```bash
npx hardhat run scripts/stake.ts --network hashkeyTestnet \
  -- --contract <NEW_CONTRACT_ADDRESS> --amount 1000 --period 180
```

### Q: 如何检查白名单状态？

```bash
npx hardhat run scripts/checkWhitelist.ts --network hashkeyTestnet \
  -- --contract $PREMIUM_STAKING_ADDRESS --user 0xYourUserAddress
```

### Q: 如何修改锁定期或收益率？

Layer2StakingV2 采用固定锁定期（365天）和固定收益率设计，部署后不支持修改。

如需提供不同的锁定期或收益率配置，请部署新的合约实例。

## 📚 更多文档

- [主 README](../README.md)
- [完整部署文档](./DUAL_TIER_STAKING.md) - 技术部署文档
- [产品方案详细文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [技术常见问题](./TECHNICAL_FAQ.md) - 技术机制说明
- [术语表](./GLOSSARY.md) - 术语定义
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11

