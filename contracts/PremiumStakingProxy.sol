// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title PremiumStakingProxy
 * @dev Transparent Upgradeable Proxy for Premium Staking Pool (500,000 HSK minimum, 16% APY)
 * This proxy contract can be upgraded independently from the Normal pool
 */
contract PremiumStakingProxy is TransparentUpgradeableProxy {
    /**
     * @dev Initializes the proxy with the implementation contract, admin, and initialization data
     * @param _logic Address of the HSKStaking implementation contract
     * @param admin_ Address of the proxy admin (can upgrade the proxy)
     * @param _data Initialization data to be passed to the implementation contract's initialize function
     */
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}

