/**
 * Fixed one-line explanations per MARS criterion and score band (for "Why this score").
 * Mirrors backend/MARS_WHY_SCORE_BANDING.md for extraction and consistency.
 */

export const MARS_BANDS = ['0-2', '3-4', '5-6', '7-8', '9-10'];

export function marsBandKey(score) {
  const s = Number(score);
  if (Number.isNaN(s)) return '5-6';
  if (s <= 2) return '0-2';
  if (s <= 4) return '3-4';
  if (s <= 6) return '5-6';
  if (s <= 8) return '7-8';
  return '9-10';
}

const B = MARS_BANDS;

/** Content — nine criteria */
export const WHY_BANDS_CONTENT = {
  structural_sequencing: {
    [B[0]]: 'Little clear progression; ideas feel jumped or out of order.',
    [B[1]]: 'Some structure, but the flow is uneven or hard to follow in places.',
    [B[2]]: 'Generally sensible order; main ideas usually build in a workable sequence.',
    [B[3]]: 'Strong scaffolding: foundations lead clearly toward harder ideas.',
    [B[4]]: 'Excellent sequencing—learners can follow the thread from start to finish.',
  },
  logical_consistency: {
    [B[0]]: 'Frequent contradictions or claims that do not fit together.',
    [B[1]]: 'Several inconsistencies or unclear links between ideas.',
    [B[2]]: 'Mostly coherent; occasional gaps between what was said earlier and later.',
    [B[3]]: 'Arguments and explanations line up well across the session.',
    [B[4]]: 'Very tight logic—statements reinforce each other with few loose ends.',
  },
  closure_framing: {
    [B[0]]: 'Openings and closings do not tie back to goals or summarise learning.',
    [B[1]]: 'Weak framing; learners may be unsure what to take away.',
    [B[2]]: 'Adequate signposting and recap in places, but not always sharp.',
    [B[3]]: 'Clear links to objectives and useful summaries of key points.',
    [B[4]]: 'Strong opening and closing—purpose and takeaways are unmistakable.',
  },
  conceptual_accuracy: {
    [B[0]]: 'Notable inaccuracies or misleading use of key terms.',
    [B[1]]: 'Some concepts are imprecise or could confuse novices.',
    [B[2]]: 'Core ideas are mostly correct with minor slips in terminology.',
    [B[3]]: 'Concepts and relationships are explained accurately and carefully.',
    [B[4]]: 'Disciplinary content is represented very accurately and confidently.',
  },
  causal_reasoning_depth: {
    [B[0]]: 'Almost no “why/how”; mostly labels or assertions.',
    [B[1]]: 'Limited causal explanation; reasoning feels thin.',
    [B[2]]: 'Some cause-and-effect and mechanism, mixed with surface description.',
    [B[3]]: 'Regular use of reasoning chains that explain why things happen.',
    [B[4]]: 'Deep causal explanations that make mechanisms and consequences clear.',
  },
  multi_perspective_explanation: {
    [B[0]]: 'Single angle only; no meaningful alternatives or comparisons.',
    [B[1]]: 'Rarely steps beyond one viewpoint or example.',
    [B[2]]: 'Occasional second angles or contrasts; could go further.',
    [B[3]]: 'Several perspectives or comparisons that enrich understanding.',
    [B[4]]: 'Rich variety of angles—learners see the idea from multiple sides.',
  },
  example_quality_frequency: {
    [B[0]]: 'Few or unhelpful examples; abstractions stay abstract.',
    [B[1]]: 'Sparse examples; quality is hit-and-miss.',
    [B[2]]: 'Enough examples to anchor ideas, with mixed depth.',
    [B[3]]: 'Well-chosen examples that clarify ideas at useful moments.',
    [B[4]]: 'Frequent, high-quality examples that make ideas concrete and memorable.',
  },
  analogy_concept_bridging: {
    [B[0]]: 'No real bridges to prior knowledge; ideas feel isolated.',
    [B[1]]: 'Little use of analogy or familiar hooks.',
    [B[2]]: 'Some analogies or links; not always smooth or well explained.',
    [B[3]]: 'Solid use of comparisons that connect new material to what students know.',
    [B[4]]: 'Powerful analogies and bridges that speed up understanding.',
  },
  representation_diversity: {
    [B[0]]: 'One mode only (e.g. words only); little variety.',
    [B[1]]: 'Limited variety in how ideas are represented.',
    [B[2]]: 'Mix of verbal and occasional other representations.',
    [B[3]]: 'Noticeable variety (e.g. symbols, sketches, cases) supporting the same idea.',
    [B[4]]: 'Strong multi-representation teaching that suits different learners.',
  },
};

export const WHY_BANDS_DELIVERY = {
  speech: {
    [B[0]]: 'Speaking is hard to follow—very fast, cluttered, or unclear much of the time.',
    [B[1]]: 'Pace or clarity is uneven; listeners may strain in several stretches.',
    [B[2]]: 'Generally understandable pace and clarity with some rough patches.',
    [B[3]]: 'Clear, well-paced delivery that most listeners can follow comfortably.',
    [B[4]]: 'Highly intelligible speech—pace, emphasis, and clarity work together very well.',
  },
  body: {
    [B[0]]: 'Little visible engagement—eye contact, posture, or gestures weak or distracting.',
    [B[1]]: 'Non-verbal signals are inconsistent or sometimes closed-off.',
    [B[2]]: 'Adequate presence; gestures and gaze are acceptable but not standout.',
    [B[3]]: 'Open, purposeful body language that supports the message.',
    [B[4]]: 'Strong professional presence—eye contact, posture, and expression align with teaching intent.',
  },
};

export const WHY_BANDS_ENGAGEMENT = {
  question_density: {
    [B[0]]: 'Very few questions for the session length; limited invitation to think aloud.',
    [B[1]]: 'Low questioning rate; only occasional prompts.',
    [B[2]]: 'Moderate frequency of questions—enough to punctuate, not yet dense.',
    [B[3]]: 'Regular questioning that keeps the session intellectually active.',
    [B[4]]: 'High question density—frequent prompts without feeling chaotic.',
  },
  cli_block: {
    [B[0]]: 'Questions stay shallow; little reasoning or dialogue-level prompting.',
    [B[1]]: 'Mostly recall-style prompts; limited higher-order questioning.',
    [B[2]]: 'Mix of recall and some deeper prompts; balance could improve.',
    [B[3]]: 'Solid share of reasoning and dialogue-oriented questions.',
    [B[4]]: 'Strong cognitive mix—many questions invite explanation, comparison, or co-construction.',
  },
  sui: {
    [B[0]]: 'Little evidence of building on learner input (or input not audible).',
    [B[1]]: 'Rare uptake of student ideas; mostly one-way delivery.',
    [B[2]]: 'Some acknowledgement of questions or comments when they appear.',
    [B[3]]: 'Clear efforts to respond to and weave in learner contributions.',
    [B[4]]: 'Strong uptake—student ideas visibly shape the next steps of instruction.',
  },
  qds: {
    [B[0]]: 'Questions bunched in one part of the session or almost absent.',
    [B[1]]: 'Uneven spread—large gaps without questions.',
    [B[2]]: 'Reasonable spread with a few dense or empty stretches.',
    [B[3]]: 'Questions distributed fairly across the timeline.',
    [B[4]]: 'Even, well-timed questioning across the whole session.',
  },
  learner_question_frequency: {
    [B[0]]: 'Few or no identifiable learner questions (often a recording limit).',
    [B[1]]: 'Sparse audience questions or weak detection.',
    [B[2]]: 'Some learner questions when audio allows.',
    [B[3]]: 'Noticeable learner questioning relative to session length.',
    [B[4]]: 'Frequent learner questions or strong evidence of audience inquiry.',
  },
  learner_question_cognitive: {
    [B[0]]: 'Learner questions look shallow or are not distinguishable.',
    [B[1]]: 'Mostly factual or brief queries from learners.',
    [B[2]]: 'Mix of simple and slightly deeper learner questions.',
    [B[3]]: 'Several questions that probe reasoning or implications.',
    [B[4]]: 'Learner questions often reach analysis, synthesis, or evaluation.',
  },
};

function fallbackBandLine(score) {
  const k = marsBandKey(score);
  const map = {
    [B[0]]: 'Score sits in the lowest band—substantial room to strengthen this area.',
    [B[1]]: 'Score sits below mid-range; several improvements would lift the result.',
    [B[2]]: 'Mid-range performance—solid in parts with clear next steps.',
    [B[3]]: 'Strong band—this area supports teaching effectiveness well.',
    [B[4]]: 'Top band—this is a clear strength in the recording analysed.',
  };
  return map[k] || map[B[2]];
}

export function whyLineForContent(key, score) {
  const band = marsBandKey(score);
  return WHY_BANDS_CONTENT[key]?.[band] || fallbackBandLine(score);
}

export function whyLineForDelivery(key, score) {
  const band = marsBandKey(score);
  return WHY_BANDS_DELIVERY[key]?.[band] || fallbackBandLine(score);
}

export function whyLineForEngagement(key, score) {
  const band = marsBandKey(score);
  return WHY_BANDS_ENGAGEMENT[key]?.[band] || fallbackBandLine(score);
}
