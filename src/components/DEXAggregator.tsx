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

import SettingsPanel from "./SettingPanel";
import SwapForm from "./SwapForm";
import { useAppLogic } from "../hooks/useAppLogic";


const DEXAggregatorView = () => {
  const appLogic = useAppLogic();
  
  return (
    <div className="bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen flex items-center justify-center font-sans text-white p-4 relative overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{ style: { background: "#363636", color: "#fff" } }}
      />
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
              onClick={() => appLogic.setShowSettings(true)}
              className="p-2 hover:bg-slate-700 rounded-full"
            >
              <img
                src={SettingsIcon}
                className="w-5 h-5 text-slate-400 hover:text-white"
                alt="Settings"
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

        <SettingsPanel
          show={appLogic.showSettings}
          onClose={() => appLogic.setShowSettings(false)}
          activeSlippage={appLogic.activeSlippage}
          setActiveSlippage={appLogic.setActiveSlippage}
          customSlippage={appLogic.customSlippage}
          setCustomSlippage={appLogic.setCustomSlippage}
          priorityFeeInSol={appLogic.priorityFeeInSol}
          setPriorityFeeInSol={appLogic.setPriorityFeeInSol}
          solPrice={appLogic.solPrice}
          useLegacyTx={appLogic.useLegacyTx}
          setUseLegacyTx={appLogic.setUseLegacyTx}
        />

        <SwapForm
          amount={appLogic.amount}
          fromTokenSymbol={appLogic.fromTokenSymbol}
          toTokenSymbol={appLogic.toTokenSymbol}
          fromBalance={appLogic.fromBalance}
          toBalance={appLogic.toBalance}
          fromTokenBalance={appLogic.fromTokenBalance}
          supportedTokens={appLogic.supportedTokens}
          isSwapping={appLogic.isSwapping}
          isLoading={appLogic.isLoading}
          jupiterLoading={appLogic.jupiterLoading}
          connected={appLogic.connected}
          raydiumV2Quote={appLogic.raydiumV2Quote}
          jupiterQuote={appLogic.jupiterQuote}
          activeSwap={appLogic.activeSwap}
          jupiterError={appLogic.jupiterError}
          setAmount={appLogic.setAmount}
          setRaydiumV2Quote={appLogic.setRaydiumV2Quote}
          setFromTokenSymbol={appLogic.setFromTokenSymbol}
          setToTokenSymbol={appLogic.setToTokenSymbol}
          handleMaxClick={appLogic.handleMaxClick}
          handleSwitchTokens={appLogic.handleSwitchTokens}
          handleGetQuote={appLogic.handleGetQuote}
          handleRaydiumSwap={appLogic.handleRaydiumSwap}
          handleJupiterSwap={appLogic.handleJupiterSwap}
          getTokenLogo={appLogic.getTokenLogo}
        />
      </div>
    </div>
  );
};

const DEXAggregator = () => {
  const { publicKey } = useWallet();
  if (!publicKey) {
    return (
      <div className="bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            欢迎使用DEX聚合器
          </h1>
          <p className="text-gray-400 mb-8">请先连接您的Solana钱包以开始使用</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return <DEXAggregatorView />;
};

export default DEXAggregator;
