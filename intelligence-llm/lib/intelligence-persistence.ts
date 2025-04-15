
import { chatIntelligenceSettingsRecord } from "./intelligence"

export function _getBuiltinChatIntelligencesFromLocalStorage(): chatIntelligenceSettingsRecord[] {
    const builtInIntelligences = localStorage.getItem('builtInChatIntelligences')
    if (!builtInIntelligences) {
        return []
    }
    return JSON.parse(builtInIntelligences)
}

export function _saveBuiltInChatIntelligencesToLocalStorage(intelligences: chatIntelligenceSettingsRecord[]) {
    localStorage.setItem('builtInChatIntelligences', JSON.stringify(intelligences))
}