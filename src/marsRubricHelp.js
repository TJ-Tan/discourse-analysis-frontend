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
    weightInSubgroup: '20% of Content (20/20 for full marks in this criterion)',
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
