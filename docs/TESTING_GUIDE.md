# Whale Staking 测试脚本使用指南

## 📋 目录

- [概述](#概述)
- [测试环境准备](#测试环境准备)
- [开发脚本](#开发脚本)
- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [功能测试脚本](#功能测试脚本)
- [测试场景示例](#测试场景示例)
- [测试最佳实践](#测试最佳实践)
- [常见问题](#常见问题)

---

## 概述

本文档提供了 Whale Staking 项目的完整测试脚本使用指南,包括:

- **开发脚本**: 编译、清理、测试运行等开发工具
- **单元测试**: 针对合约核心功能的独立测试
- **集成测试**: 跨模块的完整流程测试
- **功能测试脚本**: 实际场景下的功能验证脚本

### 测试覆盖范围

| 测试类型 | 覆盖内容 | 执行环境 |
|---------|---------|---------|
| 单元测试 | 合约核心函数、权限控制、边界条件 | 本地 Hardhat 网络 |
| 集成测试 | 部署、质押、白名单、升级等完整流程 | 本地 Hardhat 网络 |
| 功能测试 | 实际操作验证（质押、提取、查询等） | 测试网/主网 |
| 覆盖率测试 | 代码覆盖率分析 | 本地 Hardhat 网络 |

---

## 测试环境准备

### 1. 环境要求

```bash
# Node.js 版本
node --version  # >= 16.0.0

# 依赖安装
npm install

# 编译合约
npx hardhat compile
```

### 2. 配置环境变量

创建 `.env` 文件:

```env
# 私钥配置（测试用）
PRIVATE_KEY=your_private_key_here

# 合约地址（测试网）
NORMAL_STAKING_ADDRESS=0x...
PREMIUM_STAKING_ADDRESS=0x...

# 网络配置
NETWORK=testnet
```

### 3. 启动本地测试网络

```bash
# 启动本地 Hardhat 节点（保持运行）
npx hardhat node

# 在另一个终端运行测试
npx hardhat test --network localhost
```

---

## 开发脚本

### 1. 编译脚本

#### 标准编译

```bash
# 使用 Hardhat 编译
npm run compile

# 或使用自定义编译脚本
npm run compile:custom
```

#### 自定义编译脚本: `scripts/dev/compile.ts`

**功能**:
- 编译所有合约
- 生成 ABI 和字节码
- 生成 TypeScript 类型定义

**使用示例**:

```bash
npx hardhat run scripts/dev/compile.ts
```

**输出**:
```
==================================================
编译合约
==================================================
开始编译合约...

Compiled 15 Solidity files successfully

✅ 合约编译完成！

编译产物位置:
  - artifacts/
  - cache/
  - typechain-types/
```

### 2. 清理脚本

#### 标准清理

```bash
# 清理编译产物
npm run clean

# 或使用自定义清理脚本
npm run clean:custom
```

#### 自定义清理脚本: `scripts/dev/clean.ts`

**功能**:
- 删除 artifacts/ 目录
- 删除 cache/ 目录
- 删除 typechain-types/ 目录
- 删除测试覆盖率文件

**使用示例**:

```bash
npx hardhat run scripts/dev/clean.ts
```

**输出**:
```
==================================================
清理编译产物
==================================================
准备清理以下目录/文件:

  - artifacts
  - cache
  - typechain-types
  - coverage
  - coverage.json

开始清理...

  ✅ 已删除: artifacts
  ✅ 已删除: cache
  ✅ 已删除: typechain-types
  ⏭️  跳过: coverage (不存在)
  ⏭️  跳过: coverage.json (不存在)

清理完成: 3 个已删除, 2 个跳过
✅ 清理成功！
⚠️  提示: 运行 'npm run compile' 重新编译合约
```

### 3. 完整构建流程

```bash
# 清理 + 编译
npm run build
```

---

## 单元测试

### 1. 运行所有单元测试

```bash
# 运行所有测试
npm run test

# 只运行单元测试
npm run test:unit

# 使用 Hardhat 直接运行
npx hardhat test
```

### 2. 运行特定测试文件

```bash
# 运行 Normal Staking 测试
npx hardhat test scripts/test/unit/normal-staking.test.ts

# 运行 Premium Staking 测试
npx hardhat test scripts/test/unit/premium-staking.test.ts
```

### 3. 运行特定测试用例

```bash
# 使用 --grep 过滤测试用例
npx hardhat test --grep "质押功能"
npx hardhat test --grep "白名单"
```

### 4. 单元测试文件结构

**Normal Staking 测试**: `scripts/test/unit/normal-staking.test.ts`

```typescript
describe("Normal Staking 单元测试", function () {
  describe("部署", function () {
    it("应该正确部署合约", async function () { /* ... */ });
    it("应该正确初始化参数", async function () { /* ... */ });
  });

  describe("质押功能", function () {
    it("用户应该能够成功质押", async function () { /* ... */ });
    it("应该拒绝低于最小金额的质押", async function () { /* ... */ });
    it("应该在暂停时拒绝质押", async function () { /* ... */ });
  });

  describe("奖励功能", function () {
    it("应该正确计算奖励", async function () { /* ... */ });
    it("应该能够提取奖励", async function () { /* ... */ });
  });

  describe("解除质押", function () {
    it("锁定期结束后应该能够解除质押", async function () { /* ... */ });
    it("锁定期内应该拒绝解除质押", async function () { /* ... */ });
  });
});
```

**Premium Staking 测试**: `scripts/test/unit/premium-staking.test.ts`

```typescript
describe("Premium Staking 单元测试", function () {
  describe("白名单功能", function () {
    it("应该能够批量添加白名单", async function () { /* ... */ });
    it("应该能够批量移除白名单", async function () { /* ... */ });
    it("非白名单用户应该无法质押", async function () { /* ... */ });
  });

  describe("高级质押功能", function () {
    it("白名单用户应该能够质押", async function () { /* ... */ });
    it("应该拒绝低于最小金额的质押", async function () { /* ... */ });
  });

  describe("收益率验证", function () {
    it("应该使用正确的收益率（16%）", async function () { /* ... */ });
  });
});
```

---

## 集成测试

### 1. 运行所有集成测试

```bash
# 运行集成测试
npm run test:integration

# 使用 Hardhat 直接运行
npx hardhat test scripts/test/integration/**/*.ts
```

### 2. 运行特定集成测试

```bash
# 部署测试
npx hardhat test scripts/test/integration/deploy-test.ts

# 质押测试
npx hardhat test scripts/test/integration/stake-test.ts

# 白名单测试
npx hardhat test scripts/test/integration/whitelist-test.ts
```

### 3. 集成测试文件结构

#### 部署集成测试: `scripts/test/integration/deploy-test.ts`

**测试内容**:
- ✅ Normal Staking 部署
- ✅ Premium Staking 部署
- ✅ 初始化参数验证
- ✅ 白名单模式配置

**运行方式**:

```bash
npx hardhat test scripts/test/integration/deploy-test.ts
```

#### 质押集成测试: `scripts/test/integration/stake-test.ts`

**测试内容**:
- ✅ Normal Staking 用户质押流程
- ✅ Premium Staking 白名单用户质押流程
- ✅ 多用户并发质押
- ✅ 质押后查询验证

**运行方式**:

```bash
npx hardhat test scripts/test/integration/stake-test.ts
```

#### 白名单集成测试: `scripts/test/integration/whitelist-test.ts`

**测试内容**:
- ✅ 批量添加白名单
- ✅ 批量移除白名单
- ✅ 白名单模式切换
- ✅ 白名单权限验证

**运行方式**:

```bash
npx hardhat test scripts/test/integration/whitelist-test.ts
```

### 4. 完整测试套件

运行所有测试（单元测试 + 集成测试）:

```bash
# 使用自定义脚本（推荐）
npm run test:all

# 使用 Hardhat
npx hardhat test
```

**自定义测试脚本**: `scripts/dev/test-all.ts`

**输出示例**:

```
==================================================
运行所有测试
==================================================

▶️  单元测试 - 普通质押
--------------------------------------------------
  Normal Staking 单元测试
    部署
      ✓ 应该正确部署合约
      ✓ 应该正确初始化参数
    质押功能
      ✓ 用户应该能够成功质押
      ✓ 应该拒绝低于最小金额的质押

  4 passing (2s)

✅ 单元测试 - 普通质押 通过

▶️  单元测试 - 高级质押
--------------------------------------------------
  Premium Staking 单元测试
    白名单功能
      ✓ 应该能够批量添加白名单
      ✓ 应该能够批量移除白名单

  2 passing (1s)

✅ 单元测试 - 高级质押 通过

==================================================
测试结果汇总
==================================================
通过: 5 / 5
失败: 0 / 5

✅ 所有测试通过！
```

---

## 功能测试脚本

### 1. 部署测试

#### Normal Staking 部署

```bash
# 部署到测试网
npx hardhat run scripts/normal/deploy.ts --network hashkeyTestnet

# 部署到主网
npx hardhat run scripts/normal/deploy.ts --network hashkeyMainnet
```

**验证要点**:
- ✅ 合约地址生成
- ✅ 初始化参数正确
- ✅ 白名单模式关闭
- ✅ 最小质押金额为 1 HSK
- ✅ 年化收益率为 8%

#### Premium Staking 部署

```bash
# 部署到测试网
npx hardhat run scripts/premium/deploy.ts --network hashkeyTestnet
```

**验证要点**:
- ✅ 合约地址生成
- ✅ 初始化参数正确
- ✅ 白名单模式启用
- ✅ 最小质押金额为 500,000 HSK
- ✅ 年化收益率为 16%

### 2. 状态查询测试

#### Normal Staking 状态查询

```bash
# 查询合约状态
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-status.ts --network hashkeyTestnet
```

**输出示例**:

```
==================================================
普通质押合约状态查询
==================================================
合约地址: 0x1234567890abcdef...

合约状态:
  - 是否暂停: false
  - 紧急模式: false
  - 白名单模式: false
  - 总质押金额: 10000 HSK
  - 奖励池余额: 5000 HSK
  - 最小质押金额: 1 HSK
  - 年化收益率: 8 %
  - 锁定期: 365 天（固定）
  - 质押开始时间: 2026-11-15T00:00:00.000Z
  - 质押结束时间: 2027-11-15T00:00:00.000Z
==================================================
```

#### Premium Staking 状态查询

```bash
# 查询合约状态
PREMIUM_STAKING_ADDRESS=0x... npx hardhat run scripts/premium/query/check-status.ts --network hashkeyTestnet
```

### 3. 质押功能测试

#### Normal Staking 质押

**测试脚本**: `scripts/normal/stake.ts`

```bash
# 使用环境变量指定金额
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=10 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet
```

**测试步骤**:
1. 连接合约
2. 检查合约状态（是否暂停、奖励池余额等）
3. 验证用户余额
4. 执行质押
5. 等待交易确认
6. 查询质押信息

**输出示例**:

```
==================================================
执行普通质押 (Normal Staking)
==================================================
用户地址: 0xabcdef...
合约地址: 0x123456...

检查合约状态...
合约是否暂停: false
最小质押金额: 1 HSK
年化收益率: 8 %
锁定期: 365 天（固定）
用户余额: 1000 HSK

准备质押 10 HSK...
锁定期: 365 天

质押交易 hash: 0xtxhash...
等待交易确认...
交易已确认，区块号: 12345678
✅ 质押成功！

查询质押信息...
总质押位置数: 1

最新质押信息:
  - 位置ID: 0
  - 质押金额: 10 HSK
  - 质押时间: 2026-11-12 10:30:00
  - 锁定期: 365 天（固定）
  - 年化收益率: 8 %
```

#### Premium Staking 质押（需白名单）

**前置条件**: 用户必须在白名单中

```bash
# 1. 先添加用户到白名单
npx hardhat run scripts/premium/whitelist/add-batch.ts --network hashkeyTestnet

# 2. 执行质押
PREMIUM_STAKING_ADDRESS=0x... STAKE_AMOUNT=600000 npx hardhat run scripts/premium/stake.ts --network hashkeyTestnet
```

### 4. 奖励管理测试

#### 添加奖励到奖励池

**Normal Staking**:

```bash
# 添加 10,000 HSK 到奖励池
npx hardhat run scripts/normal/add-rewards.ts --network hashkeyTestnet
```

**输出示例**:

```
==================================================
向普通质押合约添加奖励
==================================================
管理员地址: 0xadmin...
合约地址: 0x123456...

准备添加 10000 HSK 到奖励池...
当前奖励池余额: 5000 HSK

添加奖励交易 hash: 0xtxhash...
等待交易确认...
交易已确认，区块号: 12345679
✅ 奖励添加成功！

更新后的奖励池余额: 15000 HSK
增加金额: 10000 HSK
```

**Premium Staking**:

```bash
# 添加 50,000 HSK 到奖励池（Premium 需要更多奖励）
npx hardhat run scripts/premium/add-rewards.ts --network hashkeyTestnet
```

#### 查询奖励

```bash
# Normal Staking
npx hardhat run scripts/normal/query/check-rewards.ts --network hashkeyTestnet

# Premium Staking
npx hardhat run scripts/premium/query/check-rewards.ts --network hashkeyTestnet
```

#### 领取奖励

```bash
# Normal Staking
npx hardhat run scripts/normal/claim-rewards.ts --network hashkeyTestnet

# Premium Staking
npx hardhat run scripts/premium/claim-rewards.ts --network hashkeyTestnet
```

### 5. 白名单管理测试（Premium Staking）

#### 批量添加白名单

**测试脚本**: `scripts/premium/whitelist/add-batch.ts`

```bash
npx hardhat run scripts/premium/whitelist/add-batch.ts --network hashkeyTestnet
```

**输出示例**:

```
==================================================
批量添加用户到高级质押白名单
==================================================
管理员地址: 0xadmin...
合约地址: 0x123456...
唯一用户数量: 10

处理第 1 批，共 10 个地址...
批量添加白名单交易 hash: 0xtxhash...
等待交易确认...
交易已确认，区块号: 12345680
✅ 成功添加 10 个用户到白名单

✅ 所有地址处理完成

验证白名单状态（前10个）:
  0x1111... : ✅
  0x2222... : ✅
  0x3333... : ✅
  ...
```

#### 批量移除白名单

```bash
npx hardhat run scripts/premium/whitelist/remove-batch.ts --network hashkeyTestnet
```

#### 查询白名单状态

```bash
# 查询特定用户
USER_ADDRESS=0x... npx hardhat run scripts/premium/whitelist/check-user.ts --network hashkeyTestnet
```

**输出示例**:

```
==================================================
查询白名单状态
==================================================
合约地址: 0x123456...
用户地址: 0xuser...

查询结果: ✅ 在白名单中
白名单模式: 启用

✅ 该用户已授权，可以进行质押
```

#### 切换白名单模式

```bash
# 启用白名单模式
ENABLE=true npx hardhat run scripts/premium/whitelist/toggle-mode.ts --network hashkeyTestnet

# 禁用白名单模式
ENABLE=false npx hardhat run scripts/premium/whitelist/toggle-mode.ts --network hashkeyTestnet
```

### 6. 配置管理测试

#### 暂停/恢复合约

```bash
# 暂停 Normal Staking
npx hardhat run scripts/normal/config/pause.ts --network hashkeyTestnet

# 恢复 Normal Staking
npx hardhat run scripts/normal/config/unpause.ts --network hashkeyTestnet

# 暂停 Premium Staking
npx hardhat run scripts/premium/config/pause.ts --network hashkeyTestnet

# 恢复 Premium Staking
npx hardhat run scripts/premium/config/unpause.ts --network hashkeyTestnet
```

#### 设置质押时间窗口

```bash
# 设置 Normal Staking 开始时间
npx hardhat run scripts/normal/config/set-start-time.ts --network hashkeyTestnet

# 设置 Normal Staking 结束时间
npx hardhat run scripts/normal/config/set-end-time.ts --network hashkeyTestnet

# 设置 Premium Staking 时间窗口
npx hardhat run scripts/premium/config/set-start-time.ts --network hashkeyTestnet
npx hardhat run scripts/premium/config/set-end-time.ts --network hashkeyTestnet
```

### 7. 解除质押测试

**注意**: 解除质押必须等待锁定期结束（365天）

```bash
# Normal Staking 解除质押
npx hardhat run scripts/normal/unstake.ts --network hashkeyTestnet

# Premium Staking 解除质押
npx hardhat run scripts/premium/unstake.ts --network hashkeyTestnet
```

---

## 测试覆盖率

### 1. 生成测试覆盖率报告

```bash
# 使用标准命令
npm run test:coverage

# 或使用 Hardhat
npx hardhat coverage

# 使用自定义脚本
npm run coverage
```

### 2. 查看覆盖率报告

**终端输出**:

```
==================================================
生成测试覆盖率报告
==================================================
开始运行覆盖率测试...

Version
-------
> solidity-coverage: v0.8.0

Instrumenting for coverage...
=============================

> HSKStaking.sol
> StakingStorage.sol
> StakingConstants.sol

Compilation:
============

Network Info
============
> HardhatEVM: v2.22.17

  Normal Staking 单元测试
    ✓ 应该正确部署合约
    ✓ 用户应该能够成功质押

  Premium Staking 单元测试
    ✓ 应该能够批量添加白名单

  3 passing (3s)

-------------------|----------|----------|----------|----------|----------------|
File               |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------|----------|----------|----------|----------|----------------|
 contracts/        |      100 |      100 |      100 |      100 |                |
  HSKStaking.sol   |      100 |      100 |      100 |      100 |                |
-------------------|----------|----------|----------|----------|----------------|
All files          |      100 |      100 |      100 |      100 |                |
-------------------|----------|----------|----------|----------|----------------|

✅ 覆盖率报告生成完成！

覆盖率报告位置:
  - coverage/index.html (HTML 报告)
  - coverage.json (JSON 数据)
  
⚠️  提示: 打开 coverage/index.html 查看详细报告
```

**打开 HTML 报告**:

```bash
# macOS
open coverage/index.html

# Windows
start coverage/index.html

# Linux
xdg-open coverage/index.html
```

### 3. 覆盖率目标

| 类型 | 目标覆盖率 | 说明 |
|-----|----------|------|
| 语句覆盖率 (Statements) | ≥ 90% | 代码语句执行覆盖率 |
| 分支覆盖率 (Branch) | ≥ 80% | 条件分支覆盖率 |
| 函数覆盖率 (Functions) | ≥ 95% | 函数调用覆盖率 |
| 行覆盖率 (Lines) | ≥ 90% | 代码行覆盖率 |

---

## 测试场景示例

### 场景 1: 完整部署和质押流程

#### 目标
测试从部署到用户质押的完整流程

#### 步骤

```bash
# 1. 清理环境
npm run clean
npm run compile

# 2. 部署 Normal Staking
npx hardhat run scripts/normal/deploy.ts --network hashkeyTestnet

# 保存输出的合约地址
# Normal Staking Address: 0x...

# 3. 向奖励池充值
npx hardhat run scripts/normal/add-rewards.ts --network hashkeyTestnet

# 4. 查询合约状态
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-status.ts --network hashkeyTestnet

# 5. 执行质押
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=10 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet

# 6. 查询质押信息
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-stakes.ts --network hashkeyTestnet

# 7. 查询奖励
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-rewards.ts --network hashkeyTestnet
```

#### 预期结果
- ✅ 合约部署成功
- ✅ 奖励池充值成功
- ✅ 质押交易成功
- ✅ 可以查询到质押信息
- ✅ 可以查询到奖励（按秒累积）

### 场景 2: Premium Staking 白名单流程

#### 目标
测试 Premium Staking 的白名单管理和质押流程

#### 步骤

```bash
# 1. 部署 Premium Staking
npx hardhat run scripts/premium/deploy.ts --network hashkeyTestnet

# 保存输出的合约地址
# Premium Staking Address: 0x...

# 2. 添加用户到白名单
npx hardhat run scripts/premium/whitelist/add-batch.ts --network hashkeyTestnet

# 3. 验证白名单状态
USER_ADDRESS=0x... npx hardhat run scripts/premium/whitelist/check-user.ts --network hashkeyTestnet

# 4. 向奖励池充值（Premium 需要更多资金，16% APY）
npx hardhat run scripts/premium/add-rewards.ts --network hashkeyTestnet

# 5. 白名单用户质押
PREMIUM_STAKING_ADDRESS=0x... STAKE_AMOUNT=600000 npx hardhat run scripts/premium/stake.ts --network hashkeyTestnet

# 6. 查询质押信息
PREMIUM_STAKING_ADDRESS=0x... npx hardhat run scripts/premium/query/check-stakes.ts --network hashkeyTestnet

# 7. 测试非白名单用户质押（应该失败）
# 切换到非白名单用户账户
PREMIUM_STAKING_ADDRESS=0x... npx hardhat run scripts/premium/stake.ts --network hashkeyTestnet
# 预期: 交易失败，提示 "Not whitelisted"
```

#### 预期结果
- ✅ Premium Staking 部署成功，白名单模式启用
- ✅ 批量添加白名单成功
- ✅ 白名单用户可以质押
- ❌ 非白名单用户质押失败

### 场景 3: 暂停和恢复测试

#### 目标
测试合约的暂停和恢复功能

#### 步骤

```bash
# 1. 查询当前状态
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-status.ts --network hashkeyTestnet
# 确认: 是否暂停 = false

# 2. 暂停合约
npx hardhat run scripts/normal/config/pause.ts --network hashkeyTestnet

# 3. 再次查询状态
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-status.ts --network hashkeyTestnet
# 确认: 是否暂停 = true

# 4. 尝试质押（应该失败）
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=10 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet
# 预期: 交易失败，提示 "Pausable: paused"

# 5. 恢复合约
npx hardhat run scripts/normal/config/unpause.ts --network hashkeyTestnet

# 6. 确认可以正常质押
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=10 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet
# 预期: 交易成功
```

#### 预期结果
- ✅ 暂停功能正常
- ❌ 暂停期间无法质押
- ✅ 恢复后可以正常质押

### 场景 4: 奖励计算和提取测试

#### 目标
验证奖励计算的准确性和奖励提取功能

#### 步骤

```bash
# 1. 质押一定金额
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=1000 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet

# 2. 等待一段时间（例如 1 天）
sleep 86400

# 3. 查询待提取奖励
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-rewards.ts --network hashkeyTestnet

# 4. 计算预期奖励
# 预期奖励 = 1000 HSK × 8% × (1/365) ≈ 0.219 HSK

# 5. 提取奖励
npx hardhat run scripts/normal/claim-rewards.ts --network hashkeyTestnet

# 6. 验证奖励已提取
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-rewards.ts --network hashkeyTestnet
# 预期: 待提取奖励 = 0（或极小值）
```

#### 预期结果
- ✅ 奖励按秒累积
- ✅ 奖励计算准确（8% 年化）
- ✅ 奖励提取成功
- ✅ 提取后奖励清零

### 场景 5: 解除质押测试

#### 目标
测试锁定期和解除质押功能

#### 步骤

```bash
# 1. 质押
NORMAL_STAKING_ADDRESS=0x... STAKE_AMOUNT=100 npx hardhat run scripts/normal/stake.ts --network hashkeyTestnet

# 2. 立即尝试解除质押（应该失败）
npx hardhat run scripts/normal/unstake.ts --network hashkeyTestnet
# 预期: 交易失败，提示 "Still locked"

# 3. 等待锁定期结束（365天）
# （在测试网可以使用 evm_increaseTime 快进时间）

# 4. 锁定期结束后解除质押
npx hardhat run scripts/normal/unstake.ts --network hashkeyTestnet

# 5. 验证质押已解除
NORMAL_STAKING_ADDRESS=0x... npx hardhat run scripts/normal/query/check-stakes.ts --network hashkeyTestnet
# 预期: 质押位置状态 isUnstaked = true
```

#### 预期结果
- ❌ 锁定期内无法解除质押
- ✅ 锁定期结束后可以解除质押
- ✅ 解除质押时提取本金 + 奖励

---

## 测试最佳实践

### 1. 测试前准备

#### 环境检查清单

- [ ] Node.js 版本正确（>= 16.0.0）
- [ ] 依赖已安装（npm install）
- [ ] 合约已编译（npm run compile）
- [ ] 环境变量已配置（.env 文件）
- [ ] 测试账户有足够余额

#### 合约状态检查

```bash
# 检查合约状态
npx hardhat run scripts/normal/query/check-status.ts --network hashkeyTestnet

# 确认以下内容:
# - 合约未暂停
# - 奖励池有充足余额
# - 质押时间窗口正确
# - 配置参数符合预期
```

### 2. 测试执行建议

#### 先本地测试，再测试网测试

```bash
# 1. 本地测试（免费，快速）
npx hardhat node  # 启动本地节点
npx hardhat test --network localhost

# 2. 测试网测试（需要测试币）
npx hardhat run scripts/xxx.ts --network hashkeyTestnet

# 3. 主网部署（谨慎！）
npx hardhat run scripts/xxx.ts --network hashkeyMainnet
```

#### 使用测试辅助函数

```typescript
// scripts/test/helpers/fixtures.ts
import { deployTestFixture, increaseTime, getCurrentTimestamp } from "./fixtures";

// 部署测试环境
const { normalStaking, premiumStaking, admin, user1 } = await deployTestFixture();

// 快进时间
await increaseTime(86400); // 快进 1 天

// 获取当前时间戳
const now = await getCurrentTimestamp();
```

#### 边界条件测试

```typescript
// 测试最小值
await staking.stake({ value: ethers.parseEther("1") }); // 最小质押金额

// 测试最大值
await staking.stake({ value: ethers.parseEther("10000000") }); // 接近最大总质押量

// 测试边界外（应该失败）
await expect(
  staking.stake({ value: ethers.parseEther("0.5") })
).to.be.revertedWith("Stake amount too low");
```

### 3. 错误处理

#### 常见错误和解决方法

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `Stake amount too low` | 质押金额低于最小值 | 增加质押金额 |
| `Not whitelisted` | 用户不在白名单中 | 添加用户到白名单 |
| `Pausable: paused` | 合约已暂停 | 恢复合约或等待恢复 |
| `Still locked` | 锁定期未结束 | 等待锁定期结束 |
| `Insufficient reward pool` | 奖励池余额不足 | 向奖励池充值 |
| `Staking not started` | 质押尚未开始 | 等待质押开始时间 |
| `Staking ended` | 质押已结束 | 调整质押结束时间 |

#### 错误断言示例

```typescript
import { expect } from "chai";

// 期望交易回滚
await expect(
  staking.connect(user1).stake({ value: ethers.parseEther("0.5") })
).to.be.revertedWith("Stake amount too low");

// 期望交易成功
await expect(
  staking.connect(user1).stake({ value: ethers.parseEther("10") })
).to.not.be.reverted;

// 期望事件触发
await expect(
  staking.connect(user1).stake({ value: ethers.parseEther("10") })
).to.emit(staking, "Staked");
```

### 4. 测试数据管理

#### 使用固定的测试数据

```typescript
// 定义测试常量
const TEST_DATA = {
  normalStaking: {
    minStake: ethers.parseEther("1"),
    testAmount: ethers.parseEther("10"),
    rewardRate: 800, // 8%
  },
  premiumStaking: {
    minStake: ethers.parseEther("500000"),
    testAmount: ethers.parseEther("600000"),
    rewardRate: 1600, // 16%
  },
  lockPeriod: 365 * 24 * 60 * 60, // 365 天
};
```

#### 测试用户账户管理

```typescript
// 获取测试账户
const [admin, user1, user2, user3, ...others] = await ethers.getSigners();

// 为测试账户分配角色
const roles = {
  admin: admin,
  normalUser: user1,
  premiumUser: user2,
  nonWhitelistedUser: user3,
};
```

### 5. 测试文档化

#### 测试用例命名规范

```typescript
// ✅ 好的命名（描述清楚，易于理解）
it("用户应该能够质押大于最小金额的 HSK", async function () { /* ... */ });
it("非白名单用户应该无法在 Premium Staking 中质押", async function () { /* ... */ });
it("锁定期结束后应该能够解除质押并提取本金和奖励", async function () { /* ... */ });

// ❌ 不好的命名（模糊，不清楚）
it("测试质押", async function () { /* ... */ });
it("测试1", async function () { /* ... */ });
```

#### 测试注释

```typescript
describe("质押功能测试", function () {
  /**
   * 测试场景: 用户首次质押
   * 
   * 前置条件:
   * - 合约已部署且未暂停
   * - 奖励池有充足余额
   * - 用户账户有足够 HSK
   * 
   * 执行步骤:
   * 1. 用户调用 stake() 函数
   * 2. 传入质押金额（大于最小值）
   * 
   * 预期结果:
   * - 交易成功
   * - 创建新的质押位置
   * - totalStaked 增加
   * - 触发 Staked 事件
   */
  it("用户应该能够成功进行首次质押", async function () {
    // 测试代码...
  });
});
```

---

## 常见问题

### Q1: 如何在本地快进时间测试锁定期？

**A**: 使用 Hardhat 的时间操作功能:

```typescript
// 快进时间（秒）
await ethers.provider.send("evm_increaseTime", [86400]); // 快进 1 天
await ethers.provider.send("evm_mine", []); // 挖一个新区块

// 或使用测试辅助函数
import { increaseTime } from "./helpers/fixtures";
await increaseTime(86400); // 快进 1 天
```

### Q2: 如何测试不同的账户？

**A**: 使用 `connect()` 方法切换账户:

```typescript
const [admin, user1, user2] = await ethers.getSigners();

// 使用 user1 账户质押
await staking.connect(user1).stake({ value: ethers.parseEther("10") });

// 使用 user2 账户质押
await staking.connect(user2).stake({ value: ethers.parseEther("20") });
```

### Q3: 测试覆盖率太低怎么办？

**A**: 增加测试用例，覆盖以下场景:
- 正常流程测试
- 边界条件测试
- 异常情况测试
- 权限控制测试
- 各种错误场景测试

### Q4: 如何测试奖励计算的准确性？

**A**: 使用精确的数学计算并允许误差范围:

```typescript
import { expect } from "chai";

// 质押 1000 HSK，8% 年化，质押 1 天
const stakeAmount = ethers.parseEther("1000");
const expectedReward = stakeAmount * BigInt(800) * BigInt(86400) / (BigInt(10000) * BigInt(31536000));

// 允许 0.001 HSK 的误差
const actualReward = await staking.pendingReward(positionId);
const delta = ethers.parseEther("0.001");

expect(actualReward).to.be.closeTo(expectedReward, delta);
```

### Q5: 测试时 Gas 费用太高怎么办?

**A**: 
1. 在本地网络测试（免费）
2. 使用测试网（获取免费测试币）
3. 批量执行测试减少交易次数
4. 优化合约代码减少 Gas 消耗

### Q6: 如何调试失败的测试？

**A**:
1. 使用 `console.log` 输出调试信息
2. 查看交易回滚原因
3. 使用 Hardhat 的 `--verbose` 选项
4. 在 VS Code 中使用断点调试

```bash
# 详细输出模式
npx hardhat test --verbose

# 显示堆栈跟踪
npx hardhat test --show-stack-traces
```

### Q7: 如何测试合约升级？

**A**: 使用 OpenZeppelin 的 Upgrades 插件:

```typescript
import { upgrades } from "hardhat";

// 部署初始版本
const HSKStaking = await ethers.getContractFactory("HSKStaking");
const proxy = await upgrades.deployProxy(HSKStaking, [/* 初始化参数 */]);

// 升级到新版本
const HSKStakingV2 = await ethers.getContractFactory("HSKStakingV2");
const upgraded = await upgrades.upgradeProxy(proxy.address, HSKStakingV2);

// 验证升级后状态保持
const totalStaked = await upgraded.totalStaked();
expect(totalStaked).to.equal(previousTotalStaked);
```

### Q8: 测试时如何模拟多用户并发质押？

**A**:

```typescript
// 获取多个测试账户
const [admin, ...users] = await ethers.getSigners();

// 并发质押
const stakePromises = users.map((user, index) => {
  const amount = ethers.parseEther(`${10 + index}`);
  return staking.connect(user).stake({ value: amount });
});

// 等待所有质押完成
await Promise.all(stakePromises);

// 验证总质押量
const totalStaked = await staking.totalStaked();
const expectedTotal = users.reduce((sum, _, index) => {
  return sum + ethers.parseEther(`${10 + index}`);
}, 0n);
expect(totalStaked).to.equal(expectedTotal);
```

### Q9: 如何测试紧急模式？

**A**:

```typescript
// 1. 启用紧急模式
await staking.connect(admin).enableEmergencyMode();

// 2. 验证紧急模式已启用
expect(await staking.emergencyMode()).to.be.true;

// 3. 测试紧急提取
await staking.connect(user1).emergencyWithdraw(positionId);

// 4. 验证只提取了本金，没有奖励
// (具体逻辑根据合约实现)
```

### Q10: 测试网测试需要注意什么？

**A**:
1. **获取测试币**: 从水龙头获取测试网代币
2. **保存合约地址**: 部署后记录合约地址，避免重复部署
3. **交易确认时间**: 测试网交易可能需要更长确认时间
4. **Gas 价格**: 测试网 Gas 价格可能波动
5. **网络稳定性**: 测试网可能不稳定，做好重试准备

---

## 测试文件组织结构

### 完整测试目录结构

```
scripts/
└── test/                                    # 测试脚本根目录
    ├── unit/                                # 单元测试
    │   ├── normal/                          # Normal Staking 单元测试
    │   │   ├── deployment.test.ts           # 部署测试
    │   │   ├── staking.test.ts              # 质押功能测试
    │   │   ├── rewards.test.ts              # 奖励功能测试
    │   │   ├── unstaking.test.ts            # 解除质押测试
    │   │   ├── admin.test.ts                # 管理功能测试
    │   │   └── edge-cases.test.ts           # 边界条件测试
    │   │
    │   └── premium/                         # Premium Staking 单元测试
    │       ├── deployment.test.ts           # 部署测试
    │       ├── whitelist.test.ts            # 白名单功能测试
    │       ├── staking.test.ts              # 质押功能测试
    │       ├── rewards.test.ts              # 奖励功能测试
    │       ├── unstaking.test.ts            # 解除质押测试
    │       ├── admin.test.ts                # 管理功能测试
    │       └── edge-cases.test.ts           # 边界条件测试
    │
    ├── integration/                         # 集成测试
    │   ├── normal/                          # Normal Staking 集成测试
    │   │   ├── full-lifecycle.test.ts       # 完整生命周期测试
    │   │   ├── multi-user.test.ts           # 多用户场景测试
    │   │   └── rewards-lifecycle.test.ts    # 奖励生命周期测试
    │   │
    │   ├── premium/                         # Premium Staking 集成测试
    │   │   ├── full-lifecycle.test.ts       # 完整生命周期测试
    │   │   ├── whitelist-flow.test.ts       # 白名单流程测试
    │   │   └── multi-user.test.ts           # 多用户场景测试
    │   │
    │   └── cross-contract/                  # 跨合约测试
    │       ├── deployment.test.ts           # 双合约部署测试
    │       └── independence.test.ts         # 合约独立性测试
    │
    ├── e2e/                                 # 端到端测试
    │   ├── normal-user-journey.test.ts      # 普通用户完整旅程
    │   ├── premium-user-journey.test.ts     # 高级用户完整旅程
    │   └── emergency-scenarios.test.ts      # 紧急场景测试
    │
    ├── performance/                         # 性能测试
    │   ├── gas-optimization.test.ts         # Gas 优化测试
    │   ├── batch-operations.test.ts         # 批量操作性能测试
    │   └── stress-test.test.ts              # 压力测试
    │
    └── helpers/                             # 测试辅助函数
        ├── fixtures/                        # 测试装置
        │   ├── normal-staking.ts            # Normal Staking 装置
        │   ├── premium-staking.ts           # Premium Staking 装置
        │   └── common.ts                    # 通用装置
        │
        ├── utils/                           # 工具函数
        │   ├── assertions.ts                # 断言辅助
        │   ├── calculations.ts              # 计算辅助
        │   ├── formatters.ts                # 格式化辅助
        │   └── time.ts                      # 时间操作辅助
        │
        ├── mocks/                           # Mock 数据
        │   ├── users.ts                     # 用户数据
        │   └── scenarios.ts                 # 测试场景数据
        │
        └── constants.ts                     # 测试常量
```

### 测试文件说明

#### 1. 单元测试 (Unit Tests)

单元测试专注于测试单个功能或方法，每个测试文件应该只关注一个特定的功能模块。

##### Normal Staking 单元测试

**`unit/normal/deployment.test.ts`** - 部署测试
- 测试目标：验证合约部署的正确性
- 测试内容：
  - ✅ 合约地址是否正确生成
  - ✅ Owner 是否正确设置
  - ✅ 初始化参数是否正确（minStakeAmount, rewardRate, 时间窗口等）
  - ✅ 白名单模式是否正确关闭
  - ✅ 奖励池初始余额
  - ✅ 合约状态（未暂停、非紧急模式等）

**`unit/normal/staking.test.ts`** - 质押功能测试
- 测试目标：验证质押功能的核心逻辑
- 测试内容：
  - ✅ 用户可以成功质押
  - ✅ 质押金额低于最小值时拒绝
  - ✅ 质押金额超过最大总质押量时拒绝
  - ✅ 合约暂停时拒绝质押
  - ✅ 质押时间窗口外拒绝质押
  - ✅ 奖励池余额不足时拒绝质押
  - ✅ 质押位置信息正确创建
  - ✅ totalStaked 正确更新
  - ✅ 用户余额正确扣减
  - ✅ 质押事件正确触发

**`unit/normal/rewards.test.ts`** - 奖励功能测试
- 测试目标：验证奖励计算和提取的准确性
- 测试内容：
  - ✅ 奖励按秒准确累积
  - ✅ 奖励计算公式正确（8% APY）
  - ✅ 可以成功提取奖励
  - ✅ 提取奖励后余额更新正确
  - ✅ 提取奖励后 lastRewardAt 更新正确
  - ✅ 提取奖励不影响本金
  - ✅ 质押位置保持活跃
  - ✅ 奖励不超过锁定期限制
  - ✅ 多次提取奖励累积正确
  - ✅ 奖励提取事件正确触发

**`unit/normal/unstaking.test.ts`** - 解除质押测试
- 测试目标：验证解除质押的逻辑和限制
- 测试内容：
  - ✅ 锁定期内无法解除质押
  - ✅ 锁定期结束后可以解除质押
  - ✅ 解除质押时提取本金 + 奖励
  - ✅ 解除质押后位置标记为已解除
  - ✅ totalStaked 正确减少
  - ✅ 用户余额正确增加
  - ✅ 不能重复解除同一位置
  - ✅ 非所有者无法解除质押
  - ✅ 解除质押事件正确触发

**`unit/normal/admin.test.ts`** - 管理功能测试
- 测试目标：验证管理员操作的权限和功能
- 测试内容：
  - ✅ 管理员可以暂停/恢复合约
  - ✅ 管理员可以启用紧急模式
  - ✅ 管理员可以更新奖励池
  - ✅ 管理员可以设置质押时间窗口
  - ✅ 管理员可以转移所有权
  - ✅ 非管理员无法执行管理操作
  - ✅ 管理操作事件正确触发

**`unit/normal/edge-cases.test.ts`** - 边界条件测试
- 测试目标：验证极端情况和边界条件
- 测试内容：
  - ✅ 最小质押金额（1 HSK）
  - ✅ 接近最大总质押量
  - ✅ 质押开始时间边界
  - ✅ 质押结束时间边界
  - ✅ 锁定期刚好结束时解除质押
  - ✅ 零奖励情况
  - ✅ 极小金额质押的奖励计算
  - ✅ 极大金额质押的奖励计算
  - ✅ 时间快进到极端未来

##### Premium Staking 单元测试

**`unit/premium/deployment.test.ts`** - 部署测试
- 测试内容：与 Normal 类似，但验证：
  - ✅ 最小质押金额为 500,000 HSK
  - ✅ 年化收益率为 16%
  - ✅ 白名单模式默认启用

**`unit/premium/whitelist.test.ts`** - 白名单功能测试
- 测试目标：验证白名单管理功能
- 测试内容：
  - ✅ 管理员可以批量添加白名单
  - ✅ 管理员可以批量移除白名单
  - ✅ 批量操作支持最多 100 个地址
  - ✅ 超过 100 个地址时拒绝
  - ✅ 可以查询用户白名单状态
  - ✅ 管理员可以切换白名单模式
  - ✅ 非管理员无法操作白名单
  - ✅ 白名单操作事件正确触发
  - ✅ 白名单模式切换事件正确触发

**`unit/premium/staking.test.ts`** - 质押功能测试
- 测试内容：与 Normal 类似，但额外验证：
  - ✅ 白名单用户可以质押
  - ✅ 非白名单用户无法质押
  - ✅ 禁用白名单模式后所有用户可质押
  - ✅ 最小质押金额为 500,000 HSK

**`unit/premium/rewards.test.ts`** - 奖励功能测试
- 测试内容：与 Normal 类似，但验证：
  - ✅ 奖励计算使用 16% APY
  - ✅ Premium 奖励约为 Normal 的 2 倍

**`unit/premium/unstaking.test.ts`** - 解除质押测试
- 测试内容：与 Normal 相同

**`unit/premium/admin.test.ts`** - 管理功能测试
- 测试内容：与 Normal 相同，但额外包含白名单管理

**`unit/premium/edge-cases.test.ts`** - 边界条件测试
- 测试内容：与 Normal 类似，但使用 Premium 参数

---

#### 2. 集成测试 (Integration Tests)

集成测试关注多个功能模块的协同工作，测试完整的业务流程。

##### Normal Staking 集成测试

**`integration/normal/full-lifecycle.test.ts`** - 完整生命周期测试
- 测试目标：验证从部署到解除质押的完整流程
- 测试流程：
  1. 部署合约
  2. 配置合约（设置时间窗口、添加奖励池）
  3. 用户质押
  4. 时间推进（模拟锁定期）
  5. 中途提取奖励
  6. 锁定期结束后解除质押
  7. 验证所有状态和余额正确

**`integration/normal/multi-user.test.ts`** - 多用户场景测试
- 测试目标：验证多用户同时使用的场景
- 测试场景：
  - ✅ 多用户并发质押
  - ✅ 不同用户不同金额质押
  - ✅ 多用户在不同时间质押
  - ✅ 多用户同时提取奖励
  - ✅ 多用户在不同时间解除质押
  - ✅ totalStaked 始终正确
  - ✅ 奖励池余额始终正确

**`integration/normal/rewards-lifecycle.test.ts`** - 奖励生命周期测试
- 测试目标：验证奖励从累积到提取的完整流程
- 测试场景：
  - ✅ 质押后奖励开始累积
  - ✅ 奖励按时间线性增长
  - ✅ 多次提取奖励
  - ✅ 奖励不超过锁定期限制
  - ✅ 解除质押时一次性提取所有奖励

##### Premium Staking 集成测试

**`integration/premium/full-lifecycle.test.ts`** - 完整生命周期测试
- 测试流程：与 Normal 类似，但包含白名单操作

**`integration/premium/whitelist-flow.test.ts`** - 白名单流程测试
- 测试目标：验证白名单管理的完整流程
- 测试场景：
  - ✅ 部署时白名单为空
  - ✅ 批量添加白名单用户
  - ✅ 白名单用户可以质押
  - ✅ 非白名单用户无法质押
  - ✅ 移除白名单后用户无法新质押
  - ✅ 移除白名单不影响已有质押
  - ✅ 切换白名单模式的影响

**`integration/premium/multi-user.test.ts`** - 多用户场景测试
- 测试内容：与 Normal 类似，但包含白名单用户

##### 跨合约测试

**`integration/cross-contract/deployment.test.ts`** - 双合约部署测试
- 测试目标：验证同时部署两个合约的正确性
- 测试内容：
  - ✅ 两个合约成功部署
  - ✅ 两个合约有不同地址
  - ✅ 两个合约配置正确
  - ✅ 两个合约独立运行

**`integration/cross-contract/independence.test.ts`** - 合约独立性测试
- 测试目标：验证两个合约互不影响
- 测试内容：
  - ✅ Normal 质押不影响 Premium
  - ✅ Premium 质押不影响 Normal
  - ✅ 奖励池独立
  - ✅ 总质押量独立
  - ✅ 暂停操作独立

---

#### 3. 端到端测试 (E2E Tests)

端到端测试模拟真实用户的完整使用旅程。

**`e2e/normal-user-journey.test.ts`** - 普通用户完整旅程
- 测试场景：
  1. 用户查看合约状态
  2. 用户质押 HSK
  3. 用户查询质押信息
  4. 用户定期查询奖励
  5. 用户提取部分奖励
  6. 锁定期结束后解除质押
  7. 用户再次质押

**`e2e/premium-user-journey.test.ts`** - 高级用户完整旅程
- 测试场景：
  1. 用户申请白名单
  2. 管理员审核添加白名单
  3. 用户质押大额 HSK
  4. 用户定期查询高额奖励
  5. 用户提取奖励
  6. 解除质押

**`e2e/emergency-scenarios.test.ts`** - 紧急场景测试
- 测试场景：
  - ✅ 合约暂停场景
  - ✅ 启用紧急模式
  - ✅ 用户紧急提取（仅本金）
  - ✅ 恢复正常运行

---

#### 4. 性能测试 (Performance Tests)

**`performance/gas-optimization.test.ts`** - Gas 优化测试
- 测试目标：监控和优化 Gas 消耗
- 测试内容：
  - ✅ 质押操作 Gas 消耗
  - ✅ 解除质押 Gas 消耗
  - ✅ 批量白名单操作 Gas 消耗
  - ✅ 与预期 Gas 消耗比较

**`performance/batch-operations.test.ts`** - 批量操作性能测试
- 测试内容：
  - ✅ 批量添加 100 个白名单用户
  - ✅ 10 个用户并发质押
  - ✅ 50 个用户并发提取奖励

**`performance/stress-test.test.ts`** - 压力测试
- 测试内容：
  - ✅ 100 个用户依次质押
  - ✅ 接近最大总质押量
  - ✅ 奖励池接近耗尽

---

#### 5. 测试辅助文件

##### Fixtures (测试装置)

**`helpers/fixtures/common.ts`** - 通用测试装置
- 提供功能：
  - 部署基础合约环境
  - 时间操作函数（快进、获取时间戳）
  - 获取测试账户
  - 基础配置设置

**`helpers/fixtures/normal-staking.ts`** - Normal Staking 装置
- 提供功能：
  - 部署并配置 Normal Staking 合约
  - 添加初始奖励池
  - 关闭白名单模式
  - 设置质押时间窗口

**`helpers/fixtures/premium-staking.ts`** - Premium Staking 装置
- 提供功能：
  - 部署并配置 Premium Staking 合约
  - 添加初始奖励池
  - 保持白名单模式启用
  - 设置质押时间窗口

##### Utils (工具函数)

**`helpers/utils/assertions.ts`** - 断言辅助
- 提供功能：
  - expectRevert - 期望交易回滚
  - expectEvent - 期望事件触发
  - expectCloseTo - BigInt 近似比较
  - expectBalanceChange - 余额变化验证

**`helpers/utils/calculations.ts`** - 计算辅助
- 提供功能：
  - calculateExpectedReward - 计算预期奖励
  - calculateUnlockTime - 计算解锁时间
  - calculateAPY - APY 计算

**`helpers/utils/formatters.ts`** - 格式化辅助
- 提供功能：
  - formatEther - 格式化以太金额
  - formatTimestamp - 格式化时间戳
  - formatPosition - 格式化质押位置信息

**`helpers/utils/time.ts`** - 时间操作辅助
- 提供功能：
  - increaseTime - 快进时间
  - setNextBlockTimestamp - 设置下个区块时间
  - getCurrentTimestamp - 获取当前时间
  - skipToUnlockTime - 直接快进到解锁时间

##### Mocks (Mock 数据)

**`helpers/mocks/users.ts`** - 用户数据
- 提供：
  - 测试用户地址列表
  - 用户角色分配（admin, normalUser, premiumUser 等）
  - 用户余额配置

**`helpers/mocks/scenarios.ts`** - 测试场景数据
- 提供：
  - 常用质押金额组合
  - 时间场景组合
  - 奖励计算测试数据

**`helpers/constants.ts`** - 测试常量
- 定义：
  - 测试用的质押金额
  - 测试用的时间间隔
  - Gas 限制
  - 允许的误差范围

---

### 测试文件编写指南

#### 单元测试编写规范

1. **一个文件一个功能模块**
   - 每个测试文件只测试一个主要功能
   - 文件名清晰描述测试内容

2. **测试用例组织**
   - 使用 `describe` 分组相关测试
   - 使用嵌套 `describe` 进一步细分
   - 使用清晰的中文描述

3. **测试用例命名**
   - 描述测试的具体行为和预期结果
   - 使用 "应该..." 的句式
   - 例如: "应该在锁定期内拒绝解除质押"

4. **测试结构**
   - Arrange（准备）- 设置测试环境和数据
   - Act（执行）- 执行被测试的操作
   - Assert（断言）- 验证结果

#### 集成测试编写规范

1. **关注流程而非单个功能**
   - 测试多个功能的协同工作
   - 模拟真实使用场景

2. **包含完整的数据流**
   - 从开始到结束的完整流程
   - 验证中间状态和最终状态

3. **测试边界和异常**
   - 正常流程 + 异常流程
   - 多用户并发场景

#### E2E 测试编写规范

1. **模拟真实用户行为**
   - 按照用户实际使用顺序
   - 包含查询、等待等真实操作

2. **验证用户体验**
   - 关注用户可见的结果
   - 验证事件和状态变化

---

### 测试执行策略

#### 本地开发时

```bash
# 运行单个测试文件
npx hardhat test scripts/test/unit/normal/staking.test.ts

# 运行某个目录下的所有测试
npx hardhat test scripts/test/unit/normal/**/*.test.ts

# 运行特定测试用例（使用 --grep）
npx hardhat test --grep "应该拒绝低于最小金额的质押"
```

#### CI/CD 流程

1. **快速反馈** - 运行单元测试（最快）
2. **完整验证** - 运行集成测试
3. **发布前检查** - 运行 E2E 测试
4. **性能监控** - 定期运行性能测试

---

### 测试覆盖率目标

| 测试类型 | 覆盖率目标 | 执行频率 |
|---------|----------|---------|
| 单元测试 | 95%+ | 每次提交 |
| 集成测试 | 90%+ | 每次提交 |
| E2E 测试 | 80%+ | 每日/发布前 |
| 性能测试 | N/A | 每周/发布前 |

---

### 测试数据管理

#### 测试常量示例

- Normal Staking:
  - 最小质押: 1 HSK
  - 测试质押金额: 10 HSK, 100 HSK, 1000 HSK
  - 年化收益率: 8% (800 basis points)
  - 锁定期: 365 天

- Premium Staking:
  - 最小质押: 500,000 HSK
  - 测试质押金额: 600,000 HSK, 1,000,000 HSK
  - 年化收益率: 16% (1600 basis points)
  - 锁定期: 365 天

#### 测试账户分配

- admin: 管理员账户
- user1: 普通用户1（Normal Staking）
- user2: 普通用户2（Normal Staking）
- user3: 高级用户1（Premium Staking, 白名单）
- user4: 高级用户2（Premium Staking, 白名单）
- user5: 非白名单用户（用于测试拒绝场景）

---

## 附录

### A. 测试脚本速查表

#### 运行测试命令

```bash
# 单元测试
npx hardhat test scripts/test/unit/normal/**/*.test.ts
npx hardhat test scripts/test/unit/premium/**/*.test.ts

# 集成测试
npx hardhat test scripts/test/integration/**/*.ts

# E2E 测试
npx hardhat test scripts/test/e2e/**/*.ts

# 性能测试
npx hardhat test scripts/test/performance/**/*.ts

# 运行所有测试
npx hardhat test

# 生成测试覆盖率报告
npx hardhat coverage
```

#### 测试文件对应表

| 操作 | Normal Staking | Premium Staking |
|-----|---------------|----------------|
| 部署 | `scripts/normal/deploy.ts` | `scripts/premium/deploy.ts` |
| 质押 | `scripts/normal/stake.ts` | `scripts/premium/stake.ts` |
| 解除质押 | `scripts/normal/unstake.ts` | `scripts/premium/unstake.ts` |
| 领取奖励 | `scripts/normal/claim-rewards.ts` | `scripts/premium/claim-rewards.ts` |
| 添加奖励 | `scripts/normal/add-rewards.ts` | `scripts/premium/add-rewards.ts` |
| 查询状态 | `scripts/normal/query/check-status.ts` | `scripts/premium/query/check-status.ts` |
| 查询质押 | `scripts/normal/query/check-stakes.ts` | `scripts/premium/query/check-stakes.ts` |
| 查询奖励 | `scripts/normal/query/check-rewards.ts` | `scripts/premium/query/check-rewards.ts` |
| 暂停合约 | `scripts/normal/config/pause.ts` | `scripts/premium/config/pause.ts` |
| 恢复合约 | `scripts/normal/config/unpause.ts` | `scripts/premium/config/unpause.ts` |
| 批量添加白名单 | N/A | `scripts/premium/whitelist/add-batch.ts` |
| 批量移除白名单 | N/A | `scripts/premium/whitelist/remove-batch.ts` |
| 查询白名单 | N/A | `scripts/premium/whitelist/check-user.ts` |
| 切换白名单模式 | N/A | `scripts/premium/whitelist/toggle-mode.ts` |

### B. 环境变量参考

```env
# 网络配置
NETWORK=testnet  # testnet | mainnet

# 私钥（测试用）
PRIVATE_KEY=0x...

# 合约地址
NORMAL_STAKING_ADDRESS=0x...
PREMIUM_STAKING_ADDRESS=0x...

# 质押配置
STAKE_AMOUNT=10  # 质押金额（HSK）

# 白名单配置
USER_ADDRESS=0x...  # 查询的用户地址
ENABLE=true  # 启用/禁用白名单模式
```

### C. NPM 脚本参考

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
    "test:e2e": "hardhat test scripts/test/e2e/**/*.ts",
    "test:all": "hardhat run scripts/dev/test-all.ts",
    "test:coverage": "hardhat coverage",
    "coverage": "hardhat run scripts/dev/coverage.ts"
  }
}
```

### D. 相关文档

- [主 README](../README.md) - 项目整体说明
- [脚本重构方案](./SCRIPTS_REFACTORING.md) - 脚本架构详解
- [产品方案](./PRODUCT_PLANS.md) - 产品功能说明
- [技术 FAQ](./TECHNICAL_FAQ.md) - 技术问题解答
- [错误处理指南](./ERROR_HANDLING.md) - 错误处理方法

---

## 总结

本测试指南涵盖了 Whale Staking 项目的完整测试流程，包括：

✅ **开发脚本**: 编译、清理、构建工具  
✅ **单元测试**: 核心功能的独立测试  
✅ **集成测试**: 跨模块的完整流程测试  
✅ **E2E 测试**: 真实用户旅程模拟  
✅ **性能测试**: Gas 优化和压力测试  
✅ **测试覆盖率**: 代码覆盖率分析  
✅ **测试组织**: 细粒度文件拆分方案  
✅ **最佳实践**: 测试规范和建议  
✅ **问题排查**: 常见问题解决方案  

通过遵循本指南，开发团队可以确保合约的稳定性和安全性，为用户提供可靠的质押服务。

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11-12  
**维护者**: Whale Staking Team
