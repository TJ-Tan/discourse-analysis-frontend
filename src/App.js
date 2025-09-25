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
  Mic
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [parameters, setParameters] = useState({
    speechWeight: 30,
    bodyLanguageWeight: 25,
    teachingWeight: 35,
    presentationWeight: 10
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

  // Upload and start analysis
  const startAnalysis = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minutes timeout for large files
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setAnalysisId(response.data.analysis_id);
      setUploadProgress(100);
      pollAnalysisStatus(response.data.analysis_id);
    } catch (error) {
      console.error('Upload failed:', error);
      if (error.code === 'ECONNABORTED') {
        alert('Upload timeout. Please try with a smaller file or check your connection.');
      } else {
        alert('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Poll for analysis status
  const pollAnalysisStatus = async (id) => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/analysis-status/${id}`);
        setAnalysisStatus(response.data);
        
        if (response.data.status === 'completed') {
          setResults(response.data.results);
        } else if (response.data.status === 'processing') {
          setTimeout(checkStatus, 500);
        } else if (response.data.status === 'error') {
          alert(`Analysis failed: ${response.data.message}`);
        }
      } catch (error) {
        console.error('Status check failed:', error);
        setTimeout(checkStatus, 1000);
      }
    };
    
    checkStatus();
  };

  // Generate PDF report
  const exportToPDF = async () => {
    if (!results || !analysisId) return;

    setIsGeneratingPDF(true);
    try {
      // Create PDF content with beautiful formatting
      const generatePDFContent = () => {
        const doc = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Discourse Analysis Report</title>
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
              
              .analysis-date {
                text-align: center;
                color: #6b7280;
                margin-bottom: 30px;
                font-size: 0.9rem;
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
              
              .overall-score .label {
                font-size: 1.2rem;
                opacity: 0.9;
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
              
              .score-card .label {
                color: #6b7280;
                font-weight: 500;
              }
              
              .section {
                margin: 40px 0;
                page-break-inside: avoid;
              }
              
              .section-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 20px 0;
                padding-bottom: 10px;
                border-bottom: 3px solid #EF7C00;
              }
              
              .feedback-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 30px;
                margin: 30px 0;
              }
              
              .feedback-section {
                padding: 25px;
                border-radius: 12px;
                border-left: 4px solid;
              }
              
              .strengths {
                background: #ecfdf5;
                border-left-color: #10b981;
              }
              
              .improvements {
                background: #fff4e6;
                border-left-color: #EF7C00;
              }
              
              .feedback-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin: 0 0 15px 0;
              }
              
              .strengths .feedback-title {
                color: #047857;
              }
              
              .improvements .feedback-title {
                color: #CC6600;
              }
              
              .feedback-list {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              
              .feedback-item {
                margin: 8px 0;
                padding-left: 20px;
                position: relative;
                line-height: 1.5;
              }
              
              .feedback-item::before {
                content: '•';
                position: absolute;
                left: 0;
                font-weight: bold;
              }
              
              .strengths .feedback-item::before {
                color: #10b981;
              }
              
              .improvements .feedback-item::before {
                color: #EF7C00;
              }
              
              .calculation-section {
                background: #f9fafb;
                padding: 25px;
                border-radius: 12px;
                margin: 30px 0;
                font-family: 'Monaco', 'Courier New', monospace;
                font-size: 0.9rem;
              }
              
              .calculation-title {
                font-family: 'Inter', sans-serif;
                font-size: 1.2rem;
                font-weight: 600;
                margin: 0 0 15px 0;
                color: #1f2937;
              }
              
              .calculation-line {
                margin: 5px 0;
                color: #4b5563;
              }
              
              .calculation-total {
                margin-top: 10px;
                padding: 10px;
                background: #e5e7eb;
                border-radius: 6px;
                font-weight: 700;
                color: #1f2937;
              }
              
              .footer {
                margin-top: 60px;
                text-align: center;
                color: #6b7280;
                font-size: 0.9rem;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              
              @media print {
                body { margin: 0; }
                .header { margin: 0 0 40px 0; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Discourse Analysis Report</h1>
              <p>AI-Enhanced Pedagogical Assessment</p>
            </div>
            
            <div class="analysis-date">
              Generated on ${new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            <div class="overall-score">
              <div class="score">${results.overall_score}/10</div>
              <div class="label">Overall Teaching Score</div>
            </div>
            
            <div class="scores-grid">
              <div class="score-card">
                <div class="score">${results.speech_analysis.score}/10</div>
                <div class="label">Speech Analysis</div>
              </div>
              <div class="score-card">
                <div class="score">${results.body_language.score}/10</div>
                <div class="label">Body Language</div>
              </div>
              <div class="score-card">
                <div class="score">${results.teaching_effectiveness.score}/10</div>
                <div class="label">Teaching Effectiveness</div>
              </div>
              <div class="score-card">
                <div class="score">${results.presentation_skills.score}/10</div>
                <div class="label">Presentation Skills</div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Feedback Summary</h2>
              <div class="feedback-grid">
                <div class="feedback-section strengths">
                  <h3 class="feedback-title">Key Strengths</h3>
                  <ul class="feedback-list">
                    ${results.strengths.map(strength => `<li class="feedback-item">${strength}</li>`).join('')}
                  </ul>
                </div>
                <div class="feedback-section improvements">
                  <h3 class="feedback-title">Areas for Growth</h3>
                  <ul class="feedback-list">
                    ${results.improvement_suggestions.map(suggestion => `<li class="feedback-item">${suggestion}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Detailed Metrics</h2>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                  <h4 style="margin: 0 0 15px 0; color: #1f2937;">Speech Analysis</h4>
                  <div>Speaking Rate: ${results.speech_analysis.speaking_rate?.toFixed(1) || 'N/A'} WPM</div>
                  <div>Clarity Score: ${results.speech_analysis.clarity?.toFixed(1) || 'N/A'}/10</div>
                  <div>Pace Score: ${results.speech_analysis.pace?.toFixed(1) || 'N/A'}/10</div>
                  <div>Confidence: ${results.speech_analysis.confidence?.toFixed(1) || 'N/A'}/10</div>
                </div>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                  <h4 style="margin: 0 0 15px 0; color: #1f2937;">Body Language</h4>
                  <div>Eye Contact: ${results.body_language.eye_contact?.toFixed(1) || 'N/A'}/10</div>
                  <div>Gestures: ${results.body_language.gestures?.toFixed(1) || 'N/A'}/10</div>
                  <div>Posture: ${results.body_language.posture?.toFixed(1) || 'N/A'}/10</div>
                  <div>Engagement: ${results.body_language.engagement?.toFixed(1) || 'N/A'}/10</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="calculation-section">
                <div class="calculation-title">Score Calculation</div>
                <div class="calculation-line">Speech Analysis: ${results.speech_analysis.score}/10 × 30% = ${(results.speech_analysis.score * 0.3).toFixed(1)}</div>
                <div class="calculation-line">Body Language: ${results.body_language.score}/10 × 25% = ${(results.body_language.score * 0.25).toFixed(1)}</div>
                <div class="calculation-line">Teaching Effectiveness: ${results.teaching_effectiveness.score}/10 × 35% = ${(results.teaching_effectiveness.score * 0.35).toFixed(1)}</div>
                <div class="calculation-line">Presentation Skills: ${results.presentation_skills.score}/10 × 10% = ${(results.presentation_skills.score * 0.1).toFixed(1)}</div>
                <div class="calculation-total">Total Score: ${results.overall_score}/10</div>
              </div>
            </div>
            
            <div class="footer">
              <p>This report was generated using AI-powered discourse analysis technology.</p>
              <p>National University of Singapore • Teaching & Learning Enhancement</p>
            </div>
          </body>
          </html>
        `;
        return doc;
      };

      // Create and download PDF
      const htmlContent = generatePDFContent();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link to download the HTML file
      const link = document.createElement('a');
      link.href = url;
      link.download = `discourse-analysis-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show instructions for PDF conversion
      setTimeout(() => {
        alert(`Report downloaded as HTML file!\n\nTo convert to PDF:\n1. Open the downloaded HTML file in your browser\n2. Press Ctrl+P (Cmd+P on Mac)\n3. Select "Save as PDF" as destination\n4. Click Save\n\nThis creates a beautifully formatted PDF report with all your analysis results.`);
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
    { id: 1, label: 'Extracting audio and video components', minProgress: 10, icon: <Upload size={12} /> },
    { id: 2, label: 'Analysing speech with Whisper AI', minProgress: 30, icon: <Mic size={12} /> },
    { id: 3, label: 'Analysing gestures with GPT-4 Vision', minProgress: 60, icon: <Eye size={12} /> },
    { id: 4, label: 'Generating pedagogical insights', minProgress: 80, icon: <Brain size={12} /> },
    { id: 5, label: 'Finalising analysis report', minProgress: 95, icon: <CheckCircle size={12} /> }
  ];

  return (
    <div className="app-background">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="announcement-banner">
            <Sparkles size={16} />
            <span>AI-POWERED DISCOURSE ANALYSIS</span>
            <ArrowRight size={16} />
          </div>
          <h1 className="title">Discourse Analysis with genAI</h1>
          <p className="subtitle">
            Elevate your T&L delivery with AI-enhanced pedagogical insights and personalised feedback
          </p>
        </div>

        {/* Upload Section */}
        {!analysisId && (
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
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Duration: Calculating...
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
                        Start Analysis
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
          </div>
        )}

        {/* Analysis Progress */}
        {analysisStatus && analysisStatus.status === 'processing' && (
          <div className="progress-container">
            <div className="progress-header">
              <div className="spinner" style={{ color: 'var(--nus-blue)' }}></div>
              <h3 className="progress-title">Analysing Your Lecture</h3>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                style={{ width: `${analysisStatus.progress || 0}%` }}
              ></div>
            </div>
            
            <div className="progress-text">{analysisStatus.message}</div>
            <div className="progress-percent">{analysisStatus.progress || 0}% Complete</div>

            {/* Enhanced Processing Steps */}
            <div className="processing-steps">
              <h4>Processing Pipeline</h4>
              <div className="step-list">
                {processingSteps.map((step) => {
                  const status = getStepStatus(analysisStatus.progress || 0, step.minProgress);
                  return (
                    <div key={step.id} className={`step ${status}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="step-icon">
                          {status === 'completed' ? '✓' : status === 'active' ? '⟳' : step.id}
                        </div>
                        <span>{step.label}</span>
                      </div>
                      <div>
                        {status === 'completed' && <span className="checkmark">✓</span>}
                        {status === 'active' && <Clock size={16} style={{ color: 'var(--nus-orange)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {results && (
          <div className="results-container">
            <div className="results-header">
              <CheckCircle size={32} style={{ color: 'var(--success-500)' }} />
              <h2 className="results-title">Analysis Complete</h2>
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
                  Parameters
                </button>
              </div>
            </div>

            {/* Parameter Adjustment Section */}
            {showParameters && (
              <div className="parameter-section">
                <div className="parameter-header">
                  <h3 className="parameter-title">Scoring Parameters</h3>
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                    Adjust the weightings used in score calculation (Currently for display only)
                  </p>
                </div>
                <table className="parameter-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Current Weight (%)</th>
                      <th>Adjust Weight</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Speech Analysis</td>
                      <td>{parameters.speechWeight}%</td>
                      <td>
                        <input 
                          type="number" 
                          className="parameter-input"
                          value={parameters.speechWeight}
                          onChange={(e) => setParameters({...parameters, speechWeight: parseInt(e.target.value)})}
                          min="0" 
                          max="100" 
                        />
                      </td>
                      <td>Voice clarity, pace, and speaking patterns</td>
                    </tr>
                    <tr>
                      <td>Body Language</td>
                      <td>{parameters.bodyLanguageWeight}%</td>
                      <td>
                        <input 
                          type="number" 
                          className="parameter-input"
                          value={parameters.bodyLanguageWeight}
                          onChange={(e) => setParameters({...parameters, bodyLanguageWeight: parseInt(e.target.value)})}
                          min="0" 
                          max="100" 
                        />
                      </td>
                      <td>Gestures, posture, and visual engagement</td>
                    </tr>
                    <tr>
                      <td>Teaching Effectiveness</td>
                      <td>{parameters.teachingWeight}%</td>
                      <td>
                        <input 
                          type="number" 
                          className="parameter-input"
                          value={parameters.teachingWeight}
                          onChange={(e) => setParameters({...parameters, teachingWeight: parseInt(e.target.value)})}
                          min="0" 
                          max="100" 
                        />
                      </td>
                      <td>Content organisation and pedagogical approach</td>
                    </tr>
                    <tr>
                      <td>Presentation Skills</td>
                      <td>{parameters.presentationWeight}%</td>
                      <td>
                        <input 
                          type="number" 
                          className="parameter-input"
                          value={parameters.presentationWeight}
                          onChange={(e) => setParameters({...parameters, presentationWeight: parseInt(e.target.value)})}
                          min="0" 
                          max="100" 
                        />
                      </td>
                      <td>Overall presentation and professionalism</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Overall Score */}
            <div className="overall-score">
              <div className="score-display">
                <div className="score-number">{results.overall_score}/10</div>
                <div className="score-label">Overall Teaching Score</div>
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

            {/* Detailed Feedback */}
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
              <h3 className="transparency-title">Score Calculation Transparency</h3>
              <div className="transparency-grid">
                <div className="transparency-section">
                  <h4>Overall Score Breakdown</h4>
                  <div className="calculation">
                    <div>Speech Analysis: {results.speech_analysis.score}/10 × 30% = {(results.speech_analysis.score * 0.3).toFixed(1)}</div>
                    <div>Body Language: {results.body_language.score}/10 × 25% = {(results.body_language.score * 0.25).toFixed(1)}</div>
                    <div>Teaching Effectiveness: {results.teaching_effectiveness.score}/10 × 35% = {(results.teaching_effectiveness.score * 0.35).toFixed(1)}</div>
                    <div>Presentation Skills: {results.presentation_skills.score}/10 × 10% = {(results.presentation_skills.score * 0.1).toFixed(1)}</div>
                    <hr />
                    <div className="total">Total: {results.overall_score}/10</div>
                  </div>
                </div>
                
                <div className="transparency-section">
                  <h4>Speech Analysis Metrics</h4>
                  <div className="metric-breakdown">
                    <div>
                      <span>Speaking Rate</span>
                      <span>{results.speech_analysis.speaking_rate?.toFixed(1) || 'N/A'} WPM</span>
                    </div>
                    <div>
                      <span>Clarity Score</span>
                      <span>{results.speech_analysis.clarity?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                    <div>
                      <span>Pace Score</span>
                      <span>{results.speech_analysis.pace?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <span>{results.speech_analysis.confidence?.toFixed(1) || 'N/A'}/10</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <details className="transparency-section">
                  <summary style={{ cursor: 'pointer', fontWeight: '600', padding: '0.75rem' }}>
                    View Complete Analysis Data
                  </summary>
                  <div className="raw-data">
                    <pre style={{ 
                      background: 'var(--gray-900)', 
                      color: 'var(--gray-100)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      fontSize: '0.8rem', 
                      overflow: 'auto',
                      maxHeight: '400px'
                    }}>
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>
                </details>
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