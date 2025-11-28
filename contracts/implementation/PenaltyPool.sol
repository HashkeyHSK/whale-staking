// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IPenaltyPool.sol";

/**
 * @title PenaltyPool
 * @dev Penalty pool contract for collecting early unstaking penalties
 * This contract is upgradeable and follows the transparent proxy pattern
 * Features:
 * - Receives penalties from HSKStaking contract only
 * - Owner can withdraw accumulated penalties
 * - Upgradeable for future enhancements
 */
contract PenaltyPool is 
    IPenaltyPool,
    Initializable, 
    Ownable2StepUpgradeable,
    ReentrancyGuardUpgradeable 
{
    address public authorizedDepositor;
    
    uint256 public penaltyPoolBalance;
    
    uint256[50] private __gap;
    
    modifier onlyAuthorizedDepositor() {
        require(msg.sender == authorizedDepositor, "PenaltyPool: caller is not authorized depositor");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the penalty pool contract
     * @param _owner Address of the contract owner
     * @param _authorizedDepositor Address authorized to deposit penalties (HSKStaking contract)
     */
    function initialize(
        address _owner,
        address _authorizedDepositor
    ) external initializer {
        require(_owner != address(0), "PenaltyPool: zero owner address");
        require(_authorizedDepositor != address(0), "PenaltyPool: zero depositor address");
        
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        
        authorizedDepositor = _authorizedDepositor;
    }
    
    /**
     * @dev Receive penalty deposit
     * Only authorized depositor (HSKStaking contract) can call this
     */
    function deposit() external payable override onlyAuthorizedDepositor {
        require(msg.value > 0, "PenaltyPool: deposit amount is zero");
        
        penaltyPoolBalance += msg.value;
        
        emit PenaltyDeposited(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Withdraw penalty funds
     * Only owner can call this
     * @param to Address to receive the funds
     * @param amount Amount to withdraw
     */
    function withdraw(
        address payable to,
        uint256 amount
    ) external override onlyOwner nonReentrant {
        require(to != address(0), "PenaltyPool: zero recipient address");
        require(amount > 0, "PenaltyPool: withdraw amount is zero");
        require(penaltyPoolBalance >= amount, "PenaltyPool: insufficient balance");
        
        penaltyPoolBalance -= amount;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "PenaltyPool: transfer failed");
        
        emit PenaltyWithdrawn(to, amount, block.timestamp);
    }
    
    /**
     * @dev Update authorized depositor address
     * Only owner can call this (for contract upgrades)
     * @param newDepositor New authorized depositor address
     */
    function setAuthorizedDepositor(address newDepositor) external onlyOwner {
        require(newDepositor != address(0), "PenaltyPool: zero depositor address");
        
        address oldDepositor = authorizedDepositor;
        authorizedDepositor = newDepositor;
        
        emit AuthorizedDepositorUpdated(oldDepositor, newDepositor);
    }
    

    
    /**
     * @dev Receive function to accept direct ETH transfers
     * This should not be used in normal operations
     */
    receive() external payable {
        revert("PenaltyPool: use deposit() function");
    }
}
