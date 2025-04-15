'use client'
import { createSlice } from "@reduxjs/toolkit";
import { PayloadAction } from "@reduxjs/toolkit";

export enum TutorialStateIDs {
    introduction = 'introduction',// init
    introduceQuickTranslationInstructions = 'introduceQuickTranslationInstructions',// introduce quick instruction
    indicateUsersToClickTranslation = 'indicateUsersToClickTranslation',// cueing users to click on Translation icon
    startFollowUpDiscussion = 'startFollowUpDiscussion',// start follow up discussion
    indicateUsersToGoBack = 'indicateUsersToGoBack',// indicate users to go back
    indicateToSendMsg = 'indicateToSendMsg',// indicate users to press Enter to send msg
    clickNextToIllustrateGrammarCheck = 'clickNextToIllustrateGrammarCheck',// click next to illustrate grammar check
    illustrateGrammarCheck = 'illustrateGrammarCheck',
    illustrateCustomInstructions = 'illustrateCustomInstructions',
    endingSummary = 'endingSummary'
}

export const initTutorialState: {
    stateID: TutorialStateIDs | undefined
} = {
    stateID: undefined
}

const tutorialStateSlice = createSlice({
    name: 'tutorialState',
    initialState: initTutorialState,
    reducers: {
        setTutorialState: (state, newState: PayloadAction<{ stateID: TutorialStateIDs | undefined }>) => {
            state.stateID = newState.payload.stateID
        }
    }
})

export const { setTutorialState } = tutorialStateSlice.actions
export const tutorialStateReducer = tutorialStateSlice.reducer