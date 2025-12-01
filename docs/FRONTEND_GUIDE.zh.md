# 前端集成指南

## 查询用户质押ID和待提取奖励

### 解决方案

使用 `getUserPositionIds` 函数获取用户的所有质押ID：

```typescript
import { ethers } from "ethers";
import stakingABI from "./abi/HSKStaking.json"; // 合约ABI

async function getUserPositionIds(
  stakingContract: ethers.Contract,
  userAddress: string
): Promise<bigint[]> {
  try {
    // 直接调用合约函数，一次性获取所有 positionId
    const positionIds = await stakingContract.getUserPositionIds(userAddress);
    return positionIds.map((id: any) => BigInt(id));
  } catch (error) {
    console.error("Failed to get user position IDs:", error);
    return [];
  }
}
```

**优点**：
- ✅ 一次调用即可获取所有ID
- ✅ 效率最高，gas消耗最少
- ✅ 代码简洁，易于维护

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
      // 注意：pendingReward 可以被任何人调用（无所有者限制）
      // 可以使用 provider（只读）或 signer
      let pendingReward = BigInt(0);
      
      if (!position.isUnstaked) {
        try {
          // 可以使用 provider 进行只读查询（不需要 signer）
          pendingReward = await stakingContract.pendingReward(positionId);
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

1. **`pendingReward` 函数可以被任何人调用**
   - 无所有者限制 - 任何人都可以查询任何位置的待提取奖励
   - 可以使用 provider（只读）或 signer - 不需要 signer
   - 如果位置已解除质押或合约处于紧急模式，返回 0
   - View 函数，只读查询无需 gas 费用

2. **获取用户质押ID**
   - 使用 `getUserPositionIds(userAddress)` 直接获取所有 positionId

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
      // 使用 getUserPositionIds 获取所有 positionId
      const contract = new ethers.Contract(stakingAddress, stakingABI, provider);
      const ids = await contract.getUserPositionIds(address);
      setPositionIds(ids.map((id: any) => BigInt(id)));
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
// 一次性获取用户的所有 positionId
function getUserPositionIds(address user) external view returns (uint256[] memory);

// 计算指定金额的潜在奖励（用于质押前预览）
function calculatePotentialReward(uint256 amount) external view returns (uint256);

// 查询位置详情
function positions(uint256 positionId) external view returns (Position memory);

// 查询待提取奖励（任何人都可以查询）
function pendingReward(uint256 positionId) external view returns (uint256);

// 获取下一个位置ID
function nextPositionId() external view returns (uint256);
```

### 计算潜在奖励

在用户质押前，可以使用 `calculatePotentialReward` 函数预览潜在奖励：

```typescript
async function previewReward(
  stakingContract: ethers.Contract,
  stakeAmount: string // 例如 "100" 表示 100 HSK
): Promise<string> {
  const amountInWei = ethers.parseEther(stakeAmount);
  const potentialReward = await stakingContract.calculatePotentialReward(amountInWei);
  return ethers.formatEther(potentialReward);
}

// 使用示例
const reward = await previewReward(stakingContract, "100");
console.log(`质押 100 HSK，365天后可获得约 ${reward} HSK 奖励`);
```

### 性能优化建议

1. **使用 Multicall**：批量查询多个位置的奖励
2. **缓存结果**：避免频繁查询相同的数据
3. **增量更新**：只查询新增的位置
4. **后台轮询**：定期更新奖励数据，而不是每次用户操作时查询

### 相关脚本

后端脚本中已经实现了类似的功能，可以参考：
- `scripts/shared/helpers.ts` - `getUserPositionIds` 函数
- `scripts/staking/query/pending-reward.ts` - 查询待提取奖励的完整实现

---

**文档版本**: 1.0.0  
**维护者**: HashKey 技术团队

