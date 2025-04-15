import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// 数字人助手组件
export default function DigitalHumanPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<{text: string, isUser: boolean, imageUrl?: string}[]>([]);
  const [mouthState, setMouthState] = useState(0); // 0: 闭嘴, 1-4: 说话状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [intimacy, setIntimacy] = useState<number>(0); // 关系亲密度 0-100
  const [aiPersonality, setAiPersonality] = useState<'友好' | '幽默' | '专业' | '浪漫'>('友好');
  const [isThinking, setIsThinking] = useState(false);
  const [useGLMFlash, setUseGLMFlash] = useState(true); // 控制是否使用GLM-4-Flash模型
  const [audioAnalyzer, setAudioAnalyzer] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioVolume, setAudioVolume] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  // 记录音频持续时间和当前位置
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPosition, setAudioPosition] = useState(0);
  // 预定义的口型关键帧
  const MOUTH_KEYFRAMES = [
    { open: 0, width: '20%' },     // 闭嘴
    { open: '5%', width: '23%' },  // 微微张嘴
    { open: '10%', width: '27%' }, // 小张嘴
    { open: '15%', width: '30%' }, // 中等张嘴
    { open: '20%', width: '35%' }  // 大张嘴
  ];
  // 音素-口型映射，用于根据语音内容设置更准确的口型
  const PHONEME_TO_MOUTH = {
    'a': 3, 'e': 2, 'i': 1, 'o': 3, 'u': 2,
    'p': 0, 'b': 0, 'm': 0, 'f': 1, 'v': 1,
    's': 1, 'z': 1, 'th': 1, 'sh': 1,
    't': 0, 'd': 0, 'n': 0, 'l': 1, 'r': 1,
    'k': 0, 'g': 0, 'ng': 0, 'h': 1, 'w': 2, 'y': 1
  };
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mouthRef = useRef<HTMLDivElement | null>(null);
  const audioAnalyzerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // 多口型图片资源
  const mouthImages = [
    '/images/mouth-closed.png',    // 可以替换为实际的图片路径
    '/images/mouth-half-open.png',
    '/images/mouth-open.png',
    '/images/mouth-wide-open.png',
    '/images/mouth-max-open.png'
  ];
  
  // 创建音频上下文和分析器
  useEffect(() => {
    // 创建一个空的音频元素
    if (!audioRef.current) {
      const audio = new Audio();
      audioRef.current = audio;
      
      // 设置音频事件处理器
      audio.onplay = () => {
        console.log('开始播放语音');
        setIsPlaying(true);
        startLipSync();
      };
      
      audio.onpause = () => {
        console.log('暂停播放语音');
        stopLipSync();
      };
      
      audio.onended = () => {
        console.log('语音播放结束');
        setIsPlaying(false);
        setMouthState(0); // 恢复闭嘴状态
        stopLipSync();
      };
      
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioPosition(audio.currentTime);
          setAudioDuration(audio.duration);
        }
      };
      
      audio.onerror = (e) => {
        const errorMessage = e instanceof ErrorEvent ? e.message : '未知错误';
        console.error('音频播放错误:', errorMessage);
        setAudioError(`音频播放失败: ${errorMessage}`);
        setIsPlaying(false);
        stopLipSync();
      };
    }
    
    try {
      // 创建音频上下文
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzer = context.createAnalyser();
      analyzer.fftSize = 1024; // 增加精度，更好的捕捉音频特征
      analyzer.smoothingTimeConstant = 0.5; // 平滑过渡
      
      setAudioContext(context);
      setAudioAnalyzer(analyzer);
      
      return () => {
        stopLipSync();
        if (context.state !== 'closed') {
          context.close();
        }
      };
    } catch (err) {
      console.error('创建音频上下文失败:', err);
      setAudioError('创建音频上下文失败');
      return undefined;
    }
  }, []);
  
  // 连接音频元素到分析器
  useEffect(() => {
    if (!audioRef.current || !audioContext || !audioAnalyzer) return;
    
    try {
      // 创建媒体源并连接
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(audioAnalyzer);
      audioAnalyzer.connect(audioContext.destination);
      
      return () => {
        stopLipSync();
        source.disconnect();
        audioAnalyzer.disconnect();
      };
    } catch (err) {
      console.error('连接音频分析器失败:', err);
      setAudioError('音频处理设置失败');
      return undefined;
    }
  }, [audioContext, audioAnalyzer]);
  
  // 开始口型同步
  const startLipSync = useCallback(() => {
    if (!audioAnalyzer) return;
    
    // 停止任何现有的口型同步
    stopLipSync();
    
    const dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
    
    // 以固定间隔分析音频数据
    const intervalId = window.setInterval(() => {
      audioAnalyzer.getByteFrequencyData(dataArray);
      
      // 计算频域能量的平均值 (简化版)
      let sum = 0;
      // 只关注人声主要频率范围 - 近似值
      const voiceRangeStart = Math.floor(dataArray.length * 0.05); // ~100Hz
      const voiceRangeEnd = Math.floor(dataArray.length * 0.25);   // ~3000Hz
      
      for (let i = voiceRangeStart; i < voiceRangeEnd; i++) {
        sum += dataArray[i];
      }
      
      const avgVolume = sum / (voiceRangeEnd - voiceRangeStart);
      setAudioVolume(avgVolume);
      
      // 根据音量设置不同的口型状态 - 更自然的缩放
      if (avgVolume < 15) {
        setMouthState(0); // 闭嘴 (静音或非常安静)
      } else if (avgVolume < 40) {
        setMouthState(1); // 微张 (轻音)
      } else if (avgVolume < 80) {
        setMouthState(2); // 小开口 (一般音量)
      } else if (avgVolume < 120) {
        setMouthState(3); // 中等开口 (较大音量)
      } else {
        setMouthState(4); // 大开口 (大音量)
      }
    }, 50); // 每50毫秒更新一次 (约20fps，适合口型动画)
    
    audioAnalyzerIntervalRef.current = intervalId;
  }, [audioAnalyzer]);
  
  // 停止口型同步
  const stopLipSync = useCallback(() => {
    if (audioAnalyzerIntervalRef.current) {
      window.clearInterval(audioAnalyzerIntervalRef.current);
      audioAnalyzerIntervalRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  // 获取当前口型样式
  const getMouthStyle = () => {
    // 根据mouthState获取当前关键帧
    const keyframe = MOUTH_KEYFRAMES[mouthState] || MOUTH_KEYFRAMES[0];
    
    // 添加更自然的随机微小变化
    const randomVariation = isPlaying ? (Math.random() * 0.05) : 0;
    const openValue = typeof keyframe.open === 'string' 
      ? parseFloat(keyframe.open as string) 
      : keyframe.open;
    
    // 计算实际使用的值
    const actualOpenHeight = typeof openValue === 'number' 
      ? `${openValue + randomVariation}%` 
      : openValue;
    
    return {
      height: actualOpenHeight,
      width: keyframe.width
    };
  };
  
  // 生成AI响应
  const generateAIResponse = async (text: string, persona: string = "友好") => {
    try {
      setIsThinking(true);
      
      // 准备消息历史
      const messageHistory = [
        { role: "user", content: text }
      ];
      
      // 调用智谱AI GLM-4 API
      const response = await fetch('/api/glm4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messageHistory,
          persona
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI响应:', data);
      
      // 提取AI回复文本
      let aiText = '';
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        aiText = data.choices[0].message.content;
      } else {
        throw new Error('无效的API响应格式');
      }
      
      // 更新聊天历史
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: aiText,
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ]);

      // 增加亲密度
      setIntimacy(prev => Math.min(prev + 5, 100));
      
      // 播放语音
      speakText(aiText);
      
    } catch (error) {
      console.error('生成AI响应失败:', error);
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `抱歉，我遇到了一个问题: ${(error as Error).message}`,
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // 生成语音并播放
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      console.log('调用TTS API...');
      setAudioError(null);
      
      // 停止之前的语音
      if (audioRef.current) {
        audioRef.current.pause();
        stopLipSync();
      }
      
      // 调用Azure TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: 'zh-CN-XiaoxiaoNeural', // 中文女声
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`TTS API调用失败: ${response.status}`);
      }
      
      console.log('TTS API调用成功，处理音频...');
      
      // 获取音频数据
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        // 确保先设置好src再尝试播放
        audioRef.current.src = audioUrl;
        audioRef.current.load(); // 强制加载
        
        // 如果有音频上下文且状态是suspended，则恢复
        if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
          } catch (err) {
            console.error('恢复音频上下文失败:', err);
          }
        }
        
        // 播放音频
        try {
          // 设置音量并准备播放
          audioRef.current.volume = 1.0;
          
          console.log('尝试播放音频...');
          // 用户必须与页面交互后才能自动播放音频
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('音频播放成功');
                // 播放成功后自动开始口型同步
                startLipSync();
              })
              .catch(error => {
                console.error('播放音频失败:', error);
                setAudioError(`播放失败: ${error.message || '用户交互之前无法自动播放'}`);
                setIsPlaying(false);
              });
          }
        } catch (playError) {
          console.error('播放音频失败:', playError);
          setAudioError(`播放失败: ${playError instanceof Error ? playError.message : '未知错误'}`);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('语音生成错误:', error);
      setAudioError(`语音生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsPlaying(false);
    }
  };

  // 保留LiveTalking切换功能
  const [useExternalLipSync, setUseExternalLipSync] = useState(false);

  // 向LiveTalking服务发送文本进行处理
  const sendToLiveTalking = async (text: string) => {
    try {
      // 如果使用iframe集成，直接向iframe发送消息
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'speakText',
          text: text
        }, '*');
        return true;
      }
      
      console.log('📢 发送文本到模拟LiveTalking API:', text);
      
      // 使用模拟LiveTalking API
      const response = await fetch('/api/livetalking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          avatar_id: 'blue-hair-character'
        }),
      });
      
      if (!response.ok) {
        throw new Error('模拟LiveTalking API调用失败');
      }
      
      const data = await response.json();
      console.log('模拟LiveTalking响应:', data);
      
      // 如果API调用成功，使用TTS和内置口型动画显示结果
      if (data.success) {
        await speakText(text);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('调用模拟LiveTalking失败:', error);
      setAudioError(`模拟LiveTalking调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  };

  // 打开模拟的LiveTalking控制面板
  const openLiveTalking = () => {
    // 创建一个简单的模拟界面，显示在一个新窗口中
    const mockWindow = window.open('', '_blank', 'width=600,height=400');
    if (!mockWindow) {
      alert('无法打开新窗口，请检查您的浏览器是否阻止弹出窗口');
      return;
    }
    
    mockWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>模拟LiveTalking控制面板</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; }
          h1 { color: #333; }
          textarea { width: 100%; height: 100px; margin: 10px 0; padding: 8px; }
          button { background: #4a90e2; color: white; border: none; padding: 10px 15px; cursor: pointer; }
          .status { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>模拟LiveTalking控制面板</h1>
          <p>由于您无法在Mac上安装原版LiveTalking，这是一个简化的模拟界面</p>
          
          <textarea id="textInput" placeholder="输入要转换为语音的文本..."></textarea>
          <button id="submitBtn">生成语音和口型</button>
          
          <div class="status" id="statusDisplay">
            准备就绪，请输入文本
          </div>
        </div>
        
        <script>
          document.getElementById('submitBtn').addEventListener('click', async () => {
            const text = document.getElementById('textInput').value;
            if (!text) return;
            
            document.getElementById('statusDisplay').textContent = '处理中...';
            
            try {
              const response = await fetch('/api/livetalking', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, avatar_id: 'default' }),
              });
              
              const data = await response.json();
              
              if (data.success) {
                document.getElementById('statusDisplay').textContent = 
                  '处理成功! 在主界面可以看到效果';
              } else {
                document.getElementById('statusDisplay').textContent = 
                  '处理失败: ' + (data.message || '未知错误');
              }
            } catch (error) {
              document.getElementById('statusDisplay').textContent = 
                '发生错误: ' + (error.message || '未知错误');
            }
          });
        </script>
      </body>
      </html>
    `);
    mockWindow.document.close();
  };

  // 在sendMessage函数中添加LiveTalking支持
  const sendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    // 添加用户消息到聊天历史
    setChatHistory(prev => [...prev, { text: userMessage, isUser: true }]);
    
    setIsProcessing(true);
    setIsThinking(true);
    
    try {
      // 使用GLM-4-Flash模型或默认模型
      const apiEndpoint = useGLMFlash ? '/api/glm4' : '/api/chat';
      
      // 准备消息历史
      const messages = chatHistory.slice(-5).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: userMessage
      });
      
      // 发送API请求
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          persona: aiPersonality,
        }),
      });
      
      if (!response.ok) {
        throw new Error(t('API调用失败'));
      }
      
      const data = await response.json();
      let aiResponse = '';
      
      if (useGLMFlash) {
        // GLM-4-Flash响应格式处理
        aiResponse = data.choices?.[0]?.message?.content || t('无回复内容');
      } else {
        // 默认模型响应处理
        aiResponse = data.text || t('无回复内容');
      }
      
      // 添加AI回复到聊天历史
      setChatHistory(prev => [...prev, { text: aiResponse, isUser: false }]);
      
      // 如果使用LiveTalking，发送到LiveTalking
      if (useExternalLipSync) {
        const success = await sendToLiveTalking(aiResponse);
        if (!success) {
          // 如果LiveTalking调用失败，回退到内置TTS
          setAudioError('LiveTalking调用失败，使用内置语音播放');
          await speakText(aiResponse);
        }
      } else {
        // 使用内置语音系统
        await speakText(aiResponse);
      }
      
    } catch (error) {
      console.error('发送消息错误:', error);
      setChatHistory(prev => [...prev, { 
        text: t('很抱歉，发生了错误，请稍后再试。'), 
        isUser: false 
      }]);
    } finally {
      setIsProcessing(false);
      setIsThinking(false);
    }
  };

  // 可视化音量条
  const VolumeIndicator = () => {
    return (
      <div className="absolute bottom-4 left-4 bg-white/70 px-3 py-2 rounded-lg">
        <div className="text-xs mb-1">音量: {Math.round(audioVolume)}</div>
        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-100 ${
              audioVolume < 40 ? 'bg-green-500' : 
              audioVolume < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`} 
            style={{ width: `${Math.min(audioVolume / 150 * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // 手动播放测试音频
  const playTestAudio = async () => {
    if (!audioRef.current) return;
    
    try {
      setAudioError(null);
      
      // 创建测试音频 - 使用更复杂的音频来测试口型同步
      const testAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const testAudioBuffer = testAudioContext.createBuffer(1, testAudioContext.sampleRate * 2, testAudioContext.sampleRate);
      const channelData = testAudioBuffer.getChannelData(0);
      
      // 创建一个简单的波形，在不同时间段有不同的音量
      for (let i = 0; i < channelData.length; i++) {
        // 第一段：低音量
        if (i < channelData.length * 0.25) {
          channelData[i] = Math.sin(i * 0.01) * 0.2;
        } 
        // 第二段：中音量
        else if (i < channelData.length * 0.5) {
          channelData[i] = Math.sin(i * 0.02) * 0.5;
        }
        // 第三段：高音量
        else if (i < channelData.length * 0.75) {
          channelData[i] = Math.sin(i * 0.03) * 0.8;
        }
        // 第四段：低音量
        else {
          channelData[i] = Math.sin(i * 0.01) * 0.3;
        }
      }
      
      // 转换为WAV blob
      const source = testAudioContext.createBufferSource();
      source.buffer = testAudioBuffer;
      
      // 创建一个媒体流目标
      const dest = testAudioContext.createMediaStreamDestination();
      source.connect(dest);
      
      // 创建一个MediaRecorder来捕获音频
      const mediaRecorder = new MediaRecorder(dest.stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = e => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('测试音频播放成功');
                setIsPlaying(true);
                startLipSync();
              })
              .catch(err => {
                console.error('测试音频播放失败:', err);
                setAudioError(`测试音频失败: ${err.message}`);
              });
          }
        }
      };
      
      // 开始录制
      mediaRecorder.start();
      source.start();
      
      // 2秒后停止
      setTimeout(() => {
        source.stop();
        mediaRecorder.stop();
        testAudioContext.close();
      }, 2000);
      
    } catch (error) {
      console.error('测试音频生成失败:', error);
      setAudioError(`测试音频失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  
  // 测试口型动画
  const testMouthAnimation = () => {
    // 停止当前可能的动画
    stopLipSync();
    
    // 模拟一个口型动画序列
    const mouthStates = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 0];
    let index = 0;
    
    setIsPlaying(true);
    
    const animateTestMouth = () => {
      setMouthState(mouthStates[index]);
      index = (index + 1) % mouthStates.length;
      
      if (index < mouthStates.length - 1) {
        setTimeout(animateTestMouth, 150);
      } else {
        setIsPlaying(false);
        setMouthState(0);
      }
    };
    
    animateTestMouth();
  };

  // 添加生成蒙版图片的函数
  const generateMouthMasks = () => {
    // 如果没有实际的口型图片，我们可以动态生成
    return Array(5).fill(0).map((_, i) => {
      const size = i === 0 ? 0 : (5 + i * 5); // 0%, 10%, 15%, 20%, 25%
      
      return (
        <svg 
          key={i}
          width="100" 
          height="100" 
          viewBox="0 0 100 100" 
          style={{display: 'none'}}
        >
          <ellipse
            cx="50"
            cy="50"
            rx="30"
            ry={size}
            fill="black"
          />
        </svg>
      );
    });
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* 半透明背景 */}
        <div 
          className="absolute inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        
        {/* 数字人面板 */}
        <div className="bg-white rounded-2xl z-10 w-[900px] h-[650px] overflow-hidden">
          <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">{t('数字人助手')}</h2>
                <div className="ml-4 flex items-center">
                  {/* 亲密度指示器 */}
                  <div className="flex items-center">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-pink-500 rounded-full" 
                        style={{ width: `${intimacy}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">亲密度: {intimacy}%</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                {/* 模型选择器 */}
                <button
                  onClick={() => setUseGLMFlash(!useGLMFlash)}
                  className={`px-3 py-1 text-white rounded text-sm ${
                    useGLMFlash ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {useGLMFlash ? 'GLM-4-Flash' : t('默认模型')}
                </button>
                
                {/* LiveTalking切换 */}
                <button
                  onClick={() => {
                    setUseExternalLipSync(!useExternalLipSync);
                    if (!useExternalLipSync) {
                      // 当切换到LiveTalking模式时显示提示
                      setChatHistory(prev => [...prev, {
                        text: "已切换到模拟LiveTalking模式。在Mac上无法使用原版LiveTalking，将使用内置的模拟接口。",
                        isUser: false
                      }]);
                    }
                  }}
                  className={`px-3 py-1 text-white rounded text-sm ${
                    useExternalLipSync ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {useExternalLipSync ? '使用模拟LiveTalking' : '使用内置口型'}
                </button>
                
                {/* 个性化选择器 */}
                <select
                  value={aiPersonality}
                  onChange={(e) => setAiPersonality(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  aria-label={t('选择AI性格')}
                >
                  <option value="友好">{t('友好')}</option>
                  <option value="幽默">{t('幽默')}</option>
                  <option value="专业">{t('专业')}</option>
                  <option value="浪漫">{t('浪漫')}</option>
                </select>
                
                {/* 关闭按钮 */}
                <button 
                  onClick={onClose}
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                >
                  {t('关闭')}
                </button>
              </div>
            </div>
            
            {/* 内容区 - 数字人图像和对话 */}
            <div className="flex-1 flex flex-row h-full">
              {/* 数字人图像区 */}
              <div className="w-2/5 h-full bg-gray-100 flex items-center justify-center relative">
                <div className={`relative w-full h-full flex items-center justify-center ${isPlaying ? 'animate-pulse-slow' : ''}`}>
                  {/* 数字人图像 - 带动态口型 */}
                  <div className="relative" ref={mouthRef}>
                    {useExternalLipSync ? (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center flex-col p-4 text-white">
                        <h3 className="font-bold mb-3">模拟LiveTalking模式</h3>
                        <p className="text-sm mb-4">由于Mac上无法运行LiveTalking，这里使用内置模拟接口</p>
                        <div className="bg-blue-900 p-3 rounded-lg w-full">
                          <p className="text-xs mb-2">最新处理文本:</p>
                          <div className="bg-blue-950 p-2 rounded">
                            {chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].text : '无内容'}
                          </div>
                        </div>
                        <button
                          onClick={() => openLiveTalking()}
                          className="mt-4 bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                          打开模拟控制面板
                        </button>
                      </div>
                    ) : (
                      <>
                        <img
                          src="/images/blue-hair-character.jpg"
                          alt="Digital Human"
                          className="h-full w-auto object-contain max-h-[450px]"
                        />
                        
                        {/* 叠加动态口型 - 参考LiveTalking的唇形实现 */}
                        <div 
                          className="absolute bottom-[30%] left-[50%] transform -translate-x-1/2 bg-black rounded-full transition-all duration-50"
                          style={{
                            width: getMouthStyle().width,
                            height: getMouthStyle().height,
                            opacity: 0.7,
                            transform: 'translateX(-50%)',
                            transition: 'height 50ms ease-out, width 50ms ease-out',
                            boxShadow: isPlaying ? '0 0 5px rgba(255,255,255,0.5) inset' : 'none'
                          }}
                        ></div>
                        
                        {/* 口型状态指示 */}
                        {isPlaying && (
                          <div className="absolute bottom-0 left-0 right-0 text-center py-1 bg-black/30 text-white text-xs">
                            口型:{mouthState} 音量:{Math.round(audioVolume)} 
                            {audioDuration > 0 && ` 进度:${Math.round(audioPosition/audioDuration*100)}%`}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* 播放状态指示 */}
                  {(isProcessing || isThinking) && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/70 px-3 py-1 rounded-full text-sm">
                      {isProcessing ? t('思考中...') : t('正在说话...')}
                    </div>
                  )}
                  
                  {/* 音量指示器 */}
                  {isPlaying && !useExternalLipSync && <VolumeIndicator />}
                  
                  {/* 错误显示 */}
                  {audioError && (
                    <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm">
                      <div className="font-bold">音频错误:</div>
                      <div>{audioError}</div>
                      <button 
                        className="mt-1 bg-blue-500 text-white px-2 py-1 rounded-sm text-xs"
                        onClick={() => setAudioError(null)}
                      >
                        关闭
                      </button>
                    </div>
                  )}
                  
                  {/* 测试控制面板 */}
                  {!useExternalLipSync && (
                    <div className="absolute top-4 right-4 flex flex-col space-y-2">
                      <button
                        onClick={playTestAudio}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      >
                        测试音频
                      </button>
                      <button
                        onClick={testMouthAnimation}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                      >
                        测试口型
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 对话区 */}
              <div className="w-3/5 flex flex-col p-4">
                {/* 聊天历史 */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-3 mb-3 custom-scrollbar"
                >
                  {chatHistory.length === 0 ? (
                    <div className="text-sm text-gray-600 space-y-2 p-4">
                      <p>{t('与数字人助手对话，输入文字开始互动。')}</p>
                      <p>{t('数字人会根据你的提问进行回答，并通过语音与唇形动画进行回应。')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3 p-2">
                      {chatHistory.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`rounded-lg p-3 max-w-[85%] ${
                            msg.isUser 
                              ? 'bg-blue-100 self-end' 
                              : 'bg-gray-100 self-start'
                          }`}
                        >
                          {/* 文字消息 */}
                          <div className="text-sm">{msg.text}</div>
                          
                          {/* 时间戳 */}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 输入和控制区 */}
                <div className="flex flex-col space-y-3">
                  <div className="flex space-x-2">
                    <textarea
                      className="flex-1 border border-gray-300 rounded-lg p-3 resize-none"
                      rows={2}
                      placeholder={t('请输入消息...')}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isProcessing || isPlaying}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                  </div>
                  
                  {/* 操作按钮区 */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={openLiveTalking}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        打开模拟控制面板
                      </button>
                      
                      <div className="text-xs text-gray-500 flex items-center ml-2">
                        {isPlaying ? '正在播放语音...' : '准备就绪'}
                      </div>
                    </div>
                    
                    {/* 发送按钮 */}
                    <button
                      className={`px-5 py-2 rounded-full transition-colors ${
                        isProcessing || isPlaying || !inputText.trim()
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      onClick={sendMessage}
                      disabled={isProcessing || isPlaying || !inputText.trim()}
                    >
                      {isProcessing ? t('思考中...') : t('发送')}
                    </button>
                  </div>
                  
                  <audio 
                    ref={audioRef} 
                    preload="auto" 
                    crossOrigin="anonymous"
                    onError={() => setAudioError('音频加载失败')}
                  />
                  <canvas ref={canvasRef} width="100" height="100" className="hidden" />
                  
                  {/* 底部提示 */}
                  <p className="text-xs text-gray-500 text-center">
                    {useExternalLipSync 
                      ? `使用模拟LiveTalking接口 (${useGLMFlash ? 'GLM-4-Flash' : '默认'}模型)`
                      : (useGLMFlash 
                        ? t('使用GLM-4-Flash模型提供语义理解，口型同步技术参考了LiveTalking项目')
                        : t('使用智谱GLM-4大模型提供语义理解，Azure TTS提供语音服务'))}
                  </p>
                  
                  {audioError && (
                    <div className="text-xs text-red-500 mt-1">
                      {audioError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 导航栏菜单项组件
export function DigitalHumanLink() {
  const { t } = useTranslation();
  const [showPanel, setShowPanel] = useState(false);
  
  return (
    <>
      <div
        onClick={() => setShowPanel(true)}
        className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200"
      >
        <span role="img" aria-label="digital human" className="mr-3">👤</span>
        <span>{t('数字人助手')}</span>
      </div>
      
      {showPanel && (
        <DigitalHumanPanel onClose={() => setShowPanel(false)} />
      )}
    </>
  );
}

// 创建一个接口组件
const LiveTalkingPlayer = ({ text, onVideoReady }: { text: string, onVideoReady: () => void }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    // 建立与LiveTalking的通信通道
    const communicateWithLiveTalking = () => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;
      
      // 发送消息到iframe
      iframeRef.current.contentWindow.postMessage({
        type: 'speakText',
        text: text
      }, '*');
    };
    
    if (iframeRef.current && iframeRef.current.contentDocument?.readyState === 'complete') {
      communicateWithLiveTalking();
    } else {
      iframeRef.current?.addEventListener('load', communicateWithLiveTalking);
    }
  }, [text]);
  
  return (
    <iframe
      ref={iframeRef}
      src="http://localhost:8010/webrtcapi.html"
      className="w-full h-full border-0"
      allow="camera; microphone; autoplay"
    />
  );
}; 