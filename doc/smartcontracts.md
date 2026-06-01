> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Smart Contract Guide

> For smart contract developers who wish to build on top of Story directly.

In this section, we will briefly go over the protocol contracts and then guide you through how to start building on top of the protocol. If you haven't yet familiarized yourself with the overall architecture, we recommend first going over the [Architecture Overview](/concepts/overview) section.

## Smart Contract Tutorial

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate" icon="thumbs-up">
  Skip the tutorial and view the completed code. Follow the README instructions
  to run the tests, or go to the `/test` folder to view all of the example
  contracts.
</Card>

**If you want to set things up from scratch**, then continue with the following tutorials, starting with the [Setup Your Own Project](/developers/smart-contracts-guide/setup) step.

## Our Smart Contracts

As of the current version, our Proof-of-Creativity Protocol is compatible with all EVM chains and is written as a set of Smart Contracts in Solidity. There are two repositories that you may interact with as a developer:

* [Story Protocol Core](https://github.com/storyprotocol/protocol-core-v1) - This repository contains the core protocol logic, consisting of a thin IP registry (the [IP Asset Registry](/concepts/registry/ip-asset-registry)), a set of [Modules](/concepts/modules/overview) defining logic around [Licensing](/concepts/licensing-module/overview), [Royalty](/concepts/royalty-module/overview), [Dispute](/concepts/dispute-module/overview), metadata, and a module manager for administering module and user access control.
* [Story Protocol Periphery](https://github.com/storyprotocol/protocol-periphery-v1)- Whereas the core contracts deal with the underlying protocol logic, the periphery contracts deal with protocol extensions that greatly increase UX and simplify IPA management. This is mostly handled through the [SPG](/concepts/spg/overview).

## Deploy & Verify Contracts on Story

<Note>
  The approach to deploy & verify contracts comes from the [Blockscout official
  documentation](https://docs.blockscout.com/developer-support/verifying-a-smart-contract/foundry-verification).
</Note>

Verify a contract with Blockscout right after deployment (make sure you add "/api/" to the end of the Blockscout homepage explorer URL):

```shell theme={null}
forge create \
  --rpc-url <rpc_https_endpoint> \
  --private-key $PRIVATE_KEY \
  <contract_file>:<contract_name> \
  --verify \
  --verifier blockscout \
  --verifier-url <blockscout_homepage_explorer_url>/api/
```

Or if using foundry scripts:

```shell theme={null}
forge script <script_file> \
  --rpc-url <rpc_https_endpoint> \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url <blockscout_homepage_explorer_url>/api/
```

<Warning>
  Do not use RANDAO for pseudo-randomness, instead use onchain VRF (Pyth or Gelato). Currently, RANDAO value is set as the parent block hash and thus is not random for X-1 block.
</Warning>


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Setup

> Set up your development environment for Story smart contracts.

In this guide, we will show you how to setup the Story smart contract development environment in just a few minutes.

## Prerequisites

* [Install Foundry](https://book.getfoundry.sh/getting-started/installation)
* [Install yarn](https://classic.yarnpkg.com/lang/en/docs/install/)

## Creating a Project

1. Run `foundryup` to automatically install the latest stable version of the precompiled binaries: forge, cast, anvil, and chisel
2. Run the following command in a new directory: `forge init`. This will create a `foundry.toml` and example project files in the project root. By default, forge init will also initialize a new git repository.
3. Initialize a new yarn project: `yarn init`. (⚠️ Note: Only Yarn is compatible with the packages used in this project. Using `npm` or `pnpm` may result in dependency conflicts.)
4. Open up your root-level `foundry.toml` file (located in the top directory of your project) and replace it with this:

```toml theme={null}
[profile.default]
out = 'out'
libs = ['node_modules', 'lib']
cache_path  = 'forge-cache'
gas_reports = ["*"]
optimizer = true
optimizer_runs = 20000
test = 'test'
solc = '0.8.26'
fs_permissions = [{ access = 'read', path = './out' }, { access = 'read-write', path = './deploy-out' }]
evm_version = 'cancun'
remappings = [
    '@openzeppelin/=node_modules/@openzeppelin/',
    '@storyprotocol/core/=node_modules/@story-protocol/protocol-core/contracts/',
    '@storyprotocol/periphery/=node_modules/@story-protocol/protocol-periphery/contracts/',
    'erc6551/=node_modules/erc6551/',
    'forge-std/=node_modules/forge-std/src/',
    'ds-test/=node_modules/ds-test/src/',
    '@storyprotocol/test/=node_modules/@story-protocol/protocol-core/test/foundry/',
    '@solady/=node_modules/solady/'
]
```

5. Remove the example contract files: `rm src/Counter.sol script/Counter.s.sol test/Counter.t.sol`

## Installing Dependencies

Now, we are ready to start installing our dependencies. To incorporate the Story Protocol core and periphery modules, run the following to have them added to your `package.json`. We will also install `openzeppelin` and `erc6551` as a dependency for the contract and test.

```bash theme={null}
# note: you can run them one-by-one, or all at once
yarn add @story-protocol/protocol-core@https://github.com/storyprotocol/protocol-core-v1
yarn add @story-protocol/protocol-periphery@https://github.com/storyprotocol/protocol-periphery-v1
yarn add @openzeppelin/contracts
yarn add @openzeppelin/contracts-upgradeable
yarn add erc6551
yarn add solady
```

Additionally, for working with Foundry's test kit, we also recommend adding the following `devDependencies`:

```bash theme={null}
yarn add -D https://github.com/dapphub/ds-test
yarn add -D github:foundry-rs/forge-std#v1.7.6
```

Now we are ready to build a simple test registration contract!


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Register an IP Asset

> Learn how to Register an NFT as an IP Asset in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/0_IPARegistrar.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Let's say you have some off-chain IP (ex. a book, a character, a drawing, etc). In order to register that IP on Story, you first need to mint an NFT. This NFT is the **ownership** over the IP. Then you **register** that NFT on Story, turning it into an [IP Asset](/concepts/ip-asset/overview). The below tutorial will walk you through how to do this.

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)

## Before We Start

There are two scenarios:

1. You already have a **custom** ERC-721 NFT contract and can mint from it
2. You want to create an [SPG (Periphery)](/concepts/spg/overview) NFT contract to do minting for you

## Scenario #1: You already have a custom ERC-721 NFT contract and can mint from it

If you already have an NFT minted, or you want to register IP using a custom-built ERC-721 contract, this is the section for you.

As you can see below, the registration process is relatively straightforward. We use `SimpleNFT` as an example, but you can replace it with your own ERC-721 contract.

All you have to do is call `register` on the [IP Asset Registry](/concepts/registry/ip-asset-registry) with:

* `chainid` - you can simply use `block.chainid`
* `tokenContract` - the address of your NFT collection
* `tokenId` - your NFT's ID

Let's create a test file under `test/0_IPARegistrar.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)

  You can view the `SimpleNFT` contract we're using to test [here](https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/src/mocks/SimpleNFT.sol).
</Note>

<Info>
  You can view the `SimpleNFT` contract we're using to test [here](https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/src/mocks/SimpleNFT.sol).
</Info>

```solidity test/0_IPARegistrar.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";

// your own ERC-721 NFT contract
import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/0_IPARegistrar.t.sol
contract IPARegistrarTest is Test {
    address internal alice = address(0xa11ce);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IIPAssetRegistry internal IP_ASSET_REGISTRY = IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);

    SimpleNFT public SIMPLE_NFT;

    function setUp() public {
        // Create a new Simple NFT collection
        SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
    }

    /// @notice Mint an NFT and then register it as an IP Asset.
    function test_register() public {
        uint256 expectedTokenId = SIMPLE_NFT.nextTokenId();
        address expectedIpId = IP_ASSET_REGISTRY.ipId(block.chainid, address(SIMPLE_NFT), expectedTokenId);

        uint256 tokenId = SIMPLE_NFT.mint(alice);
        address ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

        assertEq(tokenId, expectedTokenId);
        assertEq(ipId, expectedIpId);
        assertEq(SIMPLE_NFT.ownerOf(tokenId), alice);
    }
}
```

## Scenario #2: You want to create an SPG NFT contract to do minting for you

If you don't have your own custom NFT contract, this is the section for you.

To achieve this, we will be using the [SPG](/concepts/spg/overview), which is a utility contract that allows us to combine multiple transactions into one. In this case, we'll be using the SPG's `mintAndRegisterIp` function which combines both minting an NFT and registering it as an IP Asset.

In order to use `mintAndRegisterIp`, we first have to create a new `SPGNFT` collection. We can do this simply by calling `createCollection` on the `StoryProtocolGateway` contract. Or, if you want to create your own `SPGNFT` for some reason, you can implement the [ISPGNFT](https://github.com/storyprotocol/protocol-periphery-v1/blob/main/contracts/interfaces/ISPGNFT.sol) contract interface. Follow the example below to see example parameters you can use to initialize a new SPGNFT.

Once you have your own SPGNFT, all you have to do is call `mintAndRegisterIp` with:

* `spgNftContract` - the address of your SPGNFT contract
* `recipient` - the address of who will receive the NFT and thus be the owner of the newly registered IP. *Note: remember that registering IP on Story is permissionless, so you can register an IP for someone else (by paying for the transaction) yet they can still be the owner of that IP Asset.*
* `ipMetadata` - the metadata associated with your NFT & IP. See [this](/concepts/ip-asset/overview#nft-vs-ip-metadata) section to better understand setting NFT & IP metadata.

1. Run `touch test/0_IPARegistrar.t.sol` to create a test file under `test/0_IPARegistrar.t.sol`. Then, paste in the following code:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/0_IPARegistrar.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ISPGNFT } from "@storyprotocol/periphery/interfaces/ISPGNFT.sol";
import { IRegistrationWorkflows } from "@storyprotocol/periphery/interfaces/workflows/IRegistrationWorkflows.sol";
import { WorkflowStructs } from "@storyprotocol/periphery/lib/WorkflowStructs.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/0_IPARegistrar.t.sol
contract IPARegistrarTest is Test {
    address internal alice = address(0xa11ce);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IIPAssetRegistry internal IP_ASSET_REGISTRY = IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    // Protocol Periphery - RegistrationWorkflows
    IRegistrationWorkflows internal REGISTRATION_WORKFLOWS =
        IRegistrationWorkflows(0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424);

    ISPGNFT public SPG_NFT;

    function setUp() public {
        // Create a new NFT collection via SPG
        SPG_NFT = ISPGNFT(
            REGISTRATION_WORKFLOWS.createCollection(
                ISPGNFT.InitParams({
                    name: "Test Collection",
                    symbol: "TEST",
                    baseURI: "",
                    contractURI: "",
                    maxSupply: 100,
                    mintFee: 0,
                    mintFeeToken: address(0),
                    mintFeeRecipient: address(this),
                    owner: address(this),
                    mintOpen: true,
                    isPublicMinting: false
                })
            )
        );
    }

    /// @notice Mint an NFT and register it in the same call via the Story Protocol Gateway.
    /// @dev Requires the collection address that is passed into the `mintAndRegisterIp` function
    /// to be created via SPG (createCollection), as done above. Or, a contract that
    /// implements the `ISPGNFT` interface.
    function test_mintAndRegisterIp() public {
        uint256 expectedTokenId = SPG_NFT.totalSupply() + 1;
        address expectedIpId = IP_ASSET_REGISTRY.ipId(block.chainid, address(SPG_NFT), expectedTokenId);

        // Note: The caller of this function must be the owner of the SPG NFT Collection.
        // In this case, the owner of the SPG NFT Collection is the contract itself
        // because it deployed it in the `setup` function.
        // We can make `alice` the recipient of the NFT though, which makes her the
        // owner of not only the NFT, but therefore the IP Asset.
        (address ipId, uint256 tokenId) = REGISTRATION_WORKFLOWS.mintAndRegisterIp(
            address(SPG_NFT),
            alice,
            WorkflowStructs.IPMetadata({
                ipMetadataURI: "https://ipfs.io/ipfs/QmZHfQdFA2cb3ASdmeGS5K6rZjz65osUddYMURDx21bT73",
                ipMetadataHash: keccak256(
                    abi.encodePacked(
                        "{'title':'My IP Asset','description':'This is a test IP asset','createdAt':'','creators':[]}"
                    )
                ),
                nftMetadataURI: "https://ipfs.io/ipfs/QmRL5PcK66J1mbtTZSw1nwVqrGxt98onStx6LgeHTDbEey",
                nftMetadataHash: keccak256(
                    abi.encodePacked(
                        "{'name':'Test NFT','description':'This is a test NFT','image':'https://picsum.photos/200'}"
                    )
                )
            }),
            true
        );

        assertEq(ipId, expectedIpId);
        assertEq(tokenId, expectedTokenId);
        assertEq(SPG_NFT.ownerOf(tokenId), alice);
    }
}
```

## Run the Test and Verify the Results

2. Run `forge build`. If everything is successful, the command should successfully compile.

3. Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/0_IPARegistrar.t.sol
```

## Add License Terms to IP

Congratulations, you registered an IP!

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/0_IPARegistrar.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Now that your IP is registered, you can create and attach [License Terms](/concepts/licensing-module/license-terms) to it. This will allow others to mint a license and use your IP, restricted by the terms.

We will go over this on the next page.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Register License Terms

> Learn how to create new License Terms in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/1_LicenseTerms.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

[License Terms](/concepts/licensing-module/license-terms) are a configurable set of values that define restrictions on licenses minted from your IP that have those terms. For example, "If you mint this license, you must share 50% of your revenue with me." You can view the full set of terms in [PIL Terms](/concepts/programmable-ip-license/pil-terms).

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)

## Before We Start

It's important to know that if **License Terms already exist for the identical set of parameters you intend to create, it is unnecessary to create it again**. License Terms are protocol-wide, so you can use existing License Terms by its `licenseTermsId`.

## Register License Terms

You can view the full set of terms in [PIL Terms](/concepts/programmable-ip-license/pil-terms).

Let's create a test file under `test/1_LicenseTerms.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/1_LicenseTerms.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILTerms } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/1_LicenseTerms.t.sol
contract LicenseTermsTest is Test {
    address internal alice = address(0xa11ce);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - PILicenseTemplate
    IPILicenseTemplate internal PIL_TEMPLATE = IPILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    // Protocol Core - RoyaltyPolicyLAP
    address internal ROYALTY_POLICY_LAP = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    // Revenue Token - MERC20
    address internal MERC20 = 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E;

    function setUp() public {}

    /// @notice Registers new PIL Terms. Anyone can register PIL Terms.
    function test_registerPILTerms() public {
        PILTerms memory pilTerms = PILTerms({
            transferable: true,
            royaltyPolicy: ROYALTY_POLICY_LAP,
            defaultMintingFee: 0,
            expiration: 0,
            commercialUse: true,
            commercialAttribution: true,
            commercializerChecker: address(0),
            commercializerCheckerData: "",
            commercialRevShare: 0,
            commercialRevCeiling: 0,
            derivativesAllowed: true,
            derivativesAttribution: true,
            derivativesApproval: true,
            derivativesReciprocal: true,
            derivativeRevCeiling: 0,
            currency: MERC20,
            uri: ""
        });
        uint256 licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(pilTerms);

        uint256 selectedLicenseTermsId = PIL_TEMPLATE.getLicenseTermsId(pilTerms);
        assertEq(licenseTermsId, selectedLicenseTermsId);
    }
}
```

### PIL Flavors

As you see above, you have to choose between a lot of terms.

We have convenience functions to help you register new terms. We have created [PIL Flavors](/concepts/programmable-ip-license/pil-flavors), which are pre-configured popular combinations of License Terms to help you decide what terms to use. You can view those PIL Flavors and then register terms using the following convenience functions:

<CardGroup cols={2}>
  <Card title="Non-Commercial Social Remixing" href="/concepts/programmable-ip-license/pil-flavors#non-commercial-social-remixing" icon="file">
    Free remixing with attribution. No commercialization.
  </Card>

  <Card title="Commercial Use" href="/concepts/programmable-ip-license/pil-flavors#commercial-use" icon="file">
    Pay to use the license with attribution, but don't have to share revenue.
  </Card>

  <Card title="Commercial Remix" href="/concepts/programmable-ip-license/pil-flavors#commercial-remix" icon="file">
    Pay to use the license with attribution and pay % of revenue earned.
  </Card>

  <Card title="Creative Commons Attribution" href="/concepts/programmable-ip-license/pil-flavors#creative-commons-attribution" icon="file">
    Free remixing and commercial use with attribution.
  </Card>
</CardGroup>

For example:

```solidity Solidity theme={null}
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";

PILTerms memory pilTerms = PILFlavors.commercialRemix({
  mintingFee: 0,
  commercialRevShare: 5 * 10 ** 6, // 5% rev share
  royaltyPolicy: ROYALTY_POLICY_LAP,
  currencyToken: MERC20
});
```

## Test Your Code!

Run `forge build`. If everything is successful, the command should successfully compile.

Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/1_LicenseTerms.t.sol
```

## Attach Terms to Your IP

Congratulations, you created new license terms!

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/1_LicenseTerms.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Now that you have registered new license terms, we can attach them to an IP Asset. This will allow others to mint a license and use your IP, restricted by the terms.

We will go over this on the next page.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Attach Terms to an IPA

> Learn how to attach License Terms to an IP Asset in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/2_AttachTerms.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

This section demonstrates how to attach [License Terms](/concepts/licensing-module/license-terms) to an [IP Asset](/concepts/ip-asset/overview). By attaching terms, users can publicly mint [License Tokens](/concepts/licensing-module/license-token) (the on-chain "license") with those terms from the IP.

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)
2. Create License Terms and have a `licenseTermsId`. You can do that by following the [previous page](/developers/smart-contracts-guide/register-terms).

## Attach License Terms

Now that we have created terms and have the associated `licenseTermsId`, we can attach them to an existing IP Asset.

Let's create a test file under `test/2_AttachTerms.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/2_AttachTerms.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
// for testing purposes only
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { PILTerms } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";

import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/2_AttachTerms.t.sol
contract AttachTermsTest is Test {
    address internal alice = address(0xa11ce);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IIPAssetRegistry internal IP_ASSET_REGISTRY = IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    // Protocol Core - LicenseRegistry
    ILicenseRegistry internal LICENSE_REGISTRY = ILicenseRegistry(0x529a750E02d8E2f15649c13D69a465286a780e24);
    // Protocol Core - LicensingModule
    ILicensingModule internal LICENSING_MODULE = ILicensingModule(0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f);
    // Protocol Core - PILicenseTemplate
    IPILicenseTemplate internal PIL_TEMPLATE = IPILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    // Protocol Core - RoyaltyPolicyLAP
    address internal ROYALTY_POLICY_LAP = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    // Revenue Token - MERC20
    address internal MERC20 = 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E;

    SimpleNFT public SIMPLE_NFT;
    uint256 public tokenId;
    address public ipId;
    uint256 public licenseTermsId;

    function setUp() public {
        // this is only for testing purposes
        // due to our IPGraph precompile not being
        // deployed on the fork
        vm.etch(address(0x0101), address(new MockIPGraph()).code);

        SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
        tokenId = SIMPLE_NFT.mint(alice);
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

        // Register random Commercial Remix terms so we can attach them later
        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: 10 * 10 ** 6, // 10%
                royaltyPolicy: ROYALTY_POLICY_LAP,
                currencyToken: MERC20
            })
        );
    }

    /// @notice Attaches license terms to an IP Asset.
    /// @dev Only the owner of an IP Asset can attach license terms to it.
    /// So in this case, alice has to be the caller of the function because
    /// she owns the NFT associated with the IP Asset.
    function test_attachLicenseTerms() public {
        vm.prank(alice);
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);

        assertTrue(LICENSE_REGISTRY.hasIpAttachedLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId));
        assertEq(LICENSE_REGISTRY.getAttachedLicenseTermsCount(ipId), 1);
        (address licenseTemplate, uint256 attachedLicenseTermsId) = LICENSE_REGISTRY.getAttachedLicenseTerms({
            ipId: ipId,
            index: 0
        });
        assertEq(licenseTemplate, address(PIL_TEMPLATE));
        assertEq(attachedLicenseTermsId, licenseTermsId);
    }
}
```

## Test Your Code!

Run `forge build`. If everything is successful, the command should successfully compile.

Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/2_AttachTerms.t.sol
```

## Mint a License

Congratulations, you attached terms to an IPA!

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/2_AttachTerms.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Now that we have attached License Terms to our IP, the next step is minting a License Token, which we'll go over on the next page.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Mint a License Token

> Learn how to mint a License Token from an IPA in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/3_LicenseToken.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

This section demonstrates how to mint a [License Token](/concepts/licensing-module/license-token) from an [IP Asset](/concepts/ip-asset/overview). You can only mint a License Token from an IP Asset if the IP Asset has [License Terms](/concepts/licensing-module/license-terms) attached to it. A License Token is minted as an ERC-721.

There are two reasons you'd mint a License Token:

1. To hold the license and be able to use the underlying IP Asset as the license described (for ex. "Can use commercially as long as you provide proper attribution and share 5% of your revenue)
2. Use the license token to link another IP Asset as a derivative of it. *Note though that, as you'll see later, some SDK functions don't require you to explicitly mint a license token first in order to register a derivative, and will actually handle it for you behind the scenes.*

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)
2. An IP Asset has License Terms attached to it. You can learn how to do that [here](/developers/smart-contracts-guide/attach-terms)

## Mint License

Let's say that IP Asset (`ipId = 0x01`) has License Terms (`licenseTermdId = 10`) attached to it. We want to mint 2 License Tokens with those terms to a specific wallet address (`0x02`).

<Warning>
  **Paid Licenses**

  Be mindful that some IP Assets may have license terms attached that require the user minting the license to pay a `mintingFee`.
</Warning>

Let's create a test file under `test/3_LicenseToken.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/3_LicenseToken.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
// for testing purposes only
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { ILicenseToken } from "@storyprotocol/core/interfaces/ILicenseToken.sol";
import { RoyaltyPolicyLAP } from "@storyprotocol/core/modules/royalty/policies/LAP/RoyaltyPolicyLAP.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { PILTerms } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";

import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/3_LicenseToken.t.sol
contract LicenseTokenTest is Test {
    address internal alice = address(0xa11ce);
    address internal bob = address(0xb0b);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IIPAssetRegistry internal IP_ASSET_REGISTRY = IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    // Protocol Core - LicensingModule
    ILicensingModule internal LICENSING_MODULE = ILicensingModule(0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f);
    // Protocol Core - PILicenseTemplate
    IPILicenseTemplate internal PIL_TEMPLATE = IPILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    // Protocol Core - RoyaltyPolicyLAP
    address internal ROYALTY_POLICY_LAP = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    // Protocol Core - LicenseToken
    ILicenseToken internal LICENSE_TOKEN = ILicenseToken(0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC);
    // Revenue Token - MERC20
    address internal MERC20 = 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E;

    SimpleNFT public SIMPLE_NFT;
    uint256 public tokenId;
    address public ipId;
    uint256 public licenseTermsId;

    function setUp() public {
        // this is only for testing purposes
        // due to our IPGraph precompile not being
        // deployed on the fork
        vm.etch(address(0x0101), address(new MockIPGraph()).code);

        SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
        tokenId = SIMPLE_NFT.mint(alice);
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: 10 * 10 ** 6, // 10%
                royaltyPolicy: ROYALTY_POLICY_LAP,
                currencyToken: MERC20
            })
        );

        vm.prank(alice);
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);
    }

    /// @notice Mints license tokens for an IP Asset.
    /// Anyone can mint a license token.
    function test_mintLicenseToken() public {
        uint256 startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens({
            licensorIpId: ipId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId,
            amount: 2,
            receiver: bob,
            royaltyContext: "", // for PIL, royaltyContext is empty string
            maxMintingFee: 0,
            maxRevenueShare: 0
        });

        assertEq(LICENSE_TOKEN.ownerOf(startLicenseTokenId), bob);
        assertEq(LICENSE_TOKEN.ownerOf(startLicenseTokenId + 1), bob);
    }
}
```

## Test Your Code!

Run `forge build`. If everything is successful, the command should successfully compile.

Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/3_LicenseToken.t.sol
```

## Register a Derivative

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/3_LicenseToken.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Now that we have minted a License Token, we can hold it or use it to link an IP Asset as a derivative. We will go over that on the next page.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Register a Derivative

> Learn how to register a derivative/remix IP Asset as a child of another in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/4_IPARemix.t.sol" icon="thumbs-up">
  All of this page is covered in this working code example.
</Card>

Once a [License Token](/concepts/licensing-module/license-token) has been minted from an IP Asset, the owner of that token (an ERC-721 NFT) can burn it to register their own IP Asset as a derivative of the IP Asset associated with the License Token.

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)
2. Have a minted License Token. You can learn how to do that [here](/developers/smart-contracts-guide/mint-license)

## Register as Derivative

Let's create a test file under `test/4_IPARemix.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/4_IPARemix.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
// for testing purposes only
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { PILTerms } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";

import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/4_IPARemix.t.sol
contract IPARemixTest is Test {
    address internal alice = address(0xa11ce);
    address internal bob = address(0xb0b);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IIPAssetRegistry internal IP_ASSET_REGISTRY = IIPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    // Protocol Core - LicenseRegistry
    ILicenseRegistry internal LICENSE_REGISTRY = ILicenseRegistry(0x529a750E02d8E2f15649c13D69a465286a780e24);
    // Protocol Core - LicensingModule
    ILicensingModule internal LICENSING_MODULE = ILicensingModule(0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f);
    // Protocol Core - PILicenseTemplate
    IPILicenseTemplate internal PIL_TEMPLATE = IPILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    // Protocol Core - RoyaltyPolicyLAP
    address internal ROYALTY_POLICY_LAP = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
    // Revenue Token - MERC20
    address internal MERC20 = 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E;

    SimpleNFT public SIMPLE_NFT;
    uint256 public tokenId;
    address public ipId;
    uint256 public licenseTermsId;
    uint256 public startLicenseTokenId;

    function setUp() public {
        // this is only for testing purposes
        // due to our IPGraph precompile not being
        // deployed on the fork
        vm.etch(address(0x0101), address(new MockIPGraph()).code);

        SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
        tokenId = SIMPLE_NFT.mint(alice);
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: 10 * 10 ** 6, // 10%
                royaltyPolicy: ROYALTY_POLICY_LAP,
                currencyToken: MERC20
            })
        );

        vm.prank(alice);
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);
        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens({
            licensorIpId: ipId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId,
            amount: 2,
            receiver: bob,
            royaltyContext: "", // for PIL, royaltyContext is empty string
            maxMintingFee: 0,
            maxRevenueShare: 0
        });
    }

    /// @notice Mints an NFT to be registered as IP, and then
    /// linked as a derivative of alice's asset using the
    /// minted license token.
    function test_registerDerivativeWithLicenseTokens() public {
        // First we mint an NFT and register it as an IP Asset,
        // owned by Bob.
        uint256 childTokenId = SIMPLE_NFT.mint(bob);
        address childIpId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), childTokenId);

        uint256[] memory licenseTokenIds = new uint256[](1);
        licenseTokenIds[0] = startLicenseTokenId;

        // Bob uses the License Token he has from Alice's IP
        // to register his IP as a derivative of Alice's IP.
        vm.prank(bob);
        LICENSING_MODULE.registerDerivativeWithLicenseTokens({
            childIpId: childIpId,
            licenseTokenIds: licenseTokenIds,
            royaltyContext: "", // empty for PIL
            maxRts: 0
        });

        assertTrue(LICENSE_REGISTRY.hasDerivativeIps(ipId));
        assertTrue(LICENSE_REGISTRY.isParentIp(ipId, childIpId));
        assertTrue(LICENSE_REGISTRY.isDerivativeIp(childIpId));
        assertEq(LICENSE_REGISTRY.getParentIpCount(childIpId), 1);
        assertEq(LICENSE_REGISTRY.getDerivativeIpCount(ipId), 1);
        assertEq(LICENSE_REGISTRY.getParentIp({ childIpId: childIpId, index: 0 }), ipId);
        assertEq(LICENSE_REGISTRY.getDerivativeIp({ parentIpId: ipId, index: 0 }), childIpId);
    }
}
```

## Test Your Code!

Run `forge build`. If everything is successful, the command should successfully compile.

Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/4_IPARemix.t.sol
```

## Paying and Claiming Revenue

Congratulations, you registered a derivative IP Asset!

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/4_IPARemix.t.sol" icon="thumbs-up">
  All of this page is covered in this working code example.
</Card>

Now that we have established parent-child IP relationships, we can begin to explore payments and automated revenue share based on the license terms. We'll cover that in the upcoming pages.


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Pay & Claim Revenue

> Learn how to pay an IP Asset and claim revenue in Solidity.

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/5_Royalty.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

This section demonstrates how to pay an IP Asset. There are a few reasons you would do this:

1. You simply want to "tip" an IP
2. You have to because your license terms with an ancestor IP require you to forward a certain % of payment

In either scenario, you would use the below `payRoyaltyOnBehalf` function. When this happens, the [Royalty Module](/concepts/royalty-module/overview) automatically handles the different payment flows such that parent IP Assets who have negotiated a certain `commercialRevShare` with the IPA being paid can claim their due share.

## Prerequisites

There are a few steps you have to complete before you can start the tutorial.

1. Complete the [Setup Your Own Project](/developers/smart-contracts-guide/setup)
2. Have a basic understanding of the [Royalty Module](/concepts/royalty-module/overview)
3. A child IPA and a parent IPA, for which their license terms have a commercial revenue share to make this example work

## Before We Start

You can pay an IP Asset using the `payRoyaltyOnBehalf` function from the [Royalty Module](/concepts/royalty-module/overview).

You will be paying the IP Asset with [MockERC20](https://aeneid.storyscan.io/address/0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E). Usually you would pay with \$WIP, but because we need to mint some tokens to test, we will use MockERC20.

To help with the following scenarios, let's say we have a parent IP Asset that has negotiated a 50% `commercialRevShare` with its child IP Asset.

### Whitelisted Revenue Tokens

Only tokens that are whitelisted by our protocol can be used as payment ("revenue") tokens. MockERC20 is one of those tokens. To see that list, go [here](/developers/deployed-smart-contracts#whitelisted-revenue-tokens).

## Paying an IP Asset

We can pay an IP Asset like so:

```solidity Solidity theme={null}
ROYALTY_MODULE.payRoyaltyOnBehalf(childIpId, address(0), address(MERC20), 10);
```

This will send 10 \$MERC20 to the `childIpId`'s [IP Royalty Vault](/concepts/royalty-module/ip-royalty-vault). From there, the child can claim revenue. In the next section, you'll see a working version of this.

<Warning>
  **Important: Approving the Royalty Module**

  Before you call `payRoyaltyOnBehalf`, you have to approve the royalty module to spend the tokens for you. In the section below, you will see that we call `MERC20.approve(address(ROYALTY_MODULE), 10);` or else it will not work.
</Warning>

## Claim Revenue

When payments are made, they eventually end up in an IP Asset's [IP Royalty Vault](/concepts/royalty-module/ip-royalty-vault). From here, they are claimed/transferred to whoever owns the Royalty Tokens associated with it, which represent a % of revenue share for a given IP Asset's IP Royalty Vault.

The IP Account (the smart contract that represents the [IP Asset](/concepts/ip-asset/overview)) is what holds 100% of the Royalty Tokens when it's first registered. So usually, it indeed holds most of the Royalty Tokens.

Let's create a test file under `test/5_Royalty.t.sol` to see it work and verify the results:

<Note>
  **Contract Addresses**

  We have filled in the addresses from the Story contracts for you. However you can also find the addresses for them here: [Deployed Smart Contracts](/developers/deployed-smart-contracts)
</Note>

```solidity test/5_Royalty.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
// for testing purposes only
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";
import { IPAssetRegistry } from "@storyprotocol/core/registries/IPAssetRegistry.sol";
import { LicenseRegistry } from "@storyprotocol/core/registries/LicenseRegistry.sol";
import { PILicenseTemplate } from "@storyprotocol/core/modules/licensing/PILicenseTemplate.sol";
import { RoyaltyPolicyLAP } from "@storyprotocol/core/modules/royalty/policies/LAP/RoyaltyPolicyLAP.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";
import { PILTerms } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { LicensingModule } from "@storyprotocol/core/modules/licensing/LicensingModule.sol";
import { LicenseToken } from "@storyprotocol/core/LicenseToken.sol";
import { RoyaltyWorkflows } from "@storyprotocol/periphery/workflows/RoyaltyWorkflows.sol";
import { RoyaltyModule } from "@storyprotocol/core/modules/royalty/RoyaltyModule.sol";
import { MockERC20 } from "@storyprotocol/test/mocks/token/MockERC20.sol";

import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/5_Royalty.t.sol
contract RoyaltyTest is Test {
    address internal alice = address(0xa11ce);
    address internal bob = address(0xb0b);

    // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
    // Protocol Core - IPAssetRegistry
    IPAssetRegistry internal IP_ASSET_REGISTRY = IPAssetRegistry(0x77319B4031e6eF1250907aa00018B8B1c67a244b);
    // Protocol Core - LicenseRegistry
    LicenseRegistry internal LICENSE_REGISTRY = LicenseRegistry(0x529a750E02d8E2f15649c13D69a465286a780e24);
    // Protocol Core - LicensingModule
    LicensingModule internal LICENSING_MODULE = LicensingModule(0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f);
    // Protocol Core - PILicenseTemplate
    PILicenseTemplate internal PIL_TEMPLATE = PILicenseTemplate(0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316);
    // Protocol Core - RoyaltyPolicyLAP
    RoyaltyPolicyLAP internal ROYALTY_POLICY_LAP = RoyaltyPolicyLAP(0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E);
    // Protocol Core - LicenseToken
    LicenseToken internal LICENSE_TOKEN = LicenseToken(0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC);
    // Protocol Core - RoyaltyModule
    RoyaltyModule internal ROYALTY_MODULE = RoyaltyModule(0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086);
    // Protocol Periphery - RoyaltyWorkflows
    RoyaltyWorkflows internal ROYALTY_WORKFLOWS = RoyaltyWorkflows(0x9515faE61E0c0447C6AC6dEe5628A2097aFE1890);
    // Mock - MERC20
    MockERC20 internal MERC20 = MockERC20(0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E);

    SimpleNFT public SIMPLE_NFT;
    uint256 public tokenId;
    address public ipId;
    uint256 public licenseTermsId;
    uint256 public startLicenseTokenId;
    address public childIpId;

    function setUp() public {
        // this is only for testing purposes
        // due to our IPGraph precompile not being
        // deployed on the fork
        vm.etch(address(0x0101), address(new MockIPGraph()).code);

        SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
        tokenId = SIMPLE_NFT.mint(alice);
        ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

        licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
            PILFlavors.commercialRemix({
                mintingFee: 0,
                commercialRevShare: 10 * 10 ** 6, // 10%
                royaltyPolicy: address(ROYALTY_POLICY_LAP),
                currencyToken: address(MERC20)
            })
        );

        vm.prank(alice);
        LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);
        startLicenseTokenId = LICENSING_MODULE.mintLicenseTokens({
            licensorIpId: ipId,
            licenseTemplate: address(PIL_TEMPLATE),
            licenseTermsId: licenseTermsId,
            amount: 2,
            receiver: bob,
            royaltyContext: "", // for PIL, royaltyContext is empty string
            maxMintingFee: 0,
            maxRevenueShare: 0
        });

        // Registers a child IP (owned by Bob) as a derivative of Alice's IP.
        uint256 childTokenId = SIMPLE_NFT.mint(bob);
        childIpId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), childTokenId);

        uint256[] memory licenseTokenIds = new uint256[](1);
        licenseTokenIds[0] = startLicenseTokenId;

        vm.prank(bob);
        LICENSING_MODULE.registerDerivativeWithLicenseTokens({
            childIpId: childIpId,
            licenseTokenIds: licenseTokenIds,
            royaltyContext: "", // empty for PIL
            maxRts: 0
        });
    }

    /// @notice Pays MERC20 to Bob's IP. Some of this MERC20 is then claimable
    /// by Alice's IP.
    /// @dev In this case, this contract will act as the 3rd party paying MERC20
    /// to Bob (the child IP).
    function test_claimAllRevenue() public {
        // ADMIN SETUP
        // We mint 100 MERC20 to this contract so it has some money to pay.
        MERC20.mint(address(this), 100);
        // We have to approve the Royalty Module to spend MERC20 on our behalf, which
        // it will do using `payRoyaltyOnBehalf`.
        MERC20.approve(address(ROYALTY_MODULE), 10);

        // This contract pays 10 MERC20 to Bob's IP.
        ROYALTY_MODULE.payRoyaltyOnBehalf(childIpId, address(0), address(MERC20), 10);

        // Now that Bob's IP has been paid, Alice can claim her share (1 MERC20, which
        // is 10% as specified in the license terms)
        address[] memory childIpIds = new address[](1);
        address[] memory royaltyPolicies = new address[](1);
        address[] memory currencyTokens = new address[](1);
        childIpIds[0] = childIpId;
        royaltyPolicies[0] = address(ROYALTY_POLICY_LAP);
        currencyTokens[0] = address(MERC20);

        uint256[] memory amountsClaimed = ROYALTY_WORKFLOWS.claimAllRevenue({
            ancestorIpId: ipId,
            claimer: ipId,
            childIpIds: childIpIds,
            royaltyPolicies: royaltyPolicies,
            currencyTokens: currencyTokens
        });

        // Check that 1 MERC20 was claimed by Alice's IP Account
        assertEq(amountsClaimed[0], 1);
        // Check that Alice's IP Account now has 1 MERC20 in its balance.
        assertEq(MERC20.balanceOf(ipId), 1);
        // Check that Bob's IP now has 9 MERC20 in its Royalty Vault, which it
        // can claim to its IP Account at a later point if he wants.
        assertEq(MERC20.balanceOf(ROYALTY_MODULE.ipRoyaltyVaults(childIpId)), 9);
    }
}
```

## Test Your Code!

Run `forge build`. If everything is successful, the command should successfully compile.

Now run the test by executing the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/5_Royalty.t.sol
```

## Dispute an IP

Congratulations, you claimed revenue using the [Royalty Module](/concepts/royalty-module/overview)!

<Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/test/5_Royalty.t.sol" icon="thumbs-up">
  Follow the completed code all the way through.
</Card>

Now what happens if an IP Asset doesn't pay their due share? We can dispute the IP on-chain, which we will cover on the next page.

<Warning>Coming soon!</Warning>

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Using an Example

> Combine all of our tutorials together in a practical example.

<CardGroup cols={2}>
  <Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/src/Example.sol" icon="thumbs-up">
    See the completed code.
  </Card>

  <Card title="Video Walkthrough" href="https://www.youtube.com/watch?v=X421IuZENqM" icon="video">
    Check out a video walkthrough of this tutorial!
  </Card>
</CardGroup>

# Writing the Smart Contract

Now that we have walked through each of the individual steps, let's try to write, deploy, and verify our own smart contract.

## Register IPA, Register License Terms, and Attach to IPA

In this first section, we will combine a few of the tutorials into one. We will create a function named `mintAndRegisterAndCreateTermsAndAttach` that allows you to mint & register a new IP Asset, register new License Terms, and attach those terms to an IP Asset. It will also accept a `receiver` field to be the owner of the new IP Asset.

### Prerequisites

* Complete [Register an IP Asset](/developers/smart-contracts-guide/register-ip-asset)
* Complete [Register License Terms](/developers/smart-contracts-guide/register-terms)
* Complete [Attach Terms to an IPA](/developers/smart-contracts-guide/attach-terms)

### Writing our Contract

Create a new file under `./src/Example.sol` and paste the following:

<Note>
  **Contract Addresses**

  In order to get the contract addresses to pass in the constructor, go to [Deployed Smart Contracts](/developers/deployed-smart-contracts).
</Note>

```solidity src/Example.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicensingModule } from "@storyprotocol/core/interfaces/modules/licensing/ILicensingModule.sol";
import { IPILicenseTemplate } from "@storyprotocol/core/interfaces/modules/licensing/IPILicenseTemplate.sol";
import { PILFlavors } from "@storyprotocol/core/lib/PILFlavors.sol";

import { SimpleNFT } from "./mocks/SimpleNFT.sol";

import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

/// @notice An example contract that demonstrates how to mint an NFT, register it as an IP Asset,
/// attach license terms to it, mint a license token from it, and register it as a derivative of the parent.
contract Example is ERC721Holder {
  IIPAssetRegistry public immutable IP_ASSET_REGISTRY;
  ILicensingModule public immutable LICENSING_MODULE;
  IPILicenseTemplate public immutable PIL_TEMPLATE;
  address public immutable ROYALTY_POLICY_LAP;
  address public immutable WIP;
  SimpleNFT public immutable SIMPLE_NFT;

  constructor(
    address ipAssetRegistry,
    address licensingModule,
    address pilTemplate,
    address royaltyPolicyLAP,
    address wip
  ) {
    IP_ASSET_REGISTRY = IIPAssetRegistry(ipAssetRegistry);
    LICENSING_MODULE = ILicensingModule(licensingModule);
    PIL_TEMPLATE = IPILicenseTemplate(pilTemplate);
    ROYALTY_POLICY_LAP = royaltyPolicyLAP;
    WIP = wip;
    // Create a new Simple NFT collection
    SIMPLE_NFT = new SimpleNFT("Simple IP NFT", "SIM");
  }

  /// @notice Mint an NFT, register it as an IP Asset, and attach License Terms to it.
  /// @param receiver The address that will receive the NFT/IPA.
  /// @return tokenId The token ID of the NFT representing ownership of the IPA.
  /// @return ipId The address of the IP Account.
  /// @return licenseTermsId The ID of the license terms.
  function mintAndRegisterAndCreateTermsAndAttach(
    address receiver
  ) external returns (uint256 tokenId, address ipId, uint256 licenseTermsId) {
    // We mint to this contract so that it has permissions
    // to attach license terms to the IP Asset.
    // We will later transfer it to the intended `receiver`
    tokenId = SIMPLE_NFT.mint(address(this));
    ipId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), tokenId);

    // register license terms so we can attach them later
    licenseTermsId = PIL_TEMPLATE.registerLicenseTerms(
      PILFlavors.commercialRemix({
        mintingFee: 0,
        commercialRevShare: 10 * 10 ** 6, // 10%
        royaltyPolicy: ROYALTY_POLICY_LAP,
        currencyToken: WIP
      })
    );

    // attach the license terms to the IP Asset
    LICENSING_MODULE.attachLicenseTerms(ipId, address(PIL_TEMPLATE), licenseTermsId);

    // transfer the NFT to the receiver so it owns the IPA
    SIMPLE_NFT.transferFrom(address(this), receiver, tokenId);
  }
}
```

## Mint a License Token and Register as Derivative

In this next section, we will combine a few of the later tutorials into one. We will create a function named `mintLicenseTokenAndRegisterDerivative` that allows a potentially different user to register their own "child" (derivative) IP Asset, mint a License Token from the "parent" (root) IP Asset, and register their child IPA as a derivative of the parent IPA. It will accept a few parameters:

1. `parentIpId`: the `ipId` of the parent IPA
2. `licenseTermsId`: the id of the License Terms you want to mint a License Token for
3. `receiver`: the owner of the child IPA

### Prerequisites

* Complete [Mint a License Token](/developers/smart-contracts-guide/mint-license)
* Complete [Register a Derivative](/developers/smart-contracts-guide/register-derivative)

### Writing our Contract

In your `Example.sol` contract, add the following function at the bottom:

```solidity src/Example.sol theme={null}
/// @notice Mint and register a new child IPA, mint a License Token
/// from the parent, and register it as a derivative of the parent.
/// @param parentIpId The ipId of the parent IPA.
/// @param licenseTermsId The ID of the license terms you will
/// mint a license token from.
/// @param receiver The address that will receive the NFT/IPA.
/// @return childTokenId The token ID of the NFT representing ownership of the child IPA.
/// @return childIpId The address of the child IPA.
function mintLicenseTokenAndRegisterDerivative(
  address parentIpId,
  uint256 licenseTermsId,
  address receiver
) external returns (uint256 childTokenId, address childIpId) {
  // We mint to this contract so that it has permissions
  // to register itself as a derivative of another
  // IP Asset.
  // We will later transfer it to the intended `receiver`
  childTokenId = SIMPLE_NFT.mint(address(this));
  childIpId = IP_ASSET_REGISTRY.register(block.chainid, address(SIMPLE_NFT), childTokenId);

  // mint a license token from the parent
  uint256 licenseTokenId = LICENSING_MODULE.mintLicenseTokens({
    licensorIpId: parentIpId,
    licenseTemplate: address(PIL_TEMPLATE),
    licenseTermsId: licenseTermsId,
    amount: 1,
    // mint the license token to this contract so it can
    // use it to register as a derivative of the parent
    receiver: address(this),
    royaltyContext: "", // for PIL, royaltyContext is empty string
    maxMintingFee: 0,
    maxRevenueShare: 0
  });

  uint256[] memory licenseTokenIds = new uint256[](1);
  licenseTokenIds[0] = licenseTokenId;

  // register the new child IPA as a derivative
  // of the parent
  LICENSING_MODULE.registerDerivativeWithLicenseTokens({
    childIpId: childIpId,
    licenseTokenIds: licenseTokenIds,
    royaltyContext: "", // empty for PIL
    maxRts: 0
  });

  // transfer the NFT to the receiver so it owns the child IPA
  SIMPLE_NFT.transferFrom(address(this), receiver, childTokenId);
}
```

# Testing our Contract

Create another new file under `test/Example.t.sol` and paste the following:

```solidity test/Example.t.sol theme={null}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
// for testing purposes only
import { MockIPGraph } from "@storyprotocol/test/mocks/MockIPGraph.sol";
import { IIPAssetRegistry } from "@storyprotocol/core/interfaces/registries/IIPAssetRegistry.sol";
import { ILicenseRegistry } from "@storyprotocol/core/interfaces/registries/ILicenseRegistry.sol";

import { Example } from "../src/Example.sol";
import { SimpleNFT } from "../src/mocks/SimpleNFT.sol";

// Run this test:
// forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/Example.t.sol
contract ExampleTest is Test {
  address internal alice = address(0xa11ce);
  address internal bob = address(0xb0b);

  // For addresses, see https://docs.story.foundation/developers/deployed-smart-contracts
  // Protocol Core - IPAssetRegistry
  address internal ipAssetRegistry = 0x77319B4031e6eF1250907aa00018B8B1c67a244b;
  // Protocol Core - LicenseRegistry
  address internal licenseRegistry = 0x529a750E02d8E2f15649c13D69a465286a780e24;
  // Protocol Core - LicensingModule
  address internal licensingModule = 0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f;
  // Protocol Core - PILicenseTemplate
  address internal pilTemplate = 0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316;
  // Protocol Core - RoyaltyPolicyLAP
  address internal royaltyPolicyLAP = 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E;
  // Revenue Token - WIP
  address internal wip = 0x1514000000000000000000000000000000000000;

  SimpleNFT public SIMPLE_NFT;
  Example public EXAMPLE;

  function setUp() public {
    // this is only for testing purposes
    // due to our IPGraph precompile not being
    // deployed on the fork
    vm.etch(address(0x0101), address(new MockIPGraph()).code);

    EXAMPLE = new Example(ipAssetRegistry, licensingModule, pilTemplate, royaltyPolicyLAP, wip);
    SIMPLE_NFT = SimpleNFT(EXAMPLE.SIMPLE_NFT());
  }

  function test_mintAndRegisterAndCreateTermsAndAttach() public {
    ILicenseRegistry LICENSE_REGISTRY = ILicenseRegistry(licenseRegistry);
    IIPAssetRegistry IP_ASSET_REGISTRY = IIPAssetRegistry(ipAssetRegistry);

    uint256 expectedTokenId = SIMPLE_NFT.nextTokenId();
    address expectedIpId = IP_ASSET_REGISTRY.ipId(block.chainid, address(SIMPLE_NFT), expectedTokenId);

    (uint256 tokenId, address ipId, uint256 licenseTermsId) = EXAMPLE.mintAndRegisterAndCreateTermsAndAttach(alice);

    assertEq(tokenId, expectedTokenId);
    assertEq(ipId, expectedIpId);
    assertEq(SIMPLE_NFT.ownerOf(tokenId), alice);

    assertTrue(LICENSE_REGISTRY.hasIpAttachedLicenseTerms(ipId, pilTemplate, licenseTermsId));
    assertEq(LICENSE_REGISTRY.getAttachedLicenseTermsCount(ipId), 1);
    (address licenseTemplate, uint256 attachedLicenseTermsId) = LICENSE_REGISTRY.getAttachedLicenseTerms({
      ipId: ipId,
      index: 0
    });
    assertEq(licenseTemplate, pilTemplate);
    assertEq(attachedLicenseTermsId, licenseTermsId);
  }

  function test_mintLicenseTokenAndRegisterDerivative() public {
    ILicenseRegistry LICENSE_REGISTRY = ILicenseRegistry(licenseRegistry);
    IIPAssetRegistry IP_ASSET_REGISTRY = IIPAssetRegistry(ipAssetRegistry);

    (uint256 parentTokenId, address parentIpId, uint256 licenseTermsId) = EXAMPLE
    .mintAndRegisterAndCreateTermsAndAttach(alice);

    (uint256 childTokenId, address childIpId) = EXAMPLE.mintLicenseTokenAndRegisterDerivative(
      parentIpId,
      licenseTermsId,
      bob
    );

    assertTrue(LICENSE_REGISTRY.hasDerivativeIps(parentIpId));
    assertTrue(LICENSE_REGISTRY.isParentIp(parentIpId, childIpId));
    assertTrue(LICENSE_REGISTRY.isDerivativeIp(childIpId));
    assertEq(LICENSE_REGISTRY.getDerivativeIpCount(parentIpId), 1);
    assertEq(LICENSE_REGISTRY.getParentIpCount(childIpId), 1);
    assertEq(LICENSE_REGISTRY.getParentIp({ childIpId: childIpId, index: 0 }), parentIpId);
    assertEq(LICENSE_REGISTRY.getDerivativeIp({ parentIpId: parentIpId, index: 0 }), childIpId);
  }
}
```

Run `forge build`. If everything is successful, the command should successfully compile.

To test this out, simply run the following command:

```bash theme={null}
forge test --fork-url https://aeneid.storyrpc.io/ --match-path test/Example.t.sol
```

# Deploy & Verify the Example Contract

The `--constructor-args` come from [Deployed Smart Contracts](/developers/deployed-smart-contracts).

```bash theme={null}
forge create \
  --rpc-url https://aeneid.storyrpc.io/ \
  --private-key $PRIVATE_KEY \
  ./src/Example.sol:Example \
  --legacy \
  --verify \
  --verifier blockscout \
  --verifier-url https://aeneid.storyscan.io/api/ \
  --constructor-args 0x77319B4031e6eF1250907aa00018B8B1c67a244b 0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f 0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E
```

If everything worked correctly, you should see something like `Deployed to: 0xfb0923D531C1ca54AB9ee10CB8364b23d0C7F47d` in the console. Paste that address into [the explorer](https://aeneid.storyscan.io/) and see your verified contract!

# Great job! :)

<CardGroup cols={2}>
  <Card title="Completed Code" href="https://github.com/storyprotocol/story-protocol-boilerplate/blob/main/src/Example.sol" icon="thumbs-up">
    See the completed code.
  </Card>

  <Card title="Video Walkthrough" href="https://www.youtube.com/watch?v=X421IuZENqM" icon="video">
    Check out a video walkthrough of this tutorial!
  </Card>
</CardGroup>


