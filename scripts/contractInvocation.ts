import { JsonRpcProvider, Wallet, Contract } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// Replace with actual values
const CONTRACT_ADDRESS = "0xB49fA7dD4d70F773015a9c848A8719FA86D81275"; 
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