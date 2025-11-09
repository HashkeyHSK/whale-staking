import { ethers, upgrades } from "hardhat";

/**
 * 部署 Premium Staking 产品（高级质押）
 * - 面向大户/机构
 * - 最小质押门槛：50万 HSK
 * - 年化收益率：16%
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("==========================================");
  console.log("部署 Premium Staking 产品（高级质押）");
  console.log("==========================================");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 部署 StakingLib
  const StakingLibFactory = await ethers.getContractFactory("StakingLib");
  const stakingLib = await StakingLibFactory.deploy();
  await stakingLib.waitForDeployment();
  const stakingLibAddress = await stakingLib.getAddress();
  console.log("\n✅ StakingLib 部署成功:", stakingLibAddress);

  // 部署 Layer2StakingV2
  const Layer2StakingV2 = await ethers.getContractFactory("Layer2StakingV2", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });

  const staking = await upgrades.deployProxy(
    Layer2StakingV2,
    [],
    {
      kind: 'uups',
      initializer: 'initialize',
      unsafeAllowLinkedLibraries: true,
    }
  );

  await staking.waitForDeployment();
  const proxyAddress = await staking.getAddress();
  console.log("✅ Premium Staking 代理合约部署成功:", proxyAddress);

  // 配置 Premium Staking 产品参数
  console.log("\n配置 Premium Staking 产品参数...");
  
  // 1. 设置最小质押金额：50万 HSK
  const minStakeAmount = ethers.parseEther("500000");
  console.log(`设置最小质押金额: ${ethers.formatEther(minStakeAmount)} HSK`);
  const setMinTx = await staking.setMinStakeAmount(minStakeAmount);
  await setMinTx.wait();
  console.log("✅ 最小质押金额设置完成");

  // 2. 配置锁定期选项（16% APY）
  console.log("\n配置锁定期选项（年化 16%）...");
  
  const rewardRate = 1600; // 16% = 1600 basis points
  
  // 添加 365 天锁定期，16% APY
  const lockPeriod = 365 * 24 * 60 * 60; // 365 天
  console.log(`添加锁定期: 365 天, 年化 ${rewardRate/100}%`);
  try {
    await staking.addLockOption(lockPeriod, rewardRate);
    console.log("✅ 锁定期 365 天添加成功");
  } catch (e: any) {
    if (e.message?.includes("Invalid period") || e.message?.includes("already exists")) {
      console.log("⚠️  锁定期 365 天已存在，跳过");
    } else {
      throw e;
    }
  }


  // 3. 设置最大总质押量（可根据需要调整）
  const maxTotalStake = ethers.parseEther("20000000"); // 2千万 HSK
  console.log(`\n设置最大总质押量: ${ethers.formatEther(maxTotalStake)} HSK`);
  const setMaxTx = await staking.setMaxTotalStake(maxTotalStake);
  await setMaxTx.wait();
  console.log("✅ 最大总质押量设置完成");

  // 4. 启用白名单模式（仅允许大户/机构质押）
  console.log("\n启用白名单模式（仅允许授权用户质押）...");
  const setWhitelistTx = await staking.setWhitelistOnlyMode(true);
  await setWhitelistTx.wait();
  console.log("✅ 白名单模式已启用");
  console.log("⚠️  注意: 需要手动添加白名单用户才能质押");

  // 5. 验证配置
  console.log("\n==========================================");
  console.log("配置验证");
  console.log("==========================================");
  const minStake = await staking.minStakeAmount();
  const maxStake = await staking.maxTotalStake();
  const whitelistMode = await staking.onlyWhitelistCanStake();
  const lockOptions = await staking.getLockOptions();

  console.log("最小质押金额:", ethers.formatEther(minStake), "HSK");
  console.log("最大总质押量:", ethers.formatEther(maxStake), "HSK");
  console.log("白名单模式:", whitelistMode ? "启用" : "关闭");
  console.log("\n锁定期选项:");
  for (let i = 0; i < lockOptions.length; i++) {
    const days = Number(lockOptions[i].period) / (24 * 60 * 60);
    const apy = Number(lockOptions[i].rewardRate) / 100;
    console.log(`  ${i + 1}. ${days} 天 - 年化 ${apy}%`);
  }

  console.log("\n==========================================");
  console.log("✅ Premium Staking 产品部署完成！");
  console.log("==========================================");
  console.log("合约地址:", proxyAddress);
  console.log("\n产品配置:");
  console.log("  - 产品类型: Premium Staking（高级质押）");
  console.log("  - 目标用户: 大户/机构");
  console.log("  - 最小质押: 500,000 HSK");
  console.log("  - 年化收益: 16%");
  console.log("  - 白名单模式: 启用（需要授权）");
  console.log("\n⚠️  下一步操作:");
  console.log("  1. 使用 addToWhitelist.ts 添加授权用户");
  console.log("  2. 使用 add-rewards.ts 向奖励池充值");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

