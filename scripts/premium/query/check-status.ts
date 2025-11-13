import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator } from "../../shared/helpers.js";

/**
 * Query Premium Staking contract status
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  printSeparator("Premium Staking Contract Status Query");
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query contract status
  const isPaused = await staking.paused();
  const emergencyMode = await staking.emergencyMode();
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();
  const totalStaked = await staking.totalStaked();
  const rewardPoolBalance = await staking.rewardPoolBalance();
  const totalPendingRewards = await staking.totalPendingRewards();
  const minStakeAmount = await staking.minStakeAmount();
  const rewardRate = await staking.rewardRate();
  const stakeStartTime = await staking.stakeStartTime();
  const stakeEndTime = await staking.stakeEndTime();
  const nextPositionId = await staking.nextPositionId();

  console.log("\nContract status:");
  console.log("  - Paused:", isPaused);
  console.log("  - Emergency mode:", emergencyMode);
  console.log("  - Whitelist mode:", onlyWhitelistCanStake ? "Enabled ✅" : "Disabled");
  console.log("  - Total staked:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("  - Total pending rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Available reward balance:", ethers.formatEther(rewardPoolBalance - totalPendingRewards), "HSK");
  console.log("  - Min stake amount:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("  - APY:", Number(rewardRate) / 100, "%");
  console.log("  - Lock period: 365 days (fixed)");
  console.log("  - Stake start time:", new Date(Number(stakeStartTime) * 1000).toISOString());
  console.log("  - Stake end time:", new Date(Number(stakeEndTime) * 1000).toISOString());
  console.log("  - Next Position ID:", nextPositionId.toString());

  printSeparator();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

