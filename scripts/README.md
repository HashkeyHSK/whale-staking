# Scripts 使用指南

## 🚀 快速开始

### 1. 部署合约

```bash
# 部署时需要提供开始和结束时间（Unix 时间戳，秒级）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
```

**提示**：
- `STAKE_START_TIME`: 质押开始时间（Unix 时间戳，秒级）
- `STAKE_END_TIME`: 质押结束时间（Unix 时间戳，秒级）
- 可以使用在线工具转换：https://www.epochconverter.com/
- 或者使用命令：`date +%s` 获取当前时间戳

部署成功后，将代理合约地址保存到 `scripts/shared/constants.ts`。

### 2. 验证合约

```bash
# 验证实现合约（推荐使用 Foundry）
IMPLEMENTATION_ADDRESS="0x..." npm run verify:forge:testnet
```

部署脚本会输出实现合约地址，使用该地址进行验证。

### 3. 添加奖励

```bash
REWARD_AMOUNT="100" npm run rewards:add:testnet
```

### 4. 质押

```bash
STAKE_AMOUNT="2" npm run stake:testnet
```

### 5. 查询

```bash
# 查询合约状态
npm run query:status:testnet

# 查询我的质押
npm run query:stakes:testnet

# 查询待领取奖励
POSITION_ID="1" npm run query:pending-reward:testnet
```

### 6. 领取奖励

```bash
POSITION_ID="1" npm run claim:testnet
```

### 7. 解除质押

```bash
POSITION_ID="1" npm run unstake:testnet
```

## 📁 目录结构

```
scripts/
├── README.md                 # 使用指南（本文件）
│
├── shared/                    # 共享模块
│   ├── constants.ts          # 配置和地址
│   ├── types.ts              # 类型定义
│   ├── helpers.ts            # 辅助函数
│   └── utils.ts              # 工具函数
│
└── normal/                    # 普通质押
    ├── deploy.ts             # 部署合约
    ├── stake.ts              # 质押操作
    ├── unstake.ts            # 解除质押
    ├── claim-rewards.ts      # 领取奖励
    ├── add-rewards.ts        # 添加奖励池
    ├── emergency-withdraw.ts # 紧急提取本金
    ├── withdraw-excess.ts    # 提取多余奖励
    ├── verify-forge.ts       # 验证合约（使用 Foundry）
    ├── config/               # 配置管理
    │   ├── pause.ts          # 暂停合约
    │   ├── unpause.ts        # 恢复合约
    │   ├── set-start-time.ts # 设置开始时间
    │   ├── set-end-time.ts   # 设置结束时间
    │   ├── set-min-stake.ts  # 设置最小质押金额
    │   └── enable-emergency.ts # 启用紧急模式
    └── query/                # 状态查询
        ├── check-status.ts   # 查询合约状态
        ├── check-stakes.ts   # 查询质押信息
        └── pending-reward.ts # 查询待领取奖励
```

## 🔧 配置

### 环境变量

```bash
# 合约地址
export NORMAL_STAKING_ADDRESS="0x..."

# 操作相关
export STAKE_AMOUNT="1"           # 质押金额
export REWARD_AMOUNT="100"        # 奖励金额
export POSITION_ID="1"              # Position ID
export USER_ADDRESS="0x..."         # 查询指定用户

# 验证相关
export IMPLEMENTATION_ADDRESS="0x..."  # 实现合约地址（用于验证）
export RPC_URL="https://testnet.hsk.xyz"  # RPC URL（可选）
export VERIFIER_URL="https://testnet-explorer.hsk.xyz/api/"  # 验证器 URL（可选）

# 部署相关（必需）
export STAKE_START_TIME="1735689600"  # 质押开始时间（Unix 时间戳，秒级，部署时必需）
export STAKE_END_TIME="1767225600"    # 质押结束时间（Unix 时间戳，秒级，部署时必需）

# 配置相关
export START_TIME="1735689600"      # 开始时间（Unix 时间戳，秒级，用于修改配置）
export END_TIME="1735689600"        # 结束时间（Unix 时间戳，秒级，用于修改配置）
export NEW_MIN_STAKE="1"            # 新的最小质押金额

# 高级操作
export WITHDRAW_AMOUNT="100"       # 提取金额
export CONFIRM_EMERGENCY="YES_I_UNDERSTAND"  # 确认启用紧急模式
```

### 合约地址配置

编辑 `scripts/shared/constants.ts`:

```typescript
export const TESTNET_ADDRESSES: ContractAddresses = {
  normalStaking: "0x...",  // 填写部署的地址
  premiumStaking: "",
};
```

## 📝 命令列表

### 部署
- `npm run deploy` - 部署到主网
- `npm run deploy:testnet` - 部署到测试网
- `npm run deploy:local` - 部署到本地

### 合约验证
- `npm run verify:forge` - 验证实现合约（主网，使用 Foundry）
- `npm run verify:forge:testnet` - 验证实现合约（测试网，使用 Foundry）

### 质押操作
- `npm run stake:testnet` - 质押
- `npm run unstake:testnet` - 解除质押
- `npm run claim:testnet` - 领取奖励

### 奖励管理
- `npm run rewards:add:testnet` - 添加奖励
- `npm run withdraw-excess:testnet` - 提取多余奖励（仅 owner）

### 配置管理
- `npm run config:pause:testnet` - 暂停合约
- `npm run config:unpause:testnet` - 恢复合约
- `npm run config:set-start-time:testnet` - 设置开始时间
- `npm run config:set-end-time:testnet` - 设置结束时间
- `npm run config:set-min-stake:testnet` - 设置最小质押金额
- `npm run config:enable-emergency:testnet` - 启用紧急模式（⚠️ 不可逆）

### 状态查询
- `npm run query:status:testnet` - 查询合约状态
- `npm run query:stakes:testnet` - 查询质押信息
- `npm run query:pending-reward:testnet` - 查询待领取奖励

### 紧急操作
- `npm run emergency-withdraw:testnet` - 紧急提取本金（仅紧急模式）

## ⚠️ 重要提示

1. **锁定期**: 固定 365 天
2. **奖励率**: 8% APY (800 basis points)
3. **最小质押**: 1 HSK（可通过 owner 修改）
4. **白名单**: 关闭（所有用户可质押）
5. **测试优先**: 先在测试网验证

## 🐛 常见问题

**Q: 合约已暂停，无法质押**
```bash
npm run config:unpause:testnet
```

**Q: 余额不足**
确保账户有足够的 HSK（质押金额 + gas 费）

**Q: 锁定期未满**
等待 365 天后才能解除质押，可查看待领取奖励：
```bash
POSITION_ID="1" npm run query:pending-reward:testnet
```

**Q: 部署时如何设置开始/结束时间？**
部署时必须提供 Unix 时间戳（秒级）：
```bash
# 部署时设置时间（例如：2025-01-01 00:00:00 UTC 开始，2026-01-01 00:00:00 UTC 结束）
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
```

**Q: 如何修改已部署合约的开始/结束时间？**
使用 Unix 时间戳（秒级）：
```bash
# 设置开始时间（例如：2025-01-01 00:00:00 UTC）
START_TIME="1735689600" npm run config:set-start-time:testnet

# 设置结束时间（例如：2026-01-01 00:00:00 UTC）
END_TIME="1767225600" npm run config:set-end-time:testnet
```
可以使用在线工具转换：https://www.epochconverter.com/

**Q: 查询很慢**
建议在合约中添加 `getUserPositions(address)` 函数

**Q: 紧急模式是什么？**
紧急模式用于应对严重安全问题：
- ⚠️ 不可逆操作
- 用户只能提取本金，无奖励
- 需要明确确认才能启用

**Q: 如何提取多余的奖励池资金？**
只能提取超过 totalPendingRewards 的部分：
```bash
# 提取 1000 HSK
WITHDRAW_AMOUNT="1000" npm run withdraw-excess:testnet

# 提取所有可用余额（不指定金额）
npm run withdraw-excess:testnet
```

## 🎯 合约配置

| 配置项 | 值 | 说明 |
|-------|---|------|
| 最小质押 | 1 HSK | 可通过 owner 修改 |
| 年化收益 | 8% | 固定在初始化时设置 |
| 锁定期 | 365 天 | 合约常量，不可修改 |
| 白名单 | 关闭 | 所有用户可质押 |

## 🔐 管理员操作

### 配置管理（需要 owner 权限）

```bash
# 暂停合约
npm run config:pause:testnet

# 恢复合约
npm run config:unpause:testnet

# 设置质押时间（使用 Unix 时间戳）
# 提示：可以使用 https://www.epochconverter.com/ 将日期转换为时间戳
START_TIME="1735689600" npm run config:set-start-time:testnet
END_TIME="1735689600" npm run config:set-end-time:testnet

# 设置最小质押金额
NEW_MIN_STAKE="5" npm run config:set-min-stake:testnet
```

### 奖励池管理

```bash
# 添加奖励
REWARD_AMOUNT="50000" npm run rewards:add:testnet

# 提取多余资金
WITHDRAW_AMOUNT="1000" npm run withdraw-excess:testnet
```

### 紧急操作（慎用！）

```bash
# 启用紧急模式（⚠️ 不可逆！）
CONFIRM_EMERGENCY=YES_I_UNDERSTAND npm run config:enable-emergency:testnet
```

## 📖 完整文档

详细说明请查看: `docs/SCRIPTS_REFACTORING.md`

