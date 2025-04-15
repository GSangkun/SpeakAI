import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface TTSService {
    speak(text: string): Promise<void>;
    stop(): void;
}

export class WebSpeechTTS implements TTSService {
    lang: string
    voiceURI?: string
    private timeout?: NodeJS.Timeout;

    constructor(lang: string, voiceURI?: string){
        this.lang = lang
        this.voiceURI = voiceURI
    }
    
    async speak(text: string): Promise<void> {
        const utterance = new SpeechSynthesisUtterance();
        utterance.lang = this.lang

        const allVoices: SpeechSynthesisVoice[] = [];        
        const getVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                allVoices.push(...voices);
            } else {
                setTimeout(getVoices, 100);
            }
        };
        getVoices();
        while (allVoices.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        let prefferedVoice: SpeechSynthesisVoice | undefined = undefined;
        for (const voice of allVoices) {
            if (voice.voiceURI === this.voiceURI) {
                prefferedVoice = voice;
                break;
            }
        }
        if (prefferedVoice !== undefined) {
            utterance.voice = prefferedVoice;
        }

        return new Promise((resolve, reject) => {
            const myTimer = () => {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
                this.timeout = setTimeout(myTimer, 10000);
            };
            // https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
            window.speechSynthesis.cancel();
            this.timeout = setTimeout(myTimer, 10000);
            utterance.text = text;
            utterance.onend = () => {
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                resolve();
            };
            utterance.onerror = (error) => {
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                reject(error);
            };
            window.speechSynthesis.cancel() // https://stackoverflow.com/questions/41539680/speechsynthesis-speak-not-working-in-chrome
            window.speechSynthesis.speak(utterance);
        });
    }

    static async getVoices(): Promise<SpeechSynthesisVoice[]> {
        // https://stackoverflow.com/questions/49506716/speechsynthesis-getvoices-returns-empty-array-on-windows
        const allVoices: SpeechSynthesisVoice[] = [];        
        const getVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                allVoices.push(...voices);
            } else {
                setTimeout(getVoices, 100);
            }
        };
        getVoices();
        while (allVoices.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return allVoices;
    }
    
    stop(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        window.speechSynthesis.cancel();
    }
}

export class AzureTTS implements TTSService {
    private player: sdk.SpeakerAudioDestination | null = null;
    private synthesizer: sdk.SpeechSynthesizer | null = null;

    async speak(text: string): Promise<void> {
        const subscriptionKey = '';
        const region = 'eastUS';

        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
        speechConfig.speechRecognitionLanguage = 'en-US';
        speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

        this.player = new sdk.SpeakerAudioDestination();
        const audioConfig = sdk.AudioConfig.fromSpeakerOutput(this.player);
        this.synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        return new Promise((resolve, reject) => {
            if (!this.synthesizer) {
                reject(new Error('Synthesizer not initialized'));
                return;
            }

            this.synthesizer.speakTextAsync(
                text,
                () => {
                    this.cleanup();
                    resolve();
                },
                error => {
                    console.error('Speech synthesis error:', error);
                    this.cleanup();
                    reject(error);
                }
            );
        });
    }

    stop(): void {
        this.cleanup();
    }

    private cleanup(): void {
        if (this.synthesizer) {
            this.synthesizer.close();
            this.synthesizer = null;
        }
        if (this.player) {
            this.player.pause();
            this.player = null;
        }
    }
}

// export const USE_AZURE_TTS = false;

// export function createTTSService(): TTSService {
//     // return USE_AZURE_TTS ? new AzureTTS() new WebSpeechTTS();
//     return new WebSpeechTTS();
// } 