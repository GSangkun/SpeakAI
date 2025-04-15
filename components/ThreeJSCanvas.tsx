'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';

// 动态导入Three.js组件以避免SSR问题
const ThreeJSComponents = dynamic(
  () => import('./ThreeJSComponents'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">正在加载3D资源...</div>
      </div>
    ),
  }
);

// Canvas组件属性定义
interface ThreeJSCanvasProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ThreeJSCanvas({ isOpen = false, onClose }: ThreeJSCanvasProps) {
  const { t } = useTranslation();
  const [showButton, setShowButton] = useState(false);
  const [show3D, setShow3D] = useState(false);

  // 控制按钮显示延迟
  useEffect(() => {
    if (isOpen) {
      // 延迟显示按钮，给用户时间了解界面
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setShowButton(false);
      setShow3D(false);
    }
  }, [isOpen]);

  // 切换3D视图显示
  const toggle3DView = () => {
    setShow3D(!show3D);
  };

  // 返回2D视图
  const handleReturn = () => {
    setShow3D(false);
    if (onClose) {
      onClose();
    }
  };

  // 如果组件未打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
      {/* 显示3D模型或等待用户点击按钮 */}
      {show3D ? (
        <div className="w-full h-full">
          <ThreeJSComponents onReturn={handleReturn} />
        </div>
      ) : (
        <div className="text-center">
          <div className="text-white text-xl mb-8">
            {t('点击下方按钮加载3D模型')}
          </div>
          
          {showButton && (
            <button
              onClick={toggle3DView}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
              aria-label="显示3D模型"
            >
              {t('进入3D视图')}
            </button>
          )}
          
          <button
            onClick={handleReturn}
            className="absolute top-4 right-4 px-4 py-2 bg-gray-700 text-white rounded-md shadow-lg hover:bg-gray-600 transition-colors"
            aria-label="关闭"
          >
            {t('关闭')}
          </button>
        </div>
      )}
    </div>
  );
} 