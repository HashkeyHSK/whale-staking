# Scripts 目录重构方案

## 📋 目标

将 `scripts/` 目录按照普通质押（Normal Staking）和高级质押（Premium Staking）进行分离，提高代码组织性和可维护性。

## ⚠️ 重要说明 - 合约架构

在开始重构之前，请了解以下关键信息：

### 合约架构特性

1. **合约名称**: `HSKStaking` (实现合约)
2. **代理模式**: Transparent Proxy（使用 `NormalStakingProxy` 和 `PremiumStakingProxy`）
3. **原生代币**: HSK 是链的原生代币（native token），类似于 ETH，不是 ERC20 代币
4. **锁定期**: 固定 365 天，在合约常量 `LOCK_PERIOD` 中定义，不能动态修改
5. **奖励率**: 在合约级别配置（`rewardRate`），所有 position 共享同一个奖励率
6. **Position 结构**: 
   ```solidity
   struct Position {
       uint256 positionId;
       address owner;
       uint256 amount;
       uint256 stakedAt;
       uint256 lastRewardAt;  // 上次领取奖励时间
       bool isUnstaked;
   }
   ```
   注意：Position 中不包含 `lockPeriod` 和 `rewardRate`，这些是合约级别的配置。

### 关键合约函数

- `stake()`: 质押 HSK，不需要传递 lockPeriod 参数，使用 `msg.value` 发送 HSK
- `unstake(uint256 positionId)`: 解除质押
- `claimReward(uint256 positionId)`: 领取奖励
- `updateRewardPool()`: 向奖励池添加资金，使用 `msg.value` 发送 HSK
- `updateWhitelistBatch(address[] users, bool status)`: 批量更新白名单
- `setWhitelistOnlyMode(bool enabled)`: 启用/禁用白名单模式

### 初始化参数

```solidity
function initialize(
    uint256 _minStakeAmount,
    uint256 _rewardRate,
    uint256 _stakeStartTime,
    uint256 _stakeEndTime
) public initializer
```

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

**配置管理**：
- `scripts/normal/config/set-start-time.ts` - 设置普通质押开始时间
- `scripts/normal/config/pause.ts` - 暂停普通质押合约
- `scripts/normal/config/unpause.ts` - 恢复普通质押合约
- `scripts/premium/config/set-start-time.ts` - 设置高级质押开始时间
- `scripts/premium/config/set-end-time.ts` - 设置高级质押结束时间
- `scripts/premium/config/pause.ts` - 暂停高级质押合约
- `scripts/premium/config/unpause.ts` - 恢复高级质押合约

**状态查询**：
- `scripts/normal/query/check-status.ts` - 查询普通质押状态
- `scripts/normal/query/check-rewards.ts` - 查询普通质押奖励
- `scripts/premium/query/check-status.ts` - 查询高级质押状态
- `scripts/premium/query/check-rewards.ts` - 查询高级质押奖励
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
 */

export interface ContractAddresses {
  normalStaking: string;
  premiumStaking: string;
  // 注意：HSK 是链的原生代币（native token），类似于 ETH，不需要代币合约地址
}

// Mainnet 地址
export const MAINNET_ADDRESSES: ContractAddresses = {
  normalStaking: "0x...",  // 待填写
  premiumStaking: "0x...", // 待填写
};

// Testnet 地址
export const TESTNET_ADDRESSES: ContractAddresses = {
  normalStaking: "0x...",  // 待填写
  premiumStaking: "0x...", // 待填写
};

// 获取当前网络的地址
export function getAddresses(network: string): ContractAddresses {
  switch (network) {
    case "mainnet":
      return MAINNET_ADDRESSES;
    case "testnet":
      return TESTNET_ADDRESSES;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// 质押产品配置
// 注意：锁定期固定为 365 天，在合约常量中定义
export const NORMAL_STAKING_CONFIG = {
  minStakeAmount: "1",           // 1 HSK
  rewardRate: 800,               // 8% APY (basis points)
  whitelistMode: false,
  productName: "Normal Staking",
  targetUsers: "普通用户",
};

export const PREMIUM_STAKING_CONFIG = {
  minStakeAmount: "500000",      // 500,000 HSK
  rewardRate: 1600,              // 16% APY (basis points)
  whitelistMode: true,
  productName: "Premium Staking",
  targetUsers: "大户/机构",
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
 * 质押位置信息
 * 注意：锁定期固定为365天，奖励率在合约级别配置
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
  whitelistMode: boolean;
  totalStaked: bigint;
  rewardPoolBalance: bigint;
  minStakeAmount: bigint;
  rewardRate: bigint;
  stakeStartTime: bigint;
  stakeEndTime: bigint;
}

/**
 * 部署配置
 */
export interface DeployConfig {
  minStakeAmount: string;
  rewardRate: number;
  stakingType: StakingType;
  whitelistMode: boolean;
  stakeStartOffset?: number; // 质押开始时间偏移（秒）
}

/**
 * 脚本执行结果
 */
export interface ScriptResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
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
    whitelistMode: status.whitelistMode,
    totalStaked: ethers.formatEther(status.totalStaked),
    rewardPoolBalance: ethers.formatEther(status.rewardPoolBalance),
    minStakeAmount: ethers.formatEther(status.minStakeAmount),
    rewardRate: `${Number(status.rewardRate) / 100}%`,
    stakeStartTime: new Date(Number(status.stakeStartTime) * 1000).toLocaleString(),
    stakeEndTime: new Date(Number(status.stakeEndTime) * 1000).toLocaleString(),
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
  const stakeStartTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7天后
  const stakeEndTime = stakeStartTime + (365 * 24 * 60 * 60); // 1年后

  console.log("\n初始化参数:");
  console.log(`  - 最小质押金额: ${ethers.formatEther(minStakeAmount)} HSK`);
  console.log(`  - 年化收益率: ${rewardRate / 100}%`);
  console.log(`  - 质押开始时间: ${new Date(stakeStartTime * 1000).toISOString()}`);
  console.log(`  - 质押结束时间: ${new Date(stakeEndTime * 1000).toISOString()}`);
  console.log(`  - 锁定期: 365 天（固定）`);

  // 3. 编码初始化数据
  const initData = implementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
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

  // 5. 通过代理连接到 HSKStaking 合约进行配置
  const staking = HSKStaking.attach(proxyAddress);

  // 6. 关闭白名单模式（普通用户可自由质押）
  console.log("\n关闭白名单模式（允许所有用户质押）...");
  // 注意：合约初始化时默认启用白名单模式（onlyWhitelistCanStake = true）
  const setWhitelistTx = await staking.setWhitelistOnlyMode(false);
  await setWhitelistTx.wait();
  printSuccess("白名单模式已关闭");

  // 7. 验证配置
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
  const positionIds = await staking.userPositions(user.address);
  console.log("总质押位置数:", positionIds.length);

  if (positionIds.length > 0) {
    const latestPositionId = positionIds[positionIds.length - 1];
    const latest = await staking.positions(latestPositionId);
    console.log("\n最新质押信息:");
    console.log("  - 位置ID:", latestPositionId.toString());
    console.log("  - 质押金额:", ethers.formatEther(latest.amount), "HSK");
    console.log("  - 质押时间:", new Date(Number(latest.stakedAt) * 1000).toLocaleString());
    console.log("  - 锁定期: 365 天（固定）");
    console.log("  - 年化收益率:", rewardRate / 100, "%");
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

  // 编码初始化数据
  const normalInitData = normalImplementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
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

  // 关闭 Normal Staking 的白名单模式（允许所有用户质押）
  await normalStaking.setWhitelistOnlyMode(false);

  // 部署 Premium Staking 实现合约
  const premiumImplementation = await HSKStaking.deploy();
  await premiumImplementation.waitForDeployment();

  const premiumMinStakeAmount = ethers.parseEther("500000");
  const premiumRewardRate = 1600; // 16% APY (basis points)

  // 编码初始化数据
  const premiumInitData = premiumImplementation.interface.encodeFunctionData("initialize", [
    premiumMinStakeAmount,
    premiumRewardRate,
    stakeStartTime,
    stakeEndTime,
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

  // Premium Staking 保持白名单模式启用（默认就是启用的）
  // onlyWhitelistCanStake 在初始化时默认为 true

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
      await normalStaking.connect(user1).stake({ value: stakeAmount });

      const positions = await normalStaking.getUserPositions(user1.address);
      expect(positions.length).to.equal(1);
      expect(positions[0].amount).to.equal(stakeAmount);

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
      await premiumStaking.connect(user1).stake({ value: stakeAmount });

      const positionIds = await premiumStaking.userPositions(user1.address);
      expect(positionIds.length).to.equal(1);

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

## 🔄 迁移时间表

| 阶段 | 任务 | 预计时间 | 详细说明 |
|------|------|---------|---------|
| 第一阶段 | 创建目录结构和共享模块 | 2 小时 | 创建所有目录，实现 constants、types、helpers、utils |
| 第二阶段 | 重构普通质押脚本 | 4 小时 | 部署、质押、奖励、升级、查询等脚本 |
| 第三阶段 | 重构高级质押脚本 | 4 小时 | 包含白名单管理的完整功能 |
| 第四阶段 | 创建开发和测试脚本 | 4 小时 | compile、clean、test-all、coverage 及测试辅助函数 |
| 第五阶段 | 实现集成测试 | 3 小时 | 部署、质押、白名单三个测试套件 |
| 第六阶段 | 迁移工具脚本 | 1 小时 | extract-abi、generate-types、compare-contracts |
| 第七阶段 | 更新 package.json 和文档 | 2 小时 | 更新所有 npm scripts 和 README 文档 |
| 第八阶段 | 测试和验证 | 4 小时 | 完整运行验证清单中的所有项目 |
| 第九阶段 | 清理和优化 | 2 小时 | 清理旧文件，优化代码，最终检查 |
| **总计** | | **26 小时** | 约 3-4 个工作日 |

### 每日工作计划建议

**第一天（8小时）**
- 上午：第一阶段 - 创建目录和共享模块（2小时）
- 上午：第二阶段开始 - 普通质押脚本（2小时）
- 下午：第二阶段完成（2小时）
- 下午：第三阶段开始（2小时）

**第二天（8小时）**
- 上午：第三阶段完成 - 高级质押脚本（2小时）
- 上午：第四阶段 - 开发和测试脚本（2小时）
- 下午：第四阶段完成（2小时）
- 下午：第五阶段 - 集成测试（2小时）

**第三天（8小时）**
- 上午：第五阶段完成（1小时）
- 上午：第六阶段 - 工具脚本（1小时）
- 上午：第七阶段 - 更新文档（2小时）
- 下午：第八阶段 - 测试验证（4小时）

**第四天（2小时）**
- 第九阶段 - 清理优化和最终检查（2小时）

---

## 🚀 开发工作流程

完成重构后，推荐的开发工作流程如下：

### 日常开发流程

```bash
# 1. 修改合约代码后，重新编译
npm run compile

# 2. 运行测试确保没有破坏现有功能
npm run test

# 3. 如果需要，生成覆盖率报告
npm run test:coverage

# 4. 部署到测试网进行验证
npm run deploy:normal:testnet
npm run deploy:premium:testnet

# 5. 运行集成测试
npm run test:integration

# 6. 部署到主网（生产环境）
npm run deploy:normal
npm run deploy:premium
```

### 新功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-staking-feature

# 2. 编写合约代码
# 编辑 contracts/ 目录下的文件

# 3. 编写测试用例
# 在 scripts/test/unit/ 或 scripts/test/integration/ 创建测试文件

# 4. 编译并运行测试
npm run build
npm run test

# 5. 确保测试覆盖率
npm run test:coverage

# 6. 创建相应的操作脚本
# 在 scripts/normal/ 或 scripts/premium/ 创建脚本

# 7. 更新 package.json 添加新命令

# 8. 更新文档

# 9. 提交代码
git add .
git commit -m "feat: add new staking feature"
git push origin feature/new-staking-feature
```

### 问题排查流程

```bash
# 1. 清理所有编译产物
npm run clean

# 2. 重新编译
npm run compile

# 3. 检查合约状态
npm run query:status:normal
npm run query:status:premium

# 4. 查看日志和事件
# 查看交易哈希，使用区块链浏览器

# 5. 运行特定测试
npm run test -- --grep "specific test name"
```

---

## 📖 最佳实践

### 脚本编写规范

1. **文件命名**
   - 使用小写字母和连字符：`add-rewards.ts`
   - 功能明确，一目了然：`check-status.ts`

2. **代码结构**
   ```typescript
   // 1. 导入依赖
   import { ethers } from "hardhat";
   import { ... } from "../shared/...";

   // 2. 类型定义（如果需要）
   interface CustomType { ... }

   // 3. 主函数
   async function main() {
     // 实现逻辑
   }

   // 4. 错误处理
   main().catch((error) => {
     console.error(error);
     process.exit(1);
   });
   ```

3. **注释说明**
   - 每个脚本开头添加功能说明
   - 关键步骤添加注释
   - 复杂逻辑添加详细说明

4. **错误处理**
   - 使用 try-catch 捕获异常
   - 提供清晰的错误信息
   - 适当的退出码

5. **日志输出**
   - 使用共享的打印函数（printSuccess、printError 等）
   - 提供详细的操作步骤日志
   - 显示重要参数和结果

### 测试编写规范

1. **测试文件命名**
   - 单元测试：`*.test.ts`
   - 集成测试：描述性命名，如 `deploy-test.ts`

2. **测试结构**
   ```typescript
   describe("功能模块", function () {
     describe("子功能1", function () {
       it("应该满足某个条件", async function () {
         // 准备
         // 执行
         // 断言
       });
     });
   });
   ```

3. **测试覆盖**
   - 正常流程测试
   - 边界条件测试
   - 错误场景测试
   - 权限检查测试

### 配置管理规范

1. **环境变量**
   - 敏感信息使用 `.env` 文件
   - 不同环境使用不同配置
   - 提供 `.env.example` 模板

2. **合约地址**
   - 在 `scripts/shared/constants.ts` 集中管理
   - 区分主网和测试网
   - 版本化管理

3. **参数配置**
   - 使用配置对象而非硬编码
   - 提供合理的默认值
   - 文档化所有配置项

### 安全最佳实践

1. **权限管理**
   - 部署和升级脚本需要管理员权限
   - 查询脚本可以任何人运行
   - 白名单操作需要严格权限检查

2. **参数验证**
   - 所有输入参数进行验证
   - 地址格式检查
   - 金额范围检查

3. **交易确认**
   - 重要操作前显示详细信息
   - 等待交易确认
   - 验证交易结果

4. **测试网先行**
   - 所有操作先在测试网验证
   - 确认无误后再部署到主网
   - 保留完整的操作日志

---

## 📚 参考资料

### 相关文档

- [Hardhat 官方文档](https://hardhat.org/docs)
- [Ethers.js 文档](https://docs.ethers.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity 文档](https://docs.soliditylang.org/)

### 项目文档

- `docs/PRODUCT_PLANS.md` - 产品规划文档
- `docs/PRODUCT_PLANS_DEV.md` - 开发规划文档
- `docs/AUDIT_REPORT.md` - 审计报告
- `contracts/AUDIT_REPORT.md` - 合约审计报告

### 常见问题

**Q: 如何在本地测试脚本？**
```bash
# 启动本地节点
npx hardhat node

# 在另一个终端运行脚本
npx hardhat run scripts/xxx.ts --network localhost
```

**Q: 如何调试脚本？**
```typescript
// 使用 console.log
console.log("变量值:", variable);

// 使用调试器
// 在 VS Code 中配置 launch.json，使用 F5 调试
```

**Q: 测试覆盖率报告在哪里？**
```bash
# 生成报告后
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

**Q: 如何添加新的 npm 脚本？**
1. 在 `package.json` 的 `scripts` 部分添加命令
2. 使用清晰的命名规范：`<分类>:<操作>:<目标>`
3. 更新本文档的使用示例部分

---

## 📝 更新日志

### v2.0.1 - 2024-11-12

**合约架构修正**
- 🔧 根据实际合约实现更新所有示例代码
- 📝 澄清 HSK 为原生代币（native token），不是 ERC20
- 📝 修正 Position 结构定义（移除 lockPeriod 和 rewardRate 字段）
- 📝 更新锁定期说明：固定 365 天，不可动态修改
- 📝 更新奖励率说明：在合约级别配置，不在单个 position 中
- 📝 修正代理模式说明：使用 Transparent Proxy，不是 UUPS
- 📝 更新所有脚本示例代码以匹配实际合约接口
- 📝 添加合约架构特性说明章节

**类型定义更新**
- 🔧 `StakingPosition` 接口：移除 lockPeriod、rewardRate、unstakedAt；添加 lastRewardAt
- 🔧 `ContractAddresses` 接口：移除 hskToken（HSK 是原生代币）
- 🔧 `ContractStatus` 接口：添加 rewardRate，移除 version
- 🔧 `formatStakingPosition` 函数：更新以匹配新的 Position 结构
- 🔧 `formatContractStatus` 函数：添加 rewardRate 格式化

**脚本示例更新**
- 🔧 部署脚本：使用 Transparent Proxy，添加锁定期说明
- 🔧 质押脚本：移除 lockPeriod 参数，使用 userPositions 查询
- 🔧 查询脚本：添加 rewardRate 查询，移除 version 查询
- 🔧 测试装置：更新部署流程和白名单配置
- 🔧 集成测试：使用 updateWhitelistBatch 而不是 addToWhitelist

### v2.0.0 - 2024-11-12

**重大更新**
- ✨ 完整重构 scripts 目录结构
- ✨ 按产品类型（Normal/Premium）分离脚本
- ✨ 新增开发脚本（compile、clean、test-all、coverage）
- ✨ 新增完整的测试套件（单元测试 + 集成测试）
- ✨ 新增测试辅助函数（fixtures、test-utils）
- ✨ 新增共享模块（constants、types、helpers、utils）

**新增脚本**
- 开发脚本：`scripts/dev/` 目录（4个脚本）
- 测试脚本：`scripts/test/` 目录（包含单元测试和集成测试）
- 工具脚本：`scripts/tools/` 目录
- 白名单管理：`scripts/premium/whitelist/` 目录（4个脚本：批量添加、批量移除、查询、切换模式）
- 配置管理：`scripts/{normal,premium}/config/` 目录
- 状态查询：`scripts/{normal,premium}/query/` 目录

**改进**
- 📝 更新所有文档和注释
- 🔧 优化 package.json scripts
- ✅ 新增详细的验证清单
- 📊 新增迁移时间表和工作计划

---

## 🎯 总结

本次重构完成后，`scripts/` 目录将具有以下优势：

1. **清晰的组织结构**
   - 按产品类型分离（Normal/Premium）
   - 按功能分类（deploy、stake、config、query 等）
   - 共享代码模块化

2. **完善的开发工具**
   - 编译、清理、测试、覆盖率工具齐全
   - 测试辅助函数完备
   - 集成测试覆盖主要场景

3. **易于维护和扩展**
   - 模块化设计，易于添加新功能
   - 统一的代码规范和错误处理
   - 详细的文档和注释

4. **提高开发效率**
   - 命令清晰明确，易于记忆
   - 自动化测试流程
   - 完整的工作流程指导

5. **提升代码质量**
   - 测试覆盖率监控
   - 统一的代码风格
   - 完善的错误处理机制

希望这个重构方案能够帮助项目更好地发展！

---

**文档维护者**: 开发团队  
**最后更新**: 2024-11-12  
**版本**: 2.0.0

