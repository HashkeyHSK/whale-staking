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
# 方式1: 查询指定位置的待领取奖励
POSITION_ID="1" npm run query:pending-reward:testnet

# 方式2: 查询用户所有位置的待领取奖励（不提供POSITION_ID）
npm run query:pending-reward:testnet

# 方式3: 查询指定用户的所有位置（需要该用户的账户签名）
USER_ADDRESS="0x..." npm run query:pending-reward:testnet
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
├── normal/                    # 普通质押
│   ├── deploy.ts             # 部署合约
│   ├── upgrade.ts            # 升级合约
│   ├── stake.ts              # 质押操作
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── emergency-withdraw.ts # 紧急提取本金
│   ├── withdraw-excess.ts    # 提取多余奖励
│   ├── verify-forge.ts       # 验证合约（使用 Foundry）
│   ├── config/               # 配置管理
│   │   ├── pause.ts          # 暂停合约
│   │   ├── unpause.ts        # 恢复合约
│   │   ├── set-start-time.ts # 设置开始时间
│   │   ├── set-end-time.ts   # 设置结束时间
│   │   ├── set-min-stake.ts  # 设置最小质押金额
│   │   ├── set-max-total-staked.ts # 设置最大总质押量
│   │   └── enable-emergency.ts # 启用紧急模式
│   └── query/                # 状态查询
│       ├── check-status.ts   # 查询合约状态
│       ├── check-stakes.ts   # 查询质押信息
│       └── pending-reward.ts # 查询待领取奖励
│
├── premium/                   # 高级质押（✅ 已完成）
│   ├── deploy.ts             # 部署合约
│   ├── upgrade.ts            # 升级合约
│   ├── stake.ts              # 质押操作（需白名单）
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── emergency-withdraw.ts # 紧急提取本金
│   ├── withdraw-excess.ts    # 提取多余奖励
│   ├── verify-forge.ts       # 验证合约
│   ├── whitelist/            # 白名单管理
│   │   ├── add-batch.ts      # 批量添加白名单
│   │   ├── remove-batch.ts   # 批量移除白名单
│   │   ├── check-user.ts     # 查询用户白名单状态
│   │   └── toggle-mode.ts    # 切换白名单模式
│   ├── config/               # 配置管理
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   ├── set-max-total-staked.ts
│   │   └── enable-emergency.ts
│   └── query/                # 状态查询
│       ├── check-status.ts
│       ├── check-stakes.ts
│       ├── pending-reward.ts
│       └── check-whitelist.ts
│
├── dev/                       # 开发脚本
│   ├── compile.ts            # 编译合约
│   ├── clean.ts              # 清理编译产物
│   ├── test-all.ts           # 运行所有测试
│   └── coverage.ts           # 生成测试覆盖率报告
│
├── test/                      # 测试脚本
│   ├── helpers/              # 测试辅助函数
│   │   ├── fixtures.ts       # 测试夹具
│   │   └── test-utils.ts     # 测试工具函数
│   └── integration/          # 集成测试
│       ├── deploy-test.ts    # 部署测试
│       ├── stake-test.ts     # 质押操作测试
│       └── whitelist-test.ts # 白名单功能测试
│
└── tools/                     # 工具脚本
    ├── extract-abi.ts        # 提取 ABI
    ├── generate-types.ts     # 生成 TypeScript 类型
    └── compare-contracts.ts  # 对比合约差异
```

## 🔧 配置

### 环境变量

```bash
# 合约地址
export NORMAL_STAKING_ADDRESS="0x..."
export PREMIUM_STAKING_ADDRESS="0x..."

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
export NEW_MAX_TOTAL_STAKED="10000000"  # 新的最大总质押量（HSK，0 表示无限制）

# 高级操作
export WITHDRAW_AMOUNT="100"       # 提取金额
export CONFIRM_EMERGENCY="YES_I_UNDERSTAND"  # 确认启用紧急模式

# 升级相关
export PROXY_ADMIN_ADDRESS="0x..."  # ProxyAdmin 地址（升级时必需，通常是部署者地址）
export NEW_IMPLEMENTATION_ADDRESS="0x..."  # 新实现合约地址（可选，不提供则自动部署）

# 白名单相关（Premium Staking）
export WHITELIST_ADDRESSES="0x123...,0x456..."  # 白名单地址列表（逗号分隔，最多100个）
export ENABLE="true"  # 启用/禁用白名单模式（"true" 或 "false"）
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

### 合约升级
- `npm run upgrade:normal:testnet` - 升级普通质押合约（测试网）
- `npm run upgrade:premium:testnet` - 升级高级质押合约（测试网）

### 开发工具
- `npm run dev:compile` - 编译合约（通过脚本）
- `npm run dev:clean` - 清理编译产物（通过脚本）
- `npm run dev:test` - 运行所有测试（通过脚本）
- `npm run dev:coverage` - 生成测试覆盖率报告（通过脚本）

### 集成测试
- `npm run test:integration:deploy` - 运行部署集成测试
- `npm run test:integration:stake` - 运行质押操作集成测试
- `npm run test:integration:whitelist` - 运行白名单功能集成测试

### 工具脚本
- `npm run tools:extract-abi` - 提取合约 ABI
- `npm run tools:generate-types` - 生成 TypeScript 类型
- `npm run tools:compare-contracts` - 对比合约差异

### 质押操作（Normal Staking）
- `npm run stake:testnet` - 质押
- `npm run unstake:testnet` - 解除质押
- `npm run claim:testnet` - 领取奖励

### 质押操作（Premium Staking）
- `npm run stake:premium:testnet` - 质押（需白名单）
- `npm run unstake:premium:testnet` - 解除质押
- `npm run claim:premium:testnet` - 领取奖励

### 白名单管理（Premium Staking）
- `npm run whitelist:add-batch:premium:testnet` - 批量添加白名单
- `npm run whitelist:remove-batch:premium:testnet` - 批量移除白名单
- `npm run whitelist:check-user:premium:testnet` - 查询用户白名单状态
- `npm run whitelist:toggle-mode:premium:testnet` - 切换白名单模式

### 奖励管理
- `npm run rewards:add:testnet` - 添加奖励
- `npm run withdraw-excess:testnet` - 提取多余奖励（仅 owner）

### 配置管理
- `npm run config:pause:testnet` - 暂停合约
- `npm run config:unpause:testnet` - 恢复合约
- `npm run config:set-start-time:testnet` - 设置开始时间
- `npm run config:set-end-time:testnet` - 设置结束时间
- `npm run config:set-min-stake:testnet` - 设置最小质押金额
- `npm run config:set-max-total-staked:testnet` - 设置最大总质押量
- `npm run config:set-max-total-staked:premium:testnet` - 设置最大总质押量（Premium）
- `npm run config:enable-emergency:testnet` - 启用紧急模式（⚠️ 不可逆）

### 状态查询（Normal Staking）
- `npm run query:status:testnet` - 查询合约状态
- `npm run query:stakes:testnet` - 查询质押信息
- `npm run query:pending-reward:testnet` - 查询待领取奖励
  - 不提供 `POSITION_ID` 时，会查询用户所有位置的待领取奖励
  - 提供 `POSITION_ID` 时，只查询指定位置的待领取奖励
  - 可通过 `USER_ADDRESS` 环境变量指定查询的用户地址

### 状态查询（Premium Staking）
- `npm run query:status:premium:testnet` - 查询合约状态
- `npm run query:stakes:premium:testnet` - 查询质押信息
- `npm run query:pending-reward:premium:testnet` - 查询待领取奖励
  - 不提供 `POSITION_ID` 时，会查询用户所有位置的待领取奖励
  - 提供 `POSITION_ID` 时，只查询指定位置的待领取奖励
  - 可通过 `USER_ADDRESS` 环境变量指定查询的用户地址
- `npm run query:check-whitelist:premium:testnet` - 查询白名单配置

### 紧急操作
- `npm run emergency-withdraw:testnet` - 紧急提取本金（仅紧急模式）

## ⚠️ 重要提示

1. **锁定期**: 固定 365 天
2. **奖励率**: 
   - Normal Staking: 8% APY (800 basis points)
   - Premium Staking: 16% APY (1600 basis points)
3. **最小质押**: 
   - Normal Staking: 1 HSK（可通过 owner 修改）
   - Premium Staking: 500,000 HSK（可通过 owner 修改）
4. **最大总质押量**: 
   - Normal Staking: 10,000,000 HSK（可通过 owner 修改，0 表示无限制）
   - Premium Staking: 20,000,000 HSK（可通过 owner 修改，0 表示无限制）
5. **白名单**: 
   - Normal Staking: 关闭（所有用户可质押）
   - Premium Staking: 启用（仅白名单用户可质押）
6. **测试优先**: 先在测试网验证

## 📊 脚本统计

**当前已实现**: 59 个脚本文件
- ✅ Normal Staking: 15 个脚本
- ✅ Premium Staking: 24 个脚本（包含白名单管理）
- ✅ 开发脚本: 4 个脚本
- ✅ 测试脚本: 5 个脚本
- ✅ 工具脚本: 3 个脚本
- ✅ 共享模块: 4 个文件

**Normal Staking 脚本包含**：
- 基础操作脚本：9 个（deploy, upgrade, stake, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge）
- 配置管理脚本：7 个（pause, unpause, set-start-time, set-end-time, set-min-stake, set-max-total-staked, enable-emergency）
- 查询脚本：4 个（check-status, check-stakes, pending-reward, position-info）

**Premium Staking 脚本包含**：
- 基础操作脚本：9 个（deploy, upgrade, stake, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge）
- 白名单管理脚本：4 个（add-batch, remove-batch, check-user, toggle-mode）
- 配置管理脚本：7 个（pause, unpause, set-start-time, set-end-time, set-min-stake, set-max-total-staked, enable-emergency）
- 查询脚本：5 个（check-status, check-stakes, pending-reward, position-info, check-whitelist）

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
使用 `getUserPositionIds(address)` 函数获取用户的所有 positionId

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

**Q: 如何设置最大总质押量？**
最大总质押量是整个产品池的上限，所有用户质押金额总和不能超过此限制：
```bash
# 设置 Normal Staking 最大总质押量为 15,000,000 HSK
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet

# 设置 Premium Staking 最大总质押量为 25,000,000 HSK
NEW_MAX_TOTAL_STAKED="25000000" npm run config:set-max-total-staked:premium:testnet

# 移除限制（设置为 0）
NEW_MAX_TOTAL_STAKED="0" npm run config:set-max-total-staked:testnet
```

**注意**：
- 设置的最大总质押量不能小于当前总质押量
- 设置为 0 表示无限制
- 查询合约状态时会显示最大总质押量和剩余容量

**Q: 如何升级合约？**
升级脚本会自动检测 ProxyAdmin 类型并使用正确的方式执行升级：
```bash
# 升级普通质押合约（自动部署新实现）
# 脚本会自动从存储槽读取 ProxyAdmin 地址，无需手动指定
npm run upgrade:normal:testnet

# 如果 ProxyAdmin 地址与当前签名者不同，可以手动指定
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:normal:testnet

# 使用已部署的实现合约升级
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:normal:testnet

# 升级高级质押合约
npm run upgrade:premium:testnet
```

**升级脚本特性**：
- ✅ **自动检测 ProxyAdmin**：从存储槽读取实际的 ProxyAdmin 地址
- ✅ **支持两种模式**：自动识别 ProxyAdmin 合约或 EOA，使用正确的升级方式
- ✅ **智能 Fallback**：如果 `upgrade()` 失败，自动尝试 `upgradeAndCall()`
- ✅ **状态验证**：升级前后自动验证合约状态一致性
- ✅ **浏览器链接**：升级成功后自动打印交易哈希和浏览器链接
- ✅ **实现验证**：升级后自动验证新实现地址是否正确

⚠️ **升级注意事项**：
- 确保新实现合约与现有存储布局兼容
- 升级后所有状态数据会保留
- 升级前建议先在测试网验证
- 升级后需要验证新实现合约（脚本会提示命令）
- 升级交易会显示在 ProxyAdmin 合约页面，而不是 Proxy 页面

**Q: 如何使用开发脚本？**
```bash
# 编译合约
npm run dev:compile

# 清理编译产物
npm run dev:clean

# 运行所有测试
npm run dev:test

# 生成覆盖率报告（需要安装 solidity-coverage）
npm run dev:coverage
```

**Q: 如何运行集成测试？**
```bash
# 运行部署测试
npm run test:integration:deploy

# 运行质押操作测试
npm run test:integration:stake

# 运行白名单功能测试
npm run test:integration:whitelist
```

**Q: 如何使用工具脚本？**
```bash
# 提取 ABI（需要先编译合约）
npm run tools:extract-abi

# 生成 TypeScript 类型（编译时自动生成）
npm run tools:generate-types

# 对比合约实现
npm run tools:compare-contracts HSKStaking
```

**Q: 如何使用 Premium Staking 白名单功能？**
```bash
# 添加用户到白名单（批量，最多100个）
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet

# 从白名单移除用户
WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet

# 查询用户白名单状态
USER_ADDRESS="0x123..." npm run whitelist:check-user:premium:testnet

# 切换白名单模式（启用/禁用）
ENABLE="true" npm run whitelist:toggle-mode:premium:testnet

# 查询白名单配置和用户状态
USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:premium:testnet
```

**Q: Premium Staking 质押时提示不在白名单中？**
```bash
# 1. 检查用户是否在白名单中
USER_ADDRESS="0x..." npm run whitelist:check-user:premium:testnet

# 2. 如果不在，联系管理员添加到白名单
# 管理员执行：
WHITELIST_ADDRESSES="0x..." npm run whitelist:add-batch:premium:testnet

# 3. 确认白名单模式已启用
npm run query:status:premium:testnet
```

## 🎯 合约配置

### Normal Staking

| 配置项 | 值 | 说明 |
|-------|---|------|
| 最小质押 | 1 HSK | 可通过 owner 修改 |
| 最大总质押量 | 10,000,000 HSK | 可通过 owner 修改（0 表示无限制） |
| 年化收益 | 8% | 固定在初始化时设置 |
| 锁定期 | 365 天 | 合约常量，不可修改 |
| 白名单 | 关闭 | 所有用户可质押 |

### Premium Staking

| 配置项 | 值 | 说明 |
|-------|---|------|
| 最小质押 | 500,000 HSK | 可通过 owner 修改 |
| 最大总质押量 | 20,000,000 HSK | 可通过 owner 修改（0 表示无限制） |
| 年化收益 | 16% | 固定在初始化时设置 |
| 锁定期 | 365 天 | 合约常量，不可修改 |
| 白名单 | 启用 | 仅白名单用户可质押 |

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

# 设置最大总质押量（0 表示无限制）
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet
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

详细说明请查看: `docs/SCRIPTS_ARCHITECTURE.md`

