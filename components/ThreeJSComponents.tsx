'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// 组件属性定义
interface ThreeJSComponentsProps {
  onReturn?: () => void;
}

// 主组件
export default function ThreeJSComponents({ onReturn }: ThreeJSComponentsProps) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  // 确保只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* 返回按钮 */}
      <button
        onClick={onReturn}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
        aria-label={t('返回')}
      >
        ← {t('返回')}
      </button>

      {/* 使用iframe嵌入外部3D模型 */}
      {isMounted && (
        <div className="w-full h-full">
          <iframe 
            src="https://cloud.needle.tools/view/embed?file=ZKpvOc1Ka4sV-1Ka4sV-product" 
            title="Mya | Hosted on Needle Cloud" 
            className="w-full h-full" 
            frameBorder="0" 
            allow="xr-spatial-tracking; accelerometer; gyroscope; display-capture; geolocation; camera; microphone" 
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
} 