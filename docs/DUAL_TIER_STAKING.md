# 双层 Staking 产品方案

基于现有合约架构，通过部署两个独立的合约实例来实现两套不同的产品方案。

## 📋 产品方案概览

### 产品 1: 普通 Staking（委托质押）
- **目标用户**: 普通用户
- **最小质押门槛**: 1 HSK
- **年化收益率**: 8%（部署时配置）
- **锁定期**: 365天（固定）
- **白名单模式**: 关闭（所有用户可自由质押）

### 产品 2: Premium Staking（高级质押）
- **目标用户**: 大户/机构
- **最小质押门槛**: 500,000 HSK
- **年化收益率**: 16%（部署时配置）
- **锁定期**: 365天（固定）
- **白名单模式**: 启用（需要管理员授权）

## 🚀 部署方式

### 方式一：分别部署（推荐用于测试）

#### 部署普通 Staking
```bash
npx hardhat run scripts/deployNormalStaking.ts --network <network>
```

#### 部署 Premium Staking
```bash
npx hardhat run scripts/deployPremiumStaking.ts --network <network>
```

### 方式二：一次性部署两个产品
```bash
npx hardhat run scripts/deployDualTier.ts --network <network>
```

## 📝 部署后配置

### 1. 为 Premium Staking 添加白名单用户

Premium Staking 产品启用了白名单模式，需要手动添加授权用户：

```bash
# 添加单个用户
npx hardhat run scripts/addToWhitelist.ts --network <network> \
  -- --contract <PREMIUM_STAKING_ADDRESS> --user <USER_ADDRESS>

# 批量添加用户
npx hardhat run scripts/addToWhitelistBatch.ts --network <network> \
  -- --contract <PREMIUM_STAKING_ADDRESS> --users <USER_ADDRESS1,USER_ADDRESS2,...>
```

### 2. 向奖励池充值

两个产品需要独立的奖励池，需要分别充值：

```bash
# 为普通 Staking 充值
npx hardhat run scripts/add-rewards.ts --network <network> \
  -- --contract <NORMAL_STAKING_ADDRESS> --amount <AMOUNT>

# 为 Premium Staking 充值
npx hardhat run scripts/add-rewards.ts --network <network> \
  -- --contract <PREMIUM_STAKING_ADDRESS> --amount <AMOUNT>
```

### 3. 验证配置

部署完成后，可以验证两个产品的配置：

```bash
# 检查普通 Staking 的配置参数
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <NORMAL_STAKING_ADDRESS>

# 检查 Premium Staking 的配置参数
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <PREMIUM_STAKING_ADDRESS>
```

## 💡 使用示例

### 普通用户质押（普通 Staking）

```bash
# 使用 stake.ts 脚本（锁定期固定365天）
npx hardhat run scripts/stake.ts --network <network> \
  -- --contract <NORMAL_STAKING_ADDRESS> \
  --amount 2000
```

**说明**: V2版本使用固定365天锁定期，无需指定锁定期参数。

### 大户质押（Premium Staking）

```bash
# 使用 stake.ts 脚本（锁定期固定365天）
npx hardhat run scripts/stake.ts --network <network> \
  -- --contract <PREMIUM_STAKING_ADDRESS> \
  --amount 600000
```

**说明**: V2版本使用固定365天锁定期，无需指定锁定期参数。需要先被添加到白名单才能质押。

## 🔧 管理员操作

### 设置质押时间窗口

**设置质押开始时间**：

```bash
npx hardhat run scripts/setStakeStartTime.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --startTime <TIMESTAMP>
```

**说明**：
- 部署脚本默认设置开始时间为部署后7天
- 用户只能在开始时间之后进行质押
- 管理员可以随时调整开始时间

**设置质押截止时间**：

```bash
npx hardhat run scripts/setStakeEndTime.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --endTime <TIMESTAMP>
```

**说明**：
- 用户只能在 `stakeStartTime` 到 `stakeEndTime` 之间进行质押
- 结束时间必须是未来的时间

### 注意事项

**重要**：Layer2StakingV2 采用固定锁定期设计（365天），不支持修改锁定期。

如需提供不同的锁定期或收益率配置，请部署新的合约实例。

### 调整最大质押量

```bash
npx hardhat run scripts/setMaxStake.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --max <NEW_MAX_AMOUNT>
```

## 📊 产品对比

| 特性 | 普通 Staking | Premium Staking |
|------|-------------|-----------|
| 目标用户 | 普通用户 | 大户/机构 |
| 最小质押 | 1 HSK | 500,000 HSK |
| 年化收益 | 8%（部署时配置） | 16%（部署时配置） |
| 白名单 | 否 | 是 |
| 锁定期 | 365天（固定） | 365天（固定） |
| 最大总质押量 | 10,000,000 HSK（池子上限） | 20,000,000 HSK（池子上限） |

## ⚠️ 重要提醒

1. **质押时间窗口**: 部署脚本默认设置开始时间为部署后7天，管理员可以通过 `setStakeStartTime` 和 `setStakeEndTime` 函数调整质押时间窗口
2. **独立部署**: 两个产品是完全独立的合约实例，互不影响
3. **独立奖励池**: 每个产品需要独立的奖励池，需要分别管理和充值
4. **白名单管理**: Premium Staking 产品启用白名单，需要管理员手动添加授权用户
5. **参数配置**: 部署后可以通过管理员函数调整参数，但已存在的质押位置不受影响
6. **奖励计算**: 奖励计算逻辑相同，但收益率不同（8% vs 16%）

## 🔍 监控和查询

### 查询用户质押情况

```bash
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

### 查询合约状态

```bash
# 查询用户质押信息和合约状态
npx hardhat run scripts/checkStakes.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

## 📚 相关文档

- [主 README](../README.md)
- [产品方案详细文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [产品开发文档](./PRODUCT_PLANS_DEV.md) - 开发团队文档
- [快速开始指南](./QUICK_START_DUAL_TIER.md) - 快速部署指南
- [技术常见问题](./TECHNICAL_FAQ.md) - 技术机制说明
- [术语表](./GLOSSARY.md) - 术语定义
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11

