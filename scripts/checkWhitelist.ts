import { ethers } from "hardhat";

async function main() {
  // 合约地址
  const stakingAddress = "0xd41CEeEd9118B6C55D951E364d514D00413FD497"; // 代理合约地址
  const stakingContract = await ethers.getContractAt("Layer2Staking", stakingAddress);

  // 要检查的用户地址
  const userAddress = "0xb4c5c6fa1d85833d6eec6ae87abd21a7dda9b665";

  // 调用合约的 whitelisted 函数
  const isWhitelisted = await stakingContract.whitelisted(userAddress);

  if (isWhitelisted) {
    console.log(`用户 ${userAddress} 在白名单中`);
  } else {
    console.log(`用户 ${userAddress} 不在白名单中`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 