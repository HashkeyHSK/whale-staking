# Scripts 目录组织方案

## 📋 目标

将 `scripts/` 目录按照普通质押（Normal Staking）和高级质押（Premium Staking）进行分离，提高代码组织性和可维护性。

## ⚠️ 重要说明 - 合约架构

在开始之前，请了解以下关键信息：

### 合约架构特性

1. **合约结构**: 
   - `HSKStaking.sol` - 主实现合约（继承 StakingStorage、StakingConstants、ReentrancyGuardUpgradeable、PausableUpgradeable）
   - `StakingStorage.sol` - 存储层（继承 Initializable、OwnableUpgradeable）
   - `StakingConstants.sol` - 常量定义合约
   - `IStake.sol` - 接口定义
   - `NormalStakingProxy.sol` / `PremiumStakingProxy.sol` - 代理合约

2. **代理模式**: Transparent Proxy（使用 OpenZeppelin 的 `TransparentUpgradeableProxy`）
   - 可独立升级 Normal 和 Premium 质押池
   - ProxyAdmin 用于管理代理合约升级

3. **原生代币**: HSK 是链的原生代币（native token），类似于 ETH，不是 ERC20 代币
   - 使用 `msg.value` 接收质押
   - 使用 `call{value: amount}("")` 发送代币

4. **锁定期**: 固定 365 天（`LOCK_PERIOD = 365 days`），在合约常量中定义，不可动态修改

5. **奖励率**: 在合约级别配置（`rewardRate` 状态变量），所有 position 共享同一个奖励率
   - 使用 basis points 表示（800 = 8%，1600 = 16%）
   - `BASIS_POINTS = 10000` (100% = 10000)

6. **Position 结构**: 
   
   ⚠️ **注意**: Position 中不包含 `lockPeriod` 和 `rewardRate`，这些是合约级别的配置。

7. **合约常量** (StakingConstants.sol):
   

### 关键合约函数

**质押操作**
- `stake() external payable returns (uint256)`: 
  - 质押 HSK，使用 `msg.value` 发送原生代币
  - 不需要传递 lockPeriod 参数（固定 365 天）
  - 返回 positionId
  - 需要满足：未暂停、在质押时间范围内、满足白名单要求（如启用）、非紧急模式
- `unstake(uint256 positionId) external`: 
  - 解除质押，自动领取所有累积奖励并返还本金
  - 需要锁定期满（365 天）且 position 未被 unstake
- `claimReward(uint256 positionId) external returns (uint256)`: 
  - 领取指定位置的奖励，不解除质押
  - 需要：未暂停、非紧急模式
  - 返回领取的奖励金额
- `pendingReward(uint256 positionId) external view returns (uint256)`: 
  - 查询指定位置的待领取奖励（只读函数）
  - 紧急模式下返回 0
- `emergencyWithdraw(uint256 positionId) external`: 
  - 紧急提取本金（仅在紧急模式下可用）
  - 不含奖励，只返还本金
  - 更新 totalPendingRewards 和 cachedAccruedRewards

**奖励池管理**
- `updateRewardPool() external payable`: 
  - 向奖励池添加资金，使用 `msg.value` 发送 HSK
  - 仅限 owner 调用
  - 触发 `RewardPoolUpdated` 事件
- `withdrawExcessRewardPool(uint256 amount) external`: 
  - 提取多余的奖励池资金（超过 totalPendingRewards 的部分）
  - 仅限 owner 调用
  - 不能提取已预留的奖励

**白名单管理**
- `updateWhitelistBatch(address[] calldata users, bool status) external`: 
  - 批量更新白名单（最多 100 个地址）
  - 仅限 owner 调用
  - `status = true` 添加，`status = false` 移除
  - 触发 `WhitelistStatusChanged` 事件
- `setWhitelistOnlyMode(bool enabled) external`: 
  - 启用/禁用白名单模式
  - 仅限 owner 调用
  - 触发 `WhitelistModeChanged` 事件

**合约配置**
- `setMinStakeAmount(uint256 newAmount) external`: 
  - 设置最小质押金额
  - 仅限 owner，且非紧急模式下可调用
- `setStakeStartTime(uint256 newStartTime) external`: 
  - 设置质押开始时间
  - 需要 > 0 且 < stakeEndTime
  - 仅限 owner 调用
- `setStakeEndTime(uint256 newEndTime) external`: 
  - 设置质押结束时间
  - 需要 > block.timestamp 且 > stakeStartTime
  - 仅限 owner 调用
- `pause() external`: 
  - 暂停合约（禁止新质押和领取奖励）
  - 仅限 owner 调用
- `unpause() external`: 
  - 恢复合约
  - 仅限 owner 调用
- `enableEmergencyMode() external`: 
  - 启用紧急模式（不可逆）
  - 启用后用户只能调用 `emergencyWithdraw` 提取本金
  - 仅限 owner 调用

**状态查询**
- `positions(uint256 positionId)`: 查询 position 详情
- `userPositions(address user)`: 查询用户的所有 positionId 数组
- `whitelisted(address user)`: 查询用户是否在白名单中
- `minStakeAmount()`: 查询最小质押金额
- `rewardRate()`: 查询奖励率（basis points）
- `totalStaked()`: 查询总质押金额
- `rewardPoolBalance()`: 查询奖励池余额
- `totalPendingRewards()`: 查询总待领取奖励
- `stakeStartTime()`: 查询质押开始时间
- `stakeEndTime()`: 查询质押结束时间
- `onlyWhitelistCanStake()`: 查询是否启用白名单模式
- `emergencyMode()`: 查询是否处于紧急模式
- `paused()`: 查询是否暂停

**合约事件**
- `PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint256 lockPeriod, uint256 timestamp)`: 质押创建
- `PositionUnstaked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: 解除质押
- `RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: 奖励领取
- `StakingPaused(address indexed operator, uint256 timestamp)`: 合约暂停
- `StakingUnpaused(address indexed operator, uint256 timestamp)`: 合约恢复
- `EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)`: 紧急提取
- `WhitelistStatusChanged(address indexed user, bool status)`: 白名单状态变更
- `WhitelistModeChanged(bool oldMode, bool newMode)`: 白名单模式变更
- `RewardPoolUpdated(uint256 newBalance)`: 奖励池更新
- `StakeStartTimeUpdated(uint256 oldStartTime, uint256 newStartTime)`: 开始时间更新
- `StakeEndTimeUpdated(uint256 oldEndTime, uint256 newEndTime)`: 结束时间更新
- `MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount)`: 最小质押金额更新
- `EmergencyModeEnabled(address indexed operator, uint256 timestamp)`: 紧急模式启用
- `Received(address indexed sender, uint256 amount)`: 接收原生代币

**自定义错误**
- `AlreadyUnstaked()`: Position 已经被 unstake
- `StillLocked()`: 仍在锁定期内
- `NoReward()`: 没有可领取的奖励
- `PositionNotFound()`: Position 不存在或不属于调用者
- `NotWhitelisted()`: 不在白名单中

### 初始化参数

**参数说明**：
- `_minStakeAmount`: 最小质押金额（wei 单位）
  - Normal Staking: 1 HSK = `1e18` wei
  - Premium Staking: 500,000 HSK = `500000e18` wei
- `_rewardRate`: 年化收益率（basis points）
  - Normal Staking: 800 (8% APY)
  - Premium Staking: 1600 (16% APY)
- `_stakeStartTime`: 质押开始时间（Unix 时间戳）
- `_stakeEndTime`: 质押结束时间（Unix 时间戳）
- `_whitelistMode`: 白名单模式
  - ✅ **Normal Staking**: `false`（所有用户可质押）
  - ✅ **Premium Staking**: `true`（仅白名单用户可质押）

**白名单模式设计**：

现在可以在初始化时直接指定白名单模式，无需部署后再手动修改：

**后续操作**：
- **Normal Staking**: 无需额外操作，部署后即可开始质押
- **Premium Staking**: 使用 `updateWhitelistBatch(addresses, true)` 添加授权用户

---

## 🏗️ 当前目录结构

```
scripts/
├── README.md                 # 使用指南
├── shared/                   # 共享模块
│   ├── constants.ts          # 配置和地址
│   ├── types.ts              # 类型定义
│   ├── helpers.ts            # 辅助函数
│   └── utils.ts              # 工具函数
├── normal/                   # 普通质押脚本
│   ├── deploy.ts             # 部署合约
│   ├── upgrade.ts            # 升级合约
│   ├── stake.ts              # 质押操作
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── emergency-withdraw.ts # 紧急提取本金
│   ├── withdraw-excess.ts    # 提取多余奖励
│   ├── verify-forge.ts       # 验证合约
│   ├── config/               # 配置管理
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   └── enable-emergency.ts
│   └── query/                # 状态查询
│       ├── check-status.ts
│       ├── check-stakes.ts
│       └── pending-reward.ts
├── premium/                  # 高级质押脚本
│   ├── deploy.ts             # 部署合约
│   ├── upgrade.ts            # 升级合约
│   ├── stake.ts              # 质押操作
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── emergency-withdraw.ts # 紧急提取本金
│   ├── withdraw-excess.ts    # 提取多余奖励
│   ├── verify-forge.ts       # 验证合约
│   ├── whitelist/            # 白名单管理
│   │   ├── add-batch.ts
│   │   ├── remove-batch.ts
│   │   ├── check-user.ts
│   │   └── toggle-mode.ts
│   ├── config/               # 配置管理
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   └── enable-emergency.ts
│   └── query/                # 状态查询
│       ├── check-status.ts
│       ├── check-stakes.ts
│       ├── pending-reward.ts
│       └── check-whitelist.ts
├── dev/                      # 开发脚本
│   ├── compile.ts            # 编译合约
│   ├── clean.ts              # 清理编译产物
│   ├── test-all.ts           # 运行所有测试
│   └── coverage.ts           # 生成覆盖率报告
├── test/                     # 测试脚本
│   ├── helpers/              # 测试辅助函数
│   │   ├── fixtures.ts       # 测试夹具
│   │   └── test-utils.ts     # 测试工具
│   └── integration/          # 集成测试
│       ├── deploy-test.ts
│       ├── stake-test.ts
│       └── whitelist-test.ts
└── tools/                    # 工具脚本
    ├── extract-abi.ts        # 提取 ABI
    ├── generate-types.ts     # 生成类型
    └── compare-contracts.ts  # 对比合约
```

**说明**：
- ✅ Normal Staking 相关脚本已完成（14 个）
- ✅ Premium Staking 相关脚本已完成（22 个）
- ✅ 测试脚本已完成（5 个）
- ✅ 开发脚本已完成（4 个）
- ✅ 工具脚本已完成（3 个）

---

## 📊 脚本映射表

以下表格列出了脚本的完成状态：

### Normal Staking 脚本（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/normal/deploy.ts` | ✅ 已完成 | 部署普通质押合约 |
| `scripts/normal/stake.ts` | ✅ 已完成 | 质押操作 |
| `scripts/normal/unstake.ts` | ✅ 已完成 | 解除质押 |
| `scripts/normal/claim-rewards.ts` | ✅ 已完成 | 领取奖励 |
| `scripts/normal/add-rewards.ts` | ✅ 已完成 | 添加奖励池 |
| `scripts/normal/emergency-withdraw.ts` | ✅ 已完成 | 紧急提取本金 |
| `scripts/normal/withdraw-excess.ts` | ✅ 已完成 | 提取多余奖励 |
| `scripts/normal/verify-forge.ts` | ✅ 已完成 | 验证合约（使用 Foundry） |
| `scripts/normal/config/pause.ts` | ✅ 已完成 | 暂停合约 |
| `scripts/normal/config/unpause.ts` | ✅ 已完成 | 恢复合约 |
| `scripts/normal/config/set-start-time.ts` | ✅ 已完成 | 设置开始时间 |
| `scripts/normal/config/set-end-time.ts` | ✅ 已完成 | 设置结束时间 |
| `scripts/normal/config/set-min-stake.ts` | ✅ 已完成 | 设置最小质押金额 |
| `scripts/normal/config/enable-emergency.ts` | ✅ 已完成 | 启用紧急模式 |
| `scripts/normal/query/check-status.ts` | ✅ 已完成 | 查询合约状态 |
| `scripts/normal/query/check-stakes.ts` | ✅ 已完成 | 查询质押信息 |
| `scripts/normal/query/pending-reward.ts` | ✅ 已完成 | 查询待领取奖励 |
| `scripts/normal/upgrade.ts` | ✅ 已完成 | 升级合约 |

### 共享模块（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/shared/constants.ts` | ✅ 已完成 | 配置和地址 |
| `scripts/shared/types.ts` | ✅ 已完成 | 类型定义 |
| `scripts/shared/helpers.ts` | ✅ 已完成 | 辅助函数 |
| `scripts/shared/utils.ts` | ✅ 已完成 | 工具函数 |

### Premium Staking 脚本（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/premium/deploy.ts` | ✅ 已完成 | 部署高级质押合约 |
| `scripts/premium/stake.ts` | ✅ 已完成 | 质押操作 |
| `scripts/premium/unstake.ts` | ✅ 已完成 | 解除质押 |
| `scripts/premium/claim-rewards.ts` | ✅ 已完成 | 领取奖励 |
| `scripts/premium/add-rewards.ts` | ✅ 已完成 | 添加奖励池 |
| `scripts/premium/emergency-withdraw.ts` | ✅ 已完成 | 紧急提取本金 |
| `scripts/premium/withdraw-excess.ts` | ✅ 已完成 | 提取多余奖励 |
| `scripts/premium/verify-forge.ts` | ✅ 已完成 | 验证合约 |
| `scripts/premium/upgrade.ts` | ✅ 已完成 | 升级合约 |
| `scripts/premium/whitelist/add-batch.ts` | ✅ 已完成 | 批量添加白名单 |
| `scripts/premium/whitelist/remove-batch.ts` | ✅ 已完成 | 批量移除白名单 |
| `scripts/premium/whitelist/check-user.ts` | ✅ 已完成 | 查询用户白名单状态 |
| `scripts/premium/whitelist/toggle-mode.ts` | ✅ 已完成 | 切换白名单模式 |
| `scripts/premium/config/pause.ts` | ✅ 已完成 | 暂停合约 |
| `scripts/premium/config/unpause.ts` | ✅ 已完成 | 恢复合约 |
| `scripts/premium/config/set-start-time.ts` | ✅ 已完成 | 设置开始时间 |
| `scripts/premium/config/set-end-time.ts` | ✅ 已完成 | 设置结束时间 |
| `scripts/premium/config/set-min-stake.ts` | ✅ 已完成 | 设置最小质押金额 |
| `scripts/premium/config/enable-emergency.ts` | ✅ 已完成 | 启用紧急模式 |
| `scripts/premium/query/check-status.ts` | ✅ 已完成 | 查询合约状态 |
| `scripts/premium/query/check-stakes.ts` | ✅ 已完成 | 查询质押信息 |
| `scripts/premium/query/pending-reward.ts` | ✅ 已完成 | 查询待领取奖励 |
| `scripts/premium/query/check-whitelist.ts` | ✅ 已完成 | 查询白名单配置 |

### 开发脚本（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/dev/compile.ts` | ✅ 已完成 | 编译合约 |
| `scripts/dev/clean.ts` | ✅ 已完成 | 清理编译产物 |
| `scripts/dev/coverage.ts` | ✅ 已完成 | 生成测试覆盖率报告 |
| `scripts/dev/test-all.ts` | ✅ 已完成 | 运行所有测试 |

### 测试脚本（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/test/helpers/fixtures.ts` | ✅ 已完成 | 测试夹具和辅助函数 |
| `scripts/test/helpers/test-utils.ts` | ✅ 已完成 | 测试工具函数 |
| `scripts/test/integration/deploy-test.ts` | ✅ 已完成 | 部署集成测试 |
| `scripts/test/integration/stake-test.ts` | ✅ 已完成 | 质押操作集成测试 |
| `scripts/test/integration/whitelist-test.ts` | ✅ 已完成 | 白名单功能集成测试 |

### 工具脚本（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/tools/extract-abi.ts` | ✅ 已完成 | 提取 ABI |
| `scripts/tools/generate-types.ts` | ✅ 已完成 | 生成 TypeScript 类型 |
| `scripts/tools/compare-contracts.ts` | ✅ 已完成 | 对比合约差异 |

### ✅ 脚本完成情况总结

**总计**: 34 个脚本文件

- ✅ Normal Staking: 14 个脚本（包括 upgrade.ts）
- ✅ Premium Staking: 22 个脚本（包括 upgrade.ts）
- ✅ 开发脚本: 4 个脚本
- ✅ 测试脚本: 5 个脚本
- ✅ 工具脚本: 3 个脚本
- ✅ 共享模块: 4 个文件

所有脚本已完成实现，支持完整的开发、测试、部署、升级和操作流程。

---

## 📦 实现计划

以下内容可作为 Premium Staking 实现的参考。

### 第一步：创建共享模块（✅ 已完成）

#### 1. `scripts/shared/constants.ts`（✅ 已完成）

#### 2. `scripts/shared/types.ts`

#### 3. `scripts/shared/helpers.ts`

#### 4. `scripts/shared/utils.ts`（✅ 已完成）

通用工具函数位于 `scripts/shared/utils.ts`。

---

### 第二步：实现普通质押脚本（✅ 已完成）

#### 1. `scripts/normal/deploy.ts`（✅ 已完成）

#### 2. `scripts/normal/stake.ts`

#### 3. `scripts/normal/add-rewards.ts`

#### 4. `scripts/normal/query/check-status.ts`

---

### 第三步：实现高级质押脚本（⏳ 待实现）

高级质押脚本与普通质押类似，但需要额外的白名单管理功能。可以参考 Normal Staking 的实现。

#### 1. `scripts/premium/deploy.ts`

类似 `scripts/normal/deploy.ts`，但使用 `PREMIUM_STAKING_CONFIG`，并启用白名单模式。

#### 2. `scripts/premium/whitelist/add-batch.ts`

#### 3. `scripts/premium/whitelist/remove-batch.ts`

#### 4. `scripts/premium/whitelist/toggle-mode.ts`

#### 5. `scripts/premium/whitelist/check-user.ts`

---

### 第四步：创建开发和测试脚本

#### 1. `scripts/dev/compile.ts`

#### 2. `scripts/dev/clean.ts`

#### 3. `scripts/dev/test-all.ts`

#### 4. `scripts/dev/coverage.ts`

#### 5. `scripts/test/helpers/fixtures.ts`

#### 6. `scripts/test/helpers/test-utils.ts`

#### 7. `scripts/test/integration/deploy-test.ts`

#### 8. `scripts/test/integration/stake-test.ts`

#### 9. `scripts/test/integration/whitelist-test.ts`

#### 10. 工具脚本

- `scripts/tools/extract-abi.ts` - 提取 ABI（TypeScript）

---

## 📝 实现步骤

### 步骤 1：创建目录结构

### 步骤 2：创建共享模块

1. 创建 `scripts/shared/constants.ts`
2. 创建 `scripts/shared/types.ts`
3. 创建 `scripts/shared/helpers.ts`
4. 创建 `scripts/shared/utils.ts`

### 步骤 3：实现普通质押脚本

1. 创建 `scripts/normal/deploy.ts`
2. 创建 `scripts/normal/stake.ts`
3. 创建 `scripts/normal/add-rewards.ts`
4. 创建 `scripts/normal/upgrade.ts`
5. 创建查询脚本（config/ 和 query/ 目录下）

### 步骤 4：实现高级质押脚本

1. 创建 `scripts/premium/deploy.ts`
2. 创建 `scripts/premium/stake.ts`
3. 创建白名单管理脚本（whitelist/ 目录下，包含批量添加、批量移除、查询和切换模式）
4. 创建查询脚本（config/ 和 query/ 目录下）

### 步骤 5：创建开发和测试脚本

1. 创建 `scripts/dev/compile.ts`
2. 创建 `scripts/dev/clean.ts`
3. 创建 `scripts/dev/test-all.ts`
4. 创建 `scripts/dev/coverage.ts`
5. 创建测试辅助函数：
   - `scripts/test/helpers/fixtures.ts`
   - `scripts/test/helpers/test-utils.ts`
6. 创建集成测试：
   - `scripts/test/integration/deploy-test.ts`
   - `scripts/test/integration/stake-test.ts`
   - `scripts/test/integration/whitelist-test.ts`

### 步骤 6：创建工具脚本（✅ 已完成）

1. ✅ 创建 `scripts/tools/extract-abi.ts`（TypeScript）
2. ✅ 创建 `scripts/tools/generate-types.ts`
3. ✅ 创建 `scripts/tools/compare-contracts.ts`

### 步骤 7：更新 package.json scripts

更新 `package.json` 中的脚本命令：

### 使用示例

---

## ✅ 验证清单

完成后，请验证以下内容：

### 基础验证

- [ ] 所有新脚本都能正常编译（`npm run build`）
- [ ] TypeScript 类型检查通过（无编译错误）
- [ ] 目录结构符合设计规范
- [ ] 所有文件都有正确的导入路径

### 共享模块验证

- [ ] `scripts/shared/constants.ts` 正确导出常量配置
- [ ] `scripts/shared/types.ts` 正确定义所有类型
- [ ] `scripts/shared/helpers.ts` 辅助函数正常工作
- [ ] `scripts/shared/utils.ts` 通用工具函数正常工作

### 开发脚本验证

- [x] `npm run compile` 能够成功编译合约
- [x] `npm run dev:compile` 能够成功编译合约（通过脚本）
- [x] `npm run clean` 能够清理编译产物
- [x] `npm run dev:clean` 能够清理编译产物（通过脚本）
- [x] `npm run build` 完整构建流程正常
- [x] `npm run dev:test` 运行所有测试正常
- [x] `npm run dev:coverage` 生成覆盖率报告正常

### 测试脚本验证

- [x] `npm run test` 运行所有测试正常
- [x] `npm run dev:test` 运行所有测试正常（通过脚本）
- [x] `npm run test:integration:deploy` 部署集成测试通过
- [x] `npm run test:integration:stake` 质押操作集成测试通过
- [x] `npm run test:integration:whitelist` 白名单功能集成测试通过
- [x] `npm run dev:coverage` 生成覆盖率报告
- [x] 测试辅助函数（fixtures、test-utils）正常工作
- [x] 所有测试用例都能正确执行

### 部署脚本验证

- [ ] Normal Staking 部署脚本能够成功部署合约
- [ ] Premium Staking 部署脚本能够成功部署合约
- [ ] 部署脚本正确配置合约参数
- [ ] 测试网部署命令正常工作

### 质押操作验证

- [ ] Normal Staking 质押脚本能够正常执行
- [ ] Premium Staking 质押脚本能够正常执行
- [ ] 解除质押脚本正常工作
- [ ] 领取奖励脚本正常工作
- [ ] 添加奖励脚本正常工作

### 白名单管理验证（Premium 专属）

- [ ] 批量添加用户到白名单正常
- [ ] 批量移除用户正常
- [ ] 查询用户白名单状态正常
- [ ] 切换白名单模式正常

### 配置管理验证

- [ ] 暂停/恢复合约功能正常
- [ ] 设置质押开始时间正常
- [ ] 设置质押结束时间正常
- [ ] 配置脚本权限检查正常

### 查询脚本验证

- [ ] 查询合约状态脚本正常
- [ ] 查询质押信息脚本正常
- [ ] 查询奖励信息脚本正常
- [ ] 查询白名单配置脚本正常
- [ ] 数据格式化输出正确

### 升级和验证脚本

- [x] 合约升级脚本能够成功升级
- [x] 合约验证脚本正常工作
- [x] 升级后状态保持正确
- [x] 支持 ProxyAdmin 合约和 EOA 两种模式
- [x] 升级前状态验证
- [x] 升级后状态验证

### 工具脚本验证

- [x] ABI 提取工具正常工作（`npm run tools:extract-abi`）
- [x] TypeScript 类型生成正常（`npm run tools:generate-types`）
- [x] 合约对比工具正常（`npm run tools:compare-contracts`）

### package.json 验证

- [ ] 所有 npm scripts 正确指向新文件
- [ ] 命令名称清晰易懂
- [ ] 测试网和主网命令分离明确
- [ ] 环境变量传递正常

### 文档验证

- [ ] 每个子目录都有 README 说明
- [ ] 所有脚本都有注释说明
- [ ] 使用示例清晰准确
- [ ] 文档完整

---

## 📚 附加建议

### 1. 添加配置文件

创建 `scripts/config.json` 用于存储环境相关的配置：

### 2. 添加环境变量支持

创建 `.env.example`：

### 3. 添加 README 文件

在每个子目录下添加 `README.md`，说明该目录下脚本的用途和使用方法。

### 4. 添加脚本模板

创建脚本模板文件，便于快速创建新脚本：

---

