# 提前解除质押功能修改文档


## 概述

本次更新添加了提前解除质押功能，允许用户在锁定期内提前退出质押，但需要承担50%的收益罚没。罚没的收益将进入罚没池，按每个位置的持仓比例自动分配给用户（在领取收益或完成提前解除时自动领取）。

## 功能特性

### 1. 提前解除质押流程

- **申请阶段**: 用户可以在锁定期内申请提前解除质押
- **等待期**: 申请后需要等待7天才能完成提前解除
- **收益停止**: 申请提前解除后，收益计算停止，不能再领取收益
- **收益计算**: 收益计算到申请提前解除的时间，而不是完成提前解除的时间
- **收益罚没**: 提前退出将丧失50%的收益（用户获得50%，50%进入罚没池），罚没比例由 `EARLY_UNSTAKE_PENALTY_RATE` 常量定义（默认5000 basis points = 50%）
- **本金扣除**: 如果用户已经提前领取的收益超过应得的50%，超出部分将从本金中扣除

### 2. 罚没池分配

- **分配时机**: 在用户 `claimReward()` 或 `completeEarlyUnstake()` 时自动领取
- **分配方式**: 按每个位置独立计算，根据该位置的持仓金额占比分配
- **分配条件**: 支持多次领取，每次领取新增的罚没池份额（增量部分）
- **自动领取**: 无需管理员操作，用户领取收益时自动获得罚没池份额

## 合约变更详情

### 1. 存储层变更 (`StakingStorage.sol`)

#### 新增存储变量

```solidity
uint256 public penaltyPoolBalance;           // 罚没池余额
mapping(uint256 => uint256) public claimedRewards;  // positionId => 已领取的收益总额
    mapping(uint256 => uint256) public earlyUnstakeRequestTime;  // positionId => 提前退出申请时间（0表示未申请）
    mapping(uint256 => uint256) public penaltyPoolClaimed;  // positionId => 已领取的罚没池份额累计金额
    mapping(uint256 => uint256) public penaltyPoolSnapshotTotalStaked;  // positionId => 首次领取时的totalStaked快照（0表示未领取过）
```

### 2. 常量定义变更 (`StakingConstants.sol`)

#### 新增常量

```solidity
uint256 public constant EARLY_UNLOCK_PERIOD = 7 days;  // 提前解锁等待期
uint256 public constant EARLY_UNSTAKE_PENALTY_RATE = 5000;  // 提前解除质押罚没比例（50% = 5000 basis points）
```

### 3. 接口变更 (`IStaking.sol`)

#### 新增函数声明

```solidity
function requestEarlyUnstake(uint256 positionId) external;
function completeEarlyUnstake(uint256 positionId) external;
function getPositionRewardInfo(address user, uint256 positionId) external view returns (uint256 claimedReward, uint256 pendingRewardAmount, uint256 totalReward);
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
   - 使用 `_calculateTimeElapsed()` 函数，该函数会自动检查 `earlyUnstakeRequestTime` 并使用申请时间
2. 计算应得收益（使用 `EARLY_UNSTAKE_PENALTY_RATE` 常量，默认50%）
3. 计算已领取收益（`claimedRewards[positionId]`）
4. 如果已领取 > 应得，从本金扣除超出部分
5. 计算罚没金额（总收益 - 应得收益）
6. 将罚没金额从未领取收益转移到罚没池
7. **自动领取罚没池份额**（计算增量部分，支持多次领取）
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
- 应得收益: 0.822 * 5000 / 10000 = 0.411 HSK（50%）
- 已领取收益: 0.3 HSK（假设在Day 60之前领取过）
- 罚没金额: 0.822 - 0.411 = 0.411 HSK

返还金额:
- 本金: 100 HSK
- 奖励返还: 0.411 - 0.3 = 0.111 HSK
- 罚没池份额: 假设 10 HSK（来自其他用户的罚没）
- 总计: 100 + 0.111 + 10 = 110.111 HSK

罚没池增加: 0.411 HSK
```

##### `pendingReward(uint256 positionId) → uint256`

**功能**: 查询指定位置的待领取收益

**要求**:
- ✅ **任何人都可以调用**（view函数）
- 查询不需要任何权限验证
- 但只有位置所有者可以领取（通过 `claimReward` 函数）

**返回**:
- `reward`: 待领取收益

**用途**: 
- 前端可以查询任何位置的待领取收益
- 管理员可以查询任何用户的位置收益
- 用户查询自己的位置收益
- 如果需要查询位置所有者，可以通过 `positions[positionId].owner` 查询

##### `getPositionRewardInfo(address user, uint256 positionId) → (uint256 claimedReward, uint256 pendingRewardAmount, uint256 totalReward)`

**功能**: 查询指定位置的所有收益信息（已领取 + 待领取）

**要求**:
- ✅ **任何人都可以调用**（view函数）
- `user` 参数必须与该 position 的所有者匹配，用于验证查询的正确性
- 查询不需要任何权限验证
- 但只有位置所有者可以领取（通过 `claimReward` 函数）

**参数**:
- `user`: 用户地址（必须与 position.owner 匹配）
- `positionId`: 位置ID

**返回**:
- `claimedReward`: 该位置的已领取收益
- `pendingRewardAmount`: 该位置的待领取收益
- `totalReward`: 总收益（claimed + pending）

**用途**: 
- ✅ **管理员查询**：管理员可以查询任何用户的位置收益信息（传入正确的 user 地址）
- ✅ **用户查询**：用户可以查询自己的位置收益信息
- ✅ **前端查询**：前端可以查询任何位置的收益信息
- 一次调用获取所有收益信息，比分别调用 `pendingReward` 和 `claimedRewards` 更高效

**注意**: 
- 查询是公开的，任何人都可以查询
- 但领取需要权限：只有位置所有者可以调用 `claimReward` 来领取收益

### 罚没池分配机制

**重要变更**: 罚没池不再通过外部函数分配，而是在以下时机自动领取：

1. **在 `claimReward()` 时自动领取**
   - 用户领取收益时，自动计算并领取该位置的罚没池份额（增量部分）
   - 支持多次领取，每次都能领取新增的罚没池份额

2. **在 `completeEarlyUnstake()` 时自动领取**
   - 用户完成提前解除质押时，自动领取罚没池份额（增量部分）
   - 确保即使从未调用过 `claimReward()` 的用户也能获得罚没池份额
   - 如果之前已经领取过，会计算并领取新增的增量部分

**分配规则**:
- **按每个位置独立计算，不合并计算**
- **公平性保证**：每个位置在首次领取时记录 `totalStaked` 快照，使用快照值计算份额
- **多次领取支持**：用户可以多次调用 `claimReward()`，每次都能领取新增的罚没池份额
- 计算公式：
  - 首次领取：`currentTotalShare = (penaltyPoolBalance * position.amount) / snapshotTotalStaked`
  - 后续领取：`incrementalShare = currentTotalShare - penaltyPoolClaimed[positionId]`
- 每个位置使用首次领取时的 `totalStaked` 快照，确保公平性
- 如果用户有多个位置，每个位置独立领取
- **重要**：使用快照机制确保公平性，同时支持多次领取新增的罚没池份额

**为什么需要 `penaltyPoolSnapshotTotalStaked` 快照机制？**

### 核心问题：如何公平地分配罚没池？

想象一下，罚没池就像一个大蛋糕，需要按照每个人的"股份"来分配。

**关键概念**：
- **罚没池** = 蛋糕的总大小（会不断增长）
- **totalStaked** = 所有质押的总金额（会不断变化，因为有人解除质押）
- **你的质押金额** = 你的股份
- **你的份额比例** = 你的质押金额 / totalStaked

### 问题场景（不使用快照）：

```
初始状态（就像分蛋糕的规则）：
- 蛋糕（罚没池）：1000 HSK
- 总质押：10000 HSK
- 用户A：1000 HSK（占 10%，应得 100 HSK）
- 用户B：2000 HSK（占 20%，应得 200 HSK）

时刻T1：用户A来领取
- 当前规则：totalStaked = 10000
- A的份额 = 1000 / 10000 = 10%
- A领取 = 1000 * 10% = 100 HSK ✅

时刻T2：用户C提前解除质押（拿走3000 HSK）
- 总质押变成：7000 HSK（减少了！）
- 蛋糕还剩：900 HSK

时刻T3：用户B来领取
- 当前规则：totalStaked = 7000（变小了！）
- B的份额 = 2000 / 7000 = 28.57%（变大了！）
- B领取 = 900 * 28.57% = 257.14 HSK ❌

问题：B本来应该得200 HSK，但因为totalStaked变小了，B的"股份比例"变大了，所以得了257 HSK，不公平！
```

**问题根源**：`totalStaked` 会变化，如果每次都使用"当前"的 `totalStaked` 计算，后领取的人会因为分母变小而获得更多份额。

### 解决方案（使用快照）：

**核心思想**：每个位置在"第一次领取时"拍一张快照，记录当时的 `totalStaked`，以后都用这个快照值来计算份额。

```
初始状态：
- 蛋糕（罚没池）：1000 HSK
- 总质押：10000 HSK
- 用户A：1000 HSK
- 用户B：2000 HSK

时刻T1：用户A第一次领取
- 📸 拍快照：snapshotTotalStaked[1] = 10000（记录下这个时刻的totalStaked）
- A的份额比例 = 1000 / 10000 = 10%（固定不变）
- A领取 = 1000 * 10% = 100 HSK ✅
- 记录：penaltyPoolClaimed[1] = 100（已领取100）

时刻T2：用户C提前解除质押（拿走3000 HSK），并增加500 HSK到罚没池
- 蛋糕变成：1400 HSK（新增了500）
- 总质押变成：7000 HSK（但A的快照还是10000！）

时刻T3：用户A第二次领取（领取新增的500 HSK）
- 📸 使用快照：snapshotTotalStaked[1] = 10000（不变，还是第一次的快照）
- A的份额比例 = 1000 / 10000 = 10%（还是10%，不会变）
- 当前应得总额 = 1400 * 10% = 140 HSK
- 已领取 = 100 HSK
- 本次领取 = 140 - 100 = 40 HSK ✅（新增500中的40，比例正确）

时刻T4：用户B第一次领取
- 📸 拍快照：snapshotTotalStaked[2] = 7000（B领取时的totalStaked）
- B的份额比例 = 2000 / 7000 = 28.57%（固定不变）
- B领取 = 1360 * 28.57% = 388.57 HSK ✅
```

### 快照机制的作用（简单理解）：

1. **📸 拍快照**：每个位置第一次领取时，记录当时的 `totalStaked` 值
2. **🔒 固定比例**：以后都用这个快照值计算份额比例，不会因为 `totalStaked` 变化而改变
3. **➕ 支持增量**：每次领取时，计算"当前应得总额 - 已领取金额 = 本次可领取"
4. **🎯 确保公平**：每个位置的比例基准是固定的，不会因为别人解除质押而改变

### 为什么每个位置要记录自己的快照？

因为不同位置可能在不同时间首次领取：
- 位置A在 `totalStaked = 10000` 时首次领取 → 快照 = 10000
- 位置B在 `totalStaked = 7000` 时首次领取 → 快照 = 7000

每个位置用自己的快照，确保公平性。

### 代码中的实现：

```solidity
// 首次领取时，记录快照
if (snapshotTotalStaked == 0) {
    snapshotTotalStaked = totalStaked;  // 📸 拍快照
    penaltyPoolSnapshotTotalStaked[positionId] = snapshotTotalStaked;
}

// 以后都用快照值计算（不会用当前的totalStaked）
uint256 currentTotalShare = (penaltyPoolBalance * position.amount) / snapshotTotalStaked;
```

**示例**:
```
初始状态：
- 罚没池：1000 HSK
- 总质押：10000 HSK
- 用户A位置1：1000 HSK

时刻T1：用户A第一次 claimReward
- 记录快照：snapshotTotalStaked[1] = 10000
- 应得份额 = 1000 * 1000 / 10000 = 100 HSK
- 领取：100 HSK
- penaltyPoolClaimed[1] = 100
- penaltyPoolBalance = 900 HSK

时刻T2：用户B提前解除，增加500 HSK到罚没池
- penaltyPoolBalance = 1400 HSK
- totalStaked = 8000 HSK（假设B质押了2000 HSK）

时刻T3：用户A第二次 claimReward
- 使用快照：snapshotTotalStaked[1] = 10000（不变）
- 当前应得份额 = 1400 * 1000 / 10000 = 140 HSK
- 已领取：100 HSK
- 增量份额 = 140 - 100 = 40 HSK
- 领取：40 HSK
- penaltyPoolClaimed[1] = 140
- penaltyPoolBalance = 1360 HSK
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

// 自动领取罚没池份额（计算增量部分，支持多次领取）
uint256 penaltyShare = _claimPenaltyPoolInternal(positionId);

// 发送正常奖励 + 罚没池份额
uint256 totalToSend = reward + penaltyShare;
```

**影响**: 
- 每次领取奖励时，累计记录到 `claimedRewards[positionId]`
- 自动领取罚没池份额（计算增量部分，支持多次领取）
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

## 质押位置状态说明

### 状态定义

一条质押位置（Position）有以下几种状态，这些状态可以组合：

#### 1. 基础状态（Position 结构体）

**`isUnstaked: bool`**
- `false`: 活跃状态（未解除质押）
- `true`: 已解除质押状态

#### 2. 提前解除质押相关状态

**`earlyUnstakeRequestTime[positionId]: uint256`**
- `0`: 未申请提前解除质押
- `> 0`: 已申请提前解除质押（值为申请时间戳）

#### 3. 收益领取相关状态

**`claimedRewards[positionId]: uint256`**
- `0`: 未领取过收益
- `> 0`: 已领取的收益总额（累计值）

**`penaltyPoolClaimed[positionId]: uint256`**
- `0`: 未领取过罚没池份额
- `> 0`: 已领取的罚没池份额累计金额

**`penaltyPoolSnapshotTotalStaked[positionId]: uint256`**
- `0`: 未领取过罚没池份额
- `> 0`: 首次领取时的 `totalStaked` 快照（用于公平计算份额，后续领取时保持不变）

**字段意义**：
- 该字段用于解决罚没池分配中的公平性问题
- 每个位置在首次领取时记录 `totalStaked` 快照，作为该位置的比例基准
- 后续所有领取都使用这个快照值计算份额，确保不会因为 `totalStaked` 变化而影响公平性
- 例如：如果位置在 `totalStaked = 10000` 时首次领取，那么后续即使 `totalStaked` 变为 `7000`，该位置仍然使用 `10000` 作为基准计算份额

#### 4. 时间相关状态

**`stakedAt: uint256`**
- 质押时间戳

**`lastRewardAt: uint256`**
- 上次领取奖励的时间戳

**锁定期状态（计算得出）**
- `block.timestamp < stakedAt + LOCK_PERIOD`: 锁定期内
- `block.timestamp >= stakedAt + LOCK_PERIOD`: 锁定期已结束

### 完整状态组合

一条质押位置的所有可能状态组合：

#### 状态1：正常质押中（未申请提前解除）
```
isUnstaked = false
earlyUnstakeRequestTime = 0
claimedRewards >= 0
penaltyPoolClaimed >= 0（累计已领取的罚没池份额）
penaltyPoolSnapshotTotalStaked = 0 或 > 0（0表示未领取过，>0表示首次领取时的快照）
锁定期：可能在内或已结束
```
**可执行操作**：
- ✅ 领取收益 (`claimReward`)
- ✅ 申请提前解除质押 (`requestEarlyUnstake`)
- ✅ 正常解除质押 (`unstake`) - 如果锁定期已结束

#### 状态2：已申请提前解除，等待7天
```
isUnstaked = false
earlyUnstakeRequestTime > 0
claimedRewards >= 0
penaltyPoolClaimed >= 0（累计已领取的罚没池份额）
penaltyPoolSnapshotTotalStaked = 0 或 > 0（0表示未领取过，>0表示首次领取时的快照）
锁定期：在锁定期内
等待期：block.timestamp < requestTime + 7 days
```
**可执行操作**：
- ❌ 不能再领取收益（申请后收益停止计算）
- ❌ 不能重复申请提前解除
- ❌ 不能完成提前解除（等待期未过）
- ✅ 等待7天后可以完成提前解除 (`completeEarlyUnstake`)

#### 状态3：已申请提前解除，等待期已过
```
isUnstaked = false
earlyUnstakeRequestTime > 0
claimedRewards >= 0
penaltyPoolClaimed >= 0（累计已领取的罚没池份额）
penaltyPoolSnapshotTotalStaked = 0 或 > 0（0表示未领取过，>0表示首次领取时的快照）
锁定期：在锁定期内
等待期：block.timestamp >= requestTime + 7 days
```
**可执行操作**：
- ✅ 完成提前解除质押 (`completeEarlyUnstake`)

#### 状态4：正常解除质押（锁定期结束后）
```
isUnstaked = true
earlyUnstakeRequestTime = 0 或 > 0（如果之前申请过）
claimedRewards >= 0
penaltyPoolClaimed >= 0（累计已领取的罚没池份额）
penaltyPoolSnapshotTotalStaked = 0 或 > 0（0表示未领取过，>0表示首次领取时的快照）
锁定期：已结束
```
**可执行操作**：
- ❌ 所有操作都不可用（位置已解除质押）

#### 状态5：提前解除质押完成
```
isUnstaked = true
earlyUnstakeRequestTime > 0
claimedRewards >= 0
penaltyPoolClaimed >= 0（累计已领取的罚没池份额，可能在解除时领取）
penaltyPoolSnapshotTotalStaked = 0 或 > 0（0表示未领取过，>0表示首次领取时的快照）
锁定期：在锁定期内（提前解除）
```
**可执行操作**：
- ❌ 所有操作都不可用（位置已解除质押）

### 状态转换图

```
创建质押
   ↓
[状态1: 正常质押中]
   ├─→ [状态2: 申请提前解除，等待7天]
   │       ↓ (7天后)
   │   [状态3: 等待期已过]
   │       ↓ (completeEarlyUnstake)
   │   [状态5: 提前解除完成]
   │
   └─→ (锁定期结束) → [状态4: 正常解除质押]
           ↓ (unstake)
       [状态4: 正常解除质押]
```

### 状态查询方法

#### 查询位置基础信息
```solidity
Position memory position = positions[positionId];
// position.isUnstaked
// position.stakedAt
// position.lastRewardAt
```

#### 查询提前解除质押状态
```solidity
uint256 requestTime = earlyUnstakeRequestTime[positionId];
bool hasRequested = requestTime > 0;
bool canComplete = block.timestamp >= requestTime + EARLY_UNLOCK_PERIOD;
```

#### 查询收益状态
```solidity
uint256 claimed = claimedRewards[positionId];
uint256 penaltyClaimed = penaltyPoolClaimed[positionId];  // 累计已领取的罚没池份额
uint256 penaltySnapshot = penaltyPoolSnapshotTotalStaked[positionId];  // 首次领取时的快照
bool hasClaimedPenalty = penaltySnapshot > 0;  // >0 表示已领取过
uint256 pending = pendingReward(positionId);
```

#### 查询锁定期状态
```solidity
uint256 lockEndTime = position.stakedAt + LOCK_PERIOD;
bool isLocked = block.timestamp < lockEndTime;
```

### 状态判断逻辑

#### 判断位置是否活跃
```solidity
bool isActive = !position.isUnstaked;
```

#### 判断是否可以领取收益
```solidity
bool canClaimReward = 
    !position.isUnstaked && 
    earlyUnstakeRequestTime[positionId] == 0 &&
    !emergencyMode &&
    !paused();
```

#### 判断是否可以申请提前解除
```solidity
bool canRequestEarlyUnstake = 
    !position.isUnstaked &&
    block.timestamp < position.stakedAt + LOCK_PERIOD &&
    earlyUnstakeRequestTime[positionId] == 0;
```

#### 判断是否可以完成提前解除
```solidity
uint256 requestTime = earlyUnstakeRequestTime[positionId];
bool canCompleteEarlyUnstake = 
    !position.isUnstaked &&
    requestTime > 0 &&
    block.timestamp >= requestTime + EARLY_UNLOCK_PERIOD;
```

#### 判断是否可以正常解除质押
```solidity
bool canUnstake = 
    !position.isUnstaked &&
    block.timestamp >= position.stakedAt + LOCK_PERIOD;
```

### 状态总结

一条质押位置主要有以下状态维度：

1. **质押状态**：活跃 / 已解除
2. **提前解除状态**：未申请 / 已申请等待中 / 可完成
3. **收益状态**：未领取 / 部分领取 / 全部领取
4. **罚没池状态**：未领取 / 已领取
5. **锁定期状态**：锁定期内 / 锁定期已结束

这些状态可以组合成多种情况，但主要的状态转换路径是：
- 正常质押 → 正常解除
- 正常质押 → 申请提前解除 → 完成提前解除

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

### 查询位置收益信息

```typescript
// 查询用户的位置收益信息（需要提供用户地址和位置ID）
const rewardInfo = await staking.getPositionRewardInfo(userAddress, positionId);
// rewardInfo.claimedReward - 已领取收益
// rewardInfo.pendingRewardAmount - 待领取收益
// rewardInfo.totalReward - 总收益

// 注意：如果 positionId 不属于 userAddress，函数会 revert

### 罚没池自动分配

```typescript
// 罚没池在以下时机自动领取，无需手动操作：
// 1. 用户调用 claimReward() 时（每次领取增量部分）
await staking.claimReward(positionId); // 自动领取罚没池份额（增量部分）

// 2. 用户完成提前解除质押时（每次领取增量部分）
await staking.completeEarlyUnstake(positionId); // 自动领取罚没池份额（增量部分）

// 注意：支持多次领取，每次都能领取新增的罚没池份额
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
  - 新增 `getPositionRewardInfo()` 函数 - 查询单个位置的收益信息
  - 修改 `claimReward()` 函数：
    - 记录已领取收益
    - 自动领取罚没池份额
    - 禁止在申请提前解除后领取收益
  - 修改 `completeEarlyUnstake()` 函数：
    - 收益计算到申请时间（不是完成时间）
    - 自动领取罚没池份额
  - 修改 `_calculateTimeElapsed()` 函数：
    - 如果已申请提前解除，收益计算到申请时间
    - 删除了 `_calculateTimeElapsedForEarlyUnstake()` 函数，合并到 `_calculateTimeElapsed()`
  - 新增常量 `EARLY_UNSTAKE_PENALTY_RATE`（50%罚没比例）
  - 优化罚没池转移逻辑，简化代码
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

### 4. 罚没池快照机制

**设计**: 使用 `penaltyPoolSnapshotTotalStaked` 记录每个位置首次领取时的 `totalStaked` 快照

**原因**:
- 确保公平性：所有位置使用固定的比例基准，不会因为后续 `totalStaked` 变化而影响分配
- 支持多次领取：用户可以多次调用 `claimReward()`，每次都能领取新增的罚没池份额
- 避免先领取的用户份额被锁定，后领取的用户获得更多份额的问题

**实现**: 
- `_claimPenaltyPoolInternal()` 在首次领取时记录 `totalStaked` 快照
- 后续所有领取都使用快照值计算份额：`currentTotalShare = (penaltyPoolBalance * position.amount) / snapshotTotalStaked`
- 计算增量份额：`incrementalShare = currentTotalShare - penaltyPoolClaimed[positionId]`

---

**文档维护者**: HashKey 技术团队  
**最后更新**: 2024

