import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";

import BigNumber from "bignumber.js";
import { useJupiter } from "@jup-ag/react-hook";
import JSBI from "jsbi";
import SettingsIcon from "../assets/icons/SettingsIcon.svg";
import UsdtIcon from "../assets/icons/usdt.svg";
import UsdcIcon from "../assets/icons/usdc-logo.svg";
import SolanaIcon from "../assets/icons/solana-sol-logo.svg";
import toast, { Toaster } from "react-hot-toast";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { RouteCacheProgram } from "../anchor/route_cache_program";
import idlJson from "../anchor/route_cache_program.json";
import {
  Liquidity,
  Token,
  TokenAmount,
  Percent,
  jsonInfo2PoolKeys,
  LiquidityPoolKeysV4,
  LiquidityPoolJsonInfo,
} from "@raydium-io/raydium-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";
import { useTranslation } from "react-i18next";
console.log("IDL Loaded:", idlJson);

// 定义路由步骤接口
export interface RouteStep {
  poolId: string;
  poolName: string;
  inputAmount: string;
  outputAmount: string;
  inputSymbol: string;
  outputSymbol: string;
}

export interface SwapRecord {
  txid: string; // 我们用 txid 作为唯一的 id
  timestamp: number;
  dex: "Jupiter" | "Raydium"; // 使用联合类型，更严谨
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  amountOut: string;
  routePath?: any[]; // 暂时将类型设为 any，未来可以再细化
}
interface LiquidityPoolsJSONResponse {
  official: LiquidityPoolJsonInfo[];
  unOfficial: LiquidityPoolJsonInfo[];
}

// 定义我们 App 的核心逻辑 Hook
export const useDEXAggregatorLogic = () => {
  const { i18n } = useTranslation();
  
  interface QuoteResult {
    dex: string;
    outputAmount: string;
    originalQuote?: any;
    error?: string;
    routePath?: RouteStep[];
  }

  interface AppToken {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logo: string;
  }

  interface TriggerOrder {
    orderId: string;
    inputMint: string;
    outputMint: string;
    triggerPrice?: string;
    status?: string;
    makingAmount?: string;
    takingAmount?: string;
  }
  interface DcaStrategy {
    id: string;
    inputMint: string;
    outputMint: string;
    amount: string;
    frequency: string;
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

  // 全局设置状态
  const [useLegacyTx, setUseLegacyTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // 全局语言状态,从localStorage初始化
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const savedLang = localStorage.getItem("preferredLanguage");
    return savedLang || i18n.language;
  });

  // 全局Toast状态管理
  const [pendingToasts, setPendingToasts] = useState<{[key: string]: string}>({});
  
  // 清除特定Toast
  const clearPendingToast = useCallback((id: string) => {
    setPendingToasts(prev => {
      const newToasts = {...prev};
      delete newToasts[id];
      return newToasts;
    });
    toast.dismiss(id);
  }, []);

  // anchor 相关的逻辑
  const [cachedQuote, setCachedQuote] = useState<QuoteResult | null>(null);
  const [isFetchingCache, setIsFetchingCache] = useState(false);

  // 钱包历史记录
  // 修改 swapHistory 的 useState，从 localStorage 初始化
  const [swapHistory, setSwapHistory] = useState<SwapRecord[]>(() => {
    const savedHistory = localStorage.getItem("swapHistory");
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  //限价单和DCA策略
  const [dcaStrategies, setDcaStrategies] = useState<DcaStrategy[]>(() => {
    const savedStrategies = localStorage.getItem("dcaStrategies");
    return savedStrategies ? JSON.parse(savedStrategies) : [];
  });
  
  const [limitOrders, setLimitOrders] = useState<TriggerOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 语言切换处理函数
  const changeLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem("preferredLanguage", lang);
  }, [i18n]);

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

  // 初始化语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem("preferredLanguage");
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
      setCurrentLanguage(savedLanguage);
    }
  }, [i18n]);

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

  // anchor 相关的逻辑
  // ====== 链上程序交互的核心逻辑 ======
  // 1. 定义部署在 Devnet 上的 Program ID
  const programId = useMemo(
    () => new PublicKey("EkazNeYGJqJrMUrPyiULQjFHWuCQrohBWxX25tXjkpR"),
    []
  );
  const idl = useMemo(() => idlJson as Idl, []);

  // 2.创建 Provider 和 Program 实例
  const routeCacheProgram = useMemo(() => {
    // 只有当钱包连接后，才创建 provider 和 program
    if (connected && walletContext.publicKey && connection) {
      // 使用从 useWallet 获取的完整 wallet 对象来创建 Provider
      const wallet = {
        publicKey: walletContext.publicKey,
        signTransaction: walletContext.signTransaction!,
        signAllTransactions: walletContext.signAllTransactions!,
      };
      const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
      );

      const program = new Program<RouteCacheProgram>(
        idl,
        provider // 正确：第二个参数是 provider
      );
      return program;
    }
    return null;
  }, [connected, walletContext, connection, programId]);

  // 3. 读取链上缓存的逻辑。
  useEffect(() => {
    const fetchAndCalculateCachedRoute = async () => {
      if (!routeCacheProgram || !inputMint || !outputMint || !amount) {
        setCachedQuote(null);
        return;
      }

      setIsFetchingCache(true);
      setCachedQuote(null); // 开始获取前清空旧数据

      //计算 PDA 地址，必须与链上程序的种子完全匹配
      const [routeCachePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("route"),
          new PublicKey(inputMint).toBuffer(),
          new PublicKey(outputMint).toBuffer(),
        ],
        routeCacheProgram.programId
      );

      try {
        // 1. 从我们自己的链上程序获取缓存的"路径"
        const accountData = await routeCacheProgram.account.routeCache.fetch(
          routeCachePda
        );
        const routeSteps = accountData.routePlan;

        if (routeSteps.length === 0) throw new Error("缓存的路由为空");

        // 2. 根据路径，在前端实时获取每个池子的"最新流动性"
        // 从 Raydium API 获取最新的池子列表，这是更稳妥的方式
        const response = await fetch("/devnet_pools.json");
        if (!response.ok) {
          throw new Error(
            "无法加载本地的 devnet_pools.json 文件，请检查 public 目录。"
          );
        }
        const liquidityJson =
          (await response.json()) as LiquidityPoolsJSONResponse;

        // 添加错误处理逻辑，跳过无效的池子信息
        const poolKeysList = [
          ...liquidityJson.official,
          ...liquidityJson.unOfficial,
        ]
          .map((poolInfo) => {
            try {
              return jsonInfo2PoolKeys(poolInfo);
            } catch (error) {
              console.warn(`跳过无效池子信息: ${poolInfo.id || "未知ID"}`);
              return null;
            }
          })
          .filter((key): key is LiquidityPoolKeysV4 => key !== null);
        //.filter(Boolean); // 过滤掉无效的池子信息
        let currentAmountIn = new TokenAmount(
          new Token(
            TOKEN_PROGRAM_ID,
            new PublicKey(inputMint),
            supportedTokens.find(
              (t) => t.mint === inputMint.toString()
            )!.decimals
          ),
          amount,
          false
        );

        const displayableRoute: RouteStep[] = [];

        // 3. 在前端，根据实时流动性，一步步地模拟计算最终输出
        for (const step of routeSteps) {
          const poolKeys = poolKeysList.find((p) =>
            p.id.equals(step.ammPoolId)
          ) as LiquidityPoolKeysV4;

          if (!poolKeys) {
            console.warn(
              `未能在池子列表中找到步骤 ${step.ammPoolId.toBase58()} 的信息，跳过计算。`
            );
            continue;
          }

          const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });

          // 安全地获取输出代币的小数位数
          const outputMint = step.outputMint;
          const outputTokenDecimals = poolKeys.baseMint.equals(outputMint)
            ? poolKeys.baseDecimals
            : poolKeys.quoteMint.equals(outputMint)
            ? poolKeys.quoteDecimals
            : 0; // Fallback

          if (outputTokenDecimals === 0) {
            console.warn(
              `无法确定池子 ${poolKeys.id.toBase58()} 中输出代币 ${outputMint.toBase58()} 的小数位数。`
            );
            continue;
          }

          const { amountOut } = Liquidity.computeAmountOut({
            poolKeys,
            poolInfo,
            amountIn: currentAmountIn,
            currencyOut: new Token(
              TOKEN_PROGRAM_ID,
              outputMint,
              outputTokenDecimals
            ),
            slippage: new Percent(1, 100),
          });

          const stepInputToken = supportedTokens.find(
            (t) => t.mint === currentAmountIn.token.mint.toBase58()
          );
          const stepOutputToken = supportedTokens.find(
            (t) => t.mint === step.outputMint.toBase58()
          );

          if (stepInputToken && stepOutputToken) {
            displayableRoute.push({
              poolId: step.ammPoolId.toBase58(),
              poolName: `${stepInputToken.symbol} → ${stepOutputToken.symbol}`,
              inputAmount: currentAmountIn.toExact(),
              outputAmount: amountOut.toExact(),
              inputSymbol: stepInputToken.symbol,
              outputSymbol: stepOutputToken.symbol,
            });
          }

          currentAmountIn = amountOut as TokenAmount;
        }

        // 4. 将最终计算出的真实数字报价，更新到我们的 state 中
        setCachedQuote({
          dex: "快速预估 ⚡️",
          outputAmount: currentAmountIn.toFixed(4),
          routePath: displayableRoute,
        });
      } catch (error) {
        console.error("计算缓存路由报价失败:", error);
        setCachedQuote(null);
      } finally {
        setIsFetchingCache(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchAndCalculateCachedRoute();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [
    routeCacheProgram,
    inputMint,
    outputMint,
    amount,
    connection,
    supportedTokens,
  ]);


  //限价单和DCA策略
  // 加载限价单列表
  useEffect(() => {
    const loadLimitOrders = async () => {
      if (!publicKey) return;
      setIsLoadingOrders(true);
      try {
        const orders = await fetchLimitOrders();
        setLimitOrders(orders);
      } catch (error) {
        console.error("加载限价单失败:", error);
        toast.error("无法加载限价单列表");
      } finally {
        setIsLoadingOrders(false);
      }
    };
    
    if (publicKey) {
      loadLimitOrders();
      // 每60秒刷新一次订单
      const interval = setInterval(loadLimitOrders, 60000);
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  // 先定义 fetchLimitOrders 函数，再使用它
  const fetchLimitOrders = useCallback(async (): Promise<TriggerOrder[]> => {
    if (!publicKey) return [];
    try {
      // 检查是否在测试环境
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // 返回模拟数据，避免在开发环境中调用可能不可用的API
        console.log("开发环境中使用模拟限价单数据");
        return [
          {
            orderId: "mock-order-1",
            inputMint: "So11111111111111111111111111111111111111112",
            outputMint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
            triggerPrice: "25.5",
            makingAmount: "1.0",
            takingAmount: "25.5"
          }
        ];
      }
      
      const resp = await fetch(`https://lite-api.jup.ag/trigger/v1/getTriggerOrders?user=${publicKey.toBase58()}`);
      if (!resp.ok) throw new Error(`API请求失败: ${resp.status}`);
      const { orders } = await resp.json();
      return orders || [];
    } catch (error) {
      console.error("获取限价单失败:", error);
      // 返回空数组，而不是抛出错误，确保UI正常显示
      return [];
    }
  }, [publicKey]);

  const createLimitOrder = useCallback(async (params: {
    inputMint: string;
    outputMint: string;
    makingAmount: string;
    takingAmount: string;
    expiredAt?: number;
    triggerPrice?: string;
  }) => {
    if (!publicKey || !signTransaction) { 
      toast.error("请先连接钱包"); 
      return; 
    }
    
    const toastId = toast.loading("正在创建限价单...");
    
    try {
      const body = {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        maker: publicKey.toBase58(),
        payer: publicKey.toBase58(),
        params: {
          makingAmount: params.makingAmount,
          takingAmount: params.takingAmount,
          expiredAt: params.expiredAt || Math.floor(Date.now()/1000) + 86400, // 默认24小时过期
        },
        wrapAndUnwrapSol: true,
      };
    
      const resp = await fetch("https://lite-api.jup.ag/trigger/v1/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!resp.ok) {
        throw new Error(`API请求失败: ${resp.status}`);
      }
      
      const { transaction: txBase64, requestId, order } = await resp.json();
      
      if (!txBase64) {
        throw new Error("未能获取交易数据");
      }
      
      const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));
      toast.loading("请在钱包中确认交易...", { id: toastId });
      const signed = await signTransaction(tx);
      
      const execResp = await fetch("https://lite-api.jup.ag/trigger/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
          requestId,
        }),
      });
      
      if (!execResp.ok) {
        throw new Error(`执行交易失败: ${execResp.status}`);
      }
      
      await execResp.json();
      toast.success(`限价单已提交成功!`, { id: toastId });
      
      // 刷新订单列表
      const orders = await fetchLimitOrders();
      setLimitOrders(orders);
    } catch (error) {
      console.error("创建限价单失败:", error);
      toast.error(`创建限价单失败: ${(error as Error).message}`, { id: toastId });
    }
  }, [publicKey, signTransaction, fetchLimitOrders]);

  const cancelLimitOrder = useCallback(async (orderId: string) => {
    if (!publicKey || !signTransaction) {
      toast.error("请先连接钱包");
      return;
    }
    
    const toastId = toast.loading(`正在取消订单...`);
    
    try {
      const resp = await fetch("https://lite-api.jup.ag/trigger/v1/cancelOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId }),
      });
      
      if (!resp.ok) {
        throw new Error(`API请求失败: ${resp.status}`);
      }
      
      const { transaction: txBase64 = "" } = await resp.json();
      
      if (!txBase64) {
        throw new Error("未能获取取消交易数据");
      }
      
      const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));
      toast.loading("请在钱包中确认交易...", { id: toastId });
      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      
      toast.success(`订单已成功取消`, { id: toastId });
      
      // 刷新订单列表
      const orders = await fetchLimitOrders();
      setLimitOrders(orders);
    } catch (error) {
      console.error("取消订单失败:", error);
      toast.error(`取消订单失败: ${(error as Error).message}`, { id: toastId });
    }
  }, [publicKey, signTransaction, connection, fetchLimitOrders]);


  const createDcaStrategy = useCallback((p: {
    inputMint:string; outputMint:string;
    amount:string; frequency:string;
  }) => {
    const strat = { id: Date.now().toString(), ...p };
    const updatedStrategies = [...dcaStrategies, strat];
    setDcaStrategies(updatedStrategies);
    localStorage.setItem("dcaStrategies", JSON.stringify(updatedStrategies));
    toast.success("DCA 策略已创建！");
  }, [dcaStrategies]);
  
  const removeDcaStrategy = useCallback((id: string) => {
    const updatedStrategies = dcaStrategies.filter(s => s.id !== id);
    setDcaStrategies(updatedStrategies);
    localStorage.setItem("dcaStrategies", JSON.stringify(updatedStrategies));
    toast.success("DCA 策略已移除！");
  }, [dcaStrategies]);

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
      recordSwap(
        {
          dex: "Raydium",
          fromSymbol: fromTokenSymbol,
          toSymbol: toTokenSymbol,
          amountIn: amount,
          amountOut: raydiumV2Quote.outputAmount,
        },
        signature
      );
    } catch (error) {
      toast.error(`Raydium 兑换失败: ${(error as Error).message}`, {
        id: toastId,
      });
    } finally {
      setIsSwapping(false);
      setActiveSwap(null);
    }
  }, [publicKey, raydiumV2Quote, signTransaction, connection]);

  //交易记录
  const recordSwap = useCallback(
    (record: Omit<SwapRecord, "timestamp" | "txid">, txid: string) => {
      const newRecord: SwapRecord = {
        ...record,
        txid,
        timestamp: Date.now(),
      };

      const newHistory = [newRecord, ...swapHistory.slice(0, 9)];
      setSwapHistory(newHistory);
      // 将历史记录存入 localStorage，实现持久化
      localStorage.setItem("swapHistory", JSON.stringify(newHistory));
    },
    [swapHistory]
  );

  const handleRetry = useCallback((record: SwapRecord) => {
    setFromTokenSymbol(record.fromSymbol);
    setToTokenSymbol(record.toSymbol);
    setAmount(record.amountIn);
  }, []);

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
    setIsSwapping(true);
    setActiveSwap("jupiter");
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
        toast.success("兑换成功！", { id: toastId });
        recordSwap(
          {
            dex: "Jupiter",
            fromSymbol: fromTokenSymbol,
            toSymbol: toTokenSymbol,
            amountIn: amount,
            amountOut: new BigNumber(jupiterQuote.outAmount.toString())
              .shiftedBy(-(jupiterQuote.outputMint as any).decimals)
              .toFormat(4),
          },
          signature
        );
      } else {
        toast.error("交易发送，但未获取到签名。", { id: toastId });
      }
      setAmount("");
    } catch (error) {
      console.error("Jupiter 兑换失败:", error);
      toast.error(`兑换失败: ${(error as Error).message}`, { id: toastId });
    } finally {
      setIsSwapping(false);
      setActiveSwap(null);
    }
  }, [
    walletContext,
    exchange,
    jupiterQuote,
    quoteResponseMeta,
    priorityFeeInSol,
    useLegacyTx,
    connection,
    recordSwap,
    fromTokenSymbol,
    toTokenSymbol,
    amount,
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
    cachedQuote,
    isFetchingCache,
    currentLanguage,
    limitOrders,
    isLoadingOrders,
    dcaStrategies,
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
    handleRetry,
    swapHistory,
    createLimitOrder,
    fetchLimitOrders,
    cancelLimitOrder,
    createDcaStrategy,
    removeDcaStrategy,
    changeLanguage,
  };
};
