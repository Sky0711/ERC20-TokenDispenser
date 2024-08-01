import { ethers } from "hardhat";

async function main() {
    console.log("Starting deployment...");
    const beneficiary = "0x01462340B3C8b18A9f2e73634AD4443E9C0A62cB";

    // Get the signer to fetch the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy InheritanceToken
    const token = await ethers.deployContract("InheritanceToken", [deployer.address]);
    await token.waitForDeployment();
    console.log("InheritanceToken deployed to:", token.target);

    // Deploy InheritanceTokenDispenser
    const dispenser = await ethers.deployContract("InheritanceTokenDispenser", [token.target, beneficiary]);
    await dispenser.waitForDeployment();
    console.log("InheritanceTokenDispenser deployed to:", dispenser.target);

    // Transfer all tokens from the owner to the dispenser contract
    const totalSupply = await token.totalSupply();
    const transferTx = await token.transfer(dispenser.target, totalSupply);
    await transferTx.wait(); // Wait for the token transfer transaction to be mined
    console.log("All tokens transferred to the dispenser.");
}

main().then(() => process.exit(0)).catch(error => {
    console.error("Failed to deploy contracts:", error);
    process.exit(1);
});