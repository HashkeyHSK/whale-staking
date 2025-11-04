import { ethers } from "hardhat";

async function main() {
  // 合约地址
  const stakingAddress = "0xd41CEeEd9118B6C55D951E364d514D00413FD497"; // 代理合约地址
  const stakingContract = await ethers.getContractAt("Layer2Staking", stakingAddress);

  // 获取质押截止时间
  const stakeEndTime = await stakingContract.stakeEndTime();
  // 将时间戳转换为可读日期
  const endDate = new Date(Number(stakeEndTime) * 1000);

  // 显示为本地时间
  console.log(`质押截止时间 (本地时间): ${endDate.toLocaleString()}`);

  // 显示为北京时间 (手动调整为 UTC+8)
  const beijingTime = new Date(endDate.getTime() + 8 * 60 * 60 * 1000);
  console.log(`质押截止时间 (北京时间): ${beijingTime.toUTCString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 