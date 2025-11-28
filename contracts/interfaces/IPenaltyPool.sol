// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title IPenaltyPool
 * @dev Interface for the penalty pool contract
 * Penalty pool collects penalties from early unstaking
 */
interface IPenaltyPool {
    /**
     * @dev Emitted when penalty is deposited
     * @param depositor Address that deposited the penalty (should be HSKStaking contract)
     * @param amount Amount of penalty deposited
     * @param timestamp Time of deposit
     */
    event PenaltyDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    
    /**
     * @dev Emitted when penalty is withdrawn
     * @param to Address receiving the withdrawn funds
     * @param amount Amount withdrawn
     * @param timestamp Time of withdrawal
     */
    event PenaltyWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    
    /**
     * @dev Emitted when authorized depositor is updated
     * @param oldDepositor Previous authorized depositor
     * @param newDepositor New authorized depositor
     */
    event AuthorizedDepositorUpdated(address indexed oldDepositor, address indexed newDepositor);
    
    /**
     * @dev Receive penalty deposit (payable)
     * Only authorized depositor (HSKStaking contract) can call this
     */
    function deposit() external payable;
    
    /**
     * @dev Withdraw penalty funds
     * Only owner can call this
     * @param to Address to receive the funds
     * @param amount Amount to withdraw
     */
    function withdraw(address payable to, uint256 amount) external;
    

}
