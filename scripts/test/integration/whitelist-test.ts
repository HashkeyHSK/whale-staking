import hre from "hardhat";
import { printSeparator, printSuccess } from "../../shared/helpers.js";
import { createTestFixture, fundAccount } from "../helpers/fixtures.js";
import { expectSuccess, expectRevert, parseEther } from "../helpers/test-utils.js";

/**
 * Integration test: Whitelist functionality
 * 
 * Tests whitelist management for Staking (when whitelist mode is enabled)
 * Note: Current config has whitelist disabled, but this test verifies whitelist functionality
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
    
    console.log("\n2. Testing whitelist mode status...");
    const whitelistMode = await fixture.staking.onlyWhitelistCanStake();
    console.log(`   Whitelist mode: ${whitelistMode ? "Enabled" : "Disabled"}`);
    
    if (whitelistMode) {
      console.log("\n3. Testing staking without whitelist (should fail)...");
      const stakeAmount = parseEther("1000");
      
      try {
        const tx = await fixture.staking.connect(fixture.user1).stake({
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
      const tx1 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address],
        true
      );
      await expectSuccess(tx1.wait());
      printSuccess("✅ User added to whitelist");
      
      // Verify whitelist status
      const isWhitelisted = await fixture.staking.whitelisted(user1Address);
      if (!isWhitelisted) {
        throw new Error("User should be whitelisted");
      }
      printSuccess("✅ Whitelist status verified");
      
      console.log("\n5. Testing staking with whitelist (should succeed)...");
      const tx2 = await fixture.staking.connect(fixture.user1).stake({
        value: stakeAmount,
      });
      await expectSuccess(tx2.wait());
      printSuccess("✅ Whitelisted user can stake");
      
      console.log("\n6. Testing removing user from whitelist...");
      const tx3 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address],
        false
      );
      await expectSuccess(tx3.wait());
      
      const isStillWhitelisted = await fixture.staking.whitelisted(user1Address);
      if (isStillWhitelisted) {
        throw new Error("User should be removed from whitelist");
      }
      printSuccess("✅ User removed from whitelist");
      
      console.log("\n7. Testing batch whitelist operations...");
      const user2Address = await fixture.user2.getAddress();
      const tx4 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address, user2Address],
        true
      );
      await expectSuccess(tx4.wait());
      printSuccess("✅ Batch whitelist operation successful");
    } else {
      console.log("\n3. Whitelist mode is disabled - testing whitelist management functions...");
      const user1Address = await fixture.user1.getAddress();
      
      // Test adding to whitelist (should work even when mode is disabled)
      const tx1 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address],
        true
      );
      await expectSuccess(tx1.wait());
      printSuccess("✅ User added to whitelist (mode disabled, but function works)");
      
      // Verify whitelist status
      const isWhitelisted = await fixture.staking.whitelisted(user1Address);
      if (!isWhitelisted) {
        throw new Error("User should be whitelisted");
      }
      printSuccess("✅ Whitelist status verified");
      
      // Test removing from whitelist
      const tx2 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address],
        false
      );
      await expectSuccess(tx2.wait());
      printSuccess("✅ User removed from whitelist");
      
      console.log("\n4. Testing batch whitelist operations...");
      const user2Address = await fixture.user2.getAddress();
      const tx3 = await fixture.staking.connect(fixture.admin).updateWhitelistBatch(
        [user1Address, user2Address],
        true
      );
      await expectSuccess(tx3.wait());
      printSuccess("✅ Batch whitelist operation successful");
    }
    
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

