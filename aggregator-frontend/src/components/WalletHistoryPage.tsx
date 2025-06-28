import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteStep } from '../hooks/useDEXAggregatorLogic'; // 复用你的类型定义
import { useTranslation } from "react-i18next";
import { SwapRecord } from '../hooks/useDEXAggregatorLogic';

interface WalletHistoryPageProps {
  solPrice: number | null;
  fromBalance: string | null;
  toBalance: string | null;
  swapHistory: SwapRecord[];
  onRetry: (rec: SwapRecord) => void;
}

export const WalletHistoryPage: React.FC<WalletHistoryPageProps> = ({
  solPrice,
  fromBalance,
  toBalance,
  swapHistory,
  onRetry,
}) => {
  const nav = useNavigate();
  const { t } = useTranslation(['common']);
  
  return (
    <div className="p-6 bg-gradient-to-b from-gray-900 to-purple-900 text-white min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
          {t('common:history.title', '资产概览 & 历史交易')}
        </h2>
        
        {/* 资产概览部分 */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden mb-8 border border-purple-500/20">
          <div className="p-6">
            <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
              {t('common:history.assetOverview', '资产概览')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">{t('common:history.solBalance', 'SOL 余额')}</span>
                  <span className="text-lg font-mono">{fromBalance || '0.00'}</span>
                </div>
                {solPrice && fromBalance && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('common:history.usdValue', 'USD 价值')}</span>
                    <span className="text-green-400 font-mono">
                      ${(parseFloat(fromBalance) * solPrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">{t('common:history.tokenBalance', '代币余额')}</span>
                  <span className="text-lg font-mono">{toBalance || '0.00'}</span>
                </div>
                {/* 可以添加其他代币的USD价值，如果有API支持的话 */}
              </div>
            </div>
          </div>
        </div>
        
        {/* 交易历史部分 */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-purple-500/20">
          <div className="p-6">
            <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
              {t('common:history.transactionHistory', '交易历史')}
            </h3>
            
            {swapHistory.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="text-gray-400 text-lg">
                  {t('common:history.noTransactions', '暂无交易记录')}
                </p>
                <p className="text-gray-500 mt-2">
                  {t('common:history.startTrading', '开始你的第一笔交易吧')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('common:history.time', '时间')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('common:history.dex', 'DEX')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('common:history.pair', '交易对')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('common:history.amount', '数量')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">{t('common:history.actions', '操作')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {swapHistory.map(rec => (
                      <tr key={rec.txid} className="hover:bg-gray-700/30">
                        <td className="px-4 py-4 text-sm">
                          {new Date(rec.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rec.dex === 'Jupiter' ? 'bg-green-900/30 text-green-300' : 'bg-blue-900/30 text-blue-300'
                          }`}>
                            {rec.dex}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-medium">
                          {rec.fromSymbol} → {rec.toSymbol}
                        </td>
                        <td className="px-4 py-4 font-mono">
                          {rec.amountIn} → {rec.amountOut}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                onRetry(rec);
                                nav('/');
                              }}
                              className="px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded-md text-sm font-medium transition-colors"
                            >
                              {t('common:history.retry', '重用')}
                            </button>
                            <a
                              href={`https://explorer.solana.com/tx/${rec.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-600/50 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
                            >
                              {t('common:history.explorer', '查看')}
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};