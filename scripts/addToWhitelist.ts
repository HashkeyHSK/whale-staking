import { ethers } from "hardhat";

async function main() {
  try {
    // Contract address
    const stakingAddress = "0x03973a7814c0Fd55fadAEbE335beB573A274Dd7a"; // Proxy contract address
    console.log("Connecting to staking contract at:", stakingAddress);

    const stakingContract = await ethers.getContractAt("Layer2Staking", stakingAddress);

    // Address to be whitelisted
    const userAddress = "0x09753d34313975d25A71F5e9b1cD95A4D110332b";
    console.log("Adding address to whitelist:", userAddress);

    // Check if address is already whitelisted
    const isWhitelisted = await stakingContract.whitelisted(userAddress);
    if (isWhitelisted) {
      console.log("Address is already whitelisted");
      return;
    }

    // Add to whitelist
    console.log("Sending transaction...");
    const tx = await stakingContract.addToWhitelist(userAddress);
    console.log("Transaction sent:", tx.hash);
    
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log(`Successfully added ${userAddress} to whitelist`);

  } catch (error) {
    console.error("Error details:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exitCode = 1;
}); 