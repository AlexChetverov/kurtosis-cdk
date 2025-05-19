# Kurtosis CDK – Precompile Challenge

This repository documents the full solution for the Polygon CDK Erigon precompile interaction challenge. It covers environment setup, precompile invocation using both shell and TypeScript, contract deployment, and verification.

---

## Stage Overview

| Stage | Description |
|-------|-------|
| 1     | Raw Precompile Invocation |
| 2     | Contract Wrapper Deployment |
| 3     | Contract Invocation |

---

## Environment Setup

### Prerequisites

- Docker
- [Kurtosis CLI](https://docs.kurtosis.com/install)
- Node.js (v18+)
- `npx`, `npm`, `ts-node`
- Hardhat (`npx hardhat`)

---

### Start the CDK Erigon Devnet

Run `cdk-erigon` instance. First clone `kurtosis-cdk`

```bash
git clone https://github.com/0xPolygon/kurtosis-cdk
```

Then deploy the complete CDK stack locally.

```bash
kurtosis run --enclave cdk github.com/0xPolygon/kurtosis-cdk
```

Once complete, inspect the enclave (you can also find info in deploying logs):

```bash
kurtosis enclave inspect cdk
```

Find the Erigon RPC port under `cdk-erigon-rpc-001`, e.g.:

```
rpc: 8123/tcp -> http://127.0.0.1:54906
```

---

Set up TypeScript configuration

### Typescript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}

```

## Stage 1 – Precompile Direct Call

### TypeScript Script

```ts
// scripts/callRawPrecompile.ts
import { ethers } from "hardhat";

const provider = new ethers.JsonRpcProvider("http://localhost:54906");

//Set initial conditions
const precompileType = {
  address: "0x0000000000000000000000000000000000000002",
  name: "SHA256"
};

const inputData = "0x47617465776179"; // "Gateway"

async function callPrecompile(type: { address: string; name: string }, data: string): Promise<void> {
  try {
    const tx = {
      to: type.address,
      data: data
    };

    const result: string = await provider.call(tx);
    console.log(`${type.name} result for ${inputData} is: ${result}`);
  } catch (err) {
    console.error("Error calling precompile:", err);
  }
}

callPrecompile(precompileType, inputData);
```

We can check that "0x47617465776179" is "Gateway" in UTF-8 by using any UTF-8 encoder (e.g. https://mothereff.in/utf-8) 

### Run It

```bash
npx hardhat run scripts/callRawPrecompile.ts
```

✅ Expected Output:

```
SHA256 result for 0x47617465776179 is: 0x41ed52921661c7f0d68d92511589cc9d7aaeab2b5db49fb27f0be336cbfdb7df
```

We can check that "Gateway" is "0x41ed52921661c7f0d68d92511589cc9d7aaeab2b5db49fb27f0be336cbfdb7df" in SHA256 by using any SHA256 encrypter (e.g. https://10015.io/tools/sha256-encrypt-decrypt)

---

## Stage 2 – Contract Wrapper Deployment

### Solidity Contract

Create solidity contract

```solidity
// contracts/PrecompileWrapper.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PrecompileWrapper {
    function sha256ViaPrecompile(bytes memory input) public view returns (bytes32) {
        (bool success, bytes memory result) = address(0x02).staticcall(input);
        require(success, "Precompile call failed");
        return abi.decode(result, (bytes32));
    }
}
```

### Hardhat Configuration

Update `hardhat.config.ts` (here we use private key from Kurtosis README):

```ts
// hardhat.config.ts
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
```

### TypeScript Script

```ts
// scripts/deployWrapper.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with:", deployer.address);

  const Wrapper = await ethers.getContractFactory("PrecompileWrapper");
  const contract = await Wrapper.deploy({ gasLimit: 1_000_000 });

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("PrecompileWrapper deployed to:", address);
}

main().catch(console.error);
```

### Deploy the Contract

```bash
npx hardhat run scripts/deployWrapper.ts --network erigon
```

📌 **Take note of:**
- Contract address
- Deployment transaction hash

---

## 🔎 Post-Deployment Checks

### Verify Deployment Success

#### 1. Check Transaction Receipt

```bash
curl -X POST http://127.0.0.1:PORT -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0xDEPLOY_TX_HASH"],"id":1}'
```

e.g.

```bash
curl -X POST http://127.0.0.1:54906 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0x6c72118a1d379215224c9c50b93ac98ef1249d646c7747e116e843d9b57c6cb7"],"id":1}'
```

✅ Look for `"status":"0x1"`. It indicates the transaction was successful and finalized on-chain

#### 2. Verify Contract Bytecode Exists

```bash
curl -X POST http://127.0.0.1:PORT -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xCONTRACT_ADDRESS","latest"],"id":1}'
```

e.g.

```bash
 curl -X POST http://127.0.0.1:54906 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xB49fA7dD4d70F773015a9c848A8719FA86D81275","latest"],"id":1}'
```


✅ Should return non-empty `"result": "0x..."`. A non-empty "result" means the contract was successfully deployed, and EVM bytecode is stored at the address.

---

## Stage 3 – Contract Invocation

### TypeScript Script

```ts
// scripts/contractInvocation.ts
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// Replace with actual values
const CONTRACT_ADDRESS = "0xB49fA7dD4d70F773015a9c848A8719FA86D81275"; // contract address taking from running // scripts/deployWrapper.ts

const RPC_URL = "http://127.0.0.1:54906";
const PRIVATE_KEY = "0x12d7de8621a77640c9241b2595ba78ce443d05e94090365ab3bb5e19df82c625"; // private key (from Kurtosis README)

const artifact = JSON.parse(fs.readFileSync("artifacts/contracts/PrecompileWrapper.sol/PrecompileWrapper.json", "utf8"));
const ABI = artifact.abi;

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const precompileWrapper = new Contract(CONTRACT_ADDRESS, ABI, wallet);

  const input = new TextEncoder().encode("Gateway"); // "Gateway" => bytes
  const result = await precompileWrapper.sha256ViaPrecompile(input);

  console.log("SHA256 of 'Gateway' via precompile:", result);
}

main().catch((err) => {
  console.error("Error in script execution:", err);
});
```

### Run It

```bash
npx hardhat run scripts/contractInvocation.ts
```

✅ Expected Output:

```
SHA256 of 'Gateway' via precompile: 0x41ed52921661c7f0d68d92511589cc9d7aaeab2b5db49fb27f0be336cbfdb7df
```

---

## Summary

| Stage | Outcome |
|-------|---------|
| Stage 1 | ✅ Script returned correct SHA256 |
| Stage 2 | ✅ Deployed wrapper with fixed gas and legacy tx |
| Stage 3 | ✅ Invoked wrapper and verified deterministic result |

---

## 🗂 Files

- `contracts/PrecompileWrapper.sol`
- `scripts/callRawPrecompile.ts`
- `scripts/deployWrapper.ts`
- `scripts/contractInvocation.ts`
- `results.json`
- `hardhat.config.ts`
- `tsconfig.json`

---

