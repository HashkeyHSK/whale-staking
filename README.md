# Whale Staking Contract

一个基于 HashKey Layer2 网络的去中心化质押合约，支持多锁定期选项、白名单机制和可升级代理模式。

## 📋 目录

- [功能特性](#功能特性)
- [合约架构](#合约架构)
- [快速开始](#快速开始)
- [合约接口](#合约接口)
- [锁定期选项](#锁定期选项)
- [奖励计算](#奖励计算)
- [安全特性](#安全特性)
- [部署指南](#部署指南)
- [脚本说明](#脚本说明)
- [测试](#测试)
- [许可证](#许可证)

## ✨ 功能特性

### 核心功能
- **固定锁定期**：固定365天锁定期，简化用户选择，统一管理
- **可升级代理**：采用 Transparent Proxy 代理模式，支持合约升级
- **白名单机制**：支持白名单模式，可限制只有白名单用户才能质押
- **质押时间控制**：支持设置质押开始时间和结束时间，灵活控制质押时间窗口
- **奖励池管理**：独立的奖励池系统，确保奖励分配的安全性
- **固定收益率**：部署时配置固定年化收益率（8% 或 16%），清晰明确

### 安全特性
- **重入攻击防护**：使用 OpenZeppelin 的 ReentrancyGuard
- **紧急模式**：支持紧急暂停和紧急提取（仅提取本金）
- **暂停机制**：所有者可暂停合约功能
- **访问控制**：基于 OpenZeppelin Ownable 的所有权管理

## 🏗️ 合约架构

### 合约文件结构

```
contracts/
├── implementation/          # 实现合约目录
│   ├── HSKStaking.sol      # 主实现合约（核心质押逻辑）
│   └── StakingStorage.sol  # 存储层合约（定义所有状态变量）
├── constants/               # 常量定义目录
│   └── StakingConstants.sol # 质押常量（锁定期、精度等）
├── interfaces/              # 接口定义目录
│   └── IStake.sol          # 质押接口定义
├── NormalStakingProxy.sol   # 普通质押代理合约（1 HSK, 8% APY）
└── PremiumStakingProxy.sol  # 高级质押代理合约（500K HSK, 16% APY）
```

### 合约继承关系

```
HSKStaking (主实现合约)
├── IStaking (接口定义)
├── StakingStorage (存储层)
│   ├── Initializable (初始化控制)
│   └── OwnableUpgradeable (所有权管理)
├── StakingConstants (常量定义)
├── ReentrancyGuardUpgradeable (重入保护)
└── PausableUpgradeable (暂停功能)

代理合约架构
├── NormalStakingProxy (TransparentUpgradeableProxy)
│   ├── 指向 HSKStaking 实现
│   ├── 最小质押：1 HSK
│   └── 年化收益：8% (800 basis points)
└── PremiumStakingProxy (TransparentUpgradeableProxy)
    ├── 指向 HSKStaking 实现
    ├── 最小质押：500,000 HSK
    └── 年化收益：16% (1600 basis points)
```

**架构说明**：
- 两个代理合约共享同一个 HSKStaking 实现合约
- 通过 `initialize()` 函数的不同参数配置不同的产品特性
- 固定锁定期 365 天由 `StakingConstants.LOCK_PERIOD` 定义
- 年化收益率在部署时通过 `rewardRate` 参数设置（basis points: 100% = 10000）

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm, yarn 或 pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 配置环境变量

创建 `.env` 文件：

```env
PRIVATE_KEY=your_private_key_here
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

```bash
npx hardhat test
```

## 📖 合约接口

### 用户功能

#### `stake() payable → uint256 positionId`
创建新的质押位置（固定365天锁定期）
- **参数**: 无参数，通过 `msg.value` 发送质押金额，锁定期固定为365天
- **返回**: `positionId` - 质押位置 ID
- **要求**: 
  - 当前时间必须在质押时间窗口内（`stakeStartTime <= now < stakeEndTime`）
  - 如果启用白名单模式，必须是白名单用户（通过 `whitelistCheck` 修饰符检查）
  - 质押金额 >= 最小质押金额（`minStakeAmount`）
  - 奖励池余额充足（`rewardPoolBalance >= totalPendingRewards + potentialReward`）
  - 合约未暂停（`whenNotPaused`）
  - 非紧急模式（`whenNotEmergency`）

#### `unstake(uint256 positionId)`
解除质押并提取本金和奖励
- **参数**: `positionId` - 质押位置 ID
- **返回**: 自动转账本金和奖励到调用者地址
- **要求**: 
  - 必须是位置所有者（通过 `validPosition` 修饰符检查）
  - 锁定期已结束（`block.timestamp >= position.stakedAt + LOCK_PERIOD`，即365天）
  - 位置未解除质押（`!position.isUnstaked`）
- **提取金额**: 本金 + 全部累积奖励
- **重入保护**: 使用 `nonReentrant` 修饰符防止重入攻击

#### `claimReward(uint256 positionId) → uint256 reward`
提取奖励（不解除质押）
- **参数**: `positionId` - 质押位置 ID
- **返回**: `reward` - 提取的奖励金额
- **要求**: 
  - 必须是位置所有者（通过 `validPosition` 修饰符检查）
  - 必须有未提取的奖励（`reward > 0`）
  - 合约未暂停（`whenNotPaused`）
  - 非紧急模式（`whenNotEmergency`）
- **重入保护**: 使用 `nonReentrant` 修饰符防止重入攻击

#### `pendingReward(uint256 positionId) view → uint256 reward`
查询待提取奖励
- **参数**: `positionId` - 质押位置 ID
- **返回**: `reward` - 待提取奖励金额
- **说明**: 
  - 紧急模式下返回 0
  - 只能查询自己的质押位置
  - 奖励按秒连续累积，精确到秒

#### `getUserPositionIds(address user) view → uint256[] memory`
获取用户的所有质押位置ID
- **参数**: `user` - 用户地址
- **返回**: `uint256[]` - 该用户的所有 positionId 数组
- **说明**: 
  - 一次调用即可获取所有ID
  - 效率最高

#### `calculatePotentialReward(uint256 amount) view → uint256`
计算指定金额的潜在奖励
- **参数**: `amount` - 质押金额（wei）
- **返回**: `uint256` - 365天锁定期满后的潜在奖励金额
- **说明**: 
  - 用于质押前预览奖励
  - 基于当前奖励率计算

### 管理员功能

#### `updateWhitelistBatch(address[] calldata users, bool status)`
批量更新白名单
- **参数**: 
  - `users` - 用户地址数组（最多100个）
  - `status` - true 添加到白名单，false 从白名单移除
- **要求**: 仅管理员可调用（`onlyOwner`）
- **事件**: 为每个状态变更的用户触发 `WhitelistStatusChanged` 事件

#### `setWhitelistOnlyMode(bool enabled)`
启用/禁用白名单模式

#### `setStakeStartTime(uint256 newStartTime)`
设置质押开始时间
- **参数**: `newStartTime` - 质押开始时间戳（秒）
- **要求**: 
  - 仅管理员可调用（`onlyOwner`）
  - `newStartTime > 0` - 必须是有效时间
  - `newStartTime < stakeEndTime` - 必须早于结束时间
- **说明**: 用户只能在 `stakeStartTime` 之后开始质押
- **事件**: 触发 `StakeStartTimeUpdated` 事件

#### `setStakeEndTime(uint256 newEndTime)`
设置质押截止时间
- **参数**: `newEndTime` - 质押结束时间戳（秒）
- **要求**: 
  - 仅管理员可调用（`onlyOwner`）
  - `newEndTime > block.timestamp` - 必须是未来的时间
  - `newEndTime > stakeStartTime` - 必须晚于开始时间
- **说明**: 用户只能在 `stakeEndTime` 之前质押
- **事件**: 触发 `StakeEndTimeUpdated` 事件

#### `updateRewardPool() payable`
向奖励池充值
- **参数**: 通过 `msg.value` 发送充值金额
- **要求**: 仅管理员可调用（`onlyOwner`）
- **效果**: 增加 `rewardPoolBalance`
- **事件**: 触发 `RewardPoolUpdated` 事件

#### `enableEmergencyMode()`
启用紧急模式（暂停奖励分配）
- **要求**: 仅管理员可调用（`onlyOwner`）
- **效果**: 
  - 设置 `emergencyMode = true`
  - 暂停奖励分配（所有奖励相关函数返回0）
  - 阻止新质押
  - 允许紧急提取（仅本金）
- **事件**: 触发 `EmergencyModeEnabled` 事件
- **注意**: 当前版本紧急模式一旦启用无法通过函数关闭，可能需要合约升级

#### `emergencyWithdraw(uint256 positionId)`
紧急提取（仅提取本金，不包含奖励）
- **参数**: `positionId` - 质押位置 ID
- **要求**: 
  - 必须在紧急模式下（`emergencyMode == true`）
  - 必须是位置所有者（`position.owner == msg.sender`）
  - 位置未解除质押（`!position.isUnstaked`）
  - **不受锁定期限制**（可以随时提取）
- **提取金额**: 仅本金，**不包含奖励**
- **重入保护**: 使用 `nonReentrant` 修饰符防止重入攻击
- **事件**: 触发 `EmergencyWithdrawn` 事件

## 🔒 锁定期和收益率

### 固定锁定期

HSKStaking 采用固定锁定期设计：

| 参数 | 配置 | 说明 |
|------|------|------|
| 锁定期 | 365 天 | 固定，不可修改 |
| 收益率 | 8% 或 16% | 部署时配置（普通/Premium） |

### 奖励计算说明

**重要机制**：
- 奖励按秒连续累积，精确到秒，可随时提取
- 奖励只计算到锁定期结束，即使实际质押时间更长

例如：
- 固定 365 天锁定期（8% APY）
- 实际质押 400 天才提取
- **重要**：超过锁定期的时间不会产生额外奖励，奖励只计算到锁定期结束

### 设计理念

V2 版本简化了锁定期选择：
- **用户友好**：无需选择锁定期，简化操作流程
- **统一管理**：固定365天，便于运营和用户理解
- **清晰明确**：通过不同产品（普通/Premium）提供不同收益率

## 🔓 Unstake 机制说明

### 正常 Unstake（解除质押）

**时间限制**：
- 必须等待锁定期完全结束（365天）
- 解锁条件：`block.timestamp >= stakedAt + 365 days`

**提取金额**：
- ✅ 本金 + 全部累积奖励
- 奖励按实际质押时间计算（但不超过锁定期）

**示例**：
```
质押时间：2026-11-01 00:00:00
锁定期：365 天
解锁时间：2027-11-01 00:00:00

可以提取：2027-11-01 00:00:00 之后
提取金额：本金 + 365天内的奖励
```

### 紧急提取（Emergency Withdraw）

**触发条件**：
- 管理员必须启用紧急模式（`enableEmergencyMode()`）
- 不受锁定期限制，可以随时提取

**提取金额**：
- ✅ 仅本金
- ❌ 不包含奖励

**使用场景**：
- 合约出现紧急情况
- 需要快速回收资金
- 放弃奖励换取提前退出

### 总结对比

| 提取方式 | 时间限制 | 可提取金额 | 适用场景 |
|---------|---------|-----------|---------|
| 正常 unstake | 锁定期结束（365天） | 本金 + 奖励 | 正常情况 |
| 紧急提取 | 无限制（需紧急模式） | 仅本金 | 紧急情况 |

### 注意事项

1. **严格锁定**：必须等待完整的365天锁定期，不支持提前提取
2. **锁定期内可提取奖励**：虽然不能解除质押，但可以随时提取已累积的奖励
3. **紧急模式**：只有在管理员启用紧急模式后才能使用紧急提取功能

## 💰 奖励计算

奖励计算公式（`HSKStaking._calculateReward`）：

```solidity
// 年化率 = rewardRate (basis points) / 10000
// 时间比率 = timeElapsed / 365 days
// 奖励 = 本金 × (年化率 / 10000) × (timeElapsed / 365 days)
//
// 简化公式：
// reward = (amount × rewardRate × timeElapsed) / (10000 × 365 days)
```

**实现细节**：
```solidity
uint256 annualRate = (rewardRate × PRECISION) / BASIS_POINTS;
uint256 timeRatio = (timeElapsed × PRECISION) / SECONDS_PER_YEAR;
uint256 totalReward = (amount × annualRate × timeRatio) / (PRECISION × PRECISION);
```

**计算特点**：
- 奖励按秒连续累积，精确到秒
- 如果 `timeElapsed > LOCK_PERIOD`，奖励只计算到 `LOCK_PERIOD` 结束
- 使用 18 位小数精度（`PRECISION = 1e18`）进行高精度计算
- BASIS_POINTS = 10000（100% = 10000 basis points）
- SECONDS_PER_YEAR = 365 days = 31,536,000 秒

## 🛡️ 安全特性

### 重入攻击防护
- 使用 OpenZeppelin 的 `ReentrancyGuardUpgradeable`
- 所有涉及资金转移的函数都使用 `nonReentrant` 修饰符

### 紧急模式
- 管理员可启用紧急模式
- 紧急模式下：
  - 奖励分配暂停
  - 用户只能提取本金（通过 `emergencyWithdraw`）
  - 新质押被阻止
- 说明：若已满足解锁条件，正常 `unstake` 仍可执行，但奖励为 0；未到期可使用 `emergencyWithdraw`（仅本金）

### 暂停机制
- 管理员可暂停合约（`pause()`）
- 暂停时：
  - 质押功能被禁用
  - 奖励提取被禁用
  - 解除质押功能不受影响

### 访问控制
- **Owner**: 合约所有者，负责所有管理功能（包括升级、参数配置等）
- 使用 OpenZeppelin 的 OwnableUpgradeable 标准实现
- 支持所有权转移（`transferOwnership`）和放弃所有权（`renounceOwnership`）

## 📝 部署指南

### 标准部署（单产品）

#### 部署到测试网

```bash
npx hardhat run scripts/deploy.ts --network hashkeyTestnet
```

#### 部署到主网

```bash
npx hardhat run scripts/deploy.ts --network hashkeyMainnet
```

### 双层产品方案部署

基于现有合约架构，可以部署两套独立的产品方案：

#### 产品方案对比

| 特性 | 普通 Staking（委托质押） | Premium Staking（高级质押） |
|------|----------------------|------------------------|
| 目标用户 | 普通用户 | 大户/机构 |
| 最小质押 | 1 HSK | 500,000 HSK |
| 年化收益 | 8% | 16% |
| 白名单模式 | 关闭（开放） | 启用（需授权） |

#### 部署方式

**方式一：分别部署**

```bash
# 部署普通 Staking
npx hardhat run scripts/deployNormalStaking.ts --network <network>

# 部署 Premium Staking
npx hardhat run scripts/deployPremiumStaking.ts --network <network>
```

**方式二：一次性部署两个产品**

```bash
npx hardhat run scripts/deployDualTier.ts --network <network>
```

#### 部署后配置

**注意**：部署脚本会自动设置质押开始时间为部署后7天。如需调整，可以使用以下脚本：

```bash
# 设置质押开始时间
npx hardhat run scripts/setStakeStartTime.ts --network <network> \
  -- --contract <CONTRACT_ADDRESS> --timestamp <START_TIMESTAMP>
```

其他配置：

1. **为 Premium Staking 添加白名单用户**（Premium Staking 启用了白名单模式）
   ```bash
   npx hardhat run scripts/addToWhitelist.ts --network <network> \
     -- --contract <PREMIUM_STAKING_ADDRESS> --user <USER_ADDRESS>
   ```

2. **向奖励池充值**（两个产品需要独立的奖励池）
   ```bash
   # 普通 Staking 奖励池
   npx hardhat run scripts/add-rewards.ts --network <network> \
     -- --contract <NORMAL_STAKING_ADDRESS> --amount <AMOUNT>
   
   # Premium Staking 奖励池
   npx hardhat run scripts/add-rewards.ts --network <network> \
     -- --contract <PREMIUM_STAKING_ADDRESS> --amount <AMOUNT>
   ```

详细说明请参考：
- [双层产品方案文档](./docs/DUAL_TIER_STAKING.md) - 技术部署文档
- [产品方案详细文档](./docs/PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./docs/PRODUCT_SUMMARY.md) - 快速了解
- [技术常见问题](./docs/TECHNICAL_FAQ.md) - 技术机制说明

### 验证合约

```bash
npx hardhat run scripts/verify.ts --network hashkeyTestnet
```

### 升级合约

升级脚本会自动检测 ProxyAdmin 类型（合约或 EOA），并使用正确的方式执行升级：

```bash
# 升级普通质押合约（自动部署新实现）
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:normal:testnet

# 使用已部署的实现合约升级
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:normal:testnet

# 升级高级质押合约
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:premium:testnet
```

**升级脚本特性**：
- ✅ 自动从存储槽读取实际的 ProxyAdmin 地址
- ✅ 支持 ProxyAdmin 合约和 EOA 两种模式
- ✅ 自动验证升级前后状态一致性
- ✅ 升级成功后自动打印浏览器链接
- ✅ 提供升级后验证实现合约的命令

**升级注意事项**：
- 确保新实现合约与现有存储布局兼容
- 升级后所有状态数据会保留
- 升级前建议先在测试网验证
- 升级后需要验证新实现合约（脚本会提示命令）

## 🔧 脚本说明

### 常用脚本

| 脚本 | 功能 |
|------|------|
| `deploy.ts` | 部署合约（标准部署） |
| `deployNormalStaking.ts` | 部署普通 Staking 产品 |
| `deployPremiumStaking.ts` | 部署 Premium Staking 产品 |
| `deployDualTier.ts` | 一次性部署双层产品方案 |
| `stake.ts` | 执行质押 |
| `upgrade.ts` | 升级合约 |
| `addToWhitelist.ts` | 添加白名单 |
| `addToWhitelistBatch.ts` | 批量添加白名单 |
| `checkStakes.ts` | 查询用户质押情况 |
| `checkWhitelist.ts` | 检查白名单状态 |
| `setMaxStake.ts` | 设置最大质押量 |
| `setStakeStartTime.ts` | 设置质押开始时间 |
| `setStakeEndTime.ts` | 设置质押截止时间 |
| `add-rewards.ts` | 向奖励池充值 |

### 分析脚本

| 脚本 | 功能 |
|------|------|
| `analyzeStaking.ts` | 分析质押案例 |
| `analyzeAPY.ts` | 分析 APY 计算 |
| `checkLockPeriods.ts` | 查询锁定期选项 |

## 🧪 测试

运行测试套件：

```bash
npx hardhat test
```

运行特定测试文件：

```bash
npx hardhat test test/staking.test.js
```

生成测试覆盖率报告：

```bash
npx hardhat coverage
```

## 📊 网络配置

### HashKey 测试网
- **Chain ID**: 133
- **RPC URL**: https://hashkeychain-testnet.alt.technology
- **Explorer**: https://hashkeychain-testnet-explorer.alt.technology

### HashKey 主网
- **Chain ID**: 177
- **RPC URL**: https://mainnet.hsk.xyz
- **Explorer**: https://explorer.hsk.xyz

## 📚 技术栈

- **Solidity**: ^0.8.27
- **Hardhat**: ^2.22.17
- **OpenZeppelin Contracts Upgradeable**: ^5.4.0
- **TypeScript**: ^5.7.3
- **代理模式**: Transparent Proxy

## 🔍 合约版本

### 当前版本: HSKStaking V2.0.0

**核心特性**：
- **固定365天锁定期**：简化用户操作，无需选择锁定期
- **双代理架构**：通过 `NormalStakingProxy` 和 `PremiumStakingProxy` 支持两套产品方案
- **Transparent Proxy 模式**：升级由 ProxyAdmin 控制，安全可靠
- **统一实现合约**：`HSKStaking.sol` 作为通用实现，通过初始化参数配置不同产品
- **简化的 stake() 接口**：无需传入 lockPeriod 参数
- **常量分离**：将常量定义独立到 `StakingConstants.sol`

**架构优势**：
- **模块化设计**：实现、存储、常量、接口分离，清晰易维护
- **可复用性**：同一实现合约支持多个产品实例
- **独立升级**：两个代理合约可独立升级
- **灵活配置**：通过初始化参数配置不同的产品特性

**版本历史**：
- V1.0.0 (`staking.sol`): 初始版本，支持多锁定期选项
- V2.0.0 (`HSKStaking.sol`): 当前版本，固定锁定期 + 双代理架构

## ⚠️ 重要提醒

1. **质押时间窗口**：合约支持设置质押开始时间和结束时间。部署脚本默认设置开始时间为部署后7天，结束时间无限制。管理员可以通过 `setStakeStartTime` 和 `setStakeEndTime` 函数调整
2. **奖励计算限制**：奖励只计算到锁定期结束，多质押的时间不会增加奖励
3. **白名单模式**：合约支持白名单模式，可在部署时配置。双层产品方案中，普通 Staking 关闭白名单（开放），Premium Staking 启用白名单（需审核）
4. **最小质押金额**：合约默认最小质押金额为 100 HSK，但产品部署时可配置（普通 Staking 产品配置为 1 HSK）
5. **最大质押量**：合约默认最大总质押量为 10,000 HSK，但产品部署时可配置（普通 Staking 产品配置为 10,000,000 HSK）
6. **奖励池**：确保奖励池有足够资金，否则新质押可能失败

### 双层产品方案配置

基于现有合约，可以部署两套独立的产品方案：

- **普通 Staking（委托质押）**：
  - 最小质押：1 HSK
  - 年化收益：8%
  - 锁定期：365天
  - 白名单：关闭（开放）
  - 最大总质押量：10,000,000 HSK

- **Premium Staking（高级质押）**：
  - 最小质押：500,000 HSK
  - 年化收益：16%
  - 锁定期：365天
  - 白名单：启用（需审核）
  - 最大总质押量：20,000,000 HSK

详细产品方案请参考：
- [产品方案详细文档](./docs/PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./docs/PRODUCT_SUMMARY.md) - 快速了解
- [双层产品方案文档](./docs/DUAL_TIER_STAKING.md) - 技术部署文档
- [产品开发文档](./docs/PRODUCT_PLANS_DEV.md) - 开发团队文档

## 📄 许可证

MIT License


---

**注意**：本合约已通过安全审计，但在主网部署前请务必进行充分测试。

---

## 📚 相关文档

### 核心文档
- [合约架构说明](./docs/CONTRACT_ARCHITECTURE.md) - **合约架构详解（开发必读）**
- [产品方案详细文档](./docs/PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./docs/PRODUCT_SUMMARY.md) - 快速了解产品方案

### 部署和开发
- [双层产品方案文档](./docs/DUAL_TIER_STAKING.md) - 技术部署文档
- [产品开发文档](./docs/PRODUCT_PLANS_DEV.md) - 开发团队文档
- [快速开始指南](./docs/QUICK_START_DUAL_TIER.md) - 快速部署指南

### 参考文档
- [技术常见问题](./docs/TECHNICAL_FAQ.md) - 技术机制说明
- [错误处理指南](./docs/ERROR_HANDLING.md) - 常见错误处理
- [术语表](./docs/GLOSSARY.md) - 术语定义

---

**文档版本**: 2.0.0  
**最后更新**: 2026-11  
**维护者**: Whale Staking Team

**版本说明**: V2.0.0 - 更新合约架构说明，反映 HSKStaking + 双代理架构
