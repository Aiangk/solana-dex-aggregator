// 修改AppRouter.tsx，导入新的链上功能组件
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import { HomePage } from "./HomePage";
import { WalletHistoryPage } from "./WalletHistoryPage";
import { useDEXAggregatorLogic } from "../hooks/useDEXAggregatorLogic";
import { StrategiesPage } from "./StrategiesPage";
import { useTranslation } from "react-i18next";
import { ChainLayout, ChainList, ChainDetail } from "./ChainComponents";

// 404 页面组件
const NotFound = () => {
  const { t } = useTranslation(['common']);
  
  return (
    <div className="p-6 bg-gradient-to-b from-gray-900 to-purple-900 text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-6xl font-bold text-purple-400 mb-4">404</h2>
        <p className="text-xl">{t('common:notFound', '页面未找到')}</p>
        <Link to="/" className="mt-6 inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors">
          {t('common:backHome', '返回首页')}
        </Link>
      </div>
    </div>
  );
};

export function AppRouter() {
  const {
    solPrice,
    fromBalance,
    toBalance,
    swapHistory,
    handleRetry,
    createLimitOrder,
    fetchLimitOrders,
    cancelLimitOrder,
    dcaStrategies,
    createDcaStrategy,
    removeDcaStrategy,
    currentLanguage,
    changeLanguage,
  } = useDEXAggregatorLogic();
  
  const { t } = useTranslation(['common']);
  
  return (
    <BrowserRouter>
      <div className="min-h-screen font-sans">
        <nav className="p-4 bg-black/20 text-white flex justify-between items-center">
          <div className="flex space-x-4">
            <Link to="/" className="hover:text-purple-400">
              {t('common:nav.dexAggregator', 'DEX 聚合器')}
            </Link>
            <Link to="/chain" className="hover:text-purple-400">
              {t('common:nav.chainFunctions', '链上功能')}
            </Link>
            <Link to="/history" className="hover:text-purple-400">
              {t('common:nav.history', '历史记录')}
            </Link>
            <Link to="/strategies" className="hover:text-purple-400">
              {t('common:nav.strategies', '限价单和DCA策略')}
            </Link>
          </div>
          
          <button
            onClick={() => changeLanguage(currentLanguage === 'en' ? 'zh' : 'en')}
            className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-md transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-purple-500/20"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.8 2H12a1 1 0 110 2H8.2l-.8 2H10a1 1 0 110 2H7l-.43 1.073A1 1 0 015.6 16H5a1 1 0 01-1-1v-1H3a1 1 0 110-2h1v-1H3a1 1 0 110-2h1V7H3a1 1 0 010-2h1V4a1 1 0 011-1h2z" clipRule="evenodd" />
            </svg>
            <span>{currentLanguage === 'en' ? '切换到中文' : 'Switch to English'}</span>
          </button>
        </nav>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/history"
            element={
              <WalletHistoryPage
                solPrice={solPrice}
                fromBalance={fromBalance}
                toBalance={toBalance}
                swapHistory={swapHistory}
                onRetry={handleRetry}
              />
            }
          />
          <Route
            path="/strategies"
            element={
              <StrategiesPage
                createLimitOrder={createLimitOrder}
                fetchLimitOrders={fetchLimitOrders}
                cancelLimitOrder={cancelLimitOrder}
                dcaStrategies={dcaStrategies}
                createDcaStrategy={createDcaStrategy}
                removeDcaStrategy={removeDcaStrategy}
              />
            }
          />

          <Route path="/chain" element={<ChainLayout />}>
            <Route index element={<ChainList />} />
            <Route path=":chainId" element={<ChainDetail />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}