import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ProofStoreModule = buildModule("ProofStoreModule", (m) => {
  const proofStore = m.contract("ProofStore", [], {
  });

  return { proofStore };
});

export default ProofStoreModule;
