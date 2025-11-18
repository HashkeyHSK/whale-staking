import hre from "hardhat";
import { printSeparator, printSuccess } from "../../shared/helpers.js";
import { createTestFixture, advanceTime } from "../helpers/fixtures.js";
import { expectSuccess, expectBigIntEqual, parseEther } from "../helpers/test-utils.js";

/**
 * Integration test: Deploy contracts
 * 
 * Tests the deployment of Normal and Premium Staking contracts
 */
async function main() {
  printSeparator("Integration Test: Deploy Contracts");
  
  try {
    console.log("1. Creating test fixture...");
    const fixture = await createTestFixture();
    printSuccess("✅ Test fixture created");
    
    console.log("\n2. Testing Normal Staking deployment...");
    const normalMinStake = await fixture.normalStaking.minStakeAmount();
    const normalRewardRate = await fixture.normalStaking.rewardRate();
    const normalWhitelistMode = await fixture.normalStaking.onlyWhitelistCanStake();
    const normalMaxTotalStaked = await fixture.normalStaking.maxTotalStaked();
    
    expectBigIntEqual(normalMinStake, parseEther("1"), "Normal min stake should be 1 HSK");
    expectBigIntEqual(normalRewardRate, BigInt(800), "Normal reward rate should be 8%");
    expectBigIntEqual(normalMaxTotalStaked, parseEther("10000000"), "Normal max total staked should be 10,000,000 HSK");
    if (normalWhitelistMode) {
      throw new Error("Normal staking should have whitelist disabled");
    }
    printSuccess("✅ Normal Staking deployment verified");
    
    console.log("\n3. Testing Premium Staking deployment...");
    const premiumMinStake = await fixture.premiumStaking.minStakeAmount();
    const premiumRewardRate = await fixture.premiumStaking.rewardRate();
    const premiumWhitelistMode = await fixture.premiumStaking.onlyWhitelistCanStake();
    const premiumMaxTotalStaked = await fixture.premiumStaking.maxTotalStaked();
    
    expectBigIntEqual(premiumMinStake, parseEther("500000"), "Premium min stake should be 500,000 HSK");
    expectBigIntEqual(premiumRewardRate, BigInt(1600), "Premium reward rate should be 16%");
    expectBigIntEqual(premiumMaxTotalStaked, parseEther("20000000"), "Premium max total staked should be 20,000,000 HSK");
    if (!premiumWhitelistMode) {
      throw new Error("Premium staking should have whitelist enabled");
    }
    printSuccess("✅ Premium Staking deployment verified");
    
    console.log("\n4. Testing contract initialization...");
    const normalTotalStaked = await fixture.normalStaking.totalStaked();
    const premiumTotalStaked = await fixture.premiumStaking.totalStaked();
    
    expectBigIntEqual(normalTotalStaked, BigInt(0), "Normal total staked should be 0");
    expectBigIntEqual(premiumTotalStaked, BigInt(0), "Premium total staked should be 0");
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

