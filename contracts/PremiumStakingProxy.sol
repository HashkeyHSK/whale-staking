// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title PremiumStakingProxy
 * @dev Transparent Upgradeable Proxy for Premium Staking Pool (500,000 HSK minimum, 16% APY)
 * This proxy contract can be upgraded independently from the Normal pool
 */
contract PremiumStakingProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}

