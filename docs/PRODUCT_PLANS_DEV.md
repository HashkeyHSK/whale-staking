# 双层 Staking 产品方案 - 开发版本

> **文档说明**：本文档面向开发团队，包含技术实现细节、合约接口、部署配置等开发相关信息。  
> **运营版本**：请参考 [PRODUCT_PLANS.md](./PRODUCT_PLANS.md)

---

## 一. 技术架构概述

### 1.1 产品方案

本方案基于 `Layer2StakingV2` 合约，通过部署两个独立的合约实例实现两套产品：

| 产品 | 合约实例 | 目标用户 | 最小质押 | 年化收益 | 白名单 |
|------|---------|---------|---------|---------|--------|
| 普通 Staking | 独立实例 A | 普通用户 | 1 HSK | 8% | 关闭 |
| Premium Staking | 独立实例 B | 大户/机构 | 500,000 HSK | 16% | 启用 |

### 1.2 技术栈

- **Solidity**: ^0.8.27
- **代理模式**: Transparent Proxy
- **升级库**: OpenZeppelin Contracts ^5.1.0
- **开发框架**: Hardhat ^2.22.17
- **网络**: HashKey Layer2 (Testnet/Mainnet)

### 1.3 合约架构

```
Layer2StakingV2 (主合约)
├── StakingStorage (存储层)
├── StakingLib (计算库)
├── ReentrancyGuardUpgradeable (重入保护)
├── PausableUpgradeable (暂停功能)
├── OwnableUpgradeable (所有权管理)
```

**说明**: 不再使用 UUPS，改为 Transparent Proxy 模式，由 ProxyAdmin 控制升级
```

---

## 二. 产品配置参数

### 2.1 普通 Staking 配置

| 参数 | 值 | 合约函数 |
|------|-----|---------|
| `minStakeAmount` | 1 HSK (1e18) | `setMinStakeAmount(1e18)` |
| `LOCK_PERIOD` | 365 天 (31,536,000 秒) | 固定常量，部署时设置 |
| `rewardRate` | 8% (800 basis points) | 部署时通过 initialize() 设置 |
| `stakeStartTime` | 部署后7天 | `setStakeStartTime(timestamp)` |
| `stakeEndTime` | `type(uint256).max` | `setStakeEndTime(timestamp)` |
| `onlyWhitelistCanStake` | `false` | `setWhitelistOnlyMode(false)` |

### 2.2 Premium Staking 配置

| 参数 | 值 | 合约函数 |
|------|-----|---------|
| `minStakeAmount` | 500,000 HSK (5e23) | `setMinStakeAmount(500000e18)` |
| `LOCK_PERIOD` | 365 天 (31,536,000 秒) | 固定常量，部署时设置 |
| `rewardRate` | 16% (1600 basis points) | 部署时通过 initialize() 设置 |
| `stakeStartTime` | 部署后7天 | `setStakeStartTime(timestamp)` |
| `stakeEndTime` | `type(uint256).max` | `setStakeEndTime(timestamp)` |
| `onlyWhitelistCanStake` | `true` | `setWhitelistOnlyMode(true)` |

### 2.3 关键数据结构

```solidity
// Position 结构
struct Position {
    uint256 positionId;      // 质押位置 ID
    address owner;           // 质押位置所有者
    uint256 amount;          // 质押金额
    uint256 stakedAt;        // 质押时间戳
    uint256 lastRewardAt;    // 上次奖励提取时间戳
    uint256 rewardRate;      // 年化收益率（basis points）
    bool isUnstaked;         // 是否已解除质押
}

// 注意: V2版本使用固定的 LOCK_PERIOD 常量（365天），不再使用 LockOption 结构
```

---

## 三. 部署流程

### 3.1 部署脚本

#### 方式一：分别部署（推荐用于测试）

```bash
# 部署普通 Staking
npx hardhat run scripts/deployNormalStaking.ts --network hashkeyTestnet

# 部署 Premium Staking
npx hardhat run scripts/deployReStaking.ts --network hashkeyTestnet
```

#### 方式二：一次性部署

```bash
npx hardhat run scripts/deployDualTier.ts --network hashkeyTestnet
```

### 3.2 部署后配置清单

#### 普通 Staking
- [ ] 验证 `minStakeAmount` = 1 HSK
- [ ] 验证 `rewardRate` = 800 (8% APY)
- [ ] 验证 `LOCK_PERIOD` = 365 days (固定)
- [ ] 验证 `onlyWhitelistCanStake` = false
- [ ] 向奖励池充值（通过 `updateRewardPool()`）

#### Premium Staking
- [ ] 验证 `minStakeAmount` = 500,000 HSK
- [ ] 验证 `rewardRate` = 1600 (16% APY)
- [ ] 验证 `LOCK_PERIOD` = 365 days (固定)
- [ ] 验证 `onlyWhitelistCanStake` = true
- [ ] 添加白名单用户（通过 `updateWhitelistBatch()`）
- [ ] 向奖励池充值（通过 `updateRewardPool()`）

### 3.3 部署验证脚本

```bash
# 检查配置参数和合约状态
npx hardhat run scripts/checkStakes.ts --network hashkeyTestnet \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>

# 检查白名单状态（Premium Staking）
npx hardhat run scripts/checkWhitelist.ts --network hashkeyTestnet \
  -- --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS>
```

---

## 四. 核心合约接口

### 4.1 用户接口

#### `stake() payable → uint256 positionId`
创建新的质押位置（固定365天锁定期）。

**参数**：
- 无参数，通过 `msg.value` 发送质押金额

**要求**：
- `block.timestamp >= stakeStartTime` - 质押时间窗口已开始
- `block.timestamp < stakeEndTime` - 质押时间窗口未结束
- `msg.value >= minStakeAmount` - 满足最小质押金额
- 如果启用白名单：`whitelisted[msg.sender] == true` - 在白名单中
- `!emergencyMode` - 非紧急模式
- `!paused()` - 合约未暂停
- `rewardPoolBalance >= totalPendingRewards + potentialReward` - 奖励池余额充足

**返回**：新创建的质押位置 ID

#### `unstake(uint256 positionId)`
解除质押并提取本金和奖励。

**参数**：
- `positionId`: 质押位置 ID

**要求**：
- `msg.sender == position.owner` - 位置所有者
- `block.timestamp >= position.stakedAt + LOCK_PERIOD` - 锁定期已结束（365天）
- `!position.isUnstaked` - 位置未解除质押

**效果**：
- 提取本金 + 全部累积奖励
- 标记位置为已解除质押

#### `claimReward(uint256 positionId) → uint256 reward`
提取奖励（不解除质押）。

**参数**：
- `positionId`: 质押位置 ID

**返回**：提取的奖励金额

**要求**：
- `msg.sender == position.owner` - 位置所有者
- `reward > 0` - 有未提取的奖励
- `!emergencyMode` - 非紧急模式
- `!paused()` - 合约未暂停

#### `pendingReward(uint256 positionId) view → uint256`
查询待提取奖励。

**参数**：
- `positionId`: 质押位置 ID

**返回**：待提取的奖励金额

**说明**：紧急模式下返回 0

#### 查看用户质押位置

**方法1 - 通过 positions mapping**：
```solidity
positions(uint256 positionId) view → Position
```
直接查询指定 positionId 的位置信息。

**方法2 - 通过 userPositions mapping**：
```solidity
userPositions(address user, uint256 index) view → uint256 positionId
```
获取用户的第 index 个质押位置的 ID，然后通过 positions 查询详情。

- **说明**: `userPositions` 是 public mapping，需要遍历索引获取所有位置。

### 4.2 管理员接口

**说明**：V2版本使用固定365天锁定期和固定收益率（部署时设置），不支持动态添加或修改锁定期选项。

#### `setMinStakeAmount(uint256 newAmount)`
设置最小质押金额。

#### `setWhitelistOnlyMode(bool enabled)`
启用/禁用白名单模式。

#### `updateWhitelistBatch(address[] calldata users, bool status)`
批量管理白名单用户。

**参数**：
- `users`: 用户地址数组（最多100个）
- `status`: true 添加到白名单，false 从白名单移除

#### `updateRewardPool() payable`
向奖励池充值。

**重要**：
- 奖励池需要独立管理（普通 Staking 和 Premium Staking 分别管理）

#### `enableEmergencyMode()`
启用紧急模式。

**紧急模式下的限制**：
- 暂停奖励分配（所有奖励相关函数返回0）
- 阻止新质押
- 允许紧急提取（仅本金）
- 说明：若已满足解锁条件，正常 `unstake` 仍可执行，但奖励为 0；未到期可使用 `emergencyWithdraw`（仅本金）

#### `emergencyWithdraw(uint256 positionId)`
紧急提取（仅本金，放弃奖励）。

**要求**：
- 必须在紧急模式下
- 位置所有者

### 4.3 查询接口

**说明**：V2版本不提供 `getLockOptions()` 函数，因为锁定期固定为365天。

#### `totalStaked() view → uint256`
获取总质押量。

#### `rewardPoolBalance() view → uint256`
获取奖励池余额。

#### `onlyWhitelistCanStake() view → bool`
查询白名单模式状态。

#### `emergencyMode() view → bool`
查询紧急模式状态。

#### `LOCK_PERIOD() view → uint256`
获取固定锁定期（365 days = 31,536,000秒）。

#### `rewardRate() view → uint256`
获取年化收益率（basis points，例如：800 = 8%, 1600 = 16%）。

#### `stakeStartTime() view → uint256`
获取质押开始时间戳。

#### `stakeEndTime() view → uint256`
获取质押截止时间戳。

#### `positions(uint256 positionId) view → Position`
获取指定位置的详细信息。

#### `userPositions(address user, uint256 index) view → uint256`
获取用户的第 index 个质押位置 ID（需要遍历）。

---

## 五. 奖励计算机制

### 5.1 计算公式

奖励计算由 `StakingLib.calculateReward()` 实现：

```solidity
// 年化率 = rewardRate / 10000
// 完整年份数 = timeElapsed / 365 days
// 剩余天数 = (timeElapsed % 365 days)
// 
// 奖励 = 本金 × 年化率 × (完整年份数 + 剩余天数/365)
//
// 限制：如果 timeElapsed > lockPeriod，则 timeElapsed = lockPeriod
```

### 5.2 计算示例

**普通 Staking（8% APY，365天锁定期）**：
- 质押：10,000 HSK
- 锁定期：365 天
- 实际质押：365 天
- 奖励 = 10,000 × 0.08 × (365/365) = 800 HSK

**Premium Staking（16% APY，365天锁定期）**：
- 质押：1,000,000 HSK
- 锁定期：365 天
- 实际质押：365 天
- 奖励 = 1,000,000 × 0.16 × (365/365) = 160,000 HSK

### 5.3 奖励上限规则

**重要**：奖励只计算到锁定期结束。

示例：
- 用户选择 365 天锁定期
- 实际质押了 400 天才提取
- 奖励仍按 365 天计算，超期的 35 天不产生奖励

**实现位置**：`StakingLib.calculateReward()` 中的限制逻辑

---

---

## 七. 安全机制

### 7.1 重入攻击防护

- 使用 `ReentrancyGuardUpgradeable`
- 所有涉及资金转移的函数使用 `nonReentrant` 修饰符

### 7.2 访问控制

- **Owner**: 合约所有者，负责所有管理功能（包括升级、参数配置等）
- 使用 OpenZeppelin 的 OwnableUpgradeable 标准实现
- 支持所有权转移（`transferOwnership`）和放弃所有权（`renounceOwnership`）

### 7.3 紧急模式

- 管理员可启用紧急模式
- 紧急模式下：
  - 暂停奖励分配
  - 阻止新质押
  - 允许紧急提取（仅本金）

### 7.4 暂停机制

- 管理员可暂停合约（`pause()`）
- 暂停时：质押和奖励提取被禁用，解除质押不受影响

### 7.5 黑名单机制

- 支持封禁恶意地址（`addToBlacklist()`）
- 黑名单用户无法参与质押

---

## 八. 开发注意事项

### 8.1 精度处理

- 所有金额使用 18 位小数（`ethers.parseEther()`）
- 年化收益率使用 basis points（100% = 10000）
- 时间使用秒为单位

### 8.2 奖励池检查

合约在 `stake()` 时会检查奖励池余额是否充足。需要确保：
- 奖励池有足够资金支付预期奖励
- 定期监控奖励池余额
- 提前规划充值计划

### 8.3 历史记录保存

- 锁定期选项更新时，旧配置会保存在历史记录中
- 已存在的质押位置不受配置更新影响
- 使用历史记录中的 `rewardRate` 计算奖励

### 8.4 代理升级

- 使用 Transparent Proxy 代理模式
- 升级由 ProxyAdmin 合约控制
- 升级前需要充分测试
- 注意存储布局兼容性

### 8.5 事件监听

重要事件：
- `Staked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 lockPeriod)`
- `Unstaked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 reward)`
- `RewardClaimed(address indexed user, uint256 indexed positionId, uint256 reward)`
- `RewardPoolUpdated(uint256 newBalance)`
- `EmergencyModeEnabled()` / `EmergencyModeDisabled()`

---

## 九. 测试要求

### 9.1 单元测试

- [ ] 奖励计算正确性
- [ ] 锁定期验证
- [ ] 白名单机制
- [ ] 紧急模式
- [ ] 重入攻击防护
- [ ] 边界条件测试

### 9.2 集成测试

- [ ] 完整质押流程
- [ ] 奖励提取流程
- [ ] 解除质押流程
- [ ] 白名单审核流程
- [ ] 奖励池充值流程
- [ ] 紧急模式流程

### 9.3 压力测试

- [ ] 大量用户并发质押
- [ ] 奖励池耗尽场景
- [ ] 最大总质押量限制
- [ ] 大量位置查询性能

### 9.4 安全测试

- [ ] 重入攻击测试
- [ ] 权限控制测试
- [ ] 边界值测试
- [ ] 溢出/下溢测试

---

## 十. 前端集成要点

### 10.1 用户操作流程

#### 质押流程
1. 检查白名单状态（Premium Staking）
2. 检查质押时间窗口（`stakeStartTime` 和 `stakeEndTime`）
3. 检查最大总质押量限制
4. 调用 `stake()` 并发送 ETH（锁定期固定365天）
5. 监听 `PositionCreated` 事件

#### 提取奖励流程
1. 查询用户质押位置（`userPositions(user, index)`，需遍历）
2. 查询待提取奖励（`pendingReward()`）
3. 调用 `claimReward(positionId)`
4. 监听 `RewardClaimed` 事件

#### 解除质押流程
1. 检查锁定期是否结束（质押时间 + 365天）
2. 查询用户质押位置（`userPositions` 或 `positions`）
3. 调用 `unstake(positionId)`
4. 监听 `PositionUnstaked` 和 `RewardClaimed` 事件

### 10.2 显示数据

- **总质押量**：`totalStaked()`
- **奖励池余额**：`rewardPoolBalance()`
- **锁定期**：`LOCK_PERIOD()` (固定365天)
- **年化收益率**：`rewardRate()` (部署时设置，例如：800 = 8%)
- **用户质押位置**：`userPositions(user, index)`（需遍历索引）
- **位置详情**：`positions(positionId)`
- **待提取奖励**：`pendingReward(positionId)`

### 10.3 错误处理

常见错误：
- `InvalidAmount` - 质押金额不足
- `NotWhitelisted` - 未在白名单中
- `StillLocked` - 锁定期未结束（365天）
- `"Insufficient reward pool"` - 奖励池余额不足
- `"Staking has not started yet"` - 质押时间窗口未开始
- `"Staking period has ended"` - 质押时间窗口已结束
- `"Contract is in emergency mode"` - 合约处于紧急模式
- `AlreadyUnstaked` - 位置已解除质押
- `NoReward` - 没有可提取的奖励
- `PositionNotFound` - 位置不存在或不属于调用者

---

## 十一. 监控和告警

### 11.1 关键指标监控

#### 普通 Staking
- `totalStaked` - 总质押量
- `rewardPoolBalance` - 奖励池余额
- 用户数量统计（通过事件）

#### Premium Staking
- `totalStaked` - 总质押量
- `rewardPoolBalance` - 奖励池余额
- 白名单用户数量

### 11.2 告警阈值

- ⚠️ 奖励池余额 < 总待发放奖励（totalPendingRewards）
- ⚠️ 紧急模式启用
- ⚠️ 合约暂停

### 11.3 日志记录

建议记录：
- 所有质押/解除质押操作
- 奖励提取操作
- 奖励池充值操作
- 白名单变更操作
- 紧急模式启用/关闭

---

## 十二. 部署检查清单

### 12.1 部署前检查

- [ ] 合约代码已审计
- [ ] 测试覆盖率达到要求
- [ ] 部署脚本已验证
- [ ] 网络配置正确（RPC、私钥）
- [ ] 奖励池资金准备充足

### 12.2 部署后验证

- [ ] 合约地址正确记录
- [ ] 配置参数验证通过
- [ ] 权限设置正确（Owner）
- [ ] 奖励池充值成功
- [ ] 白名单用户添加成功（Premium Staking）
- [ ] 测试质押/提取流程

### 12.3 上线前准备

- [ ] 前端集成完成
- [ ] 监控系统配置完成
- [ ] 告警机制配置完成
- [ ] 运营文档准备完成
- [ ] 用户指南准备完成

---

## 十三. 常见问题

### Q: 如何修改锁定期或收益率？

A: V2版本使用固定锁定期（365天）和固定收益率（部署时设置），不支持动态修改。如需不同配置，请部署新的合约实例。

### Q: 奖励池余额不足怎么办？

A: 使用 `updateRewardPool()` 充值，确保有足够资金支付奖励。

### Q: 如何批量添加白名单用户？

A: 使用 `updateWhitelistBatch(address[] calldata users, bool status)`，最多100个。
- `status = true` 添加到白名单
- `status = false` 从白名单移除

### Q: 紧急模式如何启用/关闭？

A: 使用 `enableEmergencyMode()` 启用。注意：当前合约版本中，紧急模式一旦启用就无法通过函数关闭，可能需要通过合约升级来关闭。

---

## 十四. 相关资源

- [主 README](../README.md)
- [产品方案详细文档](./PRODUCT_PLANS.md) - **运营文档（推荐）**
- [产品方案执行摘要](./PRODUCT_SUMMARY.md) - 快速了解
- [双层产品方案文档](./DUAL_TIER_STAKING.md) - 技术部署文档
- [快速开始指南](./QUICK_START_DUAL_TIER.md) - 快速部署指南
- [技术常见问题](./TECHNICAL_FAQ.md) - 技术机制说明
- [术语表](./GLOSSARY.md) - 术语定义
- [错误处理指南](./ERROR_HANDLING.md) - 常见错误处理

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11

