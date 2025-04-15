import { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import { LocalChatSettings } from "./chat-settings";


// ==================== redux ====================
export type ModifiedLocalChatSettings = Omit<LocalChatSettings, 'inputHandlers'> & {
    // InputHandler is not serializable, so transfer them to string before stored in redux
    inputHandlers: { handler: string; display: boolean; }[];
};

export const initCurrentChatSettingsState: {
    currentChatID: string | undefined;
    currentChatSettings: ModifiedLocalChatSettings | undefined;
} = {
    currentChatID: undefined,
    currentChatSettings: undefined
};

const currentChatSettingsSlice = createSlice({
    name: 'currentChatSettings',
    initialState: initCurrentChatSettingsState,
    reducers: {
        unsetCurrentChatSettings: (state) => {
            state.currentChatID = undefined
            state.currentChatSettings = undefined
        },
        setCurrentChatSettings: (state, newState: PayloadAction<{ chatID: string, chatSettings: ModifiedLocalChatSettings }>) => {
            state.currentChatID = newState.payload.chatID
            state.currentChatSettings = newState.payload.chatSettings
        }
    }
})

export const { setCurrentChatSettings, unsetCurrentChatSettings } = currentChatSettingsSlice.actions
export const currentChatSettingsReducer = currentChatSettingsSlice.reducer