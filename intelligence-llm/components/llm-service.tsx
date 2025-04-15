'use client'

import { useTranslation } from "react-i18next";
import { OpenAICompatibleAPIService, OpenAICompatibleAPISettings, OpenAIService, OpenAISettings, SiliconFlowService } from "../lib/llm-service";
import { DropdownMenu, DropdownMenuEntry } from "@/app/ui-utils/components/DropdownMenu";
import { useState } from "react";
import { TransparentOverlay } from "@/app/ui-utils/components/overlay";
import { FilledButton } from "@/app/ui-utils/components/button";
import { IoMdInformationCircleOutline } from "react-icons/io";


export interface LLMSettingsProps<T> {
    settings: T;
    updateSettings: (settings: T) => void;
}
export type LLMSettingsComponent<T> = (props: LLMSettingsProps<T>) => React.ReactNode;

const settingsRegistry: Record<string, LLMSettingsComponent<object>> = {};
export function getLLMSettingsComponent(type: string): LLMSettingsComponent<object> {
    const component = settingsRegistry[type];
    if (!component) {
        throw new Error(`Settings component for ${type} not found`);
    }
    return component;
}
export function registerLLMSettingsComponent(
    type: string,
    component: LLMSettingsComponent<object>
) {
    if (settingsRegistry[type]) {
        throw new Error(`Settings component for ${type} already registered`);
    }
    settingsRegistry[type] = component;
}

// ============================= LLM Service Settings Components =============================

export function OpenAICompatibleAPIServiceSettings({ settings: unTypedSettings, updateSettings }: LLMSettingsProps<object>) {
    const settings = unTypedSettings as OpenAICompatibleAPISettings;
    const { t } = useTranslation();

    const [name, setName] = useState(settings.name);
    const [ChatURL, setChatURL] = useState(settings.URL);
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [chatCompletionModel, setChatCompletionModel] = useState(settings.chatCompletionModel);

    const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
    const settingsChanged: boolean = lastTimeSavedSettings.URL !== ChatURL
        || lastTimeSavedSettings.apiKey !== apiKey
        || lastTimeSavedSettings.name !== name
        || lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

    return <div className="flex flex-col">
        {/* name */}
        <div className="flex flex-col mb-8">
            <span className="text-gray-700 font-bold mb-2">{t('Name')}</span>
            <input
                type="text"
                placeholder="Service Name"
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={name}
                onChange={e => setName(e.target.value)}
            />
        </div>
        {/* model */}
        <div className="flex flex-col mb-8">
            <span className="text-gray-700 font-bold mb-2">{t('Model-Single-Form')}</span>
            <input
                type="text"
                placeholder="gpt-3.5-turbo"
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={chatCompletionModel}
                onChange={e => setChatCompletionModel(e.target.value)}
            />
        </div>
        {/* base url */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{'URL'}</span>
            <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
                <IoMdInformationCircleOutline size={14} className="mr-1" />
                <span>{t('Please enter the complete URL including the path')}</span>
            </div>
            <input type="text" id="base-url" placeholder="https://api.openai.com/v1/chat/completions"
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={ChatURL} onChange={e => setChatURL(e.target.value)} />
        </div>
        {/* api key */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{t('API Key')}</span>
            <input type="text" id="api-key" placeholder="sk-..."
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        {/* save button */}
        {settingsChanged && <FilledButton
            className="w-fit self-end"
            onClick={() => {
                const newSettings = {
                    name,
                    URL: ChatURL,
                    apiKey,
                    chatCompletionModel
                };
                setLastTimeSavedSettings(newSettings);
                updateSettings(newSettings)
            }}>
            {t('Save')}
        </FilledButton>}
    </div>
}

export function OpenAIServiceSettings({ settings: unTypedSettings, updateSettings }: LLMSettingsProps<object>) {
    const settings = unTypedSettings as OpenAISettings;
    const { t } = useTranslation();

    const [chatURL, setChatURL] = useState(settings.URL);
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [chatCompletionModel, setChatCompletionModel] = useState(settings.chatCompletionModel);

    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const toggleModelDropdown = () => setShowModelDropdown(!showModelDropdown);

    const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
    const settingsChanged: boolean = lastTimeSavedSettings.URL !== chatURL
        || lastTimeSavedSettings.apiKey !== apiKey
        || lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

    return <div className="flex flex-col">
        {/* model */}
        <div className="flex flex-col mb-8">
            <span className="text-gray-700 font-bold mb-2">{t('Model-Single-Form')}</span>
            <div className="relative">
                <DropdownMenuEntry className="w-fit bg-gray-100" label={chatCompletionModel} onClick={toggleModelDropdown} />
                {showModelDropdown && <> <DropdownMenu className="absolute left-0 top-full"
                    menuItems={OpenAIService.availableChatModels.map(
                        model => ({ label: model, onClick: () => { setChatCompletionModel(model); toggleModelDropdown() } })
                    )}
                />
                    <TransparentOverlay onClick={toggleModelDropdown} />
                </>}
            </div>
        </div>
        {/* base url */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{'URL'}</span>
            <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
                <IoMdInformationCircleOutline size={14} className="mr-1" />
                <span>{t('Please enter the complete URL including the path')}</span>
            </div>
            <input type="text" id="base-url" placeholder="https://api.openai.com/v1/chat/completions"
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={chatURL} onChange={e => setChatURL(e.target.value)} />
        </div>
        {/* api key */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{t('API Key')}</span>
            <input type="text" id="api-key" placeholder="sk-..."
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        {/* save button */}
        {settingsChanged && <FilledButton
            className="w-fit self-end"
            onClick={() => {
                setLastTimeSavedSettings({ URL: chatURL, apiKey, chatCompletionModel });
                updateSettings({ URL: chatURL, apiKey, chatCompletionModel })
            }}>
            {t('Save')}
        </FilledButton>}
    </div>
}

export function SiliconFlowServiceSettings({ settings: unTypedSettings, updateSettings }: LLMSettingsProps<object>) {
    const settings = unTypedSettings as OpenAISettings;
    const { t } = useTranslation();

    const [chatURL, setChatURL] = useState(settings.URL);
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [chatCompletionModel, setChatCompletionModel] = useState(settings.chatCompletionModel);

    const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
    const settingsChanged: boolean = lastTimeSavedSettings.URL !== chatURL
        || lastTimeSavedSettings.apiKey !== apiKey
        || lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

    return <div className="flex flex-col">
        {/* model */}
        <div className="flex flex-col mb-8">
            <span className="text-gray-700 font-bold mb-2">{t('Model-Single-Form')}</span>
            <input
                type="text"
                placeholder="gpt-3.5-turbo"
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={chatCompletionModel}
                onChange={e => setChatCompletionModel(e.target.value)}
            />
        </div>
        {/* base url */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{'URL'}</span>
            <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
                <IoMdInformationCircleOutline size={14} className="mr-1" />
                <span>{t('Please enter the complete URL including the path')}</span>
            </div>
            <input type="text" id="base-url" placeholder={SiliconFlowService.defaultChatCompletionURL}
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={chatURL} onChange={e => setChatURL(e.target.value)} />
        </div>
        {/* api key */}
        <div className="mb-8 flex flex-col">
            <span className="text-gray-700 font-bold mb-2">{t('API Key')}</span>
            <input type="text" id="api-key" placeholder="sk-..."
                className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>
        {/* save button */}
        {settingsChanged && <FilledButton
            className="w-fit self-end"
            onClick={() => {
                setLastTimeSavedSettings({ URL: chatURL, apiKey, chatCompletionModel });
                updateSettings({ URL: chatURL, apiKey, chatCompletionModel })
            }}>
            {t('Save')}
        </FilledButton>}
    </div>
}

registerLLMSettingsComponent(OpenAIService.type, OpenAIServiceSettings);
registerLLMSettingsComponent(SiliconFlowService.type, SiliconFlowServiceSettings);
registerLLMSettingsComponent(OpenAICompatibleAPIService.type, OpenAICompatibleAPIServiceSettings);