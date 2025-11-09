import { ethers, upgrades } from "hardhat";

/**
 * 测试部署脚本 - 仅用于开发和测试
 * 
 * 特点：
 * - 快速部署，最小化配置
 * - 设置 3 分钟质押截止时间（方便测试）
 * - 最小质押金额：100 HSK
 * - 不包含完整的生产环境配置
 * 
 * ⚠️ 注意：生产环境请使用：
 * - deployNormalStaking.ts (散户产品)
 * - deployPremiumStaking.ts (大户产品)
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("==========================================");
  console.log("测试部署 Layer2Staking");
  console.log("==========================================");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 部署 StakingLib
  const StakingLibFactory = await ethers.getContractFactory("StakingLib");
  const stakingLib = await StakingLibFactory.deploy();
  await stakingLib.waitForDeployment();
  const stakingLibAddress = await stakingLib.getAddress();
  console.log("\n✅ StakingLib 部署成功:", stakingLibAddress);

  // 部署 Layer2Staking，设置默认最小质押金额为 100 HSK
  const minStakeAmount = ethers.parseEther("100");
  const Layer2Staking = await ethers.getContractFactory("Layer2Staking", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });

  console.log(`\n初始化参数: 最小质押金额 = ${ethers.formatEther(minStakeAmount)} HSK`);
  
  const staking = await upgrades.deployProxy(
    Layer2Staking,
    [minStakeAmount],  // 在部署时设置最小质押金额
    {
      kind: 'uups',
      initializer: 'initialize',
      unsafeAllowLinkedLibraries: true,
    }
  );

  await staking.waitForDeployment();
  const proxyAddress = await staking.getAddress();
  console.log("✅ Layer2Staking 代理合约部署成功:", proxyAddress);
  console.log("✅ 最小质押金额:", ethers.formatEther(minStakeAmount), "HSK");

  // 设置质押截止时间为3分钟后（方便测试）
  const endTime = Math.floor(Date.now() / 1000) + 3 * 60;
  console.log(`\n设置质押截止时间: ${new Date(endTime * 1000).toLocaleString()} (3分钟后)`);
  const setEndTimeTx = await staking.setStakeEndTime(endTime);
  await setEndTimeTx.wait();
  console.log("✅ 质押截止时间设置完成");

  console.log("\n==========================================");
  console.log("✅ 测试部署完成！");
  console.log("==========================================");
  console.log("合约地址:", proxyAddress);
  console.log("\n⚠️  注意事项:");
  console.log("  - 这是测试部署，质押将在 3 分钟后截止");
  console.log("  - 需要手动配置锁定期选项才能进行质押");
  console.log("  - 白名单模式默认启用，需要添加白名单用户");
  console.log("\n📝 后续配置:");
  console.log("  - 添加锁定期: staking.addLockOption(period, rewardRate)");
  console.log("  - 添加白名单: 使用 addToWhitelist.ts");
  console.log("  - 充值奖励池: 使用 add-rewards.ts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

