# 提前解除质押功能修改文档


## 概述

本次更新添加了提前解除质押功能，允许用户在锁定期内提前退出质押，但需要承担50%的收益罚没。罚没的收益将进入罚没池，按每个位置的持仓比例自动分配给用户（在领取收益或完成提前解除时自动领取）。

## 功能特性

### 1. 提前解除质押流程

- **申请阶段**: 用户可以在锁定期内申请提前解除质押
- **等待期**: 申请后需要等待7天才能完成提前解除
- **收益停止**: 申请提前解除后，收益计算停止，不能再领取收益
- **收益计算**: 收益计算到申请提前解除的时间，而不是完成提前解除的时间
- **收益罚没**: 提前退出将丧失50%的收益（用户获得50%，50%进入罚没池）
- **本金扣除**: 如果用户已经提前领取的收益超过应得的50%，超出部分将从本金中扣除

### 2. 罚没池分配

- **分配时机**: 在用户 `claimReward()` 或 `completeEarlyUnstake()` 时自动领取
- **分配方式**: 按每个位置独立计算，根据该位置的持仓金额占比分配
- **分配条件**: 每个位置只能领取一次罚没池份额
- **自动领取**: 无需管理员操作，用户领取收益时自动获得罚没池份额

## 合约变更详情

### 1. 存储层变更 (`StakingStorage.sol`)

#### 新增存储变量

```solidity
uint256 public penaltyPoolBalance;           // 罚没池余额
mapping(uint256 => uint256) public claimedRewards;  // positionId => 已领取的收益总额
    mapping(uint256 => uint256) public earlyUnstakeRequestTime;  // positionId => 提前退出申请时间（0表示未申请）
    mapping(uint256 => bool) public penaltyPoolClaimed;  // positionId => 是否已领取罚没池份额
```

### 2. 常量定义变更 (`StakingConstants.sol`)

#### 新增常量

```solidity
uint256 public constant EARLY_UNLOCK_PERIOD = 7 days;  // 提前解锁等待期
```

### 3. 接口变更 (`IStaking.sol`)

#### 新增函数声明

```solidity
function requestEarlyUnstake(uint256 positionId) external;
function completeEarlyUnstake(uint256 positionId) external;
function getUserTotalRewards(address user) external view returns (uint256 totalClaimed, uint256 totalPending, uint256 totalRewards);
function getPositionRewardInfo(uint256 positionId) external view returns (uint256 claimedReward, uint256 pendingRewardAmount, uint256 totalReward, address owner);
```

#### 新增事件

```solidity
event EarlyUnstakeRequested(
    address indexed user,
    uint256 indexed positionId,
    uint256 timestamp
);

event EarlyUnstakeCompleted(
    address indexed user,
    uint256 indexed positionId,
    uint256 principal,
    uint256 reward,
    uint256 penalty,
    uint256 timestamp
);

event PenaltyPoolDistributed(
    address indexed user,
    uint256 amount,
    uint256 timestamp
);
```

### 4. 核心合约变更 (`HSKStaking.sol`)

#### 新增函数

##### `requestEarlyUnstake(uint256 positionId)`

**功能**: 申请提前解除质押

**要求**:
- 必须是位置所有者
- 位置未解除质押
- 必须在锁定期内（`block.timestamp < position.stakedAt + LOCK_PERIOD`）
- 不能重复申请

**效果**:
- 记录申请时间戳到 `earlyUnstakeRequestTime[positionId]`
- **从申请时刻起，收益计算停止，不能再领取收益**
- 触发 `EarlyUnstakeRequested` 事件

**重要说明**:
- 申请提前解除后，`claimReward()` 将失败（抛出 `EarlyUnstakeRequested` 错误）
- 收益计算到申请时间，等待的7天不产生收益

##### `completeEarlyUnstake(uint256 positionId)`

**功能**: 完成提前解除质押（7天等待期后）

**要求**:
- 必须是位置所有者
- 位置未解除质押
- 已申请提前退出（`earlyUnstakeRequestTime[positionId] > 0`）
- 等待期已过（`block.timestamp >= requestTime + EARLY_UNLOCK_PERIOD`）

**逻辑**:
1. **计算总收益（基于实际质押时间，但只计算到申请提前解除的时间）**
   - 收益计算到 `requestTime`（申请时间），而不是 `block.timestamp`（完成时间）
   - 等待的7天不产生收益
2. 计算应得收益（50%）
3. 计算已领取收益（`claimedRewards[positionId]`）
4. 如果已领取 > 应得，从本金扣除超出部分
5. 计算罚没金额（总收益的50%）
6. 将罚没金额从未领取收益转移到罚没池
7. **自动领取罚没池份额**（如果还未领取）
8. 返回本金 + 应得收益（扣除已领取部分）+ 罚没池份额

**收益计算示例**:
```
假设：
- 质押金额: 100 HSK
- Day 0: 质押
- Day 60: 申请提前解除质押（requestEarlyUnstake）
- Day 67: 完成提前解除质押（completeEarlyUnstake，等待7天）
- 年化收益率: 5%

收益计算：
- 总收益: 100 * 0.05 * (60/365) = 0.822 HSK（只计算到Day 60）
- 注意：Day 60-67 这7天不产生收益
- 应得收益: 0.822 / 2 = 0.411 HSK
- 已领取收益: 0.3 HSK（假设在Day 60之前领取过）
- 罚没金额: 0.411 HSK

返还金额:
- 本金: 100 HSK
- 奖励返还: 0.411 - 0.3 = 0.111 HSK
- 罚没池份额: 假设 10 HSK（来自其他用户的罚没）
- 总计: 100 + 0.111 + 10 = 110.111 HSK

罚没池增加: 0.411 HSK
```

##### `getUserTotalRewards(address user) → (uint256 totalClaimed, uint256 totalPending, uint256 totalRewards)`

**功能**: 查询指定用户的总收益（已领取 + 待领取）

**要求**:
- 任何人都可以调用（view函数）

**返回**:
- `totalClaimed`: 所有位置的已领取收益总和
- `totalPending`: 所有活跃位置的待领取收益总和
- `totalRewards`: 总收益（claimed + pending）

**用途**: 用于统计用户的总收益

##### `getPositionRewardInfo(uint256 positionId) → (uint256 claimedReward, uint256 pendingRewardAmount, uint256 totalReward, address owner)`

**功能**: 查询指定位置的收益信息

**要求**:
- 任何人都可以调用（view函数）

**返回**:
- `claimedReward`: 该位置的已领取收益
- `pendingRewardAmount`: 该位置的待领取收益
- `totalReward`: 总收益（claimed + pending）
- `owner`: 位置所有者

**用途**: 用于查询单个位置的收益信息，任何人都可以调用

### 罚没池分配机制

**重要变更**: 罚没池不再通过外部函数分配，而是在以下时机自动领取：

1. **在 `claimReward()` 时自动领取**
   - 用户领取收益时，自动计算并领取该位置的罚没池份额
   - 如果已领取过，跳过

2. **在 `completeEarlyUnstake()` 时自动领取**
   - 用户完成提前解除质押时，自动领取罚没池份额
   - 确保即使从未调用过 `claimReward()` 的用户也能获得罚没池份额

**分配规则**:
- **按每个位置独立计算，不合并计算**
- 计算公式：`positionShare = (penaltyPoolBalance * position.amount) / totalStaked`
- 每个位置只能领取一次罚没池份额
- 如果用户有多个位置，每个位置独立领取

**示例**:
```
罚没池：1000 HSK，总质押：10000 HSK
用户A有2个位置：
- 位置1(1000 HSK)，份额 = 1000 * 1000 / 10000 = 100 HSK
- 位置2(2000 HSK)，份额 = 1000 * 2000 / 10000 = 200 HSK
用户A在 claimReward 或 completeEarlyUnstake 时会自动领取对应位置的份额
```

**关于提前解除质押的惩罚计算**:
- 用户提前解除质押时，惩罚基于**该用户自己的收益**计算
- **不考虑已领取的 penaltyPool**（那是其他用户的罚没，不是该用户的收益）
- 示例：
  - userA 提前解除质押 → 50%收益进入 penaltyPool
  - userB 领取奖励（自动领取 penaltyPool 份额）
  - userB 之后也提前解除质押 → 惩罚基于 userB 自己的收益计算，与已领取的 penaltyPool 无关

#### 修改现有函数

##### `claimReward(uint256 positionId)`

**变更**: 
1. 记录已领取的收益总额
2. 自动领取罚没池份额
3. 禁止在申请提前解除后领取收益

```solidity
// 新增检查：如果已申请提前解除，不能再领取收益
uint256 requestTime = earlyUnstakeRequestTime[positionId];
if (requestTime > 0) {
    revert EarlyUnstakeRequested();
}

// 记录已领取的收益总额
claimedRewards[positionId] += reward;

// 自动领取罚没池份额（如果还未领取）
uint256 penaltyShare = _claimPenaltyPoolInternal(positionId);

// 发送正常奖励 + 罚没池份额
uint256 totalToSend = reward + penaltyShare;
```

**影响**: 
- 每次领取奖励时，累计记录到 `claimedRewards[positionId]`
- 自动领取罚没池份额（如果还未领取）
- 如果已申请提前解除，不能再领取收益
- 用于在提前退出时计算是否需要从本金扣除

## 脚本变更

### 新增脚本文件

1. **`scripts/staking/request-early-unstake.ts`**
   - 申请提前解除质押
   - 用法: `POSITION_ID=1 npm run request-early-unstake:testnet`

2. **`scripts/staking/complete-early-unstake.ts`**
   - 完成提前解除质押（7天后）
   - 用法: `POSITION_ID=1 npm run complete-early-unstake:testnet`

3. **`scripts/staking/query/statistics.ts`**
   - 统计所有用户的收益
   - 用法: `npm run query:statistics:testnet`
   - 功能：遍历所有位置，按用户聚合收益，显示Top 20用户和总体统计

**注意**: `distribute-penalty-pool.ts` 脚本已不再需要，因为罚没池现在自动分配

## 测试变更

### 新增测试文件

**`test/staking/early-unstaking.test.ts`**

测试场景覆盖：
- ✅ 申请提前退出
- ✅ 7天后完成提前退出
- ✅ 收益罚没计算（50%）
- ✅ 已领取收益从本金扣除
- ✅ 罚没池自动分配（在claimReward和completeEarlyUnstake时）
- ✅ 收益计算到申请时间（不是完成时间）
- ✅ 申请后不能再领取收益
- ✅ 边界条件（已领取超过应得、罚没池为空等）
- ✅ 重复申请检查
- ✅ 等待期检查
- ✅ 两种情况收益一致性（提前领取 vs 不提前领取）

## 使用示例

### 用户提前退出流程

```typescript
// 1. 申请提前退出（收益计算停止）
await staking.requestEarlyUnstake(positionId);
// 注意：申请后不能再调用 claimReward()

// 2. 等待7天（这7天不产生收益）
await advanceTime(7 * 24 * 60 * 60);

// 3. 完成提前退出（自动领取罚没池份额）
await staking.completeEarlyUnstake(positionId);
```

### 查询用户收益

```typescript
// 查询用户总收益
const [claimed, pending, total] = await staking.getUserTotalRewards(userAddress);

// 查询单个位置的收益信息
const rewardInfo = await staking.getPositionRewardInfo(positionId);
```

### 罚没池自动分配

```typescript
// 罚没池在以下时机自动领取，无需手动操作：
// 1. 用户调用 claimReward() 时
await staking.claimReward(positionId); // 自动领取罚没池份额

// 2. 用户完成提前解除质押时
await staking.completeEarlyUnstake(positionId); // 自动领取罚没池份额
```

## 影响评估

### 向后兼容性

- ✅ **完全向后兼容**: 不影响现有质押和正常解除质押流程
- ✅ **存储兼容**: 使用预留存储槽，不影响现有数据
- ✅ **接口兼容**: 新增函数和事件，不修改现有接口

### 升级要求

- ⚠️ **需要合约升级**: 已部署的合约需要通过代理升级来添加此功能
- ⚠️ **存储布局检查**: 升级前需要验证存储布局兼容性

### Gas消耗

- `requestEarlyUnstake`: ~50,000 gas
- `completeEarlyUnstake`: ~150,000 gas（取决于计算复杂度）
- `claimReward`: ~80,000 gas（包括自动领取罚没池份额）
- `getUserTotalRewards`: view函数，无gas消耗（链下调用）
- `getPositionRewardInfo`: view函数，无gas消耗（链下调用）

**注意**: 罚没池现在自动分配，不再需要一次性分配函数，避免了gas消耗过高的问题

## 安全考虑

### 1. 重入攻击防护

所有新函数都使用 `nonReentrant` 修饰符，防止重入攻击。

### 2. 精度处理

- 使用整数运算避免浮点数精度问题
- 罚没计算使用整数除法，可能产生1 wei的精度损失（可接受）

### 3. 边界条件

- 检查已领取收益是否超过应得收益
- 检查本金是否足够扣除超出部分
- 检查罚没池余额是否充足

## 已知限制

1. **精度损失**: 由于整数除法，罚没池分配可能存在1 wei的精度损失（可接受）。

2. **收益计算停止**: 申请提前解除后，收益计算立即停止，等待的7天不产生收益。这是设计行为，确保用户不能通过延迟完成来获得额外收益。

3. **罚没池余额**: 如果用户从未调用过 `claimReward()` 或 `completeEarlyUnstake()`，罚没池份额会一直保留在合约中，直到用户操作时自动领取。

## 部署检查清单

### 升级前

- [ ] 验证新实现合约的存储布局兼容性
- [ ] 运行所有测试用例
- [ ] 代码审查完成
- [ ] 测试网部署和验证

### 升级后

- [ ] 验证新函数可正常调用
- [ ] 验证现有功能不受影响
- [ ] 验证事件正确触发
- [ ] 验证存储变量正确初始化

## 相关文档

- [产品计划文档](./PRODUCT_PLANS_DEV.zh.md)
- [前端集成指南](./FRONTEND_GUIDE.md)
- [技术FAQ](./TECHNICAL_FAQ.md)

## 版本历史

- **v2.1.0** (2024): 添加提前解除质押功能
  - 新增 `requestEarlyUnstake()` 函数 - 申请提前解除质押
  - 新增 `completeEarlyUnstake()` 函数 - 完成提前解除质押（7天后）
  - 新增 `getUserTotalRewards()` 函数 - 查询用户总收益
  - 新增 `getPositionRewardInfo()` 函数 - 查询位置收益信息
  - 修改 `claimReward()` 函数：
    - 记录已领取收益
    - 自动领取罚没池份额
    - 禁止在申请提前解除后领取收益
  - 修改 `completeEarlyUnstake()` 函数：
    - 收益计算到申请时间（不是完成时间）
    - 自动领取罚没池份额
  - 修改 `_calculateTimeElapsed()` 函数：
    - 如果已申请提前解除，收益计算到申请时间
  - 新增相关事件和存储变量
  - 新增统计脚本 `scripts/staking/query/statistics.ts`

## 关键设计决策

### 1. 收益计算到申请时间

**设计**: 收益计算到申请提前解除的时间，而不是完成提前解除的时间

**原因**: 
- 防止用户通过延迟完成来获得额外收益
- 确保公平性：申请后收益立即停止

**实现**: 
- `_calculateTimeElapsed()` 检查 `earlyUnstakeRequestTime`
- 如果已申请，使用申请时间作为结束时间

### 2. 罚没池自动分配

**设计**: 罚没池在 `claimReward()` 和 `completeEarlyUnstake()` 时自动领取

**原因**:
- 用户体验好，无需等待管理员操作
- 实时分配，用户随时可以领取
- 避免在 stakeEndTime 后一次性分配的问题（用户可能还在质押中）
- 避免gas消耗过高的问题

**实现**: 
- `_claimPenaltyPoolInternal()` 内部函数处理共同逻辑
- `claimReward()` 和 `completeEarlyUnstake()` 都调用此函数

### 3. 申请后禁止领取收益

**设计**: 申请提前解除后，不能再调用 `claimReward()`

**原因**:
- 收益计算已停止，不应该再领取
- 简化逻辑，避免状态不一致

**实现**: 
- `claimReward()` 检查 `earlyUnstakeRequestTime`
- 如果已申请，抛出 `EarlyUnstakeRequested` 错误
