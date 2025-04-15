export type ChatSettingsStoreRecord = {
    rawInputHandlers: { payload: string, display: boolean }[],
    autoPlayAudio: boolean,
    ChatISettings: {
        id: string
        settings: object
    },
    inputComponent: {
        type: string,
        payload: object
    }
}

export function loadChatSettingsData(settingsID: string): ChatSettingsStoreRecord | undefined {
    const payloadJSON = localStorage.getItem(settingsID);
    if (!payloadJSON) {
        return undefined;
    }
    const record: ChatSettingsStoreRecord = JSON.parse(payloadJSON);
    return record;
}

export function setChatSettingsData(settingsID: string, payload: ChatSettingsStoreRecord): void {
    localStorage.setItem(settingsID, JSON.stringify(payload));
}

