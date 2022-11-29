const { expect } = require("chai");
const { cons } = require("fp-ts/lib/NonEmptyArray2v");
const { ethers, upgrades } = require("hardhat");

describe("DeveloperNFT", function () {
  let developer;
  let VegasONE;
  let owner;
  let signer1;
  let signer2;
  let signers;
  let price = ethers.utils.parseEther("1");
  let emptyAddress = "0x0000000000000000000000000000000000000000";
  const ADMIN =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  beforeEach(async function () {
    let developerFactory = await ethers.getContractFactory("DeveloperNFT");
    let VegasONEFactory = await ethers.getContractFactory("VegasONE");

    [owner, signer1, signer2, ...signers] = await ethers.getSigners();

    // deploy VegasONE(ERC20)
    VegasONE = await VegasONEFactory.deploy(
      "VegasONE",
      "VOC",
      ethers.utils.parseEther("10")
    );
    await VegasONE.deployed();

    // deploy developer, signer1 as backend address
    developer = await upgrades.deployProxy(
      developerFactory,
      ["tn", "ts", 100, signer1.address, VegasONE.address, price],
      { kind: "uups" }
    );
    await developer.deployed();
  });

  describe("checkTokenAndMint", function () {
    it("Positive", async function () {
      // set period token supply
      const setPeriodTokenSupply = await developer.setPeriodTokenSupply(50);
      await setPeriodTokenSupply.wait();

      // mint VegasONE to signer2
      const amount = ethers.utils.parseEther("5");
      await VegasONE.mint(signer2.address, amount);

      // generate uuid
      let uuid = "uuid";
      // generate deadline: after 7 days
      let today = new Date();
      let newDate = new Date(today.setDate(today.getDate() + 7));
      let deadline = Math.floor(newDate / 1000);

      // get userAddress (signer2 as user)
      let userAddress = signer2.address;
      let uri =
        "https://www.taisys.dev/ipfs/QmU2Xc2xoD9rwTgXhkrB3C354U4F6rmL1RRqoGV4L8axSX";

      const domain = {
        name: "tn",
        version: "1",
        chainId: 31337,
        verifyingContract: developer.address,
      };

      const types = {
        CheckToken: [
          { name: "uuid", type: "string" },
          { name: "userAddress", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "uri", type: "string" },
        ],
      };

      const value = {
        uuid: uuid,
        userAddress: userAddress,
        deadline: deadline,
        uri: uri,
      };

      // backend signed signature
      const signature = await signer1._signTypedData(domain, types, value);

      const approvalTx = await VegasONE.connect(signer2).approve(
        developer.address,
        price
      );

      await approvalTx.wait();

      const tx = await developer
        .connect(signer2)
        .checkTokenAndMint(uuid, userAddress, deadline, uri, signature);

      await tx.wait();

      // check signer2 has one token
      const ownedId = await developer.tokensOfOwner(userAddress);
      expect(0).to.equal(ownedId[0]);
    });

    it("Negative/alreadyOneNFT", async function () {
      // set period token supply
      const setPeriodTokenSupply = await developer.setPeriodTokenSupply(50);
      await setPeriodTokenSupply.wait();

      // mint VegasONE to signer2
      const amount = ethers.utils.parseEther("5");
      await VegasONE.mint(signer2.address, amount);

      // generate uuid
      let uuid = "uuid";
      let uuid2 = "uuid2";
      // generate deadline: after 7 days
      let today = new Date();
      let newDate = new Date(today.setDate(today.getDate() + 7));
      let deadline = Math.floor(newDate / 1000);

      // get userAddress (signer2 as user)
      let userAddress = signer2.address;
      let uri =
        "https://www.taisys.dev/ipfs/QmU2Xc2xoD9rwTgXhkrB3C354U4F6rmL1RRqoGV4L8axSX";

      const domain = {
        name: "tn",
        version: "1",
        chainId: 31337,
        verifyingContract: developer.address,
      };

      const types = {
        CheckToken: [
          { name: "uuid", type: "string" },
          { name: "userAddress", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "uri", type: "string" },
        ],
      };

      const value = {
        uuid: uuid,
        userAddress: userAddress,
        deadline: deadline,
        uri: uri,
      };

      const value2 = {
        uuid: uuid2,
        userAddress: userAddress,
        deadline: deadline,
        uri: uri,
      };

      // backend signed signature
      const signature = await signer1._signTypedData(domain, types, value);
      const signature2 = await signer1._signTypedData(domain, types, value2);

      const approvalTx = await VegasONE.connect(signer2).approve(
        developer.address,
        price
      );

      await approvalTx.wait();

      const tx = await developer
        .connect(signer2)
        .checkTokenAndMint(uuid, userAddress, deadline, uri, signature);

      await tx.wait();

      const tx2 = developer
        .connect(signer2)
        .checkTokenAndMint(uuid2, userAddress, deadline, uri, signature2);

      await expect(tx2).to.be.revertedWith("ERC721A: already have one NFT");
    });
  });

  describe("setMaxToken", function () {
    it("Positive", async function () {
      const tx = await developer.setMaxTokenSupply(1000);
      await tx.wait();

      // check maxTokenSupply
      const maxTokenSupply = await developer.maxTokenSupply();
      expect(maxTokenSupply).to.equal(1000);
    });

    it("Negative/currntTokenAlready", async function () {
      const tx1 = await developer.setMaxTokenSupply(1000);
      await tx1.wait();

      const tx2 = await developer.setPeriodTokenSupply(50);
      await tx2.wait();

      const tx3 = developer.setMaxTokenSupply(100);

      await expect(tx3).to.be.revertedWith(
        "ERC721A: periodToken already set, cannot change maxToken"
      );
    });
  });

  describe("setPeriodToken", function () {
    it("Positive", async function () {
      const tx1 = await developer.setMaxTokenSupply(1000);
      await tx1.wait();

      const tx2 = await developer.setPeriodTokenSupply(50);
      await tx2.wait();

      const periodTokenSupply = await developer.periodTokenSupply();
      expect(periodTokenSupply).to.equal(50);
    });

    it("Negative/periodTokenNotMinted", async function () {
      const tx1 = await developer.setPeriodTokenSupply(50);
      await tx1.wait();

      const tx2 = developer.setPeriodTokenSupply(50);

      await expect(tx2).to.be.revertedWith(
        "ERC721A: periodToken haven't all be minted"
      );
    });
  });

  describe("setPrice", function () {
    it("Positive", async function () {
      const tx = await developer.setPrice(ethers.utils.parseEther("2"));
      await tx.wait();

      const price = await developer.price();
      expect(price).to.equal(ethers.utils.parseEther("2"));
    });

    it("Negative/priceUnderZero", async function () {
      const tx = developer.setPrice(ethers.utils.parseEther("0"));

      await expect(tx).to.be.revertedWith(
        "ERC721A: price cannot smaller than 0"
      );
    });
  });

  describe("withdraw", function () {
    it("Positive", async function () {
      // set period token supply
      const setPeriodTokenSupply = await developer.setPeriodTokenSupply(50);
      await setPeriodTokenSupply.wait();

      // mint VegasONE to signer2
      const amount = ethers.utils.parseEther("5");
      await VegasONE.mint(signer2.address, amount);

      // generate uuid
      let uuid = "uuid";
      // generate deadline: after 7 days
      let today = new Date();
      let newDate = new Date(today.setDate(today.getDate() + 7));
      let deadline = Math.floor(newDate / 1000);

      // get userAddress (signer2 as user)
      let userAddress = signer2.address;
      let uri =
        "https://www.taisys.dev/ipfs/QmU2Xc2xoD9rwTgXhkrB3C354U4F6rmL1RRqoGV4L8axSX";

      const domain = {
        name: "tn",
        version: "1",
        chainId: 31337,
        verifyingContract: developer.address,
      };

      const types = {
        CheckToken: [
          { name: "uuid", type: "string" },
          { name: "userAddress", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "uri", type: "string" },
        ],
      };

      const value = {
        uuid: uuid,
        userAddress: userAddress,
        deadline: deadline,
        uri: uri,
      };

      // backend signed signature
      const signature = await signer1._signTypedData(domain, types, value);

      const approvalTx = await VegasONE.connect(signer2).approve(
        developer.address,
        price
      );

      await approvalTx.wait();

      const tx = await developer
        .connect(signer2)
        .checkTokenAndMint(uuid, userAddress, deadline, uri, signature);

      await tx.wait();

      await developer.withdraw(owner.address, price);
      const balanceOfOwner = await VegasONE.balanceOf(owner.address);
      expect(balanceOfOwner).to.equal(price);
    });
  });

  describe("tokensOfOwner", function () {
    it("Positive", async function () {
      // set period token supply
      const setPeriodTokenSupply = await developer.setPeriodTokenSupply(50);
      await setPeriodTokenSupply.wait();

      // mint VegasONE to signer2
      const amount = ethers.utils.parseEther("5");
      await VegasONE.mint(signer2.address, amount);

      // generate uuid
      let uuid = "uuid";
      // generate deadline: after 7 days
      let today = new Date();
      let newDate = new Date(today.setDate(today.getDate() + 7));
      let deadline = Math.floor(newDate / 1000);

      // get userAddress (signer2 as user)
      let userAddress = signer2.address;
      let uri =
        "https://www.taisys.dev/ipfs/QmU2Xc2xoD9rwTgXhkrB3C354U4F6rmL1RRqoGV4L8axSX";

      const domain = {
        name: "tn",
        version: "1",
        chainId: 31337,
        verifyingContract: developer.address,
      };

      const types = {
        CheckToken: [
          { name: "uuid", type: "string" },
          { name: "userAddress", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "uri", type: "string" },
        ],
      };

      const value = {
        uuid: uuid,
        userAddress: userAddress,
        deadline: deadline,
        uri: uri,
      };

      // backend signed signature
      const signature = await signer1._signTypedData(domain, types, value);

      const approvalTx = await VegasONE.connect(signer2).approve(
        developer.address,
        price
      );

      await approvalTx.wait();

      const tx = await developer
        .connect(signer2)
        .checkTokenAndMint(uuid, userAddress, deadline, uri, signature);

      await tx.wait();

      let ownedTokenId = await developer.tokensOfOwner(signer2.address);
      expect(0).to.equal(ownedTokenId[0]);
    });

    it("Negative", async function () {
      let ownedTokenId = await developer.tokensOfOwner(signer1.address);
      expect(ownedTokenId.length).to.equal(0);
    });
  });

  describe("transferAdmin", function () {
    it("Positive", async function () {
      const transferAdmin = await developer.transferAdmin(signer1.address);
      await transferAdmin.wait();

      const updateAdminTx = await developer
        .connect(signer1)
        .updateAdmin(owner.address);
      await updateAdminTx.wait();

      const tx = await developer.hasRole(ADMIN, signer1.address);

      expect(tx).to.equal(true);
    });

    it("Negative/ErrIntransition", async function () {
      const transferAdminTx = await developer.transferAdmin(signer1.address);
      await transferAdminTx.wait();

      const transferAdmin2Tx = developer.transferAdmin(signer2.address);

      await expect(transferAdmin2Tx).to.be.revertedWith("ErrIntransition");
    });

    it("Negative/ErrNotIntransition", async function () {
      const grantRoleTx = await developer.grantRole(ADMIN, signer1.address);
      await grantRoleTx.wait();

      const tx = developer.connect(signer1).updateAdmin(owner.address);

      await expect(tx).to.be.revertedWith("ErrNotIntransition");
    });

    it("Negative/ErrInvalidTransition", async function () {
      const transferAdminTx = await developer.transferAdmin(signer2.address);
      await transferAdminTx.wait();

      const grantRoleTx = await developer.grantRole(ADMIN, signer1.address);
      await grantRoleTx.wait();

      const updateAdminTx = developer
        .connect(signer1)
        .updateAdmin(owner.address);

      await expect(updateAdminTx).to.be.revertedWith("ErrInvalidTransition");
    });

    it("Negative/ErrGrantRoleInValidAddress/Address(0)", async function () {
      const tx = developer.transferAdmin(emptyAddress);

      await expect(tx).to.be.revertedWith("ErrGrantRoleInValidAddress");
    });

    it("Negative/ErrGrantRoleInValidAddress/MsgSenderAddress", async function () {
      const tx = developer.transferAdmin(owner.address);

      await expect(tx).to.be.revertedWith("ErrGrantRoleInValidAddress");
    });
  });
});
