/**
 * User-facing copy: what each MARS criterion means and how it is computed.
 * Keys match API mars_rubric.content_criteria / teaching_effectiveness.mars_content_criteria.
 */

export const MARS_INTRO = {
  title: 'MARS rubric (how your score is built)',
  summary:
    'Your overall score uses three main blocks: Content (20%), Delivery (40%), and Engagement (40%). ' +
    'Below, each criterion shows your 1–10 rating, a plain-language meaning, and how the system computes it.',
};

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
    weightInSubgroup: '20% of Content block (double weight in this group)',
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
    label: 'Question Density (40% of Engagement)',
    meaning: 'How often you pose questions per minute.',
    how: 'Questions detected from transcript (?); banded score 0–10 from questions per minute.',
  },
  {
    key: 'cli_block',
    subgroup: 'Engagement — Question quality block (40% of Engagement)',
    label: 'CLI — Cognitive Level Index (50% of this block)',
    meaning: 'Depth of instructor questions (ICAP: more Constructive/Interactive → higher).',
    how: 'From ICAP classification: (2×%Constructive + 3×%Interactive)/3 → scaled to 0–10.',
  },
  {
    key: 'sui',
    subgroup: 'Engagement — Question quality block',
    label: 'SUI — Student Uptake Index (25% of this block)',
    meaning: 'Higher-order questions per minute (proxy for uptake/dialogue).',
    how: 'EQD = (Constructive+Interactive)/minute; score = 3 + 2.5×EQD (capped 0–10).',
  },
  {
    key: 'qds',
    subgroup: 'Engagement — Question quality block',
    label: 'QDS — Question Distribution Stability (25% of this block)',
    meaning: 'Questions spread across the session vs clustered.',
    how: 'Ten time bins; entropy normalized → 0–10 (needs ≥2 questions).',
  },
  {
    key: 'learner_feedback',
    subgroup: 'Engagement — Feedback (20% of Engagement)',
    label: 'Learner question frequency & cognitive level',
    meaning: 'Audience follow-up questions (when audible/visible in transcript).',
    how: 'LLM estimates frequency and Bloom-style depth; webcasts often score 0 with a remark if no audience audio.',
  },
];
