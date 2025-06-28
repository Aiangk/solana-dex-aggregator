import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpBackend) // 从服务器加载翻译文件
  .use(LanguageDetector) // 自动检测用户浏览器语言
  .use(initReactI18next) // 将 i18n 实例传递给 react-i18next
  .init({
    supportedLngs: ["zh", "en"], // 支持的语言列表
    fallbackLng: "en", // 如果检测不到语言，则默认使用英文
    ns: ["common"], // 命名空间
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React 已经可以防止 XSS
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json", // 翻译文件的路径
    },
  });

export default i18n;