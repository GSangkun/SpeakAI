
export abstract class Message {
    type: string
    role: string
    displayToUser: boolean
    includedInChatCompletion: boolean // TODO tech-debt: 定义不清晰

    constructor(
        type: string, role: string,
        displayToUser: boolean = true,
        includedInChatCompletion: boolean = true,
    ) {
        this.type = type
        this.role = role
        this.displayToUser = displayToUser
        this.includedInChatCompletion = includedInChatCompletion
    }

    // This method is responsible for rendering the message component. 
    abstract component(): MessageComponent

    // This method is responsible for serializing the message object into a string format.
    abstract serialize(): string

    // This method is responsible for deserializing the message object from a string format.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static deserialize(serialized: string): Message {
        throw new Error("Deserialization not implemented for this message type");
    }

    abstract isEmpty(): boolean // TODO tech-debt: not every message type needs to implement this
}

type MessageComponent = ({ }: {
    message: Message,
    messageID: number,
    updateMessage: (messageID: number, message: Message) => void,
    className?: string
}) => JSX.Element

// =========== some extandable message interaces, optional to implement ===========
// implementing them can achieve more compatibility with more intelligence providers, 
// cause the providers would also be suggested to support these message types.
// If not implementing them, whether the message type is supported by the intelligence provider depends on
// whether the intelligence provider specifically handles this type of message

export interface OpenAILikeMessage {
    toOpenAIMessage(): { role: string, content: string } // TODO keep consistent with message format in OpenAI official documentation
}

export function isOpenAILikeMessage(message: unknown): message is OpenAILikeMessage {
    return message instanceof Message && 'toOpenAIMessage' in message
}

export interface TextContentMessage {
    toString(): string
}