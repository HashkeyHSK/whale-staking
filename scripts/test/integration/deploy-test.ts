import hre from "hardhat";
import { printSeparator, printSuccess } from "../../shared/helpers.js";
import { createTestFixture, advanceTime } from "../helpers/fixtures.js";
import { expectSuccess, expectBigIntEqual, parseEther } from "../helpers/test-utils.js";

/**
 * Integration test: Deploy contracts
 * 
 * Tests the deployment of Staking contract
 */
async function main() {
  printSeparator("Integration Test: Deploy Contracts");
  
  try {
    console.log("1. Creating test fixture...");
    const fixture = await createTestFixture();
    printSuccess("✅ Test fixture created");
    
    console.log("\n2. Testing Staking deployment...");
    const minStake = await fixture.staking.minStakeAmount();
    const rewardRate = await fixture.staking.rewardRate();
    const whitelistMode = await fixture.staking.onlyWhitelistCanStake();
    const maxTotalStaked = await fixture.staking.maxTotalStaked();
    
    expectBigIntEqual(minStake, parseEther("1000"), "Min stake should be 1000 HSK");
    expectBigIntEqual(rewardRate: 500), "Reward rate should be 5%");
    expectBigIntEqual(maxTotalStaked, parseEther("30000000"), "Max total staked should be 30,000,000 HSK");
    if (whitelistMode) {
      throw new Error("Staking should have whitelist disabled");
    }
    printSuccess("✅ Staking deployment verified");
    
    console.log("\n3. Testing contract initialization...");
    const totalStaked = await fixture.staking.totalStaked();
    
    expectBigIntEqual(totalStaked, BigInt(0), "Total staked should be 0");
    printSuccess("✅ Contract initialization verified");
    
    printSeparator("✅ All Deployment Tests Passed");
    
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

