# 前端集成指南

## 查询用户质押ID和待提取奖励

### 问题背景

前端需要知道用户有哪些质押ID，才能查询每个位置的待提取奖励。由于Solidity的`public mapping(address => uint256[])`只生成`userPositions(address, uint256 index)` getter函数，不能直接获取整个数组，所以需要通过遍历来获取。

### 解决方案

我们提供了两种方法来获取用户的所有质押ID：

#### 方法1: 通过 `userPositions` mapping 遍历（推荐）

```typescript
import { ethers } from "ethers";
import stakingABI from "./abi/HSKStaking.json"; // 合约ABI

async function getUserPositionIds(
  stakingContract: ethers.Contract,
  userAddress: string
): Promise<bigint[]> {
  const positionIds: bigint[] = [];
  
  // 遍历 userPositions mapping
  let index = 0;
  while (true) {
    try {
      const positionId = await stakingContract.userPositions(userAddress, index);
      // Position IDs 从1开始，0表示没有更多位置
      if (positionId === BigInt(0) || positionId === 0n) {
        break;
      }
      positionIds.push(BigInt(positionId));
      index++;
    } catch (error) {
      // 索引越界或其他错误，表示已到达末尾
      break;
    }
  }
  
  return positionIds;
}
```

#### 方法2: 遍历所有 positionId（备用方案）

如果方法1没有找到任何位置，可以遍历所有positionId：

```typescript
async function getUserPositionIdsFallback(
  stakingContract: ethers.Contract,
  userAddress: string
): Promise<bigint[]> {
  const positionIds: bigint[] = [];
  const nextPositionId = await stakingContract.nextPositionId();
  
  for (let i = 1; i < Number(nextPositionId); i++) {
    try {
      const position = await stakingContract.positions(BigInt(i));
      if (position.owner && 
          position.owner.toLowerCase() === userAddress.toLowerCase()) {
        positionIds.push(BigInt(i));
      }
    } catch {
      // 位置不存在或错误，继续
    }
  }
  
  return positionIds;
}
```

### 完整示例：查询用户所有位置的待提取奖励

```typescript
import { ethers } from "ethers";
import stakingABI from "./abi/HSKStaking.json";

interface PositionReward {
  positionId: bigint;
  stakedAmount: string;
  pendingReward: string;
  isUnstaked: boolean;
}

async function getUserPendingRewards(
  stakingAddress: string,
  userAddress: string,
  provider: ethers.Provider,
  signer?: ethers.Signer
): Promise<PositionReward[]> {
  const stakingContract = new ethers.Contract(
    stakingAddress,
    stakingABI,
    signer || provider
  );
  
  // 1. 获取用户的所有质押ID
  const positionIds = await getUserPositionIds(stakingContract, userAddress);
  
  if (positionIds.length === 0) {
    return [];
  }
  
  // 2. 查询每个位置的待提取奖励
  const results: PositionReward[] = [];
  
  for (const positionId of positionIds) {
    try {
      // 查询位置信息
      const position = await stakingContract.positions(positionId);
      
      // 查询待提取奖励
      // 注意：pendingReward 需要 msg.sender 匹配 position.owner
      // 所以必须使用 signer 来调用
      let pendingReward = BigInt(0);
      
      if (signer && !position.isUnstaked) {
        try {
          const stakingWithSigner = stakingContract.connect(signer);
          pendingReward = await stakingWithSigner.pendingReward(positionId);
        } catch (error) {
          console.error(`Failed to query reward for position ${positionId}:`, error);
        }
      }
      
      results.push({
        positionId,
        stakedAmount: ethers.formatEther(position.amount),
        pendingReward: ethers.formatEther(pendingReward),
        isUnstaked: position.isUnstaked
      });
    } catch (error) {
      console.error(`Failed to query position ${positionId}:`, error);
    }
  }
  
  return results;
}

// 使用示例
async function example() {
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
  const userAddress = await signer.getAddress();
  
  const stakingAddress = "0x..."; // 质押合约地址
  
  const rewards = await getUserPendingRewards(
    stakingAddress,
    userAddress,
    provider,
    signer
  );
  
  console.log(`Found ${rewards.length} positions:`);
  rewards.forEach((reward) => {
    console.log(`Position #${reward.positionId}:`);
    console.log(`  Staked: ${reward.stakedAmount} HSK`);
    console.log(`  Pending Reward: ${reward.pendingReward} HSK`);
    console.log(`  Is Unstaked: ${reward.isUnstaked}`);
  });
}
```

### 重要注意事项

1. **`pendingReward` 函数要求 `msg.sender` 匹配 `position.owner`**
   - 即使这是一个 view 函数，它也会检查调用者的地址
   - 如果地址不匹配，函数会返回 0（不会 revert）
   - **必须使用 signer 来调用 `pendingReward`**，不能只使用 provider

2. **获取用户质押ID的两种方法**
   - 方法1（推荐）：通过 `userPositions(userAddress, index)` 遍历
   - 方法2（备用）：遍历所有 `positionId`（效率较低，但更可靠）

3. **前端实现建议**
   - 使用 React Hook 或 Vue Composable 封装查询逻辑
   - 添加缓存机制，避免频繁查询
   - 处理加载状态和错误情况
   - 考虑使用 multicall 批量查询以提高效率

### React Hook 示例

```typescript
import { useState, useEffect } from "react";
import { useAccount, useContractRead, useContractReads } from "wagmi";
import { stakingABI } from "./abi";

export function useUserStakingPositions(stakingAddress: string) {
  const { address } = useAccount();
  const [positionIds, setPositionIds] = useState<bigint[]>([]);
  
  // 获取用户的所有质押ID
  useEffect(() => {
    if (!address) {
      setPositionIds([]);
      return;
    }
    
    async function fetchPositionIds() {
      // 实现获取逻辑...
      // 这里可以使用 wagmi 的 useContractReads 或直接调用合约
    }
    
    fetchPositionIds();
  }, [address, stakingAddress]);
  
  // 批量查询所有位置的待提取奖励
  const { data: rewards, isLoading } = useContractReads({
    contracts: positionIds.map((positionId) => ({
      address: stakingAddress as `0x${string}`,
      abi: stakingABI,
      functionName: "pendingReward",
      args: [positionId],
    })),
    enabled: positionIds.length > 0,
  });
  
  return {
    positionIds,
    rewards,
    isLoading,
  };
}
```

### 合约接口参考

```solidity
// 获取用户第 index 个质押位置的ID
function userPositions(address user, uint256 index) external view returns (uint256);

// 查询位置详情
function positions(uint256 positionId) external view returns (Position memory);

// 查询待提取奖励（需要 msg.sender == position.owner）
function pendingReward(uint256 positionId) external view returns (uint256);

// 获取下一个位置ID（用于遍历）
function nextPositionId() external view returns (uint256);
```

### 性能优化建议

1. **使用 Multicall**：批量查询多个位置的奖励
2. **缓存结果**：避免频繁查询相同的数据
3. **增量更新**：只查询新增的位置
4. **后台轮询**：定期更新奖励数据，而不是每次用户操作时查询

### 相关脚本

后端脚本中已经实现了类似的功能，可以参考：
- `scripts/shared/helpers.ts` - `getUserPositionIds` 函数
- `scripts/normal/query/pending-reward.ts` - 查询待提取奖励的完整实现

