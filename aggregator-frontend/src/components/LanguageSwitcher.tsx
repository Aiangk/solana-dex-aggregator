import React from 'react';
import { useTranslation } from 'react-i18next';

const supportedLngs: Record<string, string> = {
  en: 'English',
  zh: '中文',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.resolvedLanguage}
      onChange={e => i18n.changeLanguage(e.target.value)}
      style={{ marginLeft: 16 }}
    >
      {Object.entries(supportedLngs).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}