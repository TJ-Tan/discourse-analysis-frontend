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
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showParameters, setShowParameters] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);
  const [logMessages, setLogMessages] = useState([]);
  const logContainerRef = useRef(null);

  // Debug: Log whenever logMessages changes
  useEffect(() => {
    console.log('🔄 logMessages state updated, length:', logMessages.length);
    if (logMessages.length > 0) {
      console.log('📝 Current log messages in state:', logMessages);
    }
  }, [logMessages]);

  // Auto-scroll to bottom when new log messages arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logMessages]);

  // Enhanced configuration state
  const [configuration, setConfiguration] = useState({
    categoryWeights: {
      speech_analysis: 30,
      body_language: 25,
      teaching_effectiveness: 35,
      presentation_skills: 10
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
      setAnalysisStatus(null);
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
        speech_analysis: 30,
        body_language: 25,
        teaching_effectiveness: 35,
        presentation_skills: 10
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
  const startAnalysis = async () => {
    if (!file) return;

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
          // Status update
          setAnalysisStatus({
            status: message.data.status,
            progress: message.data.progress,
            message: message.data.message,
            timestamp: Date.now()
          });
        } else if (message.type === 'complete') {
          // Analysis complete
          console.log('🏁 Analysis completed');
          setResults(message.data.results);
          setAnalysisStatus({
            status: 'completed',
            progress: 100,
            message: 'Analysis complete!',
            timestamp: Date.now()
          });
          eventSource.close();
        } else if (message.type === 'error') {
          console.error('❌ Analysis error');
          setAnalysisStatus({
            status: 'error',
            progress: 0,
            message: message.data.message || 'Analysis failed',
            timestamp: Date.now()
          });
          eventSource.close();
        }
      } catch (error) {
        console.error('❌ Message parse error:', error);
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
              <h1>Enhanced Discourse Analysis Report</h1>
              <p>AI-Powered Pedagogical Assessment with Advanced Metrics</p>
            </div>
            
            <div class="overall-score">
              <div class="score">${results.overall_score}/10</div>
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
      link.download = `enhanced-discourse-analysis-${new Date().toISOString().split('T')[0]}.html`;
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
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="announcement-banner">
            <Sparkles size={16} />
            <span>AI Media Tools Developed by CTLT</span>
            <ArrowRight size={16} />
          </div>
          <h1 className="title">Discourse Analysis with genAI</h1>
          <p className="subtitle">
            Elevate your T&L delivery with AI-enhanced pedagogical insights and personalised feedback
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

        {/* Upload Section */}
        {!analysisId && !analysisStatus && !results && (
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
                  <p className="upload-subtext">Release to upload and analyse</p>
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
            </div>
            
            {/* Overall Progress */}
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${analysisStatus?.progress || 0}%` }}
              ></div>
            </div>
            <div className="progress-percent">{analysisStatus?.progress || 0}% Complete</div>

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
                        [{new Date(log.timestamp).toLocaleTimeString()}]
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
                <div className="score-number">{results.overall_score}/10</div>
                <div className="score-label">Teaching Excellence Score</div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="scores-grid">
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
                        [{new Date(log.timestamp).toLocaleTimeString()}]
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
                  setAnalysisStatus(null);
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

export default App;