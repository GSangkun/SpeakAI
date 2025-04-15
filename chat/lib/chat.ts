'use client'
import { InputHandler } from "../components/input-handlers";
import { SpeakAIMessage, FreeTrialMessage, HintMessage, StreamingTextMessage, SystemMessage, TextMessage } from "../components/message";
import { Message } from "./message";
import { setChatSettingsData } from "./chat-persistence";
import { generateUUID } from "@/app/lib/uuid";
import { QueClickOnTranslationMsg, NonInteractiveTutorialMessage, IdentifiedTextMessage, NextStepTutorialMessage } from "../components/tutorial-message";
import { GlobalDefaultChatSettingID } from "@/app/settings/lib/settings";
import { loadChatSettings } from "@/app/settings/lib/settings";
import { setGlobalChatSettings } from "@/app/settings/lib/settings";
import { setLocalChatSettings } from "@/app/settings/lib/settings";
import { switchToLocalChatSettings } from "@/app/settings/lib/settings";
import { loadGlobalChatSettings } from "@/app/settings/lib/settings";
import { LocalChatSettings } from "../components/chat-settings";
import { ChatSelection } from "./chat-types";

// ============================= business logic =============================


// ===== Chat Messages =====

export function loadChatMessages(chatID: string): Message[] {
    // 从 localStorage 根据 chatID 读取消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);

    // 如果 localStorage 中没有数据，返回空数组
    if (!messageListJSON) {
        return [];
    }

    const rawMessages: string[] = JSON.parse(messageListJSON)
    // TODO set up a global hub to manage message constructors
    const messageList: Message[] = rawMessages.map((rawMsg) => {
        const { type, ...rest } = JSON.parse(rawMsg);
        switch (type) {
            case 'systemMessage':
                return SystemMessage.deserialize(JSON.stringify(rest));
            case 'text':
                return TextMessage.deserialize(JSON.stringify(rest));
            case 'streamingText':
                return StreamingTextMessage.deserialize(JSON.stringify(rest));
            case 'speakAI':
                return SpeakAIMessage.deserialize(JSON.stringify(rest));
            case FreeTrialMessage.type:
                return FreeTrialMessage.deserialize();
            case QueClickOnTranslationMsg._type:
                return QueClickOnTranslationMsg.deserialize();
            case NonInteractiveTutorialMessage._type:
                return NonInteractiveTutorialMessage.deserialize(JSON.stringify(rest));
            case IdentifiedTextMessage._type:
                return IdentifiedTextMessage.deserialize(JSON.stringify(rest));
            case NextStepTutorialMessage._type:
                return NextStepTutorialMessage.deserialize(JSON.stringify(rest));
            case HintMessage.type:
                return HintMessage.deserialize(JSON.stringify(rest));
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    });

    return messageList;
}

export function addInputHandlersInChat(chatID: string, handlers: InputHandler[]): void {
    // first check if the chat is using global settings
    const chatSettings = loadChatSettings(chatID);
    if (chatSettings.usingGlobalSettings) {
        // add the handlers to the global settings
        const globalSettings = loadGlobalChatSettings();
        globalSettings.inputHandlers.push(...handlers.map((handler) => ({
            handler: handler,
            display: true
        })));
        setGlobalChatSettings(globalSettings);
    } else {
        // add the handlers to the chat local settings
        chatSettings.inputHandlers.push(...handlers.map((handler) => ({
            handler: handler,
            display: true
        })));
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: chatSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: chatSettings.ChatISettings,
            autoPlayAudio: chatSettings.autoPlayAudio,
            inputComponent: chatSettings.inputComponent
        });
    }
}

export function updateInputHandlerInLocalStorage(chatID: string, handlerIndex: number, handler: InputHandler): void {
    const chatSettings = loadChatSettings(chatID);
    if (chatSettings.usingGlobalSettings) {
        // update the global settings
        const globalSettings = loadGlobalChatSettings();
        globalSettings.inputHandlers[handlerIndex] = { handler: handler, display: true };
        setChatSettingsData(GlobalDefaultChatSettingID, {
            rawInputHandlers: globalSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: globalSettings.ChatISettings,
            autoPlayAudio: globalSettings.autoPlayAudio,
            inputComponent: globalSettings.inputComponent
        });
    } else {
        // update the chat local settings
        chatSettings.inputHandlers[handlerIndex] = { handler: handler, display: true };
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: chatSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: chatSettings.ChatISettings,
            autoPlayAudio: chatSettings.autoPlayAudio,
            inputComponent: chatSettings.inputComponent
        });
    }
}

export function updateInputSettingsPayloadInLocalStorage(chatID: string, payload: object): void {
    const chatSettings = loadChatSettings(chatID);
    if (chatSettings.usingGlobalSettings) {
        const globalSettings = loadGlobalChatSettings();
        globalSettings.inputComponent.payload = payload;
        setGlobalChatSettings(globalSettings);
    } else {
        chatSettings.inputComponent.payload = payload;
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: chatSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ...chatSettings
        });
    }
}

export function loadChatSelectionList(): {
    chatSelectionList: ChatSelection[], currentSelectedChatID?: string
} {
    // 从 localStorage 读取 chat selection list 和当前选择的 chat ID
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const currentSelectedChatID = localStorage.getItem('currentSelectedChatID');

    // 如果 localStorage 中没有数据，返回默认值
    if (!chatSelectionListJSON) {
        return {
            chatSelectionList: [],
            currentSelectedChatID: undefined
        };
    }

    return {
        chatSelectionList: JSON.parse(chatSelectionListJSON),
        currentSelectedChatID: currentSelectedChatID || undefined
    };
}

// ============================= persistence =============================

export function persistMessageUpdateInChat(chatID: string, messageID: number, updateMessage: Message): void {
    // 从 localStorage 读取现有的消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);
    const messageList: string[] = messageListJSON ? JSON.parse(messageListJSON) : [];

    // 检查消ID是否存在
    if (messageID < 0 || messageID >= messageList.length) {
        console.error("Invalid message ID");
        return;
    }

    // 更新消息
    messageList[messageID] = updateMessage.serialize();

    // 更新 localStorage 中的消息列表
    localStorage.setItem(`chat_${chatID}`, JSON.stringify(messageList));
}

export function getNextChatCounter(): number {
    let chatCounter = parseInt(localStorage.getItem('chatCounter') || '0', 10);
    chatCounter += 1;
    localStorage.setItem('chatCounter', chatCounter.toString());
    return chatCounter;
}

export function AddNewChat(
    chatTitle: string,
    initialMessageList: Message[] = [],
    chatSettings?: LocalChatSettings, // TODO tech-debt: LocalChatSettings is for rendering, shouldn't be used as a parameter of modification actions
): {
    chatSelection: ChatSelection,
} {
    // 从 localStorage 读取现有的 chat selection list
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const chatSelectionList: ChatSelection[] = chatSelectionListJSON ? JSON.parse(chatSelectionListJSON) : [];

    // 新的 chat ID
    const newChatID = generateUUID();

    // 新的聊天选择项
    const newChatSelection: ChatSelection = { id: newChatID, title: chatTitle };

    // 将新聊天添加到列表中
    chatSelectionList.unshift(newChatSelection);

    // 更新 localStorage 中的 chat selection list
    localStorage.setItem('chatSelectionList', JSON.stringify(chatSelectionList));

    // 将初始消息列表保存到 localStorage 中
    localStorage.setItem(`chat_${newChatID}`, JSON.stringify(initialMessageList.map((msg) => msg.serialize())));

    if (chatSettings) {
        if (chatSettings.usingGlobalSettings) {
            switchToLocalChatSettings(newChatID);
        } else {
            setLocalChatSettings(newChatID, chatSettings);
        }
    }

    return {
        chatSelection: newChatSelection
    };
}

export function AddMesssageInChat(chatID: string, messages: Message[]): void {
    if (messages.length === 0) {
        return
    }
    // 从 localStorage 读取现有的消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);
    const messageList: string[] = messageListJSON ? JSON.parse(messageListJSON) : [];

    // 将新的消息添加到消息列表中
    messageList.push(...messages.map((msg) => msg.serialize()));

    // 更新 localStorage 中的消息列表
    localStorage.setItem(`chat_${chatID}`, JSON.stringify(messageList));
}

export function UpdateChatTitle(chatID: string, newTitle: string): void {
    // 从 localStorage 读取现有的 chat selection list
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const chatSelectionList: ChatSelection[] = chatSelectionListJSON ? JSON.parse(chatSelectionListJSON) : [];

    // 更新 chat selection list 中的 title
    const chatSelection = chatSelectionList.find(chat => chat.id === chatID);
    if (chatSelection) {
        chatSelection.title = newTitle;
    }

    // 更新 localStorage 中的 chat selection list
    localStorage.setItem('chatSelectionList', JSON.stringify(chatSelectionList));
}

export interface ChatSelectionListLoader {
    (): { chatSelectionList: ChatSelection[], currentSelectedChatID?: string };
}

export interface ChatLoader {
    (chatID: string): Message[]
}

export interface AddNewChat {
    (chatTitle?: string, initialMessageList?: Message[]): {
        chatSelection: ChatSelection
    }
}

export interface AddMesssageInChat {
    (chatID: string, message: Message): void
}

export function deleteChatData(chatID: string) {
    // Remove chat from chatSelectionList
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    if (chatSelectionListJSON) {
        const chatSelectionList: ChatSelection[] = JSON.parse(chatSelectionListJSON);
        const updatedChatSelectionList = chatSelectionList.filter(chat => chat.id !== chatID);
        localStorage.setItem('chatSelectionList', JSON.stringify(updatedChatSelectionList));
    }

    // Remove chat messages
    localStorage.removeItem(`chat_${chatID}`);

    // Remove input handlers
    localStorage.removeItem(`inputHandlers_${chatID}`);

    // Update currentSelectedChatID if necessary
    const currentSelectedChatID = localStorage.getItem('currentSelectedChatID');
    if (currentSelectedChatID === chatID) {
        localStorage.removeItem('currentSelectedChatID');
    }
}
