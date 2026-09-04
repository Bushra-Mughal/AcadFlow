import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

interface VoiceAddProps {
  onTranscript?: (text: string) => void;
  onFinal?: (fullText: string) => void;
  label?: string;
}

// Minimal structural typing for the Web Speech result payload - lib.dom
// coverage of SpeechRecognition varies across TypeScript versions.
interface SRAlternative {
  transcript?: string;
}
interface SRResult {
  isFinal?: boolean;
  [index: number]: SRAlternative | undefined;
}
interface SREventLike {
  resultIndex?: number;
  results: ArrayLike<SRResult>;
}

// How many times to silently relisten after a pure-silence ("no-speech") end
// before telling the user. A pause or a slow start should not kill the session.
const MAX_SILENCE_RETRIES = 2;

const FRIENDLY_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission denied. Allow mic access for this site and try again.',
  'service-not-allowed': 'The speech service is blocked. Check your browser permissions.',
  'audio-capture': 'No microphone found. Connect one and try again.',
  network: 'Speech service unreachable. Check your internet connection.',
};

export function VoiceAdd({ onTranscript, onFinal, label = 'Voice add' }: VoiceAddProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retriesRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);
  const stoppedByUserRef = useRef(false);
  // Latest not-yet-final (interim) transcript. Some browsers never emit a final
  // result when the user taps stop, so we flush this on end to avoid losing speech.
  const pendingInterimRef = useRef('');
  // Full accumulated utterance (all final chunks + any flushed interim), handed
  // to onFinal once when listening ends so the parent can parse it in one shot.
  const fullTranscriptRef = useRef('');

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function begin() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = true; // stay open across pauses / multiple sentences
    recognition.interimResults = true; // live feedback while speaking
    lastErrorRef.current = null;

    recognition.onstart = () => {
      setListening(true);
      setInterim('');
      pendingInterimRef.current = '';
    };

    recognition.onresult = (event) => {
      const ev = event as unknown as SREventLike;
      const results = ev.results;
      let interimText = '';
      for (let i = ev.resultIndex ?? 0; i < results.length; i++) {
        const result = results[i];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) {
          const chunk = text.trim();
          if (chunk) {
            onTranscript?.(chunk);
            fullTranscriptRef.current = `${fullTranscriptRef.current} ${chunk}`.trim();
          }
          retriesRef.current = 0; // we heard real speech; restore retry budget
        } else {
          interimText += text;
        }
      }
      pendingInterimRef.current = interimText.trim();
      setInterim(interimText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      lastErrorRef.current = event.error;
      if (event.error !== 'no-speech') {
        toast.error(FRIENDLY_ERRORS[event.error] || `Voice input failed: ${event.error}`);
      }
    };

    recognition.onend = () => {
      const code = lastErrorRef.current;
      // Pure silence: quietly relisten a couple of times so a pause or a slow
      // start doesn't surface an error. Only give up (gently) after retries.
      if (code === 'no-speech' && !stoppedByUserRef.current) {
        if (retriesRef.current < MAX_SILENCE_RETRIES) {
          retriesRef.current += 1;
          begin();
          return;
        }
        toast.message("Didn't catch any speech. Tap the mic and speak again.");
      }
      // Commit any trailing speech the browser left as interim (never finalized).
      const pending = pendingInterimRef.current.trim();
      pendingInterimRef.current = '';
      if (pending) {
        onTranscript?.(pending);
        fullTranscriptRef.current = `${fullTranscriptRef.current} ${pending}`.trim();
      }
      // Hand the complete utterance to the parent once (e.g. for AI parsing).
      const full = fullTranscriptRef.current.trim();
      fullTranscriptRef.current = '';
      if (full) onFinal?.(full);
      setListening(false);
      setInterim('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error('Could not start the microphone. It may already be in use.');
    }
  }

  function toggleListening() {
    if (listening) {
      stoppedByUserRef.current = true;
      recognitionRef.current?.stop();
      return;
    }
    stoppedByUserRef.current = false;
    retriesRef.current = 0;
    fullTranscriptRef.current = '';
    begin();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant={listening ? 'destructive' : 'outline'}
        size="sm"
        onClick={toggleListening}
      >
        {listening ? (
          <MicOff className="mr-2 h-4 w-4 animate-pulse" />
        ) : (
          <Mic className="mr-2 h-4 w-4" />
        )}
        {listening ? 'Listening… tap to stop' : label}
      </Button>
      {listening && (
        <p className="max-w-xs text-right text-xs italic text-muted-foreground" aria-live="polite">
          {interim || 'Listening… speak now'}
        </p>
      )}
    </div>
  );
}
