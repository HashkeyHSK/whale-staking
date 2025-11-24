import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction, parsePosition } from "../shared/helpers.js";

/**
 * Claim staking rewards (without unstaking)
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run claim:testnet or npm run claim:testnet 1");
  }

  printSeparator("Claim Rewards (Staking)");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query position information
  console.log("\nQuerying position information...");
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  if (position.owner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("This position does not belong to the current user");
  }

  if (position.isUnstaked) {
    throw new Error("This position has already been unstaked");
  }

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Last claim:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());

  // Query pending reward
  const pendingReward = await staking.pendingReward(positionId);
  console.log("\nPending reward:", ethers.formatEther(pendingReward), "HSK");

  if (pendingReward === BigInt(0)) {
    console.log("No reward available to claim");
    return;
  }

  console.log("\nExecuting claim reward...");
  
  // Execute claimReward
  const tx = await staking.claimReward(positionId);
  await waitForTransaction(tx, "Claim reward transaction");

  printSuccess(`Successfully claimed ${ethers.formatEther(pendingReward)} HSK reward!`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
