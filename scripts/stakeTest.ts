import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const proxyAddress = "0x4cdfE3e5e1062Bf537e61f73bD1b93364EE9B49E";
  const stakingLibAddress = "0xF9642D2A3d67ccf44C4686209Fe1c6F8A576Fe54"; // 使用您部署的 StakingLib 合约的地址

  console.log("Connecting to Layer2Staking contract at:", proxyAddress);

  // 获取 Layer2Staking 合约实例
  const Layer2Staking = await ethers.getContractFactory("Layer2Staking", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });
  const staking = Layer2Staking.attach(proxyAddress);

  try {
    console.log("Attempting to stake...");
    //@ts-ignore
    const stakeTx = await staking.stake(3600, { value: ethers.parseEther("1.0") });
    await stakeTx.wait();
    console.log("Stake successful!");
  } catch (error) {
    console.error("Failed to stake:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 