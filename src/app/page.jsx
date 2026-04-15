'use client';
import { useState, useRef, useEffect } from 'react';

const PROMPTS = [
  'How many members have had 3+ scans?',
  'Which members have lost lean mass between their last two scans?',
  "How has Sarah's body fat trended?",
  'What should I focus on with Jordan in our next coaching session?',
  'Which members have not scanned in the last 60 days?',
  'Who are the top improvers in lean mass?',
  'Give me a summary of all members',
];

const MAX_LENGTH = 500;

export default function MemberGPT() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const ask = async (event) => {
    event.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', text: q, id: Date.now() };
    setHistory((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/membergpt/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      const text = res.ok ? (data.answer || 'No answer available.') : (data.error || 'Server error.');
      setHistory((prev) => [...prev, { role: 'assistant', text, id: Date.now() + 1 }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Failed to reach the server. Please try again.', id: Date.now() + 1 },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(e);
    }
  };

  const clearHistory = () => setHistory([]);

  const charsLeft = MAX_LENGTH - question.length;

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">Coach Intelligence</p>
        <h1>MemberGPT</h1>
        <p className="subtle">
          Ask natural-language questions about member scan data. Answers are grounded in real MongoDB data and enhanced by Gemini AI.
        </p>
      </section>

      {history.length > 0 && (
        <section className="chatHistory" aria-label="Conversation history" aria-live="polite">
          {history.map((msg) => (
            <div key={msg.id} className={`bubble bubble--${msg.role}`}>
              <span className="bubble__role">{msg.role === 'user' ? 'You' : 'MemberGPT'}</span>
              <p className="bubble__text">{msg.text}</p>
            </div>
          ))}
          {loading && (
            <div className="bubble bubble--assistant bubble--thinking" aria-label="Thinking">
              <span className="bubble__role">MemberGPT</span>
              <span className="thinkingDots" aria-hidden="true">
                <span /><span /><span />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </section>
      )}

      <form className="card" onSubmit={ask}>
        <label className="promptLabel" htmlFor="question">
          Ask a coaching question
        </label>
        <textarea
          id="question"
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="How many members have had 3+ scans?"
          rows={3}
          aria-describedby="charsLeft"
          disabled={loading}
        />
        <div className="formMeta">
          <span id="charsLeft" className={`charCount ${charsLeft < 50 ? 'charCount--warn' : ''}`}>
            {charsLeft} characters remaining
          </span>
          <span className="hint">Enter to send · Shift+Enter for new line</span>
        </div>
        <div className="promptRow">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ghost"
              onClick={() => setQuestion(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="formActions">
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
          {history.length > 0 && (
            <button type="button" className="ghost clearBtn" onClick={clearHistory} disabled={loading}>
              Clear conversation
            </button>
          )}
        </div>
      </form>

      {history.length === 0 && !loading && (
        <section className="card answerCard">
          <h2>Answer</h2>
          <p className="answerText">Ask about trends, member count, or coaching focus.</p>
        </section>
      )}
    </main>
  );
}
