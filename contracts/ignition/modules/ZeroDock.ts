import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ZeroDockModule = buildModule("ZeroDockModule", (m) => {
  const zeroDock = m.contract("ZeroDock", [], {
  });

  return { zeroDock };
});

export default ZeroDockModule;
