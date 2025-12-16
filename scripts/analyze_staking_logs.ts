import { ethers } from "ethers";

const RPC_URL = "https://mainnet.hsk.xyz";
const TARGET_ADDRESS = "0x259e47500394aab24b49B001329f252cf7154A27";
const MAX_BLOCK_RANGE = 1000;
const CONCURRENCY = 20; // Number of parallel requests

async function main() {
    // Increase timeout
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const topic0 = ethers.id("PositionCreated(address,uint256,uint256,uint256,uint256)");

    console.log(`Connecting to ${RPC_URL}`);

    let logs: ethers.Log[] = [];
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Adjust start block if known. 
    // Deployment block provided by user: 15457347
    const startBlock = 15457347;

    const totalBlocks = currentBlock - startBlock;
    const stats = {
        processed: 0,
        totalChunks: Math.ceil(totalBlocks / MAX_BLOCK_RANGE),
        errors: 0
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

    // Process chunks with concurrency limit
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
    console.log(`Total PositionCreated Events Found: ${logs.length}`);

    let totalAmount = 0n;

    // Map to store amount per user
    const userStakes = new Map<string, bigint>();

    for (const log of logs) {
        let sender = "";
        if (log.topics[1]) {
            sender = ethers.getAddress("0x" + log.topics[1].slice(26));
        }

        try {
            // PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint256 lockPeriod, uint256 timestamp)
            // indexed params are in topics. data contains: amount, lockPeriod, timestamp
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256", "uint256", "uint256"],
                log.data
            );
            // decoded[0] is amount
            const amount = decoded[0];
            totalAmount += amount;

            if (sender) {
                const current = userStakes.get(sender) || 0n;
                userStakes.set(sender, current + amount);
            }

        } catch (err) {
            console.error("Error decoding log data:", log.data, err);
        }
    }

    console.log("------------------------------------------------");
    console.log(`Total Events: ${logs.length}`);
    console.log(`Unique Stakers: ${userStakes.size}`);
    console.log(`Total Staked Amount: ${ethers.formatEther(totalAmount)} HSK`);
    console.log("------------------------------------------------");

    // Generate CSV
    console.log("Generating CSV...");
    const fs = await import("fs");
    const path = await import("path");

    const csvContent = ["Address,Amount (HSK)"];

    // Sort by amount descending
    const sortedUsers = Array.from(userStakes.entries()).sort((a, b) => {
        return a[1] < b[1] ? 1 : -1;
    });

    for (const [address, amount] of sortedUsers) {
        csvContent.push(`${address},${ethers.formatEther(amount)}`);
    }

    const outputPath = path.resolve(process.cwd(), "staking_holders.csv");
    fs.writeFileSync(outputPath, csvContent.join("\n"));
    console.log(`CSV saved to: ${outputPath}`);
}

main().catch(console.error);
