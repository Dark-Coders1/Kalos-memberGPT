import User from './models/User.js';
import Scan from './models/Scan.js';

const round = (value) => Number(value.toFixed(2));

// ── Helpers ───────────────────────────────────────────────────────────────────

const latestDelta = (scans) => {
  if (scans.length < 2) return null;
  const prev = scans[scans.length - 2];
  const curr = scans[scans.length - 1];
  return {
    bodyFatPercent: round(curr.bodyFatPercent - prev.bodyFatPercent),
    leanMass: round(curr.leanMass - prev.leanMass),
    weight: round(curr.weight - prev.weight),
  };
};

/**
 * Match a member by name from the question text.
 * Tries full name first, then individual words (handles first-name-only queries).
 */
const matchMemberFromQuestion = async (question) => {
  const members = await User.find({ role: 'member' }).lean();
  const q = String(question || '').toLowerCase();

  const fullMatch = members.find((m) => q.includes(m.name.toLowerCase()));
  if (fullMatch) return fullMatch;

  const wordMatch = members.find((m) =>
    m.name
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length > 2 && q.includes(word))
  );
  return wordMatch || null;
};

const summarizeBodyFatTrend = (memberName, scans) => {
  if (scans.length < 2) {
    return `${memberName} has only one scan on record — not enough data for a trend yet.`;
  }
  const first = scans[0];
  const last = scans[scans.length - 1];
  const delta = round(last.bodyFatPercent - first.bodyFatPercent);
  const pctPerScan = round(delta / (scans.length - 1));
  const direction = delta < 0 ? 'down' : 'up';
  return (
    `${memberName}'s body fat moved ${direction} by ${Math.abs(delta)} points ` +
    `(${first.bodyFatPercent}% → ${last.bodyFatPercent}%) across ${scans.length} scans, ` +
    `averaging ${Math.abs(pctPerScan)} points per scan.`
  );
};

// ── Intent detection ──────────────────────────────────────────────────────────

const inferIntent = async (question) => {
  const q = String(question || '').toLowerCase();

  const needsMember =
    q.includes('trend') ||
    q.includes('body fat') ||
    q.includes('focus') ||
    q.includes('coaching') ||
    q.includes('session') ||
    q.includes('weight') ||
    q.includes('goal');

  const member = needsMember ? await matchMemberFromQuestion(question) : null;

  if (q.includes('how many') && (q.includes('3+') || q.includes('three') || q.includes('3 or more')) && q.includes('scan')) {
    return { type: 'count_members_3plus', member };
  }
  if (q.includes('lost lean') || (q.includes('lean mass') && (q.includes('last two') || q.includes('lost')))) {
    return { type: 'members_lost_lean_last2', member };
  }
  if (q.includes('no recent scan') || q.includes('not scanned') || q.includes('overdue') || q.includes("haven't scanned") || q.includes('missing scan')) {
    return { type: 'members_no_recent_scan', member: null };
  }
  if (q.includes('top improver') || q.includes('most improved') || q.includes('biggest gain') || q.includes('best progress')) {
    return { type: 'top_lean_improvers', member: null };
  }
  if (member && (q.includes('weight') && (q.includes('trend') || q.includes('progress')))) {
    return { type: 'member_weight_trend', member };
  }
  if (member && (q.includes('trend') || q.includes('body fat'))) {
    return { type: 'member_body_fat_trend', member };
  }
  if (member && (q.includes('focus') || q.includes('coaching') || q.includes('session') || q.includes('next'))) {
    return { type: 'member_coaching_focus', member };
  }
  if (member && q.includes('goal')) {
    return { type: 'member_goal', member };
  }
  if (q.includes('summary') || q.includes('overview') || q.includes('all member')) {
    return { type: 'member_summary', member };
  }
  return { type: 'unknown', member: null };
};

// ── Query execution ───────────────────────────────────────────────────────────

const executePredefinedQuery = async (intent) => {
  // ── count_members_3plus ──────────────────────────────────────────────────────
  if (intent.type === 'count_members_3plus') {
    const result = await Scan.aggregate([
      { $group: { _id: '$member', scanCount: { $sum: 1 } } },
      { $match: { scanCount: { $gte: 3 } } },
      { $count: 'total' },
    ]);
    const count = result[0]?.total ?? 0;
    return { intent: intent.type, data: { count }, fallbackAnswer: `${count} members currently have 3 or more scans on record.` };
  }

  // ── members_lost_lean_last2 ──────────────────────────────────────────────────
  if (intent.type === 'members_lost_lean_last2') {
    const members = await User.find({ role: 'member' }).lean();
    const losers = [];
    for (const member of members) {
      const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
      const delta = latestDelta(scans);
      if (delta && delta.leanMass < 0) {
        losers.push({ name: member.name, leanDelta: delta.leanMass });
      }
    }
    const fallbackAnswer = losers.length
      ? `Members with lean mass loss between their last two scans: ${losers.map((l) => `${l.name} (${l.leanDelta} kg)`).join(', ')}.`
      : 'No members show lean mass loss between their last two scans — great news!';
    return { intent: intent.type, data: { losers }, fallbackAnswer };
  }

  // ── members_no_recent_scan ───────────────────────────────────────────────────
  if (intent.type === 'members_no_recent_scan') {
    const dayThreshold = 60;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dayThreshold);

    const members = await User.find({ role: 'member' }).lean();
    const overdue = [];
    for (const member of members) {
      const latest = await Scan.findOne({ member: member._id }).sort({ scanDate: -1 }).lean();
      if (!latest || latest.scanDate < cutoff) {
        const daysSince = latest
          ? Math.round((Date.now() - new Date(latest.scanDate)) / 86400000)
          : null;
        overdue.push({ name: member.name, daysSince });
      }
    }
    const fallbackAnswer = overdue.length
      ? `Members with no scan in the last ${dayThreshold} days: ${overdue.map((m) => `${m.name}${m.daysSince ? ` (${m.daysSince}d ago)` : ' (never)'}`).join(', ')}.`
      : `All members have scanned within the last ${dayThreshold} days.`;
    return { intent: intent.type, data: { overdue, dayThreshold }, fallbackAnswer };
  }

  // ── top_lean_improvers ───────────────────────────────────────────────────────
  if (intent.type === 'top_lean_improvers') {
    const members = await User.find({ role: 'member' }).lean();
    const improvers = [];
    for (const member of members) {
      const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
      if (scans.length < 2) continue;
      const delta = round(scans[scans.length - 1].leanMass - scans[0].leanMass);
      if (delta > 0) improvers.push({ name: member.name, leanGain: delta });
    }
    improvers.sort((a, b) => b.leanGain - a.leanGain);
    const top = improvers.slice(0, 3);
    const fallbackAnswer = top.length
      ? `Top lean mass improvers: ${top.map((m, i) => `${i + 1}. ${m.name} (+${m.leanGain} kg)`).join(', ')}.`
      : 'Not enough scan data to rank lean mass improvers yet.';
    return { intent: intent.type, data: { improvers: top }, fallbackAnswer };
  }

  // ── member_weight_trend ──────────────────────────────────────────────────────
  if (intent.type === 'member_weight_trend' && intent.member) {
    const scans = await Scan.find({ member: intent.member._id }).sort({ scanDate: 1 }).lean();
    if (scans.length < 2) {
      return {
        intent: intent.type,
        data: { memberName: intent.member.name, scans },
        fallbackAnswer: `${intent.member.name} has only one scan — need at least two for a weight trend.`,
      };
    }
    const delta = round(scans[scans.length - 1].weight - scans[0].weight);
    const direction = delta < 0 ? 'down' : 'up';
    const fallbackAnswer =
      `${intent.member.name}'s weight is ${direction} ${Math.abs(delta)} kg ` +
      `(${scans[0].weight} kg → ${scans[scans.length - 1].weight} kg) over ${scans.length} scans.`;
    return { intent: intent.type, data: { memberName: intent.member.name, delta, scans }, fallbackAnswer };
  }

  // ── member_body_fat_trend ────────────────────────────────────────────────────
  if (intent.type === 'member_body_fat_trend' && intent.member) {
    const scans = await Scan.find({ member: intent.member._id }).sort({ scanDate: 1 }).lean();
    return {
      intent: intent.type,
      data: { memberName: intent.member.name, scans },
      fallbackAnswer: summarizeBodyFatTrend(intent.member.name, scans),
    };
  }

  // ── member_coaching_focus ────────────────────────────────────────────────────
  if (intent.type === 'member_coaching_focus' && intent.member) {
    const scans = await Scan.find({ member: intent.member._id }).sort({ scanDate: 1 }).lean();
    const delta = latestDelta(scans);
    const goalNote = intent.member.goal ? ` Their stated goal: "${intent.member.goal}".` : '';
    const lastNote = scans.length ? scans[scans.length - 1].notes : '';

    if (!delta) {
      return {
        intent: intent.type,
        data: { memberName: intent.member.name, scans, latestDelta: null },
        fallbackAnswer:
          `Focus on consistency for ${intent.member.name}: sleep, nutrition adherence, and progressive overload until the next scan adds trend data.${goalNote}`,
      };
    }

    const focus = [];
    if (delta.bodyFatPercent > 0.5) focus.push('tighten nutrition quality and weekly calorie targets');
    if (delta.leanMass < -0.3) focus.push('prioritise resistance training frequency and daily protein intake');
    if (!focus.length) focus.push('maintain current plan and set the next performance milestone');

    const coachNote = lastNote ? ` Last scan note: "${lastNote}".` : '';
    return {
      intent: intent.type,
      data: { memberName: intent.member.name, scans, latestDelta: delta, suggestedFocus: focus },
      fallbackAnswer: `For ${intent.member.name}, prioritise ${focus.join(' and ')}.${goalNote}${coachNote}`,
    };
  }

  // ── member_goal ──────────────────────────────────────────────────────────────
  if (intent.type === 'member_goal' && intent.member) {
    const goal = intent.member.goal || 'No goal has been recorded for this member.';
    return {
      intent: intent.type,
      data: { memberName: intent.member.name, goal },
      fallbackAnswer: `${intent.member.name}'s goal: ${goal}`,
    };
  }

  // ── member_summary ───────────────────────────────────────────────────────────
  if (intent.type === 'member_summary') {
    const members = await User.find({ role: 'member' }).lean();
    const summary = [];
    for (const member of members) {
      const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
      if (!scans.length) continue;
      const delta = latestDelta(scans);
      summary.push({
        memberName: member.name,
        scanCount: scans.length,
        firstBodyFat: scans[0].bodyFatPercent,
        latestBodyFat: scans[scans.length - 1].bodyFatPercent,
        leanDelta: delta ? delta.leanMass : null,
      });
    }
    const fallbackAnswer = summary.length
      ? `Member scan summary:\n${summary.map((s) => `• ${s.memberName}: ${s.scanCount} scans, BF ${s.firstBodyFat}% → ${s.latestBodyFat}%${s.leanDelta !== null ? `, lean Δ ${s.leanDelta > 0 ? '+' : ''}${s.leanDelta} kg` : ''}`).join('\n')}`
      : 'No scan data is available yet.';
    return { intent: intent.type, data: { summary }, fallbackAnswer };
  }

  // ── unknown ──────────────────────────────────────────────────────────────────
  return {
    intent: 'unknown',
    data: {},
    fallbackAnswer:
      "I can't answer that from available scan data yet. Try asking about body fat trends, lean mass changes, members with 3+ scans, overdue scans, or top improvers.",
  };
};

// ── Gemini integration ────────────────────────────────────────────────────────

const buildMemberContext = async () => {
  const members = await User.find({ role: 'member' }).lean();
  const context = [];
  for (const member of members) {
    const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
    context.push({
      name: member.name,
      goal: member.goal || null,
      scans: scans.map((s) => ({
        scanDate: s.scanDate,
        weight: s.weight,
        bodyFatPercent: s.bodyFatPercent,
        leanMass: s.leanMass,
        fatMass: s.fatMass,
        visceralFat: s.visceralFat,
        notes: s.notes || null,
      })),
    });
  }
  return context;
};

const callGemini = async (question, queryResult, context) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = [
    'You are MemberGPT — an AI coaching assistant for Kalos gym coaches.',
    'Use ONLY the provided structured query result and context JSON to answer.',
    'If the answer cannot be derived from provided data, reply: I cannot answer that from available scan data.',
    'Rules: be concise and complete. Max 3 sentences per item. Always finish your response — never cut off mid-sentence.',
    'For lists: use "• Name: one-line fact" format. Never leave a list item incomplete.',
    '',
    `Question: ${String(question || '').trim()}`,
    `Intent: ${queryResult.intent}`,
    `Query result: ${JSON.stringify(queryResult.data)}`,
    `Context: ${JSON.stringify(context)}`,
  ].join('\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
  return text || null;
};

// ── Public API ────────────────────────────────────────────────────────────────

export const answerCoachQuestion = async (question) => {
  const q = String(question || '').trim();
  if (!q) return 'Please ask a question about member scan data.';

  const intent = await inferIntent(q);
  const queryResult = await executePredefinedQuery(intent);

  if (process.env.GEMINI_API_KEY) {
    try {
      const context = await buildMemberContext();
      const geminiAnswer = await callGemini(q, queryResult, context);
      if (geminiAnswer) return geminiAnswer;
    } catch (error) {
      console.warn('Gemini unavailable, using fallback:', error.message);
    }
  }

  return queryResult.fallbackAnswer;
};
