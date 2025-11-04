import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Upgrading contract with the account:", deployer.address);

  // 代理合约地址 - 请替换为您的代理合约地址
  const proxyAddress = "0x5F1Fb4212727f436E83A2923b43a6d00b62455F8";
  console.log("Proxy contract address:", proxyAddress);

  // 部署新版本的 StakingLib
  console.log("Deploying new StakingLib...");
  const StakingLibFactory = await ethers.getContractFactory("StakingLib");
  const stakingLib = await StakingLibFactory.deploy();
  await stakingLib.waitForDeployment();
  const stakingLibAddress = await stakingLib.getAddress();
  console.log("New StakingLib deployed to:", stakingLibAddress);

  // 准备新版本的 Layer2StakingV2 实现合约
  console.log("Preparing new implementation contract...");
  const Layer2StakingV2Factory = await ethers.getContractFactory("Layer2StakingV2", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });

  // 升级代理合约
  console.log("Upgrading proxy...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Layer2StakingV2Factory, {
    unsafeAllowLinkedLibraries: true,
  });

  await upgraded.waitForDeployment();
  console.log("Proxy upgraded successfully!");

  // 获取新的实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("New implementation address:", implementationAddress);

  // 验证合约版本
  const version = await upgraded.version();
  console.log("Contract version:", version);

  console.log("🎉：Upgrade completed successfully!");
}

main().catch((error) => {
  console.error("Error during upgrade:", error);
  process.exit(1);
}); 