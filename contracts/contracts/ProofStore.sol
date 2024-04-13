// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ProofStore {
    constructor() {}

    // Generate will be the entrypoint for external entities to start this system
    function store(
        string calldata proof,
        string calldata publicData
    ) external {}
}
