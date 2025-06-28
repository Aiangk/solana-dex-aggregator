import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// 创建一个简单的箭头图标组件替代heroicons
const ArrowRightIcon: React.FC<{className?: string}> = ({className}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
      clipRule="evenodd" 
    />
  </svg>
);

interface TriggerOrder {
  orderId: string;
  inputMint: string;
  outputMint: string;
  triggerPrice?: string;
}

interface DcaStrategy {
  id: string;
  inputMint: string;
  outputMint: string;
  amount: string;
  frequency: string;
}

interface StrategiesPageProps {
  createLimitOrder: (params: any) => Promise<void>;
  fetchLimitOrders: () => Promise<TriggerOrder[]>;
  cancelLimitOrder: (id: string) => Promise<void>;
  dcaStrategies: DcaStrategy[];
  createDcaStrategy: (params: any) => void;
  removeDcaStrategy: (id: string) => void;
}

export const StrategiesPage: React.FC<StrategiesPageProps> = ({
  createLimitOrder,
  fetchLimitOrders,
  cancelLimitOrder,
  dcaStrategies,
  createDcaStrategy,
  removeDcaStrategy,
}) => {
  const { t, i18n } = useTranslation(['common']);
  const [tab, setTab] = useState<'limit' | 'dca'>('limit');
  const [limitOrders, setLimitOrders] = useState<TriggerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // 切换语言函数
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(nextLang);
  };

  // 刷新订单当切换到限价单标签页或组件挂载时
  useEffect(() => {
    if (tab === 'limit') {
      setLoadingOrders(true);
      fetchLimitOrders()
        .then(setLimitOrders)
        .catch(err => console.error("获取限价单失败:", err))
        .finally(() => setLoadingOrders(false));
    }
  }, [tab, fetchLimitOrders]);

  // 定期刷新限价单数据
  useEffect(() => {
    if (tab === 'limit') {
      const intervalId = setInterval(() => {
        fetchLimitOrders()
          .then(setLimitOrders)
          .catch(err => console.error("自动刷新限价单失败:", err));
      }, 30000); // 每30秒刷新一次
      
      return () => clearInterval(intervalId);
    }
  }, [tab, fetchLimitOrders]);

  return (
    <div className="p-6 bg-gradient-to-b from-gray-900 to-purple-900 text-white min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            {t('common:strategies.title', '交易策略')}
          </h2>
        </div>
        
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden mb-8 border border-purple-500/20">
          <div className="flex border-b border-gray-700">
            <button
              className={`px-6 py-4 text-lg font-medium flex-1 transition-all duration-300 ${
                tab === 'limit' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setTab('limit')}
            >
              {t('common:strategies.limitOrders', '限价单')}
            </button>
            <button
              className={`px-6 py-4 text-lg font-medium flex-1 transition-all duration-300 ${
                tab === 'dca' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setTab('dca')}
            >
              {t('common:strategies.dca', 'DCA策略')}
            </button>
          </div>

          <div className="p-6">
            {tab === 'limit' ? (
              <TriggerSection
                orders={limitOrders}
                loading={loadingOrders}
                onCreate={createLimitOrder}
                onCancel={cancelLimitOrder}
              />
            ) : (
              <DcaSection
                strategies={dcaStrategies}
                onCreate={createDcaStrategy}
                onRemove={removeDcaStrategy}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TriggerSection: React.FC<{
  orders: TriggerOrder[];
  loading: boolean;
  onCreate: (p: any) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}> = ({ orders, loading, onCreate, onCancel }) => {
  const { t } = useTranslation(['common']);
  // 添加mint到symbol的映射
  const mintToSymbol: Record<string, string> = {
    "So11111111111111111111111111111111111111112": "SOL",
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr": "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
    // 可根据需要继续补充
  };

  const [form, setForm] = useState({
    inputMint: '',
    outputMint: '',
    makingAmount: '',
    takingAmount: '',
    triggerPrice: '',
    expiredAt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSubmitting(true);
      
      // 验证表单
      if (!form.inputMint || !form.outputMint || !form.makingAmount || !form.takingAmount) {
        throw new Error('请填写所有必填字段');
      }
      
      await onCreate(form);
      
      // 显示成功消息
      setSuccessMessage('限价单创建成功！');
      
      // 清空表单
      setForm({
        inputMint: '',
        outputMint: '',
        makingAmount: '',
        takingAmount: '',
        triggerPrice: '',
        expiredAt: '',
      });
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || '创建限价单失败');
      console.error('创建限价单错误:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = async (id: string) => {
    try {
      setCancelingOrderId(id);
      await onCancel(id);
      // 取消成功后可能需要刷新列表，但这里我们依赖于父组件的重新获取
    } catch (err: any) {
      setError(`取消订单失败: ${err.message || '未知错误'}`);
      console.error('取消限价单错误:', err);
    } finally {
      setCancelingOrderId(null);
    }
  };

  const fields = [
    { name: 'inputMint', label: t('common:strategies.form.inputMint', '输入代币') },
    { name: 'outputMint', label: t('common:strategies.form.outputMint', '输出代币') },
    { name: 'makingAmount', label: t('common:strategies.form.makingAmount', '输入金额') },
    { name: 'takingAmount', label: t('common:strategies.form.takingAmount', '输出金额') },
    { name: 'triggerPrice', label: t('common:strategies.form.triggerPrice', '触发价格') },
    { name: 'expiredAt', label: t('common:strategies.form.expiredAt', '过期时间') }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
          {t('common:strategies.placeLimit', '创建限价单')}
        </h3>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {fields.map(field => (
              <div key={field.name} className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{field.label}</label>
                <input
                  name={field.name}
                  placeholder={field.label}
                  value={(form as any)[field.name]}
                  onChange={handleInput}
                  className="w-full bg-gray-700/70 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all duration-200"
                />
              </div>
            ))}
          </div>
          
          <button
            className={`w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-purple-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common:strategies.loading', '加载中...')}
              </div>
            ) : t('common:strategies.create', '创建')}
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
          {t('common:strategies.existingLimitOrders', '当前限价单')}
        </h4>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
              <span className="mt-4 text-purple-400">{t('common:strategies.loading', '加载中...')}</span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="text-gray-400 text-lg">
              {t('common:strategies.noOrders', '暂无限价单')}
            </p>
            <p className="text-gray-500 mt-2">
              {t('common:strategies.createFirst', '创建你的第一个限价单吧')}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map(o => (
              <li key={o.orderId} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-purple-500/30 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 hover:shadow-lg">
                <div>
                  <div className="flex items-center text-sm text-gray-400 mb-2">
                    <span className="font-mono bg-gray-700/50 px-2 py-1 rounded-md">
                      ID: {o.orderId.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-purple-900/20 text-white px-3 py-1 rounded-md font-medium">
                      {/* 优先显示symbol，否则显示mint前缀 */}
                      {mintToSymbol[o.inputMint] || o.inputMint.substring(0, 6)}
                    </div>
                    <ArrowRightIcon className="h-5 w-5 mx-3 text-purple-400" />
                    <div className="bg-pink-900/20 text-white px-3 py-1 rounded-md font-medium">
                      {mintToSymbol[o.outputMint] || o.outputMint.substring(0, 6)}...
                    </div>
                    {o.triggerPrice && (
                      <span className="ml-3 bg-purple-900/30 text-purple-300 px-3 py-1 rounded-md text-sm font-medium">
                        @ {o.triggerPrice}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className={`px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-md transition-all duration-300 shadow-md ${cancelingOrderId === o.orderId ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={() => handleCancel(o.orderId)}
                  disabled={cancelingOrderId === o.orderId}
                >
                  {cancelingOrderId === o.orderId ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common:strategies.canceling', '取消中...')}
                    </div>
                  ) : t('common:strategies.cancel', '取消')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const DcaSection: React.FC<{
  strategies: DcaStrategy[];
  onCreate: (p: any) => void;
  onRemove: (id: string) => void;
}> = ({ strategies, onCreate, onRemove }) => {
  const { t } = useTranslation(['common']);
  const [form, setForm] = useState({
    inputMint: '',
    outputMint: '',
    amount: '',
    frequency: 'daily',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSubmitting(true);
      
      // 验证表单
      if (!form.inputMint || !form.outputMint || !form.amount) {
        throw new Error('请填写所有必填字段');
      }
      
      await onCreate(form);
      
      // 显示成功消息
      setSuccessMessage('DCA策略创建成功！');
      
      // 清空表单
      setForm({
        inputMint: '',
        outputMint: '',
        amount: '',
        frequency: 'daily',
      });
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || '创建DCA策略失败');
      console.error('创建DCA策略错误:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      await onRemove(id);
    } catch (err: any) {
      setError(`删除策略失败: ${err.message || '未知错误'}`);
      console.error('删除DCA策略错误:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
          {t('common:strategies.setDca', '设置DCA策略')}
        </h3>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 animate-pulse">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
      </div>
      
        <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/10 rounded-xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('common:strategies.form.inputMint', 'Input Token')}
              </label>
              <input
                name="inputMint"
                placeholder={t('common:strategies.form.inputMint', 'Input Token')}
                value={form.inputMint}
                onChange={handleInput}
                className="w-full bg-gray-700/70 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('common:strategies.form.outputMint', 'Output Token')}
              </label>
              <input
                name="outputMint"
                placeholder={t('common:strategies.form.outputMint', 'Output Token')}
                value={form.outputMint}
                onChange={handleInput}
                className="w-full bg-gray-700/70 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('common:strategies.form.amount', 'Amount')}
              </label>
              <input
                name="amount"
                placeholder={t('common:strategies.form.amount', 'Amount')}
                value={form.amount}
                onChange={handleInput}
                className="w-full bg-gray-700/70 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('common:strategies.form.frequency', '频率')}
              </label>
              <select
                name="frequency"
                value={form.frequency}
                onChange={handleInput}
                className="w-full bg-gray-700/70 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all duration-200"
              >
                <option value="daily">{t('common:strategies.frequency.daily', 'Daily')}</option>
                <option value="weekly">{t('common:strategies.frequency.weekly', 'Weekly')}</option>
                <option value="monthly">{t('common:strategies.frequency.monthly', 'Monthly')}</option>
              </select>
                </div>
            </div>
            
            <button
                className={`w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-purple-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
            >
                {t('common:strategies.form.submit', 'Submit')}
                {isSubmitting && (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('common:strategies.form.inputMint', 'Input Token')}</label>
            <input
              name="inputMint"
              placeholder={t('common:strategies.form.inputMint', 'Input Token')}
              value={form.inputMint}
              onChange={handleInput}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('common:strategies.form.outputMint', 'Output Token')}</label>
            <input
              name="outputMint"
              placeholder={t('common:strategies.form.outputMint', 'Output Token')}
              value={form.outputMint}
              onChange={handleInput}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('common:strategies.form.amount', 'Amount')}</label>
            <input
              name="amount"
              placeholder={t('common:strategies.form.amount', 'Amount')}
              value={form.amount}
              onChange={handleInput}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('common:strategies.form.frequency', 'Frequency')}</label>
            <select
              name="frequency"
              value={form.frequency}
              onChange={handleInput}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              <option value="daily">{t('common:strategies.frequency.daily', 'Daily')}</option>
              <option value="weekly">{t('common:strategies.frequency.weekly', 'Weekly')}</option>
              <option value="monthly">{t('common:strategies.frequency.monthly', 'Monthly')}</option>
            </select>
          </div>
        </div>
        
        <button
          className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
          onClick={() => onCreate(form)}
        >
          {t('common:strategies.create', 'Create Strategy')}
        </button>
      </div>

      <h4 className="text-xl font-semibold text-purple-400 mb-4">{t('common:strategies.existingDca', 'Current DCA Strategies')}</h4>
      
      {strategies.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-md p-6 text-center text-gray-400">
          {t('common:strategies.noStrategies', 'No DCA Strategies')}
        </div>
      ) : (
        <ul className="space-y-3">
          {strategies.map(s => (
            <li key={s.id} className="bg-gray-800 border border-gray-700 rounded-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center text-sm text-gray-400 mb-1">
                  <span className="font-mono">Strategy ID: {s.id.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center flex-wrap">
                  <div className="flex items-center mr-4">
                    <span className="font-medium">{s.inputMint.substring(0, 6)}...</span>
                    <ArrowRightIcon className="h-4 w-4 mx-2 text-purple-400" />
                    <span className="font-medium">{s.outputMint.substring(0, 6)}...</span>
                  </div>
                  <span className="bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded text-sm mr-2">
                    {s.amount}
                  </span>
                  <span className="bg-green-900/30 text-green-300 px-2 py-0.5 rounded text-sm">
                    {t(`common:strategies.frequency.${s.frequency}`, s.frequency)}
                  </span>
                </div>
              </div>
              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                onClick={() => onRemove(s.id)}
              >
                {t('common:strategies.cancel', 'Cancel')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
