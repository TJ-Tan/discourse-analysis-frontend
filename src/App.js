import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Download,
  FileText,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import {
  MARS_INTRO,
  MARS_CONTENT_CRITERIA,
  MARS_CONTENT_MAIN,
  MARS_CONTENT_SECTIONS,
  MARS_DELIVERY_MAIN,
  MARS_DELIVERY_CRITERIA,
  MARS_ENGAGEMENT_MAIN,
  MARS_ENGAGEMENT_CRITERIA,
} from './marsRubricHelp';
import {
  whyLineForContent,
  whyLineForDelivery,
  whyLineForEngagement,
} from './marsWhyBanding';
import './App.css';

// Use environment variable for API URL, fallback to production
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://discourse-analysis-backend.up.railway.app';

/** When /generate-pdf-summary fails: substantive alignment note or explicit no-context (matches backend heuristic). */
function summaryFallbackContextLine(lectureContext, transcriptExcerpt) {
  const lc = (lectureContext || '').trim();
  if (!lc) {
    return (
      ' No instructor context was provided for this lecture (for example module, topic, or intended learning outcomes), ' +
      'so stated-versus-delivered alignment cannot be assessed from the submission.'
    );
  }
  const tex = (transcriptExcerpt || '').toLowerCase();
  const junk = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'lecture', 'session', 'course',
    'students', 'student', 'learning', 'module', 'topic', 'about', 'into', 'their', 'what', 'when',
    'where', 'which', 'there', 'these', 'those',
  ]);
  const matches = (lc.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((w) => !junk.has(w));
  const words = [...new Set(matches)].slice(0, 50);
  let hits = 0;
  for (const w of words) {
    if (tex.includes(w)) hits += 1;
  }
  if (hits >= 2) {
    return (
      ' Against the instructor-supplied context, the transcript excerpt shows overlapping themes and terminology, ' +
      'suggesting broadly aligned delivery within the sample reviewed (you should still confirm against the full session and official ILOs).'
    );
  }
  if (hits === 1) {
    return (
      ' Against the instructor-supplied context, overlap with the transcript excerpt is limited; ' +
      'it is worth checking whether the full recording matches your stated module focus and outcomes.'
    );
  }
  return (
    ' Against the instructor-supplied context, keyword overlap with the transcript excerpt is weak; ' +
    'verify whether spoken content matches your intended module, topic, and learning outcomes.'
  );
}

/** Ensure we always have displayable text from API shape (personalized_feedback or paragraph_*). */
function normalizeSummaryFromServer(summary) {
  if (!summary || typeof summary !== 'object') return null;
  const direct = String(summary.personalized_feedback || '').trim();
  if (direct) {
    return { ...summary, personalized_feedback: direct };
  }
  const p1 = String(summary.paragraph_overall || summary.paragraph1 || '').trim();
  const p2 = String(summary.paragraph_strengths || summary.paragraph2 || '').trim();
  const p3 = String(summary.paragraph_growth || summary.paragraph3 || '').trim();
  if (p1 && p2 && p3) {
    return { ...summary, personalized_feedback: `${p1}\n\n${p2}\n\n${p3}` };
  }
  const joined = [p1, p2, p3].filter(Boolean).join('\n\n').trim();
  if (joined) {
    return { ...summary, personalized_feedback: joined };
  }
  return null;
}

/** Client-only three-paragraph summary when the API omits text, times out, or returns a non-JSON body. */
function buildLocalFallbackSummary(results) {
  if (!results) {
    return {
      personalized_feedback: 'Summary could not be generated because analysis results are missing.',
      strongest_strength: null,
      improvements: [],
    };
  }
  const overallScore = Math.round(results.overall_score * 10) / 10;
  const totalQuestions = results.interaction_engagement?.total_questions || 0;
  const scores = {
    Content: Math.round((results.mars_rubric?.content_score || 0) * 10) / 10,
    Delivery: Math.round((results.mars_rubric?.delivery_score || 0) * 10) / 10,
    Engagement: Math.round((results.mars_rubric?.engagement_score || 0) * 10) / 10,
  };
  const strongest = Object.entries(scores).reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  const weakest = Object.entries(scores).reduce((best, cur) => (cur[1] < best[1] ? cur : best));
  const strengthsExtra = (results.strengths || []).slice(0, 5).filter(Boolean);
  const growthExtra = (results.improvement_suggestions || []).slice(0, 5).filter(Boolean);
  const rubricWeave = [
    strengthsExtra.length ? `Rubric signals include ${strengthsExtra.join('; ')}.` : '',
    growthExtra.length ? `Development themes include ${growthExtra.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const qPart =
    totalQuestions === 0
      ? 'Few or no instructor questions were detected; engagement scores should be read cautiously.'
      : 'The session includes many instructor prompts; the profile appears weighted toward lower-demand questions rather than sustained dialogue, which aligns with the Engagement score.';
  const ctx = (results.lecture_context || '').trim();
  const excerptForCtx = (results.full_transcript?.text || '').substring(0, 2000);
  const ctxLine = summaryFallbackContextLine(ctx, excerptForCtx);
  const p1 = `The lecture’s overall MARS score is ${overallScore}/10, with Content at ${scores.Content}/10, Delivery at ${scores.Delivery}/10, and Engagement at ${scores.Engagement}/10. The pattern suggests comparatively stronger performance in ${strongest[0]} and more limited impact in ${weakest[0]} for active learning in this recording.${ctxLine} ${qPart} ${rubricWeave}`.trim();
  const p2 = `Strengths include ${strongest[0].toLower()} (${strongest[1]}/10), which supports a coherent and comprehensible learning experience when the spoken content matches the intended session aims.`;
  const p3 = `A constructive next step is to further strengthen ${weakest[0].toLower()} (${weakest[1]}/10), for example through more purposeful questioning, broader distribution of prompts across the session, and facilitation that makes learner thinking more visible—recognising that webcasts may not capture all classroom dialogue.`;
  return {
    personalized_feedback: `${p1}\n\n${p2}\n\n${p3}`,
    strongest_strength: null,
    improvements: [],
  };
}

function App() {
  const [file, setFile] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState({
    status: 'idle',
    progress: 0,
    message: 'Ready to start analysis',
    timestamp: Date.now()
  });
  const [results, setResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisTiming, setAnalysisTiming] = useState(null);
  const [, setShowParameters] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);
  const [logMessages, setLogMessages] = useState([]);
  const logContainerRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isStopping, setIsStopping] = useState(false);
  const [deploymentTime, setDeploymentTime] = useState(null);
  /** Matches GitHub commit depth on deployed API `main` when git is available; else BACKEND_COMMIT_COUNT on host. */
  const [backendBuildIndex, setBackendBuildIndex] = useState(null);
  const [backendCommitSha, setBackendCommitSha] = useState(null);
  const [queueList, setQueueList] = useState([]);
  const [isQueued, setIsQueued] = useState(false);
  const [userAnalysisId, setUserAnalysisId] = useState(null);
  const uploadCancelToken = useRef(null);
  const [summaryData, setSummaryData] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [isPasskeyValid, setIsPasskeyValid] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  /** Optional: subject, topic, ILOs — sent to backend for LLM context (future rubric scoring). */
  const [lectureContext, setLectureContext] = useState('');

  // Generate summary when results are available
  useEffect(() => {
    const generateSummary = async () => {
      if (!results || summaryData) return; // Don't regenerate if already exists

      setIsGeneratingSummary(true);
      let nextSummary = null;
      try {
        const summaryDataForAPI = {
          overall_score: Math.round(results.overall_score * 10) / 10,
          content_score: Math.round((results.mars_rubric?.content_score || 0) * 10) / 10,
          delivery_score: Math.round((results.mars_rubric?.delivery_score || 0) * 10) / 10,
          engagement_score: Math.round((results.mars_rubric?.engagement_score || 0) * 10) / 10,
          speech_score: Math.round(results.speech_analysis?.score * 10) / 10,
          body_language_score: Math.round(results.body_language?.score * 10) / 10,
          teaching_effectiveness_score: Math.round(results.teaching_effectiveness?.score * 10) / 10,
          interaction_score: Math.round((results.interaction_engagement?.score || 0) * 10) / 10,
          presentation_score: Math.round(results.presentation_skills?.score * 10) / 10,
          high_level_questions: results.interaction_engagement?.high_level_questions || [],
          all_questions: results.interaction_engagement?.all_questions || [],
          audience_questions: results.interaction_engagement?.audience_questions || [],
          icap_counts: results.interaction_engagement?.icap_counts || {},
          total_questions: results.interaction_engagement?.total_questions || 0,
          questions_per_minute: results.interaction_engagement?.questions_per_minute ?? 0,
          eqd_per_minute: results.interaction_engagement?.eqd_per_minute ?? 0,
          lecture_context: results.lecture_context || '',
          transcript_excerpt: results.full_transcript?.text?.substring(0, 2000) || '',
          sample_frames_count: results.sample_frames?.length || 0,
          filler_words: results.speech_analysis?.filler_details?.slice(0, 5) || [],
          extra_strengths: results.strengths || [],
          extra_growth: results.improvement_suggestions || [],
          explanations: {
            speech: results.speech_analysis?.explanations || {},
            body_language: results.body_language?.explanations || {},
            teaching: results.teaching_effectiveness?.explanations || {},
            interaction: results.interaction_engagement?.explanations || {},
            presentation: results.presentation_skills?.explanations || {}
          }
        };

        const response = await axios.post(`${API_BASE_URL}/generate-pdf-summary`, summaryDataForAPI, {
          timeout: 120000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200 && response.data && response.data.summary) {
          nextSummary = normalizeSummaryFromServer(response.data.summary);
        } else {
          console.warn('Summary API non-200 or missing summary:', response.status, response.data);
        }
      } catch (error) {
        console.error('Error generating summary:', error);
      }

      if (!nextSummary) {
        nextSummary = {
          ...buildLocalFallbackSummary(results),
          summary_provenance: 'client_fallback',
        };
      }
      setSummaryData(nextSummary);
      setIsGeneratingSummary(false);
    };

    generateSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- summaryData intentionally excluded to avoid re-run on summary change
  }, [results]);

  // Fetch deployment time on mount
  useEffect(() => {
    const fetchDeploymentTime = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/deployment-info`, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });
        if (response && response.data) {
          if (response.data.backend_build_index != null && response.data.backend_build_index !== '') {
            const n = Number(response.data.backend_build_index);
            setBackendBuildIndex(Number.isFinite(n) ? n : null);
          } else {
            setBackendBuildIndex(null);
          }
          setBackendCommitSha(response.data.backend_commit_sha_short || null);
        }
        if (response && response.data && response.data.deployment_time_formatted) {
          setDeploymentTime(response.data.deployment_time_formatted);
        } else if (response && response.data && response.data.deployment_time) {
          // Fallback: format the ISO timestamp ourselves
          const date = new Date(response.data.deployment_time);
          const formatted = date.toLocaleString('en-SG', {
            timeZone: 'Asia/Singapore',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          setDeploymentTime(formatted);
        }
      } catch (error) {
        // Silently fail - fallback to current time
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Could not fetch deployment time:', error.message);
        }
      }
    };
    fetchDeploymentTime();
  }, []);

  // Format timestamp to Singapore time
  const formatSingaporeTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Enhanced bokeh effects with variation and motion
  useEffect(() => {
    const createBokeh = () => {
      const bokehContainer = document.getElementById('bokeh-container');
      if (!bokehContainer) return;

      // Fade out existing stars before removing them
      const existingStars = bokehContainer.querySelectorAll('.star');
      if (existingStars.length > 0) {
        existingStars.forEach(star => {
          star.style.transition = 'opacity 1.5s ease-out';
          star.style.opacity = '0';
        });
        
        // Wait for fade out, then clear and create new stars
        setTimeout(() => {
          bokehContainer.innerHTML = '';
          createNewStars(bokehContainer);
        }, 1500);
      } else {
        // No existing stars, create immediately
        createNewStars(bokehContainer);
      }
    };

    const createNewStars = (bokehContainer) => {
      // Create realistic starry night background
      const starCount = 150; // More stars for realistic effect
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Realistic star sizes (tiny to medium)
        const size = Math.random() * 3 + 1; // 1px to 4px
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.position = 'absolute'; // Ensure stars are positioned absolutely within fixed container
        
        // Random position across entire viewport
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Enhanced star colors with more brightness variation
        const starColors = [
          'rgba(255, 255, 255, 1)',      // Pure white (brightest stars)
          'rgba(255, 255, 255, 0.95)',   // Very bright white
          'rgba(255, 255, 255, 0.9)',    // Bright white
          'rgba(255, 255, 255, 0.8)',    // Medium white
          'rgba(255, 255, 255, 0.7)',    // Dimmer white
          'rgba(255, 255, 255, 0.6)',    // Dim white
          'rgba(240, 248, 255, 0.9)',    // Pale blue-white (bright)
          'rgba(230, 240, 255, 0.8)',    // Light blue-white
          'rgba(220, 230, 255, 0.7)',    // Very light blue-white
          'rgba(200, 220, 255, 0.6)',    // Subtle blue-white
          'rgba(255, 248, 240, 0.8)',    // Warm white
          'rgba(255, 240, 220, 0.7)'     // Soft warm white
        ];
        star.style.backgroundColor = starColors[Math.floor(Math.random() * starColors.length)];
        
        // Start with opacity 0 for fade-in effect
        star.style.opacity = '0';
        star.style.transition = 'opacity 1.5s ease-in';
        
        // Enhanced twinkling effect for more stars with stronger animation
        if (Math.random() < 0.5) { // 50% of stars twinkle (increased from 30%)
          const twinkleDuration = Math.random() * 3 + 1.5; // 1.5-4.5 seconds (faster)
          const twinkleDelay = Math.random() * 1.5; // 0-1.5 second delay
          star.style.animation = `starTwinkle ${twinkleDuration}s ease-in-out infinite ${twinkleDelay}s`;
        }
        
        // Enhanced fade effect for more stars
        if (Math.random() < 0.3) { // 30% of stars fade (increased from 20%)
          const fadeDuration = Math.random() * 4 + 3; // 3-7 seconds
          const fadeDelay = Math.random() * 2; // 0-2 second delay
          star.style.animation = `starFade ${fadeDuration}s ease-in-out infinite ${fadeDelay}s`;
        }
        
        // New brightness variation effect for some stars
        if (Math.random() < 0.25) { // 25% of stars have brightness variation
          const brightnessDuration = Math.random() * 5 + 4; // 4-9 seconds
          const brightnessDelay = Math.random() * 2.5; // 0-2.5 second delay
          star.style.animation = `starBrightness ${brightnessDuration}s ease-in-out infinite ${brightnessDelay}s`;
        }
        
        bokehContainer.appendChild(star);
        
        // Trigger fade-in after a tiny delay to ensure DOM is ready
        setTimeout(() => {
          star.style.opacity = '1';
        }, 10);
      }
    };

    createBokeh();
    
    // Recreate bokeh every 30 seconds for variety
    const interval = setInterval(createBokeh, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Shooting stars effect
  useEffect(() => {
    // Create a dedicated container for shooting stars with higher z-index
    let shootingStarContainer = document.getElementById('shooting-stars-container');
    if (!shootingStarContainer) {
      shootingStarContainer = document.createElement('div');
      shootingStarContainer.id = 'shooting-stars-container';
      shootingStarContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      `;
      document.body.appendChild(shootingStarContainer);
    }

    const createShootingStar = () => {
      if (!shootingStarContainer) return;

      // Create a single shooting star with randomized properties
      const shootingStar = document.createElement('div');
      shootingStar.className = 'shooting-star';
      
      // 3. Horizontal starting position: varies 0-75% of screen from right
      // 0% = at right edge, 75% = 75% of screen width from right edge
      const horizontalOffset = window.innerWidth * (Math.random() * 0.75); // 0-75% of screen width
      const startX = window.innerWidth - horizontalOffset; // Position from right edge
      
      // Vertical position: random across entire screen height
      const startY = window.innerHeight * Math.random(); // 0-100% of height
      
      shootingStar.style.left = `${startX}px`;
      shootingStar.style.top = `${startY}px`;
      
      // Fixed direction: 30 degrees from horizontal, going down-left
      const angle = 30;
      const radians = (angle * Math.PI) / 180;
      
      // Calculate distance needed to travel to extreme left of screen (and slightly beyond)
      const requiredXDistance = startX + 200; // Distance to travel horizontally
      const totalDistance = requiredXDistance / Math.cos(radians);
      
      // Calculate direction: going left (negative X) and down (positive Y) at 30 degrees
      const shootX = -Math.cos(radians) * totalDistance;
      const shootY = Math.sin(radians) * totalDistance;
      
      // Calculate trail angle from actual movement direction
      const trailAngleRad = Math.atan2(shootY, shootX);
      const trailAngle = (trailAngleRad * 180) / Math.PI;
      
      // 4. Size randomized for 50% variance
      // Base: 300px length, 2px thickness
      // Variance: ±50% = 150-450px length, 1-3px thickness
      const baseLength = 300;
      const baseThickness = 2;
      const sizeMultiplier = 0.5 + (Math.random() * 0.5); // 0.5 to 1.0 (50% variance)
      const starLength = baseLength * sizeMultiplier;
      const starThickness = baseThickness * sizeMultiplier;
      
      // 5. Brightness and transparency randomized for 70% variance
      // Base brightness: 1.0 (100% opacity)
      // Variance: ±70% = 0.3 to 1.0 opacity
      const brightnessMultiplier = 0.3 + (Math.random() * 0.7); // 0.3 to 1.0 (70% variance)
      
      shootingStar.style.setProperty('--shoot-distance-x', `${shootX}px`);
      shootingStar.style.setProperty('--shoot-distance-y', `${shootY}px`);
      shootingStar.style.setProperty('--trail-angle', `${trailAngle}deg`);
      shootingStar.style.setProperty('--star-length', `${starLength}px`);
      shootingStar.style.setProperty('--star-thickness', `${starThickness}px`);
      shootingStar.style.setProperty('--star-brightness', brightnessMultiplier);
      
      // 2. Speed varies between 150-250px/second
      const speed = 150 + Math.random() * 100; // 150-250px per second
      const duration = totalDistance / speed;
      
      shootingStar.style.animation = `shootingStar ${duration}s linear forwards`;
      
      shootingStarContainer.appendChild(shootingStar);
      
      // Remove after animation completes
      setTimeout(() => {
        if (shootingStar.parentNode) {
          shootingStar.parentNode.removeChild(shootingStar);
        }
      }, duration * 1000);
    };

    // 1. Create 1-3 stars every 8-15 seconds (randomized)
    const scheduleNextShootingStar = () => {
      const delay = Math.random() * 7000 + 8000; // 8-15 seconds
      setTimeout(() => {
        // Create 1-3 stars (randomized)
        const numStars = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        for (let i = 0; i < numStars; i++) {
          // Stagger the creation slightly (0-500ms apart) for more natural appearance
          setTimeout(() => {
            createShootingStar();
          }, i * (Math.random() * 500));
        }
        scheduleNextShootingStar();
      }, delay);
    };

    // Start the cycle
    scheduleNextShootingStar();

    // Cleanup on unmount
    return () => {
      if (shootingStarContainer && shootingStarContainer.parentNode) {
        shootingStarContainer.parentNode.removeChild(shootingStarContainer);
      }
    };
  }, []);

  // Auto-scroll to bottom when new log messages arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logMessages]);

  // Smooth progress animation
  useEffect(() => {
    if (analysisStatus && analysisStatus.progress !== undefined) {
      const targetProgress = analysisStatus.progress;
      const startProgress = animatedProgress;
      const duration = 150; // 150ms animation for more immediate feel
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Faster easing for more immediate updates
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        const currentProgress = startProgress + (targetProgress - startProgress) * easeOutQuad;
        
        setAnimatedProgress(currentProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only when progress changes
  }, [analysisStatus?.progress]);

  // Enhanced configuration state
  const [configuration, setConfiguration] = useState({
    categoryWeights: {
      speech_analysis: 20,
      body_language: 20,
      teaching_effectiveness: 20,
      interaction_engagement: 20,
      presentation_skills: 20
    },
    speechComponents: {
      speaking_rate: 25,
      clarity: 25,
      confidence: 20,
      voice_variety: 15,
      pause_effectiveness: 15
    },
    visualComponents: {
      eye_contact: 25,
      gestures: 20,
      posture: 20,
      engagement: 20,
      professionalism: 15
    },
    pedagogyComponents: {
      content_organization: 25,
      engagement_techniques: 20,
      communication_clarity: 20,
      use_of_examples: 20,
      knowledge_checking: 15
    },
    thresholds: {
      speaking_rate: {
        optimal_min: 140,
        optimal_max: 180,
        acceptable_min: 120,
        acceptable_max: 200
      },
      filler_ratio: {
        excellent: 2,
        good: 5,
        average: 8,
        poor: 12
      },
      visual_scores: {
        excellent: 8.5,
        good: 7.0,
        average: 5.5,
        poor: 4.0
      }
    },
    sampling: {
      frame_interval_seconds: 6,
      max_frames_analyzed: 40,
      use_full_transcript: true
    }
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type.startsWith('video/')) {
      setFile(uploadedFile);
      setAnalysisId(null);
      setAnalysisStatus({
        status: 'idle',
        progress: 0,
        message: 'Ready to start analysis',
        timestamp: Date.now()
      });
      setResults(null);
      setLogMessages([]);
      setSummaryData(null);
    } else {
      alert('Please upload a video file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
    },
    multiple: false
  });

  // Update configuration value
  const updateConfiguration = (category, subcategory, key, value) => {
    setConfiguration(prev => {
      const newConfig = { ...prev };
      if (subcategory) {
        newConfig[category] = {
          ...newConfig[category],
          [subcategory]: {
            ...newConfig[category][subcategory],
            [key]: parseFloat(value) || 0
          }
        };
      } else {
        newConfig[category] = {
          ...newConfig[category],
          [key]: parseFloat(value) || 0
        };
      }
      return newConfig;
    });
    setConfigChanged(true);
  };

  // Reset configuration to defaults
  const resetConfiguration = () => {
    setConfiguration({
      categoryWeights: {
        speech_analysis: 20,
        body_language: 20,
        teaching_effectiveness: 20,
        interaction_engagement: 20,
        presentation_skills: 20
      },
      speechComponents: {
        speaking_rate: 25,
        clarity: 25,
        confidence: 20,
        voice_variety: 15,
        pause_effectiveness: 15
      },
      visualComponents: {
        eye_contact: 25,
        gestures: 20,
        posture: 20,
        engagement: 20,
        professionalism: 15
      },
      pedagogyComponents: {
        content_organization: 25,
        engagement_techniques: 20,
        communication_clarity: 20,
        use_of_examples: 20,
        knowledge_checking: 15
      },
      thresholds: {
        speaking_rate: {
          optimal_min: 140,
          optimal_max: 180,
          acceptable_min: 120,
          acceptable_max: 200
        },
        filler_ratio: {
          excellent: 2,
          good: 5,
          average: 8,
          poor: 12
        },
        visual_scores: {
          excellent: 8.5,
          good: 7.0,
          average: 5.5,
          poor: 4.0
        }
      },
      sampling: {
        frame_interval_seconds: 6,
        max_frames_analyzed: 40,
        use_full_transcript: true
      }
    });
    setConfigChanged(true);
  };

  // Save configuration
  const saveConfiguration = () => {
    console.log('Saving configuration:', configuration);
    setConfigChanged(false);
    alert('Configuration saved successfully! Changes will apply to the next analysis.');
  };

  // Upload and start analysis
  const [queueWarning, setQueueWarning] = useState(null);

  // Check queue status on component mount
  useEffect(() => {
    const checkInitialQueueStatus = async () => {
      const status = await checkQueueStatus();
      if (status && status.warning_level !== "none") {
        setQueueWarning(status);
      }
    };
    
    checkInitialQueueStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkInitialQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check queue status before upload
  const checkQueueStatus = async () => {
    try {
      // Get client IP from a service (fallback to backend detection)
      // Silently fail - backend will detect IP from request headers
      let clientIP = null;
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json', { 
          timeout: 2000,
          validateStatus: () => true // Don't throw on any status
        });
        if (ipResponse && ipResponse.data && ipResponse.data.ip) {
          clientIP = ipResponse.data.ip;
        }
      } catch (ipError) {
        // Silently ignore - backend will detect from request headers
        clientIP = null;
      }
      
      const params = clientIP ? { client_ip: clientIP } : {};
      const response = await axios.get(`${API_BASE_URL}/queue-status`, {
        params: params,
        timeout: 5000, // 5 second timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      return response.data;
    } catch (error) {
      // Only log in development, suppress in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking queue status:', error.message);
      }
      // Silently fail - queue status check is not critical
      return null;
    }
  };

  const cancelUpload = async () => {
    // Cancel the axios request
    if (uploadCancelToken.current) {
      uploadCancelToken.current.cancel('Upload cancelled by user');
      uploadCancelToken.current = null;
    }
    
    // Also notify backend to clean up
    if (analysisId) {
      try {
        await axios.post(`${API_BASE_URL}/cancel-upload/${analysisId}`, {}, {
          timeout: 5000
        });
      } catch (error) {
        // Ignore errors - backend cleanup is best effort
        if (process.env.NODE_ENV === 'development') {
          console.log('Backend cancel notification failed:', error);
        }
      }
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    setAnalysisId(null);
    setUserAnalysisId(null);
    setIsQueued(false);
    setQueueList([]);
  };

  // Validate passkey function
  const validatePasskey = async () => {
    if (!passkey.trim()) {
      setPasskeyError('Please enter the passcode');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/validate-passkey`,
        { passkey: passkey.trim() },
        {
          timeout: 15000,
          // Backend may return 401 (older deploy) or 200 + { valid: false }; never treat as axios "network" error.
          validateStatus: () => true,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status >= 500 || response.data == null) {
        setPasskeyError('Failed to validate passcode (server error). Please try again.');
        setIsPasskeyValid(false);
        return;
      }

      if (response.data.valid) {
        setIsPasskeyValid(true);
        setPasskeyError('');
        sessionStorage.setItem('mars_passkey', passkey.trim());
      } else {
        setPasskeyError('Invalid passcode. Please try again.');
        setIsPasskeyValid(false);
      }
    } catch (error) {
      console.error('Passkey validation error:', error);
      setPasskeyError('Failed to validate passcode (network or CORS). Check that the app is using the correct API URL.');
      setIsPasskeyValid(false);
    }
  };

  // Check if passkey is already validated in this session
  useEffect(() => {
    const raw = sessionStorage.getItem('mars_passkey');
    const storedPasskey = raw != null ? String(raw).trim() : '';
    if (!storedPasskey) return;
    setPasskey(storedPasskey);

    // Re-validate against backend (avoid bypass if sessionStorage contains stale/invalid value)
    (async () => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/validate-passkey`,
          { passkey: storedPasskey },
          {
            timeout: 15000,
            validateStatus: () => true,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (response.status >= 500 || response.data == null) {
          sessionStorage.removeItem('mars_passkey');
          setIsPasskeyValid(false);
          setPasskeyError('Could not verify saved passcode (server). Please enter it again.');
          return;
        }
        if (response.data.valid) {
          setIsPasskeyValid(true);
          setPasskeyError('');
        } else {
          sessionStorage.removeItem('mars_passkey');
          setIsPasskeyValid(false);
          setPasskeyError('Saved passcode is no longer valid. Please enter the current passcode.');
        }
      } catch (e) {
        sessionStorage.removeItem('mars_passkey');
        setIsPasskeyValid(false);
        setPasskeyError('Could not reach the server to verify passcode. Check API URL / network.');
      }
    })();
  }, []);

  // Cleanup on page unload/refresh - cancel ongoing uploads
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // If there's an active upload, try to cancel it
      const currentAnalysisId = analysisId || userAnalysisId;
      if (isUploading && currentAnalysisId) {
        // Cancel axios request
        if (uploadCancelToken.current) {
          uploadCancelToken.current.cancel('Page refresh - upload cancelled');
        }
        
        // Notify backend (fire and forget - use sendBeacon for reliability during page unload)
        try {
          // Use sendBeacon for better reliability during page unload
          const url = `${API_BASE_URL}/cancel-upload/${currentAnalysisId}`;
          const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } catch (error) {
          // Fallback: try fetch with keepalive
          try {
            fetch(`${API_BASE_URL}/cancel-upload/${currentAnalysisId}`, {
              method: 'POST',
              body: JSON.stringify({}),
              headers: { 'Content-Type': 'application/json' },
              keepalive: true
            }).catch(() => {}); // Ignore errors
          } catch (err) {
            // Ignore all errors during unload
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading, analysisId, userAnalysisId]);

  const startAnalysis = async () => {
    if (!file) return;
    
    // Check passkey before starting analysis
    if (!isPasskeyValid) {
      alert('Please enter and verify the passcode first');
      return;
    }
    
    // Prevent multiple clicks - set uploading state immediately
    if (isUploading) {
      console.log('Upload already in progress');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setLogMessages([]);
    
    // Declare progressInterval outside try block so it's accessible in catch
    let progressInterval = null;
    
    try {
      // Check queue status first (with timeout to prevent hanging)
      let queueStatus = null;
      try {
        queueStatus = await Promise.race([
          checkQueueStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Queue check timeout')), 3000))
        ]);
      } catch (error) {
        // Silently continue if queue check fails or times out
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Queue check failed or timed out, proceeding anyway');
        }
      }
      
      if (queueStatus && queueStatus.warning_level !== "none") {
        const shouldProceed = window.confirm(
          `${queueStatus.warning_message}\n\nDo you want to proceed anyway?`
        );
        if (!shouldProceed) {
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lecture_context', lectureContext);

      // Create cancel token for this upload
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      uploadCancelToken.current = source;

      // Fallback progress indicator - show minimal progress to indicate activity
      let simulatedProgress = 0;
      
      // Start a fallback progress indicator in case progress events don't fire
      progressInterval = setInterval(() => {
        if (simulatedProgress < 5) {
          simulatedProgress += 0.5;
          setUploadProgress(simulatedProgress);
        }
      }, 500);

      const response = await axios.post(`${API_BASE_URL}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
      cancelToken: source.token,
        onUploadProgress: (progressEvent) => {
        // Clear fallback interval once real progress starts
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          if (process.env.NODE_ENV === 'development') {
            console.log('Upload progress:', percentCompleted + '%');
          }
        } else {
          // If total is not available, show indeterminate progress
          const mbUploaded = progressEvent.loaded / (1024 * 1024);
          const fileSizeMB = file.size / (1024 * 1024);
          if (fileSizeMB > 0) {
            const estimatedProgress = Math.min((mbUploaded / fileSizeMB) * 100, 99);
            setUploadProgress(estimatedProgress);
          } else {
            setUploadProgress(Math.min(mbUploaded, 99));
          }
        }
      }
    });
    
    // Clear fallback interval on success
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

      if (!response.data || !response.data.analysis_id) {
        alert('Upload succeeded but no analysis ID received. Please try again.');
        setIsUploading(false);
        return;
      }
      
      const newAnalysisId = response.data.analysis_id;
      setAnalysisTiming(response.data.analysis_timing || null);
    setUserAnalysisId(newAnalysisId);
    
    // Check if video was queued
    if (response.data.status === 'queued') {
      setIsQueued(true);
      setAnalysisId(newAnalysisId);
      setUploadProgress(100);
      setIsUploading(false);
      // Start polling queue list
      startQueuePolling(newAnalysisId);
    } else {
      // Start processing immediately
      connectToUpdates(newAnalysisId);
      setAnalysisId(newAnalysisId);
      setUploadProgress(100);
      setIsUploading(false);
    }
    
    // Clear cancel token on success
    uploadCancelToken.current = null;

    } catch (error) {
      // Clear fallback interval on error
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // Clear cancel token
      uploadCancelToken.current = null;
      
      // Handle cancellation
      if (axios.isCancel(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Upload cancelled by user');
        }
        setIsUploading(false);
        setUploadProgress(0);
        setAnalysisId(null);
        setIsQueued(false);
        setQueueList([]);
        setUserAnalysisId(null);
        return;
      }
      
      console.error('Upload error:', error);
      
      if (error.code === 'ECONNABORTED') {
        alert('Upload timeout. Please try with a smaller file or check your connection.');
      } else if (error.response) {
        alert(`Upload failed: ${error.response.data?.detail || error.response.statusText}`);
      } else if (error.request) {
        alert('Upload failed: No response from server. Please check your connection and try again.');
      } else {
        alert(`Upload failed: ${error.message || 'Unknown error. Please try again.'}`);
      }
      setIsUploading(false);
      setUploadProgress(0);
      setAnalysisId(null);
      setIsQueued(false);
      setQueueList([]);
      setUserAnalysisId(null);
    }
  };

  // Queue polling function
  const startQueuePolling = (analysisId) => {
    const pollQueue = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/queue-list`, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
        
        if (response.data && response.data.queue) {
          setQueueList(response.data.queue);
          
          // Check if it's the user's turn (their analysis_id is now processing)
          const userJob = response.data.queue.find(job => job.analysis_id === analysisId);
          if (userJob && userJob.status === 'processing') {
            // It's the user's turn! Start the analysis
            setIsQueued(false);
            setQueueList([]);
            connectToUpdates(analysisId);
            // Update analysis status
            setAnalysisStatus({
              status: 'processing',
              progress: userJob.progress || 0,
              message: 'Starting analysis...',
              timestamp: Date.now()
            });
          } else {
            // Continue polling
            setTimeout(pollQueue, 2000); // Poll every 2 seconds
          }
        }
      } catch (error) {
        // Silently fail and retry
        setTimeout(pollQueue, 2000);
      }
    };
    
    // Start polling immediately
    pollQueue();
  };

  // Real-time updates using Server-Sent Events (more reliable than WebSocket)
  // Stop analysis function
  const stopAnalysis = async () => {
    if (!analysisId) return;
    
    setIsStopping(true);
    try {
      console.log('🛑 Stopping analysis:', analysisId);
      const response = await axios.post(`${API_BASE_URL}/stop-analysis/${analysisId}`);
      
      if (response.data.success) {
        setAnalysisStatus({
          status: 'stopped',
          progress: analysisStatus?.progress || 0,
          message: 'Analysis stopped by user',
          timestamp: Date.now()
        });
        
        // Close SSE connection
        if (window.currentEventSource) {
          window.currentEventSource.close();
        }
        
        // Reset to initial state after a short delay
        setTimeout(() => {
          setAnalysisId(null);
          setAnalysisStatus({
            status: 'idle',
            progress: 0,
            message: 'Ready to start analysis',
            timestamp: Date.now()
          });
          setLogMessages([]);
          setResults(null);
          setIsStopping(false);
        }, 2000); // 2 second delay to show "stopped" state
        
        console.log('✅ Analysis stopped successfully');
      }
    } catch (error) {
      console.error('❌ Error stopping analysis:', error);
      // Still update UI even if backend call fails
      setAnalysisStatus({
        status: 'stopped',
        progress: analysisStatus?.progress || 0,
        message: 'Analysis stopped (connection may be lost)',
        timestamp: Date.now()
      });
      
      // Reset to initial state after a short delay
      setTimeout(() => {
        setAnalysisId(null);
        setAnalysisStatus({
          status: 'idle',
          progress: 0,
          message: 'Ready to start analysis',
          timestamp: Date.now()
        });
        setLogMessages([]);
        setResults(null);
        setSummaryData(null);
        setIsStopping(false);
      }, 2000);
    }
  };

  const connectToUpdates = (id) => {
    console.log('🔌 Connecting to real-time updates for:', id);
    
    // Close existing connection if any
    if (window.currentEventSource) {
      window.currentEventSource.close();
    }
    
    // Create EventSource connection
    const sseUrl = `${API_BASE_URL}/stream/${id}`;
    console.log('🔗 Connecting to:', sseUrl);
    
    const eventSource = new EventSource(sseUrl);
    
    eventSource.onopen = () => {
      console.log('✅ Real-time connection established');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received update:', message);
        
        if (message.type === 'log') {
          // New log message
          setLogMessages(prev => [...prev, message.data]);
        } else if (message.type === 'status') {
          // Status update with smooth progress animation
          console.log(`📊 Progress update: ${message.data?.progress || 0}% - ${message.data?.message || 'No message'}`);
          
          // Validate message data before processing
          if (!message.data) {
            console.warn('⚠️ Status message missing data:', message);
            return;
          }
          
          // Force immediate state update
          const newStatus = {
            status: message.data.status || 'processing',
            progress: message.data.progress || 0,
            message: message.data.message || '',
            timestamp: Date.now(),
            updateId: Date.now() // Force React to see this as a new update
          };
          
          setAnalysisStatus(newStatus);
          
          // Also force a re-render by updating animated progress immediately
          if (message.data.progress !== undefined) {
            setAnimatedProgress(message.data.progress);
          }
        } else if (message.type === 'complete') {
          // Analysis complete
          console.log('🏁 Analysis completed');
          setResults(message.data?.results);
          setAnalysisStatus({
            status: 'completed',
            progress: 100,
            message: 'Analysis complete!',
            timestamp: Date.now()
          });
          eventSource.close();
        } else if (message.type === 'error') {
          console.error('❌ Analysis error:', message.data);
          setAnalysisStatus({
            status: 'error',
            progress: 0,
            message: message.data?.message || 'Analysis failed',
            timestamp: Date.now()
          });
          eventSource.close();
        } else if (message.type === 'connected') {
          console.log('✅ SSE Connection confirmed');
        }
      } catch (error) {
        console.error('❌ Message parse error:', error, 'Raw data:', event.data);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE Connection error:', error);
      eventSource.close();
      
      // Fallback to polling
      console.log('⚠️ SSE failed, falling back to polling...');
      pollAnalysisStatus(id);
    };
    
    window.currentEventSource = eventSource;
  };

  // Fallback polling function (used when SSE fails)
  const pollAnalysisStatus = async (id) => {
    let pollCount = 0;
    let consecutiveNoChange = 0;
    let lastProgress = 0;
    
    console.log('📡 Starting intelligent polling for:', id);
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        
        // Poll faster during active processing (every 0.5s), slower when idle (every 2s)
        const shouldPoll = pollCount % (consecutiveNoChange > 3 ? 4 : 1) === 0;
        
        if (!shouldPoll) return;
        
        console.log(`📡 Poll #${pollCount}`);
        
        const response = await axios.get(`${API_BASE_URL}/analysis-status/${id}`);
        
        const currentProgress = response.data.progress || 0;
        
        // Track if progress is changing
        if (currentProgress === lastProgress) {
          consecutiveNoChange++;
        } else {
          consecutiveNoChange = 0;
          lastProgress = currentProgress;
        }
        
        // Update status
        setAnalysisStatus({
          status: response.data.status,
          progress: currentProgress,
          message: response.data.message || '',
          timestamp: Date.now()
        });
        
        // Update log messages
        if (response.data.log_messages && Array.isArray(response.data.log_messages)) {
          setLogMessages(response.data.log_messages);
        }
        
        // Check completion
        if (response.data.status === 'completed') {
          console.log('🏁 Analysis completed');
          setResults(response.data.results);
          clearInterval(pollInterval);
        } else if (response.data.status === 'error') {
          console.log('❌ Analysis error');
          alert(`Analysis failed: ${response.data.message}`);
          clearInterval(pollInterval);
        }
        
      } catch (error) {
        console.error('❌ Poll failed:', error.message);
      }
    }, 500); // Poll every 500ms (twice per second)
  };

  const exportTranscriptAndQuestions = () => {
    if (!results) return;
    const transcript = (results.full_transcript?.text || '').trim();
    const timecoded = results.full_transcript?.timecoded_words;
    const lines = [];
    lines.push('MARS — Transcript and instructor questions export');
    lines.push(`Exported: ${new Date().toLocaleString('en-SG')}`);
    lines.push('');
    lines.push('=== LECTURE CONTEXT & SUPPLEMENTARY INFORMATION (as submitted) ===');
    lines.push((results.lecture_context || '').trim() || '(none provided)');
    lines.push('');
    lines.push('=== FULL TRANSCRIPT ===');
    if (transcript) {
      lines.push(transcript);
    } else if (timecoded && timecoded.length > 0) {
      lines.push(
        timecoded.map((w) => w.word || '').join(' ').replace(/\s+([.,!?;:])/g, '$1')
      );
    } else {
      lines.push('(transcript not available in plain text)');
    }
    lines.push('');
    lines.push('=== INSTRUCTOR QUESTIONS AND CLI (ICAP) ===');
    const qs = results.interaction_engagement?.all_questions || [];
    if (qs.length === 0) {
      lines.push(`(no questions detected; total_questions=${results.interaction_engagement?.total_questions ?? 0})`);
    } else {
      qs.forEach((q, idx) => {
        const t = q.precise_timestamp || q.timestamp || '';
        const icap = q.icap || '—';
        const qt = (q.question || q.text || '').replace(/\r?\n/g, ' ');
        lines.push(`${idx + 1}\t${t}\t${icap}\t${qt}`);
      });
      lines.push('');
      lines.push('(Tab-separated: index, time, CLI/ICAP, question text)');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mars-transcript-questions-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PDF: export of the on-screen results view (html2pdf)
  const exportFullAnalysisView = async () => {
    if (!resultsContainerRef.current) return;
    try {
      const exportNode = resultsContainerRef.current.cloneNode(true);
      exportNode.style.background = '#ffffff';
      exportNode.style.padding = '16px';
      exportNode.style.borderRadius = '0';
      exportNode.style.maxWidth = '100%';
      exportNode.style.color = '#111827';
      // Encourage cleaner pagination in html2pdf by avoiding breaks inside common "card" containers.
      try {
        exportNode.querySelectorAll('div, section, article, table, pre, ul, ol').forEach((el) => {
          const cls = String(el.className || '');
          if (
            cls.includes('card') ||
            cls.includes('panel') ||
            cls.includes('section') ||
            cls.includes('score') ||
            cls.includes('rubric') ||
            cls.includes('metrics') ||
            cls.includes('summary')
          ) {
            el.classList.add('pdf-avoid-break');
          }
        });
      } catch (e) {
        // Best-effort only; export should still proceed.
      }

      const wrapper = document.createElement('div');
      wrapper.style.background = '#ffffff';
      wrapper.style.padding = '12px';
      wrapper.appendChild(exportNode);
      document.body.appendChild(wrapper);

      const opt = {
        margin: 8,
        filename: `MARS-full-analysis-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid-break', 'p', 'li', 'pre'] },
      };

      await html2pdf().set(opt).from(wrapper).save();
      document.body.removeChild(wrapper);
    } catch (e) {
      console.error('Full analysis export failed:', e);
      alert(`Export failed: ${e.message}`);
    }
  };

  // Render score with color coding
  const ScoreDisplay = ({ score, label, max = 10 }) => {
    const percentage = (score / max) * 100;
    let colorClass = 'text-red-500';
    if (percentage >= 70) colorClass = 'text-green-500';
    else if (percentage >= 50) colorClass = 'text-yellow-500';

    return (
      <div className="score-card">
        <div className={`score-card-number ${colorClass.replace('text-', 'text-')}`}>{score}/{max}</div>
        <div className="score-card-label">{label}</div>
      </div>
    );
  };

  const secToClock = (s) => {
    const n = Number(s);
    if (Number.isNaN(n) || n < 0) return '—';
    const m = Math.floor(n / 60);
    const sec = Math.floor(n % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getWhyContent = (key, score, r) => {
    const ev = r?.mars_rubric?.content_criteria_evidence?.[key];
    const line = whyLineForContent(key, score);
    if (ev && String(ev).trim()) return `${line} ${String(ev).trim()}`;
    return line;
  };

  const getWhyDelivery = (key, score, r) => {
    const ev = r?.mars_rubric?.delivery_criteria_evidence?.[key];
    const line = whyLineForDelivery(key, score);
    if (key === 'body') {
      // Keep this user-friendly: avoid repeating the metric grid numbers in the \"Why\" line.
      // If backend evidence contains numeric sub-metrics, strip them.
      const raw = ev && String(ev).trim() ? String(ev).trim() : '';
      const stripped = raw
        .replace(/\b\d+(\.\d+)?\/10\b/g, '')
        .replace(/\b(Eye contact|Gestures|Posture|Facial engagement|Professionalism)\b\s*:?/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return stripped ? `${line} ${stripped}` : line;
    }
    if (ev && String(ev).trim()) return `${line} ${String(ev).trim()}`;
    return line;
  };

  const buildEngagementWhy = (rowKey, score, r) => {
    const ie = r?.interaction_engagement || {};
    const dm = Number(ie.duration_minutes ?? r.speech_analysis?.raw_metrics?.duration_minutes ?? r.speech_analysis?.duration_minutes ?? 1) || 1;
    const s = Number(score);
    const bandLine = Number.isNaN(s) ? '' : whyLineForEngagement(rowKey, s);
    if (rowKey === 'question_density') {
      const n = ie.total_questions ?? 0;
      const qpm = ie.questions_per_minute != null ? ie.questions_per_minute : (n / dm);
      return `${bandLine} Evidence: ${n} instructor question(s) (~${Number(qpm).toFixed(1)} per minute over ~${dm.toFixed(1)} min). Scoring rule: qpm≤0.1→0; 0.1–0.5→1–3; 0.5–1.5→4–7; ≥1.5→8–10.`;
    }
    if (rowKey === 'cli_block') {
      const ic = ie.icap_counts || {};
      return `${bandLine} Evidence: ICAP — Passive ${ic.passive ?? 0}, Active ${ic.active ?? 0}, Constructive ${ic.constructive ?? 0}, Interactive ${ic.interactive ?? 0}. ${ie.cli_formula ? `Formula: ${ie.cli_formula}.` : ''}`.trim();
    }
    if (rowKey === 'sui') {
      const aq = ie.audience_questions || [];
      const nAud = ie.audience_question_count ?? aq.length;
      let t = `${bandLine} Evidence: uptake cues after questions — ${ie.sui_uptake_hits ?? 0} hit(s), rate ${ie.sui_uptake_rate ?? 0}. ${ie.sui_evidence ? `${ie.sui_evidence} ` : ''}${ie.sui_formula ? `Formula: ${ie.sui_formula}. ` : ''}`;
      if (nAud > 0 && aq.length) {
        t += `Student/audience questions flagged (${nAud}): ${aq.slice(0, 4).map((a) => `"${(typeof a === 'object' ? (a.question || a.text || '') : String(a)).slice(0, 140)}"`).join('; ')}${aq.length > 4 ? '…' : ''}. `;
      } else {
        t += `${ie.student_feedback_remarks || 'Often no separate audience audio on webcasts; student questions may be absent or unclear.'} `;
      }
      return t.trim();
    }
    if (rowKey === 'qds') {
      const n = ie.total_questions ?? 0;
      const k = ie.qds_quintiles_filled;
      const hits = ie.qds_quintile_hits;
      let bins = '';
      if (Array.isArray(hits) && hits.length === 5) {
        const labels = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'];
        bins = ` Quintiles with ≥1 question: ${labels.map((lb, i) => `${lb}${hits[i] ? ' ✓' : ' —'}`).join('; ')}.`;
      }
      const pts = k != null ? ` Score = 2×${k} filled quintiles = ${Number(ie.question_distribution_stability ?? 0).toFixed(1)}/10.` : '';
      return `${bandLine} Evidence: ${n} instructor questions.${bins}${pts} ${ie.qds_formula || ''}`.trim();
    }
    if (rowKey === 'learner_question_frequency') {
      const sf = Number(ie.student_question_frequency_score ?? 0).toFixed(1);
      const conf = ie.student_feedback_confidence || 'none';
      const aq = ie.audience_questions || [];
      let t = `${bandLine} Evidence: learner frequency score ${sf}/10; detector confidence ${conf}. ${ie.student_feedback_remarks || ''} `;
      if (aq.length) {
        t += `Sample audience questions: ${aq.slice(0, 5).map((a) => `"${(typeof a === 'object' ? (a.question || a.text || '') : String(a)).slice(0, 120)}"`).join('; ')}.`;
      }
      return t.trim();
    }
    if (rowKey === 'learner_question_cognitive') {
      const sc = Number(ie.student_question_cognitive_score ?? 0).toFixed(1);
      const conf = ie.student_feedback_confidence || 'none';
      const aq = ie.audience_questions || [];
      let t = `${bandLine} Evidence: learner cognitive depth ${sc}/10; detector confidence ${conf}. ${ie.student_feedback_remarks || ''} `;
      if (String(conf).toLowerCase() === 'none') {
        t += 'Note: When audience audio is not evidenced, this subscore defaults to neutral 5/10 so engagement is not double-penalised. ';
      }
      if (aq.length) {
        t += `Sample audience questions: ${aq.slice(0, 5).map((a) => `"${(typeof a === 'object' ? (a.question || a.text || '') : String(a)).slice(0, 120)}"`).join('; ')}.`;
      }
      return t.trim();
    }
    return bandLine;
  };

  return (
    <div className="app-background">
      {/* Enhanced Bokeh Background Effects */}
      <div id="bokeh-container" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}></div>
      
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="announcement-banner">
            <a 
              href="https://ctlt.nus.edu.sg/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              An AI Educational Media Tool by CTLT
            </a>
          </div>
          <h1 className="title">MARS</h1>
          <p className="subtitle">
            Multimodal AI Reflection System
          </p>
        <p className="subheader">
          Discourse Analysis with Agentic AI for enhanced pedagogical insights and personalised feedback.
          </p>
        </div>

        {/* Queue Warning - Modernized Design */}
        {queueWarning && (
          <div style={{
            background: queueWarning.warning_level === 'high' ? 
              'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))' : 
              queueWarning.warning_level === 'medium' ? 
              'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))' : 
              'linear-gradient(135deg, rgba(0, 61, 124, 0.12), rgba(37, 99, 235, 0.08))',
            border: queueWarning.warning_level === 'high' ? 
              '1px solid rgba(239, 68, 68, 0.4)' : 
              queueWarning.warning_level === 'medium' ? 
              '1px solid rgba(245, 158, 11, 0.4)' : 
              '1px solid rgba(0, 61, 124, 0.4)',
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '28px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            maxWidth: '650px',
            margin: '0 auto 28px auto',
            boxShadow: queueWarning.warning_level === 'high' ? 
              '0 8px 32px rgba(239, 68, 68, 0.2), 0 2px 8px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' :
              queueWarning.warning_level === 'medium' ?
              '0 8px 32px rgba(245, 158, 11, 0.2), 0 2px 8px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' :
              '0 8px 32px rgba(0, 61, 124, 0.2), 0 2px 8px rgba(0, 61, 124, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated Background Glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: queueWarning.warning_level === 'high' ?
                'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)' :
                queueWarning.warning_level === 'medium' ?
                'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)' :
                'radial-gradient(circle, rgba(0, 61, 124, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
              animation: 'pulse 3s ease-in-out infinite'
            }}></div>
            
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '36px',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
                  animation: 'bounce 2s ease-in-out infinite'
                }}>
                  {queueWarning.warning_level === 'high' ? '🚨' : 
                   queueWarning.warning_level === 'medium' ? '⚠️' : 'ℹ️'}
              </div>
                <h4 style={{ 
                  color: queueWarning.warning_level === 'high' ? '#ef4444' : 
                         queueWarning.warning_level === 'medium' ? '#f59e0b' : '#003D7C', 
                  margin: '0',
                  fontSize: '22px',
                  fontWeight: '700',
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  System Notice
                </h4>
            </div>

              <p style={{ 
                color: queueWarning.warning_level === 'high' ? '#fee2e2' : 
                       queueWarning.warning_level === 'medium' ? '#fef3c7' : 'rgba(255, 255, 255, 0.9)', 
                margin: '0 0 20px 0',
                fontSize: '16px',
                lineHeight: '1.6',
                fontWeight: '400',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {queueWarning.warning_message}
              </p>
              
              {/* IP Address and User Count Information */}
              {(queueWarning.total_users > 0 || (queueWarning.active_ips && queueWarning.active_ips.length > 0) || (queueWarning.queued_ips && queueWarning.queued_ips.length > 0)) && (
              <div style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.85)'
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600' }}>
                    📊 System Status:
                </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Total Users:</strong> {queueWarning.total_users || 0} {queueWarning.total_users === 1 ? 'user' : 'users'}
                  </div>
                  {queueWarning.active_ips && queueWarning.active_ips.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Active Processing:</strong> {queueWarning.active_ips.length} {queueWarning.active_ips.length === 1 ? 'user' : 'users'} 
                      <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                        (IP: {queueWarning.active_ips.join(', ')})
                      </span>
                    </div>
                  )}
                  {queueWarning.queued_ips && queueWarning.queued_ips.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>In Queue:</strong> {queueWarning.queued_ips.length} {queueWarning.queued_ips.length === 1 ? 'user' : 'users'}
                      <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                        (IP: {queueWarning.queued_ips.join(', ')})
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {queueWarning.warning_level === 'high' && (
              <div style={{ 
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '16px',
                  padding: '18px',
                  marginTop: '20px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>💡</span>
                    <p style={{ 
                      color: '#fee2e2', 
                      margin: '0', 
                      fontSize: '15px', 
                      fontWeight: '500',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      Recommendation: Please wait and try again later for faster processing.
                    </p>
                  </div>
              </div>
            )}

              {/* Status Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '20px',
                gap: '20px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: queueWarning.warning_level === 'high' ? '#ef4444' :
                                   queueWarning.warning_level === 'medium' ? '#f59e0b' : '#003D7C',
                    boxShadow: queueWarning.warning_level === 'high' ? '0 0 8px rgba(239, 68, 68, 0.5)' :
                               queueWarning.warning_level === 'medium' ? '0 0 8px rgba(245, 158, 11, 0.5)' :
                               '0 0 8px rgba(0, 61, 124, 0.5)',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontWeight: '500',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    Active monitoring
                  </span>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!analysisId && analysisStatus?.status === 'idle' && !results && (
          <div className="upload-container">
            {/* Passcode — verify once per session before upload */}
            {!isPasskeyValid && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
                maxWidth: '700px',
                margin: '0 auto 2rem auto'
              }}>
                <h3 style={{
                  color: 'white',
                  marginBottom: '1rem',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Enter passcode
                </h3>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="password"
                    value={passkey}
                    onChange={(e) => {
                      setPasskey(e.target.value);
                      setPasskeyError('');
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && passkey.trim()) {
                        validatePasskey();
                      }
                    }}
                    placeholder="Enter passcode"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '1rem',
                      borderRadius: '8px',
                      border: passkeyError ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                  />
                  {passkeyError && (
                    <div style={{
                      color: '#ef4444',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      textAlign: 'center'
                    }}>
                      {passkeyError}
                    </div>
                  )}
                </div>
                <button
                  onClick={validatePasskey}
                  disabled={!passkey.trim()}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    border: 'none',
                    background: passkey.trim() 
                      ? 'linear-gradient(135deg, var(--nus-blue), var(--nus-orange))'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    cursor: passkey.trim() ? 'pointer' : 'not-allowed',
                    opacity: passkey.trim() ? 1 : 0.5,
                    transition: 'all 0.3s'
                  }}
                >
                  Continue
                </button>
              </div>
            )}
            
            {isPasskeyValid && (
              <div
                {...getRootProps()}
                className={`upload-area ${isDragActive ? 'active' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="upload-icon">
                  <Upload size={48} />
                </div>
                {isDragActive ? (
                  <div>
                    <p className="upload-text">Drop your lecture video here</p>
                    <p className="upload-subtext">Drag & drop or click to select • Supports MP4, AVI, MOV, MKV, WMV • Max 2 hours, 2GB • Analyses 100 frames
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="upload-text">Upload your lecture video</p>
                    <p className="upload-subtext">
                      Drag & drop or click to select • Supports MP4, AVI, MOV, MKV, WMV • Max 2 hours, 2GB • Typical analysis time after upload: 10–15 min
                    </p>
                  </div>
                )}
              </div>
            )}

            {isPasskeyValid && (
              <div
                style={{
                  marginTop: '1.25rem',
                  maxWidth: '700px',
                  width: '100%',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  textAlign: 'left',
                }}
              >
                <label
                  htmlFor="lecture-context-input"
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: '0.5rem',
                  }}
                >
                  Lecture Context &amp; Supplementary Information{' '}
                  <span style={{ fontWeight: 400, color: 'rgba(255, 255, 255, 0.75)' }}>(optional)</span>
                </label>
                <textarea
                  id="lecture-context-input"
                  value={lectureContext}
                  onChange={(e) => setLectureContext(e.target.value)}
                  placeholder="Optional: course name, module/week, topic, audience level, and learning outcomes. This helps the model interpret discipline-specific language and align scores with your teaching intent."
                  rows={5}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    resize: 'vertical',
                    minHeight: '100px',
                  }}
                />
                <p
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.72)',
                    lineHeight: 1.45,
                  }}
                >
                  Anything you add here is sent with the recording to the analyser only. It does not change the video; it gives the system extra context so content-related scoring can match your module and goals more fairly.
                </p>
              </div>
            )}

            {file && isPasskeyValid && (
              <div className="file-info">
                <div className="file-details">
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    onClick={startAnalysis}
                    disabled={isUploading}
                    className="start-button"
                  >
                    {isUploading ? (
                      <>
                        <div className="spinner"></div>
                        Uploading {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        Start Enhanced Analysis
                      </>
                    )}
                  </button>
                </div>

                {isUploading && (
                  <div className="upload-progress">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div className="progress-bar-container" style={{ flex: 1 }}>
                      <div 
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                      </div>
                      <button
                        onClick={cancelUpload}
                        className="stop-button"
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span>✕</span>
                        Stop Upload
                      </button>
                    </div>
                    <p className="progress-text">Uploading: {uploadProgress}%</p>
                    <p className="progress-text" style={{ fontSize: '13px', opacity: 0.85 }}>
                      Typical processing time (after upload):{' '}
                      <strong>
                        {(analysisTiming?.typical_processing_minutes_range?.[0] ?? 10)}–{(analysisTiming?.typical_processing_minutes_range?.[1] ?? 15)} minutes
                      </strong>
                      {analysisTiming?.processing_timeout_minutes ? (
                        <> (timeout cap: {analysisTiming.processing_timeout_minutes} minutes)</>
                      ) : null}
                      . Upload time depends on file size and network.
                    </p>
                  </div>
                )}
              </div>
            )}

            {false && isPasskeyValid && (
              <div />
            )}
          </div>
        )}

        {/* Queue List Display */}
        {isQueued && queueList.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            maxWidth: '800px',
            margin: '0 auto 24px auto'
          }}>
            <h3 style={{
              color: 'var(--nus-blue)',
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📋 Queue Status
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queueList.map((job, index) => {
                const isUserJob = job.analysis_id === userAnalysisId;
                const isProcessing = job.status === 'processing';
                
                return (
                  <div
                    key={job.analysis_id}
                    style={{
                      background: isUserJob ? 'rgba(59, 130, 246, 0.15)' : 'white',
                      border: isUserJob ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {isProcessing ? '⚙️' : '⏳'}
                        </span>
                        <strong style={{ color: isUserJob ? 'var(--nus-blue)' : '#333' }}>
                          {job.filename || 'Unknown Video'}
                        </strong>
                        {isUserJob && (
                          <span style={{
                            background: 'var(--nus-blue)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Your Video
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginLeft: '28px' }}>
                        <div>IP: {job.client_ip || 'Unknown'}</div>
                        <div>Status: {isProcessing ? `Processing (${job.progress}%)` : `Queued (Position ${job.queue_position || index + 1})`}</div>
                        {job.file_size && (
                          <div>Size: {(job.file_size / (1024 * 1024)).toFixed(1)} MB</div>
                        )}
                      </div>
                    </div>
                    {isProcessing && (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        border: '4px solid rgba(59, 130, 246, 0.2)',
                        borderTopColor: 'var(--nus-blue)',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--nus-blue)',
              textAlign: 'center'
            }}>
              ⏱️ Your video will start processing automatically when it's your turn.
            </div>
          </div>
        )}

        {/* Analysis Progress with Real-time Logs */}
        {analysisId && !results && !isQueued && (
          <div className="progress-container" >
            <div className="progress-header">
              <div className="spinner" style={{ color: 'var(--nus-blue)' }}></div>
              <h3 className="progress-title">Enhanced Analysis in Progress</h3>
              <button
                onClick={stopAnalysis}
                disabled={isStopping || analysisStatus?.status === 'stopped'}
                className="stop-button"
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isStopping ? 'not-allowed' : 'pointer',
                  opacity: isStopping ? 0.6 : 1,
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isStopping ? 'Stopping...' : 'Stop Analysis'}
              </button>
            </div>
            
            {/* Queue Status */}
            {analysisStatus?.status === 'queued' && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#0c4a6e', margin: '0 0 8px 0' }}>
                  📋 Your video is queued for processing
                </h4>
                <p style={{ color: '#0c4a6e', margin: '0' }}>
                  Estimated wait time: {analysisStatus?.estimated_wait_minutes || 0} minutes
                </p>
                <p style={{ color: '#0c4a6e', margin: '8px 0 0 0', fontSize: '14px' }}>
                  Queue position: {analysisStatus?.queue_position || 1}
                </p>
              </div>
            )}
            
            {/* Stopped Status */}
            {analysisStatus?.status === 'stopped' && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>
                  ⏹️ Analysis stopped
                </h4>
                <p style={{ color: '#dc2626', margin: '0' }}>
                  Returning to initial state...
                </p>
              </div>
            )}
            
            {/* Overall Progress */}
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${Math.round(animatedProgress || 0)}%` }}
              ></div>
            </div>
            <div className="progress-percent">{Math.round(animatedProgress || 0)}% Complete</div>

            {/* Real-time Server Logs */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#1e293b',
              borderRadius: '12px',
              maxHeight: '400px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ 
                margin: '0 0 1rem 0', 
                color: '#f1f5f9',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  background: '#10b981',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }}></span>
                Real-time Server Logs
              </h4>
              
              <div 
                ref={logContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  color: '#e2e8f0',
                  paddingRight: '0.5rem'
                }}
              >
                {logMessages.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    Waiting for server logs...
                  </div>
                ) : (
                  logMessages.map((log, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        marginBottom: '0.5rem',
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #334155'
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        [{formatSingaporeTime(log.timestamp)}]
                      </span>
                      <span style={{ 
                        color: log.progress >= 100 ? '#10b981' : '#3b82f6',
                        marginLeft: '0.5rem'
                      }}>
                        [{log.progress}%]
                      </span>
                      <span style={{ marginLeft: '0.5rem', color: '#f1f5f9' }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard with Detailed Breakdown */}
        {results && (
          <div className="results-container" ref={resultsContainerRef}>
            <div className="results-header">
              <CheckCircle size={32} style={{ color: 'var(--success-500)' }} />
              <h2 className="results-title">Enhanced Analysis Complete</h2>
            </div>

            {/* Overall Score */}
            <div className="overall-score">
              <div className="score-display">
                <div className="score-number">{Math.round(results.overall_score * 10) / 10}/10</div>
                <div className="score-label">MARS Evaluated Final Score</div>
                <div style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.45 }}>
                  The scoring is interpreted based on the webcast lecture recording through a collective algorithm with LLM and may not fully reflect pedagogical impact in teaching and learning.
                </div>
              </div>
            </div>

            {/* Score Calculation Breakdown (moved near top) */}
            <div style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px',
              border: '1px solid var(--gray-200)',
              marginTop: '1rem'
            }}>
              <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                🧮 Score Calculation Breakdown
              </h4>
              {analysisStatus?.upload_completed_at && analysisStatus?.completed_at && (
                <div style={{ marginBottom: '0.9rem', color: 'var(--gray-700)', fontSize: '0.95rem' }}>
                  <strong>Total Time Spent for AI Analysis:</strong>{' '}
                  {(() => {
                    try {
                      const t0 = new Date(analysisStatus.upload_completed_at).getTime();
                      const t1 = new Date(analysisStatus.completed_at).getTime();
                      const s = Math.max(0, Math.round((t1 - t0) / 1000));
                      const m = Math.floor(s / 60);
                      const sec = s % 60;
                      return `${m}m ${sec}s`;
                    } catch {
                      return '—';
                    }
                  })()}
                  {' '}<span style={{ color: 'var(--gray-600)' }}>(from upload completion to results ready)</span>
                </div>
              )}
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--primary-50)', borderRadius: '8px' }}>
                <strong>Formula:</strong>
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {results.calculation_breakdown?.final_calculation?.formula}
                </div>
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--nus-blue)' }}>
                  = {results.calculation_breakdown?.final_calculation?.calculation}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--nus-orange)' }}>
                  = {results.calculation_breakdown?.final_calculation?.result}/10
                </div>
              </div>
            </div>

            {/* Submitted lecture context (mirrors upload form) */}
            <div style={{
              marginTop: '1rem',
              padding: '1.25rem 1.5rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid var(--gray-200)',
              textAlign: 'left',
            }}>
              <h4 style={{ color: 'var(--nus-blue)', marginBottom: '0.75rem', fontSize: '1.05rem' }}>
                Lecture Context &amp; Supplementary Information
              </h4>
              {(results.lecture_context && String(results.lecture_context).trim()) ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#1f2937', lineHeight: 1.65, fontSize: '0.95rem' }}>
                  {String(results.lecture_context).trim()}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                  No supplementary context was submitted for this recording.
                </p>
              )}
            </div>

            {/* Summary Section (placed early so it is not buried below the full transcript) */}
            {(summaryData || isGeneratingSummary) && (
              <div style={{
                background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))',
                padding: '2rem',
                borderRadius: '16px',
                marginTop: '1rem',
                marginBottom: '1rem',
                border: '2px solid var(--nus-blue)',
              }}>
                <h3 style={{
                  color: 'var(--nus-blue)',
                  marginBottom: '1.5rem',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  📋 Summary
                </h3>
                {isGeneratingSummary ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Generating personalised summary...</div>
                    <div style={{ fontSize: '0.9rem' }}>Please wait</div>
                  </div>
                ) : summaryData ? (
                  <div style={{
                    padding: '1.5rem',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--gray-200)',
                  }}>
                    <h4 style={{
                      color: 'var(--nus-blue)',
                      marginBottom: '1rem',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                    }}>
                      Summary
                    </h4>
                    {summaryData.summary_provenance === 'client_fallback' && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                        The server did not return a full AI summary (timeout, error, or empty reply). Below is an automated summary from your MARS scores and rubric signals.
                      </p>
                    )}
                    {(() => {
                      const raw = summaryData.personalized_feedback || '';
                      const parts = raw.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
                      if (parts.length >= 3) {
                        return parts.map((para, idx) => (
                          <p
                            key={idx}
                            style={{
                              fontSize: '1rem',
                              lineHeight: '1.8',
                              color: '#374151',
                              textAlign: 'justify',
                              margin: idx === 0 ? 0 : '1rem 0 0',
                            }}
                          >
                            {para}
                          </p>
                        ));
                      }
                      return (
                        <p style={{ fontSize: '1rem', lineHeight: '1.8', color: '#374151', textAlign: 'justify', margin: 0 }}>
                          {raw}
                        </p>
                      );
                    })()}
                    {summaryData.strongest_strength && summaryData.strongest_strength.title && (
                      <p style={{ fontSize: '1rem', lineHeight: '1.8', color: '#374151', textAlign: 'justify', marginTop: '1rem' }}>
                        <strong>Strongest strength:</strong> {summaryData.strongest_strength.title}. {summaryData.strongest_strength.description}{summaryData.strongest_strength.evidence ? ` Evidence: ${summaryData.strongest_strength.evidence}` : ''}
                      </p>
                    )}
                    {summaryData.improvements && summaryData.improvements.length > 0 && (
                      <p style={{ fontSize: '1rem', lineHeight: '1.8', color: '#374151', textAlign: 'justify', marginTop: '1rem' }}>
                        <strong>Growth opportunities:</strong>{' '}
                        {summaryData.improvements.slice(0, 2).map((im, i) => (
                          <span key={i}>
                            {i ? ' ' : ''}{im.area}: {im.description}{im.evidence ? ` (Evidence: ${im.evidence})` : ''}.
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* MARS-only top scores */}
            {false && results.mars_rubric && (
            <div className="scores-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <ScoreDisplay 
                  score={results.mars_rubric.content_score || 0}
                  label="Content"
              />
              <ScoreDisplay 
                  score={results.mars_rubric.delivery_score || 0}
                  label="Delivery"
              />
              <ScoreDisplay 
                  score={results.mars_rubric.engagement_score || 0}
                  label="Engagement"
              />
            </div>
            )}

            {/* Hidden (moved below transcript/frames): MARS rubric breakdown */}
            {false && results.mars_rubric && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid var(--gray-200)',
                  textAlign: 'left',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 0.5rem 0',
                    color: 'var(--nus-blue)',
                    fontSize: '1.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Info size={22} />
                  {MARS_INTRO.title}
                </h3>
                <p style={{ margin: '0 0 1rem', color: 'var(--gray-700)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                  {MARS_INTRO.summary}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                    padding: '1rem',
                    background: 'var(--primary-50)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                  }}
                >
                  <div>
                    <strong>Content</strong> (20% of overall){' '}
                    <span style={{ color: 'var(--nus-blue)' }}>
                      {results.mars_rubric.content_score != null ? `${results.mars_rubric.content_score}/10` : '—'}
                    </span>
                  </div>
                  <div>
                    <strong>Delivery</strong> (40%){' '}
                    <span style={{ color: 'var(--nus-blue)' }}>
                      {results.mars_rubric.delivery_score != null ? `${results.mars_rubric.delivery_score}/10` : '—'}
                    </span>
                  </div>
                  <div>
                    <strong>Engagement</strong> (40%){' '}
                    <span style={{ color: 'var(--nus-blue)' }}>
                      {results.mars_rubric.engagement_score != null ? `${results.mars_rubric.engagement_score}/10` : '—'}
                    </span>
                  </div>
                  <div style={{ gridColumn: '1 / -1', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    <strong>Overall formula:</strong> {results.mars_rubric.formula || '0.20×Content + 0.40×Delivery + 0.40×Engagement'}
                  </div>
                </div>

                {results.mars_rubric.content_subscores && (
                  <div
                    style={{
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'var(--gray-50)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--gray-800)',
                    }}
                  >
                    <strong>Content sub-scores (0–10 each):</strong> Organisation{' '}
                    {results.mars_rubric.content_subscores.content_organisation}, Explanation Quality{' '}
                    {results.mars_rubric.content_subscores.explanation_quality}, Examples / Representation{' '}
                    {results.mars_rubric.content_subscores.use_of_examples_representation}.
                    <br />
                    <span style={{ color: 'var(--gray-600)' }}>
                      {results.mars_rubric.content_subscores.content_formula}
                    </span>
                  </div>
                )}

                <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.1rem' }}>
                  Content criteria
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {MARS_CONTENT_CRITERIA.map((row) => {
                    const v =
                      results.mars_rubric.content_criteria?.[row.key] ??
                      results.teaching_effectiveness?.mars_content_criteria?.[row.key];
                    return (
                      <div
                        key={row.key}
                        style={{
                          padding: '0.85rem 1rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '10px',
                          background: '#fafafa',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>
                          {row.label}{' '}
                          {v != null && (
                            <span style={{ color: 'var(--nus-blue)', fontWeight: 600 }}>({v}/10)</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                          {row.subgroup} · {row.weightInSubgroup}
                        </div>
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          <strong>What it means:</strong> {row.meaning}
                        </p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          <strong>How it is computed:</strong> {row.how}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <h4 style={{ margin: '1.25rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.1rem' }}>
                  Delivery
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {MARS_DELIVERY_CRITERIA.map((row) => (
                    <div
                      key={row.key}
                      style={{
                        padding: '0.85rem 1rem',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '10px',
                        background: '#fafafa',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>{row.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                        {row.subgroup}
                      </div>
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                        <strong>What it means:</strong> {row.meaning}
                      </p>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                        <strong>How it is computed:</strong> {row.how}
                      </p>
                      {row.key === 'speech' && results.speech_analysis?.score != null && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your speech category score:</strong> {results.speech_analysis.score}/10
                        </p>
                      )}
                      {row.key === 'body' && results.body_language?.score != null && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your body language category score:</strong> {results.body_language.score}/10
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '1.25rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.1rem' }}>
                  Engagement
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {MARS_ENGAGEMENT_CRITERIA.map((row) => {
                    let extra = null;
                    if (row.key === 'question_density' && results.interaction_engagement?.interaction_frequency != null) {
                      extra = (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your question-density score:</strong>{' '}
                          {results.interaction_engagement.interaction_frequency}/10
                        </p>
                      );
                    }
                    if (row.key === 'cli_block' && results.interaction_engagement?.question_quality != null) {
                      extra = (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your CLI-based question quality score:</strong>{' '}
                          {results.interaction_engagement.question_quality}/10
                        </p>
                      );
                    }
                    if (row.key === 'sui' && results.interaction_engagement?.student_uptake_index != null) {
                      extra = (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your SUI:</strong> {results.interaction_engagement.student_uptake_index}/10
                        </p>
                      );
                    }
                    if (row.key === 'qds' && results.interaction_engagement?.question_distribution_stability != null) {
                      extra = (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Your QDS:</strong> {results.interaction_engagement.question_distribution_stability}/10
                        </p>
                      );
                    }
                    if (row.key === 'learner_feedback') {
                      extra = (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)' }}>
                          <strong>Learner Q frequency / cognitive:</strong>{' '}
                          {results.interaction_engagement?.student_question_frequency_score ?? '—'}/10 ·{' '}
                          {results.interaction_engagement?.student_question_cognitive_score ?? '—'}/10
                          {results.interaction_engagement?.student_feedback_remarks && (
                            <span style={{ color: 'var(--gray-600)' }}>
                              {' '}
                              — {results.interaction_engagement.student_feedback_remarks}
                            </span>
                          )}
                        </p>
                      );
                    }
                    return (
                      <div
                        key={row.key}
                        style={{
                          padding: '0.85rem 1rem',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '10px',
                          background: '#fafafa',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>{row.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                          {row.subgroup}
                        </div>
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          <strong>What it means:</strong> {row.meaning}
                        </p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                          <strong>How it is computed:</strong> {row.how}
                        </p>
                        {extra}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detailed Metrics Breakdown */}
            <div style={{ 
              marginTop: '2rem', 
              padding: '2rem', 
              background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))',
              borderRadius: '16px',
              border: '1px solid var(--gray-200)'
            }}>
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                color: 'var(--nus-blue)', 
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={24} />
                Detailed Analysis Metrics
              </h3>

            {/* Full Transcript with Timecodes */}
            <div style={{ 
              marginTop: '2rem', 
              padding: '2rem', 
              background: 'white',
              borderRadius: '16px',
              border: '1px solid var(--gray-200)'
            }}>
              <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                color: 'var(--nus-blue)', 
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📝 Full Lecture Transcript
              </h3>
              
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                background: 'var(--primary-50)', 
                borderRadius: '8px',
                display: 'flex',
                gap: '2rem',
                fontSize: '0.9rem'
              }}>
                <div><strong>Duration:</strong> {results.full_transcript?.duration_formatted || '00:00'}</div>
                <div><strong>Words:</strong> {results.full_transcript?.word_count || 0}</div>
                <div><strong>Frames Analysed:</strong> {results.configuration_used?.frames_analyzed || 0}</div>
              </div>

              {results.interaction_engagement && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1rem' }}>Instructor questions &amp; CLI</h4>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--gray-700)' }}>
                    Total questions detected: <strong>{results.interaction_engagement.total_questions ?? 0}</strong>
                    {results.interaction_engagement.duration_minutes != null && results.interaction_engagement.duration_minutes > 0 && (
                      <>
                        {' '}(≈{' '}
                        <strong>
                          {(Number(results.interaction_engagement.total_questions) / Number(results.interaction_engagement.duration_minutes)).toFixed(2)}
                        </strong>{' '}
                        per minute)
                      </>
                    )}
                  </p>
                  {(() => {
                    const ic = results.interaction_engagement.icap_counts || {};
                    const dm = Number(results.interaction_engagement.duration_minutes) || 0;
                    const na = Number(ic.active) || 0;
                    const ni = Number(ic.interactive) || 0;
                    const nc = Number(ic.constructive) || 0;
                    const hl = results.interaction_engagement.high_level_questions_count != null
                      ? Number(results.interaction_engagement.high_level_questions_count)
                      : nc + ni;
                    if (dm <= 0) return null;
                    return (
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                        <strong>Active &amp; Interactive load:</strong>{' '}
                        <strong>{na}</strong> Active (≈{(na / dm).toFixed(2)}/min) and{' '}
                        <strong>{ni}</strong> Interactive (≈{(ni / dm).toFixed(2)}/min).{' '}
                        <strong>{hl}</strong> prompts are Constructive or Interactive (higher-order); these are weighted heavily in engagement quality.
                        {results.interaction_engagement.question_engagement_narrative ? (
                          <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--gray-700)' }}>
                            {results.interaction_engagement.question_engagement_narrative}
                          </span>
                        ) : null}
                      </p>
                    );
                  })()}
                  {(results.interaction_engagement.all_questions || []).length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-300)' }}>
                            <th style={{ padding: '0.35rem 0.5rem' }}>#</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Time</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>CLI (ICAP)</th>
                            <th style={{ padding: '0.35rem 0.5rem' }}>Question</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(results.interaction_engagement.all_questions || [])].sort((a, b) => Number(a.start_time || 0) - Number(b.start_time || 0)).map((q, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                              <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'top' }}>{idx + 1}</td>
                              <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{q.precise_timestamp || secToClock(q.start_time)}</td>
                              <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'top' }}>{q.icap || '—'}</td>
                              <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'top' }}>{q.question}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>No instructor questions ending with &quot;?&quot; were matched in the transcript.</p>
                  )}
                </div>
              )}

              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                borderRadius: '12px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: '1.8',
                fontSize: '0.95rem'
              }}>
                {results.full_transcript?.text ? (
                  <div style={{ 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                    fontSize: '0.95rem',
                    color: '#1f2937'
                  }}>
                    {results.full_transcript.text}
                  </div>
                ) : results.full_transcript?.timecoded_words && results.full_transcript.timecoded_words.length > 0 ? (
                  // Fallback: if no polished text, reconstruct from timecoded words
                  (() => {
                    let transcriptText = '';
                    results.full_transcript.timecoded_words.forEach((wordData, idx) => {
                      const word = wordData.word || '';
                      // Add space before word (except for punctuation)
                      if (idx > 0 && !word.match(/^[.,!?;:]/)) {
                        transcriptText += ' ';
                      }
                      transcriptText += word;
                    });
                    return (
                      <div style={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.8',
                        fontSize: '0.95rem',
                        color: '#1f2937'
                      }}>
                        {transcriptText}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    Transcript not available
                  </div>
                )}
              </div>
            </div>

            {/* Sample Frames Gallery */}
            {results.sample_frames && results.sample_frames.length > 0 && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '2rem', 
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#003D7C', 
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📸 Extracted Video Frames
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    color: '#666', 
                    fontSize: '0.85rem',
                    fontStyle: 'italic'
                  }}>
                    {results.sample_frames.length} frame{results.sample_frames.length !== 1 ? 's' : ''} extracted (max 7 frames)
                    {results.sample_frames.length > 3 && ' - Scroll horizontally to view all frames'}
                  </p>
                </div>
                
                <div 
                style={{
                  position: 'relative',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  paddingBottom: '1rem',
                  marginBottom: '1rem',
                  cursor: results.sample_frames.length > 3 ? 'grab' : 'default',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.5) rgba(0, 0, 0, 0.1)'
                }}
                className="frame-gallery-scroll"
                onMouseDown={(e) => {
                  if (results.sample_frames.length <= 3) return;
                  const container = e.currentTarget;
                  const startX = e.pageX - container.offsetLeft;
                  const scrollLeft = container.scrollLeft;
                  let isDown = true;

                  const handleMouseMove = (e) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const x = e.pageX - container.offsetLeft;
                    const walk = (x - startX) * 2;
                    container.scrollLeft = scrollLeft - walk;
                  };

                  const handleMouseUp = () => {
                    isDown = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    minWidth: 'max-content',
                    paddingRight: '1rem'
                  }}>
                    {results.sample_frames.map((frame, idx) => {
                      const formatTimestamp = (seconds) => {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                      };
                      
                      return (
                        <div key={idx} style={{
                          position: 'relative',
                          flexShrink: 0,
                          width: '300px',
                          aspectRatio: '16/9',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '2px solid rgba(255, 255, 255, 0.1)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img 
                              src={frame.image} 
                              alt={`Frame at ${formatTimestamp(frame.timestamp)}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                            />
                            {/* Timecode overlay on image */}
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '8px',
                              padding: '0.5rem 0.75rem',
                              background: 'rgba(0, 0, 0, 0.85)',
                              color: '#FFFFFF',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                              fontFamily: 'monospace',
                              letterSpacing: '0.5px',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {formatTimestamp(frame.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {results.sample_frames.length > 3 && (
                  <p style={{
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    color: '#003D7C',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    Hover and drag to view more frames
                  </p>
                )}
              </div>
            )}

            {/* MARS breakdown after transcript and extracted frames */}
            {results.mars_rubric && (
              <div
                style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid var(--gray-200)',
                  textAlign: 'left',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--nus-blue)', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={22} />
                  {MARS_INTRO.title}
                </h3>
                <p style={{ margin: '0 0 1rem', color: 'var(--gray-700)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                  {MARS_INTRO.summary}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--primary-50)', borderRadius: '12px', fontSize: '0.9rem' }}>
                  <div><strong>Content</strong> (20%): <span style={{ color: 'var(--nus-blue)' }}>{results.mars_rubric.content_score != null ? `${Number(results.mars_rubric.content_score).toFixed(1)}/10` : '—'}</span></div>
                  <div><strong>Delivery</strong> (40%): <span style={{ color: 'var(--nus-blue)' }}>{results.mars_rubric.delivery_score != null ? `${Number(results.mars_rubric.delivery_score).toFixed(1)}/10` : '—'}</span></div>
                  <div><strong>Engagement</strong> (40%): <span style={{ color: 'var(--nus-blue)' }}>{results.mars_rubric.engagement_score != null ? `${Number(results.mars_rubric.engagement_score).toFixed(1)}/10` : '—'}</span></div>
                  <div style={{ gridColumn: '1 / -1', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    <strong>Overall formula:</strong> {results.mars_rubric.formula || '0.20×Content + 0.40×Delivery + 0.40×Engagement'}
                  </div>
                </div>

                <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.15rem', fontWeight: 700 }}>
                  {MARS_CONTENT_MAIN.code} — {MARS_CONTENT_MAIN.title}
                </h4>
                {MARS_CONTENT_SECTIONS.map((sec) => (
                  <div key={sec.code} style={{ marginBottom: '1.15rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontSize: '0.98rem' }}>
                      {sec.code} {sec.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {sec.criteriaKeys.map((ck) => {
                        const row = MARS_CONTENT_CRITERIA.find((r) => r.key === ck);
                        if (!row) return null;
                        const v = results.mars_rubric.content_criteria?.[row.key] ?? results.teaching_effectiveness?.mars_content_criteria?.[row.key];
                        return (
                          <div key={row.key} style={{ padding: '0.85rem 1rem', border: '1px solid var(--gray-200)', borderRadius: '10px', background: '#fafafa' }}>
                            <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>
                              {sec.code}.{sec.criteriaKeys.indexOf(ck) + 1} {row.label} {v != null && <span style={{ color: 'var(--nus-blue)', fontWeight: 600 }}>({v}/10)</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{row.weightInSubgroup}</div>
                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>What it means:</strong> {row.meaning}</p>
                            <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>How it is computed:</strong> {row.how}</p>
                            {v != null && (
                              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)', lineHeight: 1.5 }}>
                                <strong>Why this score:</strong> {getWhyContent(row.key, v, results)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <h4 style={{ margin: '1.35rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.15rem', fontWeight: 700 }}>
                  {MARS_DELIVERY_MAIN.code} — {MARS_DELIVERY_MAIN.title}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {MARS_DELIVERY_CRITERIA.map((row) => (
                    <div key={row.key} style={{ padding: '0.85rem 1rem', border: '1px solid var(--gray-200)', borderRadius: '10px', background: '#fafafa' }}>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>
                        {row.key === 'speech' ? '2.1' : '2.2'} {row.label}
                        {row.key === 'speech' && results.speech_analysis?.score != null && (
                          <span style={{ color: 'var(--nus-blue)', fontWeight: 600 }}> ({results.speech_analysis.score}/10)</span>
                        )}
                        {row.key === 'body' && results.body_language?.score != null && (
                        <span style={{ color: 'var(--nus-blue)', fontWeight: 600 }}> ({Number(results.body_language.score).toFixed(1)}/10)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{row.subgroup}</div>

                      {row.key === 'speech' && (
                        <div style={{ marginTop: '0.65rem', padding: '0.85rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--nus-blue)' }}>Quantitative speech metrics (50% of Delivery)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                            <div><strong>Speaking rate:</strong> {results.speech_analysis?.raw_metrics?.words_per_minute ?? 0} WPM — {results.speech_analysis?.metric_scores?.speaking_rate ?? '—'}/10</div>
                            <div><strong>Filler ratio:</strong> {results.speech_analysis?.raw_metrics?.filler_ratio_percentage ?? 0}% — {results.speech_analysis?.metric_scores?.filler_ratio ?? '—'}/10</div>
                            <div><strong>Voice variety:</strong> {results.speech_analysis?.raw_metrics?.voice_variety_index ?? 0} — {results.speech_analysis?.metric_scores?.voice_variety ?? '—'}/10</div>
                            <div><strong>Pause effectiveness:</strong> {results.speech_analysis?.raw_metrics?.pause_effectiveness_index ?? 0} — {results.speech_analysis?.metric_scores?.pause_effectiveness ?? '—'}/10</div>
                            <div><strong>Transcription confidence:</strong> {results.speech_analysis?.raw_metrics?.transcription_confidence ?? 0}% — {results.speech_analysis?.metric_scores?.transcription_confidence ?? '—'}/10</div>
                          </div>
                          {results.detailed_insights?.filler_word_analysis?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>
                              <strong>Filler words detected:</strong>{' '}
                              {results.detailed_insights.filler_word_analysis.slice(0, 10).map((f, i) => `${i ? ', ' : ''}"${f.word}" (${f.count}x)`)}
                            </div>
                          )}
                        </div>
                      )}

                      {row.key === 'body' && (
                        <div style={{ marginTop: '0.65rem', padding: '0.85rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--nus-blue)' }}>Quantitative body language metrics (50% of Delivery)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                            <div><strong>Eye contact:</strong> {results.body_language?.raw_metrics?.eye_contact_raw ?? 0}/10 — {results.body_language?.metric_scores?.eye_contact ?? '—'}/10</div>
                            <div><strong>Gestures:</strong> {results.body_language?.raw_metrics?.gestures_raw ?? 0}/10 — {results.body_language?.metric_scores?.gestures ?? '—'}/10</div>
                            <div><strong>Posture:</strong> {results.body_language?.raw_metrics?.posture_raw ?? 0}/10 — {results.body_language?.metric_scores?.posture ?? '—'}/10</div>
                            <div><strong>Facial engagement:</strong> {results.body_language?.raw_metrics?.engagement_raw ?? 0}/10 — {results.body_language?.metric_scores?.facial_engagement ?? '—'}/10</div>
                            <div><strong>Professionalism:</strong> {results.body_language?.raw_metrics?.professionalism_raw ?? 0}/10 — {results.body_language?.metric_scores?.professionalism ?? '—'}/10</div>
                          </div>
                          {results.body_language?.remarks && (
                            <p style={{ margin: '0.75rem 0 0', color: '#92400e', fontStyle: 'italic', fontSize: '0.88rem' }}>
                              ⚠️ {results.body_language.remarks}
                            </p>
                          )}
                        </div>
                      )}

                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>What it means:</strong> {row.meaning}</p>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>How it is computed:</strong> {row.how}</p>
                      {row.key === 'speech' && results.speech_analysis?.score != null && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)', lineHeight: 1.5 }}>
                          <strong>Why this score:</strong> {getWhyDelivery('speech', results.speech_analysis.score, results)}
                        </p>
                      )}
                      {row.key === 'body' && results.body_language?.score != null && (
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)', lineHeight: 1.5 }}>
                        <strong>Why this score:</strong> {getWhyDelivery('body', Number(results.body_language.score).toFixed(1), results)}
                      </p>
                      )}
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '1.25rem 0 0.5rem', color: 'var(--nus-blue)', fontSize: '1.15rem', fontWeight: 700 }}>
                  {MARS_ENGAGEMENT_MAIN.code} — {MARS_ENGAGEMENT_MAIN.title}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {MARS_ENGAGEMENT_CRITERIA.map((row, ei) => {
                    const engagementValueMap = {
                      question_density: results.interaction_engagement?.interaction_frequency,
                      cli_block: results.interaction_engagement?.question_quality,
                      sui: results.interaction_engagement?.student_uptake_index,
                      qds: results.interaction_engagement?.question_distribution_stability,
                      learner_question_frequency: results.interaction_engagement?.student_question_frequency_score,
                      learner_question_cognitive: results.interaction_engagement?.student_question_cognitive_score,
                    };
                    const ev = engagementValueMap[row.key];
                    const engLabel = row.code || `3.${ei + 1}`;
                    const ic = results.interaction_engagement?.icap_counts || {};
                    return (
                    <div key={row.key} style={{ padding: '0.85rem 1rem', border: '1px solid var(--gray-200)', borderRadius: '10px', background: '#fafafa' }}>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: '0.95rem' }}>
                        {engLabel} {row.label} {ev != null && !Number.isNaN(Number(ev)) && <span style={{ color: 'var(--nus-blue)', fontWeight: 600 }}>({Number(ev).toFixed(1)}/10)</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{row.subgroup}</div>

                      {row.key === 'question_density' && (results.interaction_engagement?.all_questions || []).length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.86rem', color: 'var(--gray-800)', lineHeight: 1.45 }}>
                          <strong>Questions asked (evidence):</strong>
                          <ol style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                            {[...(results.interaction_engagement.all_questions || [])].sort((a, b) => Number(a.start_time || 0) - Number(b.start_time || 0)).slice(0, 40).map((q, qi) => (
                              <li key={qi} style={{ marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--gray-600)' }}>[{q.precise_timestamp || secToClock(q.start_time)}] ({q.icap || '—'})</span> {q.question}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {row.key === 'cli_block' && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.86rem' }}>
                          <strong>Questions per ICAP category:</strong>{' '}
                          Passive {ic.passive ?? 0}, Active {ic.active ?? 0}, Constructive {ic.constructive ?? 0}, Interactive {ic.interactive ?? 0}
                          {(results.interaction_engagement?.total_questions ?? 0) > 0 && ic.interactive != null && (
                            <span style={{ display: 'block', marginTop: '0.35rem' }}>
                              <strong>Interactive share:</strong>{' '}
                              {((Number(ic.interactive) / Number(results.interaction_engagement.total_questions)) * 100).toFixed(1)}% of all questions (primary input for CLI bands).
                            </span>
                          )}
                        </div>
                      )}

                      {row.key === 'qds' && Array.isArray(results.interaction_engagement?.qds_quintile_hits) && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.86rem', lineHeight: 1.5 }}>
                          <strong>Quintiles of lecture time (each worth 2 points if ≥1 question):</strong>{' '}
                          {['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'].map((lb, i) => (
                            <span key={lb} style={{ display: 'inline-block', marginRight: '0.65rem', marginTop: '0.2rem' }}>
                              {lb}: {results.interaction_engagement.qds_quintile_hits[i] ? <strong style={{ color: 'var(--success-700)' }}>yes (+2)</strong> : <span style={{ color: 'var(--gray-500)' }}>no</span>}
                            </span>
                          ))}
                          <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--gray-700)' }}>
                            Sections with questions: <strong>{results.interaction_engagement.qds_quintiles_filled ?? '—'}</strong>/5 → QDS{' '}
                            <strong>{results.interaction_engagement.question_distribution_stability ?? '—'}</strong>/10
                          </span>
                        </div>
                      )}

                      {row.key === 'sui' && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.86rem', color: 'var(--gray-800)' }}>
                          <strong>
                            Student / audience questions (model-estimated):{' '}
                            {(results.interaction_engagement?.audience_question_count != null
                              ? results.interaction_engagement.audience_question_count
                              : (results.interaction_engagement?.audience_questions || []).length)}
                          </strong>{' '}
                          {(results.interaction_engagement?.audience_questions || []).length > 0 ? (
                            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                              {(results.interaction_engagement.audience_questions || []).slice(0, 20).map((a, ai) => (
                                <li key={ai}>{typeof a === 'object' ? (a.question || a.text || JSON.stringify(a)) : String(a)}</li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--gray-600)' }}>None listed ({results.interaction_engagement?.student_feedback_remarks || 'typical for single-speaker webcast'}).</span>
                          )}
                          <div style={{ marginTop: '0.5rem', color: '#92400e' }}>
                            <strong>Note:</strong> Student voice is often missing in webcasts. SUI now combines transcript uptake cues (when visible) with a{' '}
                            <strong>prompting-density proxy</strong> from Active / Constructive / Interactive questions per minute, so heavy questioning is not forced to ~2/10.
                            {results.interaction_engagement.sui_prompting_proxy != null && results.interaction_engagement.sui_uptake_raw != null && (
                              <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.82rem' }}>
                                Raw uptake component ≈ {Number(results.interaction_engagement.sui_uptake_raw).toFixed(1)}/10; prompting proxy ≈{' '}
                                {Number(results.interaction_engagement.sui_prompting_proxy).toFixed(1)}/10 (MARS uses the blended value shown above).
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>What it means:</strong> {row.meaning}</p>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5 }}><strong>How it is computed:</strong> {row.how}</p>
                      {ev != null && !Number.isNaN(Number(ev)) && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--nus-blue)', lineHeight: 1.5 }}>
                          <strong>Why this score:</strong> {buildEngagementWhy(row.key, Number(ev), results)}
                        </p>
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Interaction & Engagement Analysis */}
            {false && results.interaction_engagement && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '2rem', 
                background: 'linear-gradient(135deg, var(--success-50), var(--primary-50))',
                borderRadius: '16px',
                border: '1px solid var(--gray-200)'
              }}>
                <h3 style={{ 
                  margin: '0 0 1.5rem 0', 
                  color: 'var(--nus-blue)', 
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🤝 Interaction & Engagement Analysis
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Total Questions:</strong> {results.interaction_engagement.total_questions}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Interaction Frequency:</strong> {results.interaction_engagement.interaction_frequency_pct != null ? `${results.interaction_engagement.interaction_frequency_pct}%` : `${results.interaction_engagement.interaction_frequency ?? 0}/10`}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Question Quality:</strong> {results.interaction_engagement.question_quality_pct != null ? `${results.interaction_engagement.question_quality_pct}%` : `${results.interaction_engagement.question_quality ?? 0}/10`}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Student Uptake Index (SUI):</strong> {results.interaction_engagement.student_uptake_index_pct != null ? `${results.interaction_engagement.student_uptake_index_pct}%` : (results.interaction_engagement.student_uptake_index ?? results.interaction_engagement.student_engagement_opportunities ?? 0) + '/10'}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Question Distribution Stability (QDS):</strong> {results.interaction_engagement.question_distribution_stability_pct != null ? `${results.interaction_engagement.question_distribution_stability_pct}%` : `${results.interaction_engagement.question_distribution_stability ?? 0}/10`}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Overall (20% category):</strong> {results.interaction_engagement.overall_interaction_pct != null ? `${results.interaction_engagement.overall_interaction_pct}%` : (results.interaction_engagement.score ?? 0) + '/10'}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Cognitive Level:</strong> {results.interaction_engagement.cognitive_level}
                  </div>
                </div>

                {/* ICAP distribution (Interactive / Constructive / Active / Passive) */}
                {results.interaction_engagement.icap_counts && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ padding: '0.35rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '8px', fontSize: '0.9rem' }}>Interactive: {results.interaction_engagement.icap_counts.interactive || 0}</span>
                    <span style={{ padding: '0.35rem 0.75rem', background: '#d1fae5', color: '#065f46', borderRadius: '8px', fontSize: '0.9rem' }}>Constructive: {results.interaction_engagement.icap_counts.constructive || 0}</span>
                    <span style={{ padding: '0.35rem 0.75rem', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '0.9rem' }}>Active: {results.interaction_engagement.icap_counts.active || 0}</span>
                    <span style={{ padding: '0.35rem 0.75rem', background: '#f3f4f6', color: '#4b5563', borderRadius: '8px', fontSize: '0.9rem' }}>Passive: {results.interaction_engagement.icap_counts.passive || 0}</span>
                  </div>
                )}

                {/* Download question list (Excel with ICAP: Interactive / Constructive / Active / Passive) */}
                {(results.interaction_engagement.questions_excel_filename || results.questions_excel_filename) && (analysisId || userAnalysisId) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <a
                      href={`${API_BASE_URL}/analysis/${analysisId || userAnalysisId}/questions-excel`}
                      download={`${(results.interaction_engagement.questions_excel_filename || results.questions_excel_filename) || 'questions.xlsx'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        background: 'var(--nus-blue)',
                        color: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}
                    >
                      📥 Download question list (Excel)
                    </a>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                      All questions with ICAP labels: Interactive, Constructive, Active, Passive
                    </p>
                  </div>
                )}
                
                {/* Metric Explanations */}
                {results.interaction_engagement.explanations && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0, 61, 124, 0.05)', borderRadius: '8px' }}>
                    <h5 style={{ color: 'var(--nus-blue)', marginBottom: '1rem', fontSize: '1rem' }}>Metric Explanations</h5>
                    {Object.entries(results.interaction_engagement.explanations).map(([metric, explanation]) => (
                      <div key={metric} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 61, 124, 0.1)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                          {metric.replace(/_/g, ' ')}: <span style={{ color: 'var(--nus-blue)' }}>{explanation.rating}</span> ({explanation.score_range})
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.25rem' }}>
                          {explanation.justification}
                        </div>
                        {explanation.remarks && (
                          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                            Note: {explanation.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* High-Level Questions with Timecodes */}
                {results.interaction_engagement.high_level_questions && results.interaction_engagement.high_level_questions.length > 0 && (
                  <div style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                      💡 High-Level Questions Detected
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {results.interaction_engagement.high_level_questions.map((question, idx) => (
                        <div key={idx} style={{ 
                          padding: '1rem', 
                          background: 'var(--primary-50)', 
                          borderRadius: '8px',
                          borderLeft: '4px solid var(--nus-orange)'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem',
                            marginBottom: '0.5rem'
                          }}>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              background: 'var(--nus-orange)', 
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              {question.precise_timestamp || question.approx_time}
                            </span>
                            {question.icap && (
                              <span style={{ 
                                padding: '0.25rem 0.75rem', 
                                background: question.icap === 'Interactive' ? '#1e40af' : question.icap === 'Constructive' ? '#065f46' : '#92400e',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '0.85rem'
                              }}>
                                {question.icap}
                              </span>
                            )}
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              background: 'var(--success-100)', 
                              color: 'var(--success-700)',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {question.type || 'High-Level Question'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--gray-700)' }}>
                            "{question.question}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interaction Moments */}
                {results.interaction_engagement.interaction_moments && results.interaction_engagement.interaction_moments.length > 0 && (
                  <div style={{ 
                    background: 'white', 
                    padding: '1.5rem', 
                    borderRadius: '12px'
                  }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                      👥 Student Interaction Moments
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {results.interaction_engagement.interaction_moments.map((moment, idx) => (
                        <div key={idx} style={{ 
                          padding: '1rem', 
                          background: 'var(--success-50)', 
                          borderRadius: '8px',
                          borderLeft: '4px solid var(--success-500)'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem',
                            marginBottom: '0.5rem'
                          }}>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              background: 'var(--success-500)', 
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              {moment.precise_timestamp || moment.approx_time}
                            </span>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              background: 'var(--primary-100)', 
                              color: 'var(--primary-700)',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {moment.type || 'Interaction'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--gray-700)' }}>
                            {moment.moment}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filler Words with Timecodes */}
            {false && results.filler_words_detailed && results.filler_words_detailed.timecoded_occurrences && results.filler_words_detailed.timecoded_occurrences.length > 0 && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '2rem', 
                background: 'white',
                borderRadius: '16px',
                border: '1px solid var(--gray-200)'
              }}>
                <h3 style={{ 
                  margin: '0 0 1.5rem 0', 
                  color: 'var(--nus-blue)', 
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🔍 Filler Words Analysis
                </h3>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--accent-50)', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                      <strong>Total Filler Words:</strong> {results.filler_words_detailed.total_count}
                    </div>
                    <div>
                      <strong>Filler Ratio:</strong> {results.filler_words_detailed.ratio_percentage}%
                    </div>
                  </div>
                </div>

                <h4 style={{ color: 'var(--gray-700)', marginBottom: '1rem' }}>
                  Filler Word Occurrences (with timestamps)
                </h4>
                
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: 'var(--gray-50)',
                  borderRadius: '8px'
                }}>
                  {results.filler_words_detailed.timecoded_occurrences.map((filler, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.5rem 1rem', 
                      background: 'var(--accent-100)', 
                      borderRadius: '8px',
                      border: '1px solid var(--nus-orange-light)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ 
                        padding: '0.15rem 0.5rem',
                        background: 'var(--nus-orange)',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {filler.timestamp}
                      </span>
                      <span style={{ color: 'var(--nus-orange-dark)', fontWeight: '600' }}>
                        "{filler.word}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehensive Summary */}
            {false && results.comprehensive_summary && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '2.5rem', 
                background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))',
                borderRadius: '16px',
                border: '2px solid var(--nus-orange)'
              }}>
                <h3 style={{ 
                  margin: '0 0 2rem 0', 
                  color: 'var(--nus-blue)', 
                  fontSize: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderBottom: '2px solid var(--nus-orange)',
                  paddingBottom: '1rem'
                }}>
                  📊 Comprehensive Teaching Evaluation
                </h3>

                {/* Overall Summary */}
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'white', 
                  borderRadius: '12px',
                  marginBottom: '2rem',
                  borderLeft: '4px solid var(--nus-orange)'
                }}>
                  <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>Overall Assessment</h4>
                  <p style={{ fontSize: '1rem', lineHeight: '1.8', color: 'var(--gray-700)', margin: 0 }}>
                    {results.comprehensive_summary.overall_summary}
                  </p>
                </div>

                {/* Three-Part Review */}
                <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📚 Content Review
                    </h4>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--gray-700)', margin: 0 }}>
                      {results.comprehensive_summary.content_review}
                    </p>
                  </div>

                  <div style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🎭 Presentation Review
                    </h4>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--gray-700)', margin: 0 }}>
                      {results.comprehensive_summary.presentation_review}
                    </p>
                  </div>

                  <div style={{ padding: '1.5rem', background: 'white', borderRadius: '12px' }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🧠 Cognitive Skills Review
                    </h4>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--gray-700)', margin: 0 }}>
                      {results.comprehensive_summary.cognitive_skills_review}
                    </p>
                  </div>
                </div>

                {/* Key Evidence from Transcript */}
                {results.comprehensive_summary.key_evidence && results.comprehensive_summary.key_evidence.length > 0 && (
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'white', 
                    borderRadius: '12px',
                    marginBottom: '2rem'
                  }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      💎 Key Evidence from Lecture
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {results.comprehensive_summary.key_evidence.map((evidence, idx) => (
                        <div key={idx} style={{ 
                          padding: '1rem 1.5rem', 
                          background: 'var(--primary-50)', 
                          borderRadius: '8px',
                          borderLeft: '4px solid var(--success-500)',
                          position: 'relative'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: '0.75rem',
                            right: '1rem',
                            padding: '0.25rem 0.75rem',
                            background: 'var(--success-500)',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            Evidence #{idx + 1}
                          </div>
                          <p style={{ 
                            fontSize: '0.95rem', 
                            fontStyle: 'italic', 
                            color: 'var(--gray-700)',
                            margin: '0 0 0.75rem 0',
                            paddingRight: '5rem'
                          }}>
                            "{evidence.quote || evidence}"
                          </p>
                          {evidence.context && (
                            <p style={{ 
                              fontSize: '0.85rem', 
                              color: 'var(--gray-600)', 
                              margin: 0 
                            }}>
                              Context: {evidence.context}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Recommendations */}
                {results.comprehensive_summary.specific_recommendations && results.comprehensive_summary.specific_recommendations.length > 0 && (
                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'white', 
                    borderRadius: '12px'
                  }}>
                    <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🎯 Specific Recommendations
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {results.comprehensive_summary.specific_recommendations.map((rec, idx) => (
                        <li key={idx} style={{ 
                          fontSize: '0.95rem', 
                          lineHeight: '1.7', 
                          color: 'var(--gray-700)',
                          marginBottom: '0.75rem'
                        }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

              {/* Speech Metrics */}
              {false && <div style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--gray-200)'
              }}>
                <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                  🎤 Speech Analysis Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <strong>Total Words:</strong> {results.speech_analysis.raw_metrics?.total_words || 0}
                  </div>
                  <div>
                    <strong>Duration:</strong> {results.speech_analysis.raw_metrics?.duration_minutes || 0} min
                  </div>
                  <div>
                    <strong>Speaking Rate:</strong> {results.speech_analysis.raw_metrics?.words_per_minute || 0} WPM
                  </div>
                  <div>
                    <strong>Filler Words:</strong> {results.speech_analysis.raw_metrics?.filler_word_count || 0} ({results.speech_analysis.raw_metrics?.filler_ratio_percentage || 0}%)
                  </div>
                  <div>
                    <strong>Voice Variety:</strong> {results.speech_analysis.raw_metrics?.voice_variety_index || 0}
                  </div>
                  <div>
                    <strong>Pause Effectiveness:</strong> {results.speech_analysis.raw_metrics?.pause_effectiveness_index || 0}
                  </div>
                  <div>
                    <strong>Speaking Time:</strong> {results.speech_analysis.raw_metrics?.speaking_time_ratio || 0}%
                  </div>
                  <div>
                    <strong>Transcription Accuracy:</strong> {results.speech_analysis.raw_metrics?.transcription_confidence || 0}%
                  </div>
                </div>
                
                {/* Metric Explanations */}
                {results.speech_analysis.explanations && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 61, 124, 0.05)', borderRadius: '8px' }}>
                    <h5 style={{ color: 'var(--nus-blue)', marginBottom: '1rem', fontSize: '1rem' }}>Metric Explanations</h5>
                    {Object.entries(results.speech_analysis.explanations).map(([metric, explanation]) => (
                      <div key={metric} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 61, 124, 0.1)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                          {metric.replace(/_/g, ' ')}: <span style={{ color: 'var(--nus-blue)' }}>{explanation.rating}</span> ({explanation.score_range})
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.25rem' }}>
                          {explanation.justification}
                        </div>
                        {explanation.remarks && (
                          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                            Note: {explanation.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Filler Words Detail */}
                {results.detailed_insights?.filler_word_analysis && results.detailed_insights.filler_word_analysis.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <strong>Filler Words Detected:</strong>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {results.detailed_insights.filler_word_analysis.map((filler, idx) => (
                        <span key={idx} style={{ 
                          padding: '0.25rem 0.75rem', 
                          background: 'var(--accent-100)', 
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          color: 'var(--nus-orange-dark)'
                        }}>
                          "{filler.word}" ({filler.count}×)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>}

              {/* Visual Metrics */}
              {false && <div style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--gray-200)'
              }}>
                <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                  👁️ Visual Analysis Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <strong>Frames Analysed:</strong> {results.body_language.raw_metrics?.total_frames_extracted || 0}
                  </div>
                  <div>
                    <strong>Frame Interval:</strong> {results.body_language.raw_metrics?.frame_interval_seconds || 0}s
                  </div>
                  <div>
                    <strong>Eye Contact Score:</strong> {results.body_language.raw_metrics?.eye_contact_raw || 0}/10
                  </div>
                  <div>
                    <strong>Gestures Score:</strong> {results.body_language.raw_metrics?.gestures_raw || 0}/10
                  </div>
                  <div>
                    <strong>Posture Score:</strong> {results.body_language.raw_metrics?.posture_raw || 0}/10
                  </div>
                  <div>
                    <strong>Engagement Score:</strong> {results.body_language.raw_metrics?.engagement_raw || 0}/10
                  </div>
                  <div>
                    <strong>Professionalism:</strong> {results.body_language.raw_metrics?.professionalism_raw || 0}/10
                  </div>
                </div>
                
                {/* Visual Analysis Remarks */}
                {results.body_language.remarks && (
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px' 
                  }}>
                    <p style={{ 
                      margin: 0, 
                      color: '#92400e', 
                      fontSize: '0.9rem', 
                      lineHeight: '1.6',
                      fontStyle: 'italic'
                    }}>
                      ⚠️ {results.body_language.remarks}
                    </p>
              </div>
                )}
                
                {/* Metric Explanations */}
                {false && results.body_language.explanations && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 61, 124, 0.05)', borderRadius: '8px' }}>
                    <h5 style={{ color: 'var(--nus-blue)', marginBottom: '1rem', fontSize: '1rem' }}>Metric Explanations</h5>
                    {Object.entries(results.body_language.explanations).map(([metric, explanation]) => (
                      <div key={metric} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 61, 124, 0.1)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                          {metric.replace(/_/g, ' ')}: <span style={{ color: 'var(--nus-blue)' }}>{explanation.rating}</span> ({explanation.score_range})
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.25rem' }}>
                          {explanation.justification}
                        </div>
                        {explanation.remarks && (
                          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                            Note: {explanation.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>}

              {/* Teaching Effectiveness Explanations */}
              {false && results.teaching_effectiveness?.explanations && (
                <div style={{ 
                  background: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem',
                  border: '1px solid var(--gray-200)'
                }}>
                  <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                    📚 Teaching Effectiveness Explanations
                  </h4>
                  {Object.entries(results.teaching_effectiveness.explanations).map(([metric, explanation]) => (
                    <div key={metric} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 61, 124, 0.1)' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                        {metric.replace(/_/g, ' ')}: <span style={{ color: 'var(--nus-blue)' }}>{explanation.rating}</span> ({explanation.score_range})
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.25rem' }}>
                        {explanation.justification}
                      </div>
                      {explanation.remarks && (
                        <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          Note: {explanation.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Presentation Skills Explanations */}
              {false && results.presentation_skills?.explanations && (
                <div style={{ 
                  background: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem',
                  border: '1px solid var(--gray-200)'
                }}>
                  <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                    🎯 Presentation Skills Explanations
                  </h4>
                  {Object.entries(results.presentation_skills.explanations).map(([metric, explanation]) => (
                    <div key={metric} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 61, 124, 0.1)' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                        {metric.replace(/_/g, ' ')}: <span style={{ color: 'var(--nus-blue)' }}>{explanation.rating}</span> ({explanation.score_range})
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.25rem' }}>
                        {explanation.justification}
                      </div>
                      {explanation.remarks && (
                        <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          Note: {explanation.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Score Calculation Breakdown */}
              {false && <div style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--gray-200)'
              }}>
                <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>
                  🧮 Score Calculation Breakdown
                </h4>
                
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--primary-50)', borderRadius: '8px' }}>
                  <strong>Formula:</strong>
                  <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {results.calculation_breakdown?.final_calculation?.formula}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--nus-blue)' }}>
                    = {results.calculation_breakdown?.final_calculation?.calculation}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--nus-orange)' }}>
                    = {results.calculation_breakdown?.final_calculation?.result}/10
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {results.calculation_breakdown?.component_scores && Object.entries(results.calculation_breakdown.component_scores).map(([key, data]) => (
                    <div key={key} style={{ 
                      padding: '1rem', 
                      background: 'var(--gray-50)', 
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                          Score: {data.score} × Weight: {(data.weight * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--nus-orange)' }}>
                        {data.contribution.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>

            {/* Real-time Server Logs (KEEP VISIBLE) */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#1e293b',
              borderRadius: '12px',
              maxHeight: '400px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ 
                margin: '0 0 1rem 0', 
                color: '#f1f5f9',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={16} style={{ color: '#10b981' }} />
                Processing Log History
              </h4>
              
              <div 
                ref={logContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  color: '#e2e8f0',
                  paddingRight: '0.5rem'
                }}
              >
                {logMessages.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    No processing logs available
                  </div>
                ) : (
                  logMessages.map((log, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        marginBottom: '0.5rem',
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #334155'
                      }}
                    >
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        [{formatSingaporeTime(log.timestamp)}]
                      </span>
                      <span style={{ 
                        color: log.progress >= 100 ? '#10b981' : '#3b82f6',
                        marginLeft: '0.5rem'
                      }}>
                        [{log.progress}%]
                      </span>
                      <span style={{ marginLeft: '0.5rem', color: '#f1f5f9' }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Feedback Grid */}
            {false && (
            <div className="feedback-grid">
              <div className="feedback-section strengths">
                <h3 className="feedback-title">
                  <CheckCircle size={20} />
                  Key Strengths
                </h3>
                <ul className="feedback-list">
                  {results.strengths.map((strength, index) => (
                    <li key={index} className="feedback-item">
                      <span className="feedback-bullet"></span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="feedback-section improvements">
                <h3 className="feedback-title">
                  <AlertCircle size={20} />
                  Areas for Growth
                </h3>
                <ul className="feedback-list">
                  {results.improvement_suggestions.map((suggestion, index) => (
                    <li key={index} className="feedback-item">
                      <span className="feedback-bullet"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            )}

            {/* Disclaimer */}
            <div style={{
              marginTop: '3rem',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <p style={{
                margin: '0 0 0.75rem 0',
                color: '#003D7C',
                fontSize: '1rem',
                lineHeight: '1.6',
                fontWeight: '600'
              }}>
                <strong style={{ color: '#003D7C' }}>Disclaimer</strong>
              </p>
              <p style={{
                margin: 0,
                color: '#003D7C',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                fontStyle: 'italic'
              }}>
                These results are generated by AI using curated algorithms and may not be accurate. The results may not fully reflect the pedagogical impact. For a more comprehensive consultation, please contact CTLT.
              </p>
            </div>

            {/* Bottom actions */}
            <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={exportTranscriptAndQuestions}
                className="export-button"
                style={{ minWidth: '220px' }}
              >
                <FileText size={16} />
                Export transcript &amp; questions (CLI)
              </button>
              <button
                onClick={exportFullAnalysisView}
                className="export-button"
                style={{ minWidth: '220px' }}
              >
                <Download size={16} />
                Export Full Analysis View
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysisId(null);
                  setAnalysisStatus({
                    status: 'idle',
                    progress: 0,
                    message: 'Ready to start analysis',
                    timestamp: Date.now()
                  });
                  setResults(null);
                  setLogMessages([]);
                  setShowParameters(false);
                }}
                className="reset-button"
              >
                Analyse Another Video
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Configuration Panel - Moved to Bottom */}
      {false && (
        <div className="results-container" style={{ marginBottom: '2rem' }}>
          <div className="results-header">
            <Info size={32} style={{ color: 'var(--nus-orange)' }} />
            <h2 className="results-title">Advanced Configuration</h2>
            <div className="results-actions">
              <button 
                onClick={saveConfiguration} 
                className="export-button"
                disabled={!configChanged}
                style={{ opacity: configChanged ? 1 : 0.6 }}
              >
                <Save size={16} />
                Save Config
              </button>
              <button onClick={resetConfiguration} className="parameter-button">
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          {configChanged && (
            <div style={{ 
              padding: '1rem', 
              background: 'var(--accent-50)', 
              border: `1px solid var(--nus-orange)`,
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--nus-orange-dark)' }}>
                <Info size={16} />
                <strong>Configuration Changed</strong>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--nus-orange-dark)', fontSize: '0.9rem' }}>
                Save your changes to apply them to the next analysis.
              </p>
            </div>
          )}

          {/* Category Weights */}
          <div className="parameter-section">
            <h3 className="parameter-title">Category Weights (%)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.entries(configuration.categoryWeights).map(([key, value]) => (
                <div key={key} style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <label style={{ fontWeight: '600', color: 'var(--gray-700)', fontSize: '0.9rem' }}>
                    {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => updateConfiguration('categoryWeights', null, key, e.target.value)}
                    style={{ 
                      width: '100%', 
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Author Credits */}
      <div style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.9rem',
        lineHeight: '1.6'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          Developed by <strong>Tan Teong Jin, Prakash S/O Perumal Haridas, Maria Goh</strong>.
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          Guided by <strong>Tan Sie Wee</strong>.
        </div>
        <div style={{ marginBottom: '1rem' }}>
          In collaboration with <strong>Mark Gan</strong>.
        </div>
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          Last updated: {deploymentTime || new Date().toLocaleString('en-SG', {
            timeZone: 'Asia/Singapore',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.55)' }}>
          Release build (API){backendBuildIndex != null ? `: #${backendBuildIndex}` : ': —'}
          {backendCommitSha ? ` · ${backendCommitSha}` : ''}
        </div>
      </div>
    </div>
  );
}

export default App;
