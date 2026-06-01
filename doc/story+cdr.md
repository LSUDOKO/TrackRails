> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Dynamic Setup

> Learn how to setup Dynamic Wallet in your Story DApp.

<Note>
  **Optional: Official Dynamic Docs**

  Check out the official Wagmi + Dynamic installation docs [here](https://docs.dynamic.xyz/react-sdk/using-wagmi).
</Note>

## Install the Dependencies

<CodeGroup>
  ```bash npm theme={null}
  npm install --save @story-protocol/core-sdk viem wagmi @dynamic-labs/sdk-react-core @dynamic-labs/wagmi-connector @dynamic-labs/ethereum @tanstack/react-query
  ```

  ```bash pnpm theme={null}
  pnpm install @story-protocol/core-sdk viem
  ```

  ```bash yarn theme={null}
  yarn add @story-protocol/core-sdk viem
  ```
</CodeGroup>

## Setup

Before diving into the example, make sure you have two things setup:

1. Make sure to have `NEXT_PUBLIC_RPC_PROVIDER_URL` set up in your `.env` file.
   * You can use the public default one (`https://aeneid.storyrpc.io`) or any other RPC [here](/network/network-info/aeneid#rpcs).
2. Make sure to have `NEXT_PUBLIC_DYNAMIC_ENV_ID` set up in your `.env` file. Do this by logging into [Dynamic](https://app.dynamic.xyz/) and creating a project.

<CodeGroup>
  ```jsx Web3Providers.tsx theme={null}
  "use client";
  import { createConfig, WagmiProvider } from "wagmi";
  import { http } from 'viem';
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
  import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
  import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
  import { PropsWithChildren } from "react";
  import { aeneid } from "@story-protocol/core-sdk";

  // setup wagmi
  const config = createConfig({
    chains: [aeneid],
    multiInjectedProviderDiscovery: false,
    transports: {
      [aeneid.id]: http(),
    },
  });
  const queryClient = new QueryClient();

  export default function Web3Providers({ children }: PropsWithChildren) {
    return (
      // setup dynamic
      <DynamicContextProvider
        settings={{
          // Find your environment id at https://app.dynamic.xyz/dashboard/developer
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID as string,
          walletConnectors: [EthereumWalletConnectors],
        }}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <DynamicWagmiConnector>
              {children}
            </DynamicWagmiConnector>
          </QueryClientProvider>
        </WagmiProvider>
      </DynamicContextProvider>
    );
  }
  ```

  ```jsx layout.tsx theme={null}
  import type { Metadata } from "next";
  import { Inter } from "next/font/google";
  import "./globals.css";
  import { PropsWithChildren } from "react";
  import Web3Providers from "./Web3Providers";
  import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

  const inter = Inter({ subsets: ["latin"] });

  export const metadata: Metadata = {
    title: "Example",
    description: "This is an Example DApp",
  };

  export default function RootLayout({ children }: PropsWithChildren) {
    return (
      <html lang="en">
        <body>
          <Web3Providers>
            <DynamicWidget />
            {children}
          </Web3Providers>
        </body>
      </html>
    );
  }
  ```

  ```jsx TestComponent.tsx theme={null}
  import { custom, toHex } from 'viem';
  import { useWalletClient } from "wagmi";
  import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";

  // example of how you would now use the fully setup sdk

  export default function TestComponent() {
    const { data: wallet } = useWalletClient();

    async function setupStoryClient(): Promise<StoryClient> {
      const config: StoryConfig = {
        wallet: wallet,
        transport: custom(wallet!.transport),
        chainId: "aeneid",
      };
      const client = StoryClient.newClient(config);
      return client;
    }

    async function registerIp() {
      const client = await setupStoryClient();
      const response = await client.ipAsset.registerIpAsset({
        nft: {
          type: 'minted',
          nftContract: '0x01...',
          tokenId: '1',
        }
        ipMetadata: {
          ipMetadataURI: "test-metadata-uri",
          ipMetadataHash: toHex("test-metadata-hash", { size: 32 }),
          nftMetadataURI: "test-nft-metadata-uri",
          nftMetadataHash: toHex("test-nft-metadata-hash", { size: 32 }),
        }
      });
      console.log(
        `Root IPA created at tx hash ${response.txHash}, IPA ID: ${response.ipId}`
      );
    }

    return (
      {/* */}
    )
  }
  ```
</CodeGroup>








> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# RainbowKit Setup

> Learn how to setup RainbowKit Wallet in your Story DApp.

<Note>
  **Optional: Official RainbowKit Docs**

  Check out the official Wagmi + RainbowKit installation docs [here](https://www.rainbowkit.com/docs/installation).
</Note>

## Install the Dependencies

<CodeGroup>
  ```bash npm theme={null}
  npm install --save @story-protocol/core-sdk @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
  ```

  ```bash pnpm theme={null}
  pnpm install @story-protocol/core-sdk viem
  ```

  ```bash yarn theme={null}
  yarn add @story-protocol/core-sdk viem
  ```
</CodeGroup>

## Setup

Before diving into the example, make sure you have two things setup:

1. Make sure to have `NEXT_PUBLIC_RPC_PROVIDER_URL` set up in your `.env` file.
   * You can use the public default one (`https://aeneid.storyrpc.io`) or any other RPC [here](/network/network-info/aeneid#rpcs).
2. Make sure to have `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` set up in your `.env` file. Do this by logging into [Reown (prev. WalletConnect)](https://reown.com/) and creating a project.

<CodeGroup>
  ```jsx Web3Providers.tsx theme={null}
  "use client";
  import "@rainbow-me/rainbowkit/styles.css";
  import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
  import { WagmiProvider } from "wagmi";
  import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
  import { PropsWithChildren } from "react";
  import { aeneid } from "@story-protocol/core-sdk";

  const config = getDefaultConfig({
    appName: "Test Story App",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
    chains: [aeneid],
    ssr: true, // If your dApp uses server side rendering (SSR)
  });

  const queryClient = new QueryClient();

  export default function Web3Providers({ children }: PropsWithChildren) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  ```

  ```jsx layout.tsx theme={null}
  import type { Metadata } from "next";
  import { Inter } from "next/font/google";
  import "./globals.css";
  import { PropsWithChildren } from "react";
  import Web3Providers from "./Web3Providers";
  import { ConnectButton } from "@rainbow-me/rainbowkit";

  const inter = Inter({ subsets: ["latin"] });

  export const metadata: Metadata = {
    title: "Example",
    description: "This is an Example DApp",
  };

  export default function RootLayout({ children }: PropsWithChildren) {
    return (
      <html lang="en">
        <body>
          <Web3Providers>
            <ConnectButton />
            {children}
          </Web3Providers>
        </body>
      </html>
    );
  }
  ```

  ```jsx TestComponent.tsx theme={null}
  import { custom, toHex } from 'viem';
  import { useWalletClient } from "wagmi";
  import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";

  // example of how you would now use the fully setup sdk

  export default function TestComponent() {
    const { data: wallet } = useWalletClient();

    async function setupStoryClient(): Promise<StoryClient> {
      const config: StoryConfig = {
        wallet: wallet,
        transport: custom(wallet!.transport),
        chainId: "aeneid",
      };
      const client = StoryClient.newClient(config);
      return client;
    }

    async function registerIp() {
      const client = await setupStoryClient();
      const response = await client.ipAsset.registerIpAsset({
        nft: {
          type: 'minted',
          nftContract: '0x01...',
          tokenId: '1',
        }
        ipMetadata: {
          ipMetadataURI: "test-metadata-uri",
          ipMetadataHash: toHex("test-metadata-hash", { size: 32 }),
          nftMetadataURI: "test-nft-metadata-uri",
          nftMetadataHash: toHex("test-nft-metadata-hash", { size: 32 }),
        }
      });
      console.log(
        `Root IPA created at tx hash ${response.txHash}, IPA ID: ${response.ipId}`
      );
    }

    return (
      {/* */}
    )
  }
  ```
</CodeGroup>


> ## Documentation Index
> Fetch the complete documentation index at: https://docs.story.foundation/llms.txt
> Use this file to discover all available pages before exploring further.

# Using the SDK in React

> Learn how to use the SDK in React once you have it set up.

Once you have the SDK set up in React, you can use it just as we describe in the [TypeScript SDK Guide](/developers/typescript-sdk/overview).

<CardGroup cols={2}>
  <Card title="React Quickstart" href="https://github.com/storyprotocol/react-quickstart" icon="thumbs-up">
    A working code example that shows setting up & calling TypeScript SDK functions in Next.js/React.
  </Card>

  <Card title="SDK Reference" href="/sdk-reference" icon="books">
    View the whole SDK reference, which shows examples and types for every function in our SDK.
  </Card>
</CardGroup>

## Prerequisites

1. Complete the [SDK setup in React](/developers/react-guide/setup/overview)

## Example

Here is an example of calling an SDK function in React, which will look the same for any function you use:

```jsx TestComponent.tsx theme={null}
import { custom, toHex } from 'viem';
import { useWalletClient } from "wagmi";
import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";

// example of how you would now use the fully setup sdk

export default function TestComponent() {
  const { data: wallet } = useWalletClient();

  async function setupStoryClient(): Promise<StoryClient> {
    const config: StoryConfig = {
      wallet: wallet,
      transport: custom(wallet!.transport),
      chainId: "aeneid",
    };
    const client = StoryClient.newClient(config);
    return client;
  }

  async function registerIp() {
    const client = await setupStoryClient();
    const response = await client.ipAsset.registerIpAsset({
      nft: {
        type: 'mint',
        spgNftContract: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc',
      },
      ipMetadata: {
        ipMetadataURI: "test-metadata-uri",
        ipMetadataHash: toHex("test-metadata-hash", { size: 32 }),
        nftMetadataURI: "test-nft-metadata-uri",
        nftMetadataHash: toHex("test-nft-metadata-hash", { size: 32 }),
      }
    });
    console.log(
      `Root IPA created at tx hash ${response.txHash}, IPA ID: ${response.ipId}`
    );
  }

  return (
    {/* */}
  )
}
```
