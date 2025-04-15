"use client"
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FaGithub } from "react-icons/fa";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { LuInfo } from "react-icons/lu";
import { MdSettings } from "react-icons/md";
import Switch from "react-switch";
import { Chat } from "./chat/components/chat";
import { ChatSelectionList, NewChat } from "./chat/components/chatList";
import { addNewChat, addNewChatWithoutSettingCurrentChat } from "./chat/components/chatList-redux";
import { GrammarCheckingHandler, RespGenerationHandler, TranscriptionImprovementHandler, TranslationHandler } from "./chat/components/input-handlers";
import { DisableHandlerDecorator, TutorialTranslationHandler } from "./chat/components/tutorial-input-handlers";
import { NextStepTutorialMessage } from "./chat/components/tutorial-message";
import { TutorialStateIDs } from "./chat/components/tutorial-redux";
import { AddNewChat, loadChatMessages, loadChatSelectionList } from "./chat/lib/chat";
import { chatTemplates } from "./chat/lib/template";
import { ConfigManager } from './config/ConfigManager';
import { useAppDispatch, useAppSelector } from "./hooks";
import i18n from './i18n/i18n';
import { TutorialChatIntelligence } from "./intelligence-llm/lib/intelligence";
import { SettingsEntry, SpeechSettings } from "./settings/components/settings";
import { defaultGlobalChatSettings, setGlobalChatSettings } from "./settings/lib/settings";
import { FilledButton } from "./ui-utils/components/button";
import { DropdownMenu, DropdownMenuEntry } from "./ui-utils/components/DropdownMenu";
import { SemiTransparentOverlay, TransparentOverlay } from "./ui-utils/components/overlay";
import { DigitalHumanLink } from './components/DigitalHuman';
import { RealtimeVideoLink } from './components/RealtimeVideo';

function AboutPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* semi-transparent mask */}
        <div className="absolute inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        {/* about panel */}
        <div className="bg-white rounded-2xl z-10 w-[500px] p-6">
          <div className="flex flex-col items-center">
            {/* Logo and Title */}
            <div className="flex flex-row items-center mb-1">
              <Image
                src="/images/speak-ai-logo.png"
                alt="SpeakAI Logo"
                width={48}
                height={48}
                className="mr-4"
              />
              <span className="text-2xl font-bold text-gray-800">SpeakAI</span>
            </div>
            {/* Logo Attribution */}
            <div className="text-sm text-gray-400 mb-6">
              <a
                href="https://www.flaticon.com/free-icon/duck_1635803?related_id=1635905"
                title="duck icons"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500"
              >
                {t('logoAttribution')}
              </a>
            </div>

            {/* GitHub Link */}
            <a
              href="https://github.com/Orenoid/SpeakAI"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <FilledButton className="flex items-center space-x-2"
                onClick={() => { }}>
                <FaGithub size={20} />
                <span>{t('viewOnGitHub')}</span>
              </FilledButton>
            </a>
            
            {/* App Version */}
            <div className="mt-4 text-sm text-gray-500">
              <p>Version: 1.0.0</p>
              <p>{t('desktopAppVersion')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CameraPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognizedObject, setRecognizedObject] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Azure 视觉 API 配置表单
  const [azureConfig, setAzureConfig] = useState({
    endpoint: 'https://youngcat.cognitiveservices.azure.com/',
    key: '58DG45y6kkmdORbsYsEj0wmgXgWNP926hwzSLgjHtN6zllGEKZ76JQQJ99BDACqBBLyXJ3w3AAAFACOG29xW',
    region: 'southeastasia'
  });
  
  // 在组件加载时，直接保存 API 配置到本地存储
  useEffect(() => {
    // 保存配置到本地存储
    localStorage.setItem('AZURE_VISION_ENDPOINT', azureConfig.endpoint);
    localStorage.setItem('AZURE_VISION_KEY', azureConfig.key);
    localStorage.setItem('AZURE_VISION_REGION', azureConfig.region);
    
    console.log('Azure 配置已保存:', {
      endpoint: azureConfig.endpoint,
      key: azureConfig.key.substring(0, 5) + '...',
      region: azureConfig.region
    });
    
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setErrorMessage(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('摄像头访问失败:', err);
      setErrorMessage(t('无法访问摄像头，请确保您已授予摄像头权限'));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setRecognizedObject(null);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('无法获取canvas上下文');
      }
      
      // 设置画布尺寸与视频帧匹配
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 绘制视频帧到画布
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 直接将canvas内容转为DataURL并显示
      try {
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);
        console.log('图像已捕获为DataURL, 长度:', imageDataUrl.length);
        
        // 从DataURL创建Blob对象
        const base64Data = imageDataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i += 512) {
          const slice = byteCharacters.slice(i, i + 512);
          const byteNumbers = new Array(slice.length);
          
          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, {type: 'image/jpeg'});
        console.log('成功创建Blob对象，大小:', blob.size, '字节');
        
        // 调用API分析图像
        await analyzeImageWithAzure(blob);
      } catch (conversionError) {
        console.error('图像转换错误:', conversionError);
        setErrorMessage(t('图像转换失败，请重试') + ': ' + (conversionError as Error).message);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('图像处理失败:', err);
      setErrorMessage(t('图像处理失败，请稍后重试'));
      setIsProcessing(false);
    }
  };

  const analyzeImageWithAzure = async (imageBlob: Blob) => {
    try {
      // 从组件状态获取Azure配置
      const endpoint = azureConfig.endpoint;
      const apiKey = azureConfig.key;
      const region = azureConfig.region;
      
      console.log('使用Azure配置:');
      console.log('- 端点:', endpoint);
      console.log('- 区域:', region);
      console.log('- 发送的图像大小:', imageBlob.size, '字节');
      
      if (!endpoint || !apiKey) {
        throw new Error(t('请在设置中配置Azure计算机视觉API密钥和端点'));
      }
      
      // 构建API URL (使用v3.2版本API)
      const url = `${endpoint}vision/v3.2/analyze?visualFeatures=Objects,Description,Tags&language=zh`;
      
      // 发送API请求
      console.log('发送请求到:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBlob
      });
      
      // 检查响应
      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        throw new Error(`API请求失败(${response.status}): ${errorText}`);
      }
      
      // 解析结果
      const result = await response.json();
      console.log('收到API响应数据');
      
      // 构建识别结果文本
      let recognitionText = '';
      
      // 处理图像描述
      if (result.description && result.description.captions && result.description.captions.length > 0) {
        recognitionText += `${t('图像描述')}: ${result.description.captions[0].text}\n\n`;
      }
      
      // 处理识别到的物体
      if (result.objects && result.objects.length > 0) {
        recognitionText += `${t('识别到的物体')}:\n`;
        result.objects.forEach((obj: any, index: number) => {
          recognitionText += `${index + 1}. ${obj.object} (${Math.round(obj.confidence * 100)}%)\n`;
        });
        recognitionText += '\n';
      }
      
      // 处理图像标签
      if (result.tags && result.tags.length > 0) {
        recognitionText += `${t('相关标签')}:\n`;
        result.tags.slice(0, 10).forEach((tag: any, index: number) => {
          recognitionText += `${tag.name}${index < Math.min(9, result.tags.length - 1) ? ', ' : ''}`;
        });
      }
      
      // 设置识别结果
      setRecognizedObject(recognitionText);
    } catch (err) {
      console.error('Azure API调用失败:', err);
      setErrorMessage(t('图像识别失败') + ': ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const saveAzureConfig = () => {
    // 保存到本地存储
    localStorage.setItem('AZURE_VISION_ENDPOINT', azureConfig.endpoint);
    localStorage.setItem('AZURE_VISION_KEY', azureConfig.key);
    alert(t('Azure 计算机视觉 API 配置已保存'));
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* semi-transparent mask */}
        <div className="absolute inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        {/* camera panel */}
        <div className="bg-white rounded-2xl z-10 w-[800px] max-h-[90vh] overflow-y-auto p-6">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4">{t('摄像头')}</h2>
            
            {errorMessage && (
              <div className="text-red-500 mb-4">{errorMessage}</div>
            )}
            
            <div className="relative">
              {cameraStream ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="rounded-lg border border-gray-300 mb-4 max-w-full" 
                    width="640"
                    height="480"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="w-[640px] h-[480px] bg-gray-200 flex items-center justify-center rounded-lg mb-4">
                  <p>{t('正在加载摄像头...')}</p>
                </div>
              )}
              
              {capturedImage && (
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center mb-4 rounded-lg">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="max-w-full max-h-full" 
                  />
                </div>
              )}
            </div>
            
            {recognizedObject && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg w-full">
                <h3 className="font-bold mb-2">{t('识别结果:')}</h3>
                <pre className="whitespace-pre-wrap">{recognizedObject}</pre>
              </div>
            )}
            
            <div className="flex space-x-4 mb-3">
              <button 
                onClick={captureImage}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                disabled={!cameraStream || isProcessing}
              >
                {isProcessing ? t('正在识别...') : t('拍照并识别')}
              </button>
              <button 
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                {t('关闭')}
              </button>
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {t('使用 Azure 计算机视觉 API 提供图像识别服务')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AboutLink() {
  const { t } = useTranslation();
  const [showAboutPanel, setShowAboutPanel] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowAboutPanel(true)}
        className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200"
      >
        <LuInfo className="mr-3" />
        <span>{t('About')}</span>
      </div>
      {showAboutPanel && (
        <AboutPanel onClose={() => { setShowAboutPanel(false) }} />
      )}
    </>
  );
}

function ConfigLink() {
  const { t } = useTranslation();
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowConfigPanel(true)}
        className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200"
      >
        <MdSettings className="mr-3" />
        <span>{t('APIConfig')}</span>
      </div>
      {showConfigPanel && (
        <ConfigPanel onClose={() => { setShowConfigPanel(false) }} />
      )}
    </>
  );
}

function ConfigPanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* semi-transparent mask */}
        <div className="absolute inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        {/* config panel */}
        <div className="bg-white rounded-2xl z-10 w-[800px] max-h-[90vh] overflow-y-auto p-6">
          <ConfigManager onConfigSaved={onClose} />
        </div>
      </div>
    </>
  );
}

function InitializationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedPracticeLanguage, setSelectedPracticeLanguage] = useState('en');
  const [showPracticeDropdown, setShowPracticeDropdown] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [showConfigFirst, setShowConfigFirst] = useState(false);

  // List of supported languages
  const supportedLanguages = ['en', 'zh', 'ja'] as const;

  // Native language names mapping
  const nativeLanguageNames = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
  } as const;

  // 检查是否存在保存的配置
  useEffect(() => {
    // 检查是否在Electron环境中
    if (typeof window !== 'undefined' && window.electron) {
      try {
        const userDataPath = window.electron.getUserDataPath();
        const envPath = `${userDataPath}/.env`;
        
        if (!window.electron.fs.existsSync(envPath)) {
          // 如果配置文件不存在，显示配置面板
          setShowConfigFirst(true);
        }
      } catch (error) {
        console.error('检查配置失败:', error);
      }
    }
  }, []);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setSelectedLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const handlePracticeLanguageChange = (lang: string) => {
    setSelectedPracticeLanguage(lang);
    setShowPracticeDropdown(false);
  };

  const defaultHandlers = [
    new TranslationHandler(nativeLanguageNames[selectedPracticeLanguage as keyof typeof nativeLanguageNames]),
    new GrammarCheckingHandler(),
    new TranscriptionImprovementHandler(),
    new RespGenerationHandler(),
  ]

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('languageSetup', 'true');
    localStorage.setItem('selectedLanguage', selectedLanguage);
    setGlobalChatSettings({
      ...defaultGlobalChatSettings,
      autoPlayAudio: autoPlayAudio,
      inputHandlers: defaultHandlers.map((handler) => ({ handler, display: true }))
    });
    // add template chats
    chatTemplates.forEach((template) => {
      const newChatSelection = AddNewChat(t(template.title.key), template.messages);
      dispatch(addNewChatWithoutSettingCurrentChat(newChatSelection.chatSelection));
    });
    // add the tutorial chat
    const newChatSelection = AddNewChat(
      t('Tutorial'),
      [new NextStepTutorialMessage(TutorialStateIDs.introduction, TutorialStateIDs.introduceQuickTranslationInstructions)],
      {
        usingGlobalSettings: false,
        inputHandlers: [
          { handler: new TutorialTranslationHandler('English'), display: true },
          { handler: new DisableHandlerDecorator(new GrammarCheckingHandler()), display: true },
          { handler: new DisableHandlerDecorator(new TranscriptionImprovementHandler()), display: true },
          { handler: new DisableHandlerDecorator(new RespGenerationHandler()), display: true },
        ],
        autoPlayAudio: false,
        inputComponent: {
          type: 'tutorialInput',
          payload: {
            stateID: TutorialStateIDs.introduction
          }
        },
        ChatISettings: {
          id: TutorialChatIntelligence.id,
          settings: {}
        }
      }
    );
    dispatch(addNewChat(newChatSelection.chatSelection));
    onClose();
  };

  // 如果需要先配置API
  if (showConfigFirst) {
    return (
      <>
        <SemiTransparentOverlay onClick={() => {}} />
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl z-10 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl max-h-screen overflow-y-auto custom-scrollbar p-8">
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/images/speak-ai-logo.png"
                alt="SpeakAI Logo"
                width={36}
                height={36}
                className="mr-3"
              />
              <h2 className="text-2xl font-bold text-gray-800">{t('Welcome to SpeakAI Desktop')}</h2>
              <p className="text-gray-600 mt-4">{t('configFirstMessage')}</p>
            </div>
            
            <ConfigManager onConfigSaved={() => setShowConfigFirst(false)} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SemiTransparentOverlay onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl z-10 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl max-h-screen overflow-y-auto custom-scrollbar p-8">
          <div className="flex flex-col">
            {/* Beta warning */}
            <div className="flex flex-row items-start mb-4 p-4 bg-yellow-50 rounded-lg">
              <IoMdInformationCircleOutline size={20} className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-yellow-700">{t('betaWarning')}</span>
            </div>
            {/* Welcome message */}
            <div className="flex flex-col items-center">
              {/* Logo and Title */}
              <div className="flex flex-row items-center mb-2">
                <Image
                  src="/images/speak-ai-logo.png"
                  alt="SpeakAI Logo"
                  width={36}
                  height={36}
                  className="mr-3"
                />
                <h2 className="text-2xl font-bold text-gray-800">{t('Welcome to SpeakAI Desktop')}</h2>
              </div>
              <p className="text-gray-400 mb-12">{t('welcomeMessage')}</p>
              <p className="text-gray-600 self-start mb-4">{t('Please set up your preferences to get started')}</p>
            </div>
            {/* Interface language selection */}
            <div className="flex flex-col mb-8">
              <div className="flex flex-row items-center justify-between relative">
                <span className="text-gray-700 font-bold">{t('Select Your Language')}</span>
                <div className="relative">
                  <DropdownMenuEntry
                    label={nativeLanguageNames[selectedLanguage as keyof typeof nativeLanguageNames]}
                    onClick={() => setShowLanguageDropdown(true)}
                  />
                  {showLanguageDropdown && (
                    <>
                      <DropdownMenu
                        className="absolute right-0 top-full"
                        menuItems={supportedLanguages.map(lang => ({
                          label: nativeLanguageNames[lang as keyof typeof nativeLanguageNames],
                          onClick: () => handleLanguageChange(lang)
                        }))}
                      />
                      <TransparentOverlay onClick={() => setShowLanguageDropdown(false)} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center">
                <IoMdInformationCircleOutline size={14} className="text-gray-400 mr-1" />
                <span className="text-gray-400 text-sm">{t('interfaceLanguageHint')}</span>
              </div>
            </div>

            {/* Practice language selection */}
            <div className="flex flex-col relative mb-8">
              <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Select Practice Language')}</span>
                <div className="relative">
                  <DropdownMenuEntry
                    label={t(`lang.${selectedPracticeLanguage}`)}
                    onClick={() => setShowPracticeDropdown(true)}
                  />
                  {showPracticeDropdown && (
                    <>
                      <DropdownMenu
                        className="absolute right-0 top-full"
                        menuItems={supportedLanguages.map(lang => ({
                          label: t(`lang.${lang}`),
                          onClick: () => handlePracticeLanguageChange(lang)
                        }))}
                      />
                      <TransparentOverlay onClick={() => setShowPracticeDropdown(false)} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center">
                <IoMdInformationCircleOutline size={14} className="text-gray-400 mr-1" />
                <span className="text-gray-400 text-sm">{t('practiceLanguageHint')}</span>
              </div>
            </div>

            {/* TTS settings */}
            <SpeechSettings className="mb-4" />

            {/* Auto play audio settings */}
            <div className="flex flex-col mb-8">
              <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Auto Play Audio')}</span>
                <Switch checked={autoPlayAudio}
                  width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                  onChange={(checked: boolean) => { setAutoPlayAudio(checked) }} />
              </div>
              {/* Add description */}
              <div className="flex flex-row items-start">
                <IoMdInformationCircleOutline size={16} className="text-gray-400 mr-1 mt-1" />
                <span className="text-gray-400 text-sm">{t('autoPlayAudioDescription')}</span>
              </div>
            </div>

            {/* Confirm button */}
            <div className="flex justify-end">
              <FilledButton onClick={handleConfirm} className="px-8 py-2">
                {t('Confirm')}
              </FilledButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const chatSelectionList = useAppSelector(state => state.chatSelectionList);
  const chatSelected = chatSelectionList.currentChatID !== null;
  const [showInitializationPanel, setShowInitializationPanel] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // 检查是否配置了API
    if (typeof window !== 'undefined' && window.electron) {
      try {
        const userDataPath = window.electron.getUserDataPath();
        const envPath = `${userDataPath}/.env`;
        
        if (window.electron.fs.existsSync(envPath)) {
          setIsConfigured(true);
          
          // 检查是否设置了语言
          const languageSetup = localStorage.getItem('languageSetup');
          if (!languageSetup) {
            setShowInitializationPanel(true);
          } else {
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage) {
              i18n.changeLanguage(savedLanguage);
            }
          }
        } else {
          // 如果配置文件不存在，显示初始化面板
          setShowInitializationPanel(true);
        }
      } catch (error) {
        console.error('检查配置失败:', error);
        setShowInitializationPanel(true);
      }
    } else {
      // 浏览器环境
      const languageSetup = localStorage.getItem('languageSetup');
      if (!languageSetup) {
        setShowInitializationPanel(true);
      } else {
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage) {
          i18n.changeLanguage(savedLanguage);
        }
      }
    }
  }, []);

  const finishInitialization = () => {
    setShowInitializationPanel(false);
  };

  return (
    <>
      {showInitializationPanel && <InitializationPanel onClose={finishInitialization} />}
      <div className="flex flex-row h-full w-full">
        {/* sidebar */}
        <div className="flex px-2 pb-12 pt-4 flex-col w-[250px] bg-[#F9F9F9] shadow-md">
          {/* logo */}
          <div className="flex flex-row pl-4 items-center justify-start">
            <Image
              src="/images/speak-ai-logo.png" alt="SpeakAI Logo"
              width={36} height={36} className="mr-3"
            />
            <span className="text-gray-600 text-2xl">SpeakAI</span>
          </div>
          {/* chat */}
          <ChatSelectionList className="mt-8 flex-1 overflow-y-auto w-[250px]"
            chatSelectionListLoader={loadChatSelectionList} />
          <div className="border-t border-gray-300 my-5 mx-3"></div>
          {/* settings, odds and ends */}
          <div className="flex flex-col">
            <NewChat className="mb-1" />
            <SettingsEntry />
            <ConfigLink />
            <RealtimeVideoLink />
            <DigitalHumanLink />
            <AboutLink />
          </div>
        </div>
        {/* content */}
        <div className="w-full">
          {chatSelected ? (
            <Chat className="h-full w-full"
              chatID={chatSelectionList.currentChatID as string}
              chatTitle={chatSelectionList.selectionList.find(chat => chat.id === chatSelectionList.currentChatID)?.title as string}
              key={chatSelectionList.currentChatID as string}
              loadChatByID={loadChatMessages} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Image
                src="/images/speak-ai-logo.png"
                alt="SpeakAI Logo"
                width={120}
                height={120}
                className="mb-8 opacity-50"
              />
              <h2 className="text-2xl font-medium text-gray-500 mb-6">{t('welcomeToSpeakAI')}</h2>
              <p className="text-gray-400 max-w-md text-center mb-8">{t('selectChatOrCreateNew')}</p>
              <FilledButton 
                onClick={() => {
                  const newChat = AddNewChat(t('New Chat'), []);
                  dispatch(addNewChat(newChat.chatSelection));
                }}
                className="px-6 py-3"
              >
                {t('startNewChat')}
              </FilledButton>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </>
  );
}
