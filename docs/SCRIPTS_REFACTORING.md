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

**说明**：
- ✅ Normal Staking 相关脚本已完成
- ⏳ Premium Staking 相关脚本待实现
- ⏳ 测试脚本（test/）待实现
- ⏳ 开发脚本（dev/）待实现
- ⏳ 工具脚本（tools/）待实现

---

## 🎯 目标目录结构

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

### 共享模块（✅ 已完成）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/shared/constants.ts` | ✅ 已完成 | 配置和地址 |
| `scripts/shared/types.ts` | ✅ 已完成 | 类型定义 |
| `scripts/shared/helpers.ts` | ✅ 已完成 | 辅助函数 |
| `scripts/shared/utils.ts` | ✅ 已完成 | 工具函数 |

### Premium Staking 脚本（⏳ 待实现）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/premium/deploy.ts` | ⏳ 待实现 | 部署高级质押合约 |
| `scripts/premium/stake.ts` | ⏳ 待实现 | 质押操作 |
| `scripts/premium/unstake.ts` | ⏳ 待实现 | 解除质押 |
| `scripts/premium/claim-rewards.ts` | ⏳ 待实现 | 领取奖励 |
| `scripts/premium/add-rewards.ts` | ⏳ 待实现 | 添加奖励池 |
| `scripts/premium/emergency-withdraw.ts` | ⏳ 待实现 | 紧急提取本金 |
| `scripts/premium/withdraw-excess.ts` | ⏳ 待实现 | 提取多余奖励 |
| `scripts/premium/verify-forge.ts` | ⏳ 待实现 | 验证合约 |
| `scripts/premium/whitelist/add-batch.ts` | ⏳ 待实现 | 批量添加白名单 |
| `scripts/premium/whitelist/remove-batch.ts` | ⏳ 待实现 | 批量移除白名单 |
| `scripts/premium/whitelist/check-user.ts` | ⏳ 待实现 | 查询用户白名单状态 |
| `scripts/premium/whitelist/toggle-mode.ts` | ⏳ 待实现 | 切换白名单模式 |
| `scripts/premium/config/*.ts` | ⏳ 待实现 | 配置管理脚本 |
| `scripts/premium/query/*.ts` | ⏳ 待实现 | 状态查询脚本 |

### 其他脚本（⏳ 待实现）

| 脚本文件 | 状态 | 说明 |
|---------|------|------|
| `scripts/test/**/*.ts` | ⏳ 待实现 | 测试脚本 |
| `scripts/dev/**/*.ts` | ⏳ 待实现 | 开发脚本 |
| `scripts/tools/**/*.ts` | ⏳ 待实现 | 工具脚本 |

### 🆕 待实现的脚本

以下脚本尚未实现，需要新建：

**Premium Staking 质押操作**：
- `scripts/premium/deploy.ts` - 部署高级质押合约
- `scripts/premium/stake.ts` - 高级质押操作
- `scripts/premium/unstake.ts` - 高级质押解除质押
- `scripts/premium/claim-rewards.ts` - 高级质押领取奖励
- `scripts/premium/add-rewards.ts` - 添加高级质押奖励池
- `scripts/premium/emergency-withdraw.ts` - 紧急提取本金（仅紧急模式）
- `scripts/premium/withdraw-excess.ts` - 提取多余奖励池资金
- `scripts/premium/verify-forge.ts` - 验证合约（使用 Foundry）

**Premium Staking 白名单管理**：
- `scripts/premium/whitelist/add-batch.ts` - 批量添加白名单
- `scripts/premium/whitelist/remove-batch.ts` - 批量移除白名单
- `scripts/premium/whitelist/check-user.ts` - 查询用户白名单状态
- `scripts/premium/whitelist/toggle-mode.ts` - 切换白名单模式

**Premium Staking 配置管理**：
- `scripts/premium/config/set-start-time.ts` - 设置高级质押开始时间
- `scripts/premium/config/set-end-time.ts` - 设置高级质押结束时间
- `scripts/premium/config/set-min-stake.ts` - 设置最小质押金额
- `scripts/premium/config/pause.ts` - 暂停高级质押合约
- `scripts/premium/config/unpause.ts` - 恢复高级质押合约
- `scripts/premium/config/enable-emergency.ts` - 启用紧急模式（不可逆）

**Premium Staking 状态查询**：
- `scripts/premium/query/check-status.ts` - 查询高级质押状态
- `scripts/premium/query/check-stakes.ts` - 查询高级质押信息
- `scripts/premium/query/pending-reward.ts` - 查询指定位置的待领取奖励
- `scripts/premium/query/check-whitelist.ts` - 查询白名单配置

**测试脚本**：
- `scripts/test/unit/**/*.test.ts` - 单元测试
- `scripts/test/integration/**/*.ts` - 集成测试
- `scripts/test/helpers/**/*.ts` - 测试辅助函数

**开发脚本**：
- `scripts/dev/compile.ts` - 编译合约
- `scripts/dev/clean.ts` - 清理编译产物
- `scripts/dev/coverage.ts` - 生成测试覆盖率报告
- `scripts/dev/test-all.ts` - 运行所有测试

**工具脚本**：
- `scripts/tools/extract-abi.js` - 提取 ABI
- `scripts/tools/generate-types.ts` - 生成 TypeScript 类型
- `scripts/tools/compare-contracts.ts` - 对比合约差异

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

- `scripts/tools/extract-abi.js` - 提取 ABI

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

### 步骤 6：创建工具脚本

1. 创建 `scripts/tools/extract-abi.js`
2. 创建 `scripts/tools/generate-types.ts`
3. 创建 `scripts/tools/compare-contracts.ts`

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

