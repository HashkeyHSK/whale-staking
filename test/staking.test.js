const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Layer2Staking", function () {
  let stakingContract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // 部署 StakingLib 库
    const StakingLib = await ethers.getContractFactory("StakingLib");
    const stakingLib = await StakingLib.deploy();
    await stakingLib.waitForDeployment();

    // 获取 Layer2Staking 的合约工厂，并链接 StakingLib
    const Staking = await ethers.getContractFactory("Layer2Staking", {
      libraries: {
        StakingLib: await stakingLib.getAddress(),
      },
    });

    // 使用 upgrades 插件部署可升级合约，设置最小质押金额为 1 HSK
    const minStakeAmount = ethers.parseEther("1.0");
    stakingContract = await upgrades.deployProxy(
      Staking,
      [minStakeAmount],  // 在初始化时传入最小质押金额
      {
        initializer: "initialize",
        kind: "uups",
        unsafeAllowLinkedLibraries: true,
      }
    );
    await stakingContract.waitForDeployment();
  });

  it("should log current time and stake end time", async function () {
    // 最小质押金额已在部署时设置为 1 HSK
    
    // 添加锁定选项 (30 days = 2592000 seconds, 10% APY = 1000 basis points)
    const lockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
    await stakingContract.addLockOption(lockPeriod, 1000);
    
    // 设置质押截止时间为未来的某个时间
    const futureTime = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1年后
    await stakingContract.setStakeEndTime(futureTime);

    // 将 addr1 添加到白名单
    await stakingContract.addToWhitelist(addr1.address);
    
    // 添加奖励池资金
    await stakingContract.updateRewardPool({ value: ethers.parseEther("1000.0") });

    // 现在可以用 1 HSK 进行质押了
    const stakeAmount = ethers.parseEther("1.0");
    const tx = await stakingContract.connect(addr1).stake(lockPeriod, { value: stakeAmount });
    await tx.wait();
    
    // 验证质押成功
    const positions = await stakingContract.getUserPositions(addr1.address);
    expect(positions.length).to.equal(1);
    expect(positions[0].amount).to.equal(stakeAmount);
    expect(positions[0].lockPeriod).to.equal(lockPeriod);
    
    console.log("✓ Staking successful!");
    console.log("  Position ID:", positions[0].positionId.toString());
    console.log("  Staked Amount:", ethers.formatEther(positions[0].amount), "HSK");
    console.log("  Lock Period:", lockPeriod / (24 * 60 * 60), "days");
    console.log("  Staked At:", new Date(Number(positions[0].stakedAt) * 1000).toISOString());
  });
}); 