import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("InheritanceTokenDispenser Tests", function () {
    let token: Contract;
    let dispenser: Contract;
    let deployer: any;

    async function deployContracts() {
        [deployer] = await ethers.getSigners();

        // Deploy InheritanceToken without redeclaring it
        token = await ethers.deployContract("InheritanceToken", [deployer.address]);
        await token.waitForDeployment();
        console.log("InheritanceToken deployed to:", token.target);

        // Deploy InheritanceTokenDispenser without redeclaring it
        dispenser = await ethers.deployContract("InheritanceTokenDispenser", [token.target, deployer.address]);
        await dispenser.waitForDeployment();
        console.log("InheritanceTokenDispenser deployed to:", dispenser.target);

        // Transfer all tokens to the dispenser
        await (await token.transfer(dispenser.target, await token.totalSupply())).wait();
    }

    describe("Constructor Checks", function () {
        const zeroAddress = ethers.ZeroAddress;
        before(async () => {
            await deployContracts();
        });

        it("should revert if the token address is zero", async () => {
            await expect(
                ethers.deployContract("InheritanceTokenDispenser", [zeroAddress, deployer.address])
            ).to.be.revertedWith("Token address cannot be zero");
        });
    
        it("should revert if the beneficiary address is zero", async () => {
            await expect(
                ethers.deployContract("InheritanceTokenDispenser", [token.target, zeroAddress])
            ).to.be.revertedWith("Beneficiary address cannot be zero");
        });
    
        it("should revert if the token address is not a contract", async () => {
            const nonContractAddress = deployer.address; // Using an EOA (Externally Owned Address) instead of a contract address
            await expect(
                ethers.deployContract("InheritanceTokenDispenser", [nonContractAddress, deployer.address])
            ).to.be.revertedWith("Provided token address must be a contract");
        });
    
        it("should deploy successfully with valid parameters", async () => {
            // Deploy InheritanceTokenDispenser with valid parameters
            const dispenser = await ethers.deployContract("InheritanceTokenDispenser", [token.target, deployer.address]);
            await dispenser.waitForDeployment();
            console.log("InheritanceTokenDispenser deployed to:", dispenser.target);
    
            // Check that the contract was deployed successfully
            expect(dispenser.target).to.not.be.undefined;
        });
    });

    describe("Basic Tests", function () {
        before(async () => {
            await deployContracts();
        });

        it("should have 700,000 tokens", async () => {
            // Check the balance of the dispenser
            expect(await token.balanceOf(dispenser.target)).to.equal(ethers.parseUnits("700000", 18));
        });

        it("should only allow the beneficiary to distribute tokens", async () => {
            const [_, nonBeneficiary] = await ethers.getSigners();
            await expect(dispenser.connect(nonBeneficiary).distribute()).to.be.revertedWith("Only beneficiary can distribute tokens");
        });

        it("should still have 700,000 tokens", async () => {
            // Check the balance of the dispenser
            expect(await token.balanceOf(dispenser.target)).to.equal(ethers.parseUnits("700000", 18));
        });

        it("should correctly distribute tokens when called", async () => {
            // Initial token balance of the beneficiary
            const initialBalance = await token.balanceOf(deployer.address);

            // Call distribute
            await dispenser.distribute();

            // Balance after distribution
            const afterDistributeBalance = await token.balanceOf(deployer.address);
            
            // Check if the balance after distribution is greater than the initial balance
            expect(afterDistributeBalance).to.be.gt(initialBalance);
        });

        it("should revert if called twice in the same month", async () => {
            // Try to call distribute again in the same month
            await expect(dispenser.distribute()).to.be.revertedWith("Already distributed this month");
        });
    });

    describe("Comprehensive Distribution Test", function () {
        before(async () => {
            await deployContracts();
        });
    
        it("should call distribute function month by month until balance is drained", async function () {
    
            const initialTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
            let currentTimestamp = initialTimestamp;
            let currentDate = new Date(currentTimestamp * 1000);
    
            let previousBalance = parseFloat(ethers.formatUnits(await token.balanceOf(deployer.address), 18));
    
            // Summary of the total distribution
            const summary = [];
    
            let previousDistributedAmount = 0;
            let periodStartMonth = currentDate.getMonth() + 1;
            let periodStartYear = currentDate.getFullYear();
            let totalDistributedInPeriod = 0;
            let overallTotalDistributed = 0;
    
            console.log('+------+-------+--------------------+');
            console.log('| Year | Month | Distributed Tokens |');
            console.log('+------+-------+--------------------+');
    
            while (true) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
    
                // Call distribute
                try {
                    await dispenser.distribute();
                } catch (err) {
                    // Check if the error message matches "No tokens left to distribute"
                    if (err.message.includes("No tokens left to distribute")) {
                        console.log("No more tokens to distribute.");
                        break;
                    } else {
                        throw err;
                    }
                }
    
                // Balance after distribution
                const newBalance = parseFloat(ethers.formatUnits(await token.balanceOf(deployer.address), 18));
                const distributedThisMonth = newBalance - previousBalance;
                previousBalance = newBalance;
    
                // Log the result
                console.log(
                    `| ${year.toString().padStart(4, ' ')} |` +
                    ` ${month.toString().padStart(5, ' ')} |` +
                    ` ${distributedThisMonth.toFixed(2).padStart(18, ' ')} |`
                );
                console.log('+------+-------+--------------------+');
    
                // If the distribution amount changed, log the summary for the previous period
                if (distributedThisMonth !== previousDistributedAmount && previousDistributedAmount !== 0) {
                    summary.push({
                        "Start Date": `${periodStartYear}-${String(periodStartMonth).padStart(2, '0')}`,
                        "End Date": `${year}-${String(month - 1).padStart(2, '0')}`,
                        "Distributed Tokens per Month": previousDistributedAmount.toFixed(2),
                        "Total Distributed in Period": totalDistributedInPeriod.toFixed(2)
                    });
    
                    // Reset for the next period
                    periodStartMonth = month;
                    periodStartYear = year;
                    overallTotalDistributed += totalDistributedInPeriod;
                    totalDistributedInPeriod = 0;
                }
    
                // Accumulate total distributed in this period
                totalDistributedInPeriod += distributedThisMonth;
    
                previousDistributedAmount = distributedThisMonth;
    
                // Move time forward by one month
                const currentMonth = currentDate.getMonth();
                currentDate.setMonth(currentMonth + 1);
    
                // If the month overflowed, reset the date to the first of the month
                if (currentDate.getMonth() !== (currentMonth + 1) % 12) {
                    currentDate.setDate(1);
                    currentDate.setMonth((currentMonth + 1) % 12);
                }
    
                currentTimestamp = Math.floor(currentDate.getTime() / 1000);
                await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
                await ethers.provider.send("evm_mine", []);
            }
    
            // Add the final period to the summary
            overallTotalDistributed += totalDistributedInPeriod;
            summary.push({
                "Start Date": `${periodStartYear}-${String(periodStartMonth).padStart(2, '0')}`,
                "End Date": `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
                "Distributed Tokens per Month": previousDistributedAmount.toFixed(2),
                "Total Distributed in Period": totalDistributedInPeriod.toFixed(2)
            });
    
            // Display summary in a table format
            console.table(summary);
    
            // Display overall total distributed
            console.log("Overall Total Distributed:", overallTotalDistributed.toFixed(2), "tokens");
    
            // Check final balance
            const finalBalance = parseFloat(ethers.formatUnits(await token.balanceOf(deployer.address), 18));
            console.log("Final Balance:", finalBalance.toFixed(2), "tokens");
        });
        
        it("should not distribute new tokens after balance is drained", async function () {
            // Move time forward by one more month
            let currentDate = new Date((await ethers.provider.getBlock("latest")).timestamp * 1000);
            const currentMonth = currentDate.getMonth();
            currentDate.setMonth(currentMonth + 1);
    
            const currentTimestamp = Math.floor(currentDate.getTime() / 1000);
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
            await ethers.provider.send("evm_mine", []);
    
            // Call distribute again
            await expect(dispenser.distribute()).to.be.revertedWith("No tokens left to distribute");
        });

    });

});
