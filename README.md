# ZeroDock

A co-processing platform that allows any Docker container to run in a verifiable, trustless way utilizing ZK-SNARKs.

# Smart Contract (Base Sepolia)

- 0x0ba547Ae5BCcf9a028aD69e0443268d46f9C28C1
  - This is our "generator" smart contract that simply exists to Emit a simple event. There is no logic in it nor is there supposed to be. It showcases the entry point to our system by emitting an event. Zerodock works with any smart contract on any EVM chain, so to keep things streamlined from the hackathon we are just emitting a simple event called "Process" which emits **a** and **b** which are both uint256.
- 0x3631ab2ffa825f00d534e7cb831cc8c66b5d6f4b
  - This is our "store" smart contract that simply stores ZK Proof data as calldata to be able to persist its value and allow for any viewer to be able to use it to verify the execution of any container run on the ZeroDock platform
