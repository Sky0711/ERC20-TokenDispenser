// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract InheritanceToken is ERC20("InheritanceToken", "IHT") {
    constructor(address receiver) {
        _mint(receiver, 700_000 ether);
    }
}