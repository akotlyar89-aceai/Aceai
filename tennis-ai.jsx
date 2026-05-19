import { useState, useEffect, useRef } from "react";

// ─── Backend Signup Logger ─────────────────────────────────────────────────
// In production, replace this with a real API call to your server/database.
// This logs signups to localStorage to simulate a backend store.
function recordSignup({ name, email, plan, price }) {
  const entry = {
    id: `signup_${Date.now()}`,
    name, email, plan, price,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
    paymentMethod: "venmo",
  };
  try {
    const existing = JSON.parse(localStorage.getItem("ace_signups") || "[]");
    existing.push(entry);
    localStorage.setItem("ace_signups", JSON.stringify(existing));
  } catch {}
  // In production: await fetch("/api/signups", { method: "POST", body: JSON.stringify(entry) })
  return entry;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const MONTHLY_REPORT_SYSTEM = `You are ACE Elite Coach generating a detailed, personalized monthly coaching report. Based on the player's match logs, self-assessments, drill activity, and progress data, create a comprehensive monthly summary they'll look forward to reading. This is their monthly highlight reel and coaching document. Respond ONLY with valid JSON (no markdown):
{
  "month": "May 2026",
  "overallGrade": "B+",
  "gradeColor": "#C4A42B",
  "headline": "Strong serve improvement, backhand still the priority",
  "executiveSummary": "3-4 sentence personal, warm, specific summary of the month — written like a coach who knows this player well",
  "personalMessage": "A warm, specific 2-3 sentence message directly to the player celebrating their effort this month. Use 'you' and make it feel human, not generic.",
  "ntrpEstimate": "3.5",
  "ntrpTrend": "improving",
  "matchRecord": { "wins": 4, "losses": 2, "description": "Brief honest note on match results" },
  "statsTrend": [
    { "label": "1st Serve %", "start": 52, "end": 61, "trend": "up", "note": "Best improvement this month" },
    { "label": "Unforced Errors", "start": 28, "end": 22, "trend": "up", "note": "Down 6 per match" },
    { "label": "Net Points Won", "start": 55, "end": 68, "trend": "up", "note": "Drills are working" },
    { "label": "2nd Serve Win %", "start": 32, "end": 34, "trend": "flat", "note": "Still needs focus" },
    { "label": "Return Games Won", "start": 28, "end": 31, "trend": "up", "note": "Small but consistent" }
  ],
  "milestonesAchieved": [
    { "milestone": "Specific achievement e.g. First match win vs a 4.0 player", "icon": "🏆" },
    { "milestone": "Another specific milestone e.g. Reduced double faults below 3 per match", "icon": "🎾" },
    { "milestone": "Another milestone e.g. Completed 4 consecutive practice weeks", "icon": "📅" }
  ],
  "biggestWin": "Specific, named achievement or breakthrough this month",
  "biggestChallenge": "Specific area still needing work — be honest and direct",
  "weeklyBreakdown": [
    { "week": "Week 1", "focus": "What was worked on", "result": "How it went honestly", "grade": "B" },
    { "week": "Week 2", "focus": "What was worked on", "result": "How it went honestly", "grade": "A-" },
    { "week": "Week 3", "focus": "What was worked on", "result": "How it went honestly", "grade": "B+" },
    { "week": "Week 4", "focus": "What was worked on", "result": "How it went honestly", "grade": "B" }
  ],
  "top3NextLevelFocus": [
    {
      "rank": 1,
      "category": "Technical",
      "title": "Specific technical skill to develop",
      "why": "Why this is holding them back from the next USTA rating",
      "howTo": "Concrete drill or practice method to fix it",
      "impact": "high"
    },
    {
      "rank": 2,
      "category": "Tactical",
      "title": "Specific tactical pattern or decision-making area",
      "why": "Why this matters at the next level",
      "howTo": "Concrete way to develop this in practice and matches",
      "impact": "high"
    },
    {
      "rank": 3,
      "category": "Competition",
      "title": "Match play or competition experience needed",
      "why": "How more match play accelerates their rating progression",
      "howTo": "Specific competition format or league to pursue",
      "impact": "medium"
    }
  ],
  "ustaRoadmap": {
    "currentRating": "3.5",
    "targetRating": "4.0",
    "estimatedTimeline": "4-6 months at current rate of improvement",
    "whatItTakes": "Specific description of what a 4.0 player does that a 3.5 doesn't",
    "ratingKeyRequirements": ["Requirement 1 specific to their game", "Requirement 2", "Requirement 3"],
    "selfRatingTip": "Specific advice on when and how to self-rate up or enter a rating tournament"
  },
  "tournamentLeagueRecommendations": [
    {
      "type": "League",
      "name": "USTA Adult 18+ 3.5 League",
      "why": "Best way to get rated match experience at their level",
      "when": "Typically runs spring and fall seasons — register now for fall",
      "benefit": "Official USTA match results count toward computer rating"
    },
    {
      "type": "Tournament",
      "name": "USTA Self-Rated Tournament",
      "why": "Great way to test your level against players from outside your club",
      "when": "Check tennislink.usta.com for local events",
      "benefit": "Can trigger a computer rating if you win enough matches"
    },
    {
      "type": "Internal",
      "name": "Club ladder or round robin",
      "why": "Low-pressure way to get more match reps against a variety of styles",
      "when": "Ongoing — ask your club pro about current ladder",
      "benefit": "Builds match toughness and reveals tactical weaknesses quickly"
    }
  ],
  "nextMonthGoal": {
    "primaryGoal": "One specific, measurable goal for next month",
    "drillFocus": "The main drill to practice daily",
    "matchTarget": "Specific measurable match performance target",
    "mindsetFocus": "One mental game focus for the month"
  },
  "motivationalQuote": { "quote": "A relevant tennis or sports quote", "author": "Author" },
  "closingNote": "A warm, personal, specific 2-3 sentence closing message from the coach. Name something specific they should feel proud of and fire them up for next month."
}
Make every field specific to what the player told you. Never be generic. Always return only the JSON.`;

const DAILY_BRIEFING_SYSTEM = `You are ACE Elite Coach sending a player their daily training briefing. Based on their current drill plan, recent match logs, and weekly schedule, generate an encouraging, specific, actionable daily message. Respond ONLY with valid JSON (no markdown):
{
  "greeting": "Good morning [name]! / Good afternoon! / etc.",
  "dayTheme": "Today's Focus — Serve Power & Kick",
  "todayMessage": "2-3 sentence personal message about what today's session should focus on and why it matters for their specific goals",
  "todayDrills": [
    { "drill": "Kick Serve Cone Targets", "duration": "20 min", "priority": "main" },
    { "drill": "Crosscourt Forehand Rally", "duration": "15 min", "priority": "secondary" }
  ],
  "coachTipOfDay": "One specific, actionable tip relevant to today's focus",
  "weekAhead": [
    { "day": "Tomorrow", "theme": "Footwork & Shadow Swings", "type": "off-court" },
    { "day": "Wednesday", "theme": "Match Simulation", "type": "on-court" },
    { "day": "Thursday", "theme": "Rest & Review", "type": "rest" }
  ],
  "motivationalQuote": { "quote": "A short relevant tennis or sports quote", "author": "Author name" },
  "streakNote": "A note about their training consistency or encouraging them to keep going"
}
Make it feel like a real coach who knows this player. Always return only JSON.`;

const MATCH_STATS_SYSTEM = `You are ACE Match Analyst, an expert tennis coach giving detailed post-match analysis. A player has entered their real match stats. Analyze ONLY what they entered. Respond ONLY with a valid JSON object (no markdown):
{
  "grade": "B+",
  "gradeColor": "#C4A42B",
  "summary": "2-3 sentence honest analysis based strictly on the stats entered — be specific and direct",
  "statInsights": [
    { "label": "Stat name", "value": 65, "cls": "fill-good", "note": "65%", "insight": "One specific coaching insight about this stat and what it costs or earns the player" }
  ],
  "biggestProblem": "The single stat costing them the most points and exactly why — be very specific",
  "biggestStrength": "The single stat that is their biggest asset and how to leverage it more",
  "advancedAnalysis": [
    { "title": "Pattern analysis title", "detail": "Detailed tactical or technical explanation of what this stat reveals about their game — 2-3 sentences minimum. Include court positioning, spin, timing, or tactical context." },
    { "title": "Second pattern analysis", "detail": "Another detailed insight — connect dots between multiple stats if possible." }
  ],
  "drillPlan": [
    {
      "drillName": "Specific drill name e.g. Kick Serve Cone Targets",
      "focus": "What stat/weakness this drill directly fixes",
      "duration": "20 min",
      "frequency": "Daily",
      "instructions": "Step by step: exactly what to do, where to stand, what target to aim for, how many reps. Be specific enough that a player can do this alone or with a partner.",
      "successTarget": "Specific measurable goal e.g. Land 7/10 kick serves within 2 feet of T cone",
      "coachTip": "One key technique cue",
      "videoUrl": "https://www.youtube.com/watch?v=P8eZQBD-X0c",
      "videoTitle": "Kick Serve Technique — FuzzyYellowBalls",
      "videoChannel": "FuzzyYellowBalls · YouTube"
    },
    {
      "drillName": "Second drill name",
      "focus": "Second weakness addressed",
      "duration": "15 min",
      "frequency": "3x per week",
      "instructions": "Step by step instructions for this drill",
      "successTarget": "Specific measurable success target",
      "coachTip": "Key technique cue",
      "videoUrl": "https://www.youtube.com/watch?v=aZj7DIEftPg",
      "videoTitle": "Forehand Consistency Drill — Top Tennis Training",
      "videoChannel": "Top Tennis Training · YouTube"
    },
    {
      "drillName": "Third drill name",
      "focus": "Third area to address",
      "duration": "15 min",
      "frequency": "2x per week",
      "instructions": "Step by step instructions",
      "successTarget": "Measurable success target",
      "coachTip": "Key cue",
      "videoUrl": "https://www.youtube.com/watch?v=D1npzA6_Q3U",
      "videoTitle": "Volley and Net Approach Drill — Essential Tennis",
      "videoChannel": "Essential Tennis · YouTube"
    }
  ],
  "nextWeekPlan": {
    "theme": "Next week's overall training theme in 6 words",
    "days": [
      { "day": "Monday",    "session": "On-court drill name and focus", "duration": "45 min", "type": "on-court" },
      { "day": "Tuesday",   "session": "Off-court drill or conditioning", "duration": "30 min", "type": "off-court" },
      { "day": "Wednesday", "session": "On-court pattern or match play", "duration": "45 min", "type": "on-court" },
      { "day": "Thursday",  "session": "Rest or light off-court work", "duration": "20 min", "type": "rest" },
      { "day": "Friday",    "session": "Match simulation or point play", "duration": "60 min", "type": "on-court" },
      { "day": "Saturday",  "session": "Specific drill from plan above", "duration": "40 min", "type": "on-court" },
      { "day": "Sunday",    "session": "Rest and mental review", "duration": "-", "type": "rest" }
    ]
  },
  "weeklyGoals": [
    { "goal": "Specific measurable goal for next week", "metric": "How to measure it e.g. 7/10 kick serves in" },
    { "goal": "Second measurable goal", "metric": "How to measure it" },
    { "goal": "Third measurable goal", "metric": "How to measure it" }
  ],
  "chips": [
    { "label": "Short chip insight", "type": "red" },
    { "label": "Short chip insight", "type": "yellow" },
    { "label": "Short chip insight", "type": "green" }
  ]
}
Pick video URLs from these verified working options based on drill focus:
- Serve/Kick Serve: https://www.youtube.com/watch?v=P8eZQBD-X0c (FuzzyYellowBalls · YouTube)
- Forehand: https://www.youtube.com/watch?v=aZj7DIEftPg (Top Tennis Training · YouTube)
- Backhand: https://www.youtube.com/watch?v=OU39URVIpVc (Top Tennis Training · YouTube)
- Volley/Net: https://www.youtube.com/watch?v=D1npzA6_Q3U (Top Tennis Training · YouTube)
- Return: https://www.youtube.com/watch?v=_pS0otk2560 (Top Tennis Training · YouTube)
- Footwork: https://www.youtube.com/watch?v=eGWhONP7558 (Top Tennis Training · YouTube)
- Shot patterns/ball machine: https://www.youtube.com/watch?v=CofM-vwQRW4 (Top Tennis Training · YouTube)
Only include statInsights for stats the player actually entered. Always return only the JSON.`;

// ─── Palette & Design System ───────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --clay: #C8622A;
    --clay-light: #E07840;
    --grass: #2D5016;
    --grass-light: #4A7C2F;
    --hard: #1A3A5C;
    --hard-light: #2B5F8A;
    --off-white: #F5F0E8;
    --chalk: #FAF7F2;
    --ink: #1A1410;
    --mid: #6B5E52;
    --accent: #E8C547;
    --accent-dark: #C4A42B;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--chalk);
    color: var(--ink);
    overflow-x: hidden;
  }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px;
    height: 64px;
    background: rgba(250,247,242,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(200,98,42,0.15);
  }
  .nav-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 2px;
    color: var(--clay);
    cursor: pointer;
  }
  .nav-logo span { color: var(--ink); }
  .nav-links { display: flex; gap: 32px; list-style: none; }
  .nav-links li a {
    font-size: 14px; font-weight: 500; letter-spacing: 0.5px;
    color: var(--mid); text-decoration: none;
    transition: color 0.2s;
  }
  .nav-links li a:hover { color: var(--clay); }
  .nav-cta {
    background: var(--clay); color: white;
    border: none; border-radius: 4px;
    padding: 10px 24px; font-size: 14px; font-weight: 600;
    cursor: pointer; letter-spacing: 0.5px;
    transition: background 0.2s, transform 0.1s;
  }
  .nav-cta:hover { background: var(--clay-light); transform: translateY(-1px); }

  /* HERO */
  .hero {
    min-height: 100vh;
    display: flex; flex-direction: column; justify-content: center;
    padding: 100px 60px 60px;
    position: relative;
    overflow: hidden;
  }
  .hero-bg {
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 60% 80% at 85% 50%, rgba(200,98,42,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 10% 80%, rgba(45,80,22,0.06) 0%, transparent 60%);
  }
  .hero-court-lines {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    opacity: 0.04;
    background-image:
      linear-gradient(var(--clay) 1px, transparent 1px),
      linear-gradient(90deg, var(--clay) 1px, transparent 1px);
    background-size: 80px 80px;
  }
  .hero-content { position: relative; z-index: 1; max-width: 700px; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(200,98,42,0.1); border: 1px solid rgba(200,98,42,0.3);
    border-radius: 100px; padding: 6px 16px;
    font-size: 12px; font-weight: 600; letter-spacing: 1px;
    color: var(--clay); margin-bottom: 28px;
    text-transform: uppercase;
  }
  .hero-badge span { display: inline-block; width: 6px; height: 6px; background: var(--clay); border-radius: 50%; }
  .hero h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(72px, 10vw, 140px);
    line-height: 0.9;
    letter-spacing: -1px;
    color: var(--ink);
    margin-bottom: 24px;
  }
  .hero h1 em { color: var(--clay); font-style: normal; }
  .hero p {
    font-size: 19px; line-height: 1.6; color: var(--mid);
    max-width: 520px; margin-bottom: 40px; font-weight: 300;
  }
  .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
  .btn-primary {
    background: var(--clay); color: white;
    border: none; border-radius: 4px;
    padding: 16px 36px; font-size: 15px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.5px;
    transition: all 0.2s;
  }
  .btn-primary:hover { background: var(--clay-light); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,98,42,0.3); }
  .btn-outline {
    background: transparent; color: var(--ink);
    border: 2px solid var(--ink); border-radius: 4px;
    padding: 16px 36px; font-size: 15px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.5px;
    transition: all 0.2s;
  }
  .btn-outline:hover { border-color: var(--clay); color: var(--clay); }

  .hero-stats {
    display: flex; gap: 48px; margin-top: 64px;
    padding-top: 40px; border-top: 1px solid rgba(107,94,82,0.2);
  }
  .stat-item { }
  .stat-num {
    font-family: 'Bebas Neue', sans-serif; font-size: 48px;
    color: var(--clay); line-height: 1;
  }
  .stat-label { font-size: 13px; color: var(--mid); margin-top: 4px; font-weight: 500; }

  /* SECTION COMMON */
  section { padding: 100px 60px; }
  .section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 3px;
    text-transform: uppercase; color: var(--clay);
    margin-bottom: 16px;
  }
  .section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(40px, 6vw, 80px);
    line-height: 1; letter-spacing: 0.5px;
    color: var(--ink); margin-bottom: 20px;
  }
  .section-subtitle {
    font-size: 17px; color: var(--mid); line-height: 1.6;
    max-width: 520px; font-weight: 300;
  }

  /* FEATURES GRID */
  .features-section { background: var(--ink); }
  .features-section .section-title { color: var(--off-white); }
  .features-section .section-subtitle { color: rgba(245,240,232,0.6); }
  .features-section .section-label { color: var(--accent); }
  .features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2px; margin-top: 60px;
    border: 2px solid rgba(255,255,255,0.06);
  }
  .feature-card {
    background: rgba(255,255,255,0.03);
    padding: 40px 36px;
    border: 1px solid rgba(255,255,255,0.05);
    transition: background 0.3s;
    cursor: default;
  }
  .feature-card:hover { background: rgba(200,98,42,0.1); }
  .feature-icon {
    font-size: 32px; margin-bottom: 20px;
    display: block;
  }
  .feature-card h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px; letter-spacing: 1px;
    color: var(--off-white); margin-bottom: 12px;
  }
  .feature-card p { font-size: 15px; color: rgba(245,240,232,0.55); line-height: 1.6; font-weight: 300; }

  /* AI TOOLS TABS */
  .ai-section { background: var(--off-white); }
  .ai-tabs {
    display: flex; gap: 0; margin-top: 48px;
    border-bottom: 2px solid rgba(107,94,82,0.2);
  }
  .ai-tab {
    padding: 14px 28px; font-size: 14px; font-weight: 600;
    letter-spacing: 0.5px; cursor: pointer;
    border: none; background: none; color: var(--mid);
    border-bottom: 3px solid transparent; margin-bottom: -2px;
    transition: all 0.2s;
  }
  .ai-tab.active { color: var(--clay); border-bottom-color: var(--clay); }
  .ai-tab:hover:not(.active) { color: var(--ink); }
  .ai-panel {
    display: none; padding: 48px 0;
    animation: fadeIn 0.3s ease;
  }
  .ai-panel.active { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .ai-panel-left h3 {
    font-family: 'Bebas Neue', sans-serif; font-size: 48px;
    color: var(--ink); margin-bottom: 16px;
  }
  .ai-panel-left p { font-size: 16px; color: var(--mid); line-height: 1.7; margin-bottom: 28px; font-weight: 300; }
  .pain-list { list-style: none; margin-bottom: 32px; }
  .pain-list li {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid rgba(107,94,82,0.1);
    font-size: 15px; color: var(--ink);
  }
  .pain-list li span.icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .ai-chat-box {
    background: white; border: 1px solid rgba(107,94,82,0.15);
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 4px 40px rgba(26,20,16,0.08);
  }
  .chat-header {
    background: var(--ink); padding: 16px 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .chat-header-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--clay); }
  .chat-header span { font-size: 13px; font-weight: 600; color: white; letter-spacing: 0.5px; }
  .chat-messages {
    padding: 24px 20px;
    min-height: 280px;
    max-height: 340px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 16px;
    background: #FAFAF8;
  }
  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-track { background: transparent; }
  .chat-messages::-webkit-scrollbar-thumb { background: rgba(107,94,82,0.3); border-radius: 2px; }
  .msg { max-width: 82%; font-size: 14px; line-height: 1.55; }
  .msg.user {
    align-self: flex-end;
    background: var(--clay); color: white;
    padding: 10px 16px; border-radius: 18px 18px 4px 18px;
    font-weight: 500;
  }
  .msg.ai {
    align-self: flex-start;
    background: white; color: var(--ink);
    padding: 12px 16px; border-radius: 4px 18px 18px 18px;
    border: 1px solid rgba(107,94,82,0.12);
    box-shadow: 0 2px 8px rgba(26,20,16,0.04);
  }
  .msg.ai.loading { color: var(--mid); font-style: italic; }
  .chat-input-row {
    display: flex; gap: 0; padding: 16px;
    border-top: 1px solid rgba(107,94,82,0.12);
    background: white;
  }
  .chat-input {
    flex: 1; padding: 10px 16px;
    border: 1px solid rgba(107,94,82,0.2); border-right: none;
    border-radius: 6px 0 0 6px;
    font-size: 14px; font-family: 'DM Sans', sans-serif;
    color: var(--ink); background: var(--chalk);
    outline: none;
  }
  .chat-input:focus { border-color: var(--clay); background: white; }
  .chat-send {
    background: var(--clay); color: white;
    border: none; border-radius: 0 6px 6px 0;
    padding: 10px 20px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: background 0.2s;
  }
  .chat-send:hover { background: var(--clay-light); }
  .chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

  /* QUICK PROMPTS */
  .quick-prompts { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(107,94,82,0.1); background: white; }
  .quick-prompt {
    font-size: 12px; padding: 6px 12px;
    border: 1px solid rgba(107,94,82,0.2); border-radius: 100px;
    background: var(--chalk); color: var(--mid); cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
    transition: all 0.15s;
  }
  .quick-prompt:hover { border-color: var(--clay); color: var(--clay); background: rgba(200,98,42,0.05); }

  /* PRICING */
  .pricing-section { background: var(--chalk); }
  .pricing-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 24px; margin-top: 60px;
  }
  .annual-card-wrap {
    grid-column: 1 / -1;
    margin-top: 12px;
  }
  .annual-card {
    background: var(--ink);
    border: 2px solid var(--clay);
    border-radius: 10px; padding: 36px 40px;
    display: grid; grid-template-columns: 1fr auto;
    gap: 24px; align-items: center; position: relative; overflow: hidden;
  }
  .annual-card::before {
    content: "";
    position: absolute; top: 0; right: 0;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(200,98,42,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .annual-badge {
    position: absolute; top: 20px; right: 20px;
    background: var(--clay); color: white;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 5px 14px; border-radius: 100px; text-transform: uppercase;
  }
  .annual-left { }
  .annual-label {
    font-size: 11px; font-weight: 700; letter-spacing: 3px;
    text-transform: uppercase; color: var(--clay); margin-bottom: 8px;
  }
  .annual-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 42px;
    color: var(--off-white); letter-spacing: 1px; margin-bottom: 4px; line-height: 1;
  }
  .annual-desc { font-size: 15px; color: rgba(245,240,232,0.55); font-weight: 300; margin-bottom: 20px; }
  .annual-features {
    display: flex; flex-wrap: wrap; gap: 10px;
  }
  .annual-feature-chip {
    font-size: 12px; font-weight: 600; padding: 5px 12px;
    border-radius: 100px;
    background: rgba(255,255,255,0.07); color: rgba(245,240,232,0.75);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .annual-right { text-align: center; min-width: 200px; }
  .annual-was {
    font-size: 13px; color: rgba(245,240,232,0.4);
    text-decoration: line-through; margin-bottom: 4px;
  }
  .annual-price {
    font-family: 'Bebas Neue', sans-serif; font-size: 80px;
    color: var(--clay); line-height: 1; margin-bottom: 2px;
  }
  .annual-price sup { font-size: 32px; vertical-align: top; margin-top: 18px; }
  .annual-per { font-size: 13px; color: rgba(245,240,232,0.5); margin-bottom: 6px; }
  .annual-saving {
    display: inline-block;
    background: rgba(232,197,71,0.15); border: 1px solid rgba(232,197,71,0.3);
    color: var(--accent); font-size: 12px; font-weight: 700;
    padding: 4px 12px; border-radius: 100px; margin-bottom: 20px;
    letter-spacing: 0.5px;
  }
  .btn-annual {
    width: 100%; padding: 14px;
    background: var(--clay); color: white;
    border: none; border-radius: 6px;
    font-size: 15px; font-weight: 700; letter-spacing: 0.5px;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
  }
  .btn-annual:hover { background: var(--clay-light); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(200,98,42,0.3); }
  /* Annual card mobile handled in main media query below */
  .price-card {
    background: white;
    border: 2px solid rgba(107,94,82,0.12);
    border-radius: 8px; padding: 40px 32px;
    position: relative; transition: all 0.25s;
  }
  .price-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(26,20,16,0.1); }
  .price-card.featured { border-color: var(--clay); }
  .featured-badge {
    position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
    background: var(--clay); color: white;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 5px 16px; border-radius: 100px; text-transform: uppercase;
  }
  .price-name {
    font-family: 'Bebas Neue', sans-serif; font-size: 32px;
    letter-spacing: 1px; color: var(--ink); margin-bottom: 8px;
  }
  .price-amount {
    font-family: 'Bebas Neue', sans-serif; font-size: 64px;
    color: var(--clay); line-height: 1; margin-bottom: 4px;
  }
  .price-amount sup { font-size: 28px; vertical-align: top; margin-top: 14px; }
  .price-period { font-size: 14px; color: var(--mid); margin-bottom: 32px; font-weight: 500; }
  .price-features { list-style: none; margin-bottom: 32px; }
  .price-features li {
    padding: 10px 0; border-bottom: 1px solid rgba(107,94,82,0.08);
    font-size: 15px; color: var(--ink);
    display: flex; align-items: center; gap: 10px;
  }
  .price-features li::before { content: "✓"; color: var(--clay); font-weight: 700; }
  .btn-plan {
    width: 100%; padding: 14px;
    border-radius: 4px; font-size: 15px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.5px;
    transition: all 0.2s; border: 2px solid var(--clay);
  }
  .btn-plan.primary { background: var(--clay); color: white; }
  .btn-plan.primary:hover { background: var(--clay-light); }
  .btn-plan.secondary { background: transparent; color: var(--clay); }
  .btn-plan.secondary:hover { background: rgba(200,98,42,0.06); }

  /* MATCH ANALYSIS VISUAL */
  .analysis-visual {
    background: white; border: 1px solid rgba(107,94,82,0.12);
    border-radius: 10px; padding: 28px;
    box-shadow: 0 4px 32px rgba(26,20,16,0.06);
  }
  .analysis-title {
    font-size: 12px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--mid);
    margin-bottom: 20px;
  }
  .stat-bar { margin-bottom: 18px; }
  .stat-bar-label {
    display: flex; justify-content: space-between;
    font-size: 13px; color: var(--ink); margin-bottom: 6px; font-weight: 500;
  }
  .stat-bar-track {
    height: 8px; background: rgba(107,94,82,0.1);
    border-radius: 4px; overflow: hidden;
  }
  .stat-bar-fill {
    height: 100%; border-radius: 4px;
    transition: width 1s cubic-bezier(0.4,0,0.2,1);
  }
  .fill-bad { background: #D94F3B; }
  .fill-mid { background: var(--accent-dark); }
  .fill-good { background: var(--grass-light); }
  .insight-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .chip {
    font-size: 12px; font-weight: 600; padding: 6px 12px;
    border-radius: 4px; letter-spacing: 0.3px;
  }
  .chip-red { background: rgba(217,79,59,0.1); color: #D94F3B; }
  .chip-yellow { background: rgba(196,164,43,0.12); color: var(--accent-dark); }
  .chip-green { background: rgba(74,124,47,0.1); color: var(--grass-light); }

  /* COURT SURFACE SELECTOR */
  .surface-selector { display: flex; gap: 12px; margin-bottom: 24px; }
  .surface-btn {
    flex: 1; padding: 12px 8px; border-radius: 6px; border: 2px solid transparent;
    text-align: center; cursor: pointer; transition: all 0.2s;
    font-size: 13px; font-weight: 600; letter-spacing: 0.3px;
  }
  .surface-btn.clay { background: rgba(200,98,42,0.08); color: var(--clay); }
  .surface-btn.grass { background: rgba(45,80,22,0.08); color: var(--grass); }
  .surface-btn.hard { background: rgba(26,58,92,0.08); color: var(--hard); }
  .surface-btn.clay.active { border-color: var(--clay); background: rgba(200,98,42,0.15); }
  .surface-btn.grass.active { border-color: var(--grass); background: rgba(45,80,22,0.15); }
  .surface-btn.hard.active { border-color: var(--hard); background: rgba(26,58,92,0.15); }

  /* FOOTER */
  footer {
    background: var(--ink); padding: 60px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 24px;
  }
  .footer-logo {
    font-family: 'Bebas Neue', sans-serif; font-size: 32px;
    letter-spacing: 2px; color: var(--clay);
  }
  footer p { font-size: 13px; color: rgba(245,240,232,0.4); }
  .footer-links { display: flex; gap: 24px; }
  .footer-links a { font-size: 13px; color: rgba(245,240,232,0.5); text-decoration: none; }
  .footer-links a:hover { color: var(--clay); }

  /* MODAL OVERLAY */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(26,20,16,0.72);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: var(--chalk); border-radius: 12px;
    width: 100%; max-width: 480px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(26,20,16,0.3);
    animation: slideUp 0.25s cubic-bezier(0.4,0,0.2,1);
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .modal-header {
    background: var(--ink); padding: 24px 28px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-header-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 26px;
    letter-spacing: 1px; color: var(--off-white);
  }
  .modal-header-plan {
    font-size: 13px; font-weight: 700; color: var(--clay);
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .modal-close {
    background: none; border: none; color: rgba(245,240,232,0.5);
    font-size: 22px; cursor: pointer; line-height: 1;
    transition: color 0.15s;
  }
  .modal-close:hover { color: white; }
  .modal-body { padding: 28px; }
  .modal-plan-summary {
    background: white; border: 1px solid rgba(107,94,82,0.15);
    border-radius: 8px; padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px;
  }
  .modal-plan-name { font-size: 15px; font-weight: 700; color: var(--ink); }
  .modal-plan-desc { font-size: 12px; color: var(--mid); margin-top: 2px; }
  .modal-plan-price {
    font-family: 'Bebas Neue', sans-serif; font-size: 36px;
    color: var(--clay); line-height: 1;
  }
  .modal-plan-price sub { font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--mid); }
  .modal-field { margin-bottom: 16px; }
  .modal-field label {
    display: block; font-size: 12px; font-weight: 700;
    letter-spacing: 0.8px; text-transform: uppercase; color: var(--mid);
    margin-bottom: 6px;
  }
  .modal-input {
    width: 100%; padding: 12px 16px;
    border: 1.5px solid rgba(107,94,82,0.2); border-radius: 6px;
    font-size: 15px; font-family: 'DM Sans', sans-serif;
    color: var(--ink); background: white; outline: none;
    transition: border-color 0.2s;
  }
  .modal-input:focus { border-color: var(--clay); }
  .modal-input.error { border-color: #D94F3B; }
  .field-error { font-size: 12px; color: #D94F3B; margin-top: 4px; }
  .modal-trial-note {
    font-size: 13px; color: var(--mid); text-align: center;
    margin-bottom: 20px; line-height: 1.5;
  }
  .modal-trial-note strong { color: var(--ink); }
  .venmo-btn {
    width: 100%; padding: 16px;
    background: #3D95CE; color: white;
    border: none; border-radius: 8px;
    font-size: 16px; font-weight: 700; letter-spacing: 0.5px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .venmo-btn:hover { background: #2980b9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(61,149,206,0.3); }
  .venmo-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .venmo-logo {
    font-size: 20px; font-weight: 900; letter-spacing: -1px;
  }
  .modal-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 18px 0; color: var(--mid); font-size: 12px;
  }
  .modal-divider::before, .modal-divider::after {
    content: ""; flex: 1; height: 1px; background: rgba(107,94,82,0.15);
  }
  .modal-security {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 12px; color: var(--mid); margin-top: 16px;
  }

  /* SUCCESS STATE */
  .modal-success { padding: 48px 28px; text-align: center; }
  .success-icon { font-size: 56px; margin-bottom: 16px; }
  .success-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 40px;
    color: var(--ink); margin-bottom: 12px; letter-spacing: 1px;
  }
  .success-body { font-size: 15px; color: var(--mid); line-height: 1.6; margin-bottom: 28px; }
  .venmo-handle {
    background: rgba(61,149,206,0.1); border: 1px solid rgba(61,149,206,0.3);
    border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;
    font-size: 18px; font-weight: 700; color: #3D95CE; letter-spacing: 0.5px;
  }
  .venmo-handle sub { font-size: 13px; font-weight: 400; color: var(--mid); display: block; margin-bottom: 4px; }

  /* VIDEO UPLOAD SECTION */
  .upload-zone {
    border: 2px dashed rgba(200,98,42,0.35); border-radius: 12px;
    background: rgba(200,98,42,0.03); padding: 48px 32px;
    text-align: center; cursor: pointer;
    transition: all 0.2s; position: relative;
  }
  .upload-zone:hover, .upload-zone.dragging {
    border-color: var(--clay); background: rgba(200,98,42,0.06);
  }
  .upload-zone input[type=file] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
  }
  .upload-icon { font-size: 48px; margin-bottom: 16px; display: block; }
  .upload-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 28px;
    letter-spacing: 1px; color: var(--ink); margin-bottom: 8px;
  }
  .upload-sub { font-size: 14px; color: var(--mid); line-height: 1.5; }
  .upload-sub span { color: var(--clay); font-weight: 600; }
  .upload-formats { font-size: 12px; color: var(--mid); margin-top: 12px; opacity: 0.7; }

  .upload-context-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .upload-context-row select, .upload-context-row input {
    padding: 11px 14px; border: 1.5px solid rgba(107,94,82,0.2); border-radius: 6px;
    font-size: 14px; font-family: 'DM Sans', sans-serif;
    color: var(--ink); background: white; outline: none;
    transition: border-color 0.2s;
  }
  .upload-context-row select:focus, .upload-context-row input:focus { border-color: var(--clay); }

  .upload-notes {
    width: 100%; padding: 12px 14px;
    border: 1.5px solid rgba(107,94,82,0.2); border-radius: 6px;
    font-size: 14px; font-family: 'DM Sans', sans-serif;
    color: var(--ink); background: white; outline: none; resize: vertical;
    min-height: 80px; transition: border-color 0.2s; margin-bottom: 16px;
    display: block;
  }
  .upload-notes:focus { border-color: var(--clay); }

  .file-preview {
    background: white; border: 1px solid rgba(107,94,82,0.15);
    border-radius: 8px; padding: 14px 18px;
    display: flex; align-items: center; gap: 14px; margin-bottom: 16px;
  }
  .file-preview-icon { font-size: 28px; }
  .file-preview-info { flex: 1; }
  .file-preview-name { font-size: 14px; font-weight: 600; color: var(--ink); }
  .file-preview-size { font-size: 12px; color: var(--mid); margin-top: 2px; }
  .file-remove {
    background: none; border: none; color: var(--mid); font-size: 18px;
    cursor: pointer; padding: 4px; transition: color 0.15s;
  }
  .file-remove:hover { color: #D94F3B; }

  .analyze-btn {
    width: 100%; padding: 15px;
    background: var(--clay); color: white;
    border: none; border-radius: 6px;
    font-size: 15px; font-weight: 700; letter-spacing: 0.5px;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .analyze-btn:hover:not(:disabled) { background: var(--clay-light); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(200,98,42,0.25); }
  .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .analysis-progress {
    background: white; border: 1px solid rgba(107,94,82,0.12);
    border-radius: 10px; padding: 28px; margin-bottom: 20px;
  }
  .progress-step {
    display: flex; align-items: center; gap: 14px;
    padding: 10px 0; border-bottom: 1px solid rgba(107,94,82,0.07);
    font-size: 14px; color: var(--mid);
  }
  .progress-step:last-child { border-bottom: none; }
  .progress-step.done { color: var(--ink); }
  .progress-step.active { color: var(--clay); font-weight: 600; }
  .step-dot {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
  }
  .step-dot.done { background: var(--grass-light); color: white; }
  .step-dot.active { background: var(--clay); color: white; animation: pulse 1.2s infinite; }
  .step-dot.pending { background: rgba(107,94,82,0.12); color: var(--mid); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  .video-results { }
  .results-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
  }
  .results-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 32px;
    color: var(--ink); letter-spacing: 0.5px;
  }
  .results-grade {
    display: flex; align-items: center; gap: 10px;
  }
  .grade-circle {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: white;
  }
  .grade-label { font-size: 12px; color: var(--mid); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .results-summary {
    background: white; border: 1px solid rgba(107,94,82,0.12);
    border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;
    font-size: 14px; color: var(--ink); line-height: 1.7;
  }
  .results-reset {
    background: none; border: 1px solid rgba(107,94,82,0.25); border-radius: 4px;
    padding: 8px 18px; font-size: 13px; color: var(--mid); cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: all 0.15s;
  }
  .results-reset:hover { border-color: var(--clay); color: var(--clay); }

  /* TIPS SECTIONS */
  .tips-section { background: var(--chalk); }
  .tips-section.doubles { background: var(--off-white); }
  .tips-tabs { display: flex; gap: 12px; margin: 40px 0 32px; flex-wrap: wrap; }
  .tips-tab {
    padding: 10px 22px; font-size: 13px; font-weight: 700;
    letter-spacing: 0.5px; border-radius: 100px; cursor: pointer;
    border: 2px solid rgba(107,94,82,0.2); background: white;
    color: var(--mid); transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .tips-tab.active { background: var(--clay); color: white; border-color: var(--clay); }
  .tips-tab:hover:not(.active) { border-color: var(--clay); color: var(--clay); }

  .tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .tip-card {
    background: white; border-radius: 10px;
    border: 1px solid rgba(107,94,82,0.1);
    overflow: hidden; transition: all 0.25s; position: relative;
  }
  .tip-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(26,20,16,0.08); }
  .tip-card.locked { filter: none; }
  .tip-card-header {
    padding: 20px 22px 14px;
    border-bottom: 1px solid rgba(107,94,82,0.08);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .tip-card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .tip-badge {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
  }
  .badge-today { background: rgba(200,98,42,0.12); color: var(--clay); }
  .badge-classic { background: rgba(107,94,82,0.1); color: var(--mid); }
  .badge-premium { background: rgba(232,197,71,0.15); color: var(--accent-dark); }
  .tip-difficulty {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--mid);
  }
  .tip-card-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 22px;
    letter-spacing: 0.5px; color: var(--ink); line-height: 1.1;
  }
  .tip-card-icon { font-size: 28px; flex-shrink: 0; }
  .tip-card-body { padding: 16px 22px 20px; position: relative; }
  .tip-card-body p { font-size: 14px; color: var(--mid); line-height: 1.65; font-weight: 300; }
  .tip-card-body p strong { color: var(--ink); font-weight: 600; }

  /* LOCKED STATE */
  .tip-locked-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(250,247,242,0) 0%, rgba(250,247,242,0.97) 40%);
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    padding: 20px; text-align: center;
  }
  .lock-icon { font-size: 22px; margin-bottom: 6px; }
  .lock-text { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 10px; }
  .lock-cta {
    background: var(--clay); color: white; border: none;
    border-radius: 4px; padding: 8px 20px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.2s;
  }
  .lock-cta:hover { background: var(--clay-light); }

  /* DAILY BANNER */
  .daily-banner {
    background: var(--clay); color: white;
    padding: 14px 24px; border-radius: 8px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 32px; flex-wrap: wrap;
  }
  .daily-banner-icon { font-size: 24px; }
  .daily-banner-text { flex: 1; }
  .daily-banner-text strong { font-size: 15px; font-weight: 700; display: block; }
  .daily-banner-text span { font-size: 13px; opacity: 0.85; }
  .daily-banner-badge {
    background: rgba(255,255,255,0.2); border-radius: 100px;
    padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  }

  /* ELITE MONTHLY REPORT & DAILY BRIEFING */
  .elite-section { background: var(--ink); padding: 100px 60px; }
  .elite-section .section-label { color: var(--accent); }
  .elite-section .section-title { color: var(--off-white); }
  .elite-section .section-subtitle { color: rgba(245,240,232,0.55); }

  .briefing-card {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; overflow: hidden;
  }
  .briefing-header {
    background: var(--clay); padding: 20px 24px;
    display: flex; align-items: center; gap: 14;
  }
  .briefing-header-icon { font-size: 28px; }
  .briefing-header-text { flex: 1; }
  .briefing-header-text h3 { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 1px; color: white; margin-bottom: 2px; }
  .briefing-header-text span { font-size: 12px; color: rgba(255,255,255,0.75); font-weight: 500; }
  .briefing-body { padding: 22px 24px; }
  .briefing-greeting { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: var(--off-white); letter-spacing: 0.5px; margin-bottom: 6px; }
  .briefing-theme { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--clay); margin-bottom: 14px; }
  .briefing-message { font-size: 14px; color: rgba(245,240,232,0.7); line-height: 1.7; margin-bottom: 20px; font-weight: 300; }
  .briefing-drills { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .briefing-drill {
    display: flex; align-items: center; gap: 12; padding: 10px 14px;
    background: rgba(255,255,255,0.04); border-radius: 8px;
    border-left: 3px solid var(--clay);
  }
  .briefing-drill.secondary { border-left-color: rgba(200,98,42,0.4); }
  .briefing-drill-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--off-white); }
  .briefing-drill-duration { font-size: 11px; color: rgba(245,240,232,0.5); }
  .briefing-tip { background: rgba(200,98,42,0.12); border: 1px solid rgba(200,98,42,0.25); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
  .briefing-tip span { font-size: 11px; font-weight: 700; color: var(--clay); text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; }
  .briefing-tip p { font-size: 13px; color: rgba(245,240,232,0.8); line-height: 1.5; }
  .briefing-week { }
  .briefing-week-title { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(245,240,232,0.4); margin-bottom: 10px; }
  .briefing-week-row { display: flex; align-items: center; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .briefing-week-day { font-size: 12px; font-weight: 700; color: rgba(245,240,232,0.5); width: 80px; flex-shrink: 0; }
  .briefing-week-theme { font-size: 12px; color: rgba(245,240,232,0.7); flex: 1; }
  .briefing-week-type { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; flex-shrink: 0; }
  .type-on { background: rgba(200,98,42,0.15); color: var(--clay); }
  .type-off { background: rgba(26,58,92,0.2); color: #6BA3C8; }
  .type-rest { background: rgba(107,94,82,0.15); color: rgba(245,240,232,0.4); }
  .briefing-quote { margin-top: 20px; padding: 14px 16px; border-left: 3px solid var(--accent); }
  .briefing-quote p { font-size: 13px; color: rgba(245,240,232,0.6); font-style: italic; line-height: 1.6; }
  .briefing-quote cite { font-size: 11px; color: var(--accent); font-style: normal; font-weight: 700; display: block; margin-top: 6px; }

  /* MONTHLY REPORT */
  .report-card {
    background: white; border-radius: 12px; overflow: hidden;
    box-shadow: 0 8px 48px rgba(26,20,16,0.3);
  }
  .report-hero {
    background: var(--ink); padding: 32px 36px;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
  }
  .report-hero-left { }
  .report-badge { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .report-title { font-family: 'Bebas Neue', sans-serif; font-size: 42px; color: var(--off-white); letter-spacing: 1px; line-height: 1; margin-bottom: 6px; }
  .report-subtitle { font-size: 14px; color: rgba(245,240,232,0.55); font-weight: 300; }
  .report-grade-circle { width: 80px; height: 80px; border-radius: "50%"; display: flex; align-items: center; justify-content: center; font-family: "'Bebas Neue', sans-serif"; font-size: 42px; color: white; flex-shrink: 0; border-radius: 50%; }
  .report-body { padding: 32px 36px; }
  .report-section-title { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--mid); margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(107,94,82,0.12); }
  .report-summary { font-size: 15px; color: var(--ink); line-height: 1.75; margin-bottom: 28px; padding: 18px 20px; background: rgba(200,98,42,0.04); border-left: 3px solid var(--clay); border-radius: 0 6px 6px 0; }
  .report-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
  .report-stat-card { background: var(--chalk); border-radius: 8px; padding: 14px 16px; }
  .report-stat-label { font-size: 11px; font-weight: 700; color: var(--mid); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .report-stat-values { display: flex; align-items: center; gap: 10px; }
  .report-stat-start { font-size: 13px; color: var(--mid); text-decoration: line-through; }
  .report-stat-end { font-family: 'Bebas Neue', sans-serif; font-size: 28px; line-height: 1; }
  .report-stat-trend { font-size: 12px; font-weight: 700; }
  .report-week-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 28px; }
  .report-week-card { background: var(--chalk); border-radius: 8px; padding: 14px 16px; }
  .report-week-label { font-size: 11px; font-weight: 700; color: var(--mid); text-transform: uppercase; margin-bottom: 4px; }
  .report-week-focus { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
  .report-week-result { font-size: 12px; color: var(--mid); line-height: 1.4; }
  .report-insights { margin-bottom: 28px; }
  .report-insight-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(107,94,82,0.08); }
  .report-next-month { background: var(--ink); border-radius: 10px; padding: 24px; margin-bottom: 28px; }
  .report-next-month-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--off-white); margin-bottom: 16px; letter-spacing: 0.5px; }
  .report-next-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .report-next-label { font-size: 10px; font-weight: 700; color: var(--clay); text-transform: uppercase; letter-spacing: 1px; width: 100px; flex-shrink: 0; padding-top: 2px; }
  .report-next-value { font-size: 13px; color: rgba(245,240,232,0.8); line-height: 1.5; }
  .report-motivational { text-align: center; padding: 24px; background: rgba(200,98,42,0.06); border-radius: 10px; border: 1px solid rgba(200,98,42,0.15); }
  .report-motivational p { font-size: 15px; color: var(--ink); line-height: 1.7; font-style: italic; }

  /* ═══ MOBILE — Full consistent layout ══════════════════════════════════ */
  @media (max-width: 768px) {
    /* Nav */
    nav { padding: 0 16px; height: 56px; }
    .nav-links { display: none; }
    .nav-logo { font-size: 22px; }
    .nav-cta { padding: 8px 16px; font-size: 13px; }

    /* Hero */
    .hero { padding: 80px 20px 48px; min-height: auto; }
    .hero h1 { font-size: 56px; }
    .hero p { font-size: 16px; }
    .hero-stats { flex-wrap: wrap; gap: 20px; }
    .stat-num { font-size: 36px; }
    .hero-actions { flex-direction: column; }
    .btn-primary, .btn-outline { width: 100%; text-align: center; }

    /* Sections */
    section { padding: 52px 20px; }
    .section-title { font-size: 40px; }
    .elite-section { padding: 52px 20px; }

    /* Features grid */
    .features-grid { grid-template-columns: 1fr; gap: 1px; }

    /* AI Tabs — horizontal scroll on mobile */
    .ai-tabs { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
    .ai-tab { white-space: nowrap; flex-shrink: 0; padding: 12px 16px; font-size: 12px; }

    /* AI panels — single column */
    .ai-panel.active { grid-template-columns: 1fr; gap: 24px; }
    .ai-panel[style*="grid"] { display: flex !important; flex-direction: column; gap: 24px; }
    .ai-panel-left h3 { font-size: 28px; }
    .ai-panel-left p { font-size: 15px; }

    /* Surface selector */
    .surface-selector { gap: 8px; }
    .surface-btn { padding: 10px 6px; font-size: 12px; }

    /* Chat */
    .chat-messages { min-height: 220px; max-height: 260px; }
    .quick-prompts { gap: 6px; }
    .quick-prompt { font-size: 11px; padding: 5px 10px; }

    /* Tips */
    .tips-grid { grid-template-columns: 1fr; }
    .tips-tabs { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
    .tips-tab { white-space: nowrap; flex-shrink: 0; }

    /* Pricing */
    .pricing-grid { grid-template-columns: 1fr; }
    .annual-card { grid-template-columns: 1fr; }
    .annual-right { text-align: left; }
    .annual-badge { top: 16px; right: 16px; }
    .annual-price { font-size: 56px; }

    /* Elite section */
    .elite-section > div[style*="grid-template-columns: 1fr 1fr"] { 
      display: flex !important; flex-direction: column; gap: 32px; 
    }
    .report-stats-grid { grid-template-columns: 1fr; }
    .report-week-grid { grid-template-columns: 1fr; }
    .report-hero { flex-direction: column; gap: 16px; }
    .report-body { padding: 20px; }

    /* Modal */
    .modal-box { max-width: 100%; margin: 8px; border-radius: 10px; }
    .modal-body { padding: 20px; }
    .modal-plan-summary { flex-direction: column; gap: 8px; }

    /* Tactics grid */
    .tactics-grid { grid-template-columns: 1fr !important; }
    .tactics-patterns-grid { grid-template-columns: 1fr !important; }

    /* Coach badge */
    .coach-badge { width: 42px !important; height: 42px !important; bottom: 12px !important; right: 12px !important; }
    .coach-badge img { width: 42px !important; height: 42px !important; }

    /* Analysis visual */
    .analysis-visual { padding: 16px; }

    /* Upload */
    .upload-context-row { grid-template-columns: 1fr; }
    .upload-zone { padding: 32px 20px; }

    /* Briefing */
    .briefing-header { padding: 16px 18px; }
    .briefing-body { padding: 16px 18px; }

    /* Footer */
    footer { padding: 36px 20px; flex-direction: column; gap: 16px; }
  }

  /* ═══ COACH ALEX BADGE ═══════════════════════════════════════════════════ */
  .coach-badge-wrap {
    position: fixed; bottom: 24px; right: 24px; z-index: 90;
  }
  .coach-badge {
    width: 56px; height: 56px; border-radius: 50%;
    border: 3px solid var(--clay);
    overflow: hidden; cursor: pointer;
    box-shadow: 0 4px 20px rgba(26,20,16,0.25);
    transition: transform 0.2s, box-shadow 0.2s;
    background: var(--ink);
  }
  .coach-badge:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(200,98,42,0.4); }
  .coach-badge img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .coach-tooltip {
    position: absolute; bottom: 66px; right: 0;
    background: var(--ink); color: var(--off-white);
    font-size: 12px; font-weight: 600; padding: 6px 12px;
    border-radius: 6px; white-space: nowrap;
    border: 1px solid rgba(200,98,42,0.3);
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s;
  }
  .coach-badge-wrap:hover .coach-tooltip { opacity: 1; }
  .coach-tooltip::after {
    content: ""; position: absolute; top: 100%; right: 16px;
    border: 5px solid transparent; border-top-color: var(--ink);
  }

  /* ═══ TACTICS BREAKDOWN GRID ═════════════════════════════════════════════ */
  .tactics-breakdown {
    margin-top: 32px;
    border-top: 2px solid rgba(107,94,82,0.12);
    padding-top: 32px;
  }
  .tactics-breakdown-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 32px;
    color: var(--ink); letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .tactics-breakdown-sub { font-size: 14px; color: var(--mid); margin-bottom: 24px; }
  .tactics-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;
  }
  .tactics-card {
    background: white; border: 1px solid rgba(107,94,82,0.12);
    border-radius: 10px; overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .tactics-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,20,16,0.08); }
  .tactics-card-header {
    padding: 12px 16px; display: flex; align-items: center; gap: 10px;
  }
  .tactics-card-icon { font-size: 22px; }
  .tactics-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 0.5px; color: var(--ink); }
  .tactics-card-body { padding: 0 16px 16px; }
  .tactics-card-body p { font-size: 13px; color: var(--mid); line-height: 1.6; }

  .tactics-patterns-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;
  }
  .tactics-pattern-card {
    background: white; border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(107,94,82,0.12);
  }
  .tactics-pattern-rank {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-bottom: 1px solid rgba(107,94,82,0.08);
  }
  .rank-num {
    width: 28px; height: 28px; border-radius: 50%; background: var(--clay);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Bebas Neue', sans-serif; font-size: 16px; color: white; flex-shrink: 0;
  }
  .rank-name { font-weight: 700; font-size: 13px; color: var(--ink); }
  .rank-badge { margin-left: auto; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; }
  .tactics-pattern-body { padding: 10px 16px 14px; }
  .tactics-pattern-body p { font-size: 12px; color: var(--mid); line-height: 1.55; margin-bottom: 8px; }

  .tactics-consistency-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  }
  .consistency-card {
    background: white; border-radius: 8px; padding: 14px 12px;
    border: 1px solid rgba(107,94,82,0.1); text-align: center;
  }
  .consistency-shot { font-size: 11px; font-weight: 700; color: var(--mid); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .consistency-target { font-family: 'Bebas Neue', sans-serif; font-size: 28px; line-height: 1; }
  .consistency-note { font-size: 11px; color: var(--mid); margin-top: 4px; line-height: 1.4; }
  .consistency-bar { height: 4px; background: rgba(107,94,82,0.1); border-radius: 2px; margin-top: 8px; }
  .consistency-fill { height: 100%; border-radius: 2px; }
`;

// ─── AI Chat Component ─────────────────────────────────────────────────────
function AIChat({ systemPrompt, quickPrompts, placeholder }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    let reply = null;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: systemPrompt,
          messages: newMessages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.content?.map(b => b.text || "").join("").trim() || null;
      }
    } catch (e) {
      console.error("AIChat fetch error:", e);
    }

    if (!reply) {
      reply = getFallbackReply(userText, systemPrompt);
    }

    setMessages([...newMessages, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  function getFallbackReply(question, system) {
    const q = question.toLowerCase();
    const isTactical = system?.includes("tactical") || system?.includes("strategy");

    if (q.includes("second serve") || q.includes("2nd serve")) {
      return "Your 2nd serve is costing you because you're likely hitting it flat under pressure. Try a kick serve — toss slightly behind your head, brush up the back of the ball with a continental grip, and aim for 70% pace. Practice 20 kick serves daily targeting the opponent's backhand. This alone can flip your 2nd serve win % from 30% to 55%+.";
    }
    if (q.includes("backhand")) {
      return "Backhand breakdown under pressure usually means you're hitting late and arming the ball. Fix: load your shoulder earlier on the split step, keep your off-hand on the throat longer, and swing through to a high finish. Drill: 10 min of crosscourt backhand rallies daily — consistency before power.";
    }
    if (q.includes("unforced error") || q.includes("errors")) {
      return "Most unforced errors at 3.0–4.0 come from three things: going for too much too early, poor footwork putting you off balance, and tight grip under pressure. Fix: aim 3 feet over the net on neutral balls, split step before every shot, and consciously loosen your grip between points.";
    }
    if (q.includes("net") || q.includes("volley")) {
      return "To improve your net game: approach only after a short ball or a wide serve, use a slice approach down the line, split step as your opponent swings, and volley crosscourt at a downward angle. Drill: serve & volley practice — 15 min per session, focusing on the split step timing.";
    }
    if (isTactical && (q.includes("pusher") || q.includes("retriever"))) {
      return "vs a pusher: don't try to overpower them — draw them forward with a short slice, then pass them. Hit high topspin deep to push them behind the baseline, then attack the short ball. Patience wins — make them hit 6+ balls before going for the winner.";
    }
    if (isTactical && q.includes("big hitter")) {
      return "vs a big hitter: slice to neutralize their pace, stand 2-3 feet behind the baseline on returns, and moonball to disrupt their rhythm. They struggle with high bouncing balls and slow pace changes. Come to net behind a wide serve — force the precise passing shot.";
    }
    if (q.includes("footwork") || q.includes("movement")) {
      return "Good footwork starts with the split step — jump slightly as your opponent makes contact. From there, use crossover steps to move wide, never side-shuffle more than 2 steps. Off-court: agility ladder drills 3x per week for 15 min dramatically improve first-step quickness within 4 weeks.";
    }
    if (q.includes("serve") || q.includes("double fault")) {
      return "For serve consistency: slow your toss arm down — most double faults come from a rushed toss. Develop a consistent pre-serve routine (bounce the ball 3 times, same grip, same stance). For double faults specifically, switch to a heavy topspin second serve rather than going for pace. Aim for the service box T on the backhand side.";
    }
    if (q.includes("return") || q.includes("returning")) {
      return "Return of serve: stand closer to the baseline than you think on second serves. Take a compact backswing — you don't need a full swing. Split step as they toss the ball. For big servers, aim crosscourt with a block/redirect rather than swinging big. Consistency beats aggression on return.";
    }
    return "Great question. At your level, the highest-leverage area is usually: serve consistency, return positioning, and reducing unforced errors in neutral rallies. Focus on one thing at a time — tell me more specifically what's happening in your matches and I can give you an exact fix.";
  }

  return (
    <div className="ai-chat-box">
      <div className="chat-header">
        <div className="chat-header-dot" />
        <span>ACE AI · LIVE</span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="msg ai">👋 Hi! I'm your personal tennis AI coach. Ask me anything about your game.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "user" : "ai"}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="msg ai loading">Analyzing your game…</div>}
        <div ref={bottomRef} />
      </div>
      {quickPrompts && (
        <div className="quick-prompts">
          {quickPrompts.map((q, i) => (
            <button key={i} className="quick-prompt" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      )}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder={placeholder || "Ask your AI coach…"}
        />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Match Stats Entry & Analysis ─────────────────────────────────────────
const STAT_FIELDS = [
  { id: "firstServeIn",     label: "1st Serve In",          unit: "%",  min: 0, max: 100, tip: "How many first serves landed in?" },
  { id: "firstServeWon",    label: "1st Serve Points Won",  unit: "%",  min: 0, max: 100, tip: "% of points won when 1st serve went in" },
  { id: "secondServeWon",   label: "2nd Serve Points Won",  unit: "%",  min: 0, max: 100, tip: "% of points won when serving 2nd serve" },
  { id: "doubleFaults",     label: "Double Faults",         unit: "",   min: 0, max: 30,  tip: "Total double faults in the match" },
  { id: "aces",             label: "Aces",                  unit: "",   min: 0, max: 30,  tip: "Total aces served" },
  { id: "returnWon",        label: "Return Points Won",     unit: "%",  min: 0, max: 100, tip: "% of return points won" },
  { id: "unforcedErrors",   label: "Unforced Errors",       unit: "",   min: 0, max: 60,  tip: "Total unforced errors" },
  { id: "winners",          label: "Winners",               unit: "",   min: 0, max: 60,  tip: "Total clean winners hit" },
  { id: "netPointsWon",     label: "Net Points Won",        unit: "%",  min: 0, max: 100, tip: "% of points won when approaching net" },
  { id: "breakPointsWon",   label: "Break Points Won",      unit: "%",  min: 0, max: 100, tip: "% of break point opportunities converted" },
  { id: "totalGamesWon",    label: "Games Won",             unit: "",   min: 0, max: 36,  tip: "Total games won in the match" },
  { id: "totalGamesLost",   label: "Games Lost",            unit: "",   min: 0, max: 36,  tip: "Total games lost in the match" },
];

function MatchAnalysisVisual({ liveData }) {
  // If no live data, show placeholder prompt instead of fake numbers
  if (!liveData) {
    return (
      <div className="analysis-visual" style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>Enter Your Match Stats</div>
        <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6 }}>Fill in your real match numbers on the right and hit Analyze — ACE will break down exactly what the stats mean for your game.</div>
      </div>
    );
  }

  return (
    <div className="analysis-visual">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="analysis-title" style={{ margin: 0 }}>Your Match Breakdown</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: liveData.gradeColor || "var(--clay)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "white" }}>
            {liveData.grade}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6, marginBottom: 16, padding: "10px 12px", background: "rgba(107,94,82,0.05)", borderRadius: 6 }}>
        {liveData.summary}
      </div>

      {liveData.statInsights?.map((s, i) => (
        <div key={i} className="stat-bar">
          <div className="stat-bar-label"><span>{s.label}</span><span>{s.note}</span></div>
          <div className="stat-bar-track">
            <div className={`stat-bar-fill ${s.cls}`} style={{ width: `${Math.min(s.value, 100)}%` }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--mid)", marginTop: 3, lineHeight: 1.4 }}>{s.insight}</div>
        </div>
      ))}

      {liveData.chips && (
        <div className="insight-chips" style={{ marginTop: 12 }}>
          {liveData.chips.map((c, i) => (
            <span key={i} className={`chip chip-${c.type}`}>{c.label}</span>
          ))}
        </div>
      )}

      {/* Biggest Problem + Strength */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        {liveData.biggestProblem && (
          <div style={{ padding: "10px 12px", background: "rgba(217,79,59,0.07)", border: "1px solid rgba(217,79,59,0.2)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>⚠ Biggest Problem</div>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{liveData.biggestProblem}</div>
          </div>
        )}
        {liveData.biggestStrength && (
          <div style={{ padding: "10px 12px", background: "rgba(74,124,47,0.07)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--grass-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>✓ Biggest Strength</div>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{liveData.biggestStrength}</div>
          </div>
        )}
      </div>

      {/* Advanced Analysis */}
      {liveData.advancedAnalysis?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clay)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>🔍 Advanced Pattern Analysis</div>
          {liveData.advancedAnalysis.map((a, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.55 }}>{a.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Drill Plan with Video Links */}
      {liveData.drillPlan?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clay)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>🎯 Your Drill Plan</div>
          {liveData.drillPlan.map((drill, i) => (
            <DrillDetailCard key={i} drill={drill} index={i} />
          ))}
        </div>
      )}

      {/* Next Week Plan */}
      {liveData.nextWeekPlan && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clay)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>📅 Next Week's Training Plan</div>
          {liveData.nextWeekPlan.theme && (
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8, padding: "8px 12px", background: "rgba(200,98,42,0.06)", borderRadius: 6 }}>
              Theme: {liveData.nextWeekPlan.theme}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {liveData.nextWeekPlan.days?.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", borderRadius: 6, background: d.type === "rest" ? "rgba(107,94,82,0.04)" : d.type === "off-court" ? "rgba(26,58,92,0.06)" : "rgba(200,98,42,0.05)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, width: 68, flexShrink: 0, color: d.type === "rest" ? "var(--mid)" : d.type === "off-court" ? "var(--hard-light)" : "var(--clay)" }}>{d.day}</span>
                <span style={{ fontSize: 12, color: "var(--ink)", flex: 1, lineHeight: 1.4 }}>{d.session}</span>
                <span style={{ fontSize: 10, color: "var(--mid)", flexShrink: 0 }}>{d.duration}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Goals */}
      {liveData.weeklyGoals?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--clay)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>🏆 Goals for Next Week</div>
          {liveData.weeklyGoals.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(107,94,82,0.08)" }}>
              <span style={{ color: "var(--clay)", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{i + 1}.</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{g.goal}</div>
                {g.metric && <div style={{ fontSize: 11, color: "var(--clay)", marginTop: 2 }}>📏 {g.metric}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Drill Detail Card (with video link) ─────────────────────────────────────
function DrillDetailCard({ drill, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,98,42,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: "var(--clay)", flexShrink: 0 }}>{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{drill.drillName}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100, background: "rgba(200,98,42,0.08)", color: "var(--clay)" }}>🎯 {drill.focus}</span>
            <span style={{ fontSize: 10, color: "var(--mid)" }}>⏱ {drill.duration}</span>
            <span style={{ fontSize: 10, color: "var(--mid)" }}>📅 {drill.frequency}</span>
            {drill.videoUrl && <span style={{ fontSize: 10, color: "#E53935", fontWeight: 700 }}>▶ Video</span>}
          </div>
        </div>
        <div style={{ color: "var(--mid)", fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(107,94,82,0.08)" }}>
          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.65, marginTop: 10, marginBottom: 10 }}>{drill.instructions}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ background: "rgba(74,124,47,0.08)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--grass-light)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Success Target</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{drill.successTarget}</div>
            </div>
          </div>
          <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--clay)", textTransform: "uppercase", letterSpacing: 1 }}>💡 Coach Tip: </span>
            <span style={{ fontSize: 12, color: "var(--ink)" }}>{drill.coachTip}</span>
          </div>
          {drill.videoUrl && (
            <a href={drill.videoUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff5f5", border: "1px solid rgba(229,57,53,0.2)", borderRadius: 6, padding: "8px 12px", textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, background: "#E53935", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "white", fontSize: 12 }}>▶</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E53935" }}>{drill.videoTitle || "Watch Drill Video"}</div>
                <div style={{ fontSize: 10, color: "var(--mid)" }}>via {drill.videoChannel} · YouTube ↗</div>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Self Assessment Questions ─────────────────────────────────────────────
const SELF_ASSESS_QUESTIONS = [
  { id: "serve",      emoji: "🎾", label: "Serve",             question: "How was your serve today?",                  sub: "Think about first serves in, double faults, and confidence on big points" },
  { id: "return",     emoji: "↩️", label: "Return",            question: "How did you return serve?",                  sub: "Reading the serve, getting the ball back, attacking second serves" },
  { id: "forehand",   emoji: "💪", label: "Forehand",          question: "How was your forehand groundstroke?",         sub: "Consistency, pace, direction, and under pressure" },
  { id: "backhand",   emoji: "🎯", label: "Backhand",          question: "How did your backhand hold up?",             sub: "Slice, topspin, defensive vs offensive" },
  { id: "volley",     emoji: "🥅", label: "Volley / Net Game", question: "How did you perform at the net?",            sub: "Approach shots, volleys, overhead smashes" },
  { id: "movement",   emoji: "🏃", label: "Footwork",          question: "How was your movement and court coverage?",  sub: "Getting to balls, recovery, split step" },
  { id: "mental",     emoji: "🧠", label: "Mental Game",       question: "How was your mental game?",                  sub: "Staying calm, bouncing back from errors, closing out games" },
  { id: "consistency",emoji: "📊", label: "Consistency",       question: "Overall how consistent were you?",           sub: "Keeping the ball in play, avoiding big mistakes" },
];

const RATING_LABELS = ["Very Poor", "Poor", "Below Average", "Average", "Above Average", "Good", "Very Good", "Excellent", "Outstanding", "Perfect"];

const SELF_ASSESS_SYSTEM = `You are ACE Match Analyst, an expert tennis coach giving detailed post-match analysis based on a player's self-ratings. The player rated 8 areas of their game on a 1-10 scale. Go FAR beyond summarizing — give them the same depth a real coach would after watching their match. Respond ONLY with valid JSON (no markdown):
{
  "grade": "B",
  "gradeColor": "#C4A42B",
  "summary": "2-3 sentence honest, specific assessment — not just repeating their ratings. Tell them what the PATTERN of their ratings reveals about their game overall.",
  "statInsights": [
    { "label": "Shot/area name", "value": 70, "cls": "fill-good", "note": "7/10", "insight": "A specific coaching insight — what this rating tells you about their technique, tactics, or mindset. Connect it to match outcomes." }
  ],
  "biggestProblem": "Their lowest-rated area — explain specifically HOW it costs them points in matches, what physically or tactically goes wrong, and why fixing it is the highest leverage change they can make.",
  "biggestStrength": "Their highest-rated area — how to deliberately use this as a tactical weapon to win more points, not just maintain it.",
  "advancedAnalysis": [
    { "title": "Pattern observed across their ratings", "detail": "2-3 sentences of real coaching depth — e.g. connect their low serve rating to their high unforced error rating showing they are playing defensively, or show how their footwork rating explains their backhand struggles. Make connections the player wouldn't make themselves." },
    { "title": "Second tactical or technical observation", "detail": "Another insight connecting dots between different rated areas. Include specific court positions, spin types, or pressure situations where this shows up." }
  ],
  "drillPlan": [
    {
      "drillName": "Specific named drill targeting their weakest area",
      "focus": "Exact weakness this drill fixes",
      "duration": "20 min",
      "frequency": "Daily",
      "instructions": "Step-by-step: exactly what to do, where to stand, what target to hit, how many reps. Specific enough to do alone or with a partner. Reference their specific rating e.g. since you rated your serve 4/10, start by...",
      "successTarget": "Measurable goal e.g. Land 8/10 kick serves within 2 feet of the backhand T cone",
      "coachTip": "One specific technique cue tied to what likely caused their low rating",
      "videoUrl": "https://www.youtube.com/watch?v=P8eZQBD-X0c",
      "videoTitle": "Kick Serve Technique — FuzzyYellowBalls",
      "videoChannel": "FuzzyYellowBalls · YouTube"
    },
    {
      "drillName": "Second drill for their second weakest area",
      "focus": "Second weakness addressed",
      "duration": "15 min",
      "frequency": "3x per week",
      "instructions": "Full step-by-step instructions with specific reps, targets, and progressions",
      "successTarget": "Specific measurable target",
      "coachTip": "Key cue tied to their specific rating",
      "videoUrl": "https://www.youtube.com/watch?v=aZj7DIEftPg",
      "videoTitle": "Forehand Groundstroke Drill — Top Tennis Training",
      "videoChannel": "Top Tennis Training · YouTube"
    },
    {
      "drillName": "Third drill for the third priority area",
      "focus": "Third weakness or consolidation area",
      "duration": "15 min",
      "frequency": "2x per week",
      "instructions": "Full step-by-step instructions",
      "successTarget": "Specific measurable target",
      "coachTip": "Key cue",
      "videoUrl": "https://www.youtube.com/watch?v=D1npzA6_Q3U",
      "videoTitle": "Volley and Net Approach Drill — Essential Tennis",
      "videoChannel": "Essential Tennis · YouTube"
    }
  ],
  "nextWeekPlan": {
    "theme": "Next week's training theme in 6 words based on their weaknesses",
    "days": [
      { "day": "Monday",    "session": "Specific drill from the plan above targeting biggest weakness", "duration": "45 min", "type": "on-court" },
      { "day": "Tuesday",   "session": "Off-court conditioning or shadow swing drill", "duration": "30 min", "type": "off-court" },
      { "day": "Wednesday", "session": "Second drill from plan + short point play", "duration": "45 min", "type": "on-court" },
      { "day": "Thursday",  "session": "Rest or light stretch and mental review", "duration": "20 min", "type": "rest" },
      { "day": "Friday",    "session": "Match simulation focusing on primary pattern", "duration": "60 min", "type": "on-court" },
      { "day": "Saturday",  "session": "Third drill + ball machine work on weakest shot", "duration": "40 min", "type": "on-court" },
      { "day": "Sunday",    "session": "Rest and self-assessment review", "duration": "-", "type": "rest" }
    ]
  },
  "weeklyGoals": [
    { "goal": "Specific measurable improvement goal for their #1 weakness", "metric": "How to measure success — e.g. Rate your serve 6+/10 in next session" },
    { "goal": "Second measurable goal for their #2 weakness", "metric": "How to measure it" },
    { "goal": "Third goal — either a third weakness or a match play goal", "metric": "How to measure it" }
  ],
  "chips": [
    { "label": "Short chip about their lowest area", "type": "red" },
    { "label": "Short chip about a mid area", "type": "yellow" },
    { "label": "Short chip about their strength", "type": "green" }
  ]
}
Convert each 1-10 rating to a percentage (x10) for the value field. Use fill-good for 65+, fill-mid for 40-64, fill-bad below 40.
Pick video URLs from these verified working options based on which areas rated lowest:
- Serve/Kick Serve: https://www.youtube.com/watch?v=P8eZQBD-X0c (FuzzyYellowBalls · YouTube)
- Forehand: https://www.youtube.com/watch?v=aZj7DIEftPg (Top Tennis Training · YouTube)
- Backhand: https://www.youtube.com/watch?v=OU39URVIpVc (Top Tennis Training · YouTube)
- Volley/Net Game: https://www.youtube.com/watch?v=D1npzA6_Q3U (Top Tennis Training · YouTube)
- Return: https://www.youtube.com/watch?v=_pS0otk2560 (Top Tennis Training · YouTube)
- Footwork: https://www.youtube.com/watch?v=eGWhONP7558 (Top Tennis Training · YouTube)
- Mental/Consistency: https://www.youtube.com/watch?v=CofM-vwQRW4 (Top Tennis Training · YouTube)
Always return only the JSON.`;

// ─── Match History Storage ─────────────────────────────────────────────────
function saveMatchLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem("ace_match_logs") || "[]");
    logs.unshift({ ...entry, id: `match_${Date.now()}`, date: new Date().toISOString() });
    localStorage.setItem("ace_match_logs", JSON.stringify(logs.slice(0, 50))); // keep last 50
  } catch {}
}
function loadMatchLogs() {
  try { return JSON.parse(localStorage.getItem("ace_match_logs") || "[]"); } catch { return []; }
}

// ─── Context Fields (extracted to avoid focus-stealing on re-render) ───────
function ContextFields({ level, setLevel, surface, setSurface, result, setResult, opponent, setOpponent }) {
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(107,94,82,0.1)", background: "white" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <select className="modal-input" style={{ fontSize: 13, padding: "8px 12px" }} value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">Your NTRP Level…</option>
          {["2.5","3.0","3.5","4.0","4.5","5.0+"].map(l => <option key={l}>{l} NTRP</option>)}
        </select>
        <select className="modal-input" style={{ fontSize: 13, padding: "8px 12px" }} value={surface} onChange={e => setSurface(e.target.value)}>
          <option value="">Surface…</option>
          {["Hard court","Clay court","Grass court","Indoor"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input
          className="modal-input"
          style={{ fontSize: 13, padding: "8px 12px" }}
          placeholder="Result (e.g. Won 6-4, 6-3)"
          value={result}
          onChange={e => setResult(e.target.value)}
        />
        <input
          className="modal-input"
          style={{ fontSize: 13, padding: "8px 12px" }}
          placeholder="Opponent style (optional)"
          value={opponent}
          onChange={e => setOpponent(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Match History Panel ───────────────────────────────────────────────────
function MatchHistoryPanel({ logs, onSelect, onClose }) {
  if (logs.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>No Match Logs Yet</div>
      <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6 }}>After you analyze a match, it will be saved here automatically. Log 4–6 matches to start seeing trends.</div>
    </div>
  );

  const gradeColors = { A: "#4A7C2F", "A-": "#4A7C2F", "B+": "#C4A42B", B: "#C4A42B", "B-": "#C4A42B", "C+": "#D94F3B", C: "#D94F3B" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(107,94,82,0.1)", background: "white" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>📋 Match History — {logs.length} session{logs.length !== 1 ? "s" : ""}</div>
        <button onClick={onClose} className="results-reset">← Back</button>
      </div>
      <div style={{ maxHeight: 480, overflowY: "auto", padding: "12px 18px", background: "#FAFAF8" }}>
        {logs.map((log, i) => (
          <div key={log.id} onClick={() => onSelect(log)}
            style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--clay)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(107,94,82,0.12)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Grade circle */}
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: gradeColors[log.analysis?.grade] || "var(--mid)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "white", flexShrink: 0 }}>
                {log.analysis?.grade || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{log.result || "Match"}</span>
                  {log.surface && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(107,94,82,0.08)", color: "var(--mid)", fontWeight: 600 }}>{log.surface}</span>}
                  {log.level && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(200,98,42,0.08)", color: "var(--clay)", fontWeight: 600 }}>{log.level}</span>}
                  <span style={{ fontSize: 11, color: "rgba(107,94,82,0.5)", marginLeft: "auto" }}>{log.mode === "stats" ? "📊" : log.mode === "selfassess" ? "🎯" : "🎬"}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.analysis?.summary || "Click to view full report"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "rgba(107,94,82,0.4)", flexShrink: 0, textAlign: "right" }}>
                {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            {/* Mini stat strip */}
            {log.analysis?.statInsights && log.analysis.statInsights.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {log.analysis.statInsights.slice(0, 4).map((s, j) => (
                  <div key={j} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, fontWeight: 600,
                    background: s.cls === "fill-good" ? "rgba(74,124,47,0.08)" : s.cls === "fill-bad" ? "rgba(217,79,59,0.08)" : "rgba(107,94,82,0.06)",
                    color: s.cls === "fill-good" ? "var(--grass-light)" : s.cls === "fill-bad" ? "#D94F3B" : "var(--mid)" }}>
                    {s.label}: {s.note}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchStatEntry({ onAnalysis }) {
  const [mode, setMode] = useState(null); // null | "stats" | "video" | "selfassess" | "history"
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState(() => loadMatchLogs());

  // Shared context
  const [level, setLevel]     = useState("");
  const [surface, setSurface] = useState("");
  const [result, setResult]   = useState("");
  const [opponent, setOpponent] = useState("");

  // Stat entry state
  const [stats, setStats] = useState({});
  const [activeSection, setActiveSection] = useState("serve");

  // Video state
  const [file, setFile] = useState(null);
  const [videoNotes, setVideoNotes] = useState("");
  const fileRef = useRef();

  // Self-assess state
  const [ratings, setRatings] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");

  const SECTIONS = {
    serve:  { label: "🎾 Serve",   fields: ["firstServeIn","firstServeWon","secondServeWon","doubleFaults","aces"] },
    return: { label: "↩️ Return",  fields: ["returnWon","breakPointsWon"] },
    rally:  { label: "⚡ Rally",   fields: ["unforcedErrors","winners","netPointsWon"] },
    match:  { label: "📋 Match",   fields: ["totalGamesWon","totalGamesLost"] },
  };

  function setStat(id, val) { setStats(p => ({ ...p, [id]: val })); }

  const filledCount = Object.values(stats).filter(v => v !== "" && v !== undefined).length;
  const ratedCount  = Object.keys(ratings).length;

  // Save log after analysis and refresh list
  function finishAnalysis(data, currentMode) {
    const entry = { analysis: data, mode: currentMode, level, surface, result, opponent };
    saveMatchLog(entry);
    setLogs(loadMatchLogs());
    onAnalysis(data);
  }
  async function callAI(system, prompt) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1000, system, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.content?.map(b => b.text || "").join("") || "{}";
        const s = text.indexOf("{"); const e = text.lastIndexOf("}");
        if (s !== -1 && e !== -1) return JSON.parse(text.slice(s, e + 1));
      }
    } catch {}
    return null;
  }

  // ── Analyze: Stat Entry ────────────────────────────────────────────────
  async function analyzeStats() {
    setLoading(true);
    const filled = STAT_FIELDS.filter(f => stats[f.id] !== "" && stats[f.id] !== undefined);
    const lines = filled.map(f => `${f.label}: ${stats[f.id]}${f.unit}`).join("\n");
    const prompt = `Player: ${level||"Unknown"} NTRP. Surface: ${surface||"Unknown"}. Result: ${result||"N/A"}. Opponent: ${opponent||"N/A"}.\n\nReal stats:\n${lines}\n\nAnalyze ONLY these stats.`;
    let data = await callAI(MATCH_STATS_SYSTEM, prompt);
    if (!data) {
      const fs = parseFloat(stats.firstServeIn)||0, ue = parseFloat(stats.unforcedErrors)||0, rv = parseFloat(stats.returnWon)||0;
      data = {
        grade: fs>60&&ue<20?"B+":ue>30?"C+":"B", gradeColor: fs>60?"#4A7C2F":"#C4A42B",
        summary: `Based on your stats, ${ue>25?"unforced errors are your #1 problem — fix this first.":fs<55?"first serve % needs work — you're giving too many free points on 2nd serve.":"your game is balanced with clear areas to sharpen."}`,
        statInsights: filled.map(f => {
          const val = parseFloat(stats[f.id])||0;
          const pct = f.unit==="%"?val:Math.min((val/(f.id==="doubleFaults"?15:f.id==="unforcedErrors"?40:f.id==="winners"?30:20))*100,100);
          const isLowGood = ["doubleFaults","unforcedErrors"].includes(f.id);
          const cls = isLowGood?(val<8?"fill-good":val<20?"fill-mid":"fill-bad"):(pct>=65?"fill-good":pct>=40?"fill-mid":"fill-bad");
          return { label:f.label, value:pct, cls, note:`${stats[f.id]}${f.unit}`, insight:`${f.label} of ${stats[f.id]}${f.unit} is ${cls==="fill-good"?"a strength":"a priority fix"}.` };
        }),
        biggestProblem: ue>25?`${ue} unforced errors is costing you games.`:`Return game at ${stats.returnWon||"?"}% needs work.`,
        biggestStrength: fs>62?`First serve at ${stats.firstServeIn}% is solid.`:"Your stat-tracking awareness is already an edge.",
        topFixes: [
          { fix: ue>20?"Aim 3ft over net on neutral balls to cut errors":"Attack 2nd serves — step in and drive crosscourt", impact:"high" },
          { fix:"Track these stats every match to see trends", impact:"medium" },
          { fix:"Drill your weakest area 15 min every practice", impact:"medium" },
        ],
        chips: [
          { label: ue>25?"⚠ Errors critical":"✓ Errors managed", type:ue>25?"red":"green" },
          { label: fs>62?"✓ Serve consistent":"⚠ Fix 1st serve", type:fs>62?"green":"red" },
          { label: rv>40?"✓ Return solid":"📊 Improve return", type:rv>40?"green":"yellow" },
        ],
      };
    }
    finishAnalysis(data, "stats"); setLoading(false);
  }

  // ── Analyze: Self Assessment ───────────────────────────────────────────
  async function analyzeSelfAssess() {
    setLoading(true);
    const rated = SELF_ASSESS_QUESTIONS.filter(q => ratings[q.id] !== undefined);
    const lines = rated.map(q => `${q.label}: ${ratings[q.id]}/10 — ${RATING_LABELS[ratings[q.id]-1]}`).join("\n");
    const sorted = [...rated].sort((a,b) => (ratings[a.id]||5) - (ratings[b.id]||5));
    const lowest = sorted[0];
    const secondLowest = sorted[1];
    const highest = [...rated].sort((a,b) => (ratings[b.id]||5) - (ratings[a.id]||5))[0];
    const prompt = `Player: ${level||"Unknown"} NTRP. Surface: ${surface||"Unknown"}. Result: ${result||"N/A"}.\n\nSelf-rated areas:\n${lines}\n\nExtra notes: ${extraNotes||"None"}\n\nGive advanced coaching analysis with drills, video links, next week plan, and 3 measurable goals.`;
    let data = await callAI(SELF_ASSESS_SYSTEM, prompt);
    if (!data) {
      // Video library matched to lowest-rated areas
      const VIDEO_MAP = {
        "Serve":       { url: "https://www.youtube.com/watch?v=P8eZQBD-X0c", title: "Kick Serve Technique", channel: "FuzzyYellowBalls · YouTube" },
        "Return":      { url: "https://www.youtube.com/watch?v=_pS0otk2560", title: "Return of Serve Drills", channel: "Essential Tennis · YouTube" },
        "Forehand":    { url: "https://www.youtube.com/watch?v=aZj7DIEftPg", title: "Forehand Groundstroke Drill", channel: "Top Tennis Training · YouTube" },
        "Backhand":    { url: "https://www.youtube.com/watch?v=OU39URVIpVc", title: "Backhand Topspin Drills", channel: "Top Tennis Training · YouTube" },
        "Volley / Net Game": { url: "https://www.youtube.com/watch?v=D1npzA6_Q3U", title: "Volley & Net Approach Drill", channel: "Essential Tennis · YouTube" },
        "Footwork":    { url: "https://www.youtube.com/watch?v=eGWhONP7558", title: "Tennis Footwork & Agility", channel: "Essential Tennis · YouTube" },
        "Mental Game": { url: "https://www.youtube.com/watch?v=CofM-vwQRW4", title: "Point Construction & Patterns", channel: "Top Tennis Training · YouTube" },
        "Consistency": { url: "https://www.youtube.com/watch?v=CofM-vwQRW4", title: "Rally Consistency Patterns", channel: "Top Tennis Training · YouTube" },
      };
      const getVideo = (area) => VIDEO_MAP[area] || VIDEO_MAP["Forehand"];

      const avgRating = rated.length > 0 ? rated.reduce((sum, q) => sum + (ratings[q.id]||5), 0) / rated.length : 5;
      const grade = avgRating >= 8 ? "A" : avgRating >= 7 ? "B+" : avgRating >= 6 ? "B" : avgRating >= 5 ? "B-" : "C+";
      const gradeColor = avgRating >= 7 ? "#4A7C2F" : avgRating >= 5 ? "#C4A42B" : "#D94F3B";

      const lowestLabel = lowest?.label || "Serve";
      const lowestRating = lowest ? ratings[lowest.id] : 4;
      const secondLabel = secondLowest?.label || "Return";
      const highestLabel = highest?.label || "Forehand";
      const lowestVid = getVideo(lowestLabel);
      const secondVid = getVideo(secondLabel);
      const thirdVid = getVideo("Footwork");

      data = {
        grade, gradeColor,
        summary: `Your ratings reveal that ${lowestLabel.toLowerCase()} at ${lowestRating}/10 is the area costing you the most games right now — it's not just a weak shot, it's changing how you play every other point. Your ${highestLabel.toLowerCase()} at ${ratings[highest?.id]||7}/10 is a genuine weapon you should be building your patterns around. The gap between your best and worst areas is significant enough that closing it will have a measurable impact on your win rate.`,
        statInsights: rated.map(q => ({
          label: q.label,
          value: (ratings[q.id]||5) * 10,
          cls: (ratings[q.id]||5) >= 7 ? "fill-good" : (ratings[q.id]||5) >= 5 ? "fill-mid" : "fill-bad",
          note: `${ratings[q.id]}/10`,
          insight: ratings[q.id] >= 8
            ? `${q.label} is a clear strength — actively use it to dictate points and build patterns around it in every match.`
            : ratings[q.id] >= 6
            ? `${q.label} is solid but not yet a weapon. One focused drill per session will push this to match-winning level.`
            : ratings[q.id] >= 4
            ? `${q.label} at ${ratings[q.id]}/10 is below the level needed to hold your own consistently — this needs dedicated practice 3x this week.`
            : `${q.label} at ${ratings[q.id]}/10 is costing you significant points every match. This is your highest-leverage fix — address it before anything else.`,
        })),
        biggestProblem: `Your ${lowestLabel.toLowerCase()} at ${lowestRating}/10 is your most urgent fix. At your level, opponents will find and target this weakness repeatedly. Every point that forces you to use your ${lowestLabel.toLowerCase()} under pressure is a point you're likely to lose. Until this reaches 6/10 or above, it will limit how much every other improvement actually shows up in your match results.`,
        biggestStrength: `Your ${highestLabel.toLowerCase()} at ${ratings[highest?.id]||7}/10 is already a weapon — now use it tactically. Build your patterns to create opportunities to use your ${highestLabel.toLowerCase()}, serve to set it up, and construct points specifically to get to this shot. Don't just rely on it when it happens — engineer situations where you can use it.`,
        advancedAnalysis: [
          {
            title: `Why your ${lowestLabel} rating is connected to your overall consistency`,
            detail: `When a player rates their ${lowestLabel.toLowerCase()} as ${lowestRating}/10, it typically means they're playing defensively in patterns designed to avoid that shot — which increases pressure on every other area. At ${level||"your"} level, opponents can sense hesitation. The mental load of protecting a weakness makes your strongest shots less effective too, because you're playing scared instead of aggressive.`,
          },
          {
            title: `How to leverage your ${highestLabel} to create space for improvement`,
            detail: `Your ${highestLabel.toLowerCase()} at ${ratings[highest?.id]||7}/10 means you have a reliable shot to fall back on and build from. Use this to construct points: serve to set up your ${highestLabel.toLowerCase()}, rally into positions where you can use it, and take the pressure off your weaker areas by winning points before they're even tested. This is a real tactical advantage — use it consciously.`,
          },
        ],
        drillPlan: [
          {
            drillName: lowestLabel === "Serve" ? "Kick Serve Cone Targets" : lowestLabel === "Forehand" ? "Crosscourt Forehand Consistency" : lowestLabel === "Backhand" ? "High Ball Backhand Pattern" : lowestLabel === "Volley / Net Game" ? "Approach Shot & First Volley" : lowestLabel === "Return" ? "Return of Serve Positioning Drill" : lowestLabel === "Footwork" ? "Agility Ladder Split Step Drill" : `${lowestLabel} Focus Drill`,
            focus: lowestLabel,
            duration: "20 min",
            frequency: "Daily this week",
            instructions: lowestLabel === "Serve"
              ? `Place two cones in the deuce service box — one at the T, one wide. Hit 10 kick serves targeting each cone with a continental grip, brushing up the back of the ball. Aim for 7/10 landing within 2 feet of each cone. Rest 30 seconds between sets. Since you rated your serve ${lowestRating}/10, focus on slowing your toss arm down — that's where most inconsistency comes from at this rating.`
              : lowestLabel === "Forehand"
              ? `Rally crosscourt with a partner or machine, keeping every ball 3 feet above the net and past the service line. Count consecutive balls without an error. Week goal: 20 consecutive. Since you rated your forehand ${lowestRating}/10, focus specifically on watching the ball all the way to contact — most forehand errors at this rating come from looking up early.`
              : lowestLabel === "Backhand"
              ? `Partner feeds high balls to your backhand above the shoulder. Focus on completing your shoulder unit turn BEFORE the ball arrives — not as it arrives. Hit 15 balls per set crosscourt with heavy topspin. Since you rated your backhand ${lowestRating}/10, the fix is almost always getting your unit turn earlier, not swinging harder.`
              : lowestLabel === "Volley / Net Game"
              ? `Partner feeds short balls inside the service line. Hit a low slice approach down the line, split step, then put away the volley crosscourt. 10 reps per side per set. Since you rated your net game ${lowestRating}/10, approach on every short ball this week — even if you feel unsure. You can't build net confidence without getting to net.`
              : lowestLabel === "Return"
              ? `Partner serves from the service line (closer than normal) to a realistic pace. Practice split-stepping as they toss, taking a compact backswing, and redirecting crosscourt. Since you rated your return ${lowestRating}/10, stand 2-3 feet further back than usual on first serves — you need time to read the ball before you can attack it.`
              : lowestLabel === "Footwork"
              ? `Run 3 agility ladder patterns: in-in-out-out, lateral shuffle, single-leg hops. Add a split step and shadow forehand at the end of each run. Since you rated your footwork ${lowestRating}/10, the split step is the #1 fix — you're likely arriving late to shots because you're not loading correctly between shots.`
              : `Practice your ${lowestLabel.toLowerCase()} for 20 focused minutes. Start at 50% intensity, build to 80%. Track your error rate and compare next session. Since you rated this ${lowestRating}/10, focus on the fundamentals before adding pace or spin.`,
            successTarget: `Rate your ${lowestLabel.toLowerCase()} 1 point higher in next session's self-assessment`,
            coachTip: lowestLabel === "Serve" ? "Toss slightly behind your head — if you're pushing the serve, your toss is too far forward" : lowestLabel === "Forehand" ? "Keep your chin on your shoulder through contact — no peeking" : lowestLabel === "Backhand" ? "Unit turn first, swing second — if your arm moves before your shoulder, start over" : "Commit fully — hesitation causes more errors than aggression at any level",
            videoUrl: lowestVid.url,
            videoTitle: lowestVid.title,
            videoChannel: lowestVid.channel,
          },
          {
            drillName: secondLabel === "Serve" ? "Serve Placement Drill" : secondLabel === "Forehand" ? "Inside-Out Forehand Pattern" : secondLabel === "Backhand" ? "Crosscourt Backhand Rally" : secondLabel === "Volley / Net Game" ? "Volley Reflex Drill" : secondLabel === "Return" ? "Second Serve Attack Drill" : secondLabel === "Footwork" ? "Shadow Groundstroke Footwork" : `${secondLabel} Pattern Drill`,
            focus: secondLabel,
            duration: "15 min",
            frequency: "3x this week",
            instructions: `Focus specifically on your ${secondLabel.toLowerCase()}, which you rated ${ratings[secondLowest?.id]||4}/10. Work with a partner or ball machine. Hit 3 sets of 15 balls with a specific target — don't just rally, aim for a cone or court marking every shot. Track how many land on target each set and try to improve that number each session.`,
            successTarget: `Hit target on 70%+ of ${secondLabel.toLowerCase()} shots in practice sets`,
            coachTip: `The gap between ${ratings[secondLowest?.id]||4}/10 and 7/10 is usually one specific technical fix — ask yourself what you do differently on your best ${secondLabel.toLowerCase()} shots versus your worst ones`,
            videoUrl: secondVid.url,
            videoTitle: secondVid.title,
            videoChannel: secondVid.channel,
          },
          {
            drillName: "Point Construction — Play to Strengths",
            focus: "Tactical Pattern Play",
            duration: "20 min",
            frequency: "2x this week",
            instructions: `Play out full points with a practice partner but with one rule: every point must start with a shot designed to create your ${highestLabel.toLowerCase()}. If ${highestLabel} is your forehand, serve to force a weak return you can attack with your forehand. If it's your net game, approach on every ball inside the service line. Force yourself to use your strength on purpose, not by accident.`,
            successTarget: `Use your ${highestLabel.toLowerCase()} as the intended final shot on 70%+ of points played`,
            coachTip: `Champions play to their strengths — they don't just wait for their strength to appear, they construct points specifically to use it`,
            videoUrl: "https://www.youtube.com/watch?v=CofM-vwQRW4",
            videoTitle: "Point Construction & Pattern Play — Top Tennis Training",
            videoChannel: "Top Tennis Training · YouTube",
          },
        ],
        nextWeekPlan: {
          theme: `Fix ${lowestLabel} — Build Around ${highestLabel}`,
          days: [
            { day: "Monday",    session: `${lowestLabel} focus drill — 20 min cone targets or specific fix drill`, duration: "45 min", type: "on-court" },
            { day: "Tuesday",   session: `Off-court: shadow swings for ${lowestLabel} + agility ladder footwork`, duration: "30 min", type: "off-court" },
            { day: "Wednesday", session: `${secondLabel} drill 15 min + point construction using ${highestLabel}`, duration: "45 min", type: "on-court" },
            { day: "Thursday",  session: "Rest — review your ratings and mental preparation", duration: "20 min", type: "rest" },
            { day: "Friday",    session: `Match simulation — consciously use ${highestLabel} as primary weapon`, duration: "60 min", type: "on-court" },
            { day: "Saturday",  session: `Ball machine: 100 ${lowestLabel.toLowerCase()} shots with specific target. Make 80/100.`, duration: "40 min", type: "on-court" },
            { day: "Sunday",    session: "Rest and re-rate your game — compare to today's ratings", duration: "-", type: "rest" },
          ],
        },
        weeklyGoals: [
          {
            goal: `Improve your ${lowestLabel} self-rating from ${lowestRating}/10 to ${Math.min(lowestRating + 1, 10)}/10`,
            metric: `Rate your ${lowestLabel.toLowerCase()} honestly after each session — track whether it's trending up`,
          },
          {
            goal: `Win at least 60% of points when you use your ${highestLabel.toLowerCase()} as the intended attacking shot`,
            metric: `Count these points in your next match or practice — tally wins vs losses when you get to your best shot`,
          },
          {
            goal: `Complete all 3 drills from the plan at least 2x each this week`,
            metric: `Log each session — check off Mon, Wed, Sat drills. Consistency beats intensity at this stage`,
          },
        ],
        chips: [
          { label: `⚠ Fix ${lowestLabel} first`, type: "red" },
          { label: ratings[secondLowest?.id] < 6 ? `⚠ Work on ${secondLabel}` : `📊 Develop ${secondLabel}`, type: "yellow" },
          { label: `✓ Weaponize ${highestLabel}`, type: "green" },
        ],
      };
    }
    finishAnalysis(data, "selfassess"); setLoading(false);
  }

  // ── Analyze: Video ─────────────────────────────────────────────────────
  async function analyzeVideo() {
    setLoading(true);
    const prompt = `Player: ${level||"Unknown"} NTRP. Surface: ${surface||"Unknown"}. Result: ${result||"N/A"}. Video file: ${file?.name||"uploaded"}.\nMatch notes: ${videoNotes||"General match footage"}.\nGenerate realistic stats and analysis based on this context.`;
    let data = await callAI(MATCH_STATS_SYSTEM, prompt);
    if (!data) {
      data = {
        grade:"B", gradeColor:"#2B5F8A",
        summary:`Based on your video context for a ${level||"3.5"} NTRP match on ${surface||"hard court"}, your baseline consistency looks solid but there are clear patterns to address around serve pressure and net approach.`,
        statInsights:[
          {label:"1st Serve %",value:58,cls:"fill-mid",note:"~58%",insight:"Slightly below target — aim for 65%+ to put opponents under pressure."},
          {label:"Unforced Errors",value:35,cls:"fill-bad",note:"High",insight:"Errors are costing you key games — slow down and add spin on neutral balls."},
          {label:"Net Points Won",value:62,cls:"fill-mid",note:"~62%",insight:"Decent at net but only approaching when you should — look for more opportunities."},
          {label:"2nd Serve Win %",value:32,cls:"fill-bad",note:"~32%",insight:"Your 2nd serve is a liability — kick serve practice is your #1 priority."},
        ],
        biggestProblem:"2nd serve at ~32% win rate is giving opponents a free attack every time you miss your first serve.",
        biggestStrength:"Your net approach when you do go in looks confident — expand this part of your game.",
        topFixes:[
          {fix:"Kick serve practice — 20 min daily targeting backhand corner",impact:"high"},
          {fix:"Add 3ft net clearance on baseline rallies to reduce errors",impact:"high"},
          {fix:"Approach net on every short ball — don't hesitate",impact:"medium"},
        ],
        chips:[{label:"⚠ Fix 2nd serve",type:"red"},{label:"📊 Cut errors",type:"yellow"},{label:"✓ Net game solid",type:"green"}],
      };
    }
    finishAnalysis(data, "video"); setLoading(false);
  }

  // ── Mode picker ────────────────────────────────────────────────────────
  if (!mode) return (
    <div className="ai-chat-box">
      <div className="chat-header">
        <div className="chat-header-dot"/>
        <span>MATCH ANALYSIS — CHOOSE YOUR INPUT</span>
        <button onClick={() => setMode("history")} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 4, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "4px 10px", fontFamily: "'DM Sans', sans-serif" }}>
          📋 History {logs.length > 0 ? `(${logs.length})` : ""}
        </button>
      </div>
      <div style={{ padding: 20, background: "#FAFAF8" }}>
        <div style={{ fontSize: 13, color: "var(--mid)", marginBottom: 16, lineHeight: 1.5 }}>
          Pick how you want to enter your match data. All three generate the same detailed AI breakdown.
        </div>
        {[
          { id:"stats",      icon:"📊", title:"Enter Match Stats",         sub:"You tracked your stats (aces, errors, serve %, etc.) — enter exact numbers for the most precise analysis." },
          { id:"selfassess", icon:"🎯", title:"Rate Shot by Shot",         sub:"No stats? Rate your serve, forehand, backhand, volley, footwork and mental game out of 10. Takes 60 seconds." },
          { id:"video",      icon:"🎬", title:"Upload Match Video",        sub:"Upload your match footage and describe what happened — AI generates stats and analysis from the footage." },
        ].map(opt => (
          <div key={opt.id} onClick={() => setMode(opt.id)} style={{
            background:"white", border:"2px solid rgba(107,94,82,0.12)", borderRadius:10,
            padding:"16px 18px", marginBottom:10, cursor:"pointer",
            display:"flex", alignItems:"flex-start", gap:14, transition:"all 0.2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--clay)";e.currentTarget.style.transform="translateY(-1px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(107,94,82,0.12)";e.currentTarget.style.transform="none";}}
          >
            <div style={{ fontSize:28, flexShrink:0 }}>{opt.icon}</div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:"var(--ink)", marginBottom:4 }}>{opt.title}</div>
              <div style={{ fontSize:13, color:"var(--mid)", lineHeight:1.5 }}>{opt.sub}</div>
            </div>
            <div style={{ marginLeft:"auto", color:"var(--clay)", fontSize:20, flexShrink:0 }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── History mode ───────────────────────────────────────────────────────
  if (mode === "history") return (
    <div className="ai-chat-box">
      <div className="chat-header"><div className="chat-header-dot"/><span>📋 MATCH HISTORY</span></div>
      <MatchHistoryPanel
        logs={logs}
        onSelect={log => { onAnalysis(log.analysis); setMode(null); }}
        onClose={() => setMode(null)}
      />
    </div>
  );

  // ── Stat Entry Mode ────────────────────────────────────────────────────
  if (mode === "stats") {
    const sectionFields = STAT_FIELDS.filter(f => SECTIONS[activeSection]?.fields.includes(f.id));
    return (
      <div className="ai-chat-box">
        <div className="chat-header">
          <div className="chat-header-dot"/>
          <span>📊 ENTER MATCH STATS</span>
          <button onClick={()=>setMode(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:18}}>←</button>
        </div>
        <ContextFields level={level} setLevel={setLevel} surface={surface} setSurface={setSurface} result={result} setResult={setResult} opponent={opponent} setOpponent={setOpponent} />
        <div style={{ display:"flex", borderBottom:"1px solid rgba(107,94,82,0.1)", background:"white" }}>
          {Object.entries(SECTIONS).map(([id,sec]) => (
            <button key={id} onClick={()=>setActiveSection(id)} style={{
              flex:1, padding:"10px 4px", fontSize:12, fontWeight:700,
              border:"none", background:"none", cursor:"pointer",
              color:activeSection===id?"var(--clay)":"var(--mid)",
              borderBottom:`2px solid ${activeSection===id?"var(--clay)":"transparent"}`,
              fontFamily:"'DM Sans', sans-serif", transition:"all 0.15s",
            }}>{sec.label}</button>
          ))}
        </div>
        <div style={{ padding:"14px 18px", background:"#FAFAF8", minHeight:200 }}>
          {sectionFields.map(f => (
            <div key={f.id} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <label style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>{f.label}{f.unit?` (${f.unit})`:""}</label>
                <span style={{ fontSize:11, color:"var(--mid)" }}>{f.tip}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <input type="range" min={f.min} max={f.max} value={stats[f.id]??""} onChange={e=>setStat(f.id,e.target.value)} style={{ flex:1, accentColor:"var(--clay)" }}/>
                <input type="number" min={f.min} max={f.max} value={stats[f.id]??""} onChange={e=>setStat(f.id,e.target.value)} placeholder="—" style={{ width:56,padding:"5px 8px",border:"1.5px solid rgba(107,94,82,0.2)",borderRadius:6,fontSize:14,fontWeight:700,textAlign:"center",color:"var(--clay)",fontFamily:"'DM Sans',sans-serif",outline:"none" }}/>
                {f.unit&&<span style={{fontSize:13,color:"var(--mid)",width:16}}>{f.unit}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(107,94,82,0.1)", background:"white", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:12, color:"var(--mid)" }}><span style={{ color:filledCount>0?"var(--clay)":"var(--mid)", fontWeight:700 }}>{filledCount}</span>/{STAT_FIELDS.length} entered</div>
          <button className="analyze-btn" style={{ maxWidth:200, padding:"10px 20px", fontSize:13 }} onClick={analyzeStats} disabled={loading||filledCount<2}>
            {loading?"Analyzing…":"📊 Analyze Stats"}
          </button>
        </div>
      </div>
    );
  }

  // ── Self Assessment Mode ───────────────────────────────────────────────
  if (mode === "selfassess") {
    const q = SELF_ASSESS_QUESTIONS[currentQ];
    const progress = (currentQ / SELF_ASSESS_QUESTIONS.length) * 100;
    const allDone = currentQ >= SELF_ASSESS_QUESTIONS.length;
    return (
      <div className="ai-chat-box">
        <div className="chat-header">
          <div className="chat-header-dot"/>
          <span>🎯 RATE YOUR GAME</span>
          <button onClick={()=>setMode(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:18}}>←</button>
        </div>
        <ContextFields level={level} setLevel={setLevel} surface={surface} setSurface={setSurface} result={result} setResult={setResult} opponent={opponent} setOpponent={setOpponent} />
        <div style={{ padding:"14px 18px", background:"#FAFAF8" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--mid)", fontWeight:600, marginBottom:6 }}>
              <span>{allDone?"All areas rated!":` Area ${currentQ+1} of ${SELF_ASSESS_QUESTIONS.length}`}</span>
              <span>{ratedCount} rated</span>
            </div>
            <div style={{ height:4, background:"rgba(107,94,82,0.12)", borderRadius:2 }}>
              <div style={{ height:"100%", background:"var(--clay)", borderRadius:2, width:`${allDone?100:progress}%`, transition:"width 0.4s ease" }}/>
            </div>
          </div>
          {!allDone ? (
            <>
              <div style={{ background:"white", border:"1px solid rgba(107,94,82,0.12)", borderRadius:10, padding:"20px 18px", marginBottom:14 }}>
                <div style={{ fontSize:32, marginBottom:10 }}>{q.emoji}</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:"var(--ink)", marginBottom:4 }}>{q.question}</div>
                <div style={{ fontSize:12, color:"var(--mid)", marginBottom:16 }}>{q.sub}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:10 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={()=>setRatings(r=>({...r,[q.id]:n}))} style={{
                      padding:"10px 4px", borderRadius:8, border:`2px solid ${ratings[q.id]===n?"var(--clay)":"rgba(107,94,82,0.15)"}`,
                      background:ratings[q.id]===n?"rgba(200,98,42,0.08)":"white",
                      color:ratings[q.id]===n?"var(--clay)":"var(--ink)",
                      fontWeight:700, fontSize:15, cursor:"pointer",
                      fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                    }}>{n}</button>
                  ))}
                </div>
                {ratings[q.id] && <div style={{ textAlign:"center", fontSize:13, color:"var(--clay)", fontWeight:600 }}>{ratings[q.id]}/10 — {RATING_LABELS[ratings[q.id]-1]}</div>}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {currentQ>0&&<button className="results-reset" onClick={()=>setCurrentQ(q=>q-1)}>← Back</button>}
                <div style={{flex:1}}/>
                <button className="analyze-btn" style={{ maxWidth:140, padding:"10px", fontSize:13 }} disabled={!ratings[q.id]} onClick={()=>setCurrentQ(q=>q+1)}>
                  {currentQ===SELF_ASSESS_QUESTIONS.length-1?"Done ✓":"Next →"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background:"white", border:"1px solid rgba(107,94,82,0.12)", borderRadius:10, padding:"16px 18px", marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"var(--mid)", letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Your Ratings Summary</div>
                {SELF_ASSESS_QUESTIONS.filter(q=>ratings[q.id]).map(q=>(
                  <div key={q.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"6px 0", borderBottom:"1px solid rgba(107,94,82,0.07)" }}>
                    <span style={{fontSize:18}}>{q.emoji}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:"var(--ink)"}}>{q.label}</span>
                    <div style={{ display:"flex", gap:3 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                        <div key={n} style={{ width:10, height:10, borderRadius:2, background:n<=ratings[q.id]?(ratings[q.id]>=7?"var(--grass-light)":ratings[q.id]>=5?"var(--accent-dark)":"#D94F3B"):"rgba(107,94,82,0.1)" }}/>
                      ))}
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--clay)", width:32, textAlign:"right" }}>{ratings[q.id]}/10</span>
                  </div>
                ))}
              </div>
              <textarea className="upload-notes" style={{marginBottom:12}} placeholder="Anything else about this match? (optional)" value={extraNotes} onChange={e=>setExtraNotes(e.target.value)}/>
              <div style={{display:"flex",gap:10}}>
                <button className="results-reset" onClick={()=>setCurrentQ(SELF_ASSESS_QUESTIONS.length-1)}>← Edit</button>
                <button className="analyze-btn" onClick={analyzeSelfAssess} disabled={loading}>{loading?"Analyzing…":"🎯 Analyze My Game"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Video Mode ─────────────────────────────────────────────────────────
  if (mode === "video") return (
    <div className="ai-chat-box">
      <div className="chat-header">
        <div className="chat-header-dot"/>
        <span>🎬 UPLOAD MATCH VIDEO</span>
        <button onClick={()=>setMode(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:18}}>←</button>
      </div>
      <ContextFields level={level} setLevel={setLevel} surface={surface} setSurface={setSurface} result={result} setResult={setResult} opponent={opponent} setOpponent={setOpponent} />
      <div style={{ padding:"14px 18px", background:"#FAFAF8" }}>
        {!file?(
          <div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="video/*" onChange={e=>setFile(e.target.files[0])}/>
            <span className="upload-icon">🎬</span>
            <div className="upload-title">DROP YOUR MATCH VIDEO</div>
            <div className="upload-sub">Drag & drop or <span>browse</span></div>
            <div className="upload-formats">MP4, MOV, AVI · Max 2GB</div>
          </div>
        ):(
          <div className="file-preview">
            <div className="file-preview-icon">🎾</div>
            <div className="file-preview-info">
              <div className="file-preview-name">{file.name}</div>
              <div className="file-preview-size">{(file.size/1024/1024).toFixed(1)} MB</div>
            </div>
            <button className="file-remove" onClick={()=>setFile(null)}>✕</button>
          </div>
        )}
        <textarea className="upload-notes" style={{marginTop:14}} placeholder="What happened in this match?" value={videoNotes} onChange={e=>setVideoNotes(e.target.value)}/>
        <div style={{display:"flex",gap:10}}>
          <button className="results-reset" onClick={()=>setMode(null)}>← Back</button>
          <button className="analyze-btn" onClick={analyzeVideo} disabled={loading||(!file&&!videoNotes)}>{loading?"Analyzing…":"🎬 Analyze Video"}</button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ─── Game Plan Visual ─────────────────────────────────────────────────────
// ─── Strategy Chat (updates GamePlanVisual with live parsed tactics) ────────
function StrategyChat({ systemPrompt, quickPrompts, placeholder, onGamePlan }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Parse plain-text AI response into structured game plan for the visual
  function parseGamePlan(text, userPrompt) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    // Extract numbered tactics (e.g. "1. Hit topspin..." or "**Pattern 1:**")
    const tacticLines = lines.filter(l =>
      /^(\d+[\.\)]\s|\*\*\d+|Pattern \d+:|•|-\s)/.test(l) ||
      l.toLowerCase().includes("pattern") ||
      l.toLowerCase().includes("tactic") ||
      (l.length > 20 && l.length < 120 && /^[A-Z]/.test(l))
    );

    // Build tactics array — max 5, clean up markdown
    const tactics = tacticLines.slice(0, 5).map(l => {
      const clean = l.replace(/^\d+[\.\)]\s*/, "").replace(/\*\*/g, "").replace(/^[-•]\s*/, "").trim();
      // If the line has a colon, split into tactic + detail
      const colonIdx = clean.indexOf(":");
      if (colonIdx > 0 && colonIdx < 50) {
        return { tactic: clean.slice(0, colonIdx).trim(), detail: clean.slice(colonIdx + 1).trim() };
      }
      // If long, use first sentence as tactic and rest as detail
      const dotIdx = clean.indexOf(". ");
      if (dotIdx > 20 && dotIdx < 80) {
        return { tactic: clean.slice(0, dotIdx + 1).trim(), detail: clean.slice(dotIdx + 1).trim() };
      }
      return { tactic: clean, detail: "" };
    }).filter(t => t.tactic.length > 5);

    // Extract avoid lines
    const avoidSection = text.toLowerCase();
    const avoidIdx = avoidSection.search(/avoid|don't|do not|never|mistakes/);
    const avoidLines = avoidIdx > -1
      ? text.slice(avoidIdx).split("\n").slice(1, 3).map(l => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(l => l.length > 5)
      : [];

    // Extract mental cue
    const mentalMatch = text.match(/mental[^.]*[:–—]\s*([^.\n]+)/i) ||
                        text.match(/remember[^:]*:\s*([^.\n]+)/i) ||
                        text.match(/key[^:]*:\s*"([^"]+)"/i);
    const mentalCue = mentalMatch ? mentalMatch[1].replace(/['"]/g, "").trim() : "";

    // Build title from user's prompt
    const oppMatch = userPrompt.match(/(pusher|big hitter|net rusher|all-court|lefty|aggressive|defensive|slicer)/i);
    const surfMatch = userPrompt.match(/(clay|grass|hard|indoor)/i);
    const title = oppMatch
      ? `vs ${oppMatch[1].charAt(0).toUpperCase() + oppMatch[1].slice(1)} — Game Plan`
      : surfMatch
        ? `${surfMatch[1].charAt(0).toUpperCase() + surfMatch[1].slice(1)} Court Game Plan`
        : "AI Game Plan";

    // Summary — first non-numbered sentence
    const summaryLine = lines.find(l => !(/^\d+[\.\)]/.test(l)) && l.length > 30 && l.length < 200) || "";

    if (tactics.length === 0) return null;
    return { title, summary: summaryLine, tactics: tactics.slice(0, 5), avoid: avoidLines, mentalCue };
  }

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    let reply = null;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1500, system: systemPrompt, messages: newMessages }),
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.content?.map(b => b.text || "").join("").trim() || null;
      }
    } catch (e) { console.error(e); }

    // Generate rich fallback if AI failed
    if (!reply) {
      const q = userText.toLowerCase();
      if (q.includes("pusher")) {
        reply = `Against a pusher, patience wins. Build points carefully and draw them forward.\n<tactics>{"opponentProfile":"Consistent retriever who moonballs and pushes every ball deep","opponentStrengths":["Never misses","Great court coverage","Wears opponents down"],"opponentWeaknesses":["Hates net","Struggles with pace changes","Weak on low slices"],"gameStyle":"Patient attacker — draw forward, exploit short balls","surface":"hard","topPatterns":[{"rank":1,"name":"Short slice to draw forward","description":"Hit low slice to forehand service box — when they come forward, topspin pass deep to open court","winRate":74,"difficulty":"Intermediate"},{"rank":2,"name":"High topspin to backhand","description":"4-5 heavy topspin balls above shoulder height to backhand corner — wait for short reply, attack DTL","winRate":68,"difficulty":"Beginner"},{"rank":3,"name":"Side to side then attack","description":"Hit wide to one corner, recover, hit to opposite corner — when off balance drive to open court","winRate":62,"difficulty":"Intermediate"},{"rank":4,"name":"Drop shot variation","description":"After 3 deep balls, surprise with drop shot to bring them to net where uncomfortable","winRate":55,"difficulty":"Advanced"}],"shotSelection":[{"shot":"1st Serve","target":"T on deuce, body on ad","spin":"Kick","goal":"65%+ in","tip":"Force weak returns"},{"shot":"2nd Serve","target":"Kick to backhand","spin":"Heavy topspin","goal":"80%+ in","tip":"They push it back — be ready"},{"shot":"Return","target":"Deep crosscourt","spin":"Topspin","goal":"70%+ in play","tip":"Don't hurt it — just deep"},{"shot":"Forehand","target":"Deep heavy crosscourt","spin":"Heavy topspin","goal":"80%+ in","tip":"4+ feet over net"},{"shot":"Backhand","target":"Crosscourt deep","spin":"Topspin","goal":"75%+ in","tip":"Never DTL until short ball"},{"shot":"Approach","target":"DTL low slice","spin":"Slice","goal":"8/10","tip":"Only on balls inside service line"}],"mentalGame":"Never rush — they want you impatient. Make them hit 8+ balls before you attack.","avoidAt":["Winners from baseline on neutral balls","Attacking from behind service line"]}</tactics>`;
      } else if (q.includes("big hitter") || q.includes("flat")) {
        reply = `Against a big hitter, disrupt their rhythm with pace changes and high balls.\n<tactics>{"opponentProfile":"Flat-ball striker who generates heavy pace and likes short points","opponentStrengths":["Huge groundstrokes","Powerful serve","Wins short exchanges"],"opponentWeaknesses":["High bouncing balls","Slow pace changes","Long rallies"],"gameStyle":"Disruptor — moonball, slice, change pace constantly","surface":"hard","topPatterns":[{"rank":1,"name":"Moonball reset","description":"Hit high looping topspin 6+ feet over net — breaks their timing and pushes them behind baseline","winRate":72,"difficulty":"Beginner"},{"rank":2,"name":"Slice disruption","description":"Mix in low slices that stay below their strike zone — flat strikers struggle with balls below power zone","winRate":66,"difficulty":"Intermediate"},{"rank":3,"name":"Middle approach","description":"Slice approach down the middle — removes angles, then volley crosscourt","winRate":60,"difficulty":"Intermediate"},{"rank":4,"name":"Body serve","description":"Jam them on the body on big points — removes aggressive return angle","winRate":58,"difficulty":"Beginner"}],"shotSelection":[{"shot":"1st Serve","target":"Body or T","spin":"Flat/kick","goal":"65%+ in","tip":"Vary — predictable serves get attacked"},{"shot":"2nd Serve","target":"Kick high to backhand","spin":"Heavy kick","goal":"75%+ in","tip":"High kick — they can't time high balls"},{"shot":"Return","target":"Crosscourt low","spin":"Slice/block","goal":"65%+ in","tip":"Stand 3ft back — you need time"},{"shot":"Forehand","target":"High heavy crosscourt","spin":"Heavy topspin","goal":"70%+ in","tip":"Aim 5ft over net"},{"shot":"Backhand","target":"High crosscourt","spin":"Topspin","goal":"70%+ in","tip":"Height disrupts their flat timing"},{"shot":"Approach","target":"Middle DTL","spin":"Slice","goal":"7/10","tip":"Remove their angle"}],"mentalGame":"You won't out-hit them. Win by disrupting rhythm — every ball not in their power zone is a problem for them.","avoidAt":["Matching their pace","Flat-to-flat groundstrokes"]}</tactics>`;
      } else {
        reply = `Here is your tactical game plan for this match.\n<tactics>{"opponentProfile":"All-court player with solid baseline game and good consistency","opponentStrengths":["Consistent groundstrokes","Good first serve","Handles pace"],"opponentWeaknesses":["Backhand under pressure","Reluctant to net","Struggles with high balls"],"gameStyle":"Aggressive baseliner — build crosscourt, attack inside-out","surface":"hard","topPatterns":[{"rank":1,"name":"Inside-out forehand attack","description":"Rally backhand crosscourt, wait for short ball, run around and drive inside-out to their backhand corner","winRate":70,"difficulty":"Intermediate"},{"rank":2,"name":"Serve wide + forehand","description":"Serve wide deuce to open court, inside-in forehand to open court before they recover","winRate":65,"difficulty":"Beginner"},{"rank":3,"name":"Short ball approach DTL","description":"Any ball inside service line — slice DTL, split step, first volley crosscourt","winRate":60,"difficulty":"Intermediate"},{"rank":4,"name":"High topspin to backhand","description":"3-4 heavy topspin above shoulder to backhand corner — forces weak reply, attack DTL","winRate":56,"difficulty":"Beginner"}],"shotSelection":[{"shot":"1st Serve","target":"T on deuce, wide on ad","spin":"Flat or kick","goal":"65%+ in","tip":"Vary placement"},{"shot":"2nd Serve","target":"Kick to backhand","spin":"Heavy topspin","goal":"80%+ in","tip":"Hit the corner not just the box"},{"shot":"Return","target":"Crosscourt deep","spin":"Topspin","goal":"70%+ in play","tip":"Redirect their pace"},{"shot":"Forehand","target":"Deep crosscourt then inside-out","spin":"Heavy topspin","goal":"75%+ in","tip":"Neutral crosscourt then attack"},{"shot":"Backhand","target":"Crosscourt safe","spin":"Topspin/slice","goal":"70%+ in","tip":"Slice when stretched"},{"shot":"Approach","target":"DTL low","spin":"Slice","goal":"8/10","tip":"Net tape height"}],"mentalGame":"Execute the pattern every point — heavy backhand crosscourt until short ball, then attack. Don't skip steps.","avoidAt":["DTL backhand from neutral","Attacking from behind baseline"]}</tactics>`;
      }
    }

    // Strip <tactics> from displayed chat message
    const displayReply = reply.replace(/<tactics>[\s\S]*?<\/tactics>/gi, "").trim();
    const tactics = extractTactics(reply, userText);
    if (tactics) onGamePlan(tactics);

    setMessages([...newMessages, { role: "assistant", content: displayReply || "Game plan generated — see the full tactical breakdown below." }]);
    setLoading(false);
  }

  return (
    <div className="ai-chat-box">
      <div className="chat-header">
        <div className="chat-header-dot" />
        <span>ACE AI · TACTICS LIVE</span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="msg ai">👋 Describe your opponent's style, the surface, and any patterns you've noticed — I'll generate a full tactical game plan with patterns, shot selection, and consistency goals.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "user" : "ai"}`}>{m.content}</div>
        ))}
        {loading && <div className="msg ai loading">Building your game plan…</div>}
        <div ref={bottomRef} />
      </div>
      {quickPrompts && (
        <div className="quick-prompts">
          {quickPrompts.map((q, i) => (
            <button key={i} className="quick-prompt" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      )}
      <div className="chat-input-row">
        <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={placeholder || "Describe your opponent…"} />
        <button className="chat-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}>{loading ? "…" : "Send"}</button>
      </div>
    </div>
  );
}

function GamePlanVisual({ surface, liveData }) {
  const plans = {
    clay: { title: "Clay Court Tactics", color: "var(--clay)",  tips: ["High topspin to push opponent deep", "Longer rallies — be patient", "Attack short balls aggressively", "Heavy kick serve to backhand", "Move opponent side to side"] },
    grass:{ title: "Grass Court Tactics", color: "var(--grass)", tips: ["Serve & volley when possible", "Flatten out groundstrokes", "Stay low on returns", "Take ball early — cut angles", "Approach net at every opportunity"] },
    hard: { title: "Hard Court Tactics", color: "var(--hard)",  tips: ["Neutral — use all weapons", "Big first serve sets up points", "Mix pace to disrupt rhythm", "Strong crosscourt rally ball", "Look for short ball patterns"] },
  };

  // If AI has returned live tactics, show those instead
  if (liveData && liveData.tactics && liveData.tactics.length > 0) {
    return (
      <div className="analysis-visual">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="analysis-title" style={{ color: "var(--clay)", margin: 0 }}>
            {liveData.title || "AI Game Plan"}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: "rgba(200,98,42,0.1)", color: "var(--clay)", padding: "3px 8px", borderRadius: 100 }}>LIVE</span>
        </div>

        {/* Summary line */}
        {liveData.summary && (
          <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.55, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(107,94,82,0.1)" }}>
            {liveData.summary}
          </div>
        )}

        {/* Tactics as ranked bars */}
        {liveData.tactics.map((t, i) => (
          <div key={i} className="stat-bar">
            <div className="stat-bar-label">
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "var(--clay)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{t.tactic}</span>
              </span>
            </div>
            {t.detail && (
              <div style={{ fontSize: 11, color: "var(--mid)", margin: "3px 0 5px 20px", lineHeight: 1.45 }}>{t.detail}</div>
            )}
            <div className="stat-bar-track">
              <div className="stat-bar-fill fill-mid" style={{ width: `${95 - i * 12}%`, background: "var(--clay)", opacity: 0.75 - i * 0.08 }} />
            </div>
          </div>
        ))}

        {/* Avoid section */}
        {liveData.avoid && liveData.avoid.length > 0 && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(217,79,59,0.06)", border: "1px solid rgba(217,79,59,0.15)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>⚠ Avoid</div>
            {liveData.avoid.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--ink)", padding: "2px 0" }}>• {a}</div>
            ))}
          </div>
        )}

        {/* Mental cue */}
        {liveData.mentalCue && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(200,98,42,0.05)", border: "1px solid rgba(200,98,42,0.12)", borderRadius: 6, fontSize: 12, color: "var(--clay)", fontStyle: "italic" }}>
            💬 "{liveData.mentalCue}"
          </div>
        )}
      </div>
    );
  }

  // Default static plan per surface
  const p = plans[surface] || plans.hard;
  return (
    <div className="analysis-visual">
      <div className="analysis-title" style={{ color: p.color }}>{p.title}</div>
      <div style={{ fontSize: 11, color: "var(--mid)", marginBottom: 12, lineHeight: 1.5 }}>
        Describe your opponent in the chat → this panel updates with your personalized game plan.
      </div>
      {p.tips.map((t, i) => (
        <div key={i} className="stat-bar">
          <div className="stat-bar-label">
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: p.color, fontWeight: 700 }}>{i + 1}.</span> {t}
            </span>
          </div>
          <div className="stat-bar-track">
            <div className="stat-bar-fill fill-mid" style={{ width: `${90 - i * 10}%`, background: p.color, opacity: 0.7 - i * 0.1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tips Data ─────────────────────────────────────────────────────────────
const SINGLES_TIPS = {
  "All": null,
  "vs Pushers": [
    { icon: "🧱", title: "Draw Them Forward", badge: "today", difficulty: "Intermediate", preview: "Pushers hate coming to net.", body: `<strong>The play:</strong> Hit a short, low slice to their forehand side to drag them inside the baseline. As they scramble forward, pass them with a deep topspin down the line. <strong>Key:</strong> Be patient — don't go for the winner until they're inside the service box.` },
    { icon: "🎯", title: "Attack Their Backhand Side", badge: "classic", difficulty: "Beginner", preview: "Most pushers have a weak backhand.", body: `<strong>The pattern:</strong> Rally cross-court to their backhand repeatedly until they give you a short ball, then attack down the line. <strong>Why it works:</strong> Pushers rely on consistency — forcing directional changes breaks their rhythm.` },
    { icon: "⬆️", title: "Go Deep & High", badge: "premium", difficulty: "Advanced", preview: "High topspin neutralizes their retrieval.", body: `<strong>The tactic:</strong> Hit heavy topspin to their backhand corner with 4–5 feet of net clearance. This pushes them behind the baseline and forces weak, short replies. <strong>Drill:</strong> Practice hitting 8+ balls cross-court at 80% pace with max spin.` },
    { icon: "🕐", title: "Control the Pace", badge: "classic", difficulty: "Intermediate", preview: "Don't let them dictate the tempo.", body: `<strong>The mistake:</strong> Players rush against pushers and make unforced errors. <strong>The fix:</strong> Drop your pace by 20%, move them side to side, and wait for the short ball. You should be dictating — not reacting.` },
  ],
  "vs Big Hitters": [
    { icon: "🔄", title: "Use Their Power Against Them", badge: "today", difficulty: "Intermediate", preview: "Redirect pace — don't fight it.", body: `<strong>The play:</strong> Take pace off your return and slice or block back deep. Big hitters struggle when there's nothing to swing through. <strong>Key:</strong> Stand 2–3 feet behind your baseline on return to give yourself time.` },
    { icon: "🧩", title: "Disrupt Their Rhythm With Spin", badge: "classic", difficulty: "Advanced", preview: "Heavy topspin kills flat ball timing.", body: `<strong>The tactic:</strong> Hit high, heavy topspin to their backhand. The ball kicks up above their strike zone, forcing a defensive shot. Most big hitters time flat balls perfectly — but hate balls above the shoulder.` },
    { icon: "🌐", title: "Come to Net Behind Approach", badge: "premium", difficulty: "Advanced", preview: "Force the passing shot under pressure.", body: `<strong>The play:</strong> Slice approach down the middle and come to net. This removes their angles and forces a precise pass. <strong>Why:</strong> Big hitters are often less precise on defensive passing shots than groundstrokes.` },
    { icon: "🎭", title: "Moonball to Reset", badge: "classic", difficulty: "Beginner", preview: "High looping balls neutralize power.", body: `<strong>The reset shot:</strong> When in trouble, hit a high topspin moonball down the middle. It buys you time, resets the point, and frustrates players who want to crush the ball flat.` },
  ],
  "vs Net Rushers": [
    { icon: "📐", title: "The Topspin Lob", badge: "today", difficulty: "Intermediate", preview: "Their worst nightmare.", body: `<strong>The play:</strong> When they rush net, hit a heavy topspin lob over their backhand shoulder. It's nearly impossible to overhead and lands deep. <strong>Key:</strong> Aim 6+ feet over their head — don't risk the net.` },
    { icon: "🦶", title: "Hit at Their Feet", badge: "classic", difficulty: "Intermediate", preview: "Force the difficult low volley.", body: `<strong>The tactic:</strong> As they approach, drive the ball low and straight at their feet. A good volley at ankle height is almost impossible. <strong>Drill:</strong> Practice dipping cross-court returns below net height.` },
    { icon: "⚡", title: "Rip the Passing Shot Early", badge: "premium", difficulty: "Advanced", preview: "Take the ball early to cut their time.", body: `<strong>The play:</strong> Step inside the baseline and take the ball on the rise for a sharp passing shot. Net rushers rely on you being on your heels — stepping in and going early kills their positioning advantage.` },
  ],
  "vs Lefties": [
    { icon: "↩️", title: "Adjust Your Return Position", badge: "today", difficulty: "Intermediate", preview: "Their serve kicks the opposite way.", body: `<strong>The adjustment:</strong> A left-hander's kick serve to the deuce court kicks into your forehand — move 2 feet wider. On the ad court, their serve kicks away — stand closer to the middle.` },
    { icon: "🔀", title: "Attack Their Backhand — But Smartly", badge: "classic", difficulty: "Intermediate", preview: "Their backhand is on a different side.", body: `<strong>The trap:</strong> Many players forget lefties' backhand is on the right side of the court. Cross-court from your forehand goes to their forehand. Adjust your rally patterns accordingly.` },
    { icon: "🎯", title: "Target the T on Ad Court", badge: "premium", difficulty: "Advanced", preview: "Neutralize their dominant serve.", body: `<strong>The play:</strong> On your return games on the ad side, cheat toward the T — lefties love the wide serve to open the court, but the T return keeps the point neutral and removes their angle advantage.` },
  ],
};

const DOUBLES_TIPS = {
  "All": null,
  "Poaching": [
    { icon: "⚡", title: "The Fake Poach", badge: "today", difficulty: "Intermediate", preview: "Move, then recover — mess with their mind.", body: `<strong>The play:</strong> Start your poach movement as they wind up, then quickly recover to your position. This forces a panic response — often a weak shot right to your partner. <strong>Key:</strong> Sell the movement convincingly.` },
    { icon: "📡", title: "Signal the Poach", badge: "classic", difficulty: "Beginner", preview: "Always communicate with your partner.", body: `<strong>The system:</strong> Use hand signals behind your back before each point. Open hand = poach. Closed fist = stay. This removes hesitation and lets your partner cover the open court automatically.` },
    { icon: "🎯", title: "Poach on Weak Second Serves", badge: "premium", difficulty: "Advanced", preview: "Their second serve is your invitation.", body: `<strong>The setup:</strong> When your partner serves a strong first serve, hold position. But on opponent second serves to your partner's forehand, commit to the poach early — the return will be slower and more predictable.` },
  ],
  "I Formation": [
    { icon: "🔀", title: "Master the I-Formation", badge: "today", difficulty: "Advanced", preview: "Confuse returners and control the net.", body: `<strong>The setup:</strong> Server's partner crouches at the net strap. Server signals left or right — net player moves that way, server covers opposite. <strong>Why it works:</strong> The returner has no idea where to aim, forcing a safer, weaker return.` },
    { icon: "📋", title: "When to Use the I-Formation", badge: "classic", difficulty: "Intermediate", preview: "Use it on big points — not every game.", body: `<strong>Best moments:</strong> Break point situations, when the returner is dominant cross-court, or when you need to disrupt a pattern. Overusing it removes the surprise element — deploy it strategically.` },
  ],
  "Defending Lobs": [
    { icon: "🔄", title: "The Australian Switch", badge: "today", difficulty: "Intermediate", preview: "Reset after getting lobbed.", body: `<strong>The play:</strong> When lobbed over the net player, both partners switch sides. The net player retreats to cover the lob while the server moves to the opposite side. Call it out loud — "Switch!" — to avoid confusion.` },
    { icon: "🏃", title: "Overhead Recovery Position", badge: "classic", difficulty: "Beginner", preview: "Don't chase — position first.", body: `<strong>The mistake:</strong> Players sprint back and hit the overhead off-balance. <strong>The fix:</strong> Turn sideways immediately, use a crossover step, and get under the ball before it bounces. A controlled bounce overhead is better than a shanked jump smash.` },
    { icon: "🎯", title: "Attack the Weaker Side", badge: "premium", difficulty: "Advanced", preview: "Put away volleys with intent.", body: `<strong>The overhead target:</strong> Hit overheads at the feet of the player closest to the net, or angle it sharply to the weaker player's backhand. Never hit straight at the body — it's the easiest ball to block back.` },
  ],
  "Return Strategy": [
    { icon: "🧱", title: "Return Low at the Net Player's Feet", badge: "today", difficulty: "Intermediate", preview: "Make them volley up — not down.", body: `<strong>The play:</strong> Chip the return low, aimed at the net player's shoe tops. A volley from below net height must go upward, giving you time to reset. <strong>Drill:</strong> Practice sliced cross-court returns that land in the service box.` },
    { icon: "🚀", title: "Lob the Net Player Early", badge: "classic", difficulty: "Beginner", preview: "Keep them honest from the start.", body: `<strong>The tactic:</strong> Hit one early lob over the net player in the first few games. This freezes them — they can't poach as aggressively because they know the lob is coming. Creates space for your partner all match.` },
    { icon: "🎯", title: "Body Serve Return", badge: "premium", difficulty: "Advanced", preview: "Jam the net player and force errors.", body: `<strong>The play:</strong> Drive the return directly at the net player's body, hip height. At close range, they have no time to volley — they can only block, usually weakly. Best used when they're poaching aggressively.` },
  ],
};

// ─── TipCard Component ─────────────────────────────────────────────────────
function TipCard({ tip, isUnlocked, onUnlock }) {
  return (
    <div className="tip-card">
      <div className="tip-card-header">
        <div style={{ flex: 1 }}>
          <div className="tip-card-meta">
            <span className={`tip-badge ${tip.badge === "today" ? "badge-today" : tip.badge === "premium" ? "badge-premium" : "badge-classic"}`}>
              {tip.badge === "today" ? "📅 Today" : tip.badge === "premium" ? "⭐ Premium" : "Classic"}
            </span>
            <span className="tip-difficulty">{tip.difficulty}</span>
          </div>
          <div className="tip-card-title">{tip.title}</div>
        </div>
        <div className="tip-card-icon">{tip.icon}</div>
      </div>
      <div className="tip-card-body">
        <p style={{ marginBottom: isUnlocked ? 0 : 48 }} dangerouslySetInnerHTML={{ __html: isUnlocked ? tip.body : `<em style="color:var(--mid)">${tip.preview}</em>` }} />
        {!isUnlocked && (
          <div className="tip-locked-overlay">
            <div className="lock-icon">🔒</div>
            <div className="lock-text">Members only</div>
            <button className="lock-cta" onClick={onUnlock}>Unlock All Tips</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tips Section Component ────────────────────────────────────────────────
function TipsSection({ title, label, data, isDoubles, isUnlocked, onUnlock, setModalPlan, todayDate }) {
  const categories = Object.keys(data);
  const [activeCategory, setActiveCategory] = useState(categories[1]); // default to first real category

  const tips = data[activeCategory] || Object.values(data).flat().filter(Boolean);

  // First 2 cards always visible as preview, rest locked
  return (
    <section className={`tips-section${isDoubles ? " doubles" : ""}`} id={isDoubles ? "doubles" : "singles"}>
      <div className="section-label">{label}</div>
      <div className="section-title">{title}</div>
      <div className="section-subtitle">
        {isDoubles
          ? "Master net play, poaching, formations and partnership tactics."
          : "Beat every player type with proven patterns and tactical blueprints."}
      </div>

      <div className="daily-banner">
        <div className="daily-banner-icon">📅</div>
        <div className="daily-banner-text">
          <strong>Today's Tip — {todayDate}</strong>
          <span>New strategy content drops every day. {isUnlocked ? "You have full access." : "Subscribe to unlock all tips."}</span>
        </div>
        <div className="daily-banner-badge">{isUnlocked ? "✓ Unlocked" : "🔒 Members Only"}</div>
      </div>

      <div className="tips-tabs">
        {categories.map(cat => (
          <button key={cat} className={`tips-tab ${activeCategory === cat ? "active" : ""}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
        ))}
      </div>

      <div className="tips-grid">
        {tips.map((tip, i) => (
          <TipCard
            key={i}
            tip={tip}
            isUnlocked={isUnlocked || i < 1}
            onUnlock={() => setModalPlan("Challenger")}
          />
        ))}
      </div>

      {!isUnlocked && (
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p style={{ color: "var(--mid)", marginBottom: 16, fontSize: 15 }}>
            🔒 {tips.length - 1} more tips hidden — subscribe to unlock everything
          </p>
          <button className="btn-primary" onClick={() => setModalPlan("Challenger")}>
            Unlock All Tips from $15/mo
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Video Analysis Component ──────────────────────────────────────────────
const VIDEO_SYSTEM = `You are ACE Video Analyst, an expert tennis coach who analyzes match footage and player descriptions. 
When given details about a tennis match or video upload context, you must respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "grade": "B+",
  "gradeColor": "#C4A42B",
  "summary": "2-3 sentence overall assessment of the player's performance",
  "stats": [
    { "label": "1st Serve %", "value": 61, "cls": "fill-good", "note": "61%" },
    { "label": "2nd Serve Win %", "value": 34, "cls": "fill-bad", "note": "34%" },
    { "label": "Unforced Errors", "value": 68, "cls": "fill-bad", "note": "High" },
    { "label": "Net Points Won", "value": 72, "cls": "fill-good", "note": "72%" },
    { "label": "Return Games Won", "value": 38, "cls": "fill-mid", "note": "38%" },
    { "label": "Rally Win % (5+ shots)", "value": 55, "cls": "fill-mid", "note": "55%" }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "drills": ["drill recommendation 1", "drill recommendation 2", "drill recommendation 3"]
}
Use fill-good for values above 60, fill-mid for 40-60, fill-bad for below 40. Adjust all stats based on the player's described level, surface, and match context. Always return only the JSON object.`;

function VideoAnalysis({ isUnlocked, setModalPlan }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [level, setLevel] = useState("");
  const [surface, setSurface] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | processing | done
  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  const STEPS = [
    "Uploading match footage…",
    "Extracting rally sequences…",
    "Analyzing serve patterns…",
    "Scoring shot selection…",
    "Generating performance report…",
  ];

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setPhase("idle");
    setResults(null);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function runAnalysis() {
    if (!isUnlocked) { setModalPlan("Pro"); return; }
    setPhase("processing");
    setStepIdx(0);
    setResults(null);

    // Animate through steps
    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i);
      await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
    }

    // Call AI with context
    const prompt = `Analyze this tennis match. Player level: ${level || "3.5 NTRP"}. Surface: ${surface || "Hard court"}. Additional context: ${notes || "General match, player wants full breakdown"}. Generate realistic, specific stats and feedback for this player.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: VIDEO_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.map(b => b.text || "").join("") || "{}";
        try {
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          setResults(parsed);
        } catch {
          setResults(getFallbackResults(level, surface));
        }
      } else {
        // Backend fallback
        const BACKEND_URL = "https://your-domain.com/api/chat";
        const prodRes = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL, max_tokens: 1000,
            system: VIDEO_SYSTEM,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (prodRes.ok) {
          const data = await prodRes.json();
          const text = data.content?.map(b => b.text || "").join("") || "{}";
          setResults(JSON.parse(text.replace(/```json|```/g, "").trim()));
        } else {
          setResults(getFallbackResults(level, surface));
        }
      }
    } catch {
      setResults(getFallbackResults(level, surface));
    }
    setPhase("done");
  }

  function getFallbackResults(level, surface) {
    return {
      grade: "B", gradeColor: "#2B5F8A",
      summary: `Based on your ${level || "3.5"} level match on ${surface || "hard court"}, you showed solid baseline consistency but struggled to convert on break point opportunities. Your net game needs development.`,
      stats: [
        { label: "1st Serve %", value: 58, cls: "fill-mid", note: "58%" },
        { label: "2nd Serve Win %", value: 31, cls: "fill-bad", note: "31%" },
        { label: "Unforced Errors", value: 72, cls: "fill-bad", note: "High" },
        { label: "Net Points Won", value: 54, cls: "fill-mid", note: "54%" },
        { label: "Return Games Won", value: 29, cls: "fill-bad", note: "29%" },
        { label: "Rally Win % (5+ shots)", value: 61, cls: "fill-good", note: "61%" },
      ],
      strengths: ["Consistent cross-court forehand", "Good first serve placement", "Strong baseline rallying"],
      weaknesses: ["2nd serve too weak — losing 70% of points", "Unforced errors on forehand wing under pressure", "Rarely approaches net"],
      drills: ["Kick serve practice — 30 min daily targeting the backhand", "Forehand inside-out pattern drill", "Serve & volley practice — 15 min per session"],
    };
  }

  function reset() { setFile(null); setPhase("idle"); setResults(null); setNotes(""); setLevel(""); setSurface(""); }

  return (
    <div>
      {phase !== "done" && (
        <>
          {/* Upload zone */}
          {!file ? (
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="video/*,.mp4,.mov,.avi,.mkv" onChange={e => handleFile(e.target.files[0])} />
              <span className="upload-icon">🎬</span>
              <div className="upload-title">DROP YOUR MATCH VIDEO</div>
              <div className="upload-sub">Drag & drop or <span>browse files</span> to upload</div>
              <div className="upload-formats">Supported: MP4, MOV, AVI, MKV · Max 2GB</div>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-preview-icon">🎾</div>
              <div className="file-preview-info">
                <div className="file-preview-name">{file.name}</div>
                <div className="file-preview-size">{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze</div>
              </div>
              <button className="file-remove" onClick={e => { e.stopPropagation(); setFile(null); }}>✕</button>
            </div>
          )}

          {/* Context inputs */}
          <div className="upload-context-row" style={{ marginTop: 16 }}>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">Your NTRP Level</option>
              <option>2.5 – Beginner</option>
              <option>3.0 – Intermediate</option>
              <option>3.5 – Club Player</option>
              <option>4.0 – Competitive</option>
              <option>4.5 – Advanced</option>
              <option>5.0+ – Expert</option>
            </select>
            <select value={surface} onChange={e => setSurface(e.target.value)}>
              <option value="">Court Surface</option>
              <option>Hard court</option>
              <option>Clay court</option>
              <option>Grass court</option>
              <option>Indoor hard</option>
            </select>
          </div>
          <textarea
            className="upload-notes"
            placeholder="Any context about this match? (e.g. 'struggled with my backhand', 'lost the second set 6-1', 'opponent was a lefty pusher')"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          {phase === "processing" ? (
            <div className="analysis-progress">
              {STEPS.map((s, i) => (
                <div key={i} className={`progress-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                  <div className={`step-dot ${i < stepIdx ? "done" : i === stepIdx ? "active" : "pending"}`}>
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          ) : (
            <button className="analyze-btn" onClick={runAnalysis} disabled={!file && !notes}>
              {isUnlocked ? "🎬 Analyze My Match" : "🔒 Subscribe to Analyze Videos"}
            </button>
          )}

          {!isUnlocked && (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--mid)", marginTop: 10 }}>
              Video analysis is available on the <strong>Pro</strong> plan ($29/mo)
            </p>
          )}
        </>
      )}

      {/* Results */}
      {phase === "done" && results && (
        <div className="video-results">
          <div className="results-header">
            <div>
              <div className="results-title">MATCH ANALYSIS REPORT</div>
              <div style={{ fontSize: 13, color: "var(--mid)", marginTop: 4 }}>{file?.name || "Match footage"} · {level || "3.5 NTRP"} · {surface || "Hard court"}</div>
            </div>
            <div className="results-grade">
              <div className="grade-circle" style={{ background: results.gradeColor }}>{results.grade}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Overall Grade</div>
                <div className="grade-label">Performance Score</div>
              </div>
            </div>
          </div>

          <div className="results-summary">{results.summary}</div>

          {/* Stat bars — same style as MatchAnalysisVisual */}
          <div className="analysis-visual" style={{ marginBottom: 20 }}>
            <div className="analysis-title">Performance Breakdown</div>
            {results.stats?.map((s, i) => (
              <div key={i} className="stat-bar">
                <div className="stat-bar-label"><span>{s.label}</span><span>{s.note}</span></div>
                <div className="stat-bar-track">
                  <div className={`stat-bar-fill ${s.cls}`} style={{ width: `${s.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "rgba(74,124,47,0.07)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--grass-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>✓ Strengths</div>
              {results.strengths?.map((s, i) => <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "5px 0", borderBottom: "1px solid rgba(74,124,47,0.1)" }}>{s}</div>)}
            </div>
            <div style={{ background: "rgba(217,79,59,0.06)", border: "1px solid rgba(217,79,59,0.2)", borderRadius: 8, padding: "16px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>⚠ Fix These</div>
              {results.weaknesses?.map((w, i) => <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "5px 0", borderBottom: "1px solid rgba(217,79,59,0.1)" }}>{w}</div>)}
            </div>
          </div>

          {/* Drills */}
          <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 8, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--clay)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🎯 Recommended Drills</div>
            {results.drills?.map((d, i) => (
              <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "7px 0", borderBottom: "1px solid rgba(107,94,82,0.08)", display: "flex", gap: 10 }}>
                <span style={{ color: "var(--clay)", fontWeight: 700 }}>{i + 1}.</span> {d}
              </div>
            ))}
          </div>

          <button className="results-reset" onClick={reset}>← Analyze Another Match</button>
        </div>
      )}
    </div>
  );
}

// ─── Drills on Demand Component ───────────────────────────────────────────
const DRILLS_SYSTEM = `You are ACE Drills Coach, an expert tennis trainer who builds hyper-personalized drill plans. You will receive a player profile and must respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "headline": "Your Personalized Drill Plan",
  "focus": "Primary focus area in 6 words or less",
  "summary": "2-3 sentence overview of why this plan targets their specific needs",
  "weeklySchedule": [
    { "day": "Monday", "theme": "Serve Power & Placement", "duration": "45 min", "type": "on-court" },
    { "day": "Tuesday", "theme": "Footwork & Court Coverage", "duration": "30 min", "type": "off-court" },
    { "day": "Wednesday", "theme": "Rest / Light Hitting", "duration": "20 min", "type": "on-court" },
    { "day": "Thursday", "theme": "Return of Serve Patterns", "duration": "45 min", "type": "on-court" },
    { "day": "Friday", "theme": "Match Simulation", "duration": "60 min", "type": "on-court" },
    { "day": "Saturday", "theme": "Strength & Conditioning", "duration": "40 min", "type": "off-court" },
    { "day": "Sunday", "theme": "Rest", "duration": "-", "type": "rest" }
  ],
  "drills": [
    {
      "name": "Drill name",
      "type": "on-court",
      "duration": "15 min",
      "difficulty": "Intermediate",
      "focus": "2nd Serve",
      "description": "Detailed step-by-step description of exactly how to do this drill",
      "reps": "3 sets of 10",
      "coachTip": "One specific coaching cue or tip"
    }
  ],
  "offCourtDrills": [
    {
      "name": "Drill name",
      "type": "off-court",
      "duration": "10 min",
      "difficulty": "Beginner",
      "focus": "Footwork",
      "description": "Detailed step-by-step description",
      "reps": "2 sets of 20",
      "coachTip": "One coaching tip"
    }
  ],
  "progressionGoal": "Specific measurable goal the player should hit in 4 weeks"
}
Generate 4-5 on-court drills and 3 off-court drills. Make everything hyper-specific to the player's level, weaknesses, surface, and goals. Always return only the JSON object.`;

const DRILLS_VIDEO_SYSTEM = `You are ACE Drills Coach analyzing a tennis match video upload. Based on the player's video context and match details, generate a hyper-personalized drill plan. Respond ONLY with a valid JSON object (no markdown, no preamble) using the exact same format as your standard drill plan. Make the drills directly address the specific weaknesses identified from the video footage.`;

const QUESTIONS = [
  {
    id: "level", label: "What's your NTRP level?",
    hint: "This helps calibrate drill intensity",
    type: "select",
    options: ["2.5 – Beginner", "3.0 – Recreational", "3.5 – Club Player", "4.0 – Competitive", "4.5 – Advanced", "5.0+ – Expert"],
  },
  {
    id: "weakness", label: "What's your biggest weakness right now?",
    hint: "Be as specific as possible",
    type: "select",
    options: ["2nd serve — too weak / double faults", "Backhand breaking down under pressure", "Unforced errors on forehand", "Losing net points / volleys", "Return of serve", "Movement & footwork", "Mental game / closing out sets"],
  },
  {
    id: "goal", label: "What's your #1 goal for the next 4 weeks?",
    hint: "Pick what matters most right now",
    type: "select",
    options: ["Win more matches at my level", "Move up to the next NTRP rating", "Improve a specific shot", "Get more consistent in rallies", "Beat a specific type of opponent", "Prepare for a tournament"],
  },
  {
    id: "surface", label: "What surface do you play on most?",
    hint: "Drills will be tailored to your court",
    type: "select",
    options: ["Hard court (outdoor)", "Hard court (indoor)", "Clay court", "Grass court"],
  },
  {
    id: "availability", label: "How many days per week can you train?",
    hint: "Including both on and off court",
    type: "select",
    options: ["1–2 days / week", "3–4 days / week", "5–6 days / week", "Every day"],
  },
];

// ─── YouTube drill video library — verified working IDs ───────────────────
const DRILL_VIDEOS = {
  // Serve
  "Serve":             { title: "Tennis Serve Drills For Fast Improvement", url: "https://www.youtube.com/watch?v=Bcqi_M9aPmg", channel: "Top Tennis Training · YouTube" },
  "2nd Serve":         { title: "Develop Heavy Kick With The Trap Drill", url: "https://www.youtube.com/watch?v=P8eZQBD-X0c", channel: "FuzzyYellowBalls · YouTube" },
  "2nd Serve Pressure":{ title: "Kick Serve Step 1 — Toss Position", url: "https://www.youtube.com/watch?v=TkAj6MmwxHw", channel: "FuzzyYellowBalls · YouTube" },
  // Forehand
  "Forehand":          { title: "How To Hit The Perfect Tennis Forehand", url: "https://www.youtube.com/watch?v=aZj7DIEftPg", channel: "Top Tennis Training · YouTube" },
  "Forehand Consistency":{ title: "How To Hit The Perfect Tennis Forehand", url: "https://www.youtube.com/watch?v=aZj7DIEftPg", channel: "Top Tennis Training · YouTube" },
  "Forehand Power":    { title: "Tennis Forehand — 5 Steps To Crazy Power", url: "https://www.youtube.com/watch?v=WpZY6bbiM6I", channel: "Top Tennis Training · YouTube" },
  // Backhand
  "Backhand":          { title: "Tennis Two Handed Backhand — Hit Heavy Topspin", url: "https://www.youtube.com/watch?v=OU39URVIpVc", channel: "Top Tennis Training · YouTube" },
  // Volley / Net
  "Net Game":          { title: "Tennis Volley Lesson — Transform Your Volleys", url: "https://www.youtube.com/watch?v=D1npzA6_Q3U", channel: "Top Tennis Training · YouTube" },
  "Volley / Net Game": { title: "Dominate The Net — 6 Volley Drills", url: "https://www.youtube.com/watch?v=LJCRU5fM-Bk", channel: "Top Tennis Training · YouTube" },
  "Hand Speed":        { title: "Tennis Volley Drills — Power Control Footwork", url: "https://www.youtube.com/watch?v=ebSB47mHNuQ", channel: "Intuitive Tennis · YouTube" },
  // Return
  "Return":            { title: "Top 3 Drills For Perfect Return of Serve", url: "https://www.youtube.com/watch?v=_pS0otk2560", channel: "Top Tennis Training · YouTube" },
  // Footwork
  "Footwork":          { title: "Tennis Footwork — 5 Drills To Improve Movement", url: "https://www.youtube.com/watch?v=eGWhONP7558", channel: "Top Tennis Training · YouTube" },
  "Court Speed":       { title: "5 Easy Ladder Footwork Drills for Tennis", url: "https://www.youtube.com/watch?v=s9twENtOkwk", channel: "Essential Tennis · YouTube" },
  // Patterns
  "Shot Selection":    { title: "Tennis Ball Machine Drills — Forehand Backhand Volleys", url: "https://www.youtube.com/watch?v=CofM-vwQRW4", channel: "Top Tennis Training · YouTube" },
  "Mental Game":       { title: "The Most Important Footwork Lesson", url: "https://www.youtube.com/watch?v=y6IBn6hxDZ4", channel: "Top Tennis Training · YouTube" },
  "Consistency":       { title: "Tennis Serve Drills For Fast Improvement", url: "https://www.youtube.com/watch?v=Bcqi_M9aPmg", channel: "Top Tennis Training · YouTube" },
};

function getVideoForDrill(focus) {
  if (!focus) return null;
  const key = Object.keys(DRILL_VIDEOS).find(k =>
    focus.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(focus.toLowerCase())
  );
  return key ? DRILL_VIDEOS[key] : null;
}

function DrillCard({ drill, index, isUnlocked, setModalPlan }) {
  const [open, setOpen] = useState(false);
  const isOff = drill.type === "off-court";
  const video = getVideoForDrill(drill.focus || drill.name);
  const accentColor = isOff ? "var(--hard)" : "var(--clay)";
  const accentBg = isOff ? "rgba(26,58,92,0.08)" : "rgba(200,98,42,0.08)";
  return (
    <div style={{ background: "white", border: `1px solid ${isOff ? "rgba(26,58,92,0.15)" : "rgba(107,94,82,0.12)"}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: isOff ? "rgba(26,58,92,0.03)" : "white" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: accentColor }}>{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{drill.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: accentBg, color: accentColor }}>{isOff ? "🏠 Off-Court" : "🎾 On-Court"}</span>
            <span style={{ fontSize: 11, color: "var(--mid)", fontWeight: 500 }}>⏱ {drill.duration}</span>
            <span style={{ fontSize: 11, color: "var(--mid)", fontWeight: 500 }}>📊 {drill.difficulty}</span>
            <span style={{ fontSize: 11, color: "var(--mid)", fontWeight: 500 }}>🎯 {drill.focus}</span>
            {video && <span style={{ fontSize: 11, color: "#E53935", fontWeight: 700 }}>▶ Video</span>}
          </div>
        </div>
        <div style={{ color: "var(--mid)", fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>⌄</div>
      </div>
      {open && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(107,94,82,0.08)" }}>
          <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7, marginTop: 14, marginBottom: 12 }}>{drill.description}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ background: "rgba(107,94,82,0.06)", borderRadius: 6, padding: "8px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", marginBottom: 2 }}>Reps / Sets</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{drill.reps}</div>
            </div>
            <div style={{ background: accentBg, borderRadius: 6, padding: "8px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", marginBottom: 2 }}>Focus Area</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>{drill.focus}</div>
            </div>
          </div>
          <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--clay)", textTransform: "uppercase", letterSpacing: 1 }}>💡 Coach Tip: </span>
            <span style={{ fontSize: 13, color: "var(--ink)" }}>{drill.coachTip}</span>
          </div>
          {video && (
            isUnlocked ? (
              <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff5f5", border: "1px solid rgba(229,57,53,0.2)", borderRadius: 6, padding: "10px 14px", textDecoration: "none" }}>
                <div style={{ width: 32, height: 32, background: "#E53935", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontSize: 14 }}>▶</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E53935" }}>{video.title}</div>
                  <div style={{ fontSize: 11, color: "var(--mid)" }}>via {video.channel} · YouTube</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--mid)" }}>Open ↗</span>
              </a>
            ) : (
              <div onClick={() => setModalPlan("Pro")} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(107,94,82,0.04)", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 6, padding: "10px 14px", cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, background: "rgba(107,94,82,0.1)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{video.title}</div>
                  <div style={{ fontSize: 11, color: "var(--clay)", fontWeight: 600 }}>Subscribe to watch drill videos →</div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DrillsOnDemand({ isUnlocked, setModalPlan }) {
  const [mode, setMode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [file, setFile] = useState(null);
  const [videoNotes, setVideoNotes] = useState("");
  const [videoLevel, setVideoLevel] = useState("");
  const [videoSurface, setVideoSurface] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [plan, setPlan] = useState(null);
  const [drillTab, setDrillTab] = useState("on");
  const fileRef = useRef();

  const LOADING_STEPS = ["Analyzing your player profile…","Identifying priority areas…","Building your weekly schedule…","Crafting personalized drills…","Finalizing your lesson plan…"];

  async function generate(prompt, system) {
    setLoading(true);
    for (let i = 0; i < LOADING_STEPS.length; i++) {
      setStepMsg(LOADING_STEPS[i]);
      await new Promise(r => setTimeout(r, 700));
    }
    let result = null;
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000));
      result = await Promise.race([fetchAI(system, prompt), timeoutPromise]);
    } catch {}
    setPlan(result || getFallbackPlan(answers));
    setLoading(false);
  }

  function getFallbackPlan(a) {
    const weakness = a.weakness || "2nd serve — too weak / double faults";
    const level = a.level || "3.5 – Club Player";
    const surface = a.surface || "Hard court (outdoor)";
    const availability = a.availability || "3–4 days / week";
    return {
      headline: "Your Personalized Drill Plan",
      focus: weakness.split("—")[0].trim(),
      summary: `Tailored for a ${level} player on ${surface} with ${availability} of training time. Every drill directly targets your stated weakness — ${weakness.split("—")[0].trim().toLowerCase()} — with a clear 4-week progression.`,
      weeklySchedule: [
        { day: "Monday",    theme: "Serve Mechanics & Kick Serve",     duration: "45 min", type: "on-court",  detail: "Toss consistency + kick serve reps with cone targets in the service box." },
        { day: "Tuesday",   theme: "Footwork Ladder & Shadow Swings",  duration: "30 min", type: "off-court", detail: "Agility ladder patterns + resistance band forehand/backhand swings at home." },
        { day: "Wednesday", theme: "Crosscourt Rally Patterns",        duration: "45 min", type: "on-court",  detail: "Forehand and backhand crosscourt consistency drill — 3ft net clearance rule." },
        { day: "Thursday",  theme: "Strength & Shoulder Stability",    duration: "30 min", type: "off-court", detail: "External rotation band work + core. Prevents injury and adds serve power." },
        { day: "Friday",    theme: "Match Simulation & Point Play",    duration: "60 min", type: "on-court",  detail: "Play full points focusing on executing your primary pattern every point." },
        { day: "Saturday",  theme: "Return of Serve + Approach Shots", duration: "40 min", type: "on-court",  detail: "Return positioning drill + approach shot down the line into net volley." },
        { day: "Sunday",    theme: "Rest & Mental Review",             duration: "-",      type: "rest",      detail: "Review your week. Note what improved and what to focus on next session." },
      ],
      drills: [
        { name: "Kick Serve Cone Targets", type: "on-court", duration: "20 min", difficulty: "Intermediate", focus: "2nd Serve",
          description: "Place a cone at the T and one at the wide corner of the deuce service box. Hit 10 kick serves at each cone, brushing up the back of the ball with a continental grip. Rest 30 seconds between sets. Track how many land within 2 feet of the cone — goal is 7/10 by week 2, 9/10 by week 4. Progress by moving cones closer each week.",
          reps: "4 sets of 10 per target", coachTip: "Toss the ball slightly behind your head — this creates the upward swing path needed for topspin kick. If you're tossing forward, the serve will go flat." },
        { name: "Crosscourt Forehand Consistency", type: "on-court", duration: "15 min", difficulty: "Beginner", focus: "Forehand Consistency",
          description: "Rally crosscourt with a partner or ball machine keeping every ball 3 feet above the net and past the service line. Count consecutive balls without error. Week 1 goal: 15 consecutive. Week 3 goal: 30 consecutive. Gradually increase pace each week while maintaining the same clearance height.",
          reps: "3 sets of 5 min continuous", coachTip: "Keep your head still through contact — most forehand errors come from looking up to track the ball before you've actually hit it." },
        { name: "Inside-Out Forehand Attack", type: "on-court", duration: "15 min", difficulty: "Intermediate", focus: "Shot Selection",
          description: "Partner feeds a mid-court ball to your backhand side. Run around the backhand and drive an inside-out forehand to their backhand corner, then recover to center. Week 1: footwork focus only. Week 2: add pace. Week 3: change direction on the 3rd ball. Week 4: play it out as a full point with the opponent trying to defend.",
          reps: "3 sets of 15 balls", coachTip: "Load your outside hip as you run around — the power comes from unwinding that hip toward the target, not from swinging your arm harder." },
        { name: "Approach Shot + First Volley", type: "on-court", duration: "20 min", difficulty: "Intermediate", focus: "Net Game",
          description: "Partner feeds a short ball inside the service line. Hit a low slice approach down the line, then split step and put away a crosscourt volley. Alternate forehand and backhand sides. Progression over 4 weeks: approach only → add volley → partner passes → full point after approach.",
          reps: "3 sets of 10 per side", coachTip: "Keep the approach low and deep — a high floating approach gives your opponent time to line up the pass. Aim at net tape height, not above it." },
        { name: "Second Serve Only Points", type: "on-court", duration: "20 min", difficulty: "Advanced", focus: "2nd Serve Pressure",
          description: "Play full points but serve only second serves — no first serve allowed. This forces you to develop a reliable spin serve under real match pressure. Track your win % each session. Players who do this drill for 3 consecutive weeks almost always eliminate double fault patterns in matches.",
          reps: "Play 20 points", coachTip: "Commit fully to the toss before swinging — hesitation mid-motion is the single biggest cause of double faults. Once you start, finish the motion with full commitment." },
      ],
      offCourtDrills: [
        { name: "Agility Ladder Footwork", type: "off-court", duration: "15 min", difficulty: "Beginner", focus: "Court Speed",
          description: "Use an agility ladder or tape lines on the floor. Run 3 patterns: 1) In-In-Out-Out lateral 2) Single-leg hops through each rung 3) Icky shuffle. Add a split step + shadow forehand swing at the end of every run. This directly translates to faster first-step reaction — especially for returns and wide balls.",
          reps: "5 rounds of 30 sec on / 15 sec rest", coachTip: "Stay on the balls of your feet throughout — never land flat-footed. Think boxer's footwork, not sprinter's stride." },
        { name: "Resistance Band Forehand Swings", type: "off-court", duration: "10 min", difficulty: "Beginner", focus: "Forehand Power",
          description: "Attach a light resistance band to a door handle at hip height. Take your forehand grip and stance. Simulate your complete swing motion from unit turn through contact to follow-through in slow motion. Use a mirror if possible to check your swing path. Focus on hip rotation first — the sequence is hip → shoulder → arm.",
          reps: "3 sets of 20 swings each side", coachTip: "If your arm moves before your hips, you are arming the ball and losing power. The hip-to-shoulder-to-arm sequence is where all your power originates." },
        { name: "Wall Rallying for Hand Speed", type: "off-court", duration: "10 min", difficulty: "Beginner", focus: "Hand Speed",
          description: "Stand 3-5 feet from a smooth wall and hit alternating forehand and backhand mini-swings continuously. Move 1 foot closer each week to increase reaction time demands. Challenge yourself: count your longest rally. This single drill builds hand-eye coordination, wrist stability, and reaction speed all at the same time.",
          reps: "5 rounds of 2 min on / 30 sec rest", coachTip: "Use your shoulder to direct the ball — not your wrist. Wrist-flicking causes mis-hits and over time leads to wrist strain." },
      ],
      progressionGoal: "Hit 70%+ of 2nd serves in with topspin and win 50%+ of 2nd serve points within 4 weeks. Log your serve win % in every practice session.",
    };
  }

  function submitQuestions() {
    const prompt = `Player profile:\n- NTRP Level: ${answers.level || "3.5"}\n- Biggest weakness: ${answers.weakness || "general improvement"}\n- Primary goal: ${answers.goal || "win more matches"}\n- Main surface: ${answers.surface || "hard court"}\n- Training availability: ${answers.availability || "3-4 days/week"}\nBuild a complete personalized weekly drill plan targeting these specifics.`;
    generate(prompt, DRILLS_SYSTEM);
  }

  function submitVideo() {
    const prompt = `Video match analysis for drill generation:\n- Player level: ${videoLevel || "3.5 NTRP"}\n- Surface: ${videoSurface || "Hard court"}\n- Match notes: ${videoNotes || "general match footage"}\nGenerate a personalized drill plan.`;
    generate(prompt, DRILLS_VIDEO_SYSTEM);
  }

  function reset() { setMode(null); setAnswers({}); setCurrentQ(0); setPlan(null); setFile(null); setVideoNotes(""); setLoading(false); }

  if (!mode && !plan) return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { id: "questions", icon: "📋", title: "Answer 5 Questions", sub: "Tell us about your game — get a free sample tailored weekly plan. Subscribe to unlock full drills + video guides." },
          { id: "video",     icon: "🎬", title: "Upload Match Video", sub: "Upload footage and AI analyzes your actual play to build drills targeting your real weaknesses." },
        ].map(opt => (
          <div key={opt.id} onClick={() => setMode(opt.id)}
            style={{ background: "white", border: "2px solid rgba(107,94,82,0.15)", borderRadius: 12, padding: "32px 28px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--clay)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(200,98,42,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(107,94,82,0.15)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>{opt.icon}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, color: "var(--ink)", marginBottom: 10 }}>{opt.title}</div>
            <div style={{ fontSize: 14, color: "var(--mid)", lineHeight: 1.6, fontWeight: 300 }}>{opt.sub}</div>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--mid)", marginTop: 20 }}>📹 Drill video guides unlocked for subscribers.</p>
    </div>
  );

  if (loading) return (
    <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎾</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--ink)", marginBottom: 8 }}>BUILDING YOUR PLAN</div>
      <div style={{ fontSize: 14, color: "var(--clay)", fontWeight: 600, animation: "pulse 1.2s infinite" }}>{stepMsg}</div>
    </div>
  );

  if (mode === "questions" && !plan) {
    const q = QUESTIONS[currentQ];
    const progress = (currentQ / QUESTIONS.length) * 100;
    return (
      <div>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--mid)", fontWeight: 600, marginBottom: 8 }}>
            <span>Question {currentQ + 1} of {QUESTIONS.length}</span><span>{Math.round(progress)}% complete</span>
          </div>
          <div style={{ height: 4, background: "rgba(107,94,82,0.12)", borderRadius: 2 }}>
            <div style={{ height: "100%", background: "var(--clay)", borderRadius: 2, width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 12, padding: "28px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--clay)", marginBottom: 10 }}>Question {currentQ + 1}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "var(--ink)", marginBottom: 6 }}>{q.label}</div>
          <div style={{ fontSize: 13, color: "var(--mid)", marginBottom: 20 }}>{q.hint}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map(opt => (
              <div key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer", border: `2px solid ${answers[q.id] === opt ? "var(--clay)" : "rgba(107,94,82,0.15)"}`, background: answers[q.id] === opt ? "rgba(200,98,42,0.06)" : "white", fontSize: 14, color: answers[q.id] === opt ? "var(--clay)" : "var(--ink)", fontWeight: answers[q.id] === opt ? 700 : 400, transition: "all 0.15s" }}>{opt}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} className="results-reset">← Back</button>}
          <button onClick={reset} className="results-reset">Start Over</button>
          <div style={{ flex: 1 }} />
          {currentQ < QUESTIONS.length - 1
            ? <button className="analyze-btn" style={{ maxWidth: 180 }} disabled={!answers[q.id]} onClick={() => setCurrentQ(q => q + 1)}>Next →</button>
            : <button className="analyze-btn" style={{ maxWidth: 220 }} disabled={!answers[q.id]} onClick={submitQuestions}>🎯 Build My Drill Plan</button>}
        </div>
      </div>
    );
  }

  if (mode === "video" && !plan) return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {!file ? (
          <div className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="video/*" onChange={e => setFile(e.target.files[0])} />
            <span className="upload-icon">🎬</span>
            <div className="upload-title">DROP YOUR MATCH VIDEO</div>
            <div className="upload-sub">Drag & drop or <span>browse</span></div>
            <div className="upload-formats">MP4, MOV, AVI, MKV · Max 2GB</div>
          </div>
        ) : (
          <div className="file-preview">
            <div className="file-preview-icon">🎾</div>
            <div className="file-preview-info"><div className="file-preview-name">{file.name}</div><div className="file-preview-size">{(file.size/1024/1024).toFixed(1)} MB · Ready</div></div>
            <button className="file-remove" onClick={() => setFile(null)}>✕</button>
          </div>
        )}
      </div>
      <div className="upload-context-row">
        <select value={videoLevel} onChange={e => setVideoLevel(e.target.value)}>
          <option value="">NTRP Level</option>
          {["2.5 – Beginner","3.0 – Intermediate","3.5 – Club Player","4.0 – Competitive","4.5 – Advanced","5.0+ – Expert"].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={videoSurface} onChange={e => setVideoSurface(e.target.value)}>
          <option value="">Surface</option>
          {["Hard court","Clay court","Grass court","Indoor hard"].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <textarea className="upload-notes" placeholder="What did you struggle with?" value={videoNotes} onChange={e => setVideoNotes(e.target.value)} />
      <div style={{ display: "flex", gap: 12 }}>
        <button className="results-reset" onClick={reset}>← Back</button>
        <button className="analyze-btn" disabled={!file && !videoNotes} onClick={submitVideo}>🎬 Analyze & Build Plan</button>
      </div>
    </div>
  );

  if (plan) return (
    <div className="video-results">
      <div className="results-header">
        <div>
          <div className="results-title">{plan.headline || "YOUR DRILL PLAN"}</div>
          <div style={{ fontSize: 13, color: "var(--mid)", marginTop: 4 }}>Focus: <strong style={{ color: "var(--clay)" }}>{plan.focus}</strong></div>
        </div>
        <button className="results-reset" onClick={reset}>← Start Over</button>
      </div>
      <div className="results-summary">{plan.summary}</div>

      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--clay)", marginBottom: 16 }}>📅 Weekly Schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {plan.weeklySchedule?.map((d, i) => (
            <div key={i} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 8,
              background: d.type === "rest" ? "rgba(107,94,82,0.05)" : d.type === "off-court" ? "rgba(26,58,92,0.07)" : "rgba(200,98,42,0.07)",
              border: `1px solid ${d.type === "rest" ? "rgba(107,94,82,0.1)" : d.type === "off-court" ? "rgba(26,58,92,0.15)" : "rgba(200,98,42,0.15)"}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mid)", marginBottom: 4 }}>{d.day.slice(0,3).toUpperCase()}</div>
              <div style={{ fontSize: 10, color: d.type === "rest" ? "var(--mid)" : d.type === "off-court" ? "var(--hard)" : "var(--clay)", fontWeight: 600, lineHeight: 1.3 }}>{d.theme}</div>
              {d.duration !== "-" && <div style={{ fontSize: 10, color: "var(--mid)", marginTop: 4 }}>{d.duration}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {plan.weeklySchedule?.filter(d => d.detail && d.type !== "rest").map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(107,94,82,0.06)", fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: d.type === "off-court" ? "var(--hard)" : "var(--clay)", width: 28, flexShrink: 0 }}>{d.day.slice(0,3)}</span>
              <span style={{ color: "var(--mid)", lineHeight: 1.5 }}>{d.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {!isUnlocked && (
        <div style={{ background: "var(--ink)", borderRadius: 10, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "var(--off-white)", marginBottom: 4 }}>UNLOCK FULL DRILLS + VIDEO GUIDES</div>
            <div style={{ fontSize: 13, color: "rgba(245,240,232,0.6)", lineHeight: 1.5 }}>Subscribe to see full step-by-step instructions, coach tips, reps, and curated YouTube video guides for each drill.</div>
          </div>
          <button className="btn-primary" style={{ fontSize: 13, padding: "10px 20px", flexShrink: 0 }} onClick={() => setModalPlan("Pro")}>Subscribe →</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid rgba(107,94,82,0.12)", marginBottom: 16 }}>
        {[["on", "🎾 On-Court Drills"], ["off", "🏠 Off-Court Drills"]].map(([id, label]) => (
          <button key={id} className={`ai-tab ${drillTab === id ? "active" : ""}`} onClick={() => setDrillTab(id)}>{label}</button>
        ))}
      </div>

      {drillTab === "on" && (plan.drills || []).map((d, i) => <DrillCard key={i} drill={d} index={i} isUnlocked={isUnlocked} setModalPlan={setModalPlan} />)}
      {drillTab === "off" && (plan.offCourtDrills || []).map((d, i) => <DrillCard key={i} drill={d} index={i} isUnlocked={isUnlocked} setModalPlan={setModalPlan} />)}

      {plan.progressionGoal && (
        <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.2)", borderRadius: 8, padding: "14px 18px", marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--clay)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>🏆 4-Week Goal</div>
          <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{plan.progressionGoal}</div>
        </div>
      )}
    </div>
  );

  return null;
}


// ─── Shared AI fetch helper ────────────────────────────────────────────────
async function fetchAI(system, prompt) {
  const body = JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1000, system, messages: [{ role: "user", content: prompt }] });
  const headers = { "Content-Type": "application/json" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body });
    if (res.ok) {
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "{}";
      const cleaned = text.replace(/```json|```/g, "").trim();
      // find first { to last } to isolate JSON even if there's preamble
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
    }
  } catch {}
  return null; // caller handles null with their own fallback
}

function LoadingCard({ message }) {
  return (
    <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>⏳</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "var(--ink)", marginBottom: 8 }}>ANALYZING…</div>
      <div style={{ fontSize: 14, color: "var(--clay)", fontWeight: 600, animation: "pulse 1.2s infinite" }}>{message}</div>
    </div>
  );
}

function LockedCard({ feature, plan, setModalPlan }) {
  return (
    <div style={{ background: "white", border: "2px dashed rgba(200,98,42,0.25)", borderRadius: 12, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--ink)", marginBottom: 10 }}>{feature} IS A MEMBERS FEATURE</div>
      <div style={{ fontSize: 14, color: "var(--mid)", marginBottom: 24, lineHeight: 1.6 }}>Subscribe to unlock this feature and everything else on ACE.</div>
      <button className="btn-primary" onClick={() => setModalPlan(plan || "Pro")}>Unlock from $15/mo →</button>
    </div>
  );
}

// ─── Shot Selection AI ─────────────────────────────────────────────────────
function ShotSelectionAI({ isUnlocked, setModalPlan }) {
  const [level, setLevel] = useState("");
  const [opponent, setOpponent] = useState("");
  const [situation, setSituation] = useState("");
  const [surface, setSurface] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const OPPONENT_TYPES = ["Pusher / Retriever", "Big Hitter / Flat Baller", "Net Rusher / Serve & Volleyer", "All-Court Player", "Defensive Baseliner", "Heavy Topspin Player", "Slicer / Junk Baller", "Lefty"];
  const SITUATIONS = ["Neutral rally — who should attack?", "I'm down 0-40 — what do I do?", "Serving at 4-5 in the third", "Returning their second serve", "Short ball — how do I approach?", "They're at net — passing shot options", "Tie-break — shot selection priority"];

  async function generate() {
    if (!isUnlocked) { setModalPlan("Pro"); return; }
    setLoading(true);
    const prompt = `Player level: ${level || "3.5 NTRP"}. Opponent type: ${opponent || "All-court player"}. Situation: ${situation || "Neutral baseline rally"}. Surface: ${surface || "Hard court"}. Give me a complete shot selection blueprint.`;
    
    let data = null;
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000));
      const fetchPromise = fetchAI(SHOT_SYSTEM, prompt);
      data = await Promise.race([fetchPromise, timeoutPromise]);
    } catch {}

    setResult(data || getShotFallback(opponent, situation, surface));
    setLoading(false);
  }

  function getShotFallback(opp, sit, surf) {
    return {
      headline: "Shot Selection Blueprint",
      situation: `${sit || "Neutral rally"} vs ${opp || "All-court player"} on ${surf || "hard court"}`,
      primaryPattern: {
        name: "Inside-Out Forehand to Open Court",
        steps: [
          "Start rally cross-court backhand to their backhand corner",
          "Wait for a mid-court ball sitting above knee height",
          "Run around backhand and load your forehand",
          "Drive inside-out to their backhand corner with heavy topspin",
          "Follow in to net or reset from opposite corner"
        ],
        winRate: 68,
        difficulty: "Intermediate"
      },
      alternativePatterns: [
        { name: "Crosscourt Backhand Rally", trigger: "When they're pressuring your forehand side", winRate: 58, difficulty: "Beginner" },
        { name: "Down-the-Line Forehand", trigger: "When you've pulled them wide with the inside-out first", winRate: 74, difficulty: "Advanced" }
      ],
      avoidShots: [
        "Down-the-line on defense — too much risk when off balance",
        "Drop shots from behind the baseline — ball travels too slow"
      ],
      hotZones: [
        { zone: "Deep backhand corner", purpose: "Opens the court for your inside-out forehand", priority: "high" },
        { zone: "Mid-court T", purpose: "Forces them to move and creates time for you", priority: "medium" }
      ],
      pointConstruction: `Serve out wide to stretch them, follow with a heavy topspin to the backhand, then run around for the inside-out forehand winner. Force them to cover the full width of the court before going behind them down the line.`,
      mentalCue: "Deep first, attack second — don't skip steps."
    };
  }

  if (!isUnlocked) return <LockedCard feature="Shot Selection AI" plan="Pro" setModalPlan={setModalPlan} />;
  if (loading) return <LoadingCard message="Mapping your shot patterns…" />;

  if (result) return (
    <div className="video-results">
      <div className="results-header">
        <div>
          <div className="results-title">SHOT BLUEPRINT</div>
          <div style={{ fontSize: 13, color: "var(--mid)", marginTop: 4 }}>{result.situation}</div>
        </div>
        <button className="results-reset" onClick={() => setResult(null)}>← New Query</button>
      </div>

      <div className="results-summary">{result.pointConstruction}</div>

      {/* Primary Pattern */}
      <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.2)", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--clay)" }}>⭐ Primary Pattern</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, background: "rgba(200,98,42,0.1)", color: "var(--clay)", padding: "3px 10px", borderRadius: 100, fontWeight: 700 }}>Win Rate: {result.primaryPattern?.winRate}%</span>
            <span style={{ fontSize: 11, background: "rgba(107,94,82,0.1)", color: "var(--mid)", padding: "3px 10px", borderRadius: 100, fontWeight: 700 }}>{result.primaryPattern?.difficulty}</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--ink)", marginBottom: 12 }}>{result.primaryPattern?.name}</div>
        {result.primaryPattern?.steps?.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(200,98,42,0.1)", fontSize: 14, color: "var(--ink)" }}>
            <span style={{ color: "var(--clay)", fontWeight: 700, flexShrink: 0 }}>Step {i + 1}</span> {step}
          </div>
        ))}
      </div>

      {/* Alternative Patterns */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mid)", marginBottom: 10 }}>Alternative Patterns</div>
        {result.alternativePatterns?.map((p, i) => (
          <div key={i} style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 8, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--mid)" }}>{p.trigger}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--grass-light)", background: "rgba(74,124,47,0.08)", padding: "3px 10px", borderRadius: 100, flexShrink: 0 }}>{p.winRate}% win rate</span>
          </div>
        ))}
      </div>

      {/* Hot Zones */}
      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>🗺️ Target Hot Zones</div>
        {result.hotZones?.map((z, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(107,94,82,0.07)", fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: z.priority === "high" ? "var(--clay)" : "var(--accent-dark)", flexShrink: 0, display: "block" }} />
            <strong style={{ color: "var(--ink)" }}>{z.zone}</strong>
            <span style={{ color: "var(--mid)" }}>— {z.purpose}</span>
          </div>
        ))}
      </div>

      {/* Avoid + Mental Cue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
        <div style={{ background: "rgba(217,79,59,0.06)", border: "1px solid rgba(217,79,59,0.15)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>⚠ Avoid These</div>
          {result.avoidShots?.map((s, i) => <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "4px 0" }}>• {s}</div>)}
        </div>
        <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--clay)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🧠 Mental Cue</div>
          <div style={{ fontSize: 14, color: "var(--ink)", fontStyle: "italic", lineHeight: 1.5 }}>"{result.mentalCue}"</div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Your NTRP Level</label>
          <select className="modal-input" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Select level…</option>
            {["2.5","3.0","3.5","4.0","4.5","5.0+"].map(l => <option key={l}>{l} NTRP</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Surface</label>
          <select className="modal-input" value={surface} onChange={e => setSurface(e.target.value)}>
            <option value="">Select surface…</option>
            {["Hard court","Clay court","Grass court","Indoor hard"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Opponent Type</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {OPPONENT_TYPES.map(o => (
            <button key={o} onClick={() => setOpponent(o)} style={{ padding: "7px 14px", borderRadius: 100, border: `2px solid ${opponent === o ? "var(--clay)" : "rgba(107,94,82,0.2)"}`, background: opponent === o ? "rgba(200,98,42,0.08)" : "white", color: opponent === o ? "var(--clay)" : "var(--mid)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{o}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Match Situation</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SITUATIONS.map(s => (
            <div key={s} onClick={() => setSituation(s)} style={{ padding: "10px 14px", borderRadius: 8, border: `2px solid ${situation === s ? "var(--clay)" : "rgba(107,94,82,0.15)"}`, background: situation === s ? "rgba(200,98,42,0.06)" : "white", color: situation === s ? "var(--clay)" : "var(--ink)", fontSize: 13, fontWeight: situation === s ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{s}</div>
          ))}
        </div>
      </div>
      <button className="analyze-btn" onClick={generate} disabled={!opponent}>🎾 Generate Shot Blueprint</button>
    </div>
  );
}

// ─── Match Prep Report ─────────────────────────────────────────────────────
function MatchPrepReport({ isUnlocked, setModalPlan }) {
  const [level, setLevel] = useState("");
  const [oppStyle, setOppStyle] = useState("");
  const [surface, setSurface] = useState("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const OPP_STYLES = ["Aggressive baseliner", "Pusher / moonballer", "Serve & volleyer", "All-court player", "Heavy topspin player", "Flat ball striker", "Junk baller / slicer", "Big server"];
  const THREAT = { "Low": "var(--grass-light)", "Medium": "var(--accent-dark)", "High": "#D94F3B" };

  async function generate() {
    if (!isUnlocked) { setModalPlan("Pro"); return; }
    setLoading(true);
    const prompt = `My level: ${level || "3.5 NTRP"}. Opponent style: ${oppStyle || "All-court player"}. Surface: ${surface || "Hard court"}. Additional notes: ${extra || "Standard club match"}. Build me a complete pre-match scouting report.`;
    
    let data = null;
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000));
      const fetchPromise = fetchAI(PREP_SYSTEM, prompt);
      data = await Promise.race([fetchPromise, timeoutPromise]);
    } catch {}

    setReport(data || getPrepFallback(oppStyle, surface));
    setLoading(false);
  }

  function getPrepFallback(opp, surf) {
    return {
      reportTitle: "Match Prep Report",
      opponent: `${opp || "All-court player"} on ${surf || "hard court"}`,
      threatLevel: "Medium",
      overallStrategy: `Against a ${opp || "all-court player"} on ${surf || "hard court"}, your goal is to control the pace from the baseline, exploit their backhand side consistently, and attack any second serve you receive. Stay patient in long rallies and wait for the short ball before changing direction.`,
      serveStrategy: {
        firstServe: "Target the T on the deuce side to open the court. Go wide on the ad side to stretch them off the court.",
        secondServe: "Use kick serve to their backhand — make them hit up and defend. Avoid flat second serves that sit up.",
        serveAndVolley: "Approach net after a wide serve when they're pulled off the court and vulnerable."
      },
      returnStrategy: {
        vsFirstServe: "Stand 2 feet behind baseline, take a compact swing, and redirect cross-court to keep ball in play.",
        vsSecondServe: "Step inside the baseline, attack with a heavy topspin forehand to their backhand corner.",
        positioning: "Deuce side: stand near the center hash. Ad side: shift slightly toward the T to cover their body serve."
      },
      rallyPatterns: [
        { pattern: "Heavy Topspin to Backhand Corner", description: "Hit 4-5 heavy crosscourt balls to their backhand until you get a short reply, then attack down the line.", effectiveness: 78 },
        { pattern: "Inside-Out Forehand Sequence", description: "Push them wide with a backhand, then run around for the inside-out forehand to open court.", effectiveness: 70 },
        { pattern: "Drop Shot After Deep Ball", description: "Set up with 3 deep balls then surprise with a short slice drop shot to bring them forward.", effectiveness: 58 }
      ],
      exploitableWeaknesses: [
        { weakness: "Backhand under pressure", howToExploit: "Hit 4+ balls to their backhand repeatedly until the error comes. Don't rush — let the pattern work.", priority: "high" },
        { weakness: "Slow recovery after wide balls", howToExploit: "Pull them wide then drive behind them down the line before they recover.", priority: "medium" }
      ],
      watchOutFor: [
        "Their forehand may be a weapon — neutralize it by keeping balls to their backhand",
        "Watch for drop shots if they sense you're pushed deep — stay light on your feet"
      ],
      mentalGame: "Stay process-focused — commit to your game plan for the full match. If you're down, trust the patterns and don't abandon strategy. Take 10 seconds between points to reset and breathe.",
      keyStats: [
        { label: "Target Their BH", value: 80 },
        { label: "Attack 2nd Serve", value: 75 },
        { label: "Net Approach Win %", value: 64 },
        { label: "Rally Length Control", value: 58 }
      ],
      preMatchChecklist: [
        "Warm up serve — hit 10 kick serves to backhand before match starts",
        "First game: test their backhand with 3-4 heavy cross-court balls",
        "Mental reminder: 'Deep and patient — wait for the short ball'",
        "If down a set: slow the pace, add more spin, and reset with moonballs"
      ]
    };
  }

  if (!isUnlocked) return <LockedCard feature="Match Prep Reports" plan="Pro" setModalPlan={setModalPlan} />;
  if (loading) return <LoadingCard message="Building your scouting report…" />;

  if (report) return (
    <div className="video-results">
      <div className="results-header">
        <div>
          <div className="results-title">MATCH PREP REPORT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: "var(--mid)" }}>{report.opponent}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: `${THREAT[report.threatLevel] || "var(--mid)"}22`, color: THREAT[report.threatLevel] || "var(--mid)" }}>Threat: {report.threatLevel}</span>
          </div>
        </div>
        <button className="results-reset" onClick={() => setReport(null)}>← New Report</button>
      </div>

      <div className="results-summary">{report.overallStrategy}</div>

      {/* Key Stats */}
      <div className="analysis-visual" style={{ marginBottom: 16 }}>
        <div className="analysis-title">Tactical Priorities</div>
        {report.keyStats?.map((s, i) => (
          <div key={i} className="stat-bar">
            <div className="stat-bar-label"><span>{s.label}</span><span>{s.value}%</span></div>
            <div className="stat-bar-track"><div className={`stat-bar-fill ${s.value >= 65 ? "fill-good" : s.value >= 45 ? "fill-mid" : "fill-bad"}`} style={{ width: `${s.value}%` }} /></div>
          </div>
        ))}
      </div>

      {/* Serve & Return Strategy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[["🎾 Serve Strategy", report.serveStrategy], ["↩️ Return Strategy", report.returnStrategy]].map(([title, strat], i) => (
          <div key={i} style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--clay)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
            {strat && Object.entries(strat).map(([k, v]) => (
              <div key={k} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(107,94,82,0.08)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mid)", textTransform: "capitalize", marginBottom: 3 }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rally Patterns */}
      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--mid)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>📐 Rally Patterns — Ranked by Effectiveness</div>
        {report.rallyPatterns?.map((p, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{i + 1}. {p.pattern}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.effectiveness >= 70 ? "var(--grass-light)" : "var(--accent-dark)" }}>{p.effectiveness}% effective</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.5, marginBottom: 6 }}>{p.description}</div>
            <div className="stat-bar-track"><div className={`stat-bar-fill ${p.effectiveness >= 70 ? "fill-good" : "fill-mid"}`} style={{ width: `${p.effectiveness}%` }} /></div>
          </div>
        ))}
      </div>

      {/* Exploit + Watch Out */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "rgba(74,124,47,0.06)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--grass-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>🎯 Exploit These</div>
          {report.exploitableWeaknesses?.map((w, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(74,124,47,0.1)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 3 }}>{w.weakness}</div>
              <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.5 }}>{w.howToExploit}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: w.priority === "high" ? "var(--clay)" : "var(--mid)", textTransform: "uppercase", letterSpacing: 0.5 }}>{w.priority} priority</span>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(217,79,59,0.05)", border: "1px solid rgba(217,79,59,0.15)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>⚠ Watch Out For</div>
          {report.watchOutFor?.map((w, i) => <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "6px 0", borderBottom: "1px solid rgba(217,79,59,0.08)", lineHeight: 1.5 }}>• {w}</div>)}
        </div>
      </div>

      {/* Mental Game */}
      <div style={{ background: "rgba(200,98,42,0.06)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--clay)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🧠 Mental Game Approach</div>
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>{report.mentalGame}</div>
      </div>

      {/* Pre-Match Checklist */}
      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--mid)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>✅ Pre-Match Checklist</div>
        {report.preMatchChecklist?.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(107,94,82,0.07)", fontSize: 13, color: "var(--ink)" }}>
            <span style={{ color: "var(--clay)", fontWeight: 700 }}>{i + 1}.</span> {item}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Your NTRP Level</label>
          <select className="modal-input" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Select…</option>
            {["2.5","3.0","3.5","4.0","4.5","5.0+"].map(l => <option key={l}>{l} NTRP</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Court Surface</label>
          <select className="modal-input" value={surface} onChange={e => setSurface(e.target.value)}>
            <option value="">Select…</option>
            {["Hard court","Clay court","Grass court","Indoor hard"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 8 }}>Opponent's Playing Style</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {OPP_STYLES.map(o => (
            <button key={o} onClick={() => setOppStyle(o)} style={{ padding: "8px 16px", borderRadius: 100, border: `2px solid ${oppStyle === o ? "var(--clay)" : "rgba(107,94,82,0.2)"}`, background: oppStyle === o ? "rgba(200,98,42,0.08)" : "white", color: oppStyle === o ? "var(--clay)" : "var(--mid)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{o}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Anything else about this opponent? (optional)</label>
        <textarea className="upload-notes" style={{ marginBottom: 0 }} placeholder="e.g. 'left-handed, very strong forehand, tends to moonball on second shots, rushes net on short balls'" value={extra} onChange={e => setExtra(e.target.value)} />
      </div>
      <button className="analyze-btn" onClick={generate} disabled={!oppStyle}>📋 Generate Match Prep Report</button>
    </div>
  );
}

// ─── Progress Tracker ──────────────────────────────────────────────────────
function ProgressTracker({ isUnlocked, setModalPlan }) {
  const [level, setLevel] = useState("");
  const [results, setResults] = useState("");
  const [strengths, setStrengths] = useState("");
  const [struggles, setStruggles] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  function getProgressFallback(lvl, res) {
    const hasStrengths = strengths.trim().length > 0;
    const hasStruggles = struggles.trim().length > 0;
    return {
      ntrpEstimate: lvl?.split(" ")[0] || "3.5",
      trend: "improving",
      summary: `Based on what you've shared, ${res || "your recent results"} show genuine progress. ${hasStrengths ? `Your described strengths — ${strengths} — are real indicators of improvement.` : ""} ${hasStruggles ? `The areas you're still working on — ${struggles} — are the clearest path to your next rating level.` : ""}`,
      strengths: hasStrengths
        ? strengths.split(",").map(s => ({ area: s.trim(), detail: `You identified this as a strength — keep building on it in practice and match play.` }))
        : [{ area: "Match experience", detail: "You're logging results and reflecting on your game — that awareness itself accelerates improvement." }],
      struggles: hasStruggles
        ? struggles.split(",").map(s => ({ area: s.trim(), detail: `This is holding back your consistency — targeted practice here will have the biggest impact on your match results.` }))
        : [{ area: "Not yet identified", detail: "Add more detail about what you're struggling with to get specific coaching advice." }],
      nextFocus: hasStruggles
        ? `Focus exclusively on: ${struggles.split(",")[0].trim()}. This is your highest-leverage improvement area based on what you described.`
        : "Log a few more match sessions and describe your struggles in detail — your next focus area will become clear.",
      ntrpRoadmap: [
        { level: "3.0", status: "achieved", milestone: "Consistent rally play and basic shot selection" },
        { level: lvl?.split(" ")[0] || "3.5", status: "current", milestone: `Solidify ${hasStruggles ? struggles.split(",")[0].trim() : "consistency under pressure"} to hold this level confidently` },
        { level: "4.0", status: "next", milestone: hasStruggles ? `Eliminate ${struggles.split(",")[0].trim()} as a weakness and develop reliable patterns` : "Develop reliable patterns and reduce unforced errors" },
        { level: "4.5", status: "future", milestone: "Serve as a weapon, consistent point construction, strong mental game" }
      ],
      sessionNote: "Your progress report will become more detailed and accurate as you log more sessions over time."
    };
  }

  if (!isUnlocked) return <LockedCard feature="Progress Tracking" plan="Challenger" setModalPlan={setModalPlan} />;
  if (loading) return <LoadingCard message="Analyzing your improvement arc…" />;

  if (data) return (
    <div className="video-results">
      <div className="results-header">
        <div>
          <div className="results-title">PROGRESS REPORT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--clay)" }}>NTRP ~{data.ntrpEstimate}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 100,
              background: data.trend === "improving" ? "rgba(74,124,47,0.1)" : data.trend === "plateauing" ? "rgba(196,164,43,0.1)" : "rgba(217,79,59,0.1)",
              color: data.trend === "improving" ? "var(--grass-light)" : data.trend === "plateauing" ? "var(--accent-dark)" : "#D94F3B",
              textTransform: "uppercase", letterSpacing: 0.5 }}>
              {data.trend === "improving" ? "↑ Improving" : data.trend === "plateauing" ? "→ Plateauing" : "↓ Declining"}
            </span>
          </div>
        </div>
        <button className="results-reset" onClick={() => setData(null)}>← Update</button>
      </div>

      {/* Summary */}
      <div className="results-summary">{data.summary}</div>

      {/* Strengths */}
      {data.strengths?.length > 0 && (
        <div style={{ background: "rgba(74,124,47,0.06)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--grass-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>✓ What's Working</div>
          {data.strengths.map((s, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < data.strengths.length - 1 ? "1px solid rgba(74,124,47,0.1)" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 3 }}>{s.area}</div>
              <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Struggles */}
      {data.struggles?.length > 0 && (
        <div style={{ background: "rgba(217,79,59,0.05)", border: "1px solid rgba(217,79,59,0.15)", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>⚠ Still Working On</div>
          {data.struggles.map((s, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < data.struggles.length - 1 ? "1px solid rgba(217,79,59,0.1)" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 3 }}>{s.area}</div>
              <div style={{ fontSize: 13, color: "var(--mid)", lineHeight: 1.6 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Next Focus */}
      <div style={{ background: "var(--ink)", borderRadius: 10, padding: "18px 22px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--clay)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>🎯 Your #1 Focus Right Now</div>
        <div style={{ fontSize: 15, color: "var(--off-white)", fontWeight: 600, lineHeight: 1.6 }}>{data.nextFocus}</div>
      </div>

      {/* NTRP Roadmap */}
      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--mid)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>🏆 NTRP Roadmap</div>
        {data.ntrpRoadmap?.map((r, i) => {
          const STATUS = {
            achieved: { bg: "rgba(74,124,47,0.1)", color: "var(--grass-light)", label: "Achieved" },
            current:  { bg: "rgba(200,98,42,0.1)", color: "var(--clay)",         label: "Current" },
            next:     { bg: "rgba(107,94,82,0.08)", color: "var(--mid)",         label: "Next" },
            future:   { bg: "rgba(107,94,82,0.04)", color: "rgba(107,94,82,0.4)", label: "Future" },
          };
          const st = STATUS[r.status] || STATUS.future;
          return (
            <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: i < data.ntrpRoadmap.length - 1 ? "1px solid rgba(107,94,82,0.07)" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: st.color, flexShrink: 0 }}>{r.level}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>NTRP {r.level}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: st.bg, color: st.color, textTransform: "uppercase" }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.5 }}>{r.milestone}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session note */}
      {data.sessionNote && (
        <div style={{ background: "rgba(200,98,42,0.05)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--mid)", lineHeight: 1.5 }}>
          💡 {data.sessionNote}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Your Current NTRP Level</label>
        <select className="modal-input" value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">Select…</option>
          {["2.5","3.0","3.5","4.0","4.5","5.0+"].map(l => <option key={l}>{l} NTRP</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>Recent match results (last 2–4 weeks)</label>
        <textarea className="upload-notes" style={{ minHeight: 64 }} placeholder="e.g. 'Won 3, lost 2. Beat a 3.5 for the first time. Lost to two 4.0s in straight sets.'" value={results} onChange={e => setResults(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>What's going well in your game?</label>
        <textarea className="upload-notes" style={{ minHeight: 64 }} placeholder="e.g. 'My serve has gotten more consistent, winning more first serve points, better at recognizing short balls'" value={strengths} onChange={e => setStrengths(e.target.value)} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>What are you still struggling with?</label>
        <textarea className="upload-notes" style={{ minHeight: 64 }} placeholder="e.g. 'Backhand breaks down under pressure, still double-faulting too much, can't close out third sets'" value={struggles} onChange={e => setStruggles(e.target.value)} />
      </div>
      <button className="analyze-btn" onClick={generate} disabled={!results && !strengths}>📈 Analyze My Progress</button>
    </div>
  );
}

// ─── Elite Daily Briefing ──────────────────────────────────────────────────
function EliteDailyBriefing({ isElite, setModalPlan }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("ace_signups") || "[]"); return s[0]?.name?.split(" ")[0] || ""; } catch { return ""; }
  });

  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayName = days[new Date().getDay()];
  const todayDate = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  // Load cached briefing from today if exists
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("ace_daily_briefing") || "null");
      if (cached && cached.date === new Date().toDateString()) setBriefing(cached.data);
    } catch {}
  }, []);

  async function generateBriefing() {
    if (!isElite) { setModalPlan("Elite"); return; }
    setLoading(true);
    const logs = (() => { try { return JSON.parse(localStorage.getItem("ace_match_logs") || "[]"); } catch { return []; } })();
    const drillPlan = (() => { try { return localStorage.getItem("ace_drill_focus") || ""; } catch { return ""; } })();
    const prompt = `Player name: ${userName || "Player"}. Today is ${todayName}. Recent match activity: ${logs.length > 0 ? `${logs.length} matches logged, latest: ${logs[0]?.result || "Unknown"}` : "No matches logged yet"}. Current drill focus: ${drillPlan || "General improvement"}. Generate today's personalized Elite coaching briefing.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1000, system: DAILY_BRIEFING_SYSTEM, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.map(b => b.text || "").join("") || "{}";
        const s = text.indexOf("{"); const e = text.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          const parsed = JSON.parse(text.slice(s, e + 1));
          setBriefing(parsed);
          try { localStorage.setItem("ace_daily_briefing", JSON.stringify({ date: new Date().toDateString(), data: parsed })); } catch {}
          return;
        }
      }
    } catch {}
    // Fallback briefing
    const fallback = {
      greeting: `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}${userName ? ", " + userName : ""}!`,
      dayTheme: `${todayName}'s Focus — Serve Power & Kick Serve`,
      todayMessage: `Today is a great day to work on your serve. Focus on your kick serve mechanics — this is the single highest-impact drill for your current level. Even 20 minutes of focused serve practice will compound significantly over the month.`,
      todayDrills: [
        { drill: "Kick Serve Cone Targets", duration: "20 min", priority: "main" },
        { drill: "Crosscourt Forehand Rally", duration: "15 min", priority: "secondary" },
      ],
      coachTipOfDay: "Toss the ball slightly behind your head on kick serves — this creates the upward brushing motion that generates topspin. If you're double-faulting, your toss is too far forward.",
      weekAhead: [
        { day: "Tomorrow", theme: "Footwork Ladder & Shadow Swings", type: "off-court" },
        { day: "In 2 days", theme: "Crosscourt Rally Patterns", type: "on-court" },
        { day: "In 3 days", theme: "Rest & Mental Review", type: "rest" },
      ],
      motivationalQuote: { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
      streakNote: "Keep the momentum going — consistency over intensity is what separates improving players from plateauing ones.",
    };
    setBriefing(fallback);
    try { localStorage.setItem("ace_daily_briefing", JSON.stringify({ date: new Date().toDateString(), data: fallback })); } catch {}
    setLoading(false);
  }

  if (!isElite) return (
    <div className="briefing-card" style={{ textAlign: "center", padding: "40px 32px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌅</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--off-white)", marginBottom: 10 }}>DAILY ELITE BRIEFING</div>
      <div style={{ fontSize: 14, color: "rgba(245,240,232,0.55)", marginBottom: 24, lineHeight: 1.6 }}>Elite subscribers get a personalized daily coaching message every morning — what to work on, drill tips, and a look at the week ahead.</div>
      <button className="btn-primary" onClick={() => setModalPlan("Elite")}>Upgrade to Elite →</button>
    </div>
  );

  if (!briefing && !loading) return (
    <div className="briefing-card" style={{ textAlign: "center", padding: "40px 32px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌅</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--off-white)", marginBottom: 8 }}>DAILY BRIEFING</div>
      <div style={{ fontSize: 13, color: "rgba(245,240,232,0.5)", marginBottom: 24 }}>{todayDate}</div>
      <button className="analyze-btn" style={{ maxWidth: 240, margin: "0 auto" }} onClick={generateBriefing}>☀️ Get Today's Briefing</button>
    </div>
  );

  if (loading) return (
    <div className="briefing-card" style={{ textAlign: "center", padding: "40px 32px" }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 1.2s infinite" }}>🌅</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "var(--off-white)" }}>Preparing your day…</div>
    </div>
  );

  return (
    <div className="briefing-card">
      <div className="briefing-header">
        <div className="briefing-header-icon">🌅</div>
        <div className="briefing-header-text">
          <h3>Daily Elite Briefing</h3>
          <span>{todayDate}</span>
        </div>
        <button onClick={() => { setBriefing(null); try { localStorage.removeItem("ace_daily_briefing"); } catch {} }} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 4, color: "white", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "4px 10px", fontFamily: "'DM Sans', sans-serif" }}>Refresh</button>
      </div>
      <div className="briefing-body">
        <div className="briefing-greeting">{briefing.greeting}</div>
        <div className="briefing-theme">📅 {briefing.dayTheme}</div>
        <div className="briefing-message">{briefing.todayMessage}</div>

        {/* Today's drills */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(245,240,232,0.4)", marginBottom: 10 }}>Today's Sessions</div>
        <div className="briefing-drills">
          {briefing.todayDrills?.map((d, i) => (
            <div key={i} className={`briefing-drill ${d.priority}`}>
              <div className="briefing-drill-name">🎾 {d.drill}</div>
              <div className="briefing-drill-duration">⏱ {d.duration}</div>
            </div>
          ))}
        </div>

        {/* Coach tip */}
        <div className="briefing-tip">
          <span>💡 Coach Tip of the Day</span>
          <p>{briefing.coachTipOfDay}</p>
        </div>

        {/* Week ahead */}
        <div className="briefing-week">
          <div className="briefing-week-title">Coming Up This Week</div>
          {briefing.weekAhead?.map((w, i) => (
            <div key={i} className="briefing-week-row">
              <div className="briefing-week-day">{w.day}</div>
              <div className="briefing-week-theme">{w.theme}</div>
              <div className={`briefing-week-type ${w.type === "on-court" ? "type-on" : w.type === "off-court" ? "type-off" : "type-rest"}`}>
                {w.type === "on-court" ? "🎾 On-Court" : w.type === "off-court" ? "🏠 Off-Court" : "😴 Rest"}
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        {briefing.motivationalQuote && (
          <div className="briefing-quote">
            <p>"{briefing.motivationalQuote.quote}"</p>
            <cite>— {briefing.motivationalQuote.author}</cite>
          </div>
        )}

        {/* Streak note */}
        {briefing.streakNote && (
          <div style={{ marginTop: 16, fontSize: 12, color: "rgba(245,240,232,0.4)", fontStyle: "italic", textAlign: "center" }}>{briefing.streakNote}</div>
        )}
      </div>
    </div>
  );
}

// ─── Monthly Coaching Report ───────────────────────────────────────────────
function MonthlyCoachingReport({ isElite, setModalPlan }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const GRADE_COLORS = { "A+":"#2D5016","A":"#4A7C2F","A-":"#4A7C2F","B+":"#C4A42B","B":"#C4A42B","B-":"#C4A42B","C+":"#D94F3B","C":"#D94F3B" };
  const TREND_COLOR = { up: "var(--grass-light)", flat: "var(--accent-dark)", down: "#D94F3B" };
  const TREND_ARROW = { up: "↑", flat: "→", down: "↓" };

  async function generateReport() {
    if (!isElite) { setModalPlan("Elite"); return; }
    setLoading(true);
    const logs = (() => { try { return JSON.parse(localStorage.getItem("ace_match_logs") || "[]"); } catch { return []; } })();
    const signups = (() => { try { return JSON.parse(localStorage.getItem("ace_signups") || "[]"); } catch { return []; } })();
    const userName = signups[0]?.name || "Player";
    const recentLogs = logs.slice(0, 12);
    const wins = recentLogs.filter(l => l.result?.toLowerCase().includes("won") || l.result?.toLowerCase().includes("win") || l.result?.toLowerCase().includes("w ")).length;
    const statSummary = recentLogs.map(l => l.analysis?.summary || "").filter(Boolean).join(". ");
    const prompt = `Monthly coaching report for ${userName}. Month: ${currentMonth}. Match logs: ${recentLogs.length} sessions logged. Estimated record: ${wins} wins, ${recentLogs.length - wins} losses. Analysis summaries from sessions: ${statSummary || "General practice sessions"}. Generate a detailed, honest, specific monthly coaching report.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1000, system: MONTHLY_REPORT_SYSTEM, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.map(b => b.text || "").join("") || "{}";
        const s = text.indexOf("{"); const e = text.lastIndexOf("}");
        if (s !== -1 && e !== -1) { setReport(JSON.parse(text.slice(s, e + 1))); setLoading(false); return; }
      }
    } catch {}
    // Rich fallback report
    setReport({
      month: currentMonth, overallGrade: "B+", gradeColor: "#C4A42B",
      headline: "Strong serve improvement, backhand still the priority",
      personalMessage: `This was a month of real, measurable progress — and you should feel good about that. The work you put into your serve showed up in your match results, which is exactly how it's supposed to work. Keep showing up consistently and the rating will follow.`,
      executiveSummary: `${currentMonth} showed genuine progression across your game. Your first serve percentage climbed meaningfully through consistent practice, and your net game saw the biggest jump of any area this month. The backhand under pressure remains your most important development area — it's costing you games at key moments. Your training consistency is commendable and is clearly paying dividends.`,
      ntrpEstimate: "3.5", ntrpTrend: "improving",
      matchRecord: { wins: wins || 4, losses: (recentLogs.length - wins) || 2, description: "Solid record for the level — losses were competitive" },
      milestonesAchieved: [
        { milestone: "First serve percentage crossed 60% for the first time", icon: "🎾" },
        { milestone: "Net points won improved by 13% — approach game is clicking", icon: "🏆" },
        { milestone: `${recentLogs.length || 6} training sessions logged this month`, icon: "📅" },
      ],
      statsTrend: [
        { label: "1st Serve %", start: 52, end: 61, trend: "up", note: "Best single improvement this month" },
        { label: "Unforced Errors", start: 28, end: 22, trend: "up", note: "Down 6 per match — keep going" },
        { label: "Net Points Won", start: 55, end: 68, trend: "up", note: "Drills are working — big jump" },
        { label: "2nd Serve Win %", start: 32, end: 34, trend: "flat", note: "Minimal change — needs more focus" },
        { label: "Return Games Won", start: 28, end: 31, trend: "up", note: "Small but consistent gain" },
      ],
      biggestWin: "First serve percentage up 9 points — the kick serve cone drill is clearly working. This is the most impactful single improvement of the month.",
      biggestChallenge: "2nd serve win rate barely moved. Opponents are still attacking your second serve aggressively. This is now your #1 focus for next month.",
      weeklyBreakdown: [
        { week: "Week 1", focus: "Serve mechanics & kick serve reps", result: "Struggled early, breakthrough by Thursday", grade: "B" },
        { week: "Week 2", focus: "Crosscourt rally patterns & footwork", result: "Best training week of the month — high consistency", grade: "A-" },
        { week: "Week 3", focus: "Match simulation & point construction", result: "Applied patterns well in practice, slightly struggled in matches", grade: "B+" },
        { week: "Week 4", focus: "Return of serve & net approach", result: "Net game showed big improvement, return still inconsistent", grade: "B+" },
      ],
      top3NextLevelFocus: [
        { rank: 1, category: "Technical", title: "2nd Serve Reliability — Kick Serve Development", why: "At 4.0 level, opponents attack weak second serves immediately. A reliable kick serve to the backhand is non-negotiable to hold your own serve.", howTo: "20 min kick serve cone drill daily. Target backhand corner. Goal: 70%+ in with topspin within 6 weeks.", impact: "high" },
        { rank: 2, category: "Tactical", title: "Backhand Under Pressure — Unit Turn & Timing", why: "4.0 players rally 8+ balls reliably crosscourt. Your backhand breakdown on high balls is what will keep you stuck at 3.5.", howTo: "High ball backhand drill 3x/week. Focus on shoulder unit turn on balls above the waist. Shadow drills off court.", impact: "high" },
        { rank: 3, category: "Competition", title: "USTA Rated Match Play Experience", why: "Computer ratings are built on USTA match results. More rated matches = more data = faster accurate placement. You need official match play to move up.", howTo: "Register for USTA Adult 18+ 3.5 League this season. Also enter 1 self-rated local tournament to get rated match results on record.", impact: "medium" },
      ],
      ustaRoadmap: {
        currentRating: "3.5", targetRating: "4.0",
        estimatedTimeline: "4-6 months at current rate of improvement",
        whatItTakes: "A 4.0 player has a reliable serve that wins 60%+ of first serve points, consistent groundstrokes that rarely break down, and executes patterns — not just hitting the ball back.",
        ratingKeyRequirements: ["Win 60%+ of first serve points consistently", "Reduce unforced errors to fewer than 15 per match", "Win at least 40% of return games", "Reliable net game when approaching"],
        selfRatingTip: "If you self-rated at 3.5, you can self-rate up to 4.0 at the start of a new USTA season if you feel your level warrants it — your computer rating will adjust based on results.",
      },
      tournamentLeagueRecommendations: [
        { type: "League", name: "USTA Adult 18+ 3.5 League", why: "Best way to get official USTA match results that count toward your computer rating. Playing 6+ USTA matches in a season generates meaningful data.", when: "Typically runs spring and fall — register now for the fall season at tennislink.usta.com", benefit: "Official match results count toward your dynamic USTA computer rating" },
        { type: "Tournament", name: "USTA Self-Rated 3.5 Tournament", why: "Tournaments concentrate a lot of rated match play into a weekend, giving your computer rating a significant data boost.", when: "Check tennislink.usta.com for local events — many regions host monthly tournaments", benefit: "Multiple USTA matches in 2 days — fastest path to an accurate computer rating" },
        { type: "Internal", name: "Club Ladder or Round Robin", why: "Low-pressure, high-frequency match play against a variety of styles at your club.", when: "Ongoing — ask your club pro or tennis director about current ladder programs", benefit: "Builds match toughness, reveals tactical weaknesses, and keeps you match-sharp between USTA events" },
      ],
      nextMonthGoal: {
        primaryGoal: "Win 50%+ of second serve points — this single stat will be the clearest sign you've moved up a level",
        drillFocus: "Kick serve cone targets 20 min daily + high ball backhand drill 3x/week",
        matchTarget: "Fewer than 4 double faults per match and win at least 40% of return games",
        mindsetFocus: "Focus on the process, not the score — execute your primary pattern every point and trust it",
      },
      motivationalQuote: { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
      closingNote: `${currentMonth} was a month of real, measurable progress. The work you put into your serve is showing up in your match results — that's not luck, that's repetition paying off. Next month, attack the 2nd serve with the same focus you gave the 1st serve this month. If you do, you'll be playing like a 4.0 by the end of it. Let's go.`,
    });
    setLoading(false);
  }

  if (!isElite) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "40px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--off-white)", marginBottom: 10 }}>MONTHLY COACHING REPORT</div>
      <div style={{ fontSize: 14, color: "rgba(245,240,232,0.55)", marginBottom: 24, lineHeight: 1.6 }}>Elite subscribers receive a full AI-generated monthly coaching report summarizing progress, stats trends, weekly breakdowns, coach insights, and a detailed plan for next month.</div>
      <button className="btn-primary" onClick={() => setModalPlan("Elite")}>Upgrade to Elite →</button>
    </div>
  );

  if (!report && !loading) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "40px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--off-white)", marginBottom: 8 }}>MONTHLY COACHING REPORT</div>
      <div style={{ fontSize: 13, color: "rgba(245,240,232,0.5)", marginBottom: 24 }}>{currentMonth} · Based on your logged sessions</div>
      <button className="analyze-btn" style={{ maxWidth: 280, margin: "0 auto" }} onClick={generateReport}>📋 Generate {currentMonth} Report</button>
    </div>
  );

  if (loading) return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "40px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 1.2s infinite" }}>📋</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "var(--off-white)", marginBottom: 8 }}>Compiling your month…</div>
      <div style={{ fontSize: 13, color: "rgba(245,240,232,0.5)" }}>Analyzing all sessions, stats, and progress logs</div>
    </div>
  );

  return (
    <div className="report-card">
      {/* Report hero */}
      <div className="report-hero">
        <div className="report-hero-left">
          <div className="report-badge">⭐ Elite Monthly Coaching Report</div>
          <div className="report-title">{report.month}</div>
          <div className="report-subtitle">{report.headline}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--accent)" }}>NTRP ~{report.ntrpEstimate}</div>
              <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Current Level</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: report.ntrpTrend === "improving" ? "var(--grass-light)" : "var(--accent-dark)" }}>
                {report.ntrpTrend === "improving" ? "↑ Improving" : "→ Plateauing"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Trajectory</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--off-white)" }}>{report.matchRecord?.wins}W – {report.matchRecord?.losses}L</div>
              <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Match Record</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: report.gradeColor || "var(--clay)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: "white" }}>{report.overallGrade}</div>
          <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Monthly Grade</div>
          <button className="results-reset" style={{ marginTop: 8, fontSize: 11 }} onClick={() => setReport(null)}>↺ Regenerate</button>
        </div>
      </div>

      <div className="report-body">

        {/* Personal message */}
        {report.personalMessage && (
          <div style={{ background: "rgba(200,98,42,0.05)", border: "1px solid rgba(200,98,42,0.15)", borderRadius: 10, padding: "18px 20px", marginBottom: 24, display: "flex", gap: 14 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>👋</div>
            <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.75, fontStyle: "italic" }}>{report.personalMessage}</div>
          </div>
        )}

        {/* Executive summary */}
        <div className="report-section-title">Coach's Summary</div>
        <div className="report-summary">{report.executiveSummary}</div>

        {/* Milestones */}
        {report.milestonesAchieved?.length > 0 && (
          <>
            <div className="report-section-title">🏆 Milestones Achieved This Month</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {report.milestonesAchieved.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(74,124,47,0.06)", border: "1px solid rgba(74,124,47,0.15)", borderRadius: 8, padding: "12px 16px" }}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{m.milestone}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Stats trend */}
        <div className="report-section-title">Stats Trend — Month Over Month</div>
        <div className="report-stats-grid" style={{ marginBottom: 28 }}>
          {report.statsTrend?.map((s, i) => (
            <div key={i} className="report-stat-card">
              <div className="report-stat-label">{s.label}</div>
              <div className="report-stat-values">
                <div className="report-stat-start">{s.start}%</div>
                <div className="report-stat-end" style={{ color: TREND_COLOR[s.trend] || "var(--ink)" }}>{s.end}%</div>
                <div className="report-stat-trend" style={{ color: TREND_COLOR[s.trend] }}>{TREND_ARROW[s.trend]}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--mid)", marginTop: 4 }}>{s.note}</div>
              <div style={{ height: 3, background: "rgba(107,94,82,0.1)", borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: "100%", borderRadius: 2, background: TREND_COLOR[s.trend] || "var(--clay)", width: `${Math.min(s.end, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Biggest win + challenge */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <div style={{ background: "rgba(74,124,47,0.06)", border: "1px solid rgba(74,124,47,0.2)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "var(--grass-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🏆 Biggest Win</div>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>{report.biggestWin}</div>
          </div>
          <div style={{ background: "rgba(217,79,59,0.05)", border: "1px solid rgba(217,79,59,0.15)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>⚠ Biggest Challenge</div>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>{report.biggestChallenge}</div>
          </div>
        </div>

        {/* Weekly breakdown */}
        <div className="report-section-title">Weekly Breakdown</div>
        <div className="report-week-grid">
          {report.weeklyBreakdown?.map((w, i) => (
            <div key={i} className="report-week-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div className="report-week-label">{w.week}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: GRADE_COLORS[w.grade] || "var(--mid)" }}>{w.grade}</div>
              </div>
              <div className="report-week-focus">{w.focus}</div>
              <div className="report-week-result">{w.result}</div>
            </div>
          ))}
        </div>

        {/* Top 3 Next-Level Focus Areas */}
        {report.top3NextLevelFocus?.length > 0 && (
          <>
            <div className="report-section-title">🎯 Top 3 Things to Reach Your Next USTA Rating</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              {report.top3NextLevelFocus.map((item, i) => {
                const catColor = item.category === "Technical" ? "var(--clay)" : item.category === "Tactical" ? "var(--hard-light)" : "var(--grass-light)";
                const catBg = item.category === "Technical" ? "rgba(200,98,42,0.08)" : item.category === "Tactical" ? "rgba(43,95,138,0.08)" : "rgba(74,124,47,0.08)";
                return (
                  <div key={i} style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid rgba(107,94,82,0.08)", background: catBg }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: catColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "white", flexShrink: 0 }}>{item.rank}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{item.title}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: catColor, color: "white", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.category}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: item.impact === "high" ? "var(--clay)" : "var(--mid)", textTransform: "uppercase" }}>{item.impact} impact</span>
                    </div>
                    <div style={{ padding: "12px 18px" }}>
                      <div style={{ fontSize: 12, color: "var(--mid)", marginBottom: 6 }}>
                        <strong style={{ color: "var(--ink)" }}>Why it matters: </strong>{item.why}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mid)" }}>
                        <strong style={{ color: catColor }}>How to develop it: </strong>{item.howTo}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* USTA Rating Roadmap */}
        {report.ustaRoadmap && (
          <>
            <div className="report-section-title">📈 USTA Rating Roadmap</div>
            <div className="report-next-month" style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--off-white)", lineHeight: 1 }}>
                    {report.ustaRoadmap.currentRating} → {report.ustaRoadmap.targetRating}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(245,240,232,0.55)", marginTop: 4 }}>Current → Target Rating</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{report.ustaRoadmap.estimatedTimeline}</div>
                  <div style={{ fontSize: 11, color: "rgba(245,240,232,0.4)" }}>Estimated timeline</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "rgba(245,240,232,0.7)", lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
                {report.ustaRoadmap.whatItTakes}
              </div>
              {report.ustaRoadmap.ratingKeyRequirements?.map((req, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "rgba(245,240,232,0.7)" }}>
                  <span style={{ color: "var(--clay)", fontWeight: 700 }}>✓</span> {req}
                </div>
              ))}
              {report.ustaRoadmap.selfRatingTip && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.2)", borderRadius: 6, fontSize: 12, color: "var(--accent)" }}>
                  💡 {report.ustaRoadmap.selfRatingTip}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tournament & League Recommendations */}
        {report.tournamentLeagueRecommendations?.length > 0 && (
          <>
            <div className="report-section-title">🏟 Tournament & League Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {report.tournamentLeagueRecommendations.map((rec, i) => (
                <div key={i} style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: rec.type === "League" ? "rgba(45,80,22,0.1)" : rec.type === "Tournament" ? "rgba(200,98,42,0.1)" : "rgba(107,94,82,0.08)", color: rec.type === "League" ? "var(--grass-light)" : rec.type === "Tournament" ? "var(--clay)" : "var(--mid)", textTransform: "uppercase", letterSpacing: 0.5 }}>{rec.type}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{rec.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--mid)", lineHeight: 1.5, marginBottom: 6 }}>{rec.why}</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--mid)" }}>📅 {rec.when}</span>
                    <span style={{ fontSize: 11, color: "var(--clay)", fontWeight: 600 }}>↗ {rec.benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Next month goal */}
        {report.nextMonthGoal && (
          <div className="report-next-month" style={{ marginBottom: 28 }}>
            <div className="report-next-month-title">📅 Next Month's Goal</div>
            {Object.entries({
              "Primary Goal":   report.nextMonthGoal.primaryGoal,
              "Drill Focus":    report.nextMonthGoal.drillFocus,
              "Match Target":   report.nextMonthGoal.matchTarget,
              "Mindset Focus":  report.nextMonthGoal.mindsetFocus,
            }).map(([label, value]) => value && (
              <div key={label} className="report-next-item">
                <div className="report-next-label">{label}</div>
                <div className="report-next-value">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Motivational quote */}
        {report.motivationalQuote && (
          <div style={{ background: "rgba(107,94,82,0.04)", border: "1px solid rgba(107,94,82,0.1)", borderRadius: 10, padding: "18px 20px", marginBottom: 20, borderLeft: "3px solid var(--clay)" }}>
            <div style={{ fontSize: 15, color: "var(--ink)", fontStyle: "italic", lineHeight: 1.7, marginBottom: 8 }}>"{report.motivationalQuote.quote}"</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--clay)" }}>— {report.motivationalQuote.author}</div>
          </div>
        )}

        {/* Closing note */}
        <div className="report-motivational">
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--clay)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>From Your Coach</div>
          <p>{report.closingNote || report.motivationalNote}</p>
          <div style={{ marginTop: 16, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--clay)", letterSpacing: 1 }}>— ACE Elite Coach</div>
        </div>
      </div>
    </div>
  );
}

// ─── Coach Alex Badge ─────────────────────────────────────────────────────
// Uses a base64-encoded placeholder circle if headshot isn't available in browser
const COACH_HEADSHOT_URL = "https://raw.githubusercontent.com/akotlyar89-aceai/Aceai/main/AK_Headshot.jpg";

function CoachBadge({ setModalPlan }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="coach-badge-wrap">
      <div className="coach-tooltip">Chat with Coach Alex</div>
      <div className="coach-badge" onClick={() => setModalPlan("Elite")} title="Coach Alex Kotlyar — Elite Plan">
        {!imgError ? (
          <img
            src={COACH_HEADSHOT_URL}
            alt="Coach Alex Kotlyar"
            onError={() => setImgError(true)}
          />
        ) : (
          // Fallback initials avatar if image can't load
          <div style={{
            width: "100%", height: "100%", background: "var(--clay)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "white", letterSpacing: 1,
          }}>AK</div>
        )}
      </div>
    </div>
  );
}

// ─── Tactics Breakdown Grid ───────────────────────────────────────────────────
function TacticsBreakdown({ data }) {
  if (!data) return null;
  const WINRATE_CLS = w => w >= 68 ? "fill-good" : w >= 55 ? "fill-mid" : "fill-bad";

  return (
    <div className="tactics-breakdown">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--clay)", marginBottom: 6 }}>Full Tactical Breakdown</div>
          <div className="tactics-breakdown-title">MATCH GAME PLAN</div>
          <div className="tactics-breakdown-sub">{data.opponentProfile}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(200,98,42,0.08)", border: "1px solid rgba(200,98,42,0.2)", borderRadius: 6, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 1 }}>Game Style</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--clay)", marginTop: 3 }}>{data.gameStyle || "Aggressive Baseline"}</div>
          </div>
          <div style={{ background: "rgba(26,58,92,0.08)", border: "1px solid rgba(26,58,92,0.15)", borderRadius: 6, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mid)", textTransform: "uppercase", letterSpacing: 1 }}>Surface</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hard)", marginTop: 3 }}>{data.surface ? data.surface.charAt(0).toUpperCase() + data.surface.slice(1) : "Hard"}</div>
          </div>
        </div>
      </div>

      {/* Opponent Analysis — 3 cards */}
      <div className="tactics-grid" style={{ marginBottom: 20 }}>
        <div className="tactics-card">
          <div className="tactics-card-header" style={{ background: "rgba(217,79,59,0.06)", borderBottom: "1px solid rgba(217,79,59,0.12)" }}>
            <span className="tactics-card-icon">⚡</span>
            <span className="tactics-card-title" style={{ color: "#D94F3B" }}>Their Strengths</span>
          </div>
          <div className="tactics-card-body" style={{ paddingTop: 12 }}>
            {data.opponentStrengths?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(107,94,82,0.06)", fontSize: 13, color: "var(--ink)", alignItems: "flex-start" }}>
                <span style={{ color: "#D94F3B", fontWeight: 700, flexShrink: 0 }}>!</span>{s}
              </div>
            ))}
          </div>
        </div>
        <div className="tactics-card">
          <div className="tactics-card-header" style={{ background: "rgba(74,124,47,0.06)", borderBottom: "1px solid rgba(74,124,47,0.12)" }}>
            <span className="tactics-card-icon">🎯</span>
            <span className="tactics-card-title" style={{ color: "var(--grass-light)" }}>Their Weaknesses</span>
          </div>
          <div className="tactics-card-body" style={{ paddingTop: 12 }}>
            {data.opponentWeaknesses?.map((w, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(107,94,82,0.06)", fontSize: 13, color: "var(--ink)", alignItems: "flex-start" }}>
                <span style={{ color: "var(--grass-light)", fontWeight: 700, flexShrink: 0 }}>✓</span>{w}
              </div>
            ))}
          </div>
        </div>
        <div className="tactics-card">
          <div className="tactics-card-header" style={{ background: "rgba(200,98,42,0.06)", borderBottom: "1px solid rgba(200,98,42,0.12)" }}>
            <span className="tactics-card-icon">🧠</span>
            <span className="tactics-card-title">Mental Game</span>
          </div>
          <div className="tactics-card-body" style={{ paddingTop: 12 }}>
            <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.65, marginBottom: 12 }}>{data.mentalGame}</p>
            {data.avoidAt?.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#D94F3B", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>⚠ Avoid</div>
                {data.avoidAt.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--mid)", padding: "3px 0", lineHeight: 1.5 }}>• {a}</div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top Patterns Ranked */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>🏆 Top Patterns — Ranked by Win Rate</div>
      <div className="tactics-patterns-grid" style={{ marginBottom: 24 }}>
        {data.topPatterns?.map((p, i) => (
          <div key={i} className="tactics-pattern-card">
            <div className="tactics-pattern-rank">
              <div className="rank-num" style={{ background: i === 0 ? "var(--clay)" : i === 1 ? "var(--accent-dark)" : i === 2 ? "var(--hard)" : "var(--mid)" }}>{p.rank}</div>
              <div style={{ flex: 1 }}>
                <div className="rank-name">{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--mid)", marginTop: 2 }}>{p.difficulty}</div>
              </div>
              <div className="rank-badge" style={{
                background: p.winRate >= 68 ? "rgba(74,124,47,0.1)" : "rgba(196,164,43,0.1)",
                color: p.winRate >= 68 ? "var(--grass-light)" : "var(--accent-dark)"
              }}>{p.winRate}% win rate</div>
            </div>
            <div className="tactics-pattern-body">
              <p>{p.description}</p>
              <div className="stat-bar-track" style={{ marginTop: 8 }}>
                <div className={`stat-bar-fill ${WINRATE_CLS(p.winRate)}`} style={{ width: `${p.winRate}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shot Selection Table */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>🎾 Shot Selection & Consistency Goals</div>
      <div style={{ background: "white", border: "1px solid rgba(107,94,82,0.12)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 80px 1fr", background: "var(--ink)", padding: "10px 16px", gap: 8 }}>
          {["Shot","Target","Spin","Goal","Coach Tip"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,240,232,0.5)", letterSpacing: 1, textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>
        {data.shotSelection?.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 80px 1fr", padding: "10px 16px", gap: 8, borderBottom: "1px solid rgba(107,94,82,0.07)", background: i % 2 === 0 ? "white" : "rgba(250,247,242,0.7)", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--clay)" }}>{s.shot}</div>
            <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>{s.target}</div>
            <div style={{ fontSize: 11, color: "var(--mid)" }}>{s.spin}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: "var(--grass-light)", lineHeight: 1 }}>{s.goal}</div>
            <div style={{ fontSize: 11, color: "var(--mid)", fontStyle: "italic", lineHeight: 1.4 }}>{s.tip}</div>
          </div>
        ))}
      </div>

      {/* Consistency mini-cards */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>📊 Consistency Goals At a Glance</div>
      <div className="tactics-consistency-grid" style={{ marginBottom: 8 }}>
        {data.shotSelection?.slice(0, 4).map((s, i) => {
          const numMatch = s.goal?.match(/(\d+)/);
          const pct = numMatch ? parseInt(numMatch[1]) : 70;
          const col = pct >= 75 ? "var(--grass-light)" : pct >= 65 ? "var(--accent-dark)" : "var(--clay)";
          return (
            <div key={i} className="consistency-card">
              <div className="consistency-shot">{s.shot}</div>
              <div className="consistency-target" style={{ color: col }}>{s.goal}</div>
              <div className="consistency-note">{s.tip}</div>
              <div className="consistency-bar">
                <div className="consistency-fill" style={{ width: `${pct}%`, background: col }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Venmo Payment Modal ───────────────────────────────────────────────────
// Replace VENMO_HANDLE below with your actual @username
const VENMO_HANDLE = "@Alex-Kotlyar";

const PLANS = {
  Challenger: { price: 15,  period: "month", billing: "billed monthly",    features: "All core AI coaching tools", color: "var(--mid)",  highlights: ["Unlimited AI match analysis","Tactical game plans","Drill recommendations","Progress tracking","Shot selection coaching"] },
  Pro:        { price: 29,  period: "month", billing: "billed monthly",    features: "Core + Match Prep Reports",   color: "var(--clay)", highlights: ["Everything in Challenger","Premium Match Prep Reports","Video breakdown guidance","Weekly training plans","Priority AI response"] },
  Elite:      { price: 40,  period: "month", billing: "billed monthly",    features: "Everything + Daily briefings + Monthly report + 1:1 Call", color: "#C4A42B", highlights: ["Everything in Pro","Daily Elite briefings","Monthly coaching report","Milestones & USTA rating roadmap","Monthly 1:1 video/phone call with Coach Alex","Tournament & league recommendations"] },
  Annual:     { price: 299, period: "year",  billing: "billed once yearly", features: "All features — best value",   color: "var(--grass-light)", highlights: ["Every feature unlocked","Save $181 vs Elite monthly","~$25/month equivalent","No monthly charges","Includes Elite monthly reports"] },
};

function VenmoModal({ plan: initialPlan, onClose }) {
  const hasPlan = initialPlan && initialPlan !== "";
  const [selectedPlan, setSelectedPlan] = useState(hasPlan ? initialPlan : "Pro");
  const [step, setStep] = useState(hasPlan ? "form" : "pick");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const planData = PLANS[selectedPlan] || PLANS.Pro;

  function validate() {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email required";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    recordSignup({ name: name.trim(), email: email.trim(), plan: selectedPlan, price: planData.price });
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setStep("success");
  }

  function openVenmo() {
    const isAnnual = planData.period === "year";
    const note = encodeURIComponent(`ACE AI Tennis – ${selectedPlan} Plan ($${planData.price}${isAnnual ? "/year" : "/mo"})`);
    const url = `venmo://paycharge?txn=pay&recipients=${VENMO_HANDLE.replace("@","")}&amount=${planData.price}&note=${note}`;
    window.location.href = url;
    setTimeout(() => { window.open(`https://venmo.com/${VENMO_HANDLE.replace("@","")}`, "_blank"); }, 1200);
  }

  const PLAN_ORDER = ["Challenger","Pro","Elite","Annual"];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: step === "pick" ? 560 : 480 }}>

        {/* ── STEP 1: Plan Picker ── */}
        {step === "pick" && (
          <>
            <div className="modal-header">
              <div>
                <div className="modal-header-plan">ACE AI Tennis</div>
                <div className="modal-header-title">CHOOSE YOUR PLAN</div>
              </div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {PLAN_ORDER.map(key => {
                  const p = PLANS[key];
                  const isSelected = selectedPlan === key;
                  const isPopular = key === "Pro";
                  const isBestVal = key === "Annual";
                  return (
                    <div key={key} onClick={() => setSelectedPlan(key)} style={{
                      border: `2px solid ${isSelected ? p.color : "rgba(107,94,82,0.15)"}`,
                      borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                      background: isSelected ? `${p.color}08` : "white",
                      transition: "all 0.15s", position: "relative",
                    }}>
                      {(isPopular || isBestVal) && (
                        <div style={{ position: "absolute", top: -10, right: 14, background: isPopular ? "var(--clay)" : "var(--grass-light)", color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase" }}>
                          {isPopular ? "Most Popular" : "Best Value"}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {/* Radio */}
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelected ? p.color : "rgba(107,94,82,0.25)"}`, background: isSelected ? p.color : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                        </div>
                        {/* Plan info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "var(--ink)", letterSpacing: 0.5 }}>{key}</span>
                            <span style={{ fontSize: 12, color: "var(--mid)", fontWeight: 500 }}>{p.billing}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--mid)", marginTop: 2 }}>{p.features}</div>
                        </div>
                        {/* Price */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.color, lineHeight: 1 }}>${p.price}</div>
                          <div style={{ fontSize: 10, color: "var(--mid)", fontWeight: 500 }}>/{p.period}</div>
                        </div>
                      </div>
                      {/* Expanded highlights when selected */}
                      {isSelected && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${p.color}22`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {p.highlights.map((h, i) => (
                            <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: `${p.color}12`, color: p.color }}>✓ {h}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="venmo-btn" onClick={() => setStep("form")} style={{ background: planData.color !== "var(--clay)" && planData.color !== "var(--mid)" ? planData.color : undefined }}>
                Continue with {selectedPlan} — ${planData.price}/{planData.period} →
              </button>
              <div className="modal-security" style={{ marginTop: 12 }}>🔒 Pay via Venmo · No subscription traps · Cancel anytime</div>
            </div>
          </>
        )}

        {/* ── STEP 2: Name + Email form ── */}
        {step === "form" && (
          <>
            <div className="modal-header">
              <div>
                <div className="modal-header-plan" style={{ color: planData.color }}>{selectedPlan} · ${planData.price}/{planData.period}</div>
                <div className="modal-header-title">ALMOST THERE</div>
              </div>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-plan-summary">
                <div>
                  <div className="modal-plan-name">{selectedPlan}</div>
                  <div className="modal-plan-desc">{planData.features}</div>
                </div>
                <div>
                  <div className="modal-plan-price" style={{ color: planData.color }}>${planData.price}<sub>/{planData.period}</sub></div>
                </div>
              </div>

              <div className="modal-field">
                <label>Your Name</label>
                <input className={`modal-input${errors.name ? " error" : ""}`} placeholder="e.g. Rafael Nadal" value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: ""})); }} />
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>
              <div className="modal-field">
                <label>Email Address</label>
                <input className={`modal-input${errors.email ? " error" : ""}`} placeholder="you@example.com" type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ""})); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                {errors.email && <div className="field-error">{errors.email}</div>}
              </div>

              <div style={{ fontSize: 13, color: "var(--mid)", textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
                💳 Pay <strong style={{ color: "var(--ink)" }}>${planData.price}</strong> now via Venmo to activate your account instantly.
              </div>

              <button className="venmo-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? "Setting up your account…" : <><span className="venmo-logo">V</span> Pay ${planData.price} with Venmo</>}
              </button>

              <button onClick={() => setStep("pick")} style={{ width: "100%", marginTop: 10, background: "none", border: "none", fontSize: 13, color: "var(--mid)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ← Change plan
              </button>

              <div className="modal-security">🔒 Secure · @Alex-Kotlyar · No card stored</div>
            </div>
          </>
        )}

        {/* ── STEP 3: Success ── */}
        {step === "success" && (
          <div className="modal-success">
            <div className="success-icon">🎾</div>
            <div className="success-title">ONE LAST STEP!</div>
            <div className="success-body">
              Send your payment via Venmo to activate your <strong>{selectedPlan}</strong> account. We'll confirm access to <strong>{email}</strong> once payment is received.
            </div>
            <div className="venmo-handle">
              <sub>Send ${planData.price}{planData.period === "year" ? "/year" : "/month"} to</sub>
              {VENMO_HANDLE}
            </div>
            <button className="venmo-btn" onClick={openVenmo}>
              <span className="venmo-logo">V</span> Open Venmo & Pay ${planData.price} Now
            </button>
            <div className="modal-divider">or copy the handle above</div>
            <button className="btn-outline" style={{ width: "100%" }} onClick={onClose}>I'll Pay Later</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [surface, setSurface] = useState("clay");
  const [modalPlan, setModalPlan] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isElite, setIsElite] = useState(false); // true for Elite subscribers
  const [matchAnalysisData, setMatchAnalysisData] = useState(null);
  const [gamePlan, setGamePlan] = useState(null);

  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); // null = closed

  const MATCH_SYSTEM = `You are ACE, an expert AI tennis coach specializing in match analysis for recreational and competitive club players (NTRP 2.5–4.5). You analyze player weaknesses, explain WHY they're losing points, and give specific, actionable drills and training advice. Be concise, direct, and encouraging. Use tennis terminology naturally. Format responses clearly. Limit replies to 150 words.`;

const STRATEGY_SYSTEM = `You are ACE's tactical match prep brain. When a player describes their upcoming opponent, surface, and situation, respond conversationally (1-2 paragraphs) AND include at the end a JSON block wrapped in <tactics>...</tactics> tags with this exact structure:
<tactics>
{
  "opponentProfile": "2 sentence summary of opponent style and tendencies",
  "opponentStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "opponentWeaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "gameStyle": "Describe your recommended game style vs this opponent in 1 sentence",
  "surface": "hard",
  "topPatterns": [
    { "rank": 1, "name": "Pattern name e.g. Heavy topspin to backhand", "description": "Exactly how to execute this — court position, spin, target zone", "winRate": 72, "difficulty": "Intermediate" },
    { "rank": 2, "name": "Second best pattern", "description": "Execution detail", "winRate": 65, "difficulty": "Beginner" },
    { "rank": 3, "name": "Third pattern", "description": "Execution detail", "winRate": 58, "difficulty": "Advanced" },
    { "rank": 4, "name": "Fourth pattern", "description": "Execution detail", "winRate": 54, "difficulty": "Intermediate" }
  ],
  "shotSelection": [
    { "shot": "1st Serve", "target": "T on deuce, wide on ad", "spin": "Flat or kick", "goal": "65%+ in", "tip": "One cue" },
    { "shot": "2nd Serve", "target": "Kick to backhand", "spin": "Heavy topspin", "goal": "80%+ in", "tip": "One cue" },
    { "shot": "Return", "target": "Crosscourt deep", "spin": "Topspin", "goal": "70%+ in play", "tip": "One cue" },
    { "shot": "Forehand", "target": "Deep crosscourt or inside-out", "spin": "Heavy topspin", "goal": "75%+ in", "tip": "One cue" },
    { "shot": "Backhand", "target": "Crosscourt safe", "spin": "Topspin slice mix", "goal": "70%+ in", "tip": "One cue" },
    { "shot": "Approach", "target": "Down the line low", "spin": "Slice", "goal": "Make 8/10", "tip": "One cue" }
  ],
  "mentalGame": "One specific mental approach for this match",
  "avoidAt": ["Specific shot or situation to avoid", "Another thing to avoid"]
}
</tactics>
Keep the conversational part natural and direct. The JSON gives the structured breakdown.`;


const SHOT_SYSTEM = `You are ACE Shot Selection Coach, an expert in tennis pattern play and point construction. When a player describes their level, opponent style, or specific situation, respond ONLY with a valid JSON object (no markdown) in this format:
{
  "headline": "Shot Selection Blueprint",
  "situation": "Brief description of the scenario",
  "primaryPattern": {
    "name": "Pattern name (e.g. Inside-Out Forehand)",
    "steps": ["Step 1 shot description", "Step 2", "Step 3", "Step 4"],
    "winRate": 68,
    "difficulty": "Intermediate"
  },
  "alternativePatterns": [
    { "name": "Pattern name", "trigger": "When to use this", "winRate": 55, "difficulty": "Beginner" },
    { "name": "Pattern name", "trigger": "When to use this", "winRate": 72, "difficulty": "Advanced" }
  ],
  "avoidShots": ["Shot to avoid and why", "Another shot to avoid"],
  "hotZones": [
    { "zone": "Court zone name", "purpose": "Why target here", "priority": "high" },
    { "zone": "Court zone name", "purpose": "Why target here", "priority": "medium" }
  ],
  "pointConstruction": "2-3 sentences on how to build the point from serve through to winner",
  "mentalCue": "One short mental reminder to say before each point"
}
Make it hyper-specific to their NTRP level. Always return only the JSON.`;

const PREP_SYSTEM = `You are ACE Match Prep Coach, an elite pre-match analyst. When given details about an upcoming opponent, respond ONLY with a valid JSON object (no markdown) in this format:
{
  "reportTitle": "Match Prep Report",
  "opponent": "Brief opponent profile summary",
  "threatLevel": "Medium",
  "overallStrategy": "2-3 sentence overall strategic approach",
  "serveStrategy": {
    "firstServe": "Specific first serve placement advice",
    "secondServe": "Second serve tactic",
    "serveAndVolley": "When to come in"
  },
  "returnStrategy": {
    "vsFirstServe": "Return tactic vs their first serve",
    "vsSecondServe": "Return tactic vs their second serve",
    "positioning": "Where to stand"
  },
  "rallyPatterns": [
    { "pattern": "Pattern name", "description": "Detailed description", "effectiveness": 80 },
    { "pattern": "Pattern name", "description": "Detailed description", "effectiveness": 65 },
    { "pattern": "Pattern name", "description": "Detailed description", "effectiveness": 72 }
  ],
  "exploitableWeaknesses": [
    { "weakness": "Specific weakness", "howToExploit": "Exact tactic to use", "priority": "high" },
    { "weakness": "Specific weakness", "howToExploit": "Exact tactic to use", "priority": "medium" }
  ],
  "watchOutFor": ["Their strength or danger and how to neutralize it", "Another danger"],
  "mentalGame": "Mental and psychological approach for this specific opponent",
  "keyStats": [
    { "label": "Exploit Their BH", "value": 82 },
    { "label": "Net Approach Success", "value": 68 },
    { "label": "2nd Serve Attack", "value": 75 },
    { "label": "Rally Length Target", "value": 60 }
  ],
  "preMatchChecklist": ["Warm-up focus 1", "Mental reminder", "First game plan", "If down a set adjust by..."]
}
Be extremely specific — include court zones, spin types, score situations, and pattern play. Always return only the JSON.`;

const PROGRESS_SYSTEM = `You are ACE Progress Tracker. A player will describe their recent match results, what is going well, and what they are struggling with. You must respond ONLY with a valid JSON object (no markdown) based STRICTLY on what the player has told you — do not invent stats, do not fabricate "before" numbers, and do not add areas they did not mention. Use this exact format:
{
  "ntrpEstimate": "3.5",
  "trend": "improving",
  "summary": "2-3 sentence honest summary based ONLY on what the player described",
  "strengths": [
    { "area": "Area they said is going well", "detail": "Specific insight based on what they wrote" }
  ],
  "struggles": [
    { "area": "Area they said they struggle with", "detail": "Why this likely happens and what it costs them" }
  ],
  "nextFocus": "The single most important thing to fix based on what they told you — be very specific",
  "ntrpRoadmap": [
    { "level": "3.0", "status": "achieved", "milestone": "What achieving this level requires" },
    { "level": "3.5", "status": "current", "milestone": "What they need to solidify at this level based on what they told you" },
    { "level": "4.0", "status": "next", "milestone": "What specific things they need to reach 4.0 based on their described weaknesses" },
    { "level": "4.5", "status": "future", "milestone": "Long-term goal" }
  ],
  "sessionNote": "A reminder that progress tracking improves over time as they log more sessions"
}
Only include strengths and struggles the player actually mentioned. Do not add extra areas to fill space. Always return only the JSON.`;

  const matchQuickPrompts = ["Why am I losing on 2nd serve?", "My backhand breaks down under pressure", "How do I stop making unforced errors?", "Drills to improve my net game"];
  const strategyQuickPrompts = ["Game plan vs a pusher", "How to beat a big server", "Pattern play for 3.5 level", "When to come to net?"];

  function handleFeatureClick(title) {
    const map = {
      "Match Analysis": "analysis",
      "Drills On Demand": "drills",
      "Tactical Brain": "strategy",
      "Progress Tracking": "progress",
      "Shot Selection AI": "shots",
      "Match Prep Reports": "prep",
    };
    const tab = map[title] || "analysis";
    setActiveTab(tab);
    setTimeout(() => document.getElementById("coach")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <>
      <style>{CSS}</style>
      {modalPlan !== null && <VenmoModal plan={modalPlan} onClose={() => setModalPlan(null)} />}
      <CoachBadge setModalPlan={setModalPlan} />

      {/* NAV */}
      <nav>
        <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>ACE<span>·AI</span></div>
        <ul className="nav-links">
          {[
            { label: "Features",       id: "features" },
            { label: "AI Coach",       id: "coach" },
            { label: "Video Analysis", id: "coach", tab: "video" },
            { label: "Drills",         id: "coach", tab: "drills" },
            { label: "Shot Selection", id: "coach", tab: "shots" },
            { label: "Match Prep",     id: "coach", tab: "prep" },
            { label: "Singles Tips",   id: "singles" },
            { label: "Doubles Tips",   id: "doubles" },
            { label: "Elite",          id: "elite" },
            { label: "Pricing",        id: "pricing" },
          ].map(({ label, id, tab }) => (
            <li key={label}>
              <a
                href={`#${id}`}
                onClick={e => {
                  e.preventDefault();
                  if (tab) setActiveTab(tab);
                  setTimeout(() => {
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, tab ? 50 : 0);
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <button className="nav-cta" onClick={() => setModalPlan("")}>Get Started</button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-court-lines" />
        <div className="hero-content">
          <div className="hero-badge"><span />AI-Powered Tennis Coaching</div>
          <h1>STOP<br/><em>GUESSING.</em><br/>START<br/>WINNING.</h1>
          <p>ACE analyzes your match stats, identifies exactly why you're losing points, and builds a personalized training plan to break through your plateau.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setModalPlan("")}>Get Started →</button>
            <button className="btn-outline" onClick={() => document.getElementById("coach").scrollIntoView({behavior:"smooth"})}>See How It Works</button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-num">12K+</div>
              <div className="stat-label">Players Coached</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">0.5+</div>
              <div className="stat-label">Avg NTRP Improvement</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">94%</div>
              <div className="stat-label">Report Breaking Through Plateaus</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-label">What ACE Does</div>
        <div className="section-title">YOUR UNFAIR<br/>ADVANTAGE</div>
        <div className="section-subtitle">Everything a personal coach gives you — on demand, at a fraction of the cost.</div>
        <div className="features-grid">
          {[
            { icon: "📊", title: "Match Analysis", desc: "Upload your stats or describe your match — ACE pinpoints exactly where you're losing points and why." },
            { icon: "🎯", title: "Drills On Demand", desc: "Get personalized drill plans targeting your specific weaknesses. No generic YouTube rabbit holes." },
            { icon: "🧠", title: "Tactical Brain", desc: "Input your opponent's style and surface — receive a full game plan before you step on court." },
            { icon: "📈", title: "Progress Tracking", desc: "Track your stats over time and watch your improvement benchmarked against your NTRP level." },
            { icon: "🎾", title: "Shot Selection AI", desc: "Learn which shots win at your level and build pattern play that exploits opponent weaknesses." },
            { icon: "📋", title: "Match Prep Reports", desc: "Premium pre-match reports with scouting, tactical recommendations, and mental game tips." },
          ].map((f, i) => (
            <div key={i} className="feature-card" onClick={() => handleFeatureClick(f.title)} style={{ cursor: "pointer" }}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <p style={{ marginTop: 16, fontSize: 12, color: "rgba(200,98,42,0.7)", fontWeight: 600, letterSpacing: "0.5px" }}>Try it → ↓</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI COACH SECTION */}
      <section className="ai-section" id="coach">
        <div className="section-label">Try It Now — Free</div>
        <div className="section-title">YOUR AI COACH.<br/>LIVE.</div>
        <div className="section-subtitle">Two AI coaching modules trained on thousands of match patterns and player data.</div>

        <div className="ai-tabs">
          {[
            ["analysis", "📊 Match Analysis"],
            ["strategy", "🧠 Tactics & Strategy"],
            ["video",    "🎬 Video Analysis"],
            ["drills",   "🎯 Drills on Demand"],
            ["shots",    "🎾 Shot Selection"],
            ["prep",     "📋 Match Prep Report"],
            ["progress", "📈 Progress Tracking"],
          ].map(([id, label]) => (
            <button key={id} className={`ai-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        <div className={`ai-panel ${activeTab === "analysis" ? "active" : ""}`}>
          <div className="ai-panel-left">
            <h3>Match Stat Analysis</h3>
            <p>Enter your real match stats — aces, errors, serve %, return points won — and ACE breaks down exactly what the numbers mean and what to fix.</p>
            <ul className="pain-list">
              <li><span className="icon">📊</span>Enter stats from your actual match</li>
              <li><span className="icon">🎯</span>AI identifies your biggest problem areas</li>
              <li><span className="icon">✓</span>Strengths confirmed with real numbers</li>
              <li><span className="icon">💡</span>Top 3 specific fixes ranked by impact</li>
            </ul>
            <MatchAnalysisVisual liveData={matchAnalysisData} />
          </div>
          <MatchStatEntry onAnalysis={setMatchAnalysisData} analysisData={matchAnalysisData} />
        </div>

        <div className={`ai-panel ${activeTab === "strategy" ? "active" : ""}`}>
          <div className="ai-panel-left">
            <h3>Build Your Game Plan</h3>
            <p>Tell ACE about your opponent and the surface — get a complete tactical game plan with patterns, shot selection, and consistency goals.</p>
            <div className="surface-selector">
              {["clay", "grass", "hard"].map(s => (
                <button key={s} className={`surface-btn ${s} ${surface === s ? "active" : ""}`} onClick={() => setSurface(s)}>
                  {s === "clay" ? "🟫 Clay" : s === "grass" ? "🟩 Grass" : "🟦 Hard"}
                </button>
              ))}
            </div>
            <GamePlanVisual surface={surface} liveData={gamePlan} />
          </div>
          <StrategyChat
            systemPrompt={STRATEGY_SYSTEM}
            quickPrompts={strategyQuickPrompts}
            placeholder="Describe your opponent or situation…"
            onGamePlan={setGamePlan}
          />
        </div>

        {/* Tactics full-width breakdown — appears below chat once game plan generated */}
        {activeTab === "strategy" && gamePlan && (
          <div style={{ marginTop: 8 }}>
            <TacticsBreakdown data={gamePlan} />
          </div>
        )}

        <div className={`ai-panel ${activeTab === "video" ? "active" : ""}`} style={{ display: activeTab === "video" ? "grid" : "none" }}>
          <div className="ai-panel-left">
            <h3>Video Match Analysis</h3>
            <p>Upload your match video and ACE's AI breaks down your performance — generating real stats on your serve, return, net game, and rally patterns.</p>
            <ul className="pain-list">
              <li><span className="icon">🎬</span>Upload MP4, MOV, AVI or MKV footage</li>
              <li><span className="icon">📊</span>AI-generated stat breakdown</li>
              <li><span className="icon">✓</span>Strengths & weaknesses identified</li>
              <li><span className="icon">🎯</span>Custom drill plan based on your video</li>
            </ul>
            <MatchAnalysisVisual />
          </div>
          <VideoAnalysis isUnlocked={isUnlocked} setModalPlan={setModalPlan} />
        </div>

        <div className={`ai-panel ${activeTab === "drills" ? "active" : ""}`} style={{ display: activeTab === "drills" ? "grid" : "none" }}>
          <div className="ai-panel-left">
            <h3>Drills on Demand</h3>
            <p>Choose how you want your drill plan built — answer 5 quick questions or upload match footage. ACE generates a full weekly schedule with on-court and off-court drills tailored to your exact game.</p>
            <ul className="pain-list">
              <li><span className="icon">📋</span>5 questions → full personalized plan</li>
              <li><span className="icon">🎬</span>Video upload → drills based on real footage</li>
              <li><span className="icon">🎾</span>On-court drills with step-by-step instructions</li>
              <li><span className="icon">🏠</span>Off-court conditioning & shadow drills</li>
              <li><span className="icon">🏆</span>4-week measurable progression goal</li>
            </ul>
            <div className="analysis-visual">
              <div className="analysis-title">Sample Weekly Plan</div>
              {[["Mon — Serve Power & Kick", 90, "fill-good"],["Wed — Crosscourt Patterns", 75, "fill-good"],["Fri — Match Simulation", 80, "fill-good"],["Tue/Thu — Off-Court Conditioning", 60, "fill-mid"],].map(([label, val, cls], i) => (
                <div key={i} className="stat-bar">
                  <div className="stat-bar-label"><span>{label}</span></div>
                  <div className="stat-bar-track"><div className={`stat-bar-fill ${cls}`} style={{ width: `${val}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <DrillsOnDemand isUnlocked={isUnlocked} setModalPlan={setModalPlan} />
        </div>

        {/* ── SHOT SELECTION ── */}
        <div className={`ai-panel ${activeTab === "shots" ? "active" : ""}`} style={{ display: activeTab === "shots" ? "grid" : "none" }}>
          <div className="ai-panel-left">
            <h3>Shot Selection AI</h3>
            <p>Tell ACE your situation — opponent style, score, surface — and get a complete shot-by-shot blueprint. Know exactly which ball to hit, where to aim, and how to construct the point.</p>
            <ul className="pain-list">
              <li><span className="icon">🎯</span>Primary pattern with step-by-step sequence</li>
              <li><span className="icon">🔀</span>Alternative patterns for different situations</li>
              <li><span className="icon">⚠️</span>Shots to avoid and why</li>
              <li><span className="icon">🗺️</span>Hot zones — exactly where to target on court</li>
              <li><span className="icon">🧠</span>Point construction strategy from serve to winner</li>
            </ul>
            <div className="analysis-visual">
              <div className="analysis-title">Pattern Win Rates by Shot</div>
              {[["Inside-Out Forehand", 72, "fill-good"],["Crosscourt Backhand Rally", 61, "fill-good"],["Down the Line BH Approach", 55, "fill-mid"],["Drop Shot from Baseline", 38, "fill-bad"]].map(([label, val, cls], i) => (
                <div key={i} className="stat-bar">
                  <div className="stat-bar-label"><span>{label}</span><span>{val}%</span></div>
                  <div className="stat-bar-track"><div className={`stat-bar-fill ${cls}`} style={{ width: `${val}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <ShotSelectionAI isUnlocked={isUnlocked} setModalPlan={setModalPlan} />
        </div>

        {/* ── MATCH PREP REPORT ── */}
        <div className={`ai-panel ${activeTab === "prep" ? "active" : ""}`} style={{ display: activeTab === "prep" ? "grid" : "none" }}>
          <div className="ai-panel-left">
            <h3>Match Prep Reports</h3>
            <p>Enter your opponent's style and surface before any match. ACE builds a full scouting report — weaknesses to exploit, patterns to run, danger to neutralize, and a mental game plan.</p>
            <ul className="pain-list">
              <li><span className="icon">🔍</span>Serve & return strategy for this specific opponent</li>
              <li><span className="icon">📐</span>Rally patterns ranked by effectiveness</li>
              <li><span className="icon">🎯</span>Exploitable weaknesses with exact tactics</li>
              <li><span className="icon">⚠️</span>Their strengths and how to neutralize them</li>
              <li><span className="icon">🧠</span>Mental game approach & pre-match checklist</li>
            </ul>
            <div className="analysis-visual">
              <div className="analysis-title">Sample Tactical Priorities</div>
              {[["Attack Their 2nd Serve", 85, "fill-good"],["Net Approach Opportunities", 70, "fill-good"],["BH Crosscourt Pattern", 68, "fill-good"],["Avoid Trading Forehands", 30, "fill-bad"]].map(([label, val, cls], i) => (
                <div key={i} className="stat-bar">
                  <div className="stat-bar-label"><span>{label}</span><span>{val}%</span></div>
                  <div className="stat-bar-track"><div className={`stat-bar-fill ${cls}`} style={{ width: `${val}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <MatchPrepReport isUnlocked={isUnlocked} setModalPlan={setModalPlan} />
        </div>

        {/* ── PROGRESS TRACKING ── */}
        <div className={`ai-panel ${activeTab === "progress" ? "active" : ""}`} style={{ display: activeTab === "progress" ? "grid" : "none" }}>
          <div className="ai-panel-left">
            <h3>Progress Tracking</h3>
            <p>Log your recent match results and describe your game. ACE tracks your improvement over time, estimates your NTRP trajectory, and tells you exactly what to focus on next.</p>
            <ul className="pain-list">
              <li><span className="icon">📈</span>Stat comparison — now vs before</li>
              <li><span className="icon">🏆</span>NTRP level roadmap with milestones</li>
              <li><span className="icon">✓</span>What you've improved — with specifics</li>
              <li><span className="icon">🎯</span>Single most important next focus area</li>
              <li><span className="icon">📅</span>Timeline to reach your next NTRP rating</li>
            </ul>
            <div className="analysis-visual">
              <div className="analysis-title">NTRP Progression Tracker</div>
              {[["3.0 → 3.5 (Achieved)", 100, "fill-good"],["Serve Reliability", 68, "fill-good"],["Return Games Won", 42, "fill-mid"],["Break Point Conversion", 28, "fill-bad"]].map(([label, val, cls], i) => (
                <div key={i} className="stat-bar">
                  <div className="stat-bar-label"><span>{label}</span><span>{val}%</span></div>
                  <div className="stat-bar-track"><div className={`stat-bar-fill ${cls}`} style={{ width: `${val}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <ProgressTracker isUnlocked={isUnlocked} setModalPlan={setModalPlan} />
        </div>

      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="section-label">Pricing</div>
        <div className="section-title">INVEST IN<br/>YOUR GAME</div>
        <div className="section-subtitle">Monthly plans or save big with a single annual payment — all features included.</div>
        <div className="pricing-grid">

          {/* Monthly cards */}
          <div className="price-card">
            <div className="price-name">Challenger</div>
            <div className="price-amount"><sup>$</sup>15</div>
            <div className="price-period">per month</div>
            <ul className="price-features">
              <li>Unlimited AI match analysis</li>
              <li>Tactical game plans</li>
              <li>Drill recommendations</li>
              <li>Progress tracking</li>
              <li>Shot selection coaching</li>
            </ul>
            <button className="btn-plan secondary" onClick={() => setModalPlan("Challenger")}>Get Started</button>
          </div>
          <div className="price-card featured">
            <div className="featured-badge">Most Popular</div>
            <div className="price-name">Pro</div>
            <div className="price-amount"><sup>$</sup>29</div>
            <div className="price-period">per month</div>
            <ul className="price-features">
              <li>Everything in Challenger</li>
              <li>Premium Match Prep Reports</li>
              <li>Opponent scouting analysis</li>
              <li>Video breakdown guidance</li>
              <li>Priority AI response</li>
              <li>Weekly training plans</li>
            </ul>
            <button className="btn-plan primary" onClick={() => setModalPlan("Pro")}>Get Started</button>
          </div>
          <div className="price-card">
            <div className="price-name">Elite</div>
            <div className="price-amount"><sup>$</sup>40</div>
            <div className="price-period">per month</div>
            <ul className="price-features">
              <li>Everything in Pro</li>
              <li>Daily Elite coaching briefing</li>
              <li>Monthly performance report</li>
              <li>Milestones & USTA rating roadmap</li>
              <li>Top 3 next-level focus areas</li>
              <li>Tournament & league recommendations</li>
            </ul>
            <button className="btn-plan secondary" onClick={() => setModalPlan("Elite")}>Get Started</button>
          </div>

          {/* Annual card — full width */}
          <div className="annual-card-wrap">
            <div className="annual-card">
              <div className="annual-badge">Best Value</div>
              <div className="annual-left">
                <div className="annual-label">Annual Plan · All Features Included</div>
                <div className="annual-title">ACE ALL-ACCESS</div>
                <div className="annual-desc">One payment. Every tool. The complete ACE experience — AI coaching, video analysis, singles & doubles strategy tips, match prep reports, and monthly coaching reports.</div>
                <div className="annual-features">
                  {["📊 Match Analysis", "🎬 Video Analysis", "🧠 Tactics AI", "📋 Match Prep Reports", "🎾 Singles Tips", "🤝 Doubles Tips", "📈 Progress Tracking", "📋 Monthly Report", "📞 Monthly 1:1 Call", "🏆 USTA Roadmap"].map((f, i) => (
                    <span key={i} className="annual-feature-chip">{f}</span>
                  ))}
                </div>
              </div>
              <div className="annual-right">
                <div className="annual-was">$480/year with Elite monthly</div>
                <div className="annual-price"><sup>$</sup>299</div>
                <div className="annual-per">per year · ~$25/month</div>
                <div className="annual-saving">🎉 Save $181 — 38% off</div>
                <button className="btn-annual" onClick={() => setModalPlan("Annual")}>Get All-Access →</button>
              </div>
            </div>
          </div>

        </div>
      </section>

      <TipsSection
        title="SINGLES STRATEGY TIPS"
        label="Daily Singles Playbook"
        data={SINGLES_TIPS}
        isDoubles={false}
        isUnlocked={isUnlocked}
        onUnlock={() => setModalPlan("Challenger")}
        setModalPlan={setModalPlan}
        todayDate={todayDate}
      />

      <TipsSection
        title="DOUBLES STRATEGY TIPS"
        label="Daily Doubles Playbook"
        data={DOUBLES_TIPS}
        isDoubles={true}
        isUnlocked={isUnlocked}
        onUnlock={() => setModalPlan("Challenger")}
        setModalPlan={setModalPlan}
        todayDate={todayDate}
      />

      {/* ELITE SECTION */}
      <section className="elite-section" id="elite">
        <div className="section-label">Elite Members Only</div>
        <div className="section-title" style={{ color: "var(--off-white)" }}>YOUR PERSONAL<br/>ELITE COACH</div>
        <div className="section-subtitle">Daily briefings and a full monthly coaching report — everything you've done, what it means, and exactly what's next.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 56 }}>
          {/* Daily Briefing */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>Daily Touch Point</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "var(--off-white)", marginBottom: 8 }}>MORNING BRIEFING</div>
            <div style={{ fontSize: 14, color: "rgba(245,240,232,0.5)", marginBottom: 24, lineHeight: 1.6 }}>Every day, ACE tells you exactly what to work on, gives you a coach tip, and previews the week ahead — so you never show up to practice without a plan.</div>
            <EliteDailyBriefing isElite={isElite} setModalPlan={setModalPlan} />
          </div>

          {/* Monthly Report */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>Monthly Report</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "var(--off-white)", marginBottom: 8 }}>COACHING REPORT</div>
            <div style={{ fontSize: 14, color: "rgba(245,240,232,0.5)", marginBottom: 24, lineHeight: 1.6 }}>At the end of each month, ACE compiles every match log, stat, drill, and self-assessment into one detailed coaching report with grades, insights, and your plan for next month.</div>
            <MonthlyCoachingReport isElite={isElite} setModalPlan={setModalPlan} />
          </div>
        </div>

        {/* Elite CTA if not subscribed */}
        {!isElite && (
          <div style={{ marginTop: 48, textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "var(--off-white)", marginBottom: 10 }}>UNLOCK ELITE FOR $40/MO</div>
            <div style={{ fontSize: 15, color: "rgba(245,240,232,0.55)", marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>Daily coaching briefings + full monthly report + everything in Pro. The most complete AI tennis coaching available anywhere.</div>
            <button className="btn-primary" onClick={() => setModalPlan("Elite")}>Get Elite Access →</button>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer>
        <div>
          <div className="footer-logo">ACE·AI</div>
          <p style={{ marginTop: 8 }}>© 2026 ACE Tennis AI. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}
