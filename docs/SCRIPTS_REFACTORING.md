# Scripts 目录重构方案

## 📋 目标

将 `scripts/` 目录按照普通质押（Normal Staking）和高级质押（Premium Staking）进行分离，提高代码组织性和可维护性。

## ⚠️ 重要说明 - 合约架构

在开始重构之前，请了解以下关键信息：

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
   ```solidity
   struct Position {
       uint256 positionId;      // Position ID
       address owner;           // Position owner
       uint256 amount;          // Staked amount
       uint256 stakedAt;        // Timestamp when staked
       uint256 lastRewardAt;    // Last reward claim timestamp
       bool isUnstaked;         // Whether position is unstaked
   }
   ```
   ⚠️ **注意**: Position 中不包含 `lockPeriod` 和 `rewardRate`，这些是合约级别的配置。

7. **合约常量** (StakingConstants.sol):
   ```solidity
   uint256 public constant SECONDS_PER_YEAR = 365 days;
   uint256 public constant BASIS_POINTS = 10000;     // 100% = 10000
   uint256 public constant PRECISION = 1e18;
   uint256 public constant LOCK_PERIOD = 365 days;   // 固定锁定期
   uint256 public constant HSK_DECIMALS = 18;
   ```

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

```solidity
function initialize(
    uint256 _minStakeAmount,
    uint256 _rewardRate,
    uint256 _stakeStartTime,
    uint256 _stakeEndTime,
    bool _whitelistMode
) external initializer
```

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

```typescript
// Normal Staking 部署示例
const initData = implementation.interface.encodeFunctionData("initialize", [
    ethers.parseEther("1"),      // minStakeAmount
    800,                          // rewardRate (8%)
    stakeStartTime,
    stakeEndTime,
    false                         // whitelistMode: 关闭，所有人可质押
]);

// Premium Staking 部署示例
const initData = implementation.interface.encodeFunctionData("initialize", [
    ethers.parseEther("500000"),  // minStakeAmount
    1600,                         // rewardRate (16%)
    stakeStartTime,
    stakeEndTime,
    true                          // whitelistMode: 启用，需要白名单
]);
```

**后续操作**：
- **Normal Staking**: 无需额外操作，部署后即可开始质押
- **Premium Staking**: 使用 `updateWhitelistBatch(addresses, true)` 添加授权用户

---

## 🏗️ 当前目录结构

```
scripts/
├── add-rewards.ts
├── addToWhitelist.ts
├── addToWhitelistBatch.ts
├── checkStakeEndTime.ts
├── checkStakes.ts
├── checkWhitelist.ts
├── deployNormalStaking.ts
├── deployPremiumStaking.ts
├── deployTest.ts
├── extractAbi.js
├── normal/                    # 目前为空
├── premium/                   # 目前为空
├── setStakeEndTime.ts
├── stake.ts
├── stakeTest.ts
├── upgrade.ts
├── utils.ts
├── verify.ts
└── verifyUpgrade.ts
```

---

## 🎯 目标目录结构

```
scripts/
├── shared/                    # 共享工具和类型定义
│   ├── utils.ts              # 通用工具函数
│   ├── types.ts              # TypeScript 类型定义
│   ├── constants.ts          # 合约地址和常量配置
│   └── helpers.ts            # 辅助函数
│
├── normal/                    # 普通质押相关脚本
│   ├── deploy.ts             # 部署普通质押合约
│   ├── stake.ts              # 质押操作
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── upgrade.ts            # 升级合约
│   ├── verify.ts             # 验证合约
│   ├── config/
│   │   ├── set-start-time.ts     # 设置质押开始时间
│   │   ├── set-end-time.ts       # 设置质押结束时间
│   │   ├── pause.ts              # 暂停合约
│   │   └── unpause.ts            # 恢复合约
│   └── query/
│       ├── check-stakes.ts       # 查询质押信息
│       ├── check-rewards.ts      # 查询奖励信息
│       └── check-status.ts       # 查询合约状态
│
├── premium/                   # 高级质押相关脚本
│   ├── deploy.ts             # 部署高级质押合约
│   ├── stake.ts              # 质押操作
│   ├── unstake.ts            # 解除质押
│   ├── claim-rewards.ts      # 领取奖励
│   ├── add-rewards.ts        # 添加奖励池
│   ├── upgrade.ts            # 升级合约
│   ├── verify.ts             # 验证合约
│   ├── whitelist/
│   │   ├── add-batch.ts          # 批量添加白名单 (已有: addToWhitelistBatch.ts)
│   │   ├── remove-batch.ts       # 批量移除白名单 (新增)
│   │   ├── check-user.ts         # 查询用户白名单状态 (已有: checkWhitelist.ts)
│   │   └── toggle-mode.ts        # 启用/禁用白名单模式 (新增)
│   ├── config/
│   │   ├── set-start-time.ts     # 设置质押开始时间
│   │   ├── set-end-time.ts       # 设置质押结束时间
│   │   ├── pause.ts              # 暂停合约
│   │   └── unpause.ts            # 恢复合约
│   └── query/
│       ├── check-stakes.ts       # 查询质押信息
│       ├── check-rewards.ts      # 查询奖励信息
│       ├── check-status.ts       # 查询合约状态
│       └── check-whitelist.ts    # 查询白名单状态
│
├── test/                      # 测试脚本
│   ├── unit/                 # 单元测试
│   │   ├── normal-staking.test.ts
│   │   └── premium-staking.test.ts
│   ├── integration/          # 集成测试
│   │   ├── deploy-test.ts
│   │   ├── stake-test.ts
│   │   └── whitelist-test.ts
│   └── helpers/              # 测试辅助函数
│       ├── fixtures.ts
│       └── test-utils.ts
│
├── dev/                       # 开发脚本
│   ├── compile.ts            # 编译合约
│   ├── clean.ts              # 清理编译产物
│   ├── coverage.ts           # 生成测试覆盖率报告
│   └── test-all.ts           # 运行所有测试
│
└── tools/                     # 开发工具脚本
    ├── extract-abi.js        # 提取 ABI
    ├── generate-types.ts     # 生成 TypeScript 类型
    └── compare-contracts.ts  # 对比合约差异
```

---

## 📊 现有脚本映射表

以下表格列出了当前已有的脚本及其在新结构中的位置：

| 现有脚本 | 新位置 | 状态 | 说明 |
|---------|--------|------|------|
| `deployNormalStaking.ts` | `scripts/normal/deploy.ts` | 需重构 | 部署普通质押合约 |
| `deployPremiumStaking.ts` | `scripts/premium/deploy.ts` | 需重构 | 部署高级质押合约 |
| `stake.ts` | `scripts/normal/stake.ts` + `scripts/premium/stake.ts` | 需拆分 | 通用质押脚本，需按产品类型拆分 |
| `add-rewards.ts` | `scripts/normal/add-rewards.ts` + `scripts/premium/add-rewards.ts` | 需拆分 | 添加奖励，需按产品类型拆分 |
| `addToWhitelistBatch.ts` | `scripts/premium/whitelist/add-batch.ts` | ✅ 可迁移 | 批量添加白名单 |
| `checkWhitelist.ts` | `scripts/premium/whitelist/check-user.ts` | ✅ 可迁移 | 查询白名单状态 |
| `upgrade.ts` | `scripts/normal/upgrade.ts` + `scripts/premium/upgrade.ts` | 需拆分 | 升级合约，需按产品类型拆分 |
| `verify.ts` | `scripts/normal/verify.ts` + `scripts/premium/verify.ts` | 需拆分 | 验证合约 |
| `verifyUpgrade.ts` | - | 需整合 | 整合到 verify.ts 中 |
| `checkStakes.ts` | `scripts/normal/query/check-stakes.ts` + `scripts/premium/query/check-stakes.ts` | 需拆分 | 查询质押信息 |
| `checkStakeEndTime.ts` | `scripts/{normal,premium}/query/check-status.ts` | 需整合 | 整合到状态查询中 |
| `setStakeEndTime.ts` | `scripts/{normal,premium}/config/set-end-time.ts` | 需拆分 | 设置结束时间 |
| `deployTest.ts` | `scripts/test/deploy-test.ts` | ✅ 可迁移 | 测试部署 |
| `stakeTest.ts` | `scripts/test/stake-test.ts` | ✅ 可迁移 | 测试质押 |
| `extractAbi.js` | `scripts/tools/extract-abi.js` | ✅ 可迁移 | 提取 ABI |
| `utils.ts` | `scripts/shared/utils.ts` | ✅ 可迁移 | 通用工具函数 |

### 🆕 需要新建的脚本

以下脚本在现有代码库中不存在，需要新建：

**白名单管理**（Premium 专属）：
- `scripts/premium/whitelist/remove-batch.ts` - 批量移除白名单
- `scripts/premium/whitelist/toggle-mode.ts` - 切换白名单模式

**质押操作**：
- `scripts/normal/unstake.ts` - 普通质押解除质押
- `scripts/premium/unstake.ts` - 高级质押解除质押
- `scripts/normal/claim-rewards.ts` - 普通质押领取奖励
- `scripts/premium/claim-rewards.ts` - 高级质押领取奖励
- `scripts/normal/emergency-withdraw.ts` - 紧急提取本金（仅紧急模式）
- `scripts/premium/emergency-withdraw.ts` - 紧急提取本金（仅紧急模式）

**奖励池管理**：
- `scripts/normal/withdraw-excess.ts` - 提取多余奖励池资金
- `scripts/premium/withdraw-excess.ts` - 提取多余奖励池资金

**配置管理**：
- `scripts/normal/config/set-start-time.ts` - 设置普通质押开始时间
- `scripts/normal/config/set-end-time.ts` - 设置普通质押结束时间
- `scripts/normal/config/set-min-stake.ts` - 设置最小质押金额
- `scripts/normal/config/pause.ts` - 暂停普通质押合约
- `scripts/normal/config/unpause.ts` - 恢复普通质押合约
- `scripts/normal/config/enable-emergency.ts` - 启用紧急模式（不可逆）
- `scripts/premium/config/set-start-time.ts` - 设置高级质押开始时间
- `scripts/premium/config/set-end-time.ts` - 设置高级质押结束时间
- `scripts/premium/config/set-min-stake.ts` - 设置最小质押金额
- `scripts/premium/config/pause.ts` - 暂停高级质押合约
- `scripts/premium/config/unpause.ts` - 恢复高级质押合约
- `scripts/premium/config/enable-emergency.ts` - 启用紧急模式（不可逆）

**状态查询**：
- `scripts/normal/query/check-status.ts` - 查询普通质押状态
- `scripts/normal/query/check-rewards.ts` - 查询普通质押奖励
- `scripts/normal/query/pending-reward.ts` - 查询指定位置的待领取奖励
- `scripts/premium/query/check-status.ts` - 查询高级质押状态
- `scripts/premium/query/check-rewards.ts` - 查询高级质押奖励
- `scripts/premium/query/pending-reward.ts` - 查询指定位置的待领取奖励
- `scripts/premium/query/check-whitelist.ts` - 查询白名单配置

**共享模块**：
- `scripts/shared/constants.ts` - 合约地址和常量配置
- `scripts/shared/types.ts` - TypeScript 类型定义
- `scripts/shared/helpers.ts` - 辅助函数

---

## 📦 文件迁移计划

### 第一步：创建共享模块

#### 1. `scripts/shared/constants.ts`

```typescript
/**
 * 合约地址配置
 * 根据不同网络环境配置不同的合约地址
 * 
 * 注意：HSK 是链的原生代币（native token），类似于 ETH，不需要代币合约地址
 */

export interface ContractAddresses {
  normalStaking: string;
  premiumStaking: string;
}

// Mainnet 地址
export const MAINNET_ADDRESSES: ContractAddresses = {
  normalStaking: "0x...",  // 待填写：Normal Staking 代理合约地址
  premiumStaking: "0x...", // 待填写：Premium Staking 代理合约地址
};

// Testnet 地址
export const TESTNET_ADDRESSES: ContractAddresses = {
  normalStaking: "0x...",  // 待填写：Normal Staking 代理合约地址
  premiumStaking: "0x...", // 待填写：Premium Staking 代理合约地址
};

// 获取当前网络的地址
export function getAddresses(network: string): ContractAddresses {
  switch (network) {
    case "mainnet":
      return MAINNET_ADDRESSES;
    case "testnet":
      return TESTNET_ADDRESSES;
    case "localhost":
      // 本地测试网络地址可以从环境变量读取
      return {
        normalStaking: process.env.NORMAL_STAKING_ADDRESS || "",
        premiumStaking: process.env.PREMIUM_STAKING_ADDRESS || "",
      };
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// 合约常量（与 StakingConstants.sol 保持一致）
export const STAKING_CONSTANTS = {
  LOCK_PERIOD: 365 * 24 * 60 * 60,      // 365 天（秒）= 365 days
  BASIS_POINTS: 10000,                   // 100% = 10000
  PRECISION: BigInt("1000000000000000000"), // 1e18 用于精度计算
  SECONDS_PER_YEAR: 365 * 24 * 60 * 60, // 365 days
  HSK_DECIMALS: 18,                      // HSK 原生代币精度
};

// 质押产品配置
// 注意：锁定期固定为 365 天，在合约常量 LOCK_PERIOD 中定义
export const NORMAL_STAKING_CONFIG = {
  minStakeAmount: "1",           // 1 HSK
  rewardRate: 800,               // 8% APY (basis points: 800/10000 = 0.08 = 8%)
  whitelistMode: false,          // 关闭白名单模式（部署后需手动关闭）
  productName: "Normal Staking",
  targetUsers: "普通用户",
  description: "面向普通用户的质押产品，低门槛，稳定收益",
};

export const PREMIUM_STAKING_CONFIG = {
  minStakeAmount: "500000",      // 500,000 HSK
  rewardRate: 1600,              // 16% APY (basis points: 1600/10000 = 0.16 = 16%)
  whitelistMode: true,           // 启用白名单模式（默认启用）
  productName: "Premium Staking",
  targetUsers: "大户/机构",
  description: "面向大户和机构的高级质押产品，高门槛，高收益",
};
```

#### 2. `scripts/shared/types.ts`

```typescript
import { ethers } from "ethers";

/**
 * 质押产品类型
 */
export enum StakingType {
  NORMAL = "normal",
  PREMIUM = "premium",
}

/**
 * 质押位置信息（与合约 Position 结构对应）
 * 注意：
 * - 锁定期固定为 365 天（LOCK_PERIOD 常量），不在 Position 中存储
 * - 奖励率在合约级别配置（rewardRate 状态变量），所有 position 共享
 */
export interface StakingPosition {
  positionId: bigint;
  owner: string;
  amount: bigint;
  stakedAt: bigint;
  lastRewardAt: bigint;  // 上次领取奖励时间
  isUnstaked: boolean;
}

/**
 * 合约状态信息
 */
export interface ContractStatus {
  isPaused: boolean;
  emergencyMode: boolean;
  onlyWhitelistCanStake: boolean;  // 白名单模式
  totalStaked: bigint;
  totalPendingRewards: bigint;
  rewardPoolBalance: bigint;
  minStakeAmount: bigint;
  rewardRate: bigint;               // basis points (800 = 8%, 1600 = 16%)
  stakeStartTime: bigint;
  stakeEndTime: bigint;
  nextPositionId: bigint;
  cachedAccruedRewards: bigint;     // 缓存的已累积奖励
  lastAccruedUpdateTime: bigint;    // 上次更新时间
}

/**
 * 部署配置
 */
export interface DeployConfig {
  minStakeAmount: string;       // HSK 数量（字符串格式，如 "1" 或 "500000"）
  rewardRate: number;            // 年化收益率（basis points，如 800 = 8%）
  stakingType: StakingType;
  stakeStartOffset?: number;     // 质押开始时间偏移（秒，默认 7 天）
  stakeEndOffset?: number;       // 质押结束时间偏移（秒，默认 1 年）
}

/**
 * 脚本执行结果
 */
export interface ScriptResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
  txHash?: string;              // 交易哈希
}

/**
 * 查询用户质押信息的返回结果
 */
export interface UserStakeInfo {
  userAddress: string;
  totalPositions: number;
  activePositions: number;
  totalStakedAmount: bigint;
  totalPendingRewards: bigint;
  positions: StakingPosition[];
}

/**
 * 奖励池信息
 */
export interface RewardPoolInfo {
  balance: bigint;
  totalPendingRewards: bigint;
  availableRewards: bigint;      // balance - totalPendingRewards
  utilizationRate: number;       // totalPendingRewards / balance * 100
}
```

#### 3. `scripts/shared/helpers.ts`

```typescript
import { ethers } from "ethers";
import { StakingType } from "./types";
import { getAddresses } from "./constants";

/**
 * 获取质押合约地址
 */
export function getStakingAddress(stakingType: StakingType, network: string): string {
  const addresses = getAddresses(network);
  return stakingType === StakingType.NORMAL 
    ? addresses.normalStaking 
    : addresses.premiumStaking;
}

/**
 * 格式化质押信息
 * 注意：锁定期和奖励率在合约级别配置，不在单个 position 中
 */
export function formatStakingPosition(position: any) {
  return {
    positionId: position.positionId.toString(),
    amount: ethers.formatEther(position.amount),
    stakedAt: new Date(Number(position.stakedAt) * 1000).toLocaleString(),
    lastRewardAt: new Date(Number(position.lastRewardAt) * 1000).toLocaleString(),
    isUnstaked: position.isUnstaked,
  };
}

/**
 * 格式化合约状态
 */
export function formatContractStatus(status: any) {
  return {
    isPaused: status.isPaused,
    emergencyMode: status.emergencyMode,
    onlyWhitelistCanStake: status.onlyWhitelistCanStake,
    totalStaked: ethers.formatEther(status.totalStaked),
    totalPendingRewards: ethers.formatEther(status.totalPendingRewards),
    rewardPoolBalance: ethers.formatEther(status.rewardPoolBalance),
    minStakeAmount: ethers.formatEther(status.minStakeAmount),
    rewardRate: `${Number(status.rewardRate) / 100}%`,  // basis points to percentage
    stakeStartTime: new Date(Number(status.stakeStartTime) * 1000).toLocaleString(),
    stakeEndTime: new Date(Number(status.stakeEndTime) * 1000).toLocaleString(),
    nextPositionId: status.nextPositionId.toString(),
    cachedAccruedRewards: ethers.formatEther(status.cachedAccruedRewards),
    lastAccruedUpdateTime: new Date(Number(status.lastAccruedUpdateTime) * 1000).toLocaleString(),
  };
}

/**
 * 打印分隔线
 */
export function printSeparator(title?: string) {
  console.log("\n" + "=".repeat(50));
  if (title) {
    console.log(title);
    console.log("=".repeat(50));
  }
}

/**
 * 打印成功消息
 */
export function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

/**
 * 打印警告消息
 */
export function printWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

/**
 * 打印错误消息
 */
export function printError(message: string) {
  console.error(`❌ ${message}`);
}

/**
 * 等待交易确认
 */
export async function waitForTransaction(tx: any, description: string = "Transaction") {
  console.log(`${description} hash:`, tx.hash);
  console.log("等待交易确认...");
  const receipt = await tx.wait();
  console.log("交易已确认，区块号:", receipt?.blockNumber);
  return receipt;
}
```

#### 4. 更新 `scripts/shared/utils.ts`

将现有的 `scripts/utils.ts` 移动到 `scripts/shared/utils.ts` 并增强功能。

---

### 第二步：重构普通质押脚本

#### 1. `scripts/normal/deploy.ts`

基于现有的 `deployNormalStaking.ts`，整合共享模块：

```typescript
import { ethers, upgrades } from "hardhat";
import { NORMAL_STAKING_CONFIG } from "../shared/constants";
import { printSeparator, printSuccess, printWarning, formatContractStatus } from "../shared/helpers";

/**
 * 部署普通质押产品
 * - 最小质押：1 HSK
 * - 年化收益：8%
 * - 面向普通用户
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  printSeparator("部署普通质押产品 (Normal Staking)");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 1. 部署 HSKStaking 实现合约
  console.log("\n部署 HSKStaking 实现合约...");
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const implementation = await HSKStaking.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  printSuccess(`HSKStaking 实现合约部署成功: ${implementationAddress}`);

  // 2. 准备初始化参数
  const minStakeAmount = ethers.parseEther(NORMAL_STAKING_CONFIG.minStakeAmount);
  const rewardRate = NORMAL_STAKING_CONFIG.rewardRate;
  const whitelistMode = NORMAL_STAKING_CONFIG.whitelistMode;  // false for Normal Staking
  const stakeStartTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7天后
  const stakeEndTime = stakeStartTime + (365 * 24 * 60 * 60); // 1年后

  console.log("\n初始化参数:");
  console.log(`  - 最小质押金额: ${ethers.formatEther(minStakeAmount)} HSK`);
  console.log(`  - 年化收益率: ${rewardRate / 100}%`);
  console.log(`  - 质押开始时间: ${new Date(stakeStartTime * 1000).toISOString()}`);
  console.log(`  - 质押结束时间: ${new Date(stakeEndTime * 1000).toISOString()}`);
  console.log(`  - 锁定期: 365 天（固定）`);
  console.log(`  - 白名单模式: ${whitelistMode ? "启用" : "关闭"}`);

  // 3. 编码初始化数据
  const initData = implementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
    whitelistMode,  // false - 关闭白名单，所有人可质押
  ]);

  // 4. 部署 Transparent Proxy 代理合约
  console.log("\n部署 NormalStakingProxy 代理合约（Transparent Proxy）...");
  const NormalStakingProxy = await ethers.getContractFactory("NormalStakingProxy");
  
  const proxy = await NormalStakingProxy.deploy(
    implementationAddress,  // 实现合约地址
    deployer.address,       // ProxyAdmin 地址
    initData                // 初始化数据
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  printSuccess(`NormalStakingProxy 代理合约部署成功: ${proxyAddress}`);

  // 5. 通过代理连接到 HSKStaking 合约进行验证
  const staking = HSKStaking.attach(proxyAddress);

  // 6. 验证配置
  printSeparator("配置验证");
  const minStake = await staking.minStakeAmount();
  const startTime = await staking.stakeStartTime();
  const endTime = await staking.stakeEndTime();
  const whitelistMode = await staking.onlyWhitelistCanStake();
  const rewardRateValue = await staking.rewardRate();

  console.log("合约地址:", proxyAddress);
  console.log("实现合约地址:", implementationAddress);
  console.log("管理员地址:", deployer.address);
  console.log("最小质押金额:", ethers.formatEther(minStake), "HSK");
  console.log("年化收益率:", rewardRateValue / 100, "%");
  console.log("质押开始时间:", new Date(Number(startTime) * 1000).toISOString());
  console.log("质押结束时间:", new Date(Number(endTime) * 1000).toISOString());
  console.log("白名单模式:", whitelistMode ? "启用" : "关闭");
  
  printSeparator("✅ 普通质押产品部署完成");
  console.log("\n产品配置:");
  console.log(`  - 产品类型: ${NORMAL_STAKING_CONFIG.productName}`);
  console.log(`  - 目标用户: ${NORMAL_STAKING_CONFIG.targetUsers}`);
  console.log(`  - 最小质押: ${NORMAL_STAKING_CONFIG.minStakeAmount} HSK`);
  console.log(`  - 年化收益: ${NORMAL_STAKING_CONFIG.rewardRate / 100}%`);
  console.log(`  - 锁定期: 365 天（固定）`);
  console.log(`  - 白名单模式: ${NORMAL_STAKING_CONFIG.whitelistMode ? "启用" : "关闭"}`);

  printWarning("下一步操作:");
  console.log("  1. 使用 scripts/normal/add-rewards.ts 向奖励池充值");
  console.log("  2. 使用 scripts/normal/query/check-status.ts 查询合约状态");
  console.log("  3. 质押开始时间到达后，用户即可开始质押（无需白名单）");
  
  // 保存部署信息
  console.log("\n请将以下地址保存到 scripts/shared/constants.ts:");
  console.log(`normalStaking: "${proxyAddress}",`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 2. `scripts/normal/stake.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../shared/types";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../shared/helpers";

/**
 * 质押 HSK 到普通质押合约
 * 注意：锁定期固定为 365 天，质押函数不需要 lockPeriod 参数
 */
async function main() {
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  
  // 从环境变量获取合约地址，或使用配置中的地址
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("执行普通质押 (Normal Staking)");
  console.log("用户地址:", user.address);
  console.log("合约地址:", stakingAddress);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 检查合约状态
  console.log("\n检查合约状态...");
  const isPaused = await staking.paused();
  const minStakeAmount = await staking.minStakeAmount();
  const rewardRate = await staking.rewardRate();
  const balance = await ethers.provider.getBalance(user.address);

  console.log("合约是否暂停:", isPaused);
  console.log("最小质押金额:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("年化收益率:", rewardRate / 100, "%");
  console.log("锁定期: 365 天（固定）");
  console.log("用户余额:", ethers.formatEther(balance), "HSK");

  if (isPaused) {
    throw new Error("合约已暂停，无法质押");
  }

  // 设置质押金额（从环境变量读取，或使用最小金额的10倍）
  const stakeAmountEther = process.env.STAKE_AMOUNT || ethers.formatEther(minStakeAmount * BigInt(10));
  const stakeAmount = ethers.parseEther(stakeAmountEther);
  
  if (balance < stakeAmount) {
    throw new Error(`余额不足，需要 ${ethers.formatEther(stakeAmount)} HSK`);
  }

  console.log(`\n准备质押 ${ethers.formatEther(stakeAmount)} HSK...`);
  console.log(`锁定期: 365 天`);

  // 执行质押（不需要传递 lockPeriod 参数）
  const tx = await staking.stake({
    value: stakeAmount,
    gasLimit: 500000,
  });

  await waitForTransaction(tx, "质押交易");
  printSuccess("质押成功！");

  // 查询质押信息
  console.log("\n查询质押信息...");
  // 注意：userPositions 是 public mapping，需要多次调用获取数组元素
  // 或者可以在合约中添加 getUserPositions 辅助函数
  try {
    // 获取最新的 positionId（假设从 nextPositionId 推断）
    const nextId = await staking.nextPositionId();
    const positionId = nextId - BigInt(1); // 最后创建的 position
    
    const position = await staking.positions(positionId);
    if (position.owner === user.address) {
      console.log("\n最新质押信息:");
      console.log("  - 位置ID:", positionId.toString());
      console.log("  - 质押金额:", ethers.formatEther(position.amount), "HSK");
      console.log("  - 质押时间:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
      console.log("  - 上次领取奖励时间:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());
      console.log("  - 锁定期: 365 天（固定）");
      console.log("  - 年化收益率:", Number(rewardRate) / 100, "%");
      console.log("  - 是否已解除:", position.isUnstaked);
      
      // 查询待领取奖励
      const pending = await staking.pendingReward(positionId);
      console.log("  - 待领取奖励:", ethers.formatEther(pending), "HSK");
    }
  } catch (error) {
    console.log("查询质押信息失败:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 3. `scripts/normal/add-rewards.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../shared/types";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../shared/helpers";

/**
 * 向普通质押合约的奖励池添加奖励
 */
async function main() {
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = getStakingAddress(StakingType.NORMAL, network);

  printSeparator("向普通质押合约添加奖励");
  console.log("管理员地址:", admin.address);
  console.log("合约地址:", stakingAddress);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 设置奖励金额
  const rewardAmount = ethers.parseEther("10000"); // 添加 10,000 HSK
  console.log(`\n准备添加 ${ethers.formatEther(rewardAmount)} HSK 到奖励池...`);

  // 查询当前奖励池余额
  const currentBalance = await staking.rewardPoolBalance();
  console.log("当前奖励池余额:", ethers.formatEther(currentBalance), "HSK");

  // 添加奖励
  const tx = await staking.updateRewardPool({ value: rewardAmount });
  await waitForTransaction(tx, "添加奖励交易");
  
  printSuccess("奖励添加成功！");

  // 查询更新后的余额
  const newBalance = await staking.rewardPoolBalance();
  console.log("\n更新后的奖励池余额:", ethers.formatEther(newBalance), "HSK");
  console.log("增加金额:", ethers.formatEther(newBalance - currentBalance), "HSK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 4. `scripts/normal/query/check-status.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../../shared/types";
import { getStakingAddress, printSeparator, formatContractStatus } from "../../shared/helpers";

/**
 * 查询普通质押合约状态
 */
async function main() {
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("普通质押合约状态查询");
  console.log("合约地址:", stakingAddress);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 查询合约状态
  const isPaused = await staking.paused();
  const emergencyMode = await staking.emergencyMode();
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();
  const totalStaked = await staking.totalStaked();
  const rewardPoolBalance = await staking.rewardPoolBalance();
  const minStakeAmount = await staking.minStakeAmount();
  const rewardRate = await staking.rewardRate();
  const stakeStartTime = await staking.stakeStartTime();
  const stakeEndTime = await staking.stakeEndTime();

  console.log("\n合约状态:");
  console.log("  - 是否暂停:", isPaused);
  console.log("  - 紧急模式:", emergencyMode);
  console.log("  - 白名单模式:", onlyWhitelistCanStake);
  console.log("  - 总质押金额:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - 奖励池余额:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("  - 最小质押金额:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("  - 年化收益率:", rewardRate / 100, "%");
  console.log("  - 锁定期: 365 天（固定）");
  console.log("  - 质押开始时间:", new Date(Number(stakeStartTime) * 1000).toISOString());
  console.log("  - 质押结束时间:", new Date(Number(stakeEndTime) * 1000).toISOString());

  printSeparator();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

### 第三步：重构高级质押脚本

高级质押脚本与普通质押类似，但需要额外的白名单管理功能。

#### 1. `scripts/premium/deploy.ts`

类似 `scripts/normal/deploy.ts`，但使用 `PREMIUM_STAKING_CONFIG`，并启用白名单模式。

#### 2. `scripts/premium/whitelist/add-batch.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../../shared/types";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers";
import * as fs from "fs";
import * as path from "path";

/**
 * 批量添加用户到高级质押白名单
 * 支持从文件读取地址列表或直接在脚本中指定
 */
async function main() {
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = getStakingAddress(StakingType.PREMIUM, network);

  // 方法1: 直接在脚本中指定地址列表
  let userAddresses = [
    "0x...",
    "0x...",
    "0x...",
  ];

  // 方法2: 从文件中读取地址列表 (每行一个地址)
  // 取消注释下面的代码以从文件读取
  /*
  const filePath = path.join(__dirname, "../../../whitelist-addresses.txt");
  const fileContent = fs.readFileSync(filePath, "utf8");
  userAddresses = fileContent
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && line.startsWith("0x") && line.length === 42);
  */

  // 移除重复地址
  const uniqueAddresses = [...new Set(userAddresses)];

  printSeparator("批量添加用户到高级质押白名单");
  console.log("管理员地址:", admin.address);
  console.log("合约地址:", stakingAddress);
  console.log("唯一用户数量:", uniqueAddresses.length);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 按批次处理（每批最多100个地址）
  const batchSize = 100;
  for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
    const batch = uniqueAddresses.slice(i, i + batchSize);
    console.log(`\n处理第 ${Math.floor(i/batchSize) + 1} 批，共 ${batch.length} 个地址...`);

    try {
      const tx = await staking.updateWhitelistBatch(batch, true);
      await waitForTransaction(tx, "批量添加白名单交易");
      printSuccess(`成功添加 ${batch.length} 个用户到白名单`);
    } catch (error: any) {
      console.error(`批量添加失败: ${error.message}`);
      // 如果批量失败，尝试逐个添加
      console.log("尝试逐个添加...");
      for (const addr of batch) {
        try {
          const tx = await staking.updateWhitelistBatch([addr], true);
          await tx.wait();
          console.log(`  ✅ ${addr}`);
        } catch (err: any) {
          console.error(`  ❌ ${addr}: ${err.message}`);
        }
      }
    }
  }

  printSuccess("所有地址处理完成");

  // 验证部分地址（最多显示10个）
  console.log("\n验证白名单状态（前10个）:");
  for (const address of uniqueAddresses.slice(0, 10)) {
    const isWhitelisted = await staking.whitelisted(address);
    console.log(`  ${address}: ${isWhitelisted ? "✅" : "❌"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 3. `scripts/premium/whitelist/remove-batch.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../../shared/types";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers";

/**
 * 批量从高级质押白名单移除用户
 */
async function main() {
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = getStakingAddress(StakingType.PREMIUM, network);

  // 要从白名单移除的用户地址列表
  const userAddresses = [
    "0x...",
    "0x...",
    "0x...",
  ];

  // 移除重复地址
  const uniqueAddresses = [...new Set(userAddresses)];

  printSeparator("批量从高级质押白名单移除用户");
  console.log("管理员地址:", admin.address);
  console.log("合约地址:", stakingAddress);
  console.log("用户数量:", uniqueAddresses.length);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 按批次处理（每批最多100个地址）
  const batchSize = 100;
  for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
    const batch = uniqueAddresses.slice(i, i + batchSize);
    console.log(`\n处理第 ${Math.floor(i/batchSize) + 1} 批，共 ${batch.length} 个地址...`);

    try {
      const tx = await staking.updateWhitelistBatch(batch, false);
      await waitForTransaction(tx, "批量移除白名单交易");
      printSuccess(`成功移除 ${batch.length} 个用户`);
    } catch (error: any) {
      console.error(`批量移除失败: ${error.message}`);
    }
  }

  printSuccess("所有地址处理完成");

  // 验证部分地址
  console.log("\n验证白名单状态（前10个）:");
  for (const address of uniqueAddresses.slice(0, 10)) {
    const isWhitelisted = await staking.whitelisted(address);
    console.log(`  ${address}: ${isWhitelisted ? "❌ 仍在白名单" : "✅ 已移除"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 4. `scripts/premium/whitelist/toggle-mode.ts`

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../../shared/types";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers";

/**
 * 启用/禁用高级质押的白名单模式
 */
async function main() {
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = getStakingAddress(StakingType.PREMIUM, network);

  // 从命令行参数读取: true=启用, false=禁用
  const enable = process.env.ENABLE === "true";

  printSeparator(`${enable ? "启用" : "禁用"}高级质押白名单模式`);
  console.log("管理员地址:", admin.address);
  console.log("合约地址:", stakingAddress);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 检查当前状态
  const currentMode = await staking.onlyWhitelistCanStake();
  console.log("当前白名单模式:", currentMode ? "启用" : "禁用");

  if (currentMode === enable) {
    console.log(`⚠️  白名单模式已经是${enable ? "启用" : "禁用"}状态`);
    return;
  }

  // 切换白名单模式
  console.log(`\n正在${enable ? "启用" : "禁用"}白名单模式...`);
  const tx = await staking.setWhitelistOnlyMode(enable);
  await waitForTransaction(tx, "切换白名单模式交易");

  printSuccess(`白名单模式已${enable ? "启用" : "禁用"}`);

  // 验证
  const newMode = await staking.onlyWhitelistCanStake();
  console.log("\n验证结果:");
  console.log("  当前状态:", newMode ? "启用" : "禁用");
  
  if (enable) {
    console.log("\n⚠️  注意: 白名单模式已启用，只有白名单用户可以质押");
    console.log("  请使用 whitelist/add-batch.ts 批量添加授权用户");
  } else {
    console.log("\n✅ 白名单模式已禁用，所有用户都可以质押");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 5. `scripts/premium/whitelist/check-user.ts`

基于现有的 `checkWhitelist.ts`：

```typescript
import { ethers } from "hardhat";
import { StakingType } from "../../shared/types";
import { getStakingAddress, printSeparator } from "../../shared/helpers";

/**
 * 查询用户的白名单状态
 */
async function main() {
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = getStakingAddress(StakingType.PREMIUM, network);

  // 要查询的用户地址（从命令行参数读取）
  const userAddress = process.env.USER_ADDRESS || "0x...";

  printSeparator("查询白名单状态");
  console.log("合约地址:", stakingAddress);
  console.log("用户地址:", userAddress);

  // 连接合约
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // 查询白名单状态
  const isWhitelisted = await staking.whitelisted(userAddress);
  console.log("\n查询结果:", isWhitelisted ? "✅ 在白名单中" : "❌ 不在白名单中");

  // 查询白名单模式
  const whitelistMode = await staking.onlyWhitelistCanStake();
  console.log("白名单模式:", whitelistMode ? "启用" : "禁用");

  if (!isWhitelisted && whitelistMode) {
    console.log("\n⚠️  该用户不在白名单中，无法进行质押");
  } else if (isWhitelisted) {
    console.log("\n✅ 该用户已授权，可以进行质押");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

### 第四步：创建开发和测试脚本

#### 1. `scripts/dev/compile.ts`

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { printSeparator, printSuccess, printError } from "../shared/helpers";

const execAsync = promisify(exec);

/**
 * 编译所有合约
 */
async function main() {
  printSeparator("编译合约");

  try {
    console.log("开始编译合约...\n");
    
    // 执行 hardhat compile
    const { stdout, stderr } = await execAsync("npx hardhat compile");
    
    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr) {
      console.error(stderr);
    }

    printSuccess("合约编译完成！");

    // 显示编译产物信息
    console.log("\n编译产物位置:");
    console.log("  - artifacts/");
    console.log("  - cache/");
    console.log("  - typechain-types/");

  } catch (error: any) {
    printError("编译失败");
    console.error(error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 2. `scripts/dev/clean.ts`

```typescript
import { rmSync, existsSync } from "fs";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers";

/**
 * 清理编译产物和缓存
 */
async function main() {
  printSeparator("清理编译产物");

  const dirs = [
    "artifacts",
    "cache",
    "typechain-types",
    "coverage",
    "coverage.json",
  ];

  console.log("准备清理以下目录/文件:\n");
  dirs.forEach(dir => console.log(`  - ${dir}`));

  console.log("\n开始清理...\n");

  let cleaned = 0;
  let skipped = 0;

  for (const dir of dirs) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        console.log(`  ✅ 已删除: ${dir}`);
        cleaned++;
      } catch (error: any) {
        console.error(`  ❌ 删除失败: ${dir} - ${error.message}`);
      }
    } else {
      console.log(`  ⏭️  跳过: ${dir} (不存在)`);
      skipped++;
    }
  }

  printSeparator();
  console.log(`清理完成: ${cleaned} 个已删除, ${skipped} 个跳过`);
  
  if (cleaned > 0) {
    printSuccess("清理成功！");
    printWarning("提示: 运行 'npm run compile' 重新编译合约");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 3. `scripts/dev/test-all.ts`

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { printSeparator, printSuccess, printError } from "../shared/helpers";

const execAsync = promisify(exec);

/**
 * 运行所有测试
 */
async function main() {
  printSeparator("运行所有测试");

  const testSuites = [
    {
      name: "单元测试 - 普通质押",
      command: "npx hardhat test scripts/test/unit/normal-staking.test.ts",
    },
    {
      name: "单元测试 - 高级质押",
      command: "npx hardhat test scripts/test/unit/premium-staking.test.ts",
    },
    {
      name: "集成测试 - 部署",
      command: "npx hardhat test scripts/test/integration/deploy-test.ts",
    },
    {
      name: "集成测试 - 质押",
      command: "npx hardhat test scripts/test/integration/stake-test.ts",
    },
    {
      name: "集成测试 - 白名单",
      command: "npx hardhat test scripts/test/integration/whitelist-test.ts",
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const suite of testSuites) {
    console.log(`\n▶️  ${suite.name}`);
    console.log("-".repeat(50));

    try {
      const { stdout } = await execAsync(suite.command);
      console.log(stdout);
      printSuccess(`${suite.name} 通过`);
      passed++;
    } catch (error: any) {
      printError(`${suite.name} 失败`);
      console.error(error.stdout || error.message);
      failed++;
    }
  }

  printSeparator("测试结果汇总");
  console.log(`通过: ${passed} / ${testSuites.length}`);
  console.log(`失败: ${failed} / ${testSuites.length}`);

  if (failed > 0) {
    printError(`有 ${failed} 个测试套件失败`);
    process.exit(1);
  } else {
    printSuccess("所有测试通过！");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 4. `scripts/dev/coverage.ts`

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { printSeparator, printSuccess, printError, printWarning } from "../shared/helpers";

const execAsync = promisify(exec);

/**
 * 生成测试覆盖率报告
 */
async function main() {
  printSeparator("生成测试覆盖率报告");

  try {
    console.log("开始运行覆盖率测试...\n");
    
    // 执行 hardhat coverage
    const { stdout, stderr } = await execAsync("npx hardhat coverage");
    
    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes("Warning")) {
      console.error(stderr);
    }

    printSuccess("覆盖率报告生成完成！");

    console.log("\n覆盖率报告位置:");
    console.log("  - coverage/index.html (HTML 报告)");
    console.log("  - coverage.json (JSON 数据)");
    
    printWarning("提示: 打开 coverage/index.html 查看详细报告");

    // 尝试解析并显示覆盖率摘要
    try {
      const fs = require("fs");
      const coverageData = JSON.parse(fs.readFileSync("coverage.json", "utf8"));
      
      console.log("\n📊 覆盖率摘要:");
      // 这里可以添加解析 coverage.json 并显示摘要的逻辑
      
    } catch (error) {
      // 忽略解析错误
    }

  } catch (error: any) {
    printError("生成覆盖率报告失败");
    console.error(error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

#### 5. `scripts/test/helpers/fixtures.ts`

```typescript
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * 测试装置 - 用于创建测试环境
 */

export interface TestFixture {
  admin: SignerWithAddress;
  user1: SignerWithAddress;
  user2: SignerWithAddress;
  user3: SignerWithAddress;
  normalStaking: any;
  premiumStaking: any;
  // 注意：HSK 是原生代币（native token），不需要 token 合约
}

/**
 * 部署测试环境
 * 使用 Transparent Proxy 模式部署 HSKStaking 合约
 */
export async function deployTestFixture(): Promise<TestFixture> {
  const [admin, user1, user2, user3] = await ethers.getSigners();

  // 部署 Normal Staking 实现合约
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const normalImplementation = await HSKStaking.deploy();
  await normalImplementation.waitForDeployment();

  const minStakeAmount = ethers.parseEther("1");
  const rewardRate = 800; // 8% APY (basis points)
  const stakeStartTime = Math.floor(Date.now() / 1000) + 60; // 1分钟后
  const stakeEndTime = stakeStartTime + (365 * 24 * 60 * 60); // 1年后

  // 编码初始化数据（关闭白名单模式）
  const normalInitData = normalImplementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
    false,  // whitelistMode: false - 所有用户可质押
  ]);

  // 部署 Normal Staking 代理合约（Transparent Proxy）
  const NormalStakingProxy = await ethers.getContractFactory("NormalStakingProxy");
  const normalProxy = await NormalStakingProxy.deploy(
    await normalImplementation.getAddress(),
    admin.address,
    normalInitData
  );
  await normalProxy.waitForDeployment();

  const normalStaking = HSKStaking.attach(await normalProxy.getAddress());

  // 部署 Premium Staking 实现合约
  const premiumImplementation = await HSKStaking.deploy();
  await premiumImplementation.waitForDeployment();

  const premiumMinStakeAmount = ethers.parseEther("500000");
  const premiumRewardRate = 1600; // 16% APY (basis points)

  // 编码初始化数据（启用白名单模式）
  const premiumInitData = premiumImplementation.interface.encodeFunctionData("initialize", [
    premiumMinStakeAmount,
    premiumRewardRate,
    stakeStartTime,
    stakeEndTime,
    true,  // whitelistMode: true - 仅白名单用户可质押
  ]);

  // 部署 Premium Staking 代理合约（Transparent Proxy）
  const PremiumStakingProxy = await ethers.getContractFactory("PremiumStakingProxy");
  const premiumProxy = await PremiumStakingProxy.deploy(
    await premiumImplementation.getAddress(),
    admin.address,
    premiumInitData
  );
  await premiumProxy.waitForDeployment();

  const premiumStaking = HSKStaking.attach(await premiumProxy.getAddress());

  // 向奖励池添加资金（使用原生代币 HSK）
  const rewardAmount = ethers.parseEther("1000000");
  await normalStaking.updateRewardPool({ value: rewardAmount });
  await premiumStaking.updateRewardPool({ value: rewardAmount });

  return {
    admin,
    user1,
    user2,
    user3,
    normalStaking,
    premiumStaking,
  };
}

/**
 * 快进时间（测试网络）
 */
export async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * 获取当前区块时间戳
 */
export async function getCurrentTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}
```

#### 6. `scripts/test/helpers/test-utils.ts`

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * 测试辅助函数
 */

/**
 * 期望交易回滚
 */
export async function expectRevert(
  promise: Promise<any>,
  expectedError?: string
) {
  try {
    await promise;
    throw new Error("预期交易回滚，但交易成功了");
  } catch (error: any) {
    if (expectedError) {
      expect(error.message).to.include(expectedError);
    }
  }
}

/**
 * 期望事件被触发
 */
export async function expectEvent(
  tx: any,
  eventName: string,
  args?: any[]
) {
  const receipt = await tx.wait();
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = tx.interface?.parseLog(log);
      return parsed?.name === eventName;
    } catch {
      return false;
    }
  });

  expect(event).to.not.be.undefined;

  if (args) {
    // 验证事件参数
    // 这里可以添加更详细的参数验证逻辑
  }

  return event;
}

/**
 * 格式化余额用于比较
 */
export function formatBalance(balance: bigint): string {
  return ethers.formatEther(balance);
}

/**
 * 解析 Ether 金额
 */
export function parseEther(amount: string): bigint {
  return ethers.parseEther(amount);
}

/**
 * 比较两个 BigInt 是否接近（用于处理精度问题）
 */
export function expectCloseTo(
  actual: bigint,
  expected: bigint,
  delta: bigint = ethers.parseEther("0.001")
) {
  const diff = actual > expected ? actual - expected : expected - actual;
  expect(diff).to.be.lte(delta);
}
```

#### 7. `scripts/test/integration/deploy-test.ts`

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTestFixture } from "../helpers/fixtures";
import { printSeparator, printSuccess } from "../../shared/helpers";

/**
 * 部署集成测试
 */
describe("部署集成测试", function () {
  printSeparator("开始部署集成测试");

  describe("Normal Staking 部署", function () {
    it("应该成功部署 Normal Staking 合约", async function () {
      const { normalStaking, admin } = await deployTestFixture();

      expect(await normalStaking.getAddress()).to.be.properAddress;
      expect(await normalStaking.owner()).to.equal(admin.address);
      
      const minStakeAmount = await normalStaking.minStakeAmount();
      expect(minStakeAmount).to.equal(ethers.parseEther("1"));

      printSuccess("Normal Staking 部署成功");
    });

    it("应该正确初始化合约参数", async function () {
      const { normalStaking } = await deployTestFixture();

      const rewardRate = await normalStaking.rewardRate();
      expect(rewardRate).to.equal(800); // 8% (basis points)

      const isPaused = await normalStaking.paused();
      expect(isPaused).to.be.false;

      const whitelistMode = await normalStaking.onlyWhitelistCanStake();
      expect(whitelistMode).to.be.false;
    });
  });

  describe("Premium Staking 部署", function () {
    it("应该成功部署 Premium Staking 合约", async function () {
      const { premiumStaking, admin } = await deployTestFixture();

      expect(await premiumStaking.getAddress()).to.be.properAddress;
      expect(await premiumStaking.owner()).to.equal(admin.address);
      
      const minStakeAmount = await premiumStaking.minStakeAmount();
      expect(minStakeAmount).to.equal(ethers.parseEther("500000"));

      printSuccess("Premium Staking 部署成功");
    });

    it("应该启用白名单模式", async function () {
      const { premiumStaking } = await deployTestFixture();

      const whitelistMode = await premiumStaking.onlyWhitelistCanStake();
      expect(whitelistMode).to.be.true;
    });
  });

  printSeparator("部署集成测试完成");
});
```

#### 8. `scripts/test/integration/stake-test.ts`

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTestFixture, increaseTime } from "../helpers/fixtures";
import { expectRevert, parseEther } from "../helpers/test-utils";
import { printSeparator, printSuccess } from "../../shared/helpers";

/**
 * 质押集成测试
 */
describe("质押集成测试", function () {
  printSeparator("开始质押集成测试");

  describe("Normal Staking 质押", function () {
    it("用户应该能够成功质押", async function () {
      const { normalStaking, user1 } = await deployTestFixture();

      // 等待质押开始
      await increaseTime(61);

      const stakeAmount = parseEther("10");
      const tx = await normalStaking.connect(user1).stake({ value: stakeAmount });
      const receipt = await tx.wait();
      
      // 从事件中获取 positionId 或使用 nextPositionId - 1
      const nextId = await normalStaking.nextPositionId();
      const positionId = nextId - BigInt(1);
      
      const position = await normalStaking.positions(positionId);
      expect(position.owner).to.equal(user1.address);
      expect(position.amount).to.equal(stakeAmount);
      expect(position.isUnstaked).to.be.false;

      printSuccess("Normal Staking 质押成功");
    });

    it("应该拒绝低于最小金额的质押", async function () {
      const { normalStaking, user1 } = await deployTestFixture();

      await increaseTime(61);

      const stakeAmount = parseEther("0.5"); // 低于最小金额 1 HSK
      
      await expectRevert(
        normalStaking.connect(user1).stake({ value: stakeAmount }),
        "Stake amount too low"
      );
    });
  });

  describe("Premium Staking 质押", function () {
    it("白名单用户应该能够成功质押", async function () {
      const { premiumStaking, admin, user1 } = await deployTestFixture();

      // 批量添加到白名单
      await premiumStaking.connect(admin).updateWhitelistBatch([user1.address], true);

      // 等待质押开始
      await increaseTime(61);

      const stakeAmount = parseEther("600000");
      const tx = await premiumStaking.connect(user1).stake({ value: stakeAmount });
      await tx.wait();

      const nextId = await premiumStaking.nextPositionId();
      const positionId = nextId - BigInt(1);
      const position = await premiumStaking.positions(positionId);
      
      expect(position.owner).to.equal(user1.address);
      expect(position.amount).to.equal(stakeAmount);

      printSuccess("Premium Staking 白名单用户质押成功");
    });

    it("应该拒绝非白名单用户质押", async function () {
      const { premiumStaking, user1 } = await deployTestFixture();

      await increaseTime(61);

      const stakeAmount = parseEther("600000");
      
      await expectRevert(
        premiumStaking.connect(user1).stake({ value: stakeAmount }),
        "Not whitelisted"
      );
    });
  });

  printSeparator("质押集成测试完成");
});
```

#### 9. `scripts/test/integration/whitelist-test.ts`

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTestFixture } from "../helpers/fixtures";
import { expectRevert } from "../helpers/test-utils";
import { printSeparator, printSuccess } from "../../shared/helpers";

/**
 * 白名单集成测试
 */
describe("白名单集成测试", function () {
  printSeparator("开始白名单集成测试");

  describe("添加白名单", function () {
    it("管理员应该能够批量添加用户到白名单", async function () {
      const { premiumStaking, admin, user1, user2, user3 } = await deployTestFixture();

      const users = [user1.address, user2.address, user3.address];
      await premiumStaking.connect(admin).updateWhitelistBatch(users, true);

      for (const user of users) {
        const isWhitelisted = await premiumStaking.whitelisted(user);
        expect(isWhitelisted).to.be.true;
      }

      printSuccess("成功批量添加用户到白名单");
    });

    it("非管理员不应该能够批量添加白名单", async function () {
      const { premiumStaking, user1, user2, user3 } = await deployTestFixture();

      const users = [user2.address, user3.address];
      await expectRevert(
        premiumStaking.connect(user1).updateWhitelistBatch(users, true),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("移除白名单", function () {
    it("管理员应该能够批量移除白名单用户", async function () {
      const { premiumStaking, admin, user1, user2, user3 } = await deployTestFixture();

      const users = [user1.address, user2.address, user3.address];
      
      // 批量添加
      await premiumStaking.connect(admin).updateWhitelistBatch(users, true);
      
      // 批量移除
      await premiumStaking.connect(admin).updateWhitelistBatch(users, false);

      for (const user of users) {
        const isWhitelisted = await premiumStaking.whitelisted(user);
        expect(isWhitelisted).to.be.false;
      }

      printSuccess("成功批量移除白名单用户");
    });
  });

  describe("白名单模式切换", function () {
    it("管理员应该能够切换白名单模式", async function () {
      const { premiumStaking, admin } = await deployTestFixture();

      // 当前应该是启用状态
      expect(await premiumStaking.onlyWhitelistCanStake()).to.be.true;

      // 禁用
      await premiumStaking.connect(admin).setWhitelistOnlyMode(false);
      expect(await premiumStaking.onlyWhitelistCanStake()).to.be.false;

      // 重新启用
      await premiumStaking.connect(admin).setWhitelistOnlyMode(true);
      expect(await premiumStaking.onlyWhitelistCanStake()).to.be.true;

      printSuccess("成功切换白名单模式");
    });
  });

  printSeparator("白名单集成测试完成");
});
```

#### 10. 迁移工具脚本

- `extractAbi.js` → `scripts/tools/extract-abi.js`

---

## 📝 迁移步骤

### 步骤 1：创建新目录结构

```bash
# 创建目录
mkdir -p scripts/shared
mkdir -p scripts/normal/{config,query}
mkdir -p scripts/premium/{whitelist,config,query}
mkdir -p scripts/test/{unit,integration,helpers}
mkdir -p scripts/dev
mkdir -p scripts/tools
```

### 步骤 2：创建共享模块

1. 创建 `scripts/shared/constants.ts`
2. 创建 `scripts/shared/types.ts`
3. 创建 `scripts/shared/helpers.ts`
4. 移动并更新 `scripts/utils.ts` → `scripts/shared/utils.ts`

### 步骤 3：重构普通质押脚本

1. 重构 `deployNormalStaking.ts` → `scripts/normal/deploy.ts`
2. 创建 `scripts/normal/stake.ts`
3. 创建 `scripts/normal/add-rewards.ts`
4. 创建 `scripts/normal/upgrade.ts`
5. 创建查询脚本（config/ 和 query/ 目录下）

### 步骤 4：重构高级质押脚本

1. 重构 `deployPremiumStaking.ts` → `scripts/premium/deploy.ts`
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

### 步骤 6：迁移工具脚本

1. 移动 `extractAbi.js` → `scripts/tools/extract-abi.js`
2. 创建 `scripts/tools/generate-types.ts`
3. 创建 `scripts/tools/compare-contracts.ts`

### 步骤 7：更新 package.json scripts

更新 `package.json` 中的脚本命令：

```json
{
  "scripts": {
    "// === 开发脚本 ===": "",
    "compile": "hardhat compile",
    "compile:custom": "hardhat run scripts/dev/compile.ts",
    "clean": "hardhat clean",
    "clean:custom": "hardhat run scripts/dev/clean.ts",
    "build": "npm run clean && npm run compile",
    
    "// === 测试脚本 ===": "",
    "test": "hardhat test",
    "test:unit": "hardhat test scripts/test/unit/**/*.test.ts",
    "test:integration": "hardhat test scripts/test/integration/**/*.ts",
    "test:all": "hardhat run scripts/dev/test-all.ts",
    "test:coverage": "hardhat coverage",
    "coverage": "hardhat run scripts/dev/coverage.ts",
    
    "// === 部署脚本 ===": "",
    "deploy:normal": "hardhat run scripts/normal/deploy.ts --network mainnet",
    "deploy:normal:testnet": "hardhat run scripts/normal/deploy.ts --network testnet",
    "deploy:premium": "hardhat run scripts/premium/deploy.ts --network mainnet",
    "deploy:premium:testnet": "hardhat run scripts/premium/deploy.ts --network testnet",
    
    "// === 质押操作 ===": "",
    "stake:normal": "hardhat run scripts/normal/stake.ts --network mainnet",
    "stake:premium": "hardhat run scripts/premium/stake.ts --network mainnet",
    "unstake:normal": "hardhat run scripts/normal/unstake.ts --network mainnet",
    "unstake:premium": "hardhat run scripts/premium/unstake.ts --network mainnet",
    
    "// === 奖励管理 ===": "",
    "rewards:add:normal": "hardhat run scripts/normal/add-rewards.ts --network mainnet",
    "rewards:add:premium": "hardhat run scripts/premium/add-rewards.ts --network mainnet",
    "rewards:claim:normal": "hardhat run scripts/normal/claim-rewards.ts --network mainnet",
    "rewards:claim:premium": "hardhat run scripts/premium/claim-rewards.ts --network mainnet",
    
    "// === 白名单管理（Premium专属）===": "",
    "whitelist:add": "hardhat run scripts/premium/whitelist/add-batch.ts --network mainnet",
    "whitelist:remove": "hardhat run scripts/premium/whitelist/remove-batch.ts --network mainnet",
    "whitelist:check": "hardhat run scripts/premium/whitelist/check-user.ts --network mainnet",
    "whitelist:toggle": "hardhat run scripts/premium/whitelist/toggle-mode.ts --network mainnet",
    
    "// === 合约配置 ===": "",
    "config:pause:normal": "hardhat run scripts/normal/config/pause.ts --network mainnet",
    "config:unpause:normal": "hardhat run scripts/normal/config/unpause.ts --network mainnet",
    "config:pause:premium": "hardhat run scripts/premium/config/pause.ts --network mainnet",
    "config:unpause:premium": "hardhat run scripts/premium/config/unpause.ts --network mainnet",
    "config:set-start-time:normal": "hardhat run scripts/normal/config/set-start-time.ts --network mainnet",
    "config:set-start-time:premium": "hardhat run scripts/premium/config/set-start-time.ts --network mainnet",
    "config:set-end-time:normal": "hardhat run scripts/normal/config/set-end-time.ts --network mainnet",
    "config:set-end-time:premium": "hardhat run scripts/premium/config/set-end-time.ts --network mainnet",
    
    "// === 状态查询 ===": "",
    "query:status:normal": "hardhat run scripts/normal/query/check-status.ts --network mainnet",
    "query:status:premium": "hardhat run scripts/premium/query/check-status.ts --network mainnet",
    "query:stakes:normal": "hardhat run scripts/normal/query/check-stakes.ts --network mainnet",
    "query:stakes:premium": "hardhat run scripts/premium/query/check-stakes.ts --network mainnet",
    "query:rewards:normal": "hardhat run scripts/normal/query/check-rewards.ts --network mainnet",
    "query:rewards:premium": "hardhat run scripts/premium/query/check-rewards.ts --network mainnet",
    
    "// === 合约升级 ===": "",
    "upgrade:normal": "hardhat run scripts/normal/upgrade.ts --network mainnet",
    "upgrade:premium": "hardhat run scripts/premium/upgrade.ts --network mainnet",
    "verify:normal": "hardhat run scripts/normal/verify.ts --network mainnet",
    "verify:premium": "hardhat run scripts/premium/verify.ts --network mainnet",
    
    "// === 工具脚本 ===": "",
    "tools:extract-abi": "node scripts/tools/extract-abi.js",
    "tools:generate-types": "hardhat run scripts/tools/generate-types.ts"
  }
}
```

### 使用示例

```bash
# === 开发与测试 ===

# 编译合约
npm run compile
npm run compile:custom  # 使用自定义编译脚本

# 清理编译产物
npm run clean
npm run clean:custom

# 构建（清理 + 编译）
npm run build

# 运行测试
npm run test                  # 运行所有测试
npm run test:unit            # 只运行单元测试
npm run test:integration     # 只运行集成测试
npm run test:all             # 使用自定义脚本运行所有测试套件

# 生成测试覆盖率报告
npm run test:coverage
npm run coverage             # 使用自定义覆盖率脚本

# === 部署 ===

# 部署到主网
npm run deploy:normal
npm run deploy:premium

# 部署到测试网
npm run deploy:normal:testnet
npm run deploy:premium:testnet

# === 质押操作 ===

npm run stake:normal
npm run stake:premium
npm run unstake:normal
npm run unstake:premium

# === 奖励管理 ===

# 添加奖励
npm run rewards:add:normal
npm run rewards:add:premium

# 领取奖励
npm run rewards:claim:normal
npm run rewards:claim:premium

# === 白名单管理（Premium专属）===

# 批量添加/移除白名单
npm run whitelist:add      # 批量添加白名单
npm run whitelist:remove   # 批量移除白名单

# 查询用户白名单状态
USER_ADDRESS=0x123... npm run whitelist:check

# 切换白名单模式
ENABLE=true npm run whitelist:toggle  # 启用白名单模式
ENABLE=false npm run whitelist:toggle # 禁用白名单模式

# === 合约配置 ===

# 暂停/恢复合约
npm run config:pause:normal
npm run config:unpause:normal
npm run config:pause:premium
npm run config:unpause:premium

# 设置时间
npm run config:set-start-time:normal
npm run config:set-end-time:premium

# === 状态查询 ===

# 查询合约状态
npm run query:status:normal
npm run query:status:premium

# 查询质押信息
npm run query:stakes:normal
npm run query:stakes:premium

# 查询奖励信息
npm run query:rewards:normal
npm run query:rewards:premium

# === 合约升级 ===

npm run upgrade:normal
npm run upgrade:premium
npm run verify:normal
npm run verify:premium

# === 工具脚本 ===

npm run tools:extract-abi
npm run tools:generate-types
```

### 步骤 8：清理旧文件

在确认新脚本工作正常后，删除根目录下的旧脚本文件：

```bash
# 备份旧文件
mkdir -p scripts/backup
mv scripts/*.ts scripts/backup/ 2>/dev/null || true
mv scripts/*.js scripts/backup/ 2>/dev/null || true

# 保留新的目录结构
# 确认无误后可以删除 backup 目录
```

---

## ✅ 验证清单

完成迁移后，请验证以下内容：

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

- [ ] `npm run compile` 能够成功编译合约
- [ ] `npm run clean` 能够清理编译产物
- [ ] `npm run build` 完整构建流程正常

### 测试脚本验证

- [ ] `npm run test` 运行所有测试正常
- [ ] `npm run test:unit` 单元测试通过
- [ ] `npm run test:integration` 集成测试通过
- [ ] `npm run test:coverage` 生成覆盖率报告
- [ ] 测试辅助函数（fixtures、test-utils）正常工作
- [ ] 所有测试用例都能正确执行

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

- [ ] 合约升级脚本能够成功升级
- [ ] 合约验证脚本正常工作
- [ ] 升级后状态保持正确

### 工具脚本验证

- [ ] ABI 提取工具正常工作
- [ ] TypeScript 类型生成正常
- [ ] 合约对比工具正常

### package.json 验证

- [ ] 所有 npm scripts 正确指向新文件
- [ ] 命令名称清晰易懂
- [ ] 测试网和主网命令分离明确
- [ ] 环境变量传递正常

### 文档验证

- [ ] 每个子目录都有 README 说明
- [ ] 所有脚本都有注释说明
- [ ] 使用示例清晰准确
- [ ] 迁移文档完整

---

## 📚 附加建议

### 1. 添加配置文件

创建 `scripts/config.json` 用于存储环境相关的配置：

```json
{
  "mainnet": {
    "normalStaking": "0x...",
    "premiumStaking": "0x...",
    "hskToken": "0x..."
  },
  "testnet": {
    "normalStaking": "0x...",
    "premiumStaking": "0x...",
    "hskToken": "0x..."
  }
}
```

### 2. 添加环境变量支持

创建 `.env.example`：

```env
# Network
NETWORK=mainnet

# Contract Addresses
NORMAL_STAKING_ADDRESS=0x...
PREMIUM_STAKING_ADDRESS=0x...
HSK_TOKEN_ADDRESS=0x...

# Deployment Config
STAKE_START_OFFSET=604800  # 7 days in seconds

# Whitelist
USER_ADDRESS=0x...
```

### 3. 添加 README 文件

在每个子目录下添加 `README.md`，说明该目录下脚本的用途和使用方法。

### 4. 添加脚本模板

创建脚本模板文件，便于快速创建新脚本：

```typescript
// scripts/templates/script-template.ts
import { ethers } from "hardhat";
import { printSeparator, printSuccess } from "../shared/helpers";

/**
 * 脚本描述
 */
async function main() {
  const [signer] = await ethers.getSigners();

  printSeparator("脚本标题");
  console.log("签名者地址:", signer.address);

  // 实现逻辑
  
  printSuccess("操作成功！");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

