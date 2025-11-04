// scripts/verify.ts
import { run } from "hardhat";

async function verify() {
  try {
    // 替换为实际部署的地址
    const STAKING_LIB_ADDRESS = "YOUR_STAKING_LIB_ADDRESS";
    const IMPLEMENTATION_ADDRESS = "YOUR_IMPLEMENTATION_ADDRESS";

    // 验证库合约
    console.log("Verifying StakingLib...");
    try {
      await run("verify:verify", {
        address: STAKING_LIB_ADDRESS,
        contract: "contracts/libraries/StakingLib.sol:StakingLib",
      });
    } catch (err) {
      console.log("StakingLib verification failed:", err);
    }

    // 验证实现合约
    console.log("Verifying implementation contract...");
    try {
      await run("verify:verify", {
        address: IMPLEMENTATION_ADDRESS,
        contract: "contracts/Staking.sol:Layer2Staking",
        constructorArguments: [],
        libraries: {
          StakingLib: STAKING_LIB_ADDRESS,
        },
      });
    } catch (err) {
      console.log("Implementation verification failed:", err);
    }

  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

verify().catch((error) => {
  console.error(error);
  process.exit(1);
});