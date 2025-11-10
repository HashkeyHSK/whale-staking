import { ethers, upgrades } from "hardhat";

/**
 * 部署普通 Staking 产品（委托质押）
 * - 面向普通用户
 * - 最小质押门槛：1 HSK
 * - 年化收益率：8%
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("==========================================");
  console.log("部署普通 Staking 产品（委托质押）");
  console.log("==========================================");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 部署 StakingLib
  const StakingLibFactory = await ethers.getContractFactory("StakingLib");
  const stakingLib = await StakingLibFactory.deploy();
  await stakingLib.waitForDeployment();
  const stakingLibAddress = await stakingLib.getAddress();
  console.log("\n✅ StakingLib 部署成功:", stakingLibAddress);

  // 部署 Layer2StakingV2，设置最小质押金额为 1 HSK
  const minStakeAmount = ethers.parseEther("1");
  const Layer2StakingV2 = await ethers.getContractFactory("Layer2StakingV2", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });

  console.log(`\n初始化参数: 最小质押金额 = ${ethers.formatEther(minStakeAmount)} HSK`);
  
  const staking = await upgrades.deployProxy(
    Layer2StakingV2,
    [minStakeAmount],  // 在部署时直接设置最小质押金额
    {
      kind: 'uups',
      initializer: 'initialize',
      unsafeAllowLinkedLibraries: true,
    }
  );

  await staking.waitForDeployment();
  const proxyAddress = await staking.getAddress();
  console.log("✅ 普通 Staking 代理合约部署成功:", proxyAddress);
  console.log("✅ 最小质押金额已在部署时设置完成");

  // 配置普通 Staking 产品参数
  console.log("\n配置普通 Staking 产品参数...");

  // 0. 设置质押开始时间
  const stakingStartTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7天后开始
  console.log("\n设置质押开始时间...");
  console.log(`开始时间: ${new Date(stakingStartTime * 1000).toISOString()}`);
  const setStartTimeTx = await staking.setStakeStartTime(stakingStartTime);
  await setStartTimeTx.wait();
  console.log("✅ 质押开始时间设置完成");

  // 1. 配置锁定期选项（8% APY）
  // 注意：最新版本仅保留 365 天锁定期，以下步骤确保链上存在该配置
  console.log("\n配置锁定期选项（年化 8%）...");
  
  const rewardRate = 800; // 8% = 800 basis points
  
  // 添加 365 天锁定期，8% APY
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

  // 2. 设置最大总质押量（可根据需要调整）
  const maxTotalStake = ethers.parseEther("10000000"); // 1000万 HSK
  console.log(`\n设置最大总质押量: ${ethers.formatEther(maxTotalStake)} HSK`);
  const setMaxTx = await staking.setMaxTotalStake(maxTotalStake);
  await setMaxTx.wait();
  console.log("✅ 最大总质押量设置完成");

  // 3. 关闭白名单模式（普通用户可自由质押）
  console.log("\n关闭白名单模式（允许所有用户质押）...");
  const setWhitelistTx = await staking.setWhitelistOnlyMode(false);
  await setWhitelistTx.wait();
  console.log("✅ 白名单模式已关闭");

  // 4. 验证配置
  console.log("\n==========================================");
  console.log("配置验证");
  console.log("==========================================");
  const minStake = await staking.minStakeAmount();
  const maxStake = await staking.maxTotalStake();
  const startTime = await staking.stakeStartTime();
  const whitelistMode = await staking.onlyWhitelistCanStake();
  const lockOptions = await staking.getLockOptions();

  console.log("最小质押金额:", ethers.formatEther(minStake), "HSK");
  console.log("最大总质押量:", ethers.formatEther(maxStake), "HSK");
  console.log("质押开始时间:", new Date(Number(startTime) * 1000).toISOString());
  console.log("白名单模式:", whitelistMode ? "启用" : "关闭");
  console.log("\n锁定期选项:");
  for (let i = 0; i < lockOptions.length; i++) {
    const days = Number(lockOptions[i].period) / (24 * 60 * 60);
    const apy = Number(lockOptions[i].rewardRate) / 100;
    console.log(`  ${i + 1}. ${days} 天 - 年化 ${apy}%`);
  }

  console.log("\n==========================================");
  console.log("✅ 普通 Staking 产品部署完成！");
  console.log("==========================================");
  console.log("合约地址:", proxyAddress);
  console.log("\n产品配置:");
  console.log("  - 产品类型: 普通 Staking（委托质押）");
  console.log("  - 目标用户: 普通用户");
  console.log("  - 最小质押: 1 HSK");
  console.log("  - 年化收益: 8%");
  console.log("  - 白名单模式: 关闭（所有用户可质押）");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

