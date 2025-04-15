import { MdGTranslate, MdVoiceChat } from "react-icons/md";
import { TbPencilQuestion } from "react-icons/tb";
import { FaSpellCheck } from "react-icons/fa";
import { useState } from "react";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { Tooltip } from "react-tooltip";
import { SemiTransparentOverlay } from "@/app/ui-utils/components/overlay";
import { FilledButton, TransparentButton } from "@/app/ui-utils/components/button";
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuEntry } from "@/app/ui-utils/components/DropdownMenu";
import { TransparentOverlay } from "@/app/ui-utils/components/overlay";
import { i18nText } from "@/app/i18n/i18n";
import { Message } from "../lib/message";

// Define InputHandlerTypes enum
export enum InputHandlerTypes {
    Generation = "generation",
    Revision = "revision"
}

// Define InputHandlerHub class
class InputHandlerHub {
    private handlerMap: Map<string, (serialized: string) => InputHandler> = new Map();

    registerHandler(implType: string, deserialize: (serialized: string) => InputHandler) {
        this.handlerMap.set(implType, deserialize);
    }

    getHandlerClassByImplType(implType: string): ((serialized: string) => InputHandler) | undefined {
        return this.handlerMap.get(implType);
    }
}

// Create a global instance of InputHandlerHub
export const inputHandlerHub = new InputHandlerHub();

// Define InputHandler abstract class
export abstract class InputHandler {
    readonly implType: string;
    readonly type: InputHandlerTypes;
    readonly deletable: boolean;
    iconNode: React.ReactNode;
    shortcutKeyCallback?: (e: React.KeyboardEvent) => boolean;

    constructor(implType: string, type: InputHandlerTypes, deletable: boolean) {
        this.implType = implType;
        this.type = type;
        this.deletable = deletable;
    }

    abstract tooltip(): i18nText;
    abstract instruction(): string;
    // return undefined if this handler does not have a settings panel, means it's unconfigurable
    abstract settingsPanel(): InputHandlerSettingsPanel | undefined;

    abstract serialize(): string;

    static deserialize(serialized: string): InputHandler {
        const { implType } = JSON.parse(serialized);
        const deserialize = inputHandlerHub.getHandlerClassByImplType(implType);
        if (deserialize) {
            return deserialize(serialized);
        } else {
            throw new Error(`Deserialization method for implType ${implType} is not implemented`);
        }
    }

    // telling if this input handler can handle with the given message
    isCompatibleWith(message: Message): boolean {
        if (this.type === InputHandlerTypes.Generation) {
            return message.isEmpty()
        } else if (this.type === InputHandlerTypes.Revision) {
            return !message.isEmpty()
        }
        return false;
    }
}

export type InputHandlerSettingsPanel = ({ }: {
    updateHandler: (handler: InputHandler) => void,
    className?: string
}) => JSX.Element

// Define TranslationHandler class
export class TranslationHandler extends InputHandler {
    targetLanguage: string;

    constructor(targetLanguage: string, implType: string = 'translation', deletable: boolean = false) {
        super(implType, InputHandlerTypes.Revision, deletable);
        this.targetLanguage = targetLanguage;
        this.iconNode = <MdGTranslate size={20} />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'k' && (e.metaKey || e.ctrlKey);
    }

    tooltip(): i18nText {
        return { key: 'translateTooltip', values: { targetLanguage: this.targetLanguage } };
    }

    instruction(): string {
        return `Translate it into ${this.targetLanguage} to express the same meaning.`;
    }

    settingsPanel(): InputHandlerSettingsPanel | undefined {
        const Root = ({ updateHandler, className }: { updateHandler: (handler: InputHandler) => void, className?: string }) => {
            const { t } = useTranslation();

            const [targetLanguage, setTargetLanguage] = useState(this.targetLanguage);
            return (
                <div className={`flex flex-col justify-between fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50 ${className}`}>
                    <span className="mb-2">{t('translateInputInto')}</span>
                    <input
                        className="border-2 border-gray-300 rounded-md p-2"
                        type="text"
                        id="targetLanguage"
                        value={targetLanguage}
                        onChange={(e) => { setTargetLanguage(e.target.value) }}
                    />
                    <FilledButton
                        className="mt-2 self-end"
                        onClick={() => { updateHandler(new TranslationHandler(targetLanguage)) }}
                    >
                        {t('save')}
                    </FilledButton>
                </div>
            );
        };
        return Root;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            targetLanguage: this.targetLanguage
        });
    }

    static deserialize(serialized: string): TranslationHandler {
        const { targetLanguage } = JSON.parse(serialized);
        return new TranslationHandler(targetLanguage);
    }
}

// Define RespGenerationHandler class
export class RespGenerationHandler extends InputHandler {

    constructor() {
        super('respGeneration', InputHandlerTypes.Generation, false);
        this.iconNode = <TbPencilQuestion size={20} />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === '/' && (e.metaKey || e.ctrlKey);
    }

    tooltip(): i18nText {
        return { key: 'generateResponseTooltip' };
    }

    instruction(): string {
        return "Help me respond it.";
    }

    settingsPanel(): InputHandlerSettingsPanel | undefined {
        return undefined;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): RespGenerationHandler {
        return new RespGenerationHandler();
    }
}

export class GrammarCheckingHandler extends InputHandler {

    constructor() {
        super('grammarChecking', InputHandlerTypes.Revision, false);
        this.iconNode = <FaSpellCheck size={20} className="ml-[-2px]" />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'g' && (e.metaKey || e.ctrlKey);
    }

    tooltip(): i18nText {
        return { key: 'grammarCheckTooltip' };
    }

    instruction(): string {
        return "Correct potential grammar issues.";
    }

    settingsPanel(): InputHandlerSettingsPanel | undefined {
        return undefined;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): GrammarCheckingHandler {
        return new GrammarCheckingHandler();
    }
}

export class TranscriptionImprovementHandler extends InputHandler {

    constructor() {
        super('transcriptionImprovement', InputHandlerTypes.Revision, false);
        this.iconNode = <MdVoiceChat size={20} />;
    }

    tooltip(): i18nText {
        return { key: 'transcriptionImprovementTooltip' };
    }

    instruction(): string {
        return "This is a text transcribed from voice input. Please correct any recognition errors based on context, but only fix obvious speech recognition mistakes without making other changes.";
    }

    settingsPanel(): InputHandlerSettingsPanel | undefined {
        return undefined;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): TranscriptionImprovementHandler {
        return new TranscriptionImprovementHandler();
    }
}

// Define CommonGenerationHandler class
export class CommonGenerationHandler extends InputHandler {
    settingsPanel(): InputHandlerSettingsPanel {
        const Root = ({ updateHandler, className }: { updateHandler: (handler: InputHandler) => void, className?: string }) => {
            const { t } = useTranslation(); // 添加
            const [instruction, setInstruction] = useState(this._instruction);
            const [tooltip, setTooltip] = useState(this._tooltip);
            const [icon, setIcon] = useState(this._iconChar);

            return (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50 ${className}`}>
                    {/* 标题 */}
                    <h2 className="text-2xl font-bold mb-4">{t('Edit Instruction')}</h2>

                    {/* Instruction */}
                    <div className="mb-4">
                        <label htmlFor="instruction" className="block text-gray-700 font-bold mb-2">{t('Instruction')}</label>
                        <textarea
                            id="instruction"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Tooltip */}
                    <div className="mb-4">
                        <label htmlFor="tooltip" className="block text-gray-700 font-bold mb-2">{t('Tooltip')}</label>
                        <input
                            type="text"
                            id="tooltip"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={tooltip}
                            onChange={(e) => setTooltip(e.target.value)}
                        />
                    </div>

                    {/* Icon */}
                    <div className="mb-4">
                        <label htmlFor="icon" className="block text-gray-700 font-bold mb-2">{t('Icon')}</label>
                        <input
                            type="text"
                            id="icon"
                            maxLength={1}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={icon}
                            onChange={(e) => {
                                const value = Array.from(e.target.value)[0] || "";
                                setIcon(value);
                            }}
                        />
                        <p className="text-gray-400 text-xs italic mt-1">{t('Please use a single character as icon.')}</p>
                    </div>

                    <div className="flex items-center justify-end">
                        <FilledButton
                            className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg"
                            onClick={() => updateHandler(new CommonGenerationHandler(instruction, tooltip, icon))}
                        >
                            {t('Save')}
                        </FilledButton>
                    </div>
                </div>
            );
        }
        return Root;
    }
    _instruction: string;
    _tooltip: string;
    _toolTipKey?: string;
    _iconChar: string;

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonGeneration', InputHandlerTypes.Generation, true);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._toolTipKey = toolTipKey;
        this._iconChar = iconChar;
        this.iconNode = <span>{iconChar}</span>;
    }

    tooltip(): i18nText {
        return { text: this._tooltip };
    }

    instruction(): string {
        return this._instruction;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonGenerationHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonGenerationHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

// Define CommonRevisionHandler class
export class CommonRevisionHandler extends InputHandler {
    _instruction: string;
    _tooltip: string;
    _iconChar: string;
    _toolTipKey?: string;

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonRevision', InputHandlerTypes.Revision, true);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._iconChar = iconChar;
        this._toolTipKey = toolTipKey;
        this.iconNode = <span>{iconChar}</span>;
    }

    tooltip(): i18nText {
        return { text: this._tooltip };
    }

    instruction(): string {
        return this._instruction;
    }

    settingsPanel(): InputHandlerSettingsPanel {
        const Root = ({ updateHandler, className }: { updateHandler: (handler: InputHandler) => void, className?: string }) => {
            const { t } = useTranslation(); // 添加
            const [instruction, setInstruction] = useState(this._instruction);
            const [tooltip, setTooltip] = useState(this._tooltip);
            const [icon, setIcon] = useState(this._iconChar);

            return (
                <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50 ${className}`}>
                    {/* Instruction */}
                    <div className="mb-4">
                        <label htmlFor="instruction" className="block text-gray-700 font-bold mb-2">{t('Instruction')}</label>
                        <textarea
                            id="instruction"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Tooltip */}
                    <div className="mb-4">
                        <label htmlFor="tooltip" className="block text-gray-700 font-bold mb-2">{t('Tooltip')}</label>
                        <input
                            type="text"
                            id="tooltip"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={tooltip}
                            onChange={(e) => setTooltip(e.target.value)}
                        />
                    </div>

                    {/* Icon */}
                    <div className="mb-4">
                        <label htmlFor="icon" className="block text-gray-700 font-bold mb-2">{t('Icon')}</label>
                        <input
                            type="text"
                            id="icon"
                            maxLength={1}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={icon}
                            onChange={(e) => {
                                const value = Array.from(e.target.value)[0] || "";
                                setIcon(value);
                            }}
                        />
                        <p className="text-gray-400 text-xs italic mt-1">{t('Please use a single character as icon.')}</p>
                    </div>


                    <div className="flex items-center justify-end">
                        <FilledButton
                            className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg"
                            onClick={() => updateHandler(new CommonRevisionHandler(instruction, tooltip, icon))}
                        >
                            {t('Save')}
                        </FilledButton>
                    </div>
                </div>
            );
        }
        return Root;
    }
    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonRevisionHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonRevisionHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

// Register all InputHandler subclasses
inputHandlerHub.registerHandler('translation', TranslationHandler.deserialize);
inputHandlerHub.registerHandler('respGeneration', RespGenerationHandler.deserialize);
inputHandlerHub.registerHandler('grammarChecking', GrammarCheckingHandler.deserialize);
inputHandlerHub.registerHandler('commonGeneration', CommonGenerationHandler.deserialize);
inputHandlerHub.registerHandler('commonRevision', CommonRevisionHandler.deserialize);
inputHandlerHub.registerHandler('transcriptionImprovement', TranscriptionImprovementHandler.deserialize);

export function CustomInputHandlerCreator({
    cancelCallback,
    inputHandlerAdded
}: {
    cancelCallback: () => void;
    inputHandlerAdded: (handler: InputHandler) => void;
}) {
    const { t } = useTranslation();
    const [type, setType] = useState<InputHandlerTypes>(InputHandlerTypes.Revision);
    const [instruction, setInstruction] = useState('');
    const [tooltip, setTooltip] = useState('');
    const [icon, setIcon] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const handleTypeChange = (newType: InputHandlerTypes) => {
        setType(newType);
        setShowDropdown(false);
    };

    return (
        <>
            <SemiTransparentOverlay onClick={cancelCallback} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50 w-[600px] h-auto">
                <h2 className="text-2xl font-bold mb-8">{t('customInstruction')}</h2>
                <div className="mb-4">
                    {/* instruction type selector */}
                    <div className="flex flex-row items-center justify-between mb-2">
                        <label htmlFor="type" className="block text-gray-700 font-bold mr-2">{t('instructionType')}</label>
                        <div className="relative">
                            <DropdownMenuEntry
                                label={type === InputHandlerTypes.Revision ? t('modification') : t('generation')}
                                onClick={() => setShowDropdown(true)}
                            />
                            {showDropdown && (
                                <>
                                    <DropdownMenu
                                        className="absolute left-0 right-0 top-full"
                                        menuItems={[
                                            { label: t('modification'), onClick: () => handleTypeChange(InputHandlerTypes.Revision) },
                                            { label: t('generation'), onClick: () => handleTypeChange(InputHandlerTypes.Generation) },
                                        ]}
                                    />
                                    <TransparentOverlay onClick={() => setShowDropdown(false)} />
                                </>
                            )}
                        </div>
                    </div>
                    {/* explanation of the instruction type */}
                    <div className="flex flex-row items-start mt-1">
                        <IoMdInformationCircleOutline size={20} className="text-gray-400 mr-2" />
                        {type === InputHandlerTypes.Generation && <p className="text-gray-400 text-xs">
                            {t('generationExplanation')}
                        </p>}
                        {type === InputHandlerTypes.Revision && <p className="text-gray-400 text-xs">
                            {t('modificationExplanation')}
                        </p>}
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="instruction" className="block text-gray-700 font-bold mb-2">{t('instruction')}</label>
                    <textarea
                        id="instruction"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                    ></textarea>
                </div>

                <div className="mb-4">
                    <div className="flex flex-row items-center mb-2">
                        <label htmlFor="tooltip" className="block text-gray-700 font-bold mr-2">{t('tooltip')}</label>
                        <IoMdInformationCircleOutline className="text-gray-400" id="tooltip-info" />
                        <Tooltip anchorSelect="#tooltip-info" clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                            <span>{t('tooltipInfo')}</span>
                        </Tooltip>
                    </div>
                    <input
                        type="text"
                        id="tooltip"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={tooltip}
                        onChange={(e) => setTooltip(e.target.value)}
                    ></input>
                </div>

                <div className="mb-4">
                    <label htmlFor="icon" className="block text-gray-700 font-bold mb-2">{t('icon')}</label>
                    <input
                        type="text"
                        id="icon"
                        maxLength={1}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder={t('enterOneCharacter')}
                        onChange={(e) => {
                            const value = Array.from(e.target.value)[0] || "";
                            setIcon(value);
                        }}
                    ></input>
                    <p className="text-gray-400 text-xs italic mt-1">{t('customIconNote')}</p>
                </div>

                <div className="flex items-center justify-end">
                    <TransparentButton className="mr-2" onClick={cancelCallback}>
                        {t('cancel')}
                    </TransparentButton>
                    <FilledButton onClick={() => {
                        if (type === InputHandlerTypes.Generation) {
                            inputHandlerAdded(new CommonGenerationHandler(instruction, tooltip, icon));
                        } else {
                            inputHandlerAdded(new CommonRevisionHandler(instruction, tooltip, icon));
                        }
                    }}>
                        {t('add')}
                    </FilledButton>
                </div>
            </div>
        </>
    );
}
