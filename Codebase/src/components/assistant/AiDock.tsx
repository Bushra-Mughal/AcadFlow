import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AIAssistant from '@/pages/AIAssistant';
import { Bot } from 'lucide-react';

/**
 * Global AI launcher: a persistent floating button plus a Ctrl/Cmd+K shortcut
 * that opens the assistant as a right-side dock on every page.
 */
export function AiDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  // On the full AI Assistant page the assistant is already front-and-center, so
  // don't render a redundant launcher/dock there (also avoids a second instance).
  const onAssistantPage = location.pathname === '/';

  useEffect(() => {
    if (onAssistantPage) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAssistantPage]);

  if (onAssistantPage) return null;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="AI Assistant (Ctrl+K)"
          aria-label="Open AI Assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full ai-gradient shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bot className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Right-side dock */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform border-l border-border/60 bg-background shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {open && <AIAssistant dock onClose={() => setOpen(false)} />}
      </div>
    </>
  );
}

export default AiDock;
