// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IPenaltyPool
 * @dev Interface for the penalty pool contract
 */
interface IPenaltyPool {
    event PenaltyDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    event PenaltyWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event AuthorizedDepositorUpdated(address indexed oldDepositor, address indexed newDepositor);
    
    function deposit() external payable;
    function withdraw(address payable to, uint256 amount) external;
}
