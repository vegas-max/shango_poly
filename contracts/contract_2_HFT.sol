// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface IBalancerVaultV3 {
    function unlock(bytes calldata data) external;
    function sendTo(address token, address to, uint256 amount) external;
    function settle(address token, uint256 amount) external;
}

contract KineticTridentV10_Native {
    address private immutable OWNER;
    address private immutable VAULT;

    error Unauthorized();
    error Loss();

    constructor(address _vault) {
        OWNER = msg.sender;
        VAULT = _vault;
    }

    modifier onlyOwner() {
        if (msg.sender != OWNER) revert Unauthorized();
        _;
    }

    function execute(address t, uint256 a, bytes calldata d) external onlyOwner {
        bytes memory callbackData = abi.encodeWithSelector(this.receiveFlashLoan.selector, t, a, d);
        IBalancerVaultV3(VAULT).unlock(callbackData);
    }

    function receiveFlashLoan(address t, uint256 a, bytes calldata d) external {
        if (msg.sender != VAULT) revert Unauthorized();

        IBalancerVaultV3(VAULT).sendTo(t, address(this), a);
        uint256 startBal = IERC20(t).balanceOf(address(this));

        assembly {
            let ptr := d.offset
            let steps := byte(0, calldataload(ptr))
            ptr := add(ptr, 1)

            for { let i := 0 } lt(i, steps) { i := add(i, 1) } {
                let action := byte(0, calldataload(ptr))
                let target := shr(96, calldataload(add(ptr, 1)))
                let zeroForOne := byte(0, calldataload(add(ptr, 21)))
                let tokenIn := shr(96, calldataload(add(ptr, 22)))

                switch action
                case 1 { 
                     let balArgs := mload(0x40)
                     mstore(balArgs, 0x70a0823100000000000000000000000000000000000000000000000000000000)
                     mstore(add(balArgs, 4), address())
                     pop(staticcall(gas(), tokenIn, balArgs, 36, balArgs, 32))
                     let amountIn := mload(balArgs)

                     let txArgs := mload(0x40)
                     mstore(txArgs, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
                     mstore(add(txArgs, 4), target)
                     mstore(add(txArgs, 36), amountIn)
                     pop(call(gas(), tokenIn, 0, txArgs, 68, 0, 0))

                     let swapArgs := mload(0x40)
                     mstore(swapArgs, 0x022c0d9f00000000000000000000000000000000000000000000000000000000)
                     switch zeroForOne
                     case 1 { mstore(add(swapArgs, 4), 0) mstore(add(swapArgs, 36), 1) }
                     default { mstore(add(swapArgs, 4), 1) mstore(add(swapArgs, 36), 0) }
                     mstore(add(swapArgs, 68), address())
                     mstore(add(swapArgs, 100), 128)
                     mstore(add(swapArgs, 132), 0)
                     pop(call(gas(), target, 0, swapArgs, 164, 0, 0))
                }
                case 2 { 
                     let v3Args := mload(0x40)
                     mstore(v3Args, 0x128ac8db00000000000000000000000000000000000000000000000000000000)
                     mstore(add(v3Args, 4), address()) 
                     mstore(add(v3Args, 36), zeroForOne)
                     mstore(add(v3Args, 68), 1000000000000000000)
                     switch zeroForOne
                     case 1 { mstore(add(v3Args, 100), 4295128740) }
                     default { mstore(add(v3Args, 100), 1461446703485210103287273052203988822378723970341) }
                     mstore(add(v3Args, 132), 160)
                     mstore(add(v3Args, 164), 32) 
                     mstore(add(v3Args, 196), tokenIn)
                     let success := call(gas(), target, 0, v3Args, 228, 0, 0)
                     if iszero(success) { revert(0,0) }
                }
                ptr := add(ptr, 42)
            }
        }

        uint256 endBal = IERC20(t).balanceOf(address(this));
        if (endBal < startBal) revert Loss(); 
        
        IERC20(t).transfer(VAULT, a);
        IBalancerVaultV3(VAULT).settle(t, a);

        // AUTO-PROFIT
        uint256 profit = IERC20(t).balanceOf(address(this));
        if (profit > 0) IERC20(t).transfer(OWNER, profit);
    }

    function uniswapV3SwapCallback(int256 a0, int256 a1, bytes calldata d) external {
        address tokenIn = abi.decode(d, (address));
        uint256 pay = a0 > 0 ? uint256(a0) : uint256(a1);
        IERC20(tokenIn).transfer(msg.sender, pay);
    }
}