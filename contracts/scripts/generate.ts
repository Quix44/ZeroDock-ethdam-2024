const hre = require("hardhat");

async function main() {
    const accounts = await hre.ethers.getSigners();

    let [owner, user1, user2] = await hre.ethers.getSigners();

    const con = await hre.ethers.getContractFactory("ZeroDock");
    const zeroDock = con.attach("0x0ba547ae5bccf9a028ad69e0443268d46f9c28c1")

    // Create the tournament
    const txn = await zeroDock.generate(
        1, 1
    );
    await txn.wait();
    console.log("Transaction Complete")
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});