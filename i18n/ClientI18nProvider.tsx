'use client';

import dynamic from 'next/dynamic';

// 使用动态导入，不需要设置ssr:false，因为这已经是客户端组件
const I18nProvider = dynamic(() => import('./I18nProvider'), {
  // 在Next.js 15中，我们不再需要在客户端组件中使用ssr:false
  // loading组件用于在I18nProvider加载期间显示
  loading: () => <div className="w-full h-full flex items-center justify-center">Loading...</div>
});

export default function ClientI18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
} 