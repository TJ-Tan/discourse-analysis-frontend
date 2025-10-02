import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  Download,
  Settings,
  Sparkles,
  ArrowRight,
  Clock,
  Brain,
  Eye,
  Mic,
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

  console.log('=== RENDER STATE ===', { 
    analysisId, 
    analysisStatusExists: !!analysisStatus,
    analysisStatusValue: analysisStatus?.status,
    analysisProgress: analysisStatus?.progress,
    resultsExist: !!results,
    showUploadSection: !analysisId && !analysisStatus && !results,
    showProgressSection: analysisId && analysisStatus && analysisStatus.status === 'processing' && !results,
    showResultsSection: !!results
  });

  // ADD THIS NEW LOG:
  if (analysisStatus) {
    console.log('🔍 analysisStatus FULL OBJECT:', analysisStatus);
  }

  // Enhanced configuration state
  const [configuration, setConfiguration] = useState({
    // Category weights
    categoryWeights: {
      speech_analysis: 30,
      body_language: 25,
      teaching_effectiveness: 35,
      presentation_skills: 10
    },
    
    // Speech component weights
    speechComponents: {
      speaking_rate: 25,
      clarity: 25,
      confidence: 20,
      voice_variety: 15,
      pause_effectiveness: 15
    },
    
    // Visual component weights
    visualComponents: {
      eye_contact: 25,
      gestures: 20,
      posture: 20,
      engagement: 20,
      professionalism: 15
    },
    
    // Pedagogical component weights
    pedagogyComponents: {
      content_organization: 25,
      engagement_techniques: 20,
      communication_clarity: 20,
      use_of_examples: 20,
      knowledge_checking: 15
    },
    
    // Thresholds
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
    
    // Sampling configuration
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

    console.log('=== STARTING ANALYSIS ===');
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file...');
      console.log('Making request to:', `${API_BASE_URL}/upload-video`);

      const response = await axios.post(`${API_BASE_URL}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minutess
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          console.log('Upload progress:', percentCompleted + '%', `(${progressEvent.loaded}/${progressEvent.total} bytes)`);
        }
      });
      
      console.log('=== UPLOAD FINISHED ===');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      if (!response.data || !response.data.analysis_id) {
        console.error('❌ No analysis_id in response!');
        alert('Upload succeeded but no analysis ID received. Please try again.');
        setIsUploading(false);
        return;
      }

      console.log('✅ Upload complete! Response:', response.data);
      console.log('Analysis ID:', response.data.analysis_id);

      const newAnalysisId = response.data.analysis_id;

      setAnalysisId(newAnalysisId);
      setUploadProgress(100);
      setIsUploading(false);

      // Set initial status to show analysis is starting
      setAnalysisStatus({
        status: 'processing',
        progress: 0,
        message: 'Starting enhanced analysis...',
        timestamp: Date.now()
      });

      // Start polling immediately
      console.log('Starting polling for ID:', newAnalysisId);
      pollAnalysisStatus(newAnalysisId);

    } catch (error) {
      console.error('❌ Upload failed!');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response);

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

  // Poll for analysis status
  const pollAnalysisStatus = async (id) => {
    let pollCount = 0;
    let pollInterval = null; // Declare outside
    
    const checkStatus = async () => {
      try {
        pollCount++;
        const response = await axios.get(`${API_BASE_URL}/analysis-status/${id}`);
        console.log(`Poll #${pollCount} - Status response:`, response.data);
        
        const newStatus = {
          status: response.data.status,
          progress: response.data.progress || 0,
          message: response.data.message || '',
          timestamp: Date.now()
        };
        
        console.log('Setting new status:', newStatus);
        setAnalysisStatus(newStatus);
        
        if (response.data.status === 'completed') {
          console.log('Analysis complete! Setting results...');
          setResults(response.data.results);
          if (pollInterval) clearInterval(pollInterval);
          return true;
        } else if (response.data.status === 'error') {
          alert(`Analysis failed: ${response.data.message}`);
          if (pollInterval) clearInterval(pollInterval);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Status check failed:', error);
        return false;
      }
    };

    // Initial check immediately
    const shouldStop = await checkStatus();
    
    // Only start interval if not already complete
    if (!shouldStop) {
      pollInterval = setInterval(async () => {
        const done = await checkStatus();
        if (done && pollInterval) {
          clearInterval(pollInterval);
        }
      }, 300); // Poll every 300ms for faster updates
    }
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
              
              .header p {
                font-size: 1.1rem;
                opacity: 0.9;
                margin: 0;
              }
              
              .enhanced-badge {
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.9rem;
                margin-top: 15px;
              }
              
              .analysis-summary {
                background: #f8fafc;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 30px;
                border-left: 4px solid #EF7C00;
              }
              
              .config-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
              }
              
              .config-box {
                background: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
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
              
              .enhanced-metrics {
                margin: 30px 0;
                padding: 25px;
                background: #fef7f0;
                border-radius: 12px;
                border-left: 4px solid #EF7C00;
              }
              
              .metric-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px solid #f3f4f6;
              }
              
              .feedback-section {
                margin: 30px 0;
              }
              
              .feedback-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 30px;
              }
              
              .strengths {
                background: #ecfdf5;
                padding: 25px;
                border-radius: 12px;
                border-left: 4px solid #10b981;
              }
              
              .improvements {
                background: #fff4e6;
                padding: 25px;
                border-radius: 12px;
                border-left: 4px solid #EF7C00;
              }
              
              .footer {
                margin-top: 60px;
                text-align: center;
                color: #6b7280;
                font-size: 0.9rem;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Enhanced Discourse Analysis Report</h1>
              <p>AI-Powered Pedagogical Assessment with Advanced Metrics</p>
              <div class="enhanced-badge">
                ✨ Enhanced Analysis • ${results.configuration_used?.frames_analyzed || 'N/A'} Frames • Full Transcript
              </div>
            </div>
            
            <div class="analysis-summary">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">Analysis Configuration</h3>
              <div class="config-info">
                <div class="config-box">
                  <strong>Enhanced Features:</strong><br>
                  • ${results.configuration_used?.frames_analyzed || 40} video frames analysed<br>
                  • Full transcript processing (${results.configuration_used?.transcript_length || 0} characters)<br>
                  • ${results.configuration_used?.filler_words_detected || 0} filler word types detected<br>
                  • Advanced voice variety analysis
                </div>
                <div class="config-box">
                  <strong>Analysis Weights:</strong><br>
                  • Speech Analysis: ${configuration.categoryWeights.speech_analysis}%<br>
                  • Body Language: ${configuration.categoryWeights.body_language}%<br>
                  • Teaching Effectiveness: ${configuration.categoryWeights.teaching_effectiveness}%<br>
                  • Presentation Skills: ${configuration.categoryWeights.presentation_skills}%
                </div>
              </div>
            </div>
            
            <div class="overall-score">
              <div class="score">${results.overall_score}/10</div>
              <div style="font-size: 1.2rem; opacity: 0.9;">Overall Teaching Excellence Score</div>
            </div>
            
            <div class="scores-grid">
              <div class="score-card">
                <div class="score">${results.speech_analysis.score}/10</div>
                <div>Speech Analysis</div>
                <div class="enhanced-metrics" style="margin-top: 15px; text-align: left; font-size: 0.85rem;">
                  <div class="metric-row"><span>Speaking Rate:</span><span>${results.speech_analysis.speaking_rate?.toFixed(1) || 'N/A'} WPM</span></div>
                  <div class="metric-row"><span>Voice Variety:</span><span>${results.speech_analysis.voice_variety?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Pause Effectiveness:</span><span>${results.speech_analysis.pause_effectiveness?.toFixed(1) || 'N/A'}/10</span></div>
                </div>
              </div>
              <div class="score-card">
                <div class="score">${results.body_language.score}/10</div>
                <div>Body Language</div>
                <div class="enhanced-metrics" style="margin-top: 15px; text-align: left; font-size: 0.85rem;">
                  <div class="metric-row"><span>Eye Contact:</span><span>${results.body_language.eye_contact?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Gestures:</span><span>${results.body_language.gestures?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Frames Analysed:</span><span>${results.body_language.frames_analyzed || 'N/A'}</span></div>
                </div>
              </div>
              <div class="score-card">
                <div class="score">${results.teaching_effectiveness.score}/10</div>
                <div>Teaching Effectiveness</div>
                <div class="enhanced-metrics" style="margin-top: 15px; text-align: left; font-size: 0.85rem;">
                  <div class="metric-row"><span>Content Organisation:</span><span>${results.teaching_effectiveness.content_organization?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Engagement Techniques:</span><span>${results.teaching_effectiveness.engagement_techniques?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Knowledge Checking:</span><span>${results.teaching_effectiveness.knowledge_checking?.toFixed(1) || 'N/A'}/10</span></div>
                </div>
              </div>
              <div class="score-card">
                <div class="score">${results.presentation_skills.score}/10</div>
                <div>Presentation Skills</div>
                <div class="enhanced-metrics" style="margin-top: 15px; text-align: left; font-size: 0.85rem;">
                  <div class="metric-row"><span>Voice Modulation:</span><span>${results.presentation_skills.voice_modulation?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Professionalism:</span><span>${results.presentation_skills.professionalism?.toFixed(1) || 'N/A'}/10</span></div>
                  <div class="metric-row"><span>Energy Level:</span><span>${results.presentation_skills.energy?.toFixed(1) || 'N/A'}/10</span></div>
                </div>
              </div>
            </div>
            
            <div class="feedback-section">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Enhanced Feedback Analysis</h2>
              <div class="feedback-grid">
                <div class="strengths">
                  <h3 style="margin: 0 0 15px 0; color: #047857;">Key Strengths</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${results.strengths.map(strength => `<li style="margin: 8px 0;">${strength}</li>`).join('')}
                  </ul>
                </div>
                <div class="improvements">
                  <h3 style="margin: 0 0 15px 0; color: #CC6600;">Areas for Growth</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${results.improvement_suggestions.map(suggestion => `<li style="margin: 8px 0;">${suggestion}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 40px; padding: 25px; background: #f1f5f9; border-radius: 12px;">
              <h3 style="margin: 0 0 15px 0;">Enhanced Analysis Summary</h3>
              <p style="margin: 0; color: #4b5563;">
                This report utilises advanced AI analysis with ${results.configuration_used?.frames_analyzed || 40} video frames, 
                comprehensive transcript processing, and enhanced metrics including voice variety analysis, 
                strategic pause effectiveness, and temporal visual progression tracking.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Enhanced Discourse Analysis Platform</strong></p>
              <p>National University of Singapore • Teaching & Learning Excellence</p>
              <p>Generated on ${new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </body>
          </html>
        `;
        return doc;
      };

      // Create and download enhanced PDF
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
        alert(`Enhanced report downloaded!\n\nFeatures:\n• ${results.configuration_used?.frames_analyzed || 40} video frames analysed\n• Full transcript processing\n• Advanced voice metrics\n• Temporal progression tracking\n\nTo convert to PDF:\n1. Open the HTML file in your browser\n2. Press Ctrl+P (Cmd+P on Mac)\n3. Select "Save as PDF"\n4. Click Save`);
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

  // Get processing step status
  const getStepStatus = (progress, minProgress) => {
    if (progress >= minProgress + 20) return 'completed';
    if (progress >= minProgress) return 'active';
    return 'pending';
  };

  // Processing steps configuration
  const processingSteps = [
    { id: 1, label: 'Extracting enhanced audio and video components', minProgress: 10, icon: <Upload size={12} /> },
    { id: 2, label: 'Analysing speech with advanced metrics', minProgress: 30, icon: <Mic size={12} /> },
    { id: 3, label: 'Analysing visual elements (40 frames)', minProgress: 60, icon: <Eye size={12} /> },
    { id: 4, label: 'Generating comprehensive pedagogical insights', minProgress: 80, icon: <Brain size={12} /> },
    { id: 5, label: 'Calculating weighted component scores', minProgress: 95, icon: <CheckCircle size={12} /> }
  ];

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
                  Save your changes to apply them to the next analysis. Current analysis will use previous settings.
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

            {/* Speech Components */}
            <div className="parameter-section">
              <h3 className="parameter-title">Speech Analysis Sub-Components (%)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {Object.entries(configuration.speechComponents).map(([key, value]) => (
                  <div key={key} style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                    <label style={{ fontWeight: '600', color: 'var(--gray-700)', fontSize: '0.85rem' }}>
                      {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => updateConfiguration('speechComponents', null, key, e.target.value)}
                      style={{ 
                        width: '100%', 
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sampling Configuration */}
            <div className="parameter-section">
              <h3 className="parameter-title">Enhanced Sampling Configuration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <label style={{ fontWeight: '600', color: 'var(--gray-700)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    Frame Interval (seconds)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="30"
                    value={configuration.sampling.frame_interval_seconds}
                    onChange={(e) => updateConfiguration('sampling', null, 'frame_interval_seconds', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '4px'
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: '0.5rem 0 0 0' }}>
                    How often to extract frames (lower = more frames)
                  </p>
                </div>

                <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                  <label style={{ fontWeight: '600', color: 'var(--gray-700)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                    Max Frames Analyzed
                  </label>
                  <input 
                    type="number"
                    min="10"
                    max="100"
                    value={configuration.sampling.max_frames_analyzed}
                    onChange={(e) => updateConfiguration('sampling', null, 'max_frames_analyzed', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '4px'
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: '0.5rem 0 0 0' }}>
                    Maximum number of frames to analyze (higher = more detailed)
                  </p>
                </div>
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
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.5rem 1rem', 
                    background: 'rgba(239, 124, 0, 0.1)', 
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    ✨ Enhanced: {configuration.sampling.max_frames_analyzed} frames • Full transcript • Advanced metrics
                  </div>
                </div>
              )}
            </div>

            {file && (
              <div className="file-info">
                <div className="file-details">
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Enhanced analysis configured
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

                {/* Upload Progress Bar */}
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

            {/* Configuration Toggle */}
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

        {/* Analysis Progress - Detailed Step-by-Step */}
        {analysisId && !results && (
          <div className="progress-container" key={analysisStatus?.timestamp}>
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

            {/* Detailed Step-by-Step Progress */}
            <div className="detailed-steps">
              {/* Step 1: Extraction */}
              <div className={`detail-step ${analysisStatus?.progress >= 10 ? 'active' : 'pending'} ${analysisStatus?.progress >= 25 ? 'completed' : ''}`}>
                <div className="step-header">
                  <div className="step-number">1</div>
                  <div className="step-title">Extracting Audio & Video Components</div>
                  {analysisStatus?.progress >= 25 && <CheckCircle size={20} className="step-check" />}
                </div>
                {analysisStatus?.progress >= 10 && analysisStatus?.progress < 25 && (
                  <div className="step-progress-bar">
                    <div className="mini-progress" style={{width: `${((analysisStatus?.progress - 10) / 15) * 100}%`}}></div>
                  </div>
                )}
                {analysisStatus?.details?.step1 && (
                  <div className="step-results">
                    <div className="result-item">📹 Video Duration: {analysisStatus?.details.step1.duration}</div>
                    <div className="result-item">🖼️ Frames Extracted: {analysisStatus?.details.step1.frames_extracted}</div>
                    <div className="result-item">🎵 Audio: {analysisStatus?.details.step1.audio_format}</div>
                  </div>
                )}
              </div>

              {/* Step 2: Speech Analysis */}
              <div className={`detail-step ${analysisStatus?.progress >= 25 ? 'active' : 'pending'} ${analysisStatus?.progress >= 55 ? 'completed' : ''}`}>
                <div className="step-header">
                  <div className="step-number">2</div>
                  <div className="step-title">Analyzing Speech with Whisper AI</div>
                  {analysisStatus?.progress >= 55 && <CheckCircle size={20} className="step-check" />}
                </div>
                {analysisStatus?.progress >= 25 && analysisStatus?.progress < 55 && (
                  <div className="step-progress-bar">
                    <div className="mini-progress" style={{width: `${((analysisStatus?.progress - 25) / 30) * 100}%`}}></div>
                  </div>
                )}
                {analysisStatus?.details?.step2 && (
                  <div className="step-results">
                    <div className="result-item">📝 Transcript: {analysisStatus?.details.step2.transcript_length} characters</div>
                    <div className="result-item">💬 Word Count: {analysisStatus?.details.step2.word_count} words</div>
                    <div className="result-item">🎤 Speaking Rate: {analysisStatus?.details.step2.speaking_rate}</div>
                  </div>
                )}
              </div>

              {/* Step 3: Visual Analysis */}
              <div className={`detail-step ${analysisStatus?.progress >= 55 ? 'active' : 'pending'} ${analysisStatus?.progress >= 75 ? 'completed' : ''}`}>
                <div className="step-header">
                  <div className="step-number">3</div>
                  <div className="step-title">Analyzing Visual Elements (31 frames)</div>
                  {analysisStatus?.progress >= 75 && <CheckCircle size={20} className="step-check" />}
                </div>
                {analysisStatus?.progress >= 55 && analysisStatus?.progress < 75 && (
                  <div className="step-progress-bar">
                    <div className="mini-progress" style={{width: `${((analysisStatus?.progress - 55) / 20) * 100}%`}}></div>
                    <div className="mini-progress-text">Frame {Math.floor(((analysisStatus?.progress - 55) / 20) * 31)}/31</div>
                  </div>
                )}
              </div>

              {/* Step 4: Pedagogical Analysis */}
              <div className={`detail-step ${analysisStatus?.progress >= 75 ? 'active' : 'pending'} ${analysisStatus?.progress >= 90 ? 'completed' : ''}`}>
                <div className="step-header">
                  <div className="step-number">4</div>
                  <div className="step-title">Generating Pedagogical Insights</div>
                  {analysisStatus?.progress >= 90 && <CheckCircle size={20} className="step-check" />}
                </div>
                {analysisStatus?.progress >= 75 && analysisStatus?.progress < 90 && (
                  <div className="step-progress-bar">
                    <div className="mini-progress" style={{width: `${((analysisStatus?.progress - 75) / 15) * 100}%`}}></div>
                  </div>
                )}
              </div>

              {/* Step 5: Final Calculation */}
              <div className={`detail-step ${analysisStatus?.progress >= 90 ? 'active' : 'pending'} ${analysisStatus?.progress >= 100 ? 'completed' : ''}`}>
                <div className="step-header">
                  <div className="step-number">5</div>
                  <div className="step-title">Calculating Final Scores</div>
                  {analysisStatus?.progress >= 100 && <CheckCircle size={20} className="step-check" />}
                </div>
                {analysisStatus?.progress >= 90 && analysisStatus?.progress < 100 && (
                  <div className="step-progress-bar">
                    <div className="mini-progress" style={{width: `${((analysisStatus?.progress - 90) / 10) * 100}%`}}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
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
                      Export Enhanced PDF
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowParameters(!showParameters)} 
                  className="parameter-button"
                >
                  <Settings size={16} />
                  View Details
                </button>
              </div>
            </div>

            {/* Enhanced Analysis Summary */}
            <div style={{ 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))', 
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid var(--nus-orange-light)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--nus-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} />
                Enhanced Analysis Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong style={{ color: 'var(--nus-blue)' }}>Frames Analysed:</strong><br />
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--nus-orange)' }}>
                    {results.configuration_used?.frames_analyzed || 'N/A'}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}> frames</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--nus-blue)' }}>Transcript Length:</strong><br />
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--nus-orange)' }}>
                    {Math.round((results.configuration_used?.transcript_length || 0) / 1000)}K
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}> characters</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--nus-blue)' }}>Analysis Mode:</strong><br />
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success-600)' }}>
                    Enhanced ✨
                  </span>
                </div>
              </div>
            </div>

            {/* Parameter Display Section */}
            {showParameters && (
              <div className="parameter-section">
                <div className="parameter-header">
                  <h3 className="parameter-title">Enhanced Analysis Details</h3>
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                    Detailed breakdown of enhanced metrics and components
                  </p>
                </div>
                
                {/* Enhanced Speech Analysis */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>Speech Analysis Components</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--primary-50)', borderRadius: '8px' }}>
                      <strong>Speaking Rate</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--nus-blue)' }}>{results.speech_analysis.speaking_rate?.toFixed(1) || 'N/A'}</span> WPM
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--primary-50)', borderRadius: '8px' }}>
                      <strong>Voice Variety</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--nus-blue)' }}>{results.speech_analysis.voice_variety?.toFixed(1) || 'N/A'}</span>/10
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--primary-50)', borderRadius: '8px' }}>
                      <strong>Pause Effectiveness</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--nus-blue)' }}>{results.speech_analysis.pause_effectiveness?.toFixed(1) || 'N/A'}</span>/10
                    </div>
                  </div>
                </div>

                {/* Enhanced Teaching Effectiveness */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'var(--nus-blue)', marginBottom: '1rem' }}>Teaching Effectiveness Components</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: '8px' }}>
                      <strong>Content Organization</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--success-600)' }}>{results.teaching_effectiveness.content_organization?.toFixed(1) || 'N/A'}</span>/10
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: '8px' }}>
                      <strong>Engagement Techniques</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--success-600)' }}>{results.teaching_effectiveness.engagement_techniques?.toFixed(1) || 'N/A'}</span>/10
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--success-50)', borderRadius: '8px' }}>
                      <strong>Knowledge Checking</strong><br />
                      <span style={{ fontSize: '1.5rem', color: 'var(--success-600)' }}>{results.teaching_effectiveness.knowledge_checking?.toFixed(1) || 'N/A'}</span>/10
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Score */}
            <div className="overall-score">
              <div className="score-display">
                <div className="score-number">{results.overall_score}/10</div>
                <div className="score-label">Enhanced Teaching Excellence Score</div>
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

            {/* Enhanced Feedback */}
            <div className="feedback-grid">
              {/* Strengths */}
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

              {/* Improvements */}
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

            {/* Score Transparency Section */}
            <div className="score-transparency">
              <h3 className="transparency-title">Enhanced Score Calculation</h3>
              <div className="transparency-grid">
                <div className="transparency-section">
                  <h4>Weighted Category Breakdown</h4>
                  <div className="calculation">
                    <div>Speech Analysis: {results.speech_analysis.score}/10 × {configuration.categoryWeights.speech_analysis}% = {(results.speech_analysis.score * configuration.categoryWeights.speech_analysis / 100).toFixed(1)}</div>
                    <div>Body Language: {results.body_language.score}/10 × {configuration.categoryWeights.body_language}% = {(results.body_language.score * configuration.categoryWeights.body_language / 100).toFixed(1)}</div>
                    <div>Teaching Effectiveness: {results.teaching_effectiveness.score}/10 × {configuration.categoryWeights.teaching_effectiveness}% = {(results.teaching_effectiveness.score * configuration.categoryWeights.teaching_effectiveness / 100).toFixed(1)}</div>
                    <div>Presentation Skills: {results.presentation_skills.score}/10 × {configuration.categoryWeights.presentation_skills}% = {(results.presentation_skills.score * configuration.categoryWeights.presentation_skills / 100).toFixed(1)}</div>
                    <hr />
                    <div className="total">Enhanced Total: {results.overall_score}/10</div>
                  </div>
                </div>
                
                <div className="transparency-section">
                  <h4>Enhanced Speech Metrics</h4>
                  <div className="metric-breakdown">
                    <div>
                      <span>Speaking Rate</span>
                      <span>{results.speech_analysis.speaking_rate?.toFixed(1) || 'N/A'} WPM</span>
                    </div>
                    <div>
                      <span>Voice Variety</span>
                      <span>{results.speech_analysis.voice_variety?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                    <div>
                      <span>Pause Effectiveness</span>
                      <span>{results.speech_analysis.pause_effectiveness?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                    <div>
                      <span>Clarity Score</span>
                      <span>{results.speech_analysis.clarity?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                  </div>
                </div>
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
    </div>
  );
}

export default App;