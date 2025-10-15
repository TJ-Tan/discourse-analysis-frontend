import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Settings,
  Sparkles,
  ArrowRight,
  Save,
  RotateCcw,
  Sliders,
  Info
} from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://discourse-analysis-backend.up.railway.app';

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
  const [showParameters, setShowParameters] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);
  const [logMessages, setLogMessages] = useState([]);
  const logContainerRef = useRef(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

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

      // Clear existing bokeh
      bokehContainer.innerHTML = '';

      // Create multiple bokeh elements with BIGGER variation
      const bokehCount = 20;
      for (let i = 0; i < bokehCount; i++) {
        const bokeh = document.createElement('div');
        bokeh.className = 'bokeh';
        
        // MUCH BIGGER size variation (5px to 250px) - Extreme variations
        const size = Math.random() * 245 + 5;
        bokeh.style.width = `${size}px`;
        bokeh.style.height = `${size}px`;
        
        // Random position
        bokeh.style.left = `${Math.random() * 100}%`;
        bokeh.style.top = `${Math.random() * 100}%`;
        
        // BIGGER blur variation (1px to 25px) - More dramatic blur
        const blur = Math.random() * 24 + 1;
        bokeh.style.filter = `blur(${blur}px)`;
        
        // BIGGER opacity variation (0.02 to 0.8) - More dramatic opacity range
        const opacity = Math.random() * 0.78 + 0.02;
        bokeh.style.opacity = opacity;
        
        // EXPANDED color variation with lighter tones
        const colors = [
          'rgba(255, 255, 255, 0.4)',     // White
          'rgba(173, 216, 230, 0.4)',      // Light Blue
          'rgba(211, 211, 211, 0.4)',      // Light Grey
          'rgba(255, 218, 185, 0.4)',      // Light Orange
          'rgba(255, 255, 224, 0.4)',     // Light Yellow
          'rgba(221, 160, 221, 0.4)',     // Light Purple
          'rgba(255, 182, 193, 0.4)',     // Light Pink
          'rgba(144, 238, 144, 0.4)',     // Light Green
          'rgba(255, 228, 196, 0.4)',     // Light Peach
          'rgba(230, 230, 250, 0.4)'     // Lavender
        ];
        bokeh.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // MUCH BIGGER animation duration variation (5s to 30s)
        const duration = Math.random() * 25 + 5;
        bokeh.style.animationDuration = `${duration}s`;
        
        // Random animation delay
        const delay = Math.random() * 10;
        bokeh.style.animationDelay = `${delay}s`;
        
        // Add movement animation with different speeds
        bokeh.style.animation = `bokehFloat ${duration}s ease-in-out infinite`;
        
        bokehContainer.appendChild(bokeh);
      }
    };

    createBokeh();
    
    // Recreate bokeh every 30 seconds for variety
    const interval = setInterval(createBokeh, 30000);
    
    return () => clearInterval(interval);
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
      const response = await axios.get(`${API_BASE_URL}/queue-status`);
      return response.data;
    } catch (error) {
      console.error('Error checking queue status:', error);
      return null;
    }
  };

  const startAnalysis = async () => {
    if (!file) return;

    // Check queue status first
    const queueStatus = await checkQueueStatus();
    if (queueStatus && queueStatus.warning_level !== "none") {
      const shouldProceed = window.confirm(
        `${queueStatus.warning_message}\n\nDo you want to proceed anyway?`
      );
      if (!shouldProceed) {
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setLogMessages([]);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (!response.data || !response.data.analysis_id) {
        alert('Upload succeeded but no analysis ID received. Please try again.');
        setIsUploading(false);
        return;
      }
      
      // Start polling IMMEDIATELY before state updates
      const newAnalysisId = response.data.analysis_id;
      
      // Connect WebSocket for real-time updates
      connectToUpdates(newAnalysisId);
      
      // Then update state
      setAnalysisId(newAnalysisId);
      setUploadProgress(100);
      setIsUploading(false);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        alert('Upload timeout. Please try with a smaller file or check your connection.');
      } else if (error.response) {
        alert(`Upload failed: ${error.response.data?.detail || error.response.statusText}`);
      } else {
        alert(`Upload failed: ${error.message}`);
      }
      setIsUploading(false);
    }
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

  // Enhanced PDF export
  const exportToPDF = async () => {
    if (!results || !analysisId) return;

    setIsGeneratingPDF(true);
    try {
      const generateEnhancedPDFContent = () => {
        const doc = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Enhanced Discourse Analysis Report</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              body {
                font-family: 'Inter', sans-serif;
                line-height: 1.6;
                color: #1f2937;
                margin: 0;
                padding: 40px;
                background: white;
              }
              
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding: 30px 0;
                background: linear-gradient(135deg, #003D7C, #EF7C00);
                color: white;
                border-radius: 12px;
                margin: -40px -40px 40px -40px;
                padding: 60px 40px;
              }
              
              .header h1 {
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0 0 10px 0;
                letter-spacing: -0.025em;
              }
              
              .overall-score {
                text-align: center;
                margin: 40px 0;
                padding: 30px;
                background: linear-gradient(135deg, #003D7C, #EF7C00);
                color: white;
                border-radius: 16px;
              }
              
              .overall-score .score {
                font-size: 4rem;
                font-weight: 900;
                margin: 0;
              }
              
              .scores-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin: 40px 0;
              }
              
              .score-card {
                padding: 25px;
                background: #f9fafb;
                border-radius: 12px;
                text-align: center;
                border: 1px solid #e5e7eb;
              }
              
              .score-card .score {
                font-size: 2.5rem;
                font-weight: 700;
                color: #003D7C;
                margin: 0 0 8px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>MARS Analysis Report</h1>
              <p>Multimodal AI Reflection System - Pedagogical Assessment with Advanced Metrics</p>
            </div>
            
            <div class="overall-score">
              <div class="score">${Math.round(results.overall_score * 10) / 10}/10</div>
              <div style="font-size: 1.2rem; opacity: 0.9;">Overall Teaching Excellence Score</div>
            </div>
            
            <div class="scores-grid">
              <div class="score-card">
                <div class="score">${results.speech_analysis.score}/10</div>
                <div>Speech Analysis</div>
              </div>
              <div class="score-card">
                <div class="score">${results.body_language.score}/10</div>
                <div>Body Language</div>
              </div>
              <div class="score-card">
                <div class="score">${results.teaching_effectiveness.score}/10</div>
                <div>Teaching Effectiveness</div>
              </div>
              <div class="score-card">
                <div class="score">${results.presentation_skills.score}/10</div>
                <div>Presentation Skills</div>
              </div>
            </div>
          </body>
          </html>
        `;
        return doc;
      };

      const htmlContent = generateEnhancedPDFContent();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `MARS-analysis-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        alert('Enhanced report downloaded!');
      }, 500);

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
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
        zIndex: -1,
        overflow: 'hidden'
      }}></div>
      
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="announcement-banner">
            <Sparkles size={16} />
            <span>AI Media Tools Developed by CTLT</span>
            <ArrowRight size={16} />
          </div>
          <h1 className="title">MARS</h1>
          <p className="subtitle">
            Multimodal AI Reflection System
          </p>
          <p className="subheader">
            Discourse analysis with AI-enhanced pedagogical insights and personalised feedback.
          </p>
        </div>

        {/* Configuration Panel */}
        {showAdvancedConfig && (
          <div className="results-container" style={{ marginBottom: '2rem' }}>
            <div className="results-header">
              <Sliders size={32} style={{ color: 'var(--nus-orange)' }} />
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

        {/* Queue Warning */}
        {queueWarning && (
          <div style={{
            background: queueWarning.warning_level === 'high' ? 
              'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 
              queueWarning.warning_level === 'medium' ? 
              'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 
              'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: queueWarning.warning_level === 'high' ? 
              '2px solid #ef4444' : 
              queueWarning.warning_level === 'medium' ? 
              '2px solid #f59e0b' : 
              '2px solid #0ea5e9',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
            boxShadow: queueWarning.warning_level === 'high' ? 
              '0 10px 25px rgba(239, 68, 68, 0.15), 0 4px 6px rgba(239, 68, 68, 0.1)' :
              queueWarning.warning_level === 'medium' ?
              '0 10px 25px rgba(245, 158, 11, 0.15), 0 4px 6px rgba(245, 158, 11, 0.1)' :
              '0 10px 25px rgba(14, 165, 233, 0.15), 0 4px 6px rgba(14, 165, 233, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: queueWarning.warning_level === 'high' ?
                'radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, transparent 70%)' :
                queueWarning.warning_level === 'medium' ?
                'radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%)' :
                'radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>
            
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  fontSize: '32px',
                  marginRight: '12px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>
                  {queueWarning.warning_level === 'high' ? '🚨' : 
                   queueWarning.warning_level === 'medium' ? '⚠️' : 'ℹ️'}
                </div>
                <h4 style={{ 
                  color: queueWarning.warning_level === 'high' ? '#dc2626' : 
                         queueWarning.warning_level === 'medium' ? '#d97706' : '#0c4a6e', 
                  margin: '0',
                  fontSize: '20px',
                  fontWeight: '700',
                  letterSpacing: '-0.025em'
                }}>
                  System Notice
                </h4>
              </div>
              
              <p style={{ 
                color: queueWarning.warning_level === 'high' ? '#dc2626' : 
                       queueWarning.warning_level === 'medium' ? '#d97706' : '#0c4a6e', 
                margin: '0 0 16px 0',
                fontSize: '16px',
                lineHeight: '1.5',
                fontWeight: '500'
              }}>
                {queueWarning.warning_message}
              </p>
              
              {queueWarning.warning_level === 'high' && (
                <div style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>💡</span>
                    <p style={{ 
                      color: '#dc2626', 
                      margin: '0', 
                      fontSize: '14px', 
                      fontWeight: '600'
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
                marginTop: '16px',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: queueWarning.warning_level === 'high' ? '#ef4444' :
                                   queueWarning.warning_level === 'medium' ? '#f59e0b' : '#0ea5e9',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontWeight: '500'
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
                  <p className="upload-subtext">Drag & drop or click to select • Supports MP4, AVI, MOV, MKV, WMV • Max 1 hour, 500MB • Analyzes 100 frames
                  </p>
                </div>
              ) : (
                <div>
                  <p className="upload-text">Upload your lecture video</p>
                  <p className="upload-subtext">
                    Drag & drop or click to select • Supports MP4, AVI, MOV, MKV, WMV • Max 500MB
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="file-info">
                <div className="file-details">
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
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
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="progress-text">Uploading: {uploadProgress}%</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="parameter-button"
                style={{ 
                  background: showAdvancedConfig ? 'var(--nus-orange)' : 'var(--gray-100)',
                  color: showAdvancedConfig ? 'white' : 'var(--gray-700)',
                  border: `1px solid ${showAdvancedConfig ? 'var(--nus-orange)' : 'var(--gray-300)'}`
                }}
              >
                <Sliders size={16} />
                {showAdvancedConfig ? 'Hide' : 'Show'} Advanced Configuration
              </button>
            </div>
          </div>
        )}

        {/* Analysis Progress with Real-time Logs */}
        {analysisId && !results && (
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
          <div className="results-container">
            <div className="results-header">
              <CheckCircle size={32} style={{ color: 'var(--success-500)' }} />
              <h2 className="results-title">Enhanced Analysis Complete</h2>
              <div className="results-actions">
                <button 
                  onClick={exportToPDF} 
                  className={`export-button ${isGeneratingPDF ? 'pdf-generating' : ''}`}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="spinner"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Export PDF
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowParameters(!showParameters)} 
                  className="parameter-button"
                >
                  <Settings size={16} />
                  {showParameters ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>

            {/* Overall Score */}
            <div className="overall-score">
              <div className="score-display">
                <div className="score-number">{Math.round(results.overall_score * 10) / 10}/10</div>
                <div className="score-label">Teaching Excellence Score</div>
              </div>
            </div>

            {/* Detailed Scores - Now with 5 categories */}
            <div className="scores-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <ScoreDisplay 
                score={results.speech_analysis.score} 
                label="Speech Analysis" 
              />
              <ScoreDisplay 
                score={results.body_language.score} 
                label="Body Language" 
              />
              <ScoreDisplay 
                score={results.teaching_effectiveness.score} 
                label="Teaching Effectiveness" 
              />
              <ScoreDisplay 
                score={results.interaction_engagement?.score || 7} 
                label="Interaction & Engagement" 
              />
              <ScoreDisplay 
                score={results.presentation_skills.score} 
                label="Presentation Skills" 
              />
            </div>

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
                <div><strong>Frames Analyzed:</strong> {results.configuration_used?.frames_analyzed || 0}</div>
              </div>

              <div style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                padding: '1.5rem',
                background: 'var(--gray-50)',
                borderRadius: '12px',
                fontFamily: "'Inter', sans-serif",
                lineHeight: '2',
                fontSize: '0.95rem'
              }}>
                {results.full_transcript?.timecoded_words && results.full_transcript.timecoded_words.length > 0 ? (
                  results.full_transcript.timecoded_words.map((wordData, idx) => (
                    <span key={idx} style={{ marginRight: '0.3rem' }}>
                      {idx % 15 === 0 && (
                        <span style={{ 
                          display: 'inline-block',
                          marginRight: '0.5rem',
                          padding: '0.1rem 0.4rem',
                          background: 'var(--nus-blue)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          verticalAlign: 'middle'
                        }}>
                          {wordData.timestamp}
                        </span>
                      )}
                      {wordData.word}
                    </span>
                  ))
                ) : (
                  <div style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    {results.full_transcript?.text || 'Transcript not available'}
                  </div>
                )}
              </div>
            </div>

            {/* Interaction & Engagement Analysis */}
            {results.interaction_engagement && (
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Total Questions:</strong> {results.interaction_engagement.total_questions}
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Interaction Frequency:</strong> {results.interaction_engagement.interaction_frequency}/10
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Question Quality:</strong> {results.interaction_engagement.question_quality}/10
                  </div>
                  <div style={{ padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <strong>Cognitive Level:</strong> {results.interaction_engagement.cognitive_level}
                  </div>
                </div>

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
            {results.filler_words_detailed && results.filler_words_detailed.timecoded_occurrences && results.filler_words_detailed.timecoded_occurrences.length > 0 && (
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
            {results.comprehensive_summary && (
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
              <div style={{ 
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
              </div>

              {/* Visual Metrics */}
              <div style={{ 
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
                    <strong>Frames Analyzed:</strong> {results.body_language.raw_metrics?.total_frames_extracted || 0}
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
              </div>

              {/* Score Calculation Breakdown */}
              <div style={{ 
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
                        {data.contribution.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

            {/* Reset Button */}
            <div style={{ textAlign: 'center' }}>
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
                  setIsGeneratingPDF(false);
                }}
                className="reset-button"
              >
                Analyse Another Video
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Author Credits */}
      <div style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.9rem',
        lineHeight: '1.6'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Developed by</strong> Teong Jin, Prakash, Maria.
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Guided by</strong> Sie Wee.
        </div>
        <div>
          <strong>In collaboration with</strong> Mark Gan.
        </div>
      </div>
    </div>
  );
}

export default App;