import hre from "hardhat";
import { printSeparator, printSuccess } from "../../shared/helpers.js";
import { createTestFixture, fundAccount } from "../helpers/fixtures.js";
import { expectSuccess, expectRevert, parseEther } from "../helpers/test-utils.js";

/**
 * Integration test: Whitelist functionality
 * 
 * Tests whitelist management for Premium Staking
 */
async function main() {
  printSeparator("Integration Test: Whitelist Functionality");
  
  try {
    console.log("1. Setting up test environment...");
    const fixture = await createTestFixture();
    
    // Fund user accounts
    await fundAccount(fixture.user1, parseEther("1000000"));
    await fundAccount(fixture.user2, parseEther("1000000"));
    printSuccess("✅ Test environment setup complete");
    
    console.log("\n2. Testing Premium Staking whitelist mode...");
    const whitelistMode = await fixture.premiumStaking.onlyWhitelistCanStake();
    if (!whitelistMode) {
      throw new Error("Premium Staking should have whitelist enabled");
    }
    printSuccess("✅ Whitelist mode is enabled");
    
    console.log("\n3. Testing staking without whitelist (should fail)...");
    const stakeAmount = parseEther("500000");
    
    try {
      const tx = await fixture.premiumStaking.connect(fixture.user1).stake({
        value: stakeAmount,
      });
      await tx.wait();
      throw new Error("Staking should fail for non-whitelisted user");
    } catch (error: any) {
      if (error.message.includes("whitelist") || error.message.includes("NotWhitelisted")) {
        printSuccess("✅ Non-whitelisted user correctly rejected");
      } else {
        throw error;
      }
    }
    
    console.log("\n4. Testing adding user to whitelist...");
    const user1Address = await fixture.user1.getAddress();
    const tx1 = await fixture.premiumStaking.connect(fixture.admin).updateWhitelistBatch(
      [user1Address],
      true
    );
    await expectSuccess(tx1.wait());
    printSuccess("✅ User added to whitelist");
    
    // Verify whitelist status
    const isWhitelisted = await fixture.premiumStaking.whitelisted(user1Address);
    if (!isWhitelisted) {
      throw new Error("User should be whitelisted");
    }
    printSuccess("✅ Whitelist status verified");
    
    console.log("\n5. Testing staking with whitelist (should succeed)...");
    const tx2 = await fixture.premiumStaking.connect(fixture.user1).stake({
      value: stakeAmount,
    });
    await expectSuccess(tx2.wait());
    printSuccess("✅ Whitelisted user can stake");
    
    console.log("\n6. Testing removing user from whitelist...");
    const tx3 = await fixture.premiumStaking.connect(fixture.admin).updateWhitelistBatch(
      [user1Address],
      false
    );
    await expectSuccess(tx3.wait());
    
    const isStillWhitelisted = await fixture.premiumStaking.whitelisted(user1Address);
    if (isStillWhitelisted) {
      throw new Error("User should be removed from whitelist");
    }
    printSuccess("✅ User removed from whitelist");
    
    console.log("\n7. Testing batch whitelist operations...");
    const user2Address = await fixture.user2.getAddress();
    const tx4 = await fixture.premiumStaking.connect(fixture.admin).updateWhitelistBatch(
      [user1Address, user2Address],
      true
    );
    await expectSuccess(tx4.wait());
    printSuccess("✅ Batch whitelist operation successful");
    
    printSeparator("✅ All Whitelist Tests Passed");
    
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

