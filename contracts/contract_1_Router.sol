// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IBalancerVault {
    function flashLoan(
        address recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

interface IAaveV3Pool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

contract FlashArbExecutor {
    error NotOwner();
    error InvalidProvider();
    error InvalidPlan();
    error DeadlineExpired();
    error ProfitTooLow(uint256 got, uint256 need);
    error FlashLoanFailed();
    error InsufficientRepayment();
    error InvalidDex(uint8 dexId);
    error NotVault();
    error NotPool();

    uint8 internal constant PROVIDER_BALANCER = 1;
    uint8 internal constant PROVIDER_AAVE = 2;
    uint8 internal constant DEX_UNIV2_QUICKSWAP = 1;
    uint8 internal constant DEX_UNIV2_SUSHISWAP = 2;
    uint8 internal constant DEX_UNIV3 = 3;

    address public immutable owner;
    IBalancerVault public immutable balancerVault;
    IAaveV3Pool public immutable aavePool;

    mapping(uint8 => address) public dexRouter;
    uint256 public minProfitWei;

    constructor(
        address _balancerVault,
        address _aavePool,
        address _quickswapRouter,
        address _sushiswapRouter,
        address _uniswapV3Router,
        uint256 _minProfitWei
    ) {
        owner = msg.sender;
        balancerVault = IBalancerVault(_balancerVault);
        aavePool = IAaveV3Pool(_aavePool);
        dexRouter[DEX_UNIV2_QUICKSWAP] = _quickswapRouter;
        dexRouter[DEX_UNIV2_SUSHISWAP] = _sushiswapRouter;
        dexRouter[DEX_UNIV3] = _uniswapV3Router;
        minProfitWei = _minProfitWei;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function executeFlashArb(
        uint8 providerId,
        address loanToken,
        uint256 loanAmount,
        bytes calldata plan
    ) external onlyOwner {
        if (plan.length < 60) revert InvalidPlan();

        if (providerId == PROVIDER_BALANCER) {
            IERC20[] memory tokens = new IERC20[](1);
            uint256[] memory amounts = new uint256[](1);
            tokens[0] = IERC20(loanToken);
            amounts[0] = loanAmount;
            balancerVault.flashLoan(address(this), tokens, amounts, abi.encode(loanToken, loanAmount, plan));
        } else if (providerId == PROVIDER_AAVE) {
            aavePool.flashLoanSimple(address(this), loanToken, loanAmount, abi.encode(loanToken, loanAmount, plan), 0);
        } else {
            revert InvalidProvider();
        }
    }

    function receiveFlashLoan(
        IERC20[] memory /* tokens */, // Silenced warning
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        if (msg.sender != address(balancerVault)) revert NotVault();
        (address loanToken, uint256 loanAmount, bytes memory plan) = abi.decode(userData, (address, uint256, bytes));
        
        // Security check using decoded vars (Fixes unused variable warning)
        if (amounts[0] != loanAmount) revert FlashLoanFailed();

        uint256 profit = _executePlan(loanToken, loanAmount, feeAmounts[0], plan);
        
        // Repay
        uint256 repayment = amounts[0] + feeAmounts[0];
        IERC20(loanToken).approve(address(balancerVault), repayment);

        // Auto-Send Profit
        if (profit > 0) IERC20(loanToken).transfer(owner, profit);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */, // Silenced warning
        bytes calldata params
    ) external returns (bool) {
        if (msg.sender != address(aavePool)) revert NotPool();
        (address loanToken, uint256 loanAmount, bytes memory plan) = abi.decode(params, (address, uint256, bytes));

        // Security check using decoded vars (Fixes unused variable warning)
        if (asset != loanToken || amount != loanAmount) revert FlashLoanFailed();

        uint256 profit = _executePlan(asset, amount, premium, plan);
        
        // Repay
        IERC20(asset).approve(address(aavePool), amount + premium);
        
        // Auto-Send Profit
        if (profit > 0) IERC20(asset).transfer(owner, profit);
        
        return true;
    }

    function _executePlan(
        address loanToken,
        uint256 loanAmount,
        uint256 fee,
        bytes memory plan
    ) internal returns (uint256 profit) {
        uint40 deadline;
        uint256 minProfit;
        uint8 stepCount;

        assembly {
            let data := add(plan, 32)
            deadline := shr(216, mload(add(data, 2)))
            minProfit := mload(add(data, 27))
            stepCount := shr(248, mload(add(data, 59)))
        }

        if (block.timestamp > deadline) revert DeadlineExpired();

        uint256 cursor = 60;
        for (uint8 i = 0; i < stepCount; i++) {
            cursor = _executeStep(plan, cursor);
        }

        uint256 endBal = IERC20(loanToken).balanceOf(address(this));
        uint256 totalCost = loanAmount + fee;
        if (endBal < totalCost) revert InsufficientRepayment();

        profit = endBal - totalCost;
        uint256 need = (minProfit > minProfitWei) ? minProfit : minProfitWei;
        if (profit < need) revert ProfitTooLow(profit, need);
    }

    function _executeStep(bytes memory plan, uint256 cursor) internal returns (uint256) {
        uint8 dexId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minOut;
        uint16 auxLen;

        assembly {
            let ptr := add(add(plan, 32), cursor)
            dexId := shr(248, mload(ptr))
            ptr := add(ptr, 2) 
            tokenIn := shr(96, mload(ptr))
            ptr := add(ptr, 20)
            tokenOut := shr(96, mload(ptr))
            ptr := add(ptr, 20)
            amountIn := mload(ptr)
            ptr := add(ptr, 32)
            minOut := mload(ptr)
            ptr := add(ptr, 32)
            auxLen := shr(240, mload(ptr))
        }

        if (amountIn == 0) amountIn = IERC20(tokenIn).balanceOf(address(this));
        
        uint256 auxStart = cursor + 108;
        bytes memory auxData = new bytes(auxLen);
        for (uint256 i = 0; i < auxLen; i++) auxData[i] = plan[auxStart + i];

        _dispatchSwap(dexId, tokenIn, tokenOut, amountIn, minOut, auxData);
        return auxStart + auxLen;
    }

    function _dispatchSwap(
        uint8 dexId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        bytes memory auxData
    ) internal {
        if (dexId == DEX_UNIV2_QUICKSWAP || dexId == DEX_UNIV2_SUSHISWAP) {
            address router = dexRouter[dexId];
            address[] memory path = abi.decode(auxData, (address[]));
            IERC20(tokenIn).approve(router, amountIn);
            IUniswapV2Router(router).swapExactTokensForTokens(amountIn, minOut, path, address(this), block.timestamp);
        } else if (dexId == DEX_UNIV3) {
            address router = dexRouter[DEX_UNIV3];
            (uint24 fee, uint160 sqrtPriceLimitX96) = abi.decode(auxData, (uint24, uint160));
            IERC20(tokenIn).approve(router, amountIn);
            IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn, tokenOut: tokenOut, fee: fee, recipient: address(this),
                deadline: block.timestamp, amountIn: amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: sqrtPriceLimitX96
            });
            IUniswapV3Router(router).exactInputSingle(params);
        } else {
            revert InvalidDex(dexId);
        }
    }

    function withdrawToken(address token) external onlyOwner {
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    function rescueETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    receive() external payable {}
}