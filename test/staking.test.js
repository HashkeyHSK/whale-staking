const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Layer2Staking", function () {
  let stakingContract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // 获取 StakingLib 的合约工厂
    const StakingLib = await ethers.getContractFactory("StakingLib");
    // 部署 StakingLib 并获取合约实例
    const stakingLib = await StakingLib.deploy();
    await stakingLib.waitForDeployment();

    // 获取 Layer2Staking 的合约工厂，并链接 StakingLib
    const Staking = await ethers.getContractFactory("Layer2Staking", {
      libraries: {
        StakingLib: await stakingLib.getAddress(),
      },
    });

    stakingContract = await Staking.deploy();
    await stakingContract.waitForDeployment();
    await stakingContract.initialize();
  });

  it("should log current time and stake end time", async function () {
    // 设置质押截止时间为未来的某个时间
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后
    await stakingContract.setStakeEndTime(futureTime);

    // 调用stake函数并观察控制台输出
    await stakingContract.connect(addr1).stake(3600, { value: ethers.utils.parseEther("1.0") });

    // 这里可以添加更多的断言来验证合约行为
  });
}); 