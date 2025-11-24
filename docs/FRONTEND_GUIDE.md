# Frontend Integration Guide

## Query User Staking IDs and Pending Rewards

### Solution

Use `getUserPositionIds` function to get all staking IDs for a user:

```typescript
import { ethers } from "ethers";
import stakingABI from "./abi/HSKStaking.json"; // Contract ABI

async function getUserPositionIds(
  stakingContract: ethers.Contract,
  userAddress: string
): Promise<bigint[]> {
  try {
    // Directly call contract function, get all positionIds in one call
    const positionIds = await stakingContract.getUserPositionIds(userAddress);
    return positionIds.map((id: any) => BigInt(id));
  } catch (error) {
    console.error("Failed to get user position IDs:", error);
    return [];
  }
}
```

**Advantages**:
- ✅ Get all IDs in one call
- ✅ Most efficient, least gas consumption
- ✅ Clean code, easy to maintain

### Complete Example: Query All Positions' Pending Rewards for User

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
  
  // 1. Get all staking IDs for user
  const positionIds = await getUserPositionIds(stakingContract, userAddress);
  
  if (positionIds.length === 0) {
    return [];
  }
  
  // 2. Query pending rewards for each position
  const results: PositionReward[] = [];
  
  for (const positionId of positionIds) {
    try {
      // Query position information
      const position = await stakingContract.positions(positionId);
      
      // Query pending rewards
      // Note: pendingReward requires msg.sender to match position.owner
      // So must use signer to call
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

// Usage example
async function example() {
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
  const userAddress = await signer.getAddress();
  
  const stakingAddress = "0x..."; // Staking contract address
  
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

### Important Notes

1. **`pendingReward` function requires `msg.sender` to match `position.owner`**
   - Even though this is a view function, it checks the caller's address
   - If addresses don't match, function returns 0 (does not revert)
   - **Must use signer to call `pendingReward`**, cannot use provider only

2. **Get User Staking IDs**
   - Use `getUserPositionIds(userAddress)` to directly get all positionIds

3. **Frontend Implementation Recommendations**
   - Use React Hook or Vue Composable to encapsulate query logic
   - Add caching mechanism to avoid frequent queries
   - Handle loading states and error cases
   - Consider using multicall for batch queries to improve efficiency

### React Hook Example

```typescript
import { useState, useEffect } from "react";
import { useAccount, useContractRead, useContractReads } from "wagmi";
import { stakingABI } from "./abi";

export function useUserStakingPositions(stakingAddress: string) {
  const { address } = useAccount();
  const [positionIds, setPositionIds] = useState<bigint[]>([]);
  
  // Get all staking IDs for user
  useEffect(() => {
    if (!address) {
      setPositionIds([]);
      return;
    }
    
    async function fetchPositionIds() {
      // Use getUserPositionIds to get all positionIds
      const contract = new ethers.Contract(stakingAddress, stakingABI, provider);
      const ids = await contract.getUserPositionIds(address);
      setPositionIds(ids.map((id: any) => BigInt(id)));
    }
    
    fetchPositionIds();
  }, [address, stakingAddress]);
  
  // Batch query all positions' pending rewards
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

### Contract Interface Reference

```solidity
// Get all positionIds for user in one call
function getUserPositionIds(address user) external view returns (uint256[] memory);

// Calculate potential reward for specified amount (for preview before staking)
function calculatePotentialReward(uint256 amount) external view returns (uint256);

// Query position details
function positions(uint256 positionId) external view returns (Position memory);

// Query pending rewards (requires msg.sender == position.owner)
function pendingReward(uint256 positionId) external view returns (uint256);

// Get next position ID
function nextPositionId() external view returns (uint256);
```

### Calculate Potential Rewards

Before user stakes, can use `calculatePotentialReward` function to preview potential rewards:

```typescript
async function previewReward(
  stakingContract: ethers.Contract,
  stakeAmount: string // e.g., "100" means 100 HSK
): Promise<string> {
  const amountInWei = ethers.parseEther(stakeAmount);
  const potentialReward = await stakingContract.calculatePotentialReward(amountInWei);
  return ethers.formatEther(potentialReward);
}

// Usage example
const reward = await previewReward(stakingContract, "100");
console.log(`Staking 100 HSK, can get approximately ${reward} HSK rewards after 365 days`);
```

### Performance Optimization Recommendations

1. **Use Multicall**: Batch query rewards for multiple positions
2. **Cache Results**: Avoid frequent queries of same data
3. **Incremental Updates**: Only query new positions
4. **Background Polling**: Regularly update reward data, rather than querying on every user operation

### Related Scripts

Backend scripts have implemented similar functionality, can refer to:
- `scripts/shared/helpers.ts` - `getUserPositionIds` function
- `scripts/staking/query/pending-reward.ts` - Complete implementation for querying pending rewards

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team
