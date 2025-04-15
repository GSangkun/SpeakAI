'use client';

import React, { useState, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';

// 使用动态导入确保ModelLoader只在客户端加载
const ModelLoader = lazy(() => import('./ModelLoader'));

interface ThreeCanvasProps {
  modelType?: 'vrm' | 'glb' | 'fbx';
  backgroundColor?: string;
  enableOrbitControls?: boolean;
  enableStars?: boolean;
  cameraPosition?: [number, number, number];
  setLoading?: (loading: boolean) => void;
}

export default function ThreeCanvas({
  modelType = 'vrm',
  backgroundColor = '#000000',
  enableOrbitControls = true,
  enableStars = true,
  cameraPosition = [0, 1.5, 4],
  setLoading
}: ThreeCanvasProps) {
  const { t } = useTranslation();
  const [loading, setLocalLoading] = useState(true);
  
  // 使用外部传入的setLoading如果存在，否则使用本地状态
  const handleSetLoading = (state: boolean) => {
    setLocalLoading(state);
    if (setLoading) {
      setLoading(state);
    }
  };

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <Canvas
        style={{ background: backgroundColor }}
        shadows
        camera={{ position: cameraPosition, fov: 45 }}
      >
        {/* 环境设置 */}
        <fog attach="fog" args={['#202030', 5, 20]} />
        <color attach="background" args={['#0a0a15']} />
        
        <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
        />
        
        {/* 相机控制 */}
        {enableOrbitControls && (
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minPolarAngle={Math.PI / 6} 
            maxPolarAngle={Math.PI - Math.PI / 6} 
          />
        )}
        
        {/* 星空背景 */}
        {enableStars && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />}
        
        {/* 环境贴图 */}
        <Environment preset="city" />
        
        {/* 模型加载 */}
        <Suspense fallback={null}>
          <ModelLoader type={modelType} setLoading={handleSetLoading} />
        </Suspense>
      </Canvas>
    </div>
  );
} 