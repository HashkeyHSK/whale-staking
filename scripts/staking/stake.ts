import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction, parsePosition } from "../shared/helpers.js";

/**
 * Stake HSK to Staking contract
 * Note: Lock period is fixed at 365 days, stake function doesn't need lockPeriod parameter
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  
  // Get contract address from environment variable or use address from config
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Execute Staking");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check contract status
  console.log("\nChecking contract status...");
  const isPaused = await staking.paused();
  const minStakeAmount = await staking.minStakeAmount();
  const rewardRate = await staking.rewardRate();
  const stakeStartTime = await staking.stakeStartTime();
  const stakeEndTime = await staking.stakeEndTime();
  const balance = await ethers.provider.getBalance(user.address);
  const now = Math.floor(Date.now() / 1000);

  console.log("Contract paused:", isPaused);
  console.log("Min stake amount:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("APY:", Number(rewardRate) / 100, "%");
  console.log("Lock period: 365 days (fixed)");
  console.log("Stake start time:", new Date(Number(stakeStartTime) * 1000).toLocaleString());
  console.log("Stake end time:", new Date(Number(stakeEndTime) * 1000).toLocaleString());
  console.log("User balance:", ethers.formatEther(balance), "HSK");

  // Check various statuses
  if (isPaused) {
    throw new Error("Contract is paused, cannot stake");
  }

  if (now < Number(stakeStartTime)) {
    const waitDays = Math.ceil((Number(stakeStartTime) - now) / (24 * 60 * 60));
    throw new Error(
      `Staking has not started yet!\n` +
      `Start time: ${new Date(Number(stakeStartTime) * 1000).toLocaleString()}\n` +
      `Please wait approximately ${waitDays} days`
    );
  }

  if (now >= Number(stakeEndTime)) {
    throw new Error(
      `Staking period has ended!\n` +
      `End time: ${new Date(Number(stakeEndTime) * 1000).toLocaleString()}`
    );
  }

  // Set stake amount (read from environment variable, or use 10x min amount)
  const stakeAmountEther = process.env.STAKE_AMOUNT || ethers.formatEther(minStakeAmount * BigInt(10));
  const stakeAmount = ethers.parseEther(stakeAmountEther);
  
  // Estimate gas fee (rough estimate)
  const estimatedGas = ethers.parseEther("0.01"); // Reserve 0.01 HSK for gas
  const totalNeeded = stakeAmount + estimatedGas;
  
  if (balance < totalNeeded) {
    throw new Error(
      `Insufficient balance!\n` +
      `Required: ${ethers.formatEther(stakeAmount)} HSK (stake) + ~0.01 HSK (gas) = ${ethers.formatEther(totalNeeded)} HSK\n` +
      `Current balance: ${ethers.formatEther(balance)} HSK`
    );
  }

  console.log(`\nPreparing to stake ${ethers.formatEther(stakeAmount)} HSK...`);
  console.log(`Lock period: 365 days`);

  // Execute stake (no need to pass lockPeriod parameter)
  const tx = await staking.stake({
    value: stakeAmount,
    gasLimit: 500000,
  });

  await waitForTransaction(tx, "Stake transaction");
  printSuccess("Staking successful!");

  // Query staking information
  console.log("\nQuerying staking information...");
  // Note: userPositions is a public mapping, requires multiple calls to get array elements
  // Use getUserPositionIds(address) to get all user position IDs
  try {
    // Get latest positionId (inferred from nextPositionId)
    const nextId = await staking.nextPositionId();
    const positionId = nextId - BigInt(1); // Last created position
    
    const positionRaw = await staking.positions(positionId);
    const position = parsePosition(positionRaw);
    
    if (position.owner.toLowerCase() === user.address.toLowerCase()) {
      console.log("\nLatest staking information:");
      console.log("  - Position ID:", positionId.toString());
      console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
      console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
      console.log("  - Last reward claim time:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());
      console.log("  - Lock period: 365 days (fixed)");
      console.log("  - APY:", Number(rewardRate) / 100, "%");
      console.log("  - Is unstaked:", position.isUnstaked);
      
      // Query pending reward
      const pending = await staking.pendingReward(positionId);
      console.log("  - Pending reward:", ethers.formatEther(pending), "HSK");
    }
  } catch (error) {
    console.log("Failed to query staking information:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
