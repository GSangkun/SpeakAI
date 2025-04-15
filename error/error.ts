class CustomError extends Error {
    public readonly originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message);
        this.name = "CustomError";
        this.originalError = originalError;

        // Maintain proper stack trace
        if (originalError?.stack) {
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
}

export { CustomError }
export class FreeTrialChatError extends CustomError { }
export class InvalidModelSettingsError extends CustomError { }

