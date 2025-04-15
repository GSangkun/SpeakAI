'use client'
import { createContext } from "react";
import { InputHandler } from "./input-handlers";


export type LocalChatSettings = {
    usingGlobalSettings: boolean;
} & ChatSettings;

export type ChatSettings = {
    ChatISettings: {
        id: string;
        settings: object;
    };
    inputHandlers: { handler: InputHandler; display: boolean; }[];
    inputComponent: {
        type: string;
        payload: object;
    };
    autoPlayAudio: boolean;
};

export const ChatSettingsContext = createContext<LocalChatSettings | null>(null);
