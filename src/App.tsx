import { useMemo } from "react";
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
import { clusterApiUrl } from "@solana/web3.js";
import DEXAggregator from "./components/DEXAggregator";
import { JupiterProvider } from "@jup-ag/react-hook";

const JupiterWrappedApp = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // DEXAggregator 组件内部已经处理了 publicKey 不存在时的情况（显示连接钱包按钮），
  // 所以我们可以直接渲染 JupiterProvider。
  // 我们将 publicKey (可能为 null) 传递给 userPublicKey 属性。
  // JupiterProvider 将会响应 publicKey 从 null 变为有效值的过程。
  return (
    <JupiterProvider connection={connection} userPublicKey={publicKey || undefined}>
      <DEXAggregator />
    </JupiterProvider>
  );
};

export default function App() {
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
          <JupiterWrappedApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};