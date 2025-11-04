import { ethers } from "hardhat";

async function main() {
  // 合约地址
  const stakingAddress = "0x354cC80C0eA01C4fD062913a3EE0076Ba2d65783"; // 代理合约地址
  const stakingContract = await ethers.getContractAt("Layer2Staking", stakingAddress);

  // 获取用户地址（假设你有用户地址）
  const userAddress = "0x66F75DCA1d49bD95b8579d1B16727A81839c987C";


  // 获取用户的所有质押位置
  const positions = await stakingContract.getUserPositions(userAddress);

  // 打印每个质押位置的详细信息
  positions.forEach((position: any, index: number) => {
    const stakedAtDate = new Date(Number(position.stakedAt) * 1000);
    console.log(`质押位置 ${index + 1}:`);
    console.log(`  质押数量: ${ethers.formatEther(position.amount)} ETH`);
    console.log(`  质押时间: ${stakedAtDate.toUTCString()}`);
    console.log(`  锁定期: ${position.lockPeriod} 秒`);
    console.log(`  是否已解锁: ${position.isUnstaked}`);
    console.log('-----------------------------');
  });

  // 打印质押截止时间
  const stakeEndTime = await stakingContract.stakeEndTime();
  const stakeEndDate = new Date(Number(stakeEndTime) * 1000);
  console.log(`质押截止时间: ${stakeEndDate.toUTCString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 