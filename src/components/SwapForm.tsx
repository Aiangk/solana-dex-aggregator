import React from 'react';
import { ArrowDownUp } from 'lucide-react';
import BigNumber from 'bignumber.js';
import JSBI from "jsbi";

// 定义从父组件传入的类型
interface AppToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
}

interface Quote {
  outAmount: JSBI;
}

interface QuoteResult {
  dex: string;
  outputAmount: string;
  originalQuote?: any;
  error?: string;
}

interface SwapFormProps {
  // States
  amount: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  fromBalance: string | null;
  toBalance: string | null;
  fromTokenBalance: number | null;
  supportedTokens: AppToken[];
  isSwapping: boolean;
  isLoading: boolean;
  jupiterLoading: boolean;
  connected: boolean | undefined;
  raydiumV2Quote: QuoteResult | null;
  jupiterQuote: Quote | undefined | null;
  activeSwap: string | null;
  jupiterError: string | undefined;

  // Handlers
  setAmount: (value: string) => void;
  setRaydiumV2Quote: (quote: QuoteResult | null) => void;
  setFromTokenSymbol: (symbol: string) => void;
  setToTokenSymbol: (symbol: string) => void;
  handleMaxClick: () => void;
  handleSwitchTokens: () => void;
  handleGetQuote: () => void;
  handleRaydiumSwap: () => void;
  handleJupiterSwap: () => void;
  getTokenLogo: (symbol: string) => string;
}

// TokenSelector 是一个内部组件，只在 SwapForm 中使用
const TokenSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  tokenList: AppToken[];
  id: string;
  disabled: boolean;
}> = ({ value, onChange, tokenList, id, disabled }) => (
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
      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.141-.446 1.574 0 .436.445.408 1.197 0 1.615-.406.418-4.695 4.502-4.695 4.502a1.095 1.095 0 01-1.576 0S5.11 9.581 5.11 9.163c0-.418.072-1.17.406-1.615z" />
      </svg>
    </div>
  </div>
);


const SwapForm: React.FC<SwapFormProps> = ({
  amount,
  fromTokenSymbol,
  toTokenSymbol,
  fromBalance,
  toBalance,
  fromTokenBalance,
  supportedTokens,
  isSwapping,
  isLoading,
  jupiterLoading,
  connected,
  raydiumV2Quote,
  jupiterQuote,
  activeSwap,
  jupiterError,
  setAmount,
  setRaydiumV2Quote,
  setFromTokenSymbol,
  setToTokenSymbol,
  handleMaxClick,
  handleSwitchTokens,
  handleGetQuote,
  handleRaydiumSwap,
  handleJupiterSwap,
  getTokenLogo
}) => {
  return (
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
              setRaydiumV2Quote(null);
            }}
            placeholder="0.0"
            disabled={isSwapping}
            className="w-full bg-transparent text-2xl font-mono focus:outline-none text-white"
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
            value={(() => {
              const outputToken = supportedTokens.find((t) => t.symbol === toTokenSymbol);
              if (!jupiterQuote || !outputToken) return "0.0";
              return new BigNumber(jupiterQuote.outAmount.toString())
                .shiftedBy(-outputToken.decimals)
                .toFormat();
            })()}
            readOnly
            className="w-full bg-transparent text-2xl font-mono focus:outline-none text-white"
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

      {/* Quote Display Area */}
      <div className="space-y-3 mt-4 min-h-[120px]">
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
              {isSwapping && activeSwap === "raydium" ? "处理中..." : "兑换"}
            </button>
          </div>
        )}
        {jupiterQuote && (
          <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center ring-2 ring-green-500/50 transition-opacity duration-300 animate-fade-in">
            <div>
              <p className="font-semibold text-sm text-green-400">
                Jupiter (最优)
              </p>
              <p className="font-mono text-lg">
                {(() => {
                  const outputToken = supportedTokens.find((t) => t.symbol === toTokenSymbol);
                  if (!outputToken) return "...";
                  return new BigNumber(jupiterQuote.outAmount.toString())
                    .shiftedBy(-outputToken.decimals)
                    .toFormat(4);
                })()}{" "}
                {toTokenSymbol}
              </p>
            </div>
            <button
              onClick={handleJupiterSwap}
              disabled={!connected || isSwapping}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:bg-slate-600"
            >
              {isSwapping && activeSwap === "jupiter" ? "处理中..." : "兑换"}
            </button>
          </div>
        )}
        <div className="pt-2 text-center text-sm">
          {(isLoading || jupiterLoading) && (
            <p className="text-slate-400 animate-pulse">正在寻找最佳路径...</p>
          )}
          {raydiumV2Quote && raydiumV2Quote.error && (
            <p className="text-red-400">Raydium 错误: {raydiumV2Quote.error}</p>
          )}
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
  );
};

export default SwapForm;
