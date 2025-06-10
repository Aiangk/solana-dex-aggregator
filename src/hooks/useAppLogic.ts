import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import BigNumber from "bignumber.js";
import { useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import SettingsIcon from "../assets/icons/SettingsIcon.svg";
import UsdtIcon from "../assets/icons/usdt.svg";
import UsdcIcon from "../assets/icons/usdc-logo.svg";
import SolanaIcon from "../assets/icons/solana-sol-logo.svg";
import toast, { Toaster } from "react-hot-toast";

// 定义我们 App 的核心逻辑 Hook
export const useAppLogic = () => {
  interface QuoteResult {
    dex: string;
    outputAmount: string;
    originalQuote?: any;
    error?: string;
  }

  interface AppToken {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logo: string;
  }
  // --- 所有的状态管理现在都在这里 ---
  const walletContext = useWallet();
  const { publicKey, signTransaction, connected } = walletContext;
  const { connection } = useConnection();

  const [fromTokenBalance, setFromTokenBalance] = useState<number | null>(null);
  const [fromBalance, setFromBalance] = useState<string | null>(null);
  const [toBalance, setToBalance] = useState<string | null>(null);
  const [fromTokenSymbol, setFromTokenSymbol] = useState("SOL");
  const [toTokenSymbol, setToTokenSymbol] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [raydiumV2Quote, setRaydiumV2Quote] = useState<QuoteResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [activeSwap, setActiveSwap] = useState<string | null>(null);
  const [activeSlippage, setActiveSlippage] = useState(1);
  const [customSlippage, setCustomSlippage] = useState<string | number>("");
  const [priorityFeeInSol, setPriorityFeeInSol] = useState("");
  const [solPrice, setSolPrice] = useState<number | null>(null);

  const [useLegacyTx, setUseLegacyTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const supportedTokens = useMemo<AppToken[]>(
    () => [
      {
        symbol: "SOL",
        name: "Solana",
        mint: "So11111111111111111111111111111111111111112",
        decimals: 9,
        logo: SolanaIcon,
      },
      {
        symbol: "USDC",
        name: "USD Coin (Devnet)",
        mint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
        decimals: 6,
        logo: UsdcIcon,
      },
      {
        symbol: "USDT",
        name: "Tether (Devnet)",
        mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6,
        logo: UsdtIcon,
      },
    ],
    []
  );

  // 获取 SOL 价格的逻辑
  useEffect(() => {
    const getSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        const data = await response.json();
        if (data.solana && data.solana.usd) setSolPrice(data.solana.usd);
      } catch (error) {
        console.error("获取 SOL 价格失败:", error);
      }
    };
    getSolPrice();
  }, []);

  //获取余额的相关逻辑
  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      const fromTokenInfo = supportedTokens.find(
        (t) => t.symbol === fromTokenSymbol
      );
      if (fromTokenSymbol === "SOL") {
        const solBalance = await connection.getBalance(publicKey);
        const uiAmount = new BigNumber(solBalance).shiftedBy(-9);
        setFromBalance(uiAmount.toFormat(4));
        setFromTokenBalance(uiAmount.toNumber());
      } else {
        const account = tokenAccounts.value.find(
          (acc) => acc.account.data.parsed.info.mint === fromTokenInfo?.mint
        );
        const uiAmount = account
          ? parseFloat(
              account.account.data.parsed.info.tokenAmount.uiAmountString
            )
          : 0;
        setFromBalance(uiAmount.toFixed(4));
        setFromTokenBalance(uiAmount);
      }
      const toTokenInfo = supportedTokens.find(
        (t) => t.symbol === toTokenSymbol
      );
      if (toTokenInfo?.symbol === "SOL") {
        const solBalance = await connection.getBalance(publicKey);
        setToBalance(new BigNumber(solBalance).shiftedBy(-9).toFormat(4));
      } else {
        const account = tokenAccounts.value.find(
          (acc) => acc.account.data.parsed.info.mint === toTokenInfo?.mint
        );
        setToBalance(
          account
            ? account.account.data.parsed.info.tokenAmount.uiAmountString
            : "0.00"
        );
      }
    } catch (error) {
      console.error("获取余额失败:", error);
      toast.error("获取钱包余额失败");
    }
  }, [publicKey, fromTokenSymbol, toTokenSymbol, connection, supportedTokens]);

  useEffect(() => {
    if (publicKey && connection) {
      fetchBalances();
    }
  }, [publicKey, connection, fetchBalances]);

  // --- Jupiter 相关的逻辑 ---
  const inputMint = useMemo(
    () =>
      supportedTokens.find((t) => t.symbol === fromTokenSymbol)?.mint
        ? new PublicKey(
            supportedTokens.find((t) => t.symbol === fromTokenSymbol)!.mint
          )
        : undefined,
    [fromTokenSymbol, supportedTokens]
  );
  const outputMint = useMemo(
    () =>
      supportedTokens.find((t) => t.symbol === toTokenSymbol)?.mint
        ? new PublicKey(
            supportedTokens.find((t) => t.symbol === toTokenSymbol)!.mint
          )
        : undefined,
    [toTokenSymbol, supportedTokens]
  );

  const amountInLamports = useMemo(() => {
    const token = supportedTokens.find((t) => t.symbol === fromTokenSymbol);
    if (!token) return new BigNumber(0);
    return new BigNumber(amount || 0).shiftedBy(token.decimals);
  }, [amount, fromTokenSymbol, supportedTokens]);

  const {
    quoteResponseMeta,
    loading: jupiterLoading,
    error: jupiterError,
    exchange,
  } = useJupiter({
    amount: JSBI.BigInt(amountInLamports.toString()),
    inputMint,
    outputMint,
    slippageBps: activeSlippage * 100,
    debounceTime: 250,
  });

  const jupiterQuote = quoteResponseMeta?.quoteResponse;

  const getRaydiumV2Quote = useCallback(
    async (inputAmount: number): Promise<QuoteResult> => {
      const inputToken = supportedTokens.find(
        (t) => t.symbol === fromTokenSymbol
      );
      const outputToken = supportedTokens.find(
        (t) => t.symbol === toTokenSymbol
      );
      if (!inputToken || !outputToken) throw new Error("代币未找到");
      try {
        const url = `https://api.raydium.io/v2/quote?inputMint=${
          inputToken.mint
        }&outputMint=${outputToken.mint}&amount=${inputAmount}&slippage=${
          activeSlippage / 100
        }`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        const data = await response.json();
        const outputAmount = new BigNumber(data.outAmount)
          .shiftedBy(-outputToken.decimals)
          .toFixed();
        return { dex: "Raydium (V2 API)", outputAmount, originalQuote: data };
      } catch (error) {
        console.error("获取 Raydium V2 报价失败:", error);
        return {
          dex: "Raydium (V2 API)",
          outputAmount: "0",
          error: (error as Error).message,
        };
      }
    },
    [fromTokenSymbol, toTokenSymbol, activeSlippage, supportedTokens]
  );

  // --- 所有的处理函数现在都在这里 ---
  const handleGetQuote = useCallback(async () => {
    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount) || currentAmount <= 0) return;
    const toastId = toast.loading("正在刷新报价...");
    setIsLoading(true);
    setRaydiumV2Quote(null);
    const raydiumResult = await getRaydiumV2Quote(currentAmount);
    setRaydiumV2Quote(raydiumResult);
    setIsLoading(false);
    if (raydiumResult.error) {
      toast.error(`Raydium 错误: ${raydiumResult.error}`, { id: toastId });
    } else {
      toast.success("报价已更新", { id: toastId });
    }
  }, [amount, getRaydiumV2Quote]);

  const handleRaydiumSwap = useCallback(async () => {
    if (
      !publicKey ||
      !raydiumV2Quote?.originalQuote ||
      !signTransaction ||
      !connection
    ) {
      toast.error("无法执行兑换：缺少必要信息。");
      return;
    }
    const toastId = toast.loading("正在处理 Raydium 兑换...");
    setIsSwapping(true);
    setActiveSwap("raydium");
    try {
      const response = await fetch("https://api.raydium.io/v2/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: raydiumV2Quote.originalQuote,
          userPublicKey: publicKey.toBase58(),
          wrapUnwrapSOL: true,
        }),
      });
      if (!response.ok) throw new Error("创建 Raydium 交易失败。");
      const { transaction } = await response.json();
      const txBuf = Buffer.from(transaction, "base64");
      const tx = VersionedTransaction.deserialize(txBuf);
      toast.loading("请在钱包中批准交易...", { id: toastId });
      const signedTx = await signTransaction(tx);
      const signature = await connection.sendTransaction(signedTx);
      await connection.confirmTransaction(signature, "confirmed");
      toast.success(`Raydium 兑换成功！`, { id: toastId });
    } catch (error) {
      toast.error(`Raydium 兑换失败: ${(error as Error).message}`, {
        id: toastId,
      });
    } finally {
      setIsSwapping(false);
      setActiveSwap(null);
    }
  }, [publicKey, raydiumV2Quote, signTransaction, connection]);

  const handleJupiterSwap = useCallback(async () => {
    if (
      !exchange ||
      !jupiterQuote ||
      !walletContext.publicKey ||
      !walletContext.signTransaction
    ) {
      toast.error("Jupiter 无法执行兑换：缺少报价信息或钱包未正确连接。");
      return;
    }
    const toastId = toast.loading("正在处理 Jupiter 兑换...");
    try {
      const getPriorityFee = () => {
        const feeInSol = parseFloat(priorityFeeInSol);
        if (isNaN(feeInSol) || feeInSol <= 0) return "auto";
        if (feeInSol > 0.0005) return 500000;
        if (feeInSol > 0.0001) return 100000;
        return "auto";
      };
      const result = await exchange({
        wallet: {
          signTransaction: walletContext.signTransaction!,
          signAllTransactions: walletContext.signAllTransactions!,
        },
        quoteResponseMeta,
        prioritizationFeeLamports: getPriorityFee(),
        asLegacyTransaction: useLegacyTx,
        wrapUnwrapSOL: true,
      });

      const signature =
        "signature" in result
          ? result.signature
          : "txid" in result
          ? result.txid
          : "";
      if (typeof signature === "string" && signature.length > 0) {
        await connection.confirmTransaction(signature, "confirmed");
        toast.success("兑换成功！");
      } else {
        toast.error("交易发送，但未获取到签名。");
      }
      setAmount("");
    } catch (error) {
      console.error("Jupiter 兑换失败:", error);
      toast.error(`兑换失败: ${(error as Error).message}`, { id: toastId });
    }
  }, [
    walletContext,
    exchange,
    jupiterQuote,
    quoteResponseMeta,
    priorityFeeInSol,
    useLegacyTx,
  ]);

  const handleSwitchTokens = () => {
    setFromTokenSymbol(toTokenSymbol);
    setToTokenSymbol(fromTokenSymbol);
    setRaydiumV2Quote(null);
  };

  const getTokenLogo = (symbol: string) => {
    const token = supportedTokens.find((t) => t.symbol === symbol);
    return (
      token?.logo ||
      `https://placehold.co/32x32/374151/FFFFFF?text=${
        symbol ? symbol.charAt(0).toUpperCase() : "?"
      }`
    );
  };

  const handleMaxClick = () => {
    if (fromTokenBalance !== null) {
      setAmount(fromTokenBalance.toString());
    }
  };

  // --- 返回所有需要被 UI 使用的数据和函数 ---
  return {
    // 状态
    fromTokenSymbol,
    toTokenSymbol,
    amount,
    isSwapping,
    isLoading,
    activeSwap,
    activeSlippage,
    customSlippage,
    priorityFeeInSol,
    showSettings,
    solPrice,
    supportedTokens,
    jupiterQuote,
    jupiterLoading,
    jupiterError,
    fromBalance,
    toBalance,
    fromTokenBalance,
    raydiumV2Quote,
    connected,
    useLegacyTx,
    // Setters & Handlers
    setUseLegacyTx,
    setFromTokenSymbol,
    setToTokenSymbol,
    setAmount,
    setActiveSlippage,
    setCustomSlippage,
    setPriorityFeeInSol,
    setShowSettings,
    setRaydiumV2Quote,
    handleJupiterSwap,
    handleRaydiumSwap,
    handleSwitchTokens,
    handleGetQuote,
    handleMaxClick,
    getTokenLogo,
  };
};
