import { ethers } from "hardhat";
import { Layer2Staking } from "../typechain-types";

async function main() {
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log(`Adding rewards with the account: ${deployer.address}`);

  // 合约地址 - 请替换为实际部署的合约地址
  const contractAddress = "0x6edd7f1EF78D62dB893c267ccb539fACE6bb107e";
  console.log(`Target contract: ${contractAddress}`);

  // 连接到已部署的合约
  const staking = await ethers.getContractAt("Layer2Staking", contractAddress) as Layer2Staking;

  // 添加奖励
  const rewardAmount = ethers.parseEther("10"); // 添加10个代币作为奖励
  console.log(`Adding ${ethers.formatEther(rewardAmount)} tokens as rewards...`);
  
  // 使用updateRewardPool函数添加奖励
  const tx = await staking.updateRewardPool({ value: rewardAmount });
  await tx.wait();
  
  console.log("Rewards added successfully!");
  
  // 获取当前奖励池余额
  const rewardPoolBalance = await staking.rewardPoolBalance();
  console.log(`Current reward pool balance: ${ethers.formatEther(rewardPoolBalance)}`);
}

// 执行主函数并处理错误
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 