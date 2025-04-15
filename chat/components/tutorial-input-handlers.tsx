import { i18nText } from "@/app/i18n/i18n";
import { Message } from "../lib/message";
import { TranslationHandler, InputHandlerSettingsPanel, InputHandler, inputHandlerHub } from "./input-handlers";
import { IdentifiedTextMessage } from "./tutorial-message";


export class TutorialTranslationHandler extends TranslationHandler {
    constructor(targetLanguage: string) {
        super(targetLanguage, 'tutorialTranslation', false);
    }
    instruction(): string {
        return `Whatever the input is, just convert it into: "That's a lot of information. I'll summarize it later.". [magic-hack-code: 7m1WTDpAuhttWRPfF5LPV0Tgktw7]`;
    }
    settingsPanel(): InputHandlerSettingsPanel | undefined {
        return undefined;
    }
    static deserialize(serialized: string): TutorialTranslationHandler {
        const { targetLanguage } = JSON.parse(serialized);
        return new TutorialTranslationHandler(targetLanguage);
    }
    isCompatibleWith(message: Message): boolean {
        if (message instanceof IdentifiedTextMessage && message.id === 'tutorial-input-msg') {
            return true;
        }
        return false;
    }
}

// A decorator to disable a handler (by returning false on isCompatibleWith), make it only for display, not clickable
export class DisableHandlerDecorator extends InputHandler {
    static readonly implType = 'disableHandlerDecorator';
    originalHandler: InputHandler;
    constructor(handler: InputHandler) {
        super(DisableHandlerDecorator.implType, handler.type, handler.deletable);
        this.originalHandler = handler;
        this.iconNode = this.originalHandler.iconNode;
    }
    tooltip(): i18nText {
        return this.originalHandler.tooltip();
    }
    instruction(): string {
        return this.originalHandler.instruction();
    }
    settingsPanel(): InputHandlerSettingsPanel | undefined {
        return this.originalHandler.settingsPanel();
    }
    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            handler: this.originalHandler.serialize()
        });
    }
    static deserialize(serialized: string): DisableHandlerDecorator {
        const { handler } = JSON.parse(serialized);
        const originalHandler = InputHandler.deserialize(handler);
        return new DisableHandlerDecorator(originalHandler);
    }
    isCompatibleWith(): boolean {
        return false;
    }
}

inputHandlerHub.registerHandler('tutorialTranslation', TutorialTranslationHandler.deserialize);
inputHandlerHub.registerHandler('disableHandlerDecorator', DisableHandlerDecorator.deserialize);