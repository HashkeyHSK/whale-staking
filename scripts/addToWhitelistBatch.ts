import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  try {
    // 合约地址 - 请替换为您的合约地址
    const stakingAddress = "0x6edd7f1EF78D62dB893c267ccb539fACE6bb107e"; 
    console.log("Connecting to staking contract at:", stakingAddress);

    const stakingContract = await ethers.getContractAt("Layer2Staking", stakingAddress);

    // 方法1: 直接在脚本中指定地址列表
    const addresses = [
      "0x66F75DCA1d49bD95b8579d1B16727A81839c987C",
      "0x411C59723ED6Df5B02f71E3B05aA503f7ceC74AD",
      "0x2cc93F2049ABDe3a9811feF177A21799af49a720",
      "0x2cc93F2049ABDe3a9811feF177A21799af49a720",
      "0x1B26c694eC1a51f7d1dF36541C1CE6cd571931CF",
      "0x31f77E955E851AFFd2F5b00238D76cE2133b0aeA",
      "0x0C02d6B2933fDd2Af06009D1aEd8fe58c1A714c9"
    ];

    // 方法2: 从文件中读取地址列表 (每行一个地址)
    // 取消注释下面的代码以从文件读取地址
    /*
    const filePath = path.join(__dirname, "../whitelist-addresses.txt");
    const fileContent = fs.readFileSync(filePath, "utf8");
    const addresses = fileContent
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && line.startsWith("0x") && line.length === 42);
    */

    // 移除重复地址
    const uniqueAddresses = [...new Set(addresses)];
    console.log(`Found ${uniqueAddresses.length} unique addresses to add to whitelist`);
    
    // 检查地址数量是否超过批处理限制
    const batchSize = 100; // 合约限制每批最多100个地址
    
    // 将地址分成多个批次
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
      const batch = uniqueAddresses.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} addresses...`);
      
      // 直接添加到白名单，跳过检查步骤
      console.log(`Adding ${batch.length} addresses to whitelist...`);
      
      try {
        // 添加到白名单
        const tx = await stakingContract.addToWhitelistBatch(batch);
        console.log("Transaction sent:", tx.hash);
        
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log(`Successfully added ${batch.length} addresses to whitelist`);
      } catch (error) {
        console.error(`Error adding batch: ${error.message}`);
        // 如果批量添加失败，尝试逐个添加
        console.log("Trying to add addresses one by one...");
        for (const addr of batch) {
          try {
            const tx = await stakingContract.addToWhitelist(addr);
            await tx.wait();
            console.log(`Successfully added ${addr} to whitelist`);
          } catch (err) {
            console.error(`Failed to add ${addr}: ${err.message}`);
          }
        }
      }
    }
    
    console.log("All addresses have been processed");

  } catch (error) {
    console.error("Error details:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exitCode = 1;
}); 