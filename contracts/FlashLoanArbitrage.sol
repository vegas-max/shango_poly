// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IFlashLoanReceiver.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IDexRouter.sol";

/**
 * @title FlashLoanArbitrage
 * @notice Executes flash loan arbitrage across multiple DEXes
 * @dev Backward architecture: Optimized for execution efficiency
 */
contract FlashLoanArbitrage is IFlashLoanReceiver {
    address public owner;
    address public aavePool;
    
    // DEX router addresses
    mapping(string => address) public dexRouters;
    
    event ArbitrageExecuted(
        address indexed asset,
        uint256 amount,
        uint256 profit,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _aavePool) {
        owner = msg.sender;
        aavePool = _aavePool;
    }
    
    /**
     * @notice Execute flash loan arbitrage
     * @param asset Token address to flash loan
     * @param amount Amount to borrow
     * @param path Trading path [token0, token1, ...]
     * @param dexes DEX identifiers for each swap
     */
    function executeArbitrage(
        address asset,
        uint256 amount,
        address[] calldata path,
        string[] calldata dexes
    ) external onlyOwner {
        require(path.length >= 2, "Invalid path");
        require(path.length - 1 == dexes.length, "Path and DEXes mismatch");
        
        // Request flash loan from Aave
        address[] memory assets = new address[](1);
        assets[0] = asset;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        // Mode 0 = no debt, flash loan will be repaid in same transaction
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;
        
        bytes memory params = abi.encode(path, dexes);
        
        IPool(aavePool).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Callback function called by Aave after receiving flash loan
     * @param assets Array of borrowed asset addresses
     * @param amounts Array of borrowed amounts
     * @param premiums Array of flash loan fees
     * @param initiator Address that initiated the flash loan
     * @param params Encoded parameters (path and dexes)
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == aavePool, "Caller not Aave Pool");
        require(initiator == address(this), "Initiator not this contract");
        
        // Decode parameters
        (address[] memory path, string[] memory dexes) = abi.decode(
            params,
            (address[], string[])
        );
        
        // Execute arbitrage swaps
        uint256 currentAmount = amounts[0];
        
        for (uint256 i = 0; i < dexes.length; i++) {
            currentAmount = _swap(
                dexRouters[dexes[i]],
                path[i],
                path[i + 1],
                currentAmount
            );
        }
        
        // Calculate profit (currentAmount should be > borrowed + premium)
        uint256 totalDebt = amounts[0] + premiums[0];
        require(currentAmount >= totalDebt, "Arbitrage not profitable");
        
        uint256 profit = currentAmount - totalDebt;
        
        // Approve Aave to take the repayment
        IERC20(assets[0]).approve(aavePool, totalDebt);
        
        emit ArbitrageExecuted(assets[0], amounts[0], profit, block.timestamp);
        
        return true;
    }
    
    /**
     * @notice Internal function to swap tokens on a DEX
     * @param router DEX router address
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return amountOut Output amount received
     */
    function _swap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        require(router != address(0), "Invalid router");
        
        // Approve router to spend tokens
        IERC20(tokenIn).approve(router, amountIn);
        
        // Create path
        address[] memory swapPath = new address[](2);
        swapPath[0] = tokenIn;
        swapPath[1] = tokenOut;
        
        // Execute swap
        uint256[] memory amounts = IDexRouter(router).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount (in production, use proper slippage)
            swapPath,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
    }
    
    /**
     * @notice Register a DEX router
     * @param name DEX identifier
     * @param router Router address
     */
    function registerDex(string calldata name, address router) external onlyOwner {
        dexRouters[name] = router;
    }
    
    /**
     * @notice Withdraw tokens from contract
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
    
    /**
     * @notice Withdraw ETH from contract
     */
    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}

// Minimal Aave Pool interface
interface IPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}
