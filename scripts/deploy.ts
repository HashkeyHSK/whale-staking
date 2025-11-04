import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 StakingLib
  const StakingLibFactory = await ethers.getContractFactory("StakingLib");
  const stakingLib = await StakingLibFactory.deploy();
  await stakingLib.waitForDeployment();
  const stakingLibAddress = await stakingLib.getAddress();
  console.log("StakingLib deployed to:", stakingLibAddress);

  // 部署 Layer2Staking
  const Layer2Staking = await ethers.getContractFactory("Layer2Staking", {
    libraries: {
      StakingLib: stakingLibAddress,
    },
  });

  const staking = await upgrades.deployProxy(
    Layer2Staking,
    [],
    {
      kind: 'uups',
      initializer: 'initialize',
      unsafeAllowLinkedLibraries: true,
    }
  );

  await staking.waitForDeployment();
  const proxyAddress = await staking.getAddress();
  console.log("Layer2Staking proxy deployed to:", proxyAddress);

  // 设置质押截止时间为3分钟后
  const endTime = Math.floor(Date.now() / 1000) + 3 * 60;
  console.log(`Setting stake end time to: ${new Date(endTime * 1000).toLocaleString()}`);
  const setEndTimeTx = await staking.setStakeEndTime(endTime);
  await setEndTimeTx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 