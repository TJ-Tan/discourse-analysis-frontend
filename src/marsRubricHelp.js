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
    meaning: 'Depth of instructor questions (ICAP: more Constructive/Interactive → higher).',
    how: 'From ICAP classification: (2×%Constructive + 3×%Interactive)/3 → scaled to 0–10.',
  },
  {
    key: 'sui',
    subgroup: 'Engagement — Question quality',
    code: '3.2.2',
    label: 'Student Uptake Index (SUI) (25% of Question Quality)',
    meaning: 'Extent to which the instructor builds upon or incorporates learner responses into the instructional dialogue.',
    how: 'Heuristic from transcript cues (e.g., “good question”, “building on …”, “to respond to …”). If learner voice is not detectable (common in webcasts), SUI is set conservatively with a disclaimer.',
  },
  {
    key: 'qds',
    subgroup: 'Engagement — Question quality',
    code: '3.2.3',
    label: 'Question Distribution Stability (QDS) (25% of Question Quality)',
    meaning: 'Questions spread across the session vs clustered.',
    how: 'Ten time bins; entropy normalized → 0–10 (needs ≥2 questions).',
  },
  {
    key: 'learner_question_frequency',
    subgroup: 'Engagement — Feedback (20% of Engagement)',
    code: '3.3.1',
    label: 'Question Frequency (10%)',
    meaning: "The frequency with which learners ask follow-up questions during instructional discourse.",
    how: "LLM detects learner/audience questions in the transcript when present. If learner voice is not detectable (common in webcasts), this is set conservatively with a disclaimer (2/10).",
  },
  {
    key: 'learner_question_cognitive',
    subgroup: 'Engagement — Feedback',
    code: '3.3.2',
    label: 'Question Cognitive Level (10%)',
    meaning: "A measure of the cognitive complexity of learners’ questions.",
    how: "LLM estimates Bloom-style depth of detected learner/audience questions. If none are identifiable due to recording limitations, this is set conservatively with a disclaimer (2/10).",
  },
];
