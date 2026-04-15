import User from './models/User.js';
import Scan from './models/Scan.js';

const round = (value) => Number(value.toFixed(2));

const latestDelta = (scans) => {
  if (scans.length < 2) return null;
  const prev = scans[scans.length - 2];
  const curr = scans[scans.length - 1];
  return {
    bodyFatPercent: round(curr.bodyFatPercent - prev.bodyFatPercent),
    leanMass: round(curr.leanMass - prev.leanMass),
  };
};

const matchMemberFromQuestion = async (question) => {
  const members = await User.find({ role: 'member' }).lean();
  const normalizedQuestion = String(question || '').toLowerCase();
  return members.find((member) => normalizedQuestion.includes(member.name.toLowerCase())) || null;
};

const summarizeBodyFatTrend = (memberName, scans) => {
  if (scans.length < 2) {
    return `${memberName} has only one scan, so there is not enough data for a trend yet.`;
  }
  const first = scans[0];
  const last = scans[scans.length - 1];
  const delta = round(last.bodyFatPercent - first.bodyFatPercent);
  const pctPerScan = round(delta / (scans.length - 1));
  const direction = delta < 0 ? 'down' : 'up';
  return `${memberName}'s body fat moved ${direction} by ${Math.abs(delta)} points (${first.bodyFatPercent}% -> ${last.bodyFatPercent}%) across ${scans.length} scans, averaging ${Math.abs(pctPerScan)} points per scan.`;
};

const inferIntent = async (question) => {
  const q = String(question || '').toLowerCase();
  const needsMember =
    q.includes('trend') || q.includes('body fat') || q.includes('focus') || q.includes('coaching');
  const member = needsMember ? await matchMemberFromQuestion(question) : null;

  if (q.includes('how many') && (q.includes('3+') || q.includes('three')) && q.includes('scan')) {
    return { type: 'count_members_3plus', member };
  }
  if (q.includes('lost lean mass') || (q.includes('lean mass') && q.includes('last two'))) {
    return { type: 'members_lost_lean_last2', member };
  }
  if (member && (q.includes('trend') || q.includes('body fat'))) {
    return { type: 'member_body_fat_trend', member };
  }
  if (member && (q.includes('focus') || q.includes('coaching'))) {
    return { type: 'member_coaching_focus', member };
  }
  if (q.includes('summary') || q.includes('overview')) {
    return { type: 'member_summary', member };
  }
  return { type: 'unknown', member: null };
};

const executePredefinedQuery = async (intent) => {
  if (intent.type === 'count_members_3plus') {
    const memberIds = await Scan.distinct('member');
    let count = 0;
    for (const memberId of memberIds) {
      const scanCount = await Scan.countDocuments({ member: memberId });
      if (scanCount >= 3) count += 1;
    }
    return { intent: intent.type, data: { count }, fallbackAnswer: `${count} members currently have 3 or more scans.` };
  }

  if (intent.type === 'members_lost_lean_last2') {
    const members = await User.find({ role: 'member' });
    const names = [];
    for (const member of members) {
      const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
      const delta = latestDelta(scans);
      if (delta && delta.leanMass < 0) names.push(member.name);
    }
    return {
      intent: intent.type,
      data: { names },
      fallbackAnswer: names.length
        ? `Members with lean mass loss between their last two scans: ${names.join(', ')}.`
        : 'No members show lean mass loss between their last two scans.',
    };
  }

  if (intent.type === 'member_body_fat_trend' && intent.member) {
    const scans = await Scan.find({ member: intent.member._id }).sort({ scanDate: 1 }).lean();
    return {
      intent: intent.type,
      data: { memberName: intent.member.name, scans },
      fallbackAnswer: summarizeBodyFatTrend(intent.member.name, scans),
    };
  }

  if (intent.type === 'member_coaching_focus' && intent.member) {
    const scans = await Scan.find({ member: intent.member._id }).sort({ scanDate: 1 }).lean();
    const delta = latestDelta(scans);
    if (!delta) {
      return {
        intent: intent.type,
        data: { memberName: intent.member.name, scans, latestDelta: null },
        fallbackAnswer: `Focus on consistency for ${intent.member.name}: sleep, nutrition adherence, and strength training progression until the next scan adds trend data.`,
      };
    }
    const focus = [];
    if (delta.bodyFatPercent > 0) focus.push('tightening nutrition quality and weekly activity');
    if (delta.leanMass < 0) focus.push('improving resistance training and protein intake');
    if (!focus.length) focus.push('maintaining current plan and setting the next performance milestone');
    return {
      intent: intent.type,
      data: { memberName: intent.member.name, scans, latestDelta: delta, suggestedFocus: focus },
      fallbackAnswer: `For ${intent.member.name}, prioritize ${focus.join(' and ')}.`,
    };
  }

  if (intent.type === 'member_summary') {
    const members = await User.find({ role: 'member' }).lean();
    const summary = [];
    for (const member of members) {
      const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
      if (!scans.length) continue;
      summary.push({
        memberName: member.name,
        scanCount: scans.length,
        firstBodyFat: scans[0].bodyFatPercent,
        latestBodyFat: scans[scans.length - 1].bodyFatPercent,
      });
    }
    const fallbackAnswer = summary.length
      ? `Member scan summary: ${summary.map((s) => `${s.memberName}: ${s.scanCount} scans, BF ${s.firstBodyFat}% -> ${s.latestBodyFat}%`).join(' | ')}.`
      : 'No scan data is available yet.';
    return { intent: intent.type, data: { summary }, fallbackAnswer };
  }

  return {
    intent: 'unknown',
    data: {},
    fallbackAnswer: "I cannot answer that from available scan data yet. Try asking about body fat trend, lean mass changes, or members with 3+ scans.",
  };
};

const buildMemberContext = async () => {
  const members = await User.find({ role: 'member' }).lean();
  const context = [];
  for (const member of members) {
    const scans = await Scan.find({ member: member._id }).sort({ scanDate: 1 }).lean();
    context.push({
      name: member.name,
      email: member.email,
      scans: scans.map((scan) => ({
        scanDate: scan.scanDate,
        weight: scan.weight,
        bodyFatPercent: scan.bodyFatPercent,
        leanMass: scan.leanMass,
        fatMass: scan.fatMass,
        visceralFat: scan.visceralFat,
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
    'You are MemberGPT for coaches at Kalos.',
    'Use ONLY the provided structured query result and context JSON.',
    'If the answer cannot be derived from provided data, reply exactly: I cannot answer that from available scan data.',
    'Keep answer concise, factual, and coaching-friendly. Include names and numeric evidence.',
    '',
    `Question: ${String(question || '').trim()}`,
    '',
    `Detected intent: ${queryResult.intent}`,
    `Query result JSON: ${JSON.stringify(queryResult.data)}`,
    '',
    `Data JSON: ${JSON.stringify(context)}`,
  ].join('\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 500 },
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

export const answerCoachQuestion = async (question) => {
  if (!String(question || '').trim()) return 'Please ask a question about member scan data.';

  const intent = await inferIntent(question);
  const queryResult = await executePredefinedQuery(intent);

  if (process.env.GEMINI_API_KEY) {
    try {
      const context = await buildMemberContext();
      const geminiAnswer = await callGemini(question, queryResult, context);
      if (geminiAnswer) return geminiAnswer;
    } catch (error) {
      console.warn('Gemini unavailable, using fallback:', error.message);
    }
  }
  return queryResult.fallbackAnswer;
};
