// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title NormalStakingProxy
 * @dev Transparent Upgradeable Proxy for Normal Staking Pool (1 HSK minimum, 8% APY)
 * This proxy contract can be upgraded independently from the Premium pool
 */
contract NormalStakingProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}

