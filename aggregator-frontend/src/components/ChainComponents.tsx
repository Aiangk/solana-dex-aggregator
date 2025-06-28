import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

// 链上数据列表组件
export function ChainList() {
  const { t } = useTranslation(['common']);
  const [items, setItems] = useState<{ chainId: string; title: string; descKey: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    setIsLoading(true);
    setTimeout(() => {
      const mockItems = [
        { 
          chainId: "sol-usdt-route", 
          title: "SOL-USDT", 
          descKey: "solUsdtDesc" 
        },
        { 
          chainId: "sol-usdc-route", 
          title: "SOL-USDC", 
          descKey: "solUsdcDesc"
        },
        { 
          chainId: "usdc-usdt-route", 
          title: "USDC-USDT", 
          descKey: "usdcUsdtDesc"
        }
      ];
      setItems(mockItems);
      setIsLoading(false);
    }, 800);
  }, [t]);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
        {t('common:chain.dataList', '链上数据列表')}
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <span className="mt-4 text-purple-400">{t('common:chain.loading', 'Loading...')}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Link 
              key={item.chainId}
              to={item.chainId}
              className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg hover:border-purple-500/30 transition-all duration-300 hover:shadow-purple-500/10"
            >
              <div className="flex items-center mb-3">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-white">{item.title}</h4>
              </div>
              <p className="text-gray-400 mb-4">{t(`common:chain.${item.descKey}`)}</p>
              <div className="flex justify-end">
                <span className="flex items-center text-purple-400 hover:text-purple-300 transition-colors">
                  {t('common:chain.viewDetails', '查看详情')}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      <div className="bg-gray-800/30 border border-purple-500/10 rounded-xl p-6 mt-8">
        <h4 className="text-lg font-semibold text-purple-400 mb-3"> 
          {t('common:chain.aboutChainData', '关于链上数据')}
        </h4>
        <p className="text-gray-400">
          {t('common:chain.dataExplanation', '链上数据模块展示了从我们的链上程序中读取的路由缓存信息。这些数据帮助您理解交易执行路径和不同DEX之间的价格差异。')}
        </p>
      </div>
    </div>
  );
}

// 链上数据详情组件
export function ChainDetail() {
  const { chainId } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation(['common']);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chainId) return;
    
    setIsLoading(true);
    // 模拟数据加载
    setTimeout(() => {
      if (chainId === "sol-usdt-route") {
        setData({
          title: t('common:chain.solUsdtRoute', 'SOL-USDT 路由详情'),
          details: {
            inputToken: "SOL",
            outputToken: "USDT",
            routeSteps: [
              { 
                poolId: "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2", 
                poolName: "Orca SOL/USDT", 
                inputAmount: "1.0 SOL", 
                outputAmount: "22.37 USDT" 
              },
              {
                poolId: "7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX",
                poolName: "Raydium SOL/USDT",
                inputAmount: "1.0 SOL",
                outputAmount: "22.31 USDT"
              }
            ],
            bestRoute: "Orca SOL/USDT",
            lastUpdated: new Date().toLocaleString()
          }
        });
      } else if (chainId === "sol-usdc-route") {
        setData({
          title: t('common:chain.solUsdcRoute', 'SOL-USDC 路由详情'),
          details: {    
            inputToken: "SOL",
            outputToken: "USDC",
            routeSteps: [
              { 
                poolId: "EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U", 
                poolName: "Orca SOL/USDC", 
                inputAmount: "1.0 SOL", 
                outputAmount: "22.42 USDC" 
              },
              {
                poolId: "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2",
                poolName: "Raydium SOL/USDC",
                inputAmount: "1.0 SOL",
                outputAmount: "22.39 USDC"
              }
            ],
            bestRoute: "Orca SOL/USDC",
            lastUpdated: new Date().toLocaleString()
          }
        });
      } else if (chainId === "usdc-usdt-route") {
        setData({
          title: t('common:chain.usdcUsdtRoute', 'USDC-USDT 路由详情'),
          details: {
            inputToken: "USDC",
            outputToken: "USDT",
            routeSteps: [
              { 
                poolId: "83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d", 
                poolName: "Mercurial USDC/USDT", 
                inputAmount: "100.0 USDC", 
                outputAmount: "99.97 USDT" 
              },
              {
                poolId: "5r878BSWPtoXgnqaeFJi7BCycKZ5CodBB2vS9SeiV8q",
                poolName: "Saber USDC/USDT",
                inputAmount: "100.0 USDC",
                outputAmount: "99.95 USDT"
              }
            ],
            bestRoute: "Mercurial USDC/USDT",
            lastUpdated: new Date().toLocaleString()
          }
        });
      } else {
        setData(null);
        nav("/chain", { replace: true });
      }
      setIsLoading(false);
    }, 1000);
  }, [chainId, nav, t]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <span className="mt-4 text-purple-400">{t('common:chain.loading', '加载中...')}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <p className="text-gray-400 text-lg">{t('common:chain.dataNotFound', '数据未找到')}</p>
        <button 
          onClick={() => nav("/chain")}
          className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
        >
          {t('common:chain.backToList', '返回列表')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          {data.title}
        </h3>
        <button 
          onClick={() => nav("/chain")}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center text-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          {t('common:chain.backToList', '返回列表')}
        </button>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-gray-400 mb-1">{t('common:chain.inputToken', '输入代币')}</div>
            <div className="text-xl font-semibold">{data.details.inputToken}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">{t('common:chain.outputToken', '输出代币')}</div>
            <div className="text-xl font-semibold">{data.details.outputToken}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">{t('common:chain.bestRoute', '最佳路由')}</div>
            <div className="text-xl font-semibold text-green-400">{data.details.bestRoute}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">{t('common:chain.lastUpdated', '最后更新')}</div>
            <div className="text-sm">{data.details.lastUpdated}</div>
          </div>
        </div>
        
        <h4 className="text-lg font-semibold text-purple-400 mb-3">
          {t('common:chain.availableRoutes', '可用路由')}
        </h4>
        
        <div className="space-y-4 mb-6">
          {data.details.routeSteps.map((step: any, index: number) => (
            <div key={index} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs mr-2">
                    {t('common:chain.pool', '池')} #{index + 1}
                  </div>
                  <h5 className="font-medium">{step.poolName}</h5>
                </div>
                <div className="text-xs text-gray-400 font-mono">{step.poolId.substring(0, 8)}...</div>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <div>
                  <span className="text-gray-400 mr-2">{t('common:chain.input', '输入')}:</span>
                  <span className="font-mono">{step.inputAmount}</span>
                </div>
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
                <div>
                  <span className="text-gray-400 mr-2">{t('common:chain.output', '输出')}:</span>
                  <span className="font-mono">{step.outputAmount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
          <h5 className="font-medium text-purple-300 mb-2">{t('common:chain.howItWorks', '如何工作')}</h5>
          <p className="text-sm text-gray-300">
            {t('common:chain.routeExplanation', '我们的链程序定期扫描和缓存不同代币对之间的最佳路径，减少交易执行的延迟，并确保您获得最佳价格。上述数据直接从我们的链程序读取。')}
          </p>
        </div>
      </div>
    </div>
  );
}

// 链上功能布局组件
export function ChainLayout() {
  const { t } = useTranslation(['common']);
  
  return (
    <div className="p-6 bg-gradient-to-b from-gray-900 to-purple-900 text-white min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
          {t('common:chain.title', '链上功能')}
        </h2>
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-purple-500/20 p-6">
          {/* 此处会渲染 ChainList 或 ChainDetail */}
          <React.Suspense fallback={<div>Loading...</div>}>
            {/* Outlet 组件会渲染子路由 */}
            <Outlet />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}