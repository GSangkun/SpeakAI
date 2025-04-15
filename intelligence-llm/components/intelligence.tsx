'use client'

import { TransparentButton } from "@/app/ui-utils/components/button"
import type { CustomLLMServiceChatISettings, OpenAIChatISettings } from "../lib/intelligence"
import { getLLMServiceSettingsRecord } from "../lib/llm-service"
import { OpenAICompatibleAPIServiceSettings, OpenAIServiceSettings } from "./llm-service"
import { useState } from "react"
import { IoMdInformationCircleOutline } from "react-icons/io"
import { useTranslation } from "react-i18next"

export function OpenAIChatISettings(
    { settings: untypedSettings, updateChatISettings }: { settings: object, updateChatISettings: (settings: object) => void }
) {
    const settings = untypedSettings as OpenAIChatISettings
    const [openaiSvcSettingsKey, setOpenaiSvcSettingsKey] = useState(0)

    let openaiSvcSettings = {}
    if (settings.settingsType === 'local') {
        openaiSvcSettings = settings.localSettings!
    } else {
        const llmServiceSettings = getLLMServiceSettingsRecord('openai')
        if (!llmServiceSettings) {
            throw new Error(`LLM service settings not found: ${settings.settingsType}`)
        }
        openaiSvcSettings = llmServiceSettings.settings
    }

    const isLocal = settings.settingsType === 'local'

    function resetToLinkTypeSettings() {
        updateChatISettings({
            'settingsType': 'link'
        })
        setOpenaiSvcSettingsKey(openaiSvcSettingsKey + 1)
    }

    return <div className="flex flex-col relative">
        <OpenAIServiceSettings key={openaiSvcSettingsKey} settings={openaiSvcSettings}
            updateSettings={(openaiSettings) => {
                updateChatISettings({
                    'settingsType': 'local',
                    'localSettings': openaiSettings
                })
            }} />
        {isLocal &&
            <TransparentButton className="absolute right-0 top-0" onClick={() => { resetToLinkTypeSettings() }}> Reset to Default </TransparentButton>
        }
    </div>
}

export function CustomLLMChatISettings(
    { settings: untypedSettings, updateChatISettings }: { settings: object, updateChatISettings: (settings: object) => void }
) {
    const settings = untypedSettings as CustomLLMServiceChatISettings
    const [customLLMSvcSettingsKey, setCustomLLMSvcSettingsKey] = useState(0)

    let customLLMSvcSettings: { name: string } & object
    if (settings.settingsType === 'local') {
        customLLMSvcSettings = settings.localSettings!
    } else {
        const llmServiceSettings = getLLMServiceSettingsRecord(settings.svcID)
        if (!llmServiceSettings) {
            throw new Error(`Custom LLM service settings not found: ${settings.svcID}`)
        }
        customLLMSvcSettings = llmServiceSettings.settings as { name: string } & object
    }

    function resetToLinkTypeSettings() {
        updateChatISettings({
            'settingsType': 'link',
            'svcID': settings.svcID
        })
        setCustomLLMSvcSettingsKey(customLLMSvcSettingsKey + 1)
    }

    const isLocal = settings.settingsType === 'local'

    return <div className="flex flex-col relative">
        <OpenAICompatibleAPIServiceSettings key={customLLMSvcSettingsKey} settings={customLLMSvcSettings}
            updateSettings={(customLLMSvcSettings) => {
                updateChatISettings({
                    'settingsType': 'local',
                    'svcID': settings.svcID,
                    'localSettings': customLLMSvcSettings
                })
            }} />
        {isLocal &&
            <TransparentButton className="absolute right-0 top-0" onClick={() => { resetToLinkTypeSettings() }}> Reset to Default </TransparentButton>
        }
    </div>
}

export function FreeTrialChatISettings(
    { }: { settings: object, updateChatISettings: (settings: object) => void }
) {
    const { t } = useTranslation()
    return <div>
        <div className="flex flex-row items-start mt-[-20px] mb-4 text-sm text-gray-500">
            <IoMdInformationCircleOutline size={15} className="mr-2 mt-1 flex-shrink-0" />
            <span>{t('freeTrialChatIntelligenceIntroduction')}</span>
        </div>
    </div>
}

export function SpeakAIChatISettings(
    { }: { settings: object, updateChatISettings: (settings: object) => void }
) {
    const { t } = useTranslation()
    return <div>
        <div className="flex flex-row items-start mt-[-20px] mb-4 text-sm text-gray-500">
            <IoMdInformationCircleOutline size={15} className="mr-2 mt-1 flex-shrink-0" />
            <span>{t('speakAIChatIntelligenceIntroduction')}</span>
        </div>
    </div>
}