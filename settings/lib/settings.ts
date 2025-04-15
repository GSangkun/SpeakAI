import { ChatSettings, LocalChatSettings } from "@/app/chat/components/chat-settings";
import { inputComponentType } from "@/app/chat/components/input-types";
import { GrammarCheckingHandler, InputHandler, RespGenerationHandler, TranslationHandler } from "@/app/chat/components/input-handlers";
import { loadChatSettingsData, setChatSettingsData } from "@/app/chat/lib/chat-persistence";

// side effect: if the global settings are not found, set them to the default value
export function loadGlobalChatSettings(): ChatSettings {
    const chatSettingsData = loadChatSettingsData(GlobalDefaultChatSettingID);
    if (!chatSettingsData) {
        setGlobalChatSettings(defaultGlobalChatSettings);
        return defaultGlobalChatSettings;
    }
    const inputHandlers = chatSettingsData.rawInputHandlers.map((rawHandler) => ({
        handler: InputHandler.deserialize(rawHandler.payload),
        display: rawHandler.display
    }));
    return {
        autoPlayAudio: chatSettingsData.autoPlayAudio,
        ChatISettings: chatSettingsData.ChatISettings,
        inputHandlers: inputHandlers,
        inputComponent: chatSettingsData.inputComponent
    };
}

export function switchToLocalChatSettings(chatID: string): void {
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
}

export function switchToGlobalChatSettings(chatID: string): void {
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: true }));
}

// mark the chat as using local settings and save the settings
export function setLocalChatSettings(chatID: string, chatSettings: ChatSettings): void {
    // TODO tech-debt: move to chat-persistence.ts
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
    const { inputHandlers, ...rest } = chatSettings; // exclude unserializable `inputHandlers` from the settings
    setChatSettingsData(`chatSettings_${chatID}`, {
        rawInputHandlers: inputHandlers.map((handler) => ({
            payload: handler.handler.serialize(),
            display: handler.display
        })),
        ...rest
    });
}

export function setGlobalChatSettings(settings: ChatSettings): void {
    setChatSettingsData(GlobalDefaultChatSettingID, {
        rawInputHandlers: settings.inputHandlers.map((handler) => ({
            payload: handler.handler.serialize(),
            display: handler.display
        })),
        ChatISettings: settings.ChatISettings,
        autoPlayAudio: settings.autoPlayAudio,
        inputComponent: settings.inputComponent
    });
}

// read chat settings, if not found, create from global settings
export function loadChatSettings(chatID: string): LocalChatSettings {

    // check if the chat is using global settings
    const chatMetadataJSON = localStorage.getItem(`chatMetadata_${chatID}`);
    if (!chatMetadataJSON) {
        return { usingGlobalSettings: true, ...loadGlobalChatSettings() };
    }
    // if so, return global settings
    const chatMetadata: { usingGlobalSettings: boolean; } = JSON.parse(chatMetadataJSON);
    if (chatMetadata.usingGlobalSettings) {
        return { usingGlobalSettings: true, ...loadGlobalChatSettings() };
    }
    // if not, return the chat local settings
    const rawChatSettings = loadChatSettingsData(`chatSettings_${chatID}`);
    if (!rawChatSettings) {
        const globalSettings = loadGlobalChatSettings();
        localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: globalSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ...globalSettings
        });
        return { usingGlobalSettings: false, ...globalSettings };
    }
    // TODO tech-dept: ts 类型检查不够严格，之前 rawInputHandlers 字段被传递到 LocalChatSettings 中也没有报错，导致了 BUG，看下有什么办法可以编译时检查出来
    const { rawInputHandlers, ...rest } = rawChatSettings;
    return {
        usingGlobalSettings: false,
        ...rest,
        inputHandlers: rawInputHandlers.map((rawHandler) => ({
            handler: InputHandler.deserialize(rawHandler.payload),
            display: rawHandler.display
        }))
    };
}

export const GlobalDefaultChatSettingID = 'global_default_chat_settings';

export const defaultGlobalChatSettings: ChatSettings = {
    ChatISettings: {
        // id: FreeTrialChatIntelligence.id,
        id: 'free_trial', // TODO tech-debt: to avoid circular dependency, temporarily hardcode the id
        settings: {}
    },
    autoPlayAudio: false,
    inputHandlers: [
        { handler: new TranslationHandler("English"), display: true },
        { handler: new RespGenerationHandler(), display: true },
        { handler: new GrammarCheckingHandler(), display: true }
    ],
    inputComponent: {
        type: inputComponentType,
        payload: {}
    }
};

