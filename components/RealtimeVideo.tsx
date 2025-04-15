"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaRobot, FaDesktop } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { MdSend, MdInfo, MdStopScreenShare, MdScreenShare } from 'react-icons/md';

// 生成唯一ID的函数
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

// API密钥 - 在实际应用中应从环境变量或安全存储中获取
// 此密钥需要替换为您从智谱AI开放平台获取的有效密钥
// const API_KEY = "a67ee6e3cbcb4caeb046fa9698c0584d.wOvvkhCtclTxF9F1";
const MODEL = "glm-4-realtime";

export function RealtimeVideoPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<{id: string, text: string, isUser: boolean}[]>([]);
  const [sessionId] = useState(() => generateId());
  const [currentMessage, setCurrentMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // Store the JWT token and WebSocket URL
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [webSocketUrl, setWebSocketUrl] = useState<string | null>(null);
  
  // 媒体控制状态
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  
  // WebSocket连接
  const wsRef = useRef<WebSocket | null>(null);
  
  // 媒体流引用
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // 清理媒体流和WebSocket连接
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // 关闭WebSocket连接
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
  
  // 发送WebSocket消息
  const sendWebSocketMessage = (text: string): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送消息');
      return false;
    }
    
    try {
      const message = {
        type: "MESSAGE",
        content: text
      };
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('发送WebSocket消息失败:', err);
      return false;
    }
  };
  
  // 初始化会话
  const initSession = async () => {
    if (connecting || connected) return;
    
    setConnecting(true);
    setError(null);
    setMessages([]); // Clear previous messages
    
    try {
      console.log('向后端请求JWT令牌...');
      
      // 调用后端API获取JWT和WebSocket URL
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          clientId: sessionId,
          transport: 'websocket' // 指定传输模式
        }) 
      });
      
      const data = await response.json();

      if (!response.ok || !data.success || !data.token || !data.wsUrl) {
         const errorMsg = data.error || `获取认证信息失败: ${response.status} ${response.statusText}`;
         console.error('获取JWT失败:', data);
         throw new Error(errorMsg);
      }
      
      console.log('成功获取JWT和WebSocket URL');
      setAuthToken(data.token);
      setWebSocketUrl(data.wsUrl);

      // 检查URL端点是否正确
      if (!data.wsUrl.includes('/api/rtav/GLM-Realtime')) {
        console.warn('WebSocket URL可能不正确，应包含/api/rtav/GLM-Realtime路径');
      }

      // 建立WebSocket连接
      // We pass the token and url directly, sessionId is not used for URL anymore
      const wsConnected = connectWebSocket(data.token, data.wsUrl);
      
      if (!wsConnected) {
        throw new Error('WebSocket连接未能成功启动');
      }
      
      // 不需要立即设置connected=true, 等待WebSocket onopen 和 服务器确认
      // setConnecting(true) 即可
      
      // 可选：显示来自后端的消息
      if (data.message) {
        setModelInfo(data.message);
      }
      
    } catch (err) {
      console.error('初始化连接失败:', err);
      const errorMessage = (err as Error).message || '未知错误';
      setError(`连接失败: ${errorMessage}`);
      setConnecting(false);
      // Display error in chat
      setMessages([{
        id: generateId(),
        text: `连接初始化失败:\n${errorMessage}\n\n请检查:
1. 后端服务是否正常运行?
2. API Key配置是否正确?
3. 网络连接是否稳定?

请稍后重试或联系管理员。`,
        isUser: false
      }]);
    }
  };
  
  // 重试连接
  const retryConnection = () => {
    setAuthToken(null); // Clear previous token
    setWebSocketUrl(null);
    initSession();
  };
  
  const MAX_RETRIES = 3;
  let retryCount = 0;

  const connectWebSocket = (token: string, url: string): boolean => {
    // 清理旧连接
    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting");
      wsRef.current = null;
    }

    // 设置智能超时（根据重试次数增加超时时间）
    const timeoutDuration = Math.min(10000 * (retryCount + 1), 60000);
    const connectTimeout = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        console.error(`连接超时（${timeoutDuration}ms）`);
        wsRef.current.close(4002, "Connection Timeout");
        setError(`连接超时（${timeoutDuration}ms）`);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          retryConnection();
        }
      }
    }, timeoutDuration);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        retryCount = 0; // 重置重试计数器
        console.log("发送认证令牌...");
        ws.send(JSON.stringify({
          type: "auth",
          token: token
        }));
        
        // 心跳机制
        const heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          } else {
            clearInterval(heartbeat);
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "MESSAGE") {
          // 处理服务器响应...
        } else if (message.type === "error") {
          handleServerError(message);
        }
      };

      ws.onclose = (event) => {
        if (event.code === 4002) return; // 忽略超时关闭
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(retryConnection, 1000 * retryCount);
        }
      };

      ws.onerror = (errorEvent) => {
        console.error("连接错误:", errorEvent);
        setError(`连接错误: ${errorEvent.type}`);
      };

      return true;
    } catch (err) {
      console.error("创建连接失败:", err);
      return false;
    }
  };
  
  // 错误处理函数
  const handleServerError = (message: any) => {
    console.error("服务器返回错误:", message);
    
    const errorMap: { [key: string]: string } = {
      'auth_failed': '认证失败：无效的API Key',
      'token_expired': '会话已过期，请重新连接',
      'rate_limit': '请求过于频繁，请稍后重试',
    };

    const errorMessage = errorMap[message.code] || message.message || '未知服务器错误';
    
    setMessages(prev => [...prev, {
      id: generateId(),
      text: `服务器错误：${errorMessage}`,
      isUser: false
    }]);
    
    if (message.code === 'auth_failed') {
      setAuthToken(null);
      setWebSocketUrl(null);
    }
  };
  
  const toggleMicrophone = async () => {
    try {
      if (micEnabled) {
        // 关闭麦克风
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = false;
            track.stop();
          });
        }
        setMicEnabled(false);
        
        // 通知AI麦克风已关闭
        if (connected) {
          sendWebSocketMessage("我已关闭麦克风");
        }
      } else {
        // 开启麦克风
        if (!mediaStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          // 添加音频轨道
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => {
            mediaStreamRef.current?.addTrack(track);
          });
        }
        setMicEnabled(true);
        
        // 通知AI麦克风已打开
        if (connected) {
          sendWebSocketMessage("我已打开麦克风，现在可以通过语音交流");
        }
      }
    } catch (err) {
      console.error('麦克风访问错误:', err);
      setError(t('无法访问麦克风，请确保您已授予权限'));
    }
  };
  
  const toggleCamera = async () => {
    try {
      if (cameraEnabled) {
        // 关闭摄像头
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = false;
            track.stop();
          });
        }
        setCameraEnabled(false);
        
        // 通知AI摄像头已关闭
        if (connected) {
          sendWebSocketMessage("我已关闭摄像头");
        }
      } else {
        // 开启摄像头
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (!mediaStreamRef.current) {
          mediaStreamRef.current = videoStream;
        } else {
          // 添加视频轨道
          videoStream.getVideoTracks().forEach(track => {
            mediaStreamRef.current?.addTrack(track);
          });
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStreamRef.current;
        }
        
        setCameraEnabled(true);
        
        // 通知AI摄像头已打开
        if (connected) {
          sendWebSocketMessage("我已打开摄像头，现在您可以看到我了");
        }
      }
    } catch (err) {
      console.error('摄像头访问错误:', err);
      setError(t('无法访问摄像头，请确保您已授予权限'));
    }
  };
  
  const toggleScreenShare = async () => {
    try {
      if (screenShareEnabled) {
        // 停止屏幕共享
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // 恢复摄像头视频（如果开启）
        if (cameraEnabled && mediaStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStreamRef.current;
        } else if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        
        setScreenShareEnabled(false);
        
        // 通知AI屏幕共享已结束
        if (connected) {
          sendWebSocketMessage("我已结束屏幕共享");
        }
      } else {
        // 开始屏幕共享
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        // 保存屏幕共享流
        screenStreamRef.current = screenStream;
        
        // 监听屏幕共享结束事件
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenShareEnabled(false);
          // 通知AI屏幕共享已结束
          if (connected) {
            sendWebSocketMessage("我的屏幕共享已结束");
          }
          
          // 恢复摄像头视频（如果开启）
          if (cameraEnabled && mediaStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStreamRef.current;
          } else if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        };
        
        // 在本地视频元素中显示屏幕共享
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setScreenShareEnabled(true);
        
        // 通知AI屏幕共享已开始
        if (connected) {
          sendWebSocketMessage("我已开始屏幕共享，您可以看到我的屏幕");
        }
      }
    } catch (err) {
      console.error('屏幕共享错误:', err);
      // 用户取消屏幕共享时不显示错误
      if ((err as Error).name !== 'AbortError' && (err as Error).name !== 'NotAllowedError') {
        setError(t('屏幕共享失败') + ': ' + (err as Error).message);
      }
    }
  };
  
  const sendMessage = async (text: string) => {
    if (!text.trim() || !connected || isThinking) return;
    
    // 添加用户消息到列表
    const newUserMessage = {
      id: generateId(),
      text,
      isUser: true
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setCurrentMessage('');
    setIsThinking(true);
    
    // 通过WebSocket发送消息
    const sent = sendWebSocketMessage(text);
    
    if (!sent) {
      // 如果WebSocket发送失败，尝试通过HTTP API发送
      try {
        // 发送消息到API
        const response = await fetch('/api/realtime', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_JWT_TOKEN',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            message: text,
            videoEnabled: cameraEnabled,
            screenShare: screenShareEnabled
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '请求失败');
        }
        
        const data = await response.json();
        
        // 添加AI回复
        if (data.success && data.text) {
          setMessages(prev => [...prev, {
            id: generateId(),
            text: data.text,
            isUser: false
          }]);
          
          // 尝试重新连接WebSocket
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket(authToken || '', webSocketUrl || '');
          }
        } else {
          throw new Error('未收到有效回复');
        }
      } catch (err) {
        console.error('发送消息失败:', err);
        setMessages(prev => [...prev, {
          id: generateId(),
          text: `抱歉，发生了错误: ${(err as Error).message}`,
          isUser: false
        }]);
      }
      setIsThinking(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      sendMessage(currentMessage);
    }
  };
  
  // 处理媒体控制按钮UI
  const renderMediaControls = () => {
    return (
      <div className="flex justify-center space-x-4 p-4 border-t border-gray-200 dark:border-gray-700">
        {/* 麦克风控制 */}
        <button
          onClick={toggleMicrophone}
          className={`flex items-center justify-center w-12 h-12 rounded-full ${
            micEnabled 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          title={micEnabled ? t('关闭麦克风') : t('开启麦克风')}
        >
          {micEnabled ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
        </button>
        
        {/* 摄像头控制 */}
        <button
          onClick={toggleCamera}
          className={`flex items-center justify-center w-12 h-12 rounded-full ${
            cameraEnabled 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          title={cameraEnabled ? t('关闭摄像头') : t('开启摄像头')}
        >
          {cameraEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
        </button>
        
        {/* 屏幕共享控制 */}
        <button
          onClick={toggleScreenShare}
          className={`flex items-center justify-center w-12 h-12 rounded-full ${
            screenShareEnabled 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          title={screenShareEnabled ? t('停止共享屏幕') : t('共享屏幕')}
        >
          {screenShareEnabled ? <MdStopScreenShare size={20} /> : <MdScreenShare size={20} />}
        </button>
      </div>
    );
  };
  
  // 在组件的useEffect中添加
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('标签页恢复可见');
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.log('WebSocket连接已断开，尝试重新连接');
          // 刷新认证并重新连接
          if (authToken && webSocketUrl) {
            connectWebSocket(authToken, webSocketUrl);
          } else {
            retryConnection();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authToken, webSocketUrl]);
  
  // 添加网络状态监听
  useEffect(() => {
    const handleOnlineStatus = () => {
      if (!navigator.onLine) {
        setError('网络连接已断开');
        if (wsRef.current) {
          wsRef.current.close(4001, "Offline");
        }
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      
      {/* 对话面板 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl z-10 w-[90%] max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <FaRobot className="text-blue-600 mr-2" size={24} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('GLM-Realtime视频对话')}</h2>
            {connected && <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{t('已连接')}</span>}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={t('关闭')}
          >
            <IoClose size={24} />
          </button>
        </div>
        
        {/* 主体内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 聊天区 */}
          <div className="flex-1 flex flex-col">
            {/* 模型信息 */}
            {modelInfo && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 m-4 rounded-lg flex items-start">
                <MdInfo className="text-blue-500 mr-2 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">{modelInfo}</div>
              </div>
            )}
            
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {!connected ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <FaRobot className="mx-auto text-blue-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold mb-2">{t('GLM-Realtime视频对话')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {t('GLM-Realtime API 能够提供实时的视频通话功能，具有跨文本、音频和视频进行实时推理的能力，可以进行流畅的通话，支持实时打断。')}
                    </p>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <button
                      onClick={retryConnection}
                      disabled={connecting}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50"
                    >
                      {connecting ? t('连接中...') : t('重试连接')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`mb-4 ${msg.isUser ? 'text-right' : ''}`}
                    >
                      <div 
                        className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                          msg.isUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                        }`}
                      >
                        {msg.text.split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < msg.text.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="mb-4">
                      <div className="inline-block px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse mr-1"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75 mr-1"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* 消息输入 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {connected ? (
                <form onSubmit={handleSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder={t('发送消息...')}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isThinking}
                  />
                  <button
                    type="submit"
                    disabled={!currentMessage.trim() || isThinking}
                    className="ml-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                    title={t('发送')}
                  >
                    <MdSend size={20} />
                  </button>
                </form>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  {t('连接后开始对话')}
                </div>
              )}
            </div>
          </div>
          
          {/* 视频区域 */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* 本地视频 */}
            <div className="h-1/2 border-b border-gray-700 p-2 relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full rounded-md object-cover ${!cameraEnabled ? 'hidden' : ''}`}
              />
              
              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-md">
                  <div className="text-gray-400 text-center">
                    <FaVideoSlash size={30} className="mx-auto mb-2" />
                    <p className="text-sm">{t('摄像头已关闭')}</p>
                  </div>
                </div>
              )}
              
              {screenShareEnabled && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs">
                  {t('屏幕共享中')}
                </div>
              )}
              
              {renderMediaControls()}
            </div>
            
            {/* 远程视频 (AI) */}
            <div className="h-1/2 p-2 relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                poster="/images/ai-avatar.png"
                className="w-full h-full rounded-md object-cover"
              />
              
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-md text-xs">
                AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RealtimeVideoLink() {
  const { t } = useTranslation();
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowPanel(true)}
        className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200"
      >
        <FaRobot className="mr-3" />
        <span>{t('GLM-Realtime视频对话')}</span>
      </div>
      
      {showPanel && (
        <RealtimeVideoPanel onClose={() => setShowPanel(false)} />
      )}
    </>
  );
} 