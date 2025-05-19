import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with:", deployer.address);

  const Wrapper = await ethers.getContractFactory("PrecompileWrapper");

  // Deploy with explicit gas limit and legacy type (type: 0)
  const txResponse = await Wrapper.deploy({ gasLimit: 1_000_000, type: 0 });
  const contract = await txResponse.waitForDeployment();

  // Access from txResponse instead of contract to avoid undefined error
  console.log("PrecompileWrapper deployed to:", contract.target);
  console.log("Deployment tx hash:", txResponse.deploymentTransaction()?.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});