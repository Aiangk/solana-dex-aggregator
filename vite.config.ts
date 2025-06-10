import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(), 
    svgr(),
    // 在这里调用新的 polyfill 插件
    nodePolyfills()
  ],
  // 保留这个定义，对某些库是必要的
  define: {
    'process.env': {}
  }
  // 移除整个 optimizeDeps 部分，因为它已被新插件取代
});