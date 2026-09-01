// global types

// ç™¾åº¦åœ°å›¾GLç‰ˆæœ¬å…¨å±€ç±»åž‹å£°æ˜Ž
/// <reference types="bmapgl" />

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface SpeechRecognition extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onstart: (() => void) | null;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognition;
}

interface Window {
	SpeechRecognition?: SpeechRecognitionConstructor;
	webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

declare module 'miaoda-sc-plugin' {
	export function miaodaDevPlugin(): import('vite').Plugin;
}

declare module 'qrcode' {
	interface QRCodeOptions {
		width?: number;
		color?: { dark?: string; light?: string };
	}

	const QRCode: {
		toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
	};

	export default QRCode;
}


