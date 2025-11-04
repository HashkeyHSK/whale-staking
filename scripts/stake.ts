import { ethers } from "hardhat";
import { Layer2Staking__factory } from "../typechain-types";

async function main() {
  try {
    const STAKING_PROXY = "0xBb5cE0Bea5141ff12a9A8E6b6169459A21c22fF2";
    const privateKey = "0x4e1dfbc32ad3d7929902645b081728500d5b57c73db788227a7d9e8690d93cf1";
    const provider = ethers.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log("Staking with account:", wallet.address);

    const staking = Layer2Staking__factory.connect(STAKING_PROXY, wallet);

    // 1. 检查合约状态
    const isPaused = await staking.paused();
    console.log("Contract paused:", isPaused);

    const minStakeAmount = await staking.minStakeAmount();
    console.log("Minimum stake amount:", ethers.formatEther(minStakeAmount), "HSK");

    const maxTotalStake = await staking.maxTotalStake();
    const totalStaked = await staking.totalStaked();
    console.log("Max total stake:", ethers.formatEther(maxTotalStake), "HSK");
    console.log("Current total staked:", ethers.formatEther(totalStaked), "HSK");

    // 2. 检查账户状态
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "HSK");

    const isBlacklisted = await staking.blacklisted(wallet.address);
    console.log("Account blacklisted:", isBlacklisted);

    // 3. 检查锁定期选项
    const lockOptions = await staking.getLockOptions();
    console.log("Available lock options:", lockOptions.map(opt => ({
      period: opt.period.toString(),
      rewardRate: opt.rewardRate.toString()
    })));

    // 4. 使用30天的锁定期选项，质押金额设为最小质押金额
    const stakeAmount = minStakeAmount;  // 使用合约中设定的最小质押金额
    const THIRTY_DAYS = BigInt("2592000"); // 30天锁定期

    console.log(`\nPreparing to stake:`);
    console.log(`Amount: ${ethers.formatEther(stakeAmount)} HSK`);
    console.log(`Lock period: ${THIRTY_DAYS} seconds (30 days)`);

    // 5. 执行质押
    console.log("\nExecuting stake transaction...");
    
    const tx = await staking.stake(THIRTY_DAYS, {
      value: stakeAmount,
      gasLimit: 500000  // 添加固定的 gas 限制
    });

    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);

    // 6. 确认质押结果
    const positionCount = await staking.getUserPositionCount(wallet.address);
    const positions = await staking.getUserPositions(wallet.address);
    
    console.log("\nStaking Summary:");
    console.log("-------------------");
    console.log("Total positions:", positionCount);
    if (positions.length > 0) {
      console.log("Latest position:", {
        positionId: positions[positions.length - 1].positionId.toString(),
        amount: ethers.formatEther(positions[positions.length - 1].amount),
        lockPeriod: positions[positions.length - 1].lockPeriod.toString(),
        stakedAt: new Date(Number(positions[positions.length - 1].stakedAt) * 1000).toLocaleString(),
        isUnstaked: positions[positions.length - 1].isUnstaked
      });
    }

  } catch (error: any) {
    console.error("Staking failed:", error);
    if (error.error) {
      console.error("Error details:", error.error);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 