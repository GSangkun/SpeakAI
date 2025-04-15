import { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { ChatSelection } from "../lib/chat-types";


export const initialChatSelectionListState: {
    selectionList: ChatSelection[];
    currentChatID: string | undefined;
} = {
    selectionList: [],
    currentChatID: undefined
};

const chatSelectionListSlice = createSlice(
    {
        name: 'chatSelectionList',
        initialState: initialChatSelectionListState,
        reducers: {
            addNewChat: (state, chatSelection: PayloadAction<ChatSelection>) => {
                state.selectionList = [chatSelection.payload, ...state.selectionList]
                state.currentChatID = chatSelection.payload.id
            },
            addNewChatWithoutSettingCurrentChatID: (state, chatSelection: PayloadAction<ChatSelection>) => {
                state.selectionList = [chatSelection.payload, ...state.selectionList]
            },
            deleteChat: (state, chatID: PayloadAction<string>) => {
                state.selectionList = state.selectionList.filter(chat => chat.id !== chatID.payload)
                if (state.currentChatID === chatID.payload) {
                    state.currentChatID = state.selectionList[0]?.id
                }
            },
            setChatSelectionList: (state, chatSelectionList: PayloadAction<ChatSelection[]>) => {
                state.selectionList = chatSelectionList.payload
            },
            setCurrentChatID: (state, chatID: PayloadAction<string>) => {
                state.currentChatID = chatID.payload
            },
            updateChatTitle: (state, action: PayloadAction<{ chatID: string, newTitle: string }>) => {
                const chat = state.selectionList.find(item => item.id === action.payload.chatID)
                if (chat) {
                    chat.title = action.payload.newTitle
                }
            }
        }
    },
)
export const { addNewChat, addNewChatWithoutSettingCurrentChatID: addNewChatWithoutSettingCurrentChat, setChatSelectionList, setCurrentChatID, updateChatTitle, deleteChat } = chatSelectionListSlice.actions
export const chatSelectionListReducer = chatSelectionListSlice.reducer
