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