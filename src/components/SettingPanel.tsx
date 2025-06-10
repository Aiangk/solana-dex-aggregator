import React from 'react';

// 定义 SettingsPanel 组件需要的 props 类型
interface SettingsPanelProps {
  show: boolean;
  onClose: () => void;
  activeSlippage: number;
  setActiveSlippage: (value: number) => void;
  customSlippage: string | number;
  setCustomSlippage: (value: string | number) => void;
  priorityFeeInSol: string;
  setPriorityFeeInSol: (value: string) => void;
  solPrice: number | null;
  useLegacyTx: boolean;
  setUseLegacyTx: (value: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  show,
  onClose,
  activeSlippage,
  setActiveSlippage,
  customSlippage,
  setCustomSlippage,
  priorityFeeInSol,
  setPriorityFeeInSol,
  solPrice,
  useLegacyTx,
  setUseLegacyTx,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 bg-black/50 flex justify-center items-center z-20"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">交易设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700 text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
                  setCustomSlippage('');
                }}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  activeSlippage === 0.5 && customSlippage === ''
                    ? 'bg-purple-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                0.5%
              </button>
              <button
                onClick={() => {
                  setActiveSlippage(1);
                  setCustomSlippage('');
                }}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  activeSlippage === 1 && customSlippage === ''
                    ? 'bg-purple-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                1%
              </button>
              <div className="relative flex-grow">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
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
            {solPrice && priorityFeeInSol && (
              <p className="text-xs text-slate-500 mt-1">
                ≈ {(parseFloat(priorityFeeInSol) * solPrice).toFixed(4)} USD
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
                  useLegacyTx ? 'bg-green-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    useLegacyTx
                      ? 'transform translate-x-6'
                      : 'transform translate-x-1'
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
