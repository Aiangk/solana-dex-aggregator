import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// 导入我们新命名的逻辑 Hook 和 UI 组件
import { useDEXAggregatorLogic } from '../hooks/useDEXAggregatorLogic';
import SwapForm from './SwapForm'; // 假设您已拆分
import SettingsPanel from './SettingPanel'; // 假设您已拆分
import { useTranslation } from 'react-i18next';

export const SwapView = () => {
  // 只需一行代码，即可获取所有的状态和逻辑！
  const logic = useDEXAggregatorLogic();
  const { t } = useTranslation(['common']);
  return (
    <div className="bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen w-full flex items-center justify-center font-sans text-white p-4 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>

        {/* 主 UI 组件 */}
        <div className="z-10 w-full max-w-lg">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-purple-400">
            {t('common:home.dexAggregator', 'DEX 聚合器')}
          </h1>
          <button
              onClick={() => logic.setShowSettings(true)}
              className="p-2 hover:bg-slate-700 rounded-full"
            >
            {/* 你可能需要一个 Settings Icon */}
            ⚙️
          </button>
        </header>
        
        <SwapForm
          amount={logic.amount}
          fromTokenSymbol={logic.fromTokenSymbol}
          toTokenSymbol={logic.toTokenSymbol}
          fromBalance={logic.fromBalance}
          toBalance={logic.toBalance}
          fromTokenBalance={logic.fromTokenBalance}
          supportedTokens={logic.supportedTokens}
          isSwapping={logic.isSwapping}
          isLoading={logic.isLoading}
          jupiterLoading={logic.jupiterLoading}
          connected={logic.connected}
          raydiumV2Quote={logic.raydiumV2Quote}
          jupiterQuote={logic.jupiterQuote}
          activeSwap={logic.activeSwap}
          jupiterError={logic.jupiterError}
          setAmount={logic.setAmount}
          setRaydiumV2Quote={logic.setRaydiumV2Quote}
          setFromTokenSymbol={logic.setFromTokenSymbol}
          setToTokenSymbol={logic.setToTokenSymbol}
          handleMaxClick={logic.handleMaxClick}
          handleSwitchTokens={logic.handleSwitchTokens}
          handleGetQuote={logic.handleGetQuote}
          handleRaydiumSwap={logic.handleRaydiumSwap}
          handleJupiterSwap={logic.handleJupiterSwap}
          getTokenLogo={logic.getTokenLogo}
          cachedQuote={logic.cachedQuote}
        /> 
        </div>

        {/* 设置面板组件 */}
        <SettingsPanel
          show={logic.showSettings}
          onClose={() => logic.setShowSettings(false)}
          activeSlippage={logic.activeSlippage}
          setActiveSlippage={logic.setActiveSlippage}
          customSlippage={logic.customSlippage}
          setCustomSlippage={logic.setCustomSlippage}
          priorityFeeInSol={logic.priorityFeeInSol}
          setPriorityFeeInSol={logic.setPriorityFeeInSol}
          solPrice={logic.solPrice}
          useLegacyTx={logic.useLegacyTx}
          setUseLegacyTx={logic.setUseLegacyTx}
        />

        {/* 全局通知组件 */}
        <Toaster position="top-center" reverseOrder={false} toastOptions={{
            className: 'bg-slate-700 text-white',
        }}/>
    </div>
  );
};

// 这是导出的主组件
export const HomePage = () => {
    const { publicKey } = useWallet();
    const { t } = useTranslation(['common']);
    // 如果钱包未连接，显示欢迎页和连接按钮
    if (!publicKey) {
      return (
        <div className="bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              {t('common:home.welcome', '欢迎使用DEX聚合器')}
            </h1>
            <p className="text-gray-400 mb-8">
              {t('common:home.connectWallet', '请先连接您的Solana钱包以开始使用')}
            </p>
            <WalletMultiButton />
          </div>
        </div>
      );
    }
  
    // 如果钱包已连接，显示主交易界面
    return <SwapView />;
  };