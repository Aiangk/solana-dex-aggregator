
---

# 🌉 Solana DEX 聚合器（solana-dex-aggregator）

一个构建于 **Solana Devnet** 的去中心化交易所（DEX）聚合器，提供近商业级的交易体验。项目集成了智能路由、专业交易设置与现代化 UI，致力于实现**功能完备、界面优雅、用户体验出色**的 DApp。

---

## 🚀 在线演示（Live Demo）

🔗 [点击访问在线应用](https://your-deployment-link.vercel.app)

> 请将 `your-deployment-link.vercel.app` 替换为实际部署链接

---

## ✨ 核心功能（Key Features）

### ⚡ 智能聚合路由

* 集成 [Jupiter Aggregator](https://jup.ag/)，自动寻找最优路径与报价
* 确保用户获得最佳兑换率

### 🔗 钱包集成

* 支持 Phantom、Solflare 等主流钱包
* 实现流畅的连接、签名与交易流程

### ⚙️ 专业交易设置

* **自定义滑点容忍度**：预设选项（0.5%、1%）+ 自定义输入，超高滑点实时预警
* **交易优先费用**：自定义小费（单位：SOL），支持美元换算
* **交易版本控制**：支持新版与旧版交易接口切换

### 📈 实时数据反馈

* **钱包余额展示**：链上查询用户代币余额并实时更新
* **价格影响预估**：概念性实现大额交易对价格影响的提示

### 💎 极致用户体验（UX）

* 非阻塞式通知：基于 `react-hot-toast` 的交易进度提示
* 响应式现代 UI：基于 Tailwind CSS，适配移动端与桌面端
* 输入校验与提示：金额校验 + 超额输入警告
* 一键最大金额：支持 “Max” 按钮快速填充可用余额

---

## 🛠️ 技术栈（Tech Stack）

### 📦 前端与语言

* **React.js + Vite**（构建工具）
* **TypeScript**（类型安全）

### 🔌 协议与 SDK

* `@jup-ag/react-hook`：Jupiter 聚合器接入
* `@solana/web3.js`：与 Solana 区块链交互
* `@solana/wallet-adapter`：钱包集成适配器

### 🎨 UI 与交互

* **Tailwind CSS**：现代响应式设计
* **Lucide React**：图标库
* **react-hot-toast**：通知系统
* **bignumber.js**：高精度计算库

### 🧠 状态管理

* React Hooks：`useState`, `useMemo`, `useCallback`, `useEffect`
* 自定义 Hooks：封装业务逻辑

### 🚀 部署平台

* **Vercel**

---

## 🧠 核心概念学习与应用（Core Concepts）

此项目不仅是 DEX 聚合器，更是深入理解 Web3 技术的平台：

* **Solana 程序交互**：RPC 节点调用、发送交易与处理响应
* **异步编程与副作用管理**：结合 async/await 与 React Hooks
* **Solana 账户模型**：理解主账户与 ATA（关联代币账户）的差异
* **交易生命周期管理**：从构建、签名、发送到确认的完整流程
* **组件化架构设计**：逻辑与 UI 解耦，如 `useAppLogic.ts`, `SwapForm.tsx`, `SettingsPanel.tsx`
* **Vite 环境兼容性处理**：如 Buffer polyfill 等工程化技巧

---

## ⚙️ 本地开发与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/solana-dex-aggregator.git
cd solana-dex-aggregator

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问：`http://localhost:5173`

---

## 📸 项目截图（Screenshots）

### 钱包连接
<img src="./src/assets/screenshot/wallets.png" alt="钱包连接" style="max-width: 300px; height: auto;" />


### 交易主界面
<img src="./src/assets/screenshot/swap.png" alt="交易主界面" style="max-width: 300px; height: auto;" />

### 设置面板
<img src="./src/assets/screenshot/settings.png" alt="设置面板" style="max-width: 300px; height: auto;" />


---

## 🚀 未来计划（Future Improvements）

* ✅ **交易历史记录**：本地记录 + 提供 Solscan 快捷跳转
* 📊 **价格图表支持**：引入 K 线图组件展示代币走势
* 🌍 **多语言切换**：集成 i18next 实现中英文界面切换

---

## 🔼 [返回顶部](#solana-dex-聚合器solana-dex-aggregator)

---

