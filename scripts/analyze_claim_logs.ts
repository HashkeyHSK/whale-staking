import { ethers } from "ethers";

const RPC_URL = "https://mainnet.hsk.xyz";
const TARGET_ADDRESS = "0x259e47500394aab24b49B001329f252cf7154A27";
const MAX_BLOCK_RANGE = 1000;
const CONCURRENCY = 20;

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)
    const topic0 = ethers.id("RewardClaimed(address,uint256,uint256,uint256)");

    console.log(`Connecting to ${RPC_URL}`);

    let logs: ethers.Log[] = [];
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Deployment block provided by user: 15457347
    const startBlock = 15457347;

    const totalBlocks = currentBlock - startBlock;
    const stats = {
        processed: 0,
        totalChunks: Math.ceil(totalBlocks / MAX_BLOCK_RANGE),
    };

    console.log(`Scanning ${totalBlocks} blocks in chunks of ${MAX_BLOCK_RANGE} with concurrency ${CONCURRENCY}...`);

    async function fetchChunk(from: number, to: number): Promise<ethers.Log[]> {
        try {
            return await provider.getLogs({
                address: TARGET_ADDRESS,
                topics: [topic0],
                fromBlock: from,
                toBlock: to
            });
        } catch (e: any) {
            console.error(`Error fetching ${from}-${to}: ${e.message}`);
            return [];
        }
    }

    const chunks = [];
    for (let i = startBlock; i <= currentBlock; i += MAX_BLOCK_RANGE) {
        const to = Math.min(i + MAX_BLOCK_RANGE - 1, currentBlock);
        chunks.push({ from: i, to });
    }

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(c => fetchChunk(c.from, c.to)));

        for (const res of results) {
            logs = logs.concat(res);
        }

        stats.processed += batch.length;
        if (stats.processed % 100 === 0 || stats.processed === chunks.length) {
            process.stdout.write(`\rProgress: ${stats.processed}/${stats.totalChunks} chunks. Found ${logs.length} events.`);
        }
    }

    console.log(`\nScan complete.`);
    console.log(`Total RewardClaimed Events Found: ${logs.length}`);

    let totalClaimed = 0n;
    const userClaims = new Map<string, bigint>();

    for (const log of logs) {
        let sender = "";
        if (log.topics[1]) {
            sender = ethers.getAddress("0x" + log.topics[1].slice(26));
        }

        try {
            // RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount, uint256 timestamp)
            // indexed: user, positionId. data: amount, timestamp
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256", "uint256"],
                log.data
            );
            const amount = decoded[0];
            totalClaimed += amount;

            if (sender) {
                const current = userClaims.get(sender) || 0n;
                userClaims.set(sender, current + amount);
            }

        } catch (err) {
            console.error("Error decoding log data:", log.data, err);
        }
    }

    console.log("------------------------------------------------");
    console.log(`Total Events: ${logs.length}`);
    console.log(`Unique Claimers: ${userClaims.size}`);
    console.log(`Total Claimed Amount: ${ethers.formatEther(totalClaimed)} HSK`);
    console.log("------------------------------------------------");

    // Generate CSV
    console.log("Generating CSV...");
    const fs = await import("fs");
    const path = await import("path");

    const csvContent = ["Address,Claimed Amount (HSK)"];

    const sortedUsers = Array.from(userClaims.entries()).sort((a, b) => {
        return a[1] < b[1] ? 1 : -1;
    });

    for (const [address, amount] of sortedUsers) {
        csvContent.push(`${address},${ethers.formatEther(amount)}`);
    }

    const outputPath = path.resolve(process.cwd(), "claims_holders.csv");
    fs.writeFileSync(outputPath, csvContent.join("\n"));
    console.log(`CSV saved to: ${outputPath}`);
}

main().catch(console.error);
