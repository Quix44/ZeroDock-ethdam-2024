// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ZeroDock {
    // This is the defintiion of the event that we will pick up off-chain
    event Process(uint256 a, uint256 b);

    constructor() {}

    // Generate will be the entrypoint for external entities to start this system
    function generate(uint256 a, uint256 b) external {
        // This is where we could do something with a, b
        emit Process(a, b);
    }
}
