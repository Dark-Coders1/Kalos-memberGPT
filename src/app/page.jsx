'use client';
import { useState } from 'react';

const PROMPTS = [
  'How many members have had 3+ scans?',
  'Which members have lost lean mass between their last two scans?',
  "How has Sarah Lee's body fat trended?",
  'What should I focus on in my next coaching session with Jordan Kim?',
  'Give me a summary of all members',
];

export default function MemberGPT() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('Ask about trends, member count, or coaching focus.');
  const [loading, setLoading] = useState(false);

  const ask = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/membergpt/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer || 'No answer available.');
    } catch {
      setAnswer('Failed to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">Coach Intelligence</p>
        <h1>MemberGPT</h1>
        <p className="subtle">
          Ask natural-language questions about member scan data. Answers are grounded in real MongoDB data and enhanced by Gemini AI.
        </p>
      </section>

      <form className="card" onSubmit={ask}>
        <label className="promptLabel">Ask a coaching question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How many members have had 3+ scans?"
          rows={4}
        />
        <div className="promptRow">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" className="ghost" onClick={() => setQuestion(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      <section className="card answerCard">
        <h2>Answer</h2>
        <p className="answerText">{loading ? 'Thinking…' : answer}</p>
      </section>
    </main>
  );
}
