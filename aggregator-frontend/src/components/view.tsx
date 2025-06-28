import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ArrowDownUp } from "lucide-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";
import {
  Liquidity,
  type LiquidityPoolKeys,
  TOKEN_PROGRAM_ID,
  publicKey,
} from "@raydium-io/raydium-sdk";
import BigNumber from "bignumber.js";
import { useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import SettingsIcon from "../assets/icons/SettingsIcon.svg";
import UsdtIcon from "../assets/icons/usdt.svg";
import UsdcIcon from "../assets/icons/usdc-logo.svg";
import SolanaIcon from "../assets/icons/solana-sol-logo.svg";
import toast, { Toaster } from "react-hot-toast";

// --- 接口与类型定义 ---

// 定义报价结果的接口
interface QuoteResult {
  dex: string;
  outputAmount: string;
  originalQuote?: any; // 用来存储从 API 返回的完整原始报价
  error?: string; // 可选的错误信息
}

// 定义我们自己应用内部使用的 Token 接口
interface AppToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
}

// Token选择器组件的Props接口
interface TokenSelectorProps {
  value: string;
  onChange: (value: string) => void;
  tokenList: AppToken[];
  id: string;
  disabled: boolean;
}

// --- DEXAggregator 组件 ---
const DEXAggregator = () => {
  const { publicKey, signTransaction, sendTransaction, connected, wallet } =
    useWallet();
  const network = "devnet"; // 明确我们在开发网上

  // 使用 useMemo 创建一个持久化的 Solana 连接对象
  const connection = useMemo(
    () => new Connection(clusterApiUrl(network), "confirmed"),
    [network]
  );

  // 如果未连接钱包，直接渲染提示并 return，避免 useJupiter 被调用
  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <WalletMultiButton />
        <span className="ml-4 text-lg text-gray-400">请先连接钱包</span>
      </div>
    );
  }

  // --- 状态管理 (State) ---
  // 用来存储 "From" 代币的数字格式余额
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
  const [message, setMessage] = useState("");
  const [activeSwap, setActiveSwap] = useState<string | null>(null);
  // 最终生效的滑点值，默认为 1%
  const [activeSlippage, setActiveSlippage] = useState(1);
  // 专门用于自定义输入框的 state，可以是字符串或数字
  const [customSlippage, setCustomSlippage] = useState<string | number>("");

  // 只保留一个 state，用于存储用户输入的 SOL 数量字符串
  const [priorityFeeInSol, setPriorityFeeInSol] = useState("");
  const [solPrice, setSolPrice] = useState<number | null>(null);
  // 这个 useEffect 会在组件加载时获取 SOL 对 USDC 的价格
  useEffect(() => {
    const getSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );

        // 添加响应检查
        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }
        const data = await response.json();
        if (data.data.SOL) {
          setSolPrice(data.data.SOL.price);
        }
      } catch (error) {
        console.error("获取 SOL 价格失败:", error);
      }
    };
    getSolPrice();
  }, []); // 空依赖数组，表示只在组件首次加载时运行一次

  // 3. 旧版交易状态
  const [useLegacyTx, setUseLegacyTx] = useState(false);

  // 4. 广播模式状态 (Jupiter Hook 已优化，此处为逻辑占位)
  // const [broadcastMode, setBroadcastMode] = useState('Normal');

  // 5. 控制设置面板的显示/隐藏
  const [showSettings, setShowSettings] = useState(false);

  // 支持的代币列表（在真实应用中可能来自API）
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
        // 使用来自 CoinGecko 的稳定图标链接
        logo: UsdtIcon,
      },
    ],
    []
  );
  // --- 使用 Jupiter 获取报价 ---
  // 关键：将用户输入转换为 Jupiter 需要的格式
  // 1. 找到输入和输出代币的 mint 地址
  const inputMint = useMemo(() => {
    const token = supportedTokens.find((t) => t.symbol === fromTokenSymbol);
    return token ? new PublicKey(token.mint) : undefined;
  }, [fromTokenSymbol, supportedTokens]);

  const outputMint = useMemo(() => {
    const token = supportedTokens.find((t) => t.symbol === toTokenSymbol);
    return token ? new PublicKey(token.mint) : undefined;
  }, [toTokenSymbol, supportedTokens]);

  // 2. 将输入的金额字符串转换为代币的最小单位 (lamports)
  const amountInLamports = useMemo(() => {
    const token = supportedTokens.find((t) => t.symbol === fromTokenSymbol);
    if (!token) return new BigNumber(0);
    return new BigNumber(amount || 0).shiftedBy(token.decimals);
  }, [amount, fromTokenSymbol, supportedTokens]);

  const jupiterProps = useMemo(
    () => ({
      amount: JSBI.BigInt(amountInLamports.toString()), // 金额 (以 lamports 为单位)
      inputMint, // 输入代币的 mint 地址
      outputMint, // 输出代币的 mint 地址
      slippageBps: activeSlippage * 100, // 滑点 (以 bps 为单位)
      debounceTime: 250, // 延迟250毫秒后获取报价，防止用户快速输入时频繁请求
    }),
    [publicKey, amountInLamports, inputMint, outputMint, activeSlippage]
  );

  // 调用 useJupiter Hook
  const {
    quoteResponseMeta,
    loading: jupiterLoading,
    error: jupiterError,
    exchange,
  } = useJupiter(jupiterProps ?? undefined);

  // 创建一个简化的 jupiterQuote 变量，方便在 UI 中使用
  const jupiterQuote = quoteResponseMeta?.quoteResponse;

  // --- 自己写的真实报价函数 ---
  const getRaydiumV2Quote = async (
    inputAmount: number
  ): Promise<QuoteResult> => {
    const inputToken = supportedTokens.find(
      (t) => t.symbol === fromTokenSymbol
    );
    const outputToken = supportedTokens.find((t) => t.symbol === toTokenSymbol);
    if (!inputToken || !outputToken) throw new Error("代币未找到");

    try {
      // 1. 构造请求URL
      const url = `https://api.raydium.io/v2/quote?inputMint=${
        inputToken.mint
      }&outputMint=${outputToken.mint}&amount=${inputAmount}&slippage=${
        activeSlippage / 100
      }`;
      // API 需要小数形式的滑点 (1% -> 0.01)

      // 2. 发送请求
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);

      // 3. 解析JSON数据
      const data = await response.json();

      // 4. 格式化结果
      // 需要将返回的 outAmount （最小单位）转换成正常单位
      const outputAmount = new BigNumber(data.outAmount)
        .shiftedBy(-outputToken.decimals)
        .toFixed();

      return {
        dex: "Raydium (V2 API)",
        outputAmount: outputAmount,
        originalQuote: data, // 存储完整的返回数据
      };
    } catch (error) {
      console.error("获取 Raydium V2 报价失败:", error);
      return {
        dex: "Raydium (V2 API)",
        outputAmount: "0",
        error: (error as Error).message,
      };
    }
  };

  // --- 事件处理函数 ---
  const handleGetQuote = useCallback(async () => {
    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount) || currentAmount <= 0) return;
    // 用户看到一个加载通知，并记下它的“身份证号”
    const toastId = toast.loading("正在处理兑换...");
    toast.loading("正在刷新报价...", { id: toastId });
    setIsLoading(true);
    setRaydiumV2Quote(null); // 清空旧报价

    // 获取 Raydium V2 报价
    const raydiumResult = await getRaydiumV2Quote(currentAmount);
    setRaydiumV2Quote(raydiumResult);
    setIsLoading(false);

    if (raydiumResult.error) {
      toast.error(`Raydium 错误: ${raydiumResult.error}`, { id: toastId });
    } else {
      toast.success("报价已更新", { id: toastId });
    }
  }, [amount, fromTokenSymbol, toTokenSymbol]);

  const handleRaydiumSwap = useCallback(async () => {
    // 用户看到一个加载通知，并记下它的“身份证号”
    const toastId = toast.loading("正在处理兑换...");
    if (
      !publicKey ||
      !raydiumV2Quote ||
      !raydiumV2Quote.originalQuote ||
      !signTransaction
    ) {
      toast.error("无法执行 Raydium 兑换：缺少报价信息。", { id: toastId });
      return;
    }

    setIsSwapping(true);
    setActiveSwap("raydium");
    toast.loading("正在向 Raydium 请求交易...", { id: toastId });

    try {
      //1. 发送POST 请求到 Raydium Swap API
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

      // 2. 反序列化、签名并发送交易
      // Raydium API 返回的是 Base64 编码的序列化交易

      function base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64);
        return Uint8Array.from(binary, x => x.charCodeAt(0));
      }

      const txBuf = base64ToUint8Array(transaction);
      const tx = VersionedTransaction.deserialize(txBuf);

      toast.loading("请在您的钱包中批准 Raydium 交易...", { id: toastId });
      const signedTx = await signTransaction(tx);

      const signature = await connection.sendTransaction(signedTx);

      // 等待交易确认
      await connection.confirmTransaction(
        { signature, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
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
    if (!wallet || !exchange || !jupiterQuote || !publicKey) {
      toast.error("Jupiter 无法执行兑换：请连接钱包并获取有效报价。");
      return;
    }
    // 用户看到一个加载通知，并记下它的“身份证号”
    const toastId = toast.loading("正在处理兑换...");
    try {
      // 计算优先费（单位：micro-lamports）
      const getPriorityFee = () => {
        const feeInSol = parseFloat(priorityFeeInSol);
        if (isNaN(feeInSol) || feeInSol <= 0) return "auto";
        // 如果没输入或输入无效，则使用 Jupiter 自动模式
        // 经验值映射：将用户输入的 SOL 映射到合理的优先级别
        if (feeInSol > 0.0005) return 500000; // Turbo
        if (feeInSol > 0.0001) return 100000; // High
        return "auto";
      };

      const result = await exchange({
        quoteResponseMeta,
        prioritizationFeeLamports: getPriorityFee(), // 使用自动费用计算
        asLegacyTransaction: useLegacyTx,
      });
      console.log("Jupiter 交易成功:", result);

      let txSignature = "";
      if (result && typeof result === "object") {
        if ("signature" in result) {
          txSignature = (result as any).signature;
        } else if ("txid" in result) {
          txSignature = (result as any).txid;
        } else if (
          "signatures" in result &&
          Array.isArray(result.signatures) &&
          result.signatures.length > 0
        ) {
          txSignature = (result as any).signatures[0];
        }
      }
      if (txSignature) {
        toast.success(
          <span>
            兑换成功！
            <a
              href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 font-bold ml-2 underline"
            >
              查看交易
            </a>
          </span>,
          { id: toastId }
        );
      } else {
        toast.error("交易发送，但未获取到签名。", { id: toastId });
      }

      setAmount("");
    } catch (error) {
      console.error("Jupiter 兑换失败:", error);
      toast.error(`兑换失败: ${(error as Error).message}`, { id: toastId });
    } finally {
      // 同样，这里的 state 管理可以由 toast 完成，无需手动设置
    }
  }, [
    wallet,
    publicKey,
    exchange,
    jupiterQuote,
    priorityFeeInSol,
    useLegacyTx,
  ]);

  const handleSwitchTokens = () => {
    const temp = fromTokenSymbol;
    setFromTokenSymbol(toTokenSymbol);
    setToTokenSymbol(temp);
    setRaydiumV2Quote(null);
  };

  // --- 子组件与渲染 ---

  const TokenSelector = ({
    value,
    onChange,
    tokenList,
    id,
    disabled,
  }: TokenSelectorProps) => (
    <div className="relative w-full">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full py-2 px-4 border border-gray-700 rounded-lg bg-gray-800 text-white text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-12"
      >
        {tokenList.map((token) => (
          <option key={token.symbol} value={token.symbol}>
            {token.symbol}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <svg
          className="fill-current h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.141-.446 1.574 0 .436.445.408 1.197 0 1.615-.406.418-4.695 4.502-4.695 4.502a1.095 1.095 0 01-1.576 0S5.11 9.581 5.11 9.163c0-.418.072-1.17.406-1.615z" />
        </svg>
      </div>
    </div>
  );

  const getTokenLogo = (symbol: string) => {
    const token = supportedTokens.find((t) => t.symbol === symbol);
    return (
      token?.logo ||
      `https://placehold.co/32x32/374151/FFFFFF?text=${
        symbol ? symbol.charAt(0).toUpperCase() : "?"
      }`
    );
  };

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setFromBalance(null);
      setToBalance(null);
      return;
    }

    try {
      // 获取用户所有的代币账户
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      // ---处理"From"代币
      const fromTokenInfo = supportedTokens.find(
        (t) => t.symbol === fromTokenSymbol
      );
      if (fromTokenSymbol === "SOL") {
        //单独获取原生SOL余额
        const solBalance = await connection.getBalance(publicKey);
        const uiAmount = new BigNumber(solBalance).shiftedBy(-9);
        setFromBalance(uiAmount.toFormat(4)); // 字符串余额，用于显示
        setFromTokenBalance(uiAmount.toNumber()); // 数字余额，用于计算
      } else {
        // 查找对应的SPL代币账户
        const account = tokenAccounts.value.find(
          (acc) => acc.account.data.parsed.info.mint === fromTokenInfo?.mint
        );
        const uiAmount = account
          ? parseFloat(
              account.account.data.parsed.info.tokenAmount.uiAmountString
            )
          : 0;
        setFromBalance(uiAmount.toFixed(4)); // 字符串余额
        setFromTokenBalance(uiAmount); // 数字余额
      }

      // ---处理"To"代币
      const toTokenInfo = supportedTokens.find(
        (t) => t.symbol === toTokenSymbol
      );
      if (toTokenInfo) {
        if (toTokenInfo?.symbol === "SOL") {
          const solBalance = await connection.getBalance(publicKey);
          setToBalance(new BigNumber(solBalance).shiftedBy(-9).toFormat(4));
        } else {
          const account = tokenAccounts.value.find(
            (acc) => acc.account.data.parsed.info.mint === toTokenInfo.mint
          );
          setToBalance(
            account
              ? account.account.data.parsed.info.tokenAmount.uiAmountString
              : "0.00"
          );
        }
      }
    } catch (error) {
      console.error("获取余额失败:", error);
      toast.error("获取钱包余额失败");
    }
  }, [publicKey, fromTokenSymbol, toTokenSymbol, connection, supportedTokens]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]); // fetchBalances 已经包含了所有依赖项

  const handleMaxClick = () => {
    if (fromTokenBalance !== null) {
      // 为了安全，通常会保留一点点余额作为手续费，特别是对于 SOL
      // 这里我们为了简单，直接使用全部余额
      setAmount(fromTokenBalance.toString());
    }
  };

  // UI渲染
  return (
    <div className="bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen flex items-center justify-center font-sans text-white p-4 relative overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          // 定义默认样式
          className: "",
          duration: 5000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "green",
              secondary: "black",
            },
          },
          error: {
            duration: 3000,
            iconTheme: {
              primary: "red",
              secondary: "black",
            },
          },
        }}
      />
      {/* 背景装饰元素 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      <div className="w-full max-w-lg bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl space-y-6 z-10 border border-gray-700">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center text-purple-400">
            DEX 聚合器
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-700 rounded-full"
            >
              <img
                src={SettingsIcon}
                className="w-5 h-5 text-slate-400 hover:text-white"
              />
            </button>
            <WalletMultiButton
              style={{
                backgroundColor: "#2e2e3d",
                borderRadius: "8px",
                height: "40px",
                fontSize: "14px",
              }}
            />
          </div>
        </header>

        {showSettings && (
          <div
            className="absolute inset-0 bg-black/50 flex justify-center items-center z-20"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">交易设置</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-full hover:bg-slate-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* 1. 最大滑点设置 */}
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    最大滑点容忍度
                  </label>
                  <div className="flex items-center space-x-2 mt-2">
                    <button
                      onClick={() => {
                        setActiveSlippage(0.5);
                        setCustomSlippage(""); // 点击按钮时，清空自定义输入框
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        activeSlippage === 0.5 && customSlippage === ""
                          ? "bg-purple-600"
                          : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      0.5%
                    </button>
                    <button
                      onClick={() => {
                        setActiveSlippage(1);
                        setCustomSlippage("");
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        activeSlippage === 1 && customSlippage === ""
                          ? "bg-purple-600"
                          : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      1%
                    </button>
                    {/* 自定义输入框 */}
                    <div className="relative flex-grow">
                      <input
                        type="number"
                        value={customSlippage}
                        onChange={(e) => {
                          setCustomSlippage(e.target.value);
                          // 如果输入有效，则更新滑点
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setActiveSlippage(value);
                          }
                        }}
                        className="w-full bg-slate-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right pr-6"
                        placeholder="自定义"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                  {/* 风险提示 */}
                  {activeSlippage > 50 && (
                    <p className="text-xs text-red-400 mt-2 animate-pulse">
                      警告：滑点值过大，您的交易可能会遭受亏损！
                    </p>
                  )}
                </div>

                {/* 2. 优先费设置 */}
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    交易优先费 (可选)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    在网络拥堵时，支付额外费用可提高交易成功率。
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      value={priorityFeeInSol}
                      onChange={(e) => setPriorityFeeInSol(e.target.value)}
                      className="w-full bg-slate-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                      placeholder="0.001"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                      SOL
                    </span>
                  </div>
                  {/* 美元换算显示 */}
                  {solPrice && priorityFeeInSol && (
                    <p className="text-xs text-slate-500 mt-1">
                      ≈ {(parseFloat(priorityFeeInSol) * solPrice).toFixed(4)}
                      USD
                    </p>
                  )}
                </div>

                {/* 3. 旧版交易设置 */}
                <div>
                  <div className="flex justify-between items-center">
                    <div>
                      <label
                        htmlFor="legacy-tx"
                        className="text-sm font-medium text-slate-300"
                      >
                        使用旧版交易
                      </label>
                      <p className="text-xs text-slate-500">
                        仅在遇到版本化交易问题时使用。
                      </p>
                    </div>
                    <button
                      onClick={() => setUseLegacyTx(!useLegacyTx)}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                        useLegacyTx ? "bg-green-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          useLegacyTx
                            ? "transform translate-x-6"
                            : "transform translate-x-1"
                        }`}
                      ></span>
                    </button>
                  </div>
                </div>

                {/* 4. 广播模式解释 (UI占位) */}
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    广播模式
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Jupiter Hook
                    已自动优化交易广播以获得最佳性能。如需“私密交易”等高级控制，需要手动构建并发送交易。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <main className="relative bg-slate-800/90 p-6 rounded-2xl shadow-2xl border border-slate-700">
          {/* 'From' Token Section */}
          <div className="bg-gray-700/80 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>From</span>
              <span
                className={`font-mono transition-colors ${
                  amount &&
                  fromTokenBalance !== null &&
                  parseFloat(amount) > fromTokenBalance
                    ? "text-red-400"
                    : "text-slate-400"
                }`}
              >
                余额: {fromBalance !== null ? fromBalance : "--"}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setRaydiumV2Quote(null); //输入变化时清空旧报价
                }}
                placeholder="0.0"
                disabled={isSwapping}
                className="w-full bg-transparent text-2xl font-mono focus:outline-none text-gray-400"
              />
              <button
                onClick={handleMaxClick}
                className="text-xs bg-purple-600/50 hover:bg-purple-600 px-2 py-1 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={fromTokenBalance === null}
              >
                Max
              </button>
              <div className="flex items-center bg-gray-800 p-2 rounded-lg space-x-2 min-w-[180px] w-[180px]">
                <img
                  src={getTokenLogo(fromTokenSymbol)}
                  alt={fromTokenSymbol}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <TokenSelector
                  id="from-token"
                  value={fromTokenSymbol}
                  onChange={setFromTokenSymbol}
                  tokenList={supportedTokens}
                  disabled={isLoading || isSwapping}
                />
              </div>
            </div>
          </div>
          {/* Switch Button */}
          <div className="flex justify-center my-2">
            <button
              onClick={handleSwitchTokens}
              className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-transform duration-300 transform hover:rotate-180"
              disabled={isSwapping}
            >
              <ArrowDownUp className="w-5 h-5 text-purple-400" />
            </button>
          </div>

          {/* 'To' Token Section */}
          <div className="bg-gray-700/80 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>To</span>
              <span className="font-mono">
                余额: {toBalance !== null ? toBalance : "--"}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                // 修复 Jupiter 报价显示问题
                value={(() => {
                  const outputToken = supportedTokens.find(
                    (t) => t.symbol === toTokenSymbol
                  );
                  if (!jupiterQuote || !outputToken) return "0.0";
                  return new BigNumber(jupiterQuote.outAmount.toString())
                    .shiftedBy(-outputToken.decimals)
                    .toFormat();
                })()}
                readOnly
                className="w-full bg-transparent text-2xl font-mono focus:outline-none text-gray-400"
              />
              <div className="flex items-center bg-gray-800 p-2 rounded-lg space-x-2 min-w-[180px] w-[180px]">
                <img
                  src={getTokenLogo(toTokenSymbol)}
                  alt={toTokenSymbol}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <TokenSelector
                  id="to-token"
                  value={toTokenSymbol}
                  onChange={setToTokenSymbol}
                  tokenList={supportedTokens}
                  disabled={isLoading || isSwapping}
                />
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-6">
            <button
              onClick={handleGetQuote}
              disabled={!amount || isLoading || jupiterLoading || isSwapping}
              className={`w-full p-4 rounded-lg font-bold text-lg transition-all duration-300
                ${
                  !connected
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : isLoading || isSwapping
                    ? "bg-purple-800 animate-pulse"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
            >
              {!connected
                ? "请连接钱包"
                : isLoading || jupiterLoading
                ? "正在获取报价..."
                : "刷新报价"}
            </button>
          </div>

          {/* --- 报价对比与信息区域 --- */}
          <div className="space-y-3 mt-4 min-h-[120px]">
            {" "}
            {/* 给予一个最小高度防止跳动 */}
            {/* Raydium V2 报价卡片 */}
            {raydiumV2Quote && !raydiumV2Quote.error && (
              <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center transition-opacity duration-300 animate-fade-in">
                <div>
                  <p className="font-semibold text-sm">Raydium (V2 API)</p>
                  <p className="font-mono text-lg">
                    {raydiumV2Quote.outputAmount} {toTokenSymbol}
                  </p>
                </div>
                <button
                  onClick={handleRaydiumSwap}
                  disabled={!connected || isSwapping}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:bg-slate-600"
                >
                  {isSwapping && activeSwap === "raydium"
                    ? "处理中..."
                    : "兑换"}
                </button>
              </div>
            )}
            {/* Jupiter 聚合器报价卡片 */}
            {jupiterQuote && (
              <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center ring-2 ring-green-500/50 transition-opacity duration-300 animate-fade-in">
                <div>
                  <p className="font-semibold text-sm text-green-400">
                    Jupiter (最优)
                  </p>
                  <p className="font-mono text-lg">
                    {(() => {
                      const outputToken = supportedTokens.find(
                        (t) => t.symbol === toTokenSymbol
                      );
                      if (!outputToken) return "...";
                      return new BigNumber(jupiterQuote.outAmount.toString())
                        .shiftedBy(-outputToken.decimals)
                        .toFormat(4); // 显示4位小数
                    })()}{" "}
                    {toTokenSymbol}
                  </p>
                </div>
                <button
                  onClick={handleJupiterSwap} // 注意：这里我们调用 handleJupiterSwap
                  disabled={!connected || isSwapping}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:bg-slate-600"
                >
                  {isSwapping && activeSwap === "jupiter"
                    ? "处理中..."
                    : "兑换"}
                </button>
              </div>
            )}
            {/* 加载与错误状态提示 */}
            <div className="pt-2 text-center text-sm">
              {(isLoading || jupiterLoading) && (
                <p className="text-slate-400 animate-pulse">
                  正在寻找最佳路径...
                </p>
              )}
              {/* 显示 Raydium 的错误 */}
              {raydiumV2Quote && raydiumV2Quote.error && (
                <p className="text-red-400">
                  Raydium 错误: {raydiumV2Quote.error}
                </p>
              )}
              {/* 显示 Jupiter 的错误 */}
              {jupiterError && (
                <p className="text-red-400">
                  {jupiterError.includes("TOKEN_NOT_TRADABLE")
                    ? "Jupiter: 当前代币对无法交易"
                    : `Jupiter 错误: ${jupiterError}`}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DEXAggregator;
