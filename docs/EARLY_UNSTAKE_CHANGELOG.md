# 提前解除质押功能修改文档


## 概述

本次更新添加了提前解除质押功能，允许用户在锁定期内提前退出质押，但需要承担50%的收益罚没。罚没的收益将进入罚没池，按每个位置的持仓比例自动分配给用户（在领取收益或完成提前解除时自动领取）。

## 功能特性

### 1. 提前解除质押流程

- **申请阶段**: 用户可以在锁定期内申请提前解除质押
- **等待期**: 申请后需要等待7天才能完成提前解除
- **收益停止**: 申请提前解除后，收益计算停止（`completeEarlyUnstake()` 会基于申请时间计算收益）
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
```

**注意**: `isCompletedStake` 字段已合并到 `Position` 结构体中，不再使用独立的 mapping。

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
function distributePenaltyPool(uint256[] calldata positionIds) external;  // 管理员手动分配罚没池
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
- **从申请时刻起，收益计算停止**（`completeEarlyUnstake()` 会基于申请时间计算收益）
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
   - **直接计算时间**：不依赖 `_calculateTimeElapsed()`，在函数内部直接计算
   - 计算公式：`endTime = requestTime < lockEndTime ? requestTime : lockEndTime`
   - `timeElapsed = endTime > position.lastRewardAt ? endTime - position.lastRewardAt : 0`
2. 计算应得收益（使用 `EARLY_UNSTAKE_PENALTY_RATE` 常量，默认50%）
3. 计算已领取收益（`claimedRewards[positionId]`）
4. 如果已领取 > 应得，从本金扣除超出部分
5. 计算罚没金额（总收益 - 应得收益）
6. 将罚没金额从未领取收益转移到罚没池
7. 返回本金 + 应得收益（扣除已领取部分）
8. **注意**：提前解除质押的位置不会获得罚没池分配（只有完整质押周期的位置才能获得）

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
- 总计: 100 + 0.111 = 100.111 HSK

罚没池增加: 0.411 HSK（由管理员后续分配给完整质押用户）
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

### 罚没池分配机制

**重要变更**: 罚没池改为管理员手动分配机制，在质押周期完成后由管理员调用接口进行分配。

1. **分配时机**: 质押周期完成后，由管理员手动调用分配接口
2. **分配对象**: 只分配给完成完整质押周期的用户（通过 `unstake()` 正常解除质押的位置）
3. **分配方式**: 根据 `penaltyPoolBalance` 和用户质押金额按比例分配
4. **合约接口**: 合约保留管理员分配接口，供线下调用

**分配规则**:
- **只给完整质押用户分配**：只有通过 `unstake()` 完成完整质押周期的位置才能获得罚没池分配
- **按质押金额比例分配**：根据每个位置的质押金额占所有完整质押位置总金额的比例进行分配
- **计算公式**：
  - 计算所有完整质押位置的总金额：`totalCompletedStaked`
  - 每个位置的份额：`share = (penaltyPoolBalance * position.amount) / totalCompletedStaked`
- **标记机制**：`unstake()` 时会标记该位置已完成完整质押周期，用于后续分配时的筛选

##### `distributePenaltyPool(uint256[] calldata positionIds)`

**功能**: 管理员手动分配罚没池（仅限完整质押周期的位置）

**要求**:
- 必须是合约所有者（管理员）
- 只能分配给完成完整质押周期的位置（通过 `unstake()` 正常解除质押）
- 质押周期必须已完成（`stakeEndTime` 已过）

**逻辑**:
1. 验证所有位置都已完成完整质押周期（`positions[positionId].isCompletedStake == true`）
2. 计算所有完整质押位置的总金额
3. 根据每个位置的质押金额比例分配罚没池
4. 将分配的金额发送给位置所有者
5. 更新罚没池余额

**分配示例**:
```
假设：
- 罚没池余额：1000 HSK
- 完整质押位置：
  - 位置1：1000 HSK（用户A）
  - 位置2：2000 HSK（用户B）
  - 位置3：2000 HSK（用户C）
- 总完整质押金额：5000 HSK

分配计算：
- 用户A份额 = 1000 * 1000 / 5000 = 200 HSK
- 用户B份额 = 1000 * 2000 / 5000 = 400 HSK
- 用户C份额 = 1000 * 2000 / 5000 = 400 HSK
- 总计：200 + 400 + 400 = 1000 HSK ✅
```

**注意**:
- 此函数由管理员在质押周期完成后手动调用
- 可以分批分配，支持传入多个位置ID数组
- 提前解除质押的位置不会参与分配

#### 修改现有函数

##### `claimReward(uint256 positionId)`

**变更**: 
1. 记录已领取的收益总额（用于提前退出时计算）
2. **移除自动领取罚没池份额**（改为管理员手动分配）

**变更内容**:
```solidity
// 记录已领取的收益总额（用于提前退出时计算）
claimedRewards[positionId] += reward;

// 发送正常奖励（不再自动领取罚没池份额）
(bool success, ) = msg.sender.call{value: reward}("");
require(success, "Reward transfer failed");
```

**影响**: 
- 每次领取奖励时，累计记录到 `claimedRewards[positionId]`（用于提前退出时计算）
- **罚没池份额由管理员在质押周期完成后手动分配**

##### `unstake(uint256 positionId)`

**变更**: 
1. 添加完整质押周期标记
2. 标记该位置已完成完整质押周期，用于后续罚没池分配

**逻辑**:
1. 验证锁定期已结束
2. 计算并发放收益
3. **标记该位置已完成完整质押周期**（`position.isCompletedStake = true`）
4. 返回本金 + 收益

**影响**: 
- 只有通过 `unstake()` 正常解除质押的位置才会被标记为完整质押
- 提前解除质押的位置不会被标记，不能参与罚没池分配
- 标记后的位置可以在质押周期完成后由管理员分配罚没池份额

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

**注意**: `distribute-penalty-pool.ts` 脚本需要更新，改为管理员手动分配接口，在质押周期完成后调用

## 测试变更

### 新增测试文件

**`test/staking/early-unstaking.test.ts`**

测试场景覆盖：
- ✅ 申请提前退出
- ✅ 7天后完成提前退出
- ✅ 收益罚没计算（50%）
- ✅ 已领取收益从本金扣除
- ✅ 完整质押标记（unstake时标记）
- ✅ 罚没池手动分配（管理员在质押周期完成后分配）
- ✅ 收益计算到申请时间（不是完成时间）
- ✅ 收益计算到申请时间（completeEarlyUnstake中直接计算）
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

**`isCompletedStake: bool`**
- `false`: 未完成完整质押周期（提前解除或未解除）
- `true`: 已完成完整质押周期（通过 `unstake()` 正常解除质押）

#### 2. 提前解除质押相关状态

**`earlyUnstakeRequestTime[positionId]: uint256`**
- `0`: 未申请提前解除质押
- `> 0`: 已申请提前解除质押（值为申请时间戳）

#### 3. 收益领取相关状态

**`claimedRewards[positionId]: uint256`**
- `0`: 未领取过收益
- `> 0`: 已领取的收益总额（累计值）

**注意**: `isCompletedStake` 字段已合并到 `Position` 结构体中，作为位置的一个属性，而不是独立的 mapping。

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
isCompletedStake = false
锁定期：可能在内或已结束
```
**可执行操作**：
- ✅ 领取收益 (`claimReward`)
- ✅ 申请提前解除质押 (`requestEarlyUnstake`)
- ✅ 正常解除质押 (`unstake`) - 如果锁定期已结束（解除后会标记 `isCompletedStake = true`）

#### 状态2：已申请提前解除，等待7天
```
isUnstaked = false
earlyUnstakeRequestTime > 0
claimedRewards >= 0
isCompletedStake = false（提前解除不会标记为完整质押）
锁定期：在锁定期内
等待期：block.timestamp < requestTime + 7 days
```
**可执行操作**：
- ⚠️ 可以领取收益，但收益计算到申请时间（`completeEarlyUnstake` 时会基于申请时间计算）
- ❌ 不能重复申请提前解除
- ❌ 不能完成提前解除（等待期未过）
- ✅ 等待7天后可以完成提前解除 (`completeEarlyUnstake`)

#### 状态3：已申请提前解除，等待期已过
```
isUnstaked = false
earlyUnstakeRequestTime > 0
claimedRewards >= 0
isCompletedStake = false（提前解除不会标记为完整质押）
锁定期：在锁定期内
等待期：block.timestamp >= requestTime + 7 days
```
**可执行操作**：
- ✅ 完成提前解除质押 (`completeEarlyUnstake`)

#### 状态4：正常解除质押（锁定期结束后）
```
isUnstaked = true
earlyUnstakeRequestTime = 0（正常解除不会申请提前解除）
claimedRewards >= 0
isCompletedStake = true（通过unstake正常解除，标记为完整质押）
锁定期：已结束
```
**可执行操作**：
- ❌ 所有操作都不可用（位置已解除质押）
- ✅ 可以参与罚没池分配（由管理员在质押周期完成后手动分配）

#### 状态5：提前解除质押完成
```
isUnstaked = true
earlyUnstakeRequestTime > 0
claimedRewards >= 0
isCompletedStake = false（提前解除不会标记为完整质押）
锁定期：在锁定期内（提前解除）
```
**可执行操作**：
- ❌ 所有操作都不可用（位置已解除质押）
- ❌ 不能参与罚没池分配（只有完整质押的位置才能获得分配）

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
Position memory position = positions[positionId];
uint256 claimed = claimedRewards[positionId];
uint256 pending = pendingReward(positionId);
bool isCompleted = position.isCompletedStake;  // 是否完成完整质押周期（从Position结构体中读取）
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
    !emergencyMode &&
    !paused();
// 注意：claimReward() 不检查提前解除状态，但 completeEarlyUnstake() 会基于申请时间计算收益
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
4. **完整质押标记**：未完成 / 已完成（只有完整质押的位置才能参与罚没池分配）
5. **锁定期状态**：锁定期内 / 锁定期已结束

这些状态可以组合成多种情况，但主要的状态转换路径是：
- 正常质押 → 正常解除
- 正常质押 → 申请提前解除 → 完成提前解除

## 使用示例

### 用户提前退出流程

```typescript
// 1. 申请提前退出
await staking.requestEarlyUnstake(positionId);
// 注意：申请后，completeEarlyUnstake() 会基于申请时间计算收益

// 2. 等待7天（这7天不产生收益）
await advanceTime(7 * 24 * 60 * 60);

// 3. 完成提前退出
await staking.completeEarlyUnstake(positionId);
// 注意：提前解除质押的位置不会获得罚没池分配
```

### 罚没池手动分配（管理员）

```typescript
// 质押周期完成后，管理员手动分配罚没池
// 只分配给完成完整质押周期的位置（通过unstake正常解除）

// 1. 正常解除质押（标记为完整质押）
await staking.unstake(positionId); // 会标记 isCompletedStake[positionId] = true

// 2. 等待质押周期结束（stakeEndTime已过）

// 3. 管理员调用分配接口（线下调用）
await staking.distributePenaltyPool([positionId1, positionId2, ...]); 
// 只分配给 isCompletedStake = true 的位置
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
- `claimReward`: ~60,000 gas（移除自动分配后gas消耗降低）
- `unstake`: ~80,000 gas（包括标记完整质押）
- `distributePenaltyPool`: ~100,000 gas（取决于分配的位置数量）

**注意**: 罚没池改为管理员手动分配，在质押周期完成后由管理员调用接口分配，避免gas消耗过高的问题

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

3. **罚没池分配**: 罚没池由管理员在质押周期完成后手动分配，只分配给完成完整质押周期的位置。

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
  - 修改 `claimReward()` 函数：
    - 记录已领取收益（用于提前退出时计算）
    - **移除自动领取罚没池份额**（改为管理员手动分配）
  - 修改 `unstake()` 函数：
    - 添加完整质押周期标记（`position.isCompletedStake = true`）
  - 修改 `completeEarlyUnstake()` 函数：
    - 收益计算到申请时间（不是完成时间），在函数内部直接计算时间
    - **移除自动领取罚没池份额**（提前解除不参与分配）
  - 新增常量 `EARLY_UNSTAKE_PENALTY_RATE`（50%罚没比例）
  - 优化罚没池转移逻辑，简化代码
  - 新增管理员分配接口 `distributePenaltyPool()` - 手动分配罚没池（只分配给完整质押位置）
  - 在 `Position` 结构体中新增字段 `isCompletedStake` - 标记完整质押周期（不再使用独立的 mapping）
  - 移除存储变量 `penaltyPoolClaimed` 和 `penaltyPoolSnapshotTotalStaked`（不再需要快照机制）
  - 新增相关事件和存储变量
  - 新增统计脚本 `scripts/staking/query/statistics.ts`

## 关键设计决策

### 1. 收益计算到申请时间

**设计**: 收益计算到申请提前解除的时间，而不是完成提前解除的时间

**原因**: 
- 防止用户通过延迟完成来获得额外收益
- 确保公平性：申请后收益立即停止

**实现**: 
- `completeEarlyUnstake()` 函数内部直接计算时间，基于 `requestTime` 计算收益
- 不依赖 `_calculateTimeElapsed()` 函数（该函数保持原始逻辑）

### 2. 罚没池手动分配

**设计**: 罚没池在质押周期完成后由管理员手动分配，只分配给完成完整质押周期的位置

**原因**:
- 确保公平性：只奖励完成完整质押周期的用户
- 避免提前解除质押的用户获得罚没池分配
- 管理员可以控制分配时机，在质押周期结束后统一分配
- 避免gas消耗过高的问题（分批分配）

**实现**: 
- `unstake()` 函数标记位置为完整质押（`isCompletedStake[positionId] = true`）
- `distributePenaltyPool()` 管理员函数只分配给标记为完整质押的位置
- 根据质押金额比例分配罚没池余额

### 3. 完整质押标记机制

**设计**: 使用 `isCompletedStake` 标记完成完整质押周期的位置

**原因**:
- 区分完整质押和提前解除质押的位置
- 确保只有完成完整质押周期的用户才能获得罚没池分配
- 公平性：提前解除质押的用户不应获得其他用户罚没的收益

**实现**: 
- `unstake()` 函数在正常解除质押时标记 `position.isCompletedStake = true`（字段在Position结构体中）
- `completeEarlyUnstake()` 不会标记（提前解除不视为完整质押）
- `distributePenaltyPool()` 只分配给 `position.isCompletedStake = true` 的位置

---

**文档维护者**: HashKey 技术团队  
**最后更新**: 2024

