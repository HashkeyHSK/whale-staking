# Scripts Usage Guide

## 🚀 Quick Start

### 1. Deploy Contracts

```bash
# Must provide start and end times at deployment (Unix timestamp, in seconds)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
```

**Tips**:
- `STAKE_START_TIME`: Staking start time (Unix timestamp, in seconds)
- `STAKE_END_TIME`: Staking end time (Unix timestamp, in seconds)
- Can use online tool: https://www.epochconverter.com/
- Or use command: `date +%s` to get current timestamp

After successful deployment, save the proxy contract address to `scripts/shared/constants.ts`.

### 2. Verify Contracts

```bash
# Verify implementation contract (recommended using Foundry)
IMPLEMENTATION_ADDRESS="0x..." npm run verify:forge:testnet
```

Deployment script will output implementation contract address, use that address for verification.

### 3. Add Rewards

```bash
REWARD_AMOUNT="100" npm run rewards:add:testnet
```

### 4. Stake

```bash
STAKE_AMOUNT="2" npm run stake:testnet
```

### 5. Query

```bash
# Query contract status
npm run query:status:testnet

# Query my staking
npm run query:stakes:testnet

# Query pending rewards
# Method 1: Query pending rewards for specific position
POSITION_ID="1" npm run query:pending-reward:testnet

# Method 2: Query all positions' pending rewards for user (without POSITION_ID)
npm run query:pending-reward:testnet

# Method 3: Query all positions for specific user (requires that user's account signature)
USER_ADDRESS="0x..." npm run query:pending-reward:testnet
```

### 6. Claim Rewards

```bash
POSITION_ID="1" npm run claim:testnet
```

### 7. Unstake

```bash
POSITION_ID="1" npm run unstake:testnet
```

## 📁 Directory Structure

```
scripts/
├── README.md                 # Usage guide (this file)
│
├── shared/                    # Shared modules
│   ├── constants.ts          # Configuration and addresses
│   ├── types.ts              # Type definitions
│   ├── helpers.ts            # Helper functions
│   └── utils.ts              # Utility functions
│
├── staking/                   # Staking operations
│   ├── deploy.ts             # Deploy contract
│   ├── upgrade.ts            # Upgrade contract
│   ├── stake.ts              # Staking operations
│   ├── unstake.ts            # Unstake
│   ├── claim-rewards.ts      # Claim rewards
│   ├── add-rewards.ts        # Add reward pool
│   ├── emergency-withdraw.ts # Emergency withdraw principal
│   ├── withdraw-excess.ts    # Withdraw excess rewards
│   ├── verify-forge.ts       # Verify contract (using Foundry)
│   ├── config/               # Configuration management
│   │   ├── pause.ts          # Pause contract
│   │   ├── unpause.ts        # Unpause contract
│   │   ├── set-start-time.ts # Set start time
│   │   ├── set-end-time.ts   # Set end time
│   │   ├── set-min-stake.ts  # Set minimum staking amount
│   │   ├── transfer-ownership.ts  # Step 1: Initiate ownership transfer
│   │   └── accept-ownership.ts   # Step 2: Accept ownership transfer
│   │   ├── set-max-total-staked.ts # Set maximum total staked
│   │   └── enable-emergency.ts # Enable emergency mode
│   └── query/                # Status queries
│       ├── check-status.ts   # Query contract status
│       ├── check-stakes.ts   # Query staking information
│       └── pending-reward.ts # Query pending rewards
│   ├── deploy.ts             # Deploy contract
│   ├── upgrade.ts            # Upgrade contract
│   ├── stake.ts              # Staking operations (requires whitelist)
│   ├── unstake.ts            # Unstake
│   ├── claim-rewards.ts      # Claim rewards
│   ├── add-rewards.ts        # Add reward pool
│   ├── emergency-withdraw.ts # Emergency withdraw principal
│   ├── withdraw-excess.ts    # Withdraw excess rewards
│   ├── verify-forge.ts       # Verify contract
│   ├── whitelist/            # Whitelist management
│   │   ├── add-batch.ts      # Batch add whitelist
│   │   ├── remove-batch.ts  # Batch remove whitelist
│   │   ├── check-user.ts     # Query user whitelist status
│   │   └── toggle-mode.ts    # Toggle whitelist mode
│   ├── config/               # Configuration management
│   │   ├── pause.ts
│   │   ├── unpause.ts
│   │   ├── set-start-time.ts
│   │   ├── set-end-time.ts
│   │   ├── set-min-stake.ts
│   │   ├── set-max-total-staked.ts
│   │   ├── enable-emergency.ts
│   │   ├── transfer-ownership.ts  # Step 1: Initiate ownership transfer
│   │   └── accept-ownership.ts   # Step 2: Accept ownership transfer
│   └── query/                # Status queries
│       ├── check-status.ts
│       ├── check-stakes.ts
│       ├── pending-reward.ts
│       └── check-whitelist.ts
│
├── dev/                       # Development scripts
│   ├── compile.ts            # Compile contracts
│   ├── clean.ts              # Clean compilation artifacts
│   ├── test-all.ts           # Run all tests
│   └── coverage.ts           # Generate test coverage report
│
├── test/                      # Test scripts
│   ├── helpers/              # Test helper functions
│   │   ├── fixtures.ts       # Test fixtures
│   │   └── test-utils.ts     # Test utility functions
│   └── integration/          # Integration tests
│       ├── deploy-test.ts    # Deployment test
│       ├── stake-test.ts     # Staking operation test
│       └── whitelist-test.ts # Whitelist functionality test
│
└── tools/                     # Tool scripts
    ├── extract-abi.ts        # Extract ABI
    ├── generate-types.ts     # Generate TypeScript types
    └── compare-contracts.ts  # Compare contract differences
```

## 🔧 Configuration

### Environment Variables

```bash
# Contract addresses
export STAKING_ADDRESS="0x..."

# Operation related
export STAKE_AMOUNT="100"          # Staking amount (minimum: 1 HSK)
export REWARD_AMOUNT="100"        # Reward amount
export POSITION_ID="1"            # Position ID
export USER_ADDRESS="0x..."       # Query specific user

# Verification related
export IMPLEMENTATION_ADDRESS="0x..."  # Implementation contract address (for verification)
export RPC_URL="https://testnet.hsk.xyz"  # RPC URL (optional)
export VERIFIER_URL="https://testnet-explorer.hsk.xyz/api/"  # Verifier URL (optional)

# Deployment related (required)
export STAKE_START_TIME="1735689600"  # Staking start time (Unix timestamp, seconds, required at deployment)
export STAKE_END_TIME="1767225600"    # Staking end time (Unix timestamp, seconds, required at deployment)

# Configuration related
export START_TIME="1735689600"      # Start time (Unix timestamp, seconds, for modifying configuration)
export END_TIME="1735689600"       # End time (Unix timestamp, seconds, for modifying configuration)
export NEW_MIN_STAKE="1"          # New minimum staking amount
export NEW_MAX_TOTAL_STAKED="10000000"  # New maximum total staked (HSK, 0 means unlimited)

# Advanced operations
export WITHDRAW_AMOUNT="100"       # Withdrawal amount
export CONFIRM_EMERGENCY="YES_I_UNDERSTAND"  # Confirm enabling emergency mode

# Upgrade related
export PROXY_ADMIN_ADDRESS="0x..."  # ProxyAdmin address (required for upgrade, usually deployer address)
export NEW_IMPLEMENTATION_ADDRESS="0x..."  # New implementation contract address (optional, auto-deploy if not provided)

# Whitelist related (if whitelist mode is enabled)
export WHITELIST_ADDRESSES="0x123...,0x456..."  # Whitelist address list (comma-separated, max 100)
export ENABLE="true"  # Enable/disable whitelist mode ("true" or "false")
```

### Contract Address Configuration

Edit `scripts/shared/constants.ts`:

```typescript
export const TESTNET_ADDRESSES: ContractAddresses = {
  staking: "0x...",  // Fill in deployed address
};
```

## 📝 Command List

### Deployment
- `npm run deploy` - Deploy to mainnet
- `npm run deploy:testnet` - Deploy to testnet
- `npm run deploy:local` - Deploy to local

### Contract Verification
- `npm run verify:forge` - Verify implementation contract (mainnet, using Foundry)
- `npm run verify:forge:testnet` - Verify implementation contract (testnet, using Foundry)

### Contract Upgrade
- `npm run upgrade:testnet` - Upgrade Staking contract (testnet)

### Development Tools
- `npm run dev:compile` - Compile contracts (via script)
- `npm run dev:clean` - Clean compilation artifacts (via script)
- `npm run dev:test` - Run all tests (via script)
- `npm run dev:coverage` - Generate test coverage report (via script)

### Integration Tests
- `npm run test:integration:deploy` - Run deployment integration test
- `npm run test:integration:stake` - Run staking operation integration test
- `npm run test:integration:whitelist` - Run whitelist functionality integration test

### Tool Scripts
- `npm run tools:extract-abi` - Extract contract ABI
- `npm run tools:generate-types` - Generate TypeScript types
- `npm run tools:compare-contracts` - Compare contract differences

### Staking Operations
- `npm run stake:testnet` - Stake
- `npm run unstake:testnet` - Unstake
- `npm run claim:testnet` - Claim rewards

### Reward Management
- `npm run rewards:add:testnet` - Add rewards
- `npm run withdraw-excess:testnet` - Withdraw excess rewards (owner only)

### Configuration Management
- `npm run config:pause:testnet` - Pause contract
- `npm run config:unpause:testnet` - Unpause contract
- `npm run config:set-start-time:testnet` - Set start time
- `npm run config:set-end-time:testnet` - Set end time
- `npm run config:set-min-stake:testnet` - Set minimum staking amount
- `npm run config:set-max-total-staked:testnet` - Set maximum total staked
- `npm run config:enable-emergency:testnet` - Enable emergency mode (⚠️ Irreversible)

### Ownership Transfer (Two-Step Process)
The contract uses OpenZeppelin's `Ownable2StepUpgradeable` standard for enhanced security.

**Step 1: Initiate Transfer** (Current owner executes):
- `NEW_OWNER_ADDRESS="0x..." npm run config:transfer-ownership:testnet`

**Step 2: Accept Ownership** (New owner executes):
- `npm run config:accept-ownership:testnet`

**Important Notes**:
- After Step 1, ownership is NOT transferred immediately
- The new owner must execute Step 2 to complete the transfer
- The current owner can cancel the pending transfer by initiating a new transfer to a different address
- The new owner must use the account that was set as `NEW_OWNER_ADDRESS` in Step 1

### Status Queries
- `npm run query:status:testnet` - Query contract status
- `npm run query:stakes:testnet` - Query staking information
- `npm run query:pending-reward:testnet` - Query pending rewards
  - Without `POSITION_ID`, queries all positions' pending rewards for user
  - With `POSITION_ID`, only queries specified position's pending rewards
  - Can specify user address via `USER_ADDRESS` environment variable

### Emergency Operations
- `npm run emergency-withdraw:testnet` - Emergency withdraw principal (emergency mode only)

## ⚠️ Important Notes

1. **Lock Period**: Fixed 365 days
2. **Reward Rate**: 
   - Staking: 5% APY (500 basis points)
3. **Minimum Stake**: 
   - Staking: 1 HSK (can be modified by owner)
4. **Maximum Total Staked**: 
   - Staking: 30,000,000 HSK (can be modified by owner, 0 means unlimited)
5. **Whitelist**: 
   - Staking: Disabled (all users can stake)
6. **Test First**: Verify on testnet first

## 📊 Script Statistics

**Currently Implemented**: 59 script files
- ✅ Staking: All operations, configuration, and queries
- ✅ Development scripts: 4 scripts
- ✅ Test scripts: 5 scripts
- ✅ Tool scripts: 3 scripts
- ✅ Shared modules: 4 files

**Staking scripts include**:
- Basic operation scripts: 9 (deploy, upgrade, stake, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge)
- Configuration management scripts: 7 (pause, unpause, set-start-time, set-end-time, set-min-stake, set-max-total-staked, enable-emergency)
- Query scripts: 4 (check-status, check-stakes, pending-reward, position-info)

- Basic operation scripts: 9 (deploy, upgrade, stake, unstake, claim-rewards, add-rewards, emergency-withdraw, withdraw-excess, verify-forge)
- Whitelist management scripts: 4 (add-batch, remove-batch, check-user, toggle-mode)
- Configuration management scripts: 7 (pause, unpause, set-start-time, set-end-time, set-min-stake, set-max-total-staked, enable-emergency)
- Query scripts: 5 (check-status, check-stakes, pending-reward, position-info, check-whitelist)

## 🐛 Common Questions

**Q: Contract is paused, cannot stake**
```bash
npm run config:unpause:testnet
```

**Q: Insufficient balance**
Ensure account has enough HSK (staking amount + gas fee)

**Q: Lock period not completed**
Wait 365 days before unstaking, can check pending rewards:
```bash
POSITION_ID="1" npm run query:pending-reward:testnet
```

**Q: How to set start/end time at deployment?**
Must provide Unix timestamp (in seconds) at deployment:
```bash
# Set time at deployment (e.g., start 2025-01-01 00:00:00 UTC, end 2026-01-01 00:00:00 UTC)
STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
```

**Q: How to modify start/end time of deployed contract?**
Use Unix timestamp (in seconds):
```bash
# Set start time (e.g., 2025-01-01 00:00:00 UTC)
START_TIME="1735689600" npm run config:set-start-time:testnet

# Set end time (e.g., 2026-01-01 00:00:00 UTC)
END_TIME="1767225600" npm run config:set-end-time:testnet
```
Can use online tool: https://www.epochconverter.com/

**Q: Query is slow**
Use `getUserPositionIds(address)` function to get all positionIds for user

**Q: What is emergency mode?**
Emergency mode is used to handle serious security issues:
- ⚠️ Irreversible operation
- Users can only withdraw principal, no rewards
- Requires explicit confirmation to enable

**Q: How to withdraw excess reward pool funds?**
Can only withdraw amount exceeding totalPendingRewards:
```bash
# Withdraw 1000 HSK
WITHDRAW_AMOUNT="1000" npm run withdraw-excess:testnet

# Withdraw all available balance (without specifying amount)
npm run withdraw-excess:testnet
```

**Q: How to set maximum total staked?**
Maximum total staked is the upper limit for the entire product pool, total staking amount of all users cannot exceed this limit:
```bash
# Set Staking maximum total staked to 15,000,000 HSK
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet

# Remove limit (set to 0)
NEW_MAX_TOTAL_STAKED="0" npm run config:set-max-total-staked:testnet
```

**Note**:
- Maximum total staked cannot be less than current total staked
- Setting to 0 means unlimited
- Querying contract status will show maximum total staked and remaining capacity

**Q: How to upgrade contract?**
Upgrade scripts automatically detect ProxyAdmin type and use correct method to execute upgrade:
```bash
# Upgrade Staking contract (auto-deploy new implementation)
# Script automatically reads ProxyAdmin address from storage slot, no need to manually specify
npm run upgrade:testnet

# If ProxyAdmin address differs from current signer, can manually specify
PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:testnet

# Use already deployed implementation contract for upgrade
PROXY_ADMIN_ADDRESS="0x..." NEW_IMPLEMENTATION_ADDRESS="0x..." npm run upgrade:testnet
```

**Upgrade Script Features**:
- ✅ **Auto-detect ProxyAdmin**: Reads actual ProxyAdmin address from storage slot
- ✅ **Support Two Modes**: Automatically identifies ProxyAdmin contract or EOA, uses correct upgrade method
- ✅ **Smart Fallback**: If `upgrade()` fails, automatically tries `upgradeAndCall()`
- ✅ **State Verification**: Automatically verifies contract state consistency before and after upgrade
- ✅ **Browser Link**: Automatically prints transaction hash and browser link after successful upgrade
- ✅ **Implementation Verification**: Automatically verifies new implementation address is correct after upgrade

⚠️ **Upgrade Notes**:
- Ensure new implementation contract is compatible with existing storage layout
- All state data will be preserved after upgrade
- Recommend testing on testnet before upgrading
- Need to verify new implementation contract after upgrade (script will prompt command)
- Upgrade transaction will appear on ProxyAdmin contract page, not Proxy page

**Q: How to use development scripts?**
```bash
# Compile contracts
npm run dev:compile

# Clean compilation artifacts
npm run dev:clean

# Run all tests
npm run dev:test

# Generate coverage report (requires installing solidity-coverage)
npm run dev:coverage
```

**Q: How to run integration tests?**
```bash
# Run deployment test
npm run test:integration:deploy

# Run staking operation test
npm run test:integration:stake

# Run whitelist functionality test
npm run test:integration:whitelist
```

**Q: How to use tool scripts?**
```bash
# Extract ABI (need to compile contracts first)
npm run tools:extract-abi

# Generate TypeScript types (auto-generated during compilation)
npm run tools:generate-types

# Compare contract implementations
npm run tools:compare-contracts HSKStaking
```


## 🎯 Contract Configuration

### Staking Configuration

| Configuration | Value | Notes |
|--------------|-------|-------|
| Minimum Stake | 1 HSK | Can be modified by owner |
| Maximum Total Staked | 30,000,000 HSK | Can be modified by owner (0 means unlimited) |
| Annual Yield | 5% | Fixed at initialization |
| Lock Period | 365 days | Contract constant, cannot be modified |
| Whitelist | Disabled | All users can stake |

## 🔐 Admin Operations

### Configuration Management (requires owner permission)

```bash
# Pause contract
npm run config:pause:testnet

# Unpause contract
npm run config:unpause:testnet

# Set staking time (using Unix timestamp)
# Tip: Can use https://www.epochconverter.com/ to convert date to timestamp
START_TIME="1735689600" npm run config:set-start-time:testnet
END_TIME="1735689600" npm run config:set-end-time:testnet

# Set minimum staking amount
NEW_MIN_STAKE="1" npm run config:set-min-stake:testnet

# Set maximum total staked (0 means unlimited)
NEW_MAX_TOTAL_STAKED="15000000" npm run config:set-max-total-staked:testnet
```

### Reward Pool Management

```bash
# Add rewards
REWARD_AMOUNT="50000" npm run rewards:add:testnet

# Withdraw excess funds
WITHDRAW_AMOUNT="1000" npm run withdraw-excess:testnet
```

### Emergency Operations (Use with caution!)

```bash
# Enable emergency mode (⚠️ Irreversible!)
CONFIRM_EMERGENCY=YES_I_UNDERSTAND npm run config:enable-emergency:testnet
```

## 📖 Complete Documentation

For detailed information, please see: `docs/SCRIPTS_ARCHITECTURE.md`

---

**Document Version**: 1.0.0  
**Maintainer**: HashKey Technical Team
