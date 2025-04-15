'use client';

import React, { useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { useAnimations } from '@react-three/drei';

interface ModelLoaderProps {
  type: 'vrm' | 'glb' | 'fbx';
  setLoading: (loading: boolean) => void;
}

export default function ModelLoader({ type, setLoading }: ModelLoaderProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return () => setLoading(false);
  }, [setLoading]);

  if (error) {
    console.error('Model loading error:', error);
    setLoading(false);
    return null;
  }

  if (type === 'vrm') {
    return <VRMModel setLoading={setLoading} setError={setError} />;
  } else if (type === 'glb') {
    return <GLBModel setLoading={setLoading} setError={setError} />;
  } else if (type === 'fbx') {
    return <FBXModel setLoading={setLoading} setError={setError} />;
  }
  
  return null;
}

function VRMModel({ setLoading, setError }: { setLoading: (loading: boolean) => void, setError: (error: string | null) => void }) {
  const modelPath = '/models/mya.vrm';
  
  const gltf = useLoader(
    GLTFLoader, 
    modelPath, 
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    },
    (error) => {
      console.error('VRM loading error:', error);
      setError(error.message);
    }
  );
  
  useEffect(() => {
    if (gltf) {
      try {
        // VRM specific setup
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        setLoading(false);
      } catch (err) {
        console.error('VRM setup error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error during VRM setup');
      }
    }
  }, [gltf, setLoading, setError]);
  
  return gltf ? <primitive object={gltf.scene} position={[0, 0, 0]} /> : null;
}

function GLBModel({ setLoading, setError }: { setLoading: (loading: boolean) => void, setError: (error: string | null) => void }) {
  const modelPath = '/models/Qin.glb';
  
  const gltf = useLoader(
    GLTFLoader, 
    modelPath,
    undefined,
    (error) => {
      console.error('GLB loading error:', error);
      setError(error.message);
    }
  );
  
  const { actions, names } = useAnimations(gltf.animations, gltf.scene);
  
  useEffect(() => {
    if (gltf) {
      try {
        // Play the first animation if available
        if (names.length > 0 && actions[names[0]]) {
          actions[names[0]].play();
        }
        setLoading(false);
      } catch (err) {
        console.error('GLB animation error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error during GLB animation');
      }
    }
  }, [gltf, actions, names, setLoading, setError]);
  
  return gltf ? <primitive object={gltf.scene} position={[0, 0, 0]} scale={1.5} /> : null;
}

function FBXModel({ setLoading, setError }: { setLoading: (loading: boolean) => void, setError: (error: string | null) => void }) {
  const modelPath = '/models/Qin.fbx';
  
  const fbx = useLoader(
    FBXLoader, 
    modelPath,
    undefined,
    (error) => {
      console.error('FBX loading error:', error);
      setError(error.message);
    }
  );
  
  useEffect(() => {
    if (fbx) {
      setLoading(false);
    }
  }, [fbx, setLoading]);
  
  return fbx ? <primitive object={fbx} position={[0, 0, 0]} scale={0.01} /> : null;
} 