import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, Play, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:8001';

function App() {
  const [file, setFile] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
          console.log(`Upload Progress: ${percentCompleted}%`);
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

  // Poll for analysis status with enhanced debugging
  const pollAnalysisStatus = async (id) => {
    console.log(`Starting to poll analysis status for ID: ${id}`);
    
    const checkStatus = async () => {
      try {
        console.log(`Making request to: ${API_BASE_URL}/analysis-status/${id}`);
        const response = await axios.get(`${API_BASE_URL}/analysis-status/${id}`);
        
        // Detailed debugging
        console.log(`[${new Date().toLocaleTimeString()}] Raw response:`, response);
        console.log(`[${new Date().toLocaleTimeString()}] Response data:`, response.data);
        console.log(`Progress: ${response.data.progress}%, Status: ${response.data.status}, Message: ${response.data.message}`);
        
        setAnalysisStatus(response.data);
        console.log(`Updated analysisStatus state to:`, response.data);
        
        if (response.data.status === 'completed') {
          console.log('Analysis completed, setting results');
          setResults(response.data.results);
        } else if (response.data.status === 'processing') {
          console.log('Still processing, checking again in 500ms');
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

  // Test function for manual progress testing
  const testProgressDisplay = () => {
    console.log('Manual test: Setting fake progress');
    setAnalysisStatus({
      status: 'processing',
      progress: 50,
      message: 'Test progress message'
    });
  };

  // Render score with color coding
  const ScoreDisplay = ({ score, label, max = 10 }) => {
    const percentage = (score / max) * 100;
    let colorClass = 'text-red-500';
    if (percentage >= 70) colorClass = 'text-green-500';
    else if (percentage >= 50) colorClass = 'text-yellow-500';

    return (
      <div className="text-center p-4 bg-white rounded-lg shadow">
        <div className={`text-3xl font-bold ${colorClass}`}>{score}/{max}</div>
        <div className="text-gray-600 text-sm mt-1">{label}</div>
      </div>
    );
  };

  // Debug logging in render
  console.log('Current analysisStatus state:', analysisStatus);
  if (analysisStatus) {
    console.log('Analysis status exists, progress:', analysisStatus.progress);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Discourse Analysis Platform
          </h1>
          <p className="text-gray-600">
            Upload your lecture video and get detailed pedagogical feedback
          </p>
        </div>

        {/* Debug Test Button */}
        <div className="text-center mb-4">
          <button 
            onClick={testProgressDisplay}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Test Progress Display
          </button>
        </div>

        {/* Upload Section */}
        {!analysisId && (
          <div className="max-w-2xl mx-auto">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the video file here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Drag & drop a lecture video here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports MP4, AVI, MOV, MKV, WMV
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-6 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={startAnalysis}
                    disabled={isUploading}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {isUploading ? 'Uploading...' : 'Start Analysis'}
                  </button>
                </div>

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analysis Progress */}
        {analysisStatus && analysisStatus.status === 'processing' && (
          <div className="max-w-2xl mx-auto mt-8">
            {/* Debug display */}
            <div style={{background: 'yellow', padding: '10px', margin: '10px', fontSize: '12px'}}>
              DEBUG: Status={analysisStatus.status}, Progress={analysisStatus.progress}%, Message={analysisStatus.message}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mr-3"></div>
                <h3 className="text-lg font-medium">Analyzing Your Lecture</h3>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analysisStatus.progress}%` }}
                ></div>
              </div>
              
              <p className="text-gray-600">{analysisStatus.message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Progress: {analysisStatus.progress}%
              </p>

              {/* Processing Steps */}
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h4 className="font-medium mb-2">Processing Steps:</h4>
                <div className="space-y-1 text-sm">
                  <div className={`${analysisStatus.progress >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                    ✓ 1. Extracting audio and video components {analysisStatus.progress >= 10 ? '(Complete)' : ''}
                  </div>
                  <div className={`${analysisStatus.progress >= 30 ? 'text-green-600' : analysisStatus.progress >= 10 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {analysisStatus.progress >= 30 ? '✓' : analysisStatus.progress >= 10 ? '⟳' : '○'} 2. Analyzing speech with Whisper AI {analysisStatus.progress >= 30 ? '(Complete)' : analysisStatus.progress >= 10 ? '(In Progress)' : ''}
                  </div>
                  <div className={`${analysisStatus.progress >= 60 ? 'text-green-600' : analysisStatus.progress >= 30 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {analysisStatus.progress >= 60 ? '✓' : analysisStatus.progress >= 30 ? '⟳' : '○'} 3. Analyzing gestures with GPT-4 Vision {analysisStatus.progress >= 60 ? '(Complete)' : analysisStatus.progress >= 30 ? '(In Progress)' : ''}
                  </div>
                  <div className={`${analysisStatus.progress >= 80 ? 'text-green-600' : analysisStatus.progress >= 60 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {analysisStatus.progress >= 80 ? '✓' : analysisStatus.progress >= 60 ? '⟳' : '○'} 4. Generating pedagogical insights {analysisStatus.progress >= 80 ? '(Complete)' : analysisStatus.progress >= 60 ? '(In Progress)' : ''}
                  </div>
                  <div className={`${analysisStatus.progress >= 95 ? 'text-green-600' : analysisStatus.progress >= 80 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {analysisStatus.progress >= 95 ? '✓' : analysisStatus.progress >= 80 ? '⟳' : '○'} 5. Finalizing analysis report {analysisStatus.progress >= 95 ? '(Complete)' : analysisStatus.progress >= 80 ? '(In Progress)' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {results && (
          <div className="max-w-6xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <h2 className="text-2xl font-bold text-gray-800">Analysis Complete</h2>
              </div>

              {/* Overall Score */}
              <div className="text-center mb-8">
                <div className="inline-block p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
                  <div className="text-4xl font-bold">{results.overall_score}/10</div>
                  <div className="text-blue-100">Overall Score</div>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {results.strengths.map((strength, index) => (
                      <li key={index} className="text-green-700 text-sm flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {results.improvement_suggestions.map((suggestion, index) => (
                      <li key={index} className="text-amber-700 text-sm flex items-start">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Score Transparency Section */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-bold mb-4">Score Calculation Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium mb-2">Overall Score: {results.overall_score}/10</h4>
                    <div className="text-sm space-y-1">
                      <div>Speech Analysis: {results.speech_analysis.score}/10 × 30% = {(results.speech_analysis.score * 0.3).toFixed(1)}</div>
                      <div>Body Language: {results.body_language.score}/10 × 25% = {(results.body_language.score * 0.25).toFixed(1)}</div>
                      <div>Teaching Effectiveness: {results.teaching_effectiveness.score}/10 × 35% = {(results.teaching_effectiveness.score * 0.35).toFixed(1)}</div>
                      <div>Presentation Skills: {results.presentation_skills.score}/10 × 10% = {(results.presentation_skills.score * 0.1).toFixed(1)}</div>
                      <hr className="my-2" />
                      <div className="font-bold">Total: {results.overall_score}/10</div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium mb-2">Speech Analysis Details</h4>
                    <div className="text-sm space-y-1">
                      <div>Speaking Rate: {results.speech_analysis.speaking_rate || 'N/A'} WPM</div>
                      <div>Clarity Score: {results.speech_analysis.clarity?.toFixed(1) || 'N/A'}/10</div>
                      <div>Pace Score: {results.speech_analysis.pace?.toFixed(1) || 'N/A'}/10</div>
                      <div>Confidence Score: {results.speech_analysis.confidence?.toFixed(1) || 'N/A'}/10</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <details className="bg-white p-4 rounded">
                    <summary className="cursor-pointer font-medium">View Complete Analysis Data</summary>
                    <pre className="mt-4 text-xs overflow-auto bg-gray-100 p-4 rounded">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>

              {/* Reset Button */}
              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    setFile(null);
                    setAnalysisId(null);
                    setAnalysisStatus(null);
                    setResults(null);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Analyze Another Video
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;