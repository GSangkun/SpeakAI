"use client";

import { useState, useEffect } from 'react';
import { FilledButton } from '../ui-utils/components/button';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// 定义配置项接口
interface ConfigItem {
  key: string;
  label: string;
  value: string;
  description: string;
  required: boolean;
}

export function ConfigManager({ onConfigSaved }: { onConfigSaved: () => void }) {
  const { t } = useTranslation();
  const [configItems, setConfigItems] = useState<ConfigItem[]>([
    {
      key: 'OPENAI_CHAT_COMPLETION_URL',
      label: 'LLM API URL',
      value: 'https://api.deepseek.com/v1/chat/completions',
      description: t('llmApiUrlDescription'),
      required: true
    },
    {
      key: 'OPENAI_API_KEY',
      label: 'LLM API Key',
      value: '',
      description: t('llmApiKeyDescription'),
      required: true
    },
    {
      key: 'OPENAI_MODEL_NAME',
      label: 'LLM 模型名称',
      value: 'deepseek-chat',
      description: t('llmModelNameDescription'),
      required: true
    },
    {
      key: 'STT_API_URL',
      label: '语音转文字 API URL',
      value: 'https://api.siliconflow.cn/v1/audio/transcriptions',
      description: t('sttApiUrlDescription'),
      required: true
    },
    {
      key: 'SILICONFLOW_API_KEY',
      label: '语音转文字 API Key',
      value: '',
      description: t('sttApiKeyDescription'),
      required: true
    },
    {
      key: 'AZURE_TTS_KEY',
      label: 'Azure 语音合成 Key',
      value: '',
      description: t('azureTtsKeyDescription'),
      required: false
    },
    {
      key: 'AZURE_TTS_REGION',
      label: 'Azure 语音合成区域',
      value: 'southeastasia',
      description: t('azureTtsRegionDescription'),
      required: false
    }
  ]);

  // 在组件挂载时检查是否有保存的配置
  useEffect(() => {
    // 检查是否在Electron环境中
    if (typeof window !== 'undefined' && window.electron) {
      try {
        const userDataPath = window.electron.getUserDataPath();
        const envPath = `${userDataPath}/.env`;
        
        if (window.electron.fs.existsSync(envPath)) {
          const envContent = window.electron.fs.readFile(envPath);
          const envLines = envContent.split('\n');
          
          const newConfigItems = [...configItems];
          
          envLines.forEach(line => {
            if (line.trim() !== '' && !line.startsWith('#')) {
              const [key, value] = line.split('=');
              if (key && value) {
                const configItemIndex = newConfigItems.findIndex(item => item.key === key.trim());
                if (configItemIndex !== -1) {
                  newConfigItems[configItemIndex].value = value.trim();
                }
              }
            }
          });
          
          setConfigItems(newConfigItems);
        }
      } catch (error) {
        console.error('读取配置失败:', error);
      }
    }
  }, []);

  // 更新配置项的值
  const handleConfigChange = (index: number, value: string) => {
    const newConfigItems = [...configItems];
    newConfigItems[index].value = value;
    setConfigItems(newConfigItems);
  };

  // 保存配置
  const saveConfig = () => {
    // 验证必填项
    const missingRequiredFields = configItems
      .filter(item => item.required && item.value.trim() === '')
      .map(item => item.label);
    
    if (missingRequiredFields.length > 0) {
      toast.error(`${t('missingRequiredFields')}: ${missingRequiredFields.join(', ')}`);
      return;
    }
    
    try {
      // 生成.env文件内容
      const envContent = configItems
        .map(item => `${item.key}=${item.value}`)
        .join('\n');
      
      // 检查是否在Electron环境中
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.createConfigFile(envContent);
        toast.success(t('configSavedSuccess'));
        onConfigSaved();
      } else {
        // 在浏览器环境中，可以使用localStorage作为临时存储
        localStorage.setItem('speakaiConfig', JSON.stringify(configItems));
        toast.success(t('configSavedSuccess'));
        onConfigSaved();
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error(t('configSaveError'));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">{t('configTitle')}</h1>
      
      <div className="space-y-6">
        {configItems.map((item, index) => (
          <div key={item.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {item.label} {item.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleConfigChange(index, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-end">
        <FilledButton onClick={saveConfig} className="px-6 py-2">
          {t('saveConfig')}
        </FilledButton>
      </div>
    </div>
  );
} 