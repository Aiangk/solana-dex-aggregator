import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { JupiterProvider } from "@jup-ag/react-hook";

import React, { FC, useMemo } from "react";

import { AppRouter } from "./components/AppRouter";

import "@solana/wallet-adapter-react-ui/styles.css";

// 单独包裹使内部可以访问 wallet & connection
const JupiterWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const network = WalletAdapterNetwork.Devnet;

  return (
    <JupiterProvider
      connection={connection}
      userPublicKey={publicKey || undefined}
    >
      {children}
    </JupiterProvider>
  );
};

const App: FC = () => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <JupiterWrapper>
            <AppRouter />
          </JupiterWrapper>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};



export default App;
