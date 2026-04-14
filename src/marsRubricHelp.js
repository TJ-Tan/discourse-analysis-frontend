/**
 * User-facing copy: what each MARS criterion means and how it is computed.
 * Keys match API mars_rubric.content_criteria / teaching_effectiveness.mars_content_criteria.
 */

export const MARS_INTRO = {
  title: 'MARS rubric (how your score is built)',
  summary:
    'Your overall score uses three main blocks: Content (20%), Delivery (40%), and Engagement (40%). ' +
    'Below, each criterion shows your 1–10 rating, what it means, how it is computed, and why this score (with evidence when available).',
};

/** Short notes aligned with the three-pillar model (Content / Delivery / Engagement). */
export const MARS_THREE_PILLARS_AT_A_GLANCE = [
  'The report below follows three pillars — Content (blue), Delivery (orange), Engagement (green) — each with its own sub-sections and criteria.',
  'Overall MARS = 0.20×Content + 0.40×Delivery + 0.40×Engagement (see server metrics_config.MARS_CONFIG).',
  'Delivery is 50% speech + 50% body language from sampled video. Engagement combines instructor questioning with learner-voice signals when visible in the transcript.',
];

/** @deprecated Use MARS_THREE_PILLARS_AT_A_GLANCE */
export const MARS_ARCHITECTURE_AT_A_GLANCE = MARS_THREE_PILLARS_AT_A_GLANCE;

/** Colour key for pillar headers (matches rubric diagram). */
export const MARS_PILLAR_LEGEND = [
  { id: 'content', label: 'Content', weight: '20%', swatch: '#2563eb', border: '#1d4ed8' },
  { id: 'delivery', label: 'Delivery', weight: '40%', swatch: '#ea580c', border: '#c2410c' },
  { id: 'engagement', label: 'Engagement', weight: '40%', swatch: '#16a34a', border: '#15803d' },
];

/** Group Engagement criteria for clearer segmentation in the UI (weights are within the Engagement category). */
export const MARS_ENGAGEMENT_GROUPS = [
  {
    code: '3.1',
    title: 'Instructor question density',
    subtitle: '40% of the Engagement category',
    keys: ['question_density'],
  },
  {
    code: '3.2',
    title: 'Instructor question quality',
    subtitle: '40% of Engagement — CLI, SUI, and QDS combine in the scoring engine',
    keys: ['cli_block', 'sui', 'qds'],
  },
  {
    code: '3.3',
    title: 'Learner / audience voice',
    subtitle: '20% of Engagement',
    keys: ['learner_question_frequency', 'learner_question_cognitive'],
  },
];

/** Shared layout for the segmented results page (three colour-coded pillars). */
export const MARS_RESULT_SEGMENT_STYLES = {
  /** @deprecated use pillarContent | pillarDelivery | pillarEngagement */
  pillar: {
    border: '1px solid var(--gray-200)',
    borderRadius: '14px',
    padding: '1.15rem 1.2rem',
    marginBottom: '1.35rem',
    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 55%)',
  },
  pillarContent: {
    border: '1px solid #bfdbfe',
    borderLeft: '6px solid #2563eb',
    borderRadius: '14px',
    padding: '1.15rem 1.2rem',
    marginBottom: '1.35rem',
    background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 65%)',
  },
  pillarDelivery: {
    border: '1px solid #fed7aa',
    borderLeft: '6px solid #ea580c',
    borderRadius: '14px',
    padding: '1.15rem 1.2rem',
    marginBottom: '1.35rem',
    background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 65%)',
  },
  pillarEngagement: {
    border: '1px solid #bbf7d0',
    borderLeft: '6px solid #16a34a',
    borderRadius: '14px',
    padding: '1.15rem 1.2rem',
    marginBottom: '1.35rem',
    background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 65%)',
  },
  contentSubgroup: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '0.85rem 1rem 1rem',
    marginBottom: '1rem',
    background: '#ffffff',
  },
  contentSubgroupBlue: {
    border: '1px solid #bfdbfe',
    borderLeft: '4px solid #60a5fa',
    borderRadius: '12px',
    padding: '0.85rem 1rem 1rem',
    marginBottom: '1rem',
    background: '#ffffff',
  },
  contentSubgroupGreen: {
    border: '1px solid #bbf7d0',
    borderLeft: '4px solid #4ade80',
    borderRadius: '12px',
    padding: '0.85rem 1rem 1rem',
    marginBottom: '1rem',
    background: '#ffffff',
  },
  glance: {
    marginBottom: '1.25rem',
    padding: '0.9rem 1rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #fff7ed 50%, #f0fdf4 100%)',
    borderRadius: '12px',
    border: '1px solid var(--gray-200)',
    fontSize: '0.88rem',
    lineHeight: 1.55,
    color: 'var(--gray-800)',
  },
};

/** Heading colours for each pillar (use with matching pillar box). */
export const MARS_PILLAR_HEADING = {
  content: { color: '#1e40af' },
  delivery: { color: '#c2410c' },
  engagement: { color: '#15803d' },
};

/** Structured hierarchy for the Content block */
export const MARS_CONTENT_MAIN = {
  code: '1',
  title: 'Content (20% of overall)',
};

export const MARS_CONTENT_SECTIONS = [
  {
    code: '1.1',
    title: 'Content Organisation (30% of Content)',
    criteriaKeys: ['structural_sequencing', 'logical_consistency', 'closure_framing'],
  },
  {
    code: '1.2',
    title: 'Explanation Quality (40% of Content)',
    criteriaKeys: ['conceptual_accuracy', 'causal_reasoning_depth', 'multi_perspective_explanation'],
  },
  {
    code: '1.3',
    title: 'Use of Examples / Representation (30% of Content)',
    criteriaKeys: ['example_quality_frequency', 'analogy_concept_bridging', 'representation_diversity'],
  },
];

export const MARS_DELIVERY_MAIN = { code: '2', title: 'Delivery (40% of overall)' };
export const MARS_ENGAGEMENT_MAIN = { code: '3', title: 'Engagement (40% of overall)' };

/** Content — nine criteria */
export const MARS_CONTENT_CRITERIA = [
  {
    key: 'structural_sequencing',
    subgroup: 'Content Organisation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Structural Sequencing',
    meaning: 'Ideas are presented in a logical order—from foundations to more complex ideas.',
    how: 'LLM scores the full transcript (with your lecture context when provided) for progression and scaffolding.',
  },
  {
    key: 'logical_consistency',
    subgroup: 'Content Organisation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Logical Consistency',
    meaning: 'Claims and explanations fit together without contradictions.',
    how: 'LLM evaluates coherence across the transcript.',
  },
  {
    key: 'closure_framing',
    subgroup: 'Content Organisation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Closure / Framing',
    meaning: 'Openings and closings tie to objectives and summarise key ideas.',
    how: 'LLM detects summaries, recap, and links back to learning goals.',
  },
  {
    key: 'conceptual_accuracy',
    subgroup: 'Explanation Quality (40% of Content)',
    weightInSubgroup: 'Shown as /20 marks in §1.2 (maps from the same 0–10 model ×2)',
    label: 'Conceptual Accuracy',
    meaning: 'Disciplinary concepts, terms, and relationships are represented correctly.',
    how: 'LLM scores accuracy vs the subject; weighted 0.2 within the Explanation Quality sub-score (0.4×CA + 0.1×CR + 0.1×MP) / 0.4.',
  },
  {
    key: 'causal_reasoning_depth',
    subgroup: 'Explanation Quality (40% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Causal Reasoning Depth',
    meaning: 'Explanations stress why and how—not only what happened.',
    how: 'Combines LLM rating with density of causal language (e.g. “because”, “therefore”) in the transcript.',
  },
  {
    key: 'multi_perspective_explanation',
    subgroup: 'Explanation Quality (40% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Multi-Perspective Explanation',
    meaning: 'Multiple angles, models, or comparisons help learners see the idea from more than one path.',
    how: 'LLM looks for contrasts, alternatives, and “another way to see this”.',
  },
  {
    key: 'example_quality_frequency',
    subgroup: 'Use of Examples / Representation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Example Quality & Frequency',
    meaning: 'Concrete examples clarify abstract ideas often enough and at useful quality.',
    how: 'LLM rates how well examples support learning.',
  },
  {
    key: 'analogy_concept_bridging',
    subgroup: 'Use of Examples / Representation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Analogy / Concept Bridging',
    meaning: 'Analogies connect new ideas to what students already know.',
    how: 'LLM plus cues like “like”, “similar to”, “think of…”.',
  },
  {
    key: 'representation_diversity',
    subgroup: 'Use of Examples / Representation (30% of Content)',
    weightInSubgroup: '10% of Content block',
    label: 'Representation Diversity',
    meaning: 'More than one representation (verbal, symbolic, references to diagrams, etc.).',
    how: 'LLM checks for varied representations described in speech.',
  },
];

/** Delivery — two halves, five metrics each */
export const MARS_DELIVERY_CRITERIA = [
  {
    key: 'speech',
    subgroup: 'Delivery (40% of overall) — Speech half',
    label: 'Speech Analysis (50% of Delivery)',
    meaning: 'Pace, fluency, clarity of transcription, voice variety, and strategic pauses.',
    how: 'Five metrics from audio analysis (WPM, filler ratio, Whisper confidence, prosody, pause model) → one 0–10 speech category score.',
  },
  {
    key: 'body',
    subgroup: 'Delivery (40% of overall) — Body half',
    label: 'Body Language (50% of Delivery)',
    meaning: 'Eye contact, gestures, posture, facial engagement, professional appearance.',
    how: 'Vision model scores sampled frames; scores aggregated over time.',
  },
];

/** Engagement */
export const MARS_ENGAGEMENT_CRITERIA = [
  {
    key: 'question_density',
    subgroup: 'Engagement (40% of overall)',
    code: '3.1',
    label: 'Question Density (40% of Engagement)',
    meaning: 'How often you pose questions per minute.',
    how: 'Questions detected from transcript (?); banded score 0–10 from questions per minute.',
  },
  {
    key: 'cli_block',
    subgroup: 'Engagement — Question quality (40% of Engagement)',
    code: '3.2.1',
    label: 'Cognitive Level Index (CLI) (50% of Question Quality)',
    meaning: 'Depth of instructor questions (ICAP: Interactive share drives the score).',
    how: 'Share of questions labelled Interactive: >20%→9/10; 10–20%→7/10; 5–<10%→5/10; <5%→3/10; small bump if many Constructive prompts.',
  },
  {
    key: 'sui',
    subgroup: 'Engagement — Question quality',
    code: '3.2.2',
    label: 'Student Uptake Index (SUI) (25% of Question Quality)',
    meaning: 'Extent to which the instructor builds upon or incorporates learner responses into the instructional dialogue.',
    how: 'Transcript uptake cues after each question when visible. On webcasts (no reliable audience audio), the score also uses a prompting-density proxy from Active / Constructive / Interactive questions per minute so heavy questioning is not forced to ~2/10.',
  },
  {
    key: 'qds',
    subgroup: 'Engagement — Question quality',
    code: '3.2.3',
    label: 'Question Distribution Stability (QDS) (25% of Question Quality)',
    meaning: 'Whether questions appear across the whole lecture timeline, not only in one segment.',
    how: 'Lecture duration is split into 5 equal fifths (0–20%, 20–40%, …). Each fifth that contains at least one question earns 2 points (maximum 10).',
  },
  {
    key: 'learner_question_frequency',
    subgroup: 'Engagement — Feedback (20% of Engagement)',
    code: '3.3.1',
    label: 'Question Frequency (10%)',
    meaning: "The frequency with which learners ask follow-up questions during instructional discourse.",
    how: "LLM detects learner/audience questions in the transcript when present. If learner voice is not evidenced (typical webcasts), this subscore defaults to neutral 5/10 so engagement is not double-penalised against instructor prompting.",
  },
  {
    key: 'learner_question_cognitive',
    subgroup: 'Engagement — Feedback',
    code: '3.3.2',
    label: 'Question Cognitive Level (10%)',
    meaning: "A measure of the cognitive complexity of learners’ questions.",
    how: "LLM estimates Bloom-style depth of detected learner/audience questions. If none are identifiable due to recording limitations, this subscore defaults to neutral 5/10 (same rationale as learner frequency).",
  },
];

/** Keys aligned with `speech_analysis.metric_scores` in API results. */
const SPEECH_METRIC_SCORE_KEYS = [
  'speaking_rate',
  'filler_ratio',
  'voice_variety',
  'pause_effectiveness',
  'transcription_confidence',
];

/** Sum of five speech sub-metrics (each 0–10) → out of 50 for display. */
export function sumSpeechMetricsOutOf50(speechAnalysis) {
  const m = speechAnalysis?.metric_scores || {};
  let sum = 0;
  for (const k of SPEECH_METRIC_SCORE_KEYS) {
    const x = Number(m[k]);
    if (!Number.isNaN(x)) sum += x;
  }
  return Math.round(sum * 10) / 10;
}

/** Sum of five vision sub-means (each 0–10) → out of 50 for display. */
export function sumBodyVisionOutOf50(bodyLanguage) {
  const bl = bodyLanguage || {};
  const vals = [
    Number(bl.eye_contact ?? bl.raw_metrics?.eye_contact_raw ?? NaN),
    Number(bl.gestures ?? bl.raw_metrics?.gestures_raw ?? NaN),
    Number(bl.posture ?? bl.raw_metrics?.posture_raw ?? NaN),
    Number(bl.engagement ?? bl.raw_metrics?.engagement_raw ?? NaN),
    Number(bl.professionalism ?? bl.raw_metrics?.professionalism_raw ?? NaN),
  ];
  let sum = 0;
  for (const x of vals) {
    if (!Number.isNaN(x)) sum += x;
  }
  return Math.round(sum * 10) / 10;
}

export function formatContentCriterionScoreLabel(criterionKey, scoreOutOf10) {
  if (scoreOutOf10 == null || Number.isNaN(Number(scoreOutOf10))) return null;
  const v = Number(scoreOutOf10);
  if (criterionKey === 'conceptual_accuracy') return `${(v * 2).toFixed(1)}/20`;
  return `${v.toFixed(1)}/10`;
}

/** Engagement row labels on alternate “mark” scales (API still stores 0–10 for these inputs). */
export function formatEngagementRowScoreLabel(rowKey, scoreOutOf10) {
  if (scoreOutOf10 == null || Number.isNaN(Number(scoreOutOf10))) return null;
  const v = Number(scoreOutOf10);
  if (rowKey === 'question_density') return `${(v * 4).toFixed(1)}/40`;
  if (rowKey === 'cli_block') return `${(v * 2).toFixed(1)}/20`;
  return `${v.toFixed(1)}/10`;
}

function _normalizeContentAdjustment(raw) {
  if (!raw) return null;
  const pen = Number(raw.penalty_points || 0);
  if (pen < 0.01) return null;
  return {
    before_penalty: Number(raw.before_penalty),
    penalty_points: pen,
    after_penalty: Number(raw.after_penalty),
    detail: raw.detail || null,
  };
}

/**
 * Best-effort Content Context-Aware adjustment for UI.
 * Prefer mars_rubric.content_subscores (authoritative for the rubric view), then fall back to calculation_breakdown.
 * Also infers a −5 style penalty when verdict is mismatch but legacy payloads omitted penalty_points.
 */
export function inferContentAdjustmentFromResults(results) {
  const direct = results?.calculation_breakdown?.final_calculation?.content_adjustment;
  const sub = results?.mars_rubric?.content_subscores || {};
  let pen = Number(sub.content_context_misalignment_penalty_points || 0);
  const verdict = String(sub.context_alignment_verdict || '').toLowerCase().trim();
  let before = sub.content_before_penalty != null ? Number(sub.content_before_penalty) : null;
  const after = results?.mars_rubric?.content_score != null ? Number(results.mars_rubric.content_score) : null;

  if (before == null && after != null && pen >= 0.01) {
    before = after + pen;
  }
  if (pen < 0.01 && verdict === 'mismatch' && before != null && after != null) {
    const inferred = Math.min(5, Math.max(0, before - after));
    if (inferred >= 0.5) {
      pen = inferred;
    }
  }

  if (pen >= 0.01 && before != null && after != null) {
    const bp = Math.round(before * 100) / 100;
    const ap = Math.round(after * 100) / 100;
    const pp = Math.round(pen * 100) / 100;
    return {
      before_penalty: bp,
      penalty_points: pp,
      after_penalty: ap,
      detail: `Content (used in MARS) = max(0, ${bp} − ${Math.round(pp)}) = ${ap}`,
    };
  }

  return _normalizeContentAdjustment(direct);
}

/** Canonical MARS overall from the three pillar scores (matches server weights). */
export function computeMarsOverallFromRubric(results) {
  const c = Number(results?.mars_rubric?.content_score);
  const d = Number(results?.mars_rubric?.delivery_score);
  const e = Number(results?.mars_rubric?.engagement_score);
  if ([c, d, e].some((x) => Number.isNaN(x))) return null;
  return Math.round((0.2 * c + 0.4 * d + 0.4 * e) * 10) / 10;
}

/** Same as computeMarsOverallFromRubric, but displayed on a /100 scale. */
export function computeMarsOverallFromRubricOutOf100(results) {
  const v10 = computeMarsOverallFromRubric(results);
  if (v10 == null || Number.isNaN(Number(v10))) return null;
  return Math.round(Number(v10) * 100) / 10; // 1 decimal on /100
}

/**
 * Penalty-aware formula + substitution lines for the Score Calculation Breakdown card.
 * Uses mars_rubric pillar scores so the UI stays consistent even if calculation_breakdown is stale.
 */
export function getFinalCalculationView(results) {
  const fromApi = results?.calculation_breakdown?.final_calculation;
  const rubric = results?.mars_rubric;
  if (!rubric) {
    const result10 = fromApi?.result != null ? Number(fromApi.result) : Number(results?.overall_score) || 0;
    const result100 = Math.round(result10 * 100) / 10;
    return {
      formula: 'MARS (/100): 0.20×Content + 0.40×Delivery + 0.40×Engagement',
      calculation: fromApi?.calculation ? `${fromApi.calculation} (scores shown on /10)` : '',
      calculation_note: fromApi?.calculation_note || null,
      result: result100,
    };
  }

  const c = Number(rubric.content_score);
  const d = Number(rubric.delivery_score);
  const e = Number(rubric.engagement_score);
  const adj = inferContentAdjustmentFromResults(results);
  const recomputed = computeMarsOverallFromRubric(results);
  const result10 = recomputed != null ? recomputed : Number(results?.overall_score) || 0;
  const result100 = Math.round(Number(result10) * 100) / 10;
  const c100 = Number.isFinite(c) ? c * 10 : 0;
  const d100 = Number.isFinite(d) ? d * 10 : 0;
  const e100 = Number.isFinite(e) ? e * 10 : 0;

  if (!adj) {
    return {
      formula: 'MARS (/100): 0.20×Content + 0.40×Delivery + 0.40×Engagement',
      calculation: `0.20×${c100.toFixed(1)} + 0.40×${d100.toFixed(1)} + 0.40×${e100.toFixed(1)}`,
      calculation_note: fromApi?.calculation_note || null,
      result: result100,
    };
  }

  const penInt = Math.round(Number(adj.penalty_points));
  const before = Number(adj.before_penalty);
  const after = Number(adj.after_penalty);
  const before100 = before * 10;
  const after100 = after * 10;
  const pen100 = penInt * 10;
  return {
    formula: 'MARS (/100): 0.20×(Content_rubric − Penalty) + 0.40×Delivery + 0.40×Engagement',
    calculation: `0.20×(${before100.toFixed(1)} − ${pen100}) + 0.40×${d100.toFixed(1)} + 0.40×${e100.toFixed(1)} = 0.20×${after100.toFixed(1)} + 0.40×${d100.toFixed(1)} + 0.40×${e100.toFixed(1)}`,
    calculation_note:
      `Penalty is applied inside Content before the 20% weight: Content_used = max(0, Content_rubric − Penalty) = max(0, ${before100.toFixed(1)} − ${pen100}) = ${after100.toFixed(1)}/100.`,
    result: result100,
  };
}
