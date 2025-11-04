import { ethers } from "hardhat";

async function main() {
  // 代理合约地址 - 请替换为您的代理合约地址
  const proxyAddress = "0x6edd7f1EF78D62dB893c267ccb539fACE6bb107e";
  console.log("Verifying contract state at:", proxyAddress);

  // 连接到合约
  const staking = await ethers.getContractAt("Layer2Staking", proxyAddress);

  // 获取并显示合约状态
  console.log("\n--- Contract State ---");
  
  // 版本信息
  const version = await staking.version();
  console.log(`Contract version: ${version}`);
  
  // 质押参数
  const totalStaked = await staking.totalStaked();
  console.log(`Total staked: ${ethers.formatEther(totalStaked)} ETH`);
  
  const maxTotalStake = await staking.maxTotalStake();
  console.log(`Max total stake: ${ethers.formatEther(maxTotalStake)} ETH`);
  
  const minStakeAmount = await staking.minStakeAmount();
  console.log(`Min stake amount: ${ethers.formatEther(minStakeAmount)} ETH`);
  
  // 质押截止时间
  const stakeEndTime = await staking.stakeEndTime();
  console.log(`Stake end time: ${new Date(Number(stakeEndTime) * 1000).toLocaleString()}`);
  
  // 锁定期选项
  const lockOptions = await staking.getLockOptions();
  console.log("Lock options:");
  for (let i = 0; i < lockOptions.length; i++) {
    const period = Number(lockOptions[i].period);
    const rate = Number(lockOptions[i].rewardRate);
    console.log(`  Option ${i+1}: ${period / (24*60*60)} days, ${rate/100}% APY`);
  }
  
  // 奖励池信息
  const rewardPoolBalance = await staking.rewardPoolBalance();
  console.log(`Reward pool balance: ${ethers.formatEther(rewardPoolBalance)} ETH`);
  
  const totalPendingRewards = await staking.totalPendingRewards();
  console.log(`Total pending rewards: ${ethers.formatEther(totalPendingRewards)} ETH`);
  
  // 白名单模式
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();
  console.log(`Whitelist-only mode: ${onlyWhitelistCanStake ? "Enabled" : "Disabled"}`);
  
  // 紧急模式
  const emergencyMode = await staking.emergencyMode();
  console.log(`Emergency mode: ${emergencyMode ? "Enabled" : "Disabled"}`);
  
  console.log("--- End of Contract State ---\n");
  
  console.log("Verification completed. Save this output to compare with post-upgrade state.");
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});