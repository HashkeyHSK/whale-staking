import hre from "hardhat";
import { printSeparator, printSuccess } from "../../shared/helpers.js";
import { createTestFixture, advanceTime, fundAccount } from "../helpers/fixtures.js";
import { expectSuccess, expectBigIntEqual, expectRevert, parseEther, formatEther } from "../helpers/test-utils.js";

/**
 * Integration test: Staking operations
 * 
 * Tests staking, claiming rewards, and unstaking functionality
 */
async function main() {
  printSeparator("Integration Test: Staking Operations");
  
  try {
    console.log("1. Setting up test environment...");
    const fixture = await createTestFixture();
    
    // Fund user accounts
    await fundAccount(fixture.user1, parseEther("1000"));
    await fundAccount(fixture.user2, parseEther("1000"));
    printSuccess("✅ Test environment setup complete");
    
    console.log("\n2. Testing Staking...");
    
    // Test staking
    const stakeAmount = parseEther("10");
    const tx1 = await fixture.staking.connect(fixture.user1).stake({
      value: stakeAmount,
    });
    await expectSuccess(tx1.wait());
    printSuccess("✅ Staking successful");
    
    // Verify position created
    const nextId = await fixture.staking.nextPositionId();
    const positionId = nextId - BigInt(1);
    const position = await fixture.staking.positions(positionId);
    expectBigIntEqual(position.amount, stakeAmount, "Position amount should match");
    printSuccess("✅ Position created correctly");
    
    // Advance time to accumulate rewards
    console.log("\n3. Testing reward accumulation...");
    await advanceTime(30 * 24 * 60 * 60); // 30 days
    
    const pendingReward = await fixture.staking.pendingReward(positionId);
    if (pendingReward <= BigInt(0)) {
      throw new Error("Pending reward should be greater than 0 after 30 days");
    }
    console.log(`   Pending reward: ${formatEther(pendingReward)} HSK`);
    printSuccess("✅ Rewards accumulated correctly");
    
    // Test claiming rewards
    console.log("\n4. Testing claim rewards...");
    const tx2 = await fixture.staking.connect(fixture.user1).claimReward(positionId);
    await expectSuccess(tx2.wait());
    printSuccess("✅ Rewards claimed successfully");
    
    // Advance time to unlock period
    console.log("\n5. Testing unstaking...");
    await advanceTime(335 * 24 * 60 * 60); // Remaining days to reach 365 days total
    
    const tx3 = await fixture.staking.connect(fixture.user1).unstake(positionId);
    await expectSuccess(tx3.wait());
    printSuccess("✅ Unstaking successful");
    
    // Verify position is unstaked
    const updatedPosition = await fixture.staking.positions(positionId);
    if (!updatedPosition.isUnstaked) {
      throw new Error("Position should be marked as unstaked");
    }
    printSuccess("✅ Position marked as unstaked");
    
    printSeparator("✅ All Staking Tests Passed");
    
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

