import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    erigon: {
      url: "http://127.0.0.1:54906",
      accounts: ["0x12d7de8621a77640c9241b2595ba78ce443d05e94090365ab3bb5e19df82c625"], // account address (from Kurtosis README)
      gas: 3_000_000, // fixed gas limit
      gasPrice: 1_000_000_000, // required to force legacy Tx (no EIP-1559)
    }
  }
};

export default config;