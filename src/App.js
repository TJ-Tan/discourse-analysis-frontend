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
  Settings,
  Save,
  RotateCcw,
  Sliders,
  Info
} from 'lucide-react';
import './App.css';

// Use environment variable for API URL, fallback to production
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://discourse-analysis-backend.up.railway.app';

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
  const resultsContainerRef = useRef(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isStopping, setIsStopping] = useState(false);
  const [deploymentTime, setDeploymentTime] = useState(null);
  const [queueList, setQueueList] = useState([]);
  const [isQueued, setIsQueued] = useState(false);
  const [userAnalysisId, setUserAnalysisId] = useState(null);
  const uploadCancelToken = useRef(null);

  // Fetch deployment time on mount
  useEffect(() => {
    const fetchDeploymentTime = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/deployment-info`, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });
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
      // Get client IP from a service (fallback to backend detection)
      let clientIP = null;
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 2000 });
        clientIP = ipResponse.data.ip;
      } catch (ipError) {
        // If IP service fails, backend will detect from request headers
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
    if (uploadCancelToken.current) {
      uploadCancelToken.current.cancel('Upload cancelled by user');
      uploadCancelToken.current = null;
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    
    // If we have an analysis_id, try to cancel it on the backend
    if (userAnalysisId) {
      try {
        await axios.post(`${API_BASE_URL}/cancel-upload/${userAnalysisId}`);
      } catch (error) {
        // Silently fail - backend cleanup is best effort
        console.log('Backend cleanup may have failed, but upload is cancelled');
      }
      setUserAnalysisId(null);
    }
    
    // Reset state
    setAnalysisId(null);
    setIsQueued(false);
    setQueueList([]);
  };

  const startAnalysis = async () => {
    if (!file) return;
    
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

  // Enhanced PDF export - Clean format with only metrics and analysis
  const exportToPDF = async () => {
    if (!results || !analysisId) return;

    setIsGeneratingPDF(true);
    try {
      // Helper function to format metric names
      const formatMetricName = (name) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      // Helper function to render metric explanations
      const renderExplanations = (explanations) => {
        if (!explanations || Object.keys(explanations).length === 0) return '';
        
        let html = '<div class="metric-explanations">';
        Object.entries(explanations).forEach(([metric, explanation]) => {
          html += `
            <div class="metric-item">
              <div class="metric-header">
                <strong>${formatMetricName(metric)}</strong>
                <span class="rating-badge">${explanation.rating}</span>
                <span class="score-range">${explanation.score_range}</span>
              </div>
              <div class="metric-justification">${explanation.justification}</div>
              ${explanation.remarks ? `<div class="metric-remarks">Note: ${explanation.remarks}</div>` : ''}
            </div>
          `;
        });
        html += '</div>';
        return html;
      };

      // Generate clean HTML content
      const generatePDFContent = () => {
        const overallScore = Math.round(results.overall_score * 10) / 10;
        const genDate = new Date().toLocaleDateString('en-SG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>MARS Analysis Report</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 10pt;
                line-height: 1.6;
                color: #1f2937;
                background: white;
              }
              
              .header {
                text-align: center;
                margin-bottom: 15px;
                padding: 18px;
                background: linear-gradient(135deg, #003D7C, #EF7C00);
                color: white;
                border-radius: 8px;
              }
              
              .header h1 {
                font-size: 32pt;
                font-weight: 800;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
              }
              
              .header .subtitle {
                font-size: 14pt;
                margin-bottom: 4px;
                opacity: 0.95;
              }
              
              .header .tagline {
                font-size: 11pt;
                margin-bottom: 12px;
                opacity: 0.85;
              }
              
              .header .date {
                font-size: 9pt;
                opacity: 0.8;
              }
              
              .overall-score {
                text-align: center;
                margin: 10px 0;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                border: 2px solid #003D7C;
              }
              
              .overall-score .score {
                font-size: 48pt;
                font-weight: 900;
                color: #003D7C;
                margin-bottom: 6px;
              }
              
              .overall-score .label {
                font-size: 14pt;
                color: #6b7280;
                font-weight: 600;
              }
              
              .category-scores {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 8px;
                margin: 10px 0;
              }
              
              .category-score {
                text-align: center;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .category-score .score {
                font-size: 24pt;
                font-weight: 700;
                color: #003D7C;
                margin-bottom: 4px;
              }
              
              .category-score .label {
                font-size: 9pt;
                color: #6b7280;
                font-weight: 500;
              }
              
              .section {
                margin: 6px 0;
                page-break-inside: avoid;
              }
              
              .section.new-page {
                page-break-before: always;
              }
              
              .transcript-section {
                margin: 6px 0;
                page-break-inside: avoid;
              }
              
              .transcript-text {
                font-size: 9pt;
                line-height: 1.8;
                color: #374151;
                white-space: pre-wrap;
                padding: 12px;
                background: #f9fafb;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                max-height: none;
              }
              
              .frame-gallery {
                display: flex;
                gap: 12px;
                margin-top: 12px;
                flex-wrap: wrap;
              }
              
              .frame-item {
                flex: 0 0 calc(33.333% - 8px);
                text-align: center;
              }
              
              .frame-item img {
                width: 100%;
                height: auto;
                border-radius: 6px;
                border: 2px solid #e5e7eb;
                max-width: 200px;
              }
              
              .frame-timestamp {
                margin-top: 6px;
                font-size: 8pt;
                color: #6b7280;
                font-weight: 600;
              }
              
              .questions-list {
                margin-top: 12px;
              }
              
              .question-item {
                padding: 10px;
                margin-bottom: 8px;
                background: #f0f9ff;
                border-left: 4px solid #003D7C;
                border-radius: 4px;
              }
              
              .question-text {
                font-size: 10pt;
                color: #1f2937;
                line-height: 1.6;
                margin-bottom: 4px;
              }
              
              .question-meta {
                font-size: 8pt;
                color: #6b7280;
                display: flex;
                gap: 12px;
              }
              
              .filler-words-list {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-top: 12px;
              }
              
              .filler-word-item {
                padding: 8px;
                background: #f9fafb;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                text-align: center;
              }
              
              .filler-word {
                font-size: 11pt;
                font-weight: 600;
                color: #003D7C;
                margin-bottom: 4px;
              }
              
              .filler-count {
                font-size: 9pt;
                color: #6b7280;
              }
              
              .section-header {
                background: #003D7C;
                color: white;
                padding: 10px 14px;
                border-radius: 6px 6px 0 0;
                font-size: 14pt;
                font-weight: 700;
                margin-bottom: 0;
              }
              
              .section-content {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 6px 6px;
                padding: 12px;
              }
              
              .section-score {
                display: inline-block;
                background: #003D7C;
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 11pt;
                margin-bottom: 8px;
              }
              
              .metric-explanations {
                margin-top: 8px;
              }
              
              .metric-item {
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
              }
              
              .metric-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
              }
              
              .metric-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
                flex-wrap: wrap;
              }
              
              .metric-header strong {
                font-size: 11pt;
                color: #1f2937;
              }
              
              .rating-badge {
                background: #EF7C00;
                color: white;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 9pt;
                font-weight: 600;
              }
              
              .score-range {
                color: #6b7280;
                font-size: 9pt;
              }
              
              .metric-justification {
                font-size: 10pt;
                color: #374151;
                line-height: 1.6;
                margin-bottom: 4px;
              }
              
              .metric-remarks {
                font-size: 9pt;
                color: #6b7280;
                font-style: italic;
                margin-top: 4px;
              }
              
              .raw-metrics {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                margin-top: 8px;
              }
              
              .raw-metric {
                padding: 8px;
                background: #f9fafb;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
              }
              
              .raw-metric strong {
                display: block;
                font-size: 9pt;
                color: #6b7280;
                margin-bottom: 4px;
              }
              
              .raw-metric .value {
                font-size: 12pt;
                font-weight: 700;
                color: #003D7C;
              }
              
              .disclaimer {
                margin-top: 12px;
                padding: 12px;
                background: #f0f9ff;
                border-left: 4px solid #003D7C;
                border-radius: 6px;
              }
              
              .disclaimer-title {
                font-size: 11pt;
                font-weight: 700;
                color: #003D7C;
                margin-bottom: 8px;
              }
              
              .disclaimer-text {
                font-size: 9pt;
                color: #374151;
                line-height: 1.6;
                font-style: italic;
              }
              
              .footer {
                margin-top: 15px;
                padding-top: 12px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                font-size: 8pt;
                color: #6b7280;
              }
              
              .developer-info {
                margin-top: 10px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                font-size: 8pt;
                color: #6b7280;
                line-height: 1.8;
              }
              
              .developer-info strong {
                color: #1f2937;
                font-weight: 600;
              }
              
              @media print {
                .section {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <!-- Header -->
            <div class="header">
              <h1>MARS</h1>
              <div class="subtitle">Multimodal AI Reflection System</div>
              <div class="tagline">Discourse Analysis with Agentic AI</div>
              <div class="date">Generated on ${genDate}</div>
            </div>
            
            <!-- Overall Score -->
            <div class="overall-score">
              <div class="score">${overallScore}/10</div>
              <div class="label">Overall Teaching Excellence Score</div>
            </div>
            
            <!-- Category Scores -->
            <div class="category-scores">
              <div class="category-score">
                <div class="score">${Math.round(results.speech_analysis?.score * 10) / 10}</div>
                <div class="label">Speech Analysis</div>
              </div>
              <div class="category-score">
                <div class="score">${Math.round(results.body_language?.score * 10) / 10}</div>
                <div class="label">Body Language</div>
              </div>
              <div class="category-score">
                <div class="score">${Math.round(results.teaching_effectiveness?.score * 10) / 10}</div>
                <div class="label">Teaching Effectiveness</div>
              </div>
              <div class="category-score">
                <div class="score">${Math.round((results.interaction_engagement?.score || 0) * 10) / 10}</div>
                <div class="label">Interaction & Engagement</div>
              </div>
              <div class="category-score">
                <div class="score">${Math.round(results.presentation_skills?.score * 10) / 10}</div>
                <div class="label">Presentation Skills</div>
              </div>
            </div>
            
            <!-- Full Lecture Transcript -->
            <div class="transcript-section new-page">
              <div class="section-header">Full Lecture Transcript</div>
              <div class="section-content">
                ${results.full_transcript?.text ? `
                  <div class="transcript-text">${results.full_transcript.text}</div>
                ` : results.full_transcript?.timecoded_transcript && results.full_transcript.timecoded_transcript.length > 0 ? `
                  <div class="transcript-text">
                    ${results.full_transcript.timecoded_transcript.map(sentence => 
                      `[${sentence.timestamp}] ${sentence.text}`
                    ).join('\n\n')}
                  </div>
                ` : '<p>Transcript not available</p>'}
                ${results.full_transcript?.word_count ? `
                  <div style="margin-top: 12px; font-size: 9pt; color: #6b7280;">
                    <strong>Total Words:</strong> ${results.full_transcript.word_count} | 
                    <strong>Duration:</strong> ${results.full_transcript.duration_formatted || '00:00'}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Extracted Video Frames -->
            ${results.sample_frames && results.sample_frames.length > 0 ? `
            <div class="section new-page">
              <div class="section-header">Extracted Video Frames</div>
              <div class="section-content">
                <div class="frame-gallery">
                  ${results.sample_frames.slice(0, 3).map((frame, idx) => {
                    const formatTimestamp = (seconds) => {
                      const mins = Math.floor(seconds / 60);
                      const secs = Math.floor(seconds % 60);
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };
                    const timestamp = frame.timestamp || frame.start_time || 0;
                    const imageSrc = frame.image || frame.frame_data || frame.image_data || '';
                    return `
                      <div class="frame-item">
                        ${imageSrc ? `<img src="${imageSrc}" alt="Frame ${idx + 1}" />` : '<div style="width: 100%; height: 150px; background: #e5e7eb; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6b7280;">Frame ${idx + 1}</div>'}
                        <div class="frame-timestamp">${formatTimestamp(timestamp)}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
                <p style="margin-top: 12px; font-size: 9pt; color: #6b7280; text-align: center;">
                  ${results.sample_frames.length} frame${results.sample_frames.length !== 1 ? 's' : ''} extracted from video
                </p>
              </div>
            </div>
            ` : ''}
            
            <!-- 1. Speech Analysis -->
            <div class="section new-page">
              <div class="section-header">1. Speech Analysis</div>
              <div class="section-content">
                <div class="section-score">Score: ${Math.round(results.speech_analysis?.score * 10) / 10}/10</div>
                ${results.speech_analysis?.explanations ? renderExplanations(results.speech_analysis.explanations) : ''}
                ${results.speech_analysis?.raw_metrics ? `
                  <div class="raw-metrics">
                    ${results.speech_analysis.raw_metrics.total_words ? `
                      <div class="raw-metric">
                        <strong>Total Words</strong>
                        <div class="value">${results.speech_analysis.raw_metrics.total_words}</div>
                      </div>
                    ` : ''}
                    ${results.speech_analysis.raw_metrics.words_per_minute ? `
                      <div class="raw-metric">
                        <strong>Speaking Rate (WPM)</strong>
                        <div class="value">${results.speech_analysis.raw_metrics.words_per_minute}</div>
                      </div>
                    ` : ''}
                    ${results.speech_analysis.raw_metrics.filler_word_count !== undefined ? `
                      <div class="raw-metric">
                        <strong>Filler Words</strong>
                        <div class="value">${results.speech_analysis.raw_metrics.filler_word_count} (${results.speech_analysis.raw_metrics.filler_ratio_percentage || 0}%)</div>
                      </div>
                    ` : ''}
                    ${results.speech_analysis.raw_metrics.transcription_confidence !== undefined ? `
                      <div class="raw-metric">
                        <strong>Transcription Accuracy</strong>
                        <div class="value">${results.speech_analysis.raw_metrics.transcription_confidence}%</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Filler Words -->
            ${results.speech_analysis?.filler_details && results.speech_analysis.filler_details.length > 0 ? `
            <div class="section" style="margin-top: 12px;">
              <div class="section-header" style="font-size: 12pt;">Filler Words Detected</div>
              <div class="section-content">
                <div class="filler-words-list">
                  ${results.speech_analysis.filler_details.slice(0, 20).map(filler => `
                    <div class="filler-word-item">
                      <div class="filler-word">${filler.word}</div>
                      <div class="filler-count">${filler.count} time${filler.count !== 1 ? 's' : ''}</div>
                    </div>
                  `).join('')}
                </div>
                ${results.speech_analysis.filler_details.length > 20 ? `
                  <p style="margin-top: 12px; font-size: 9pt; color: #6b7280; text-align: center;">
                    Showing top 20 filler words (${results.speech_analysis.filler_details.length} total detected)
                  </p>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            <!-- 2. Body Language -->
            <div class="section new-page">
              <div class="section-header">2. Body Language</div>
              <div class="section-content">
                <div class="section-score">Score: ${Math.round(results.body_language?.score * 10) / 10}/10</div>
                ${results.body_language?.remarks ? `
                  <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;">
                    <p style="margin: 0; color: #92400e; font-size: 9pt; line-height: 1.5; font-style: italic;">
                      ⚠️ ${results.body_language.remarks}
                    </p>
                  </div>
                ` : ''}
                ${results.body_language?.explanations ? renderExplanations(results.body_language.explanations) : ''}
                ${results.body_language?.raw_metrics ? `
                  <div class="raw-metrics">
                    ${results.body_language.raw_metrics.total_frames_extracted ? `
                      <div class="raw-metric">
                        <strong>Frames Analysed</strong>
                        <div class="value">${results.body_language.raw_metrics.total_frames_extracted}</div>
                      </div>
                    ` : ''}
                    ${results.body_language.raw_metrics.eye_contact_raw !== undefined ? `
                      <div class="raw-metric">
                        <strong>Eye Contact Score</strong>
                        <div class="value">${results.body_language.raw_metrics.eye_contact_raw}/10</div>
                      </div>
                    ` : ''}
                    ${results.body_language.raw_metrics.gestures_raw !== undefined ? `
                      <div class="raw-metric">
                        <strong>Gestures Score</strong>
                        <div class="value">${results.body_language.raw_metrics.gestures_raw}/10</div>
                      </div>
                    ` : ''}
                    ${results.body_language.raw_metrics.posture_raw !== undefined ? `
                      <div class="raw-metric">
                        <strong>Posture Score</strong>
                        <div class="value">${results.body_language.raw_metrics.posture_raw}/10</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- 3. Teaching Effectiveness -->
            <div class="section new-page">
              <div class="section-header">3. Teaching Effectiveness</div>
              <div class="section-content">
                <div class="section-score">Score: ${Math.round(results.teaching_effectiveness?.score * 10) / 10}/10</div>
                ${results.teaching_effectiveness?.explanations ? renderExplanations(results.teaching_effectiveness.explanations) : ''}
              </div>
            </div>
            
            <!-- 4. Interaction & Engagement -->
            <div class="section new-page">
              <div class="section-header">4. Interaction & Engagement</div>
              <div class="section-content">
                <div class="section-score">Score: ${Math.round((results.interaction_engagement?.score || 0) * 10) / 10}/10</div>
                ${results.interaction_engagement?.explanations ? renderExplanations(results.interaction_engagement.explanations) : ''}
                ${results.interaction_engagement?.raw_metrics ? `
                  <div class="raw-metrics">
                    ${results.interaction_engagement.raw_metrics.total_questions !== undefined ? `
                      <div class="raw-metric">
                        <strong>Total Questions</strong>
                        <div class="value">${results.interaction_engagement.raw_metrics.total_questions}</div>
                      </div>
                    ` : ''}
                    ${results.interaction_engagement?.high_level_questions_count !== undefined ? `
                      <div class="raw-metric">
                        <strong>High-Level Questions</strong>
                        <div class="value">${results.interaction_engagement.high_level_questions_count}</div>
                      </div>
                    ` : ''}
                    ${results.interaction_engagement.raw_metrics.interaction_frequency !== undefined ? `
                      <div class="raw-metric">
                        <strong>Interaction Frequency</strong>
                        <div class="value">${results.interaction_engagement.raw_metrics.interaction_frequency}/10</div>
                      </div>
                    ` : ''}
                    ${results.interaction_engagement.raw_metrics.question_quality !== undefined ? `
                      <div class="raw-metric">
                        <strong>Question Quality</strong>
                        <div class="value">${results.interaction_engagement.raw_metrics.question_quality}/10</div>
                      </div>
                    ` : ''}
                    ${results.interaction_engagement.raw_metrics.student_engagement_opportunities !== undefined ? `
                      <div class="raw-metric">
                        <strong>Student Engagement</strong>
                        <div class="value">${results.interaction_engagement.raw_metrics.student_engagement_opportunities}/10</div>
                      </div>
                    ` : ''}
                    ${results.interaction_engagement?.cognitive_level ? `
                      <div class="raw-metric">
                        <strong>Cognitive Level</strong>
                        <div class="value">${results.interaction_engagement.cognitive_level}</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
                
                ${results.interaction_engagement?.high_level_questions && results.interaction_engagement.high_level_questions.length > 0 ? `
                  <div class="questions-list">
                    <h3 style="font-size: 12pt; color: #003D7C; margin-top: 16px; margin-bottom: 12px;">High-Level Questions Detected</h3>
                    ${results.interaction_engagement.high_level_questions.map((question, idx) => `
                      <div class="question-item">
                        <div class="question-text">${idx + 1}. ${question.question || question.text || ''}</div>
                        <div class="question-meta">
                          ${question.precise_timestamp || question.timestamp ? `<span>⏱️ ${question.precise_timestamp || question.timestamp}</span>` : ''}
                          ${question.type ? `<span>📋 Type: ${question.type}</span>` : ''}
                          ${question.cognitive_level ? `<span>🧠 Level: ${question.cognitive_level}</span>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- 5. Presentation Skills -->
            <div class="section new-page">
              <div class="section-header">5. Presentation Skills</div>
              <div class="section-content">
                <div class="section-score">Score: ${Math.round(results.presentation_skills?.score * 10) / 10}/10</div>
                ${results.presentation_skills?.explanations ? renderExplanations(results.presentation_skills.explanations) : ''}
              </div>
            </div>
            
            <!-- Disclaimer -->
            <div class="disclaimer">
              <div class="disclaimer-title">Disclaimer</div>
              <div class="disclaimer-text">
                These results are generated by AI using curated algorithms and may not be accurate. The results may not fully reflect the pedagogical impact. For a more comprehensive consultation, please contact CTLT.
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>This report is generated by MARS (Multimodal AI Reflection System) with curated algorithms.</p>
              <p>An AI Media Tool by CTLT</p>
            </div>
            
            <!-- Developer Information -->
            <div class="developer-info">
              <div style="margin-bottom: 0.5rem;">
                Developed by <strong>Tan Teong Jin, Prakash S/O Perumal Haridas, Maria Goh</strong>.
              </div>
              <div style="margin-bottom: 0.5rem;">
                Guided by <strong>Tan Sie Wee</strong>.
              </div>
              <div>
                In collaboration with <strong>Mark Gan</strong>.
              </div>
            </div>
          </body>
          </html>
        `;
      };

      // Generate HTML content
      const fullHTML = generatePDFContent();
      
      // Debug: Log HTML length to verify it's generated
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated HTML length:', fullHTML.length);
        console.log('Generated HTML preview:', fullHTML.substring(0, 500));
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHTML, 'text/html');
      
      // Verify parsing was successful
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('HTML parsing error:', parserError.textContent);
        throw new Error('Failed to parse HTML content: ' + parserError.textContent);
      }
      
      // Get the body content and styles
      const bodyContent = doc.body;
      const styles = doc.head.querySelectorAll('style');
      
      if (!bodyContent || bodyContent.children.length === 0) {
        console.error('Body content is empty or has no children');
        throw new Error('PDF HTML body is empty');
      }
      
      // Create a temporary container for PDF content
      const pdfWrapper = document.createElement('div');
      pdfWrapper.id = 'pdf-export-wrapper';
      pdfWrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 210mm;
        min-height: 100vh;
        background: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20mm;
        z-index: 999999;
        overflow: auto;
      `;
      
      // Create a style element and append all styles
      const styleElement = document.createElement('style');
      styles.forEach(style => {
        styleElement.textContent += style.textContent;
      });
      pdfWrapper.appendChild(styleElement);
      
      // Clone and append body children
      const bodyChildren = Array.from(bodyContent.children);
      if (process.env.NODE_ENV === 'development') {
        console.log('Body children count:', bodyChildren.length);
      }
      
      bodyChildren.forEach((child, idx) => {
        const cloned = child.cloneNode(true);
        pdfWrapper.appendChild(cloned);
        if (process.env.NODE_ENV === 'development' && idx < 3) {
          console.log(`Appended child ${idx}:`, cloned.tagName, cloned.className || cloned.id);
        }
      });
      
      // Append to document (will briefly overlay, but that's okay)
      document.body.appendChild(pdfWrapper);
      
      // Force a reflow to ensure rendering
      void pdfWrapper.offsetHeight;
      
      // Wait for fonts and rendering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify content exists
      const contentElements = pdfWrapper.querySelectorAll('.header, .overall-score, .section');
      const allChildren = pdfWrapper.querySelectorAll('*');
      console.log('PDF wrapper children count:', pdfWrapper.children.length);
      console.log('PDF wrapper total elements:', allChildren.length);
      console.log('PDF wrapper content elements:', contentElements.length);
      
      if (contentElements.length === 0 && pdfWrapper.children.length === 0) {
        console.error('PDF content verification failed. Elements found:', pdfWrapper.children.length);
        document.body.removeChild(pdfWrapper);
        throw new Error('PDF content is empty or not properly rendered');
      }
      
      // Make sure wrapper has content and is visible
      if (pdfWrapper.scrollHeight === 0) {
        console.error('PDF wrapper has zero height');
        document.body.removeChild(pdfWrapper);
        throw new Error('PDF content has zero height');
      }
      
      // Log wrapper dimensions for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('PDF wrapper dimensions:', {
          width: pdfWrapper.scrollWidth,
          height: pdfWrapper.scrollHeight,
          offsetWidth: pdfWrapper.offsetWidth,
          offsetHeight: pdfWrapper.offsetHeight
        });
      }
      
      // Configure html2pdf options
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `MARS-analysis-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: process.env.NODE_ENV === 'development', // Only log in dev
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: pdfWrapper.scrollWidth || 794, // A4 width in pixels at 96 DPI
          height: pdfWrapper.scrollHeight || 1123, // A4 height in pixels
          windowWidth: pdfWrapper.scrollWidth || window.innerWidth,
          windowHeight: pdfWrapper.scrollHeight || window.innerHeight
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.section', '.overall-score', '.category-scores']
        }
      };
      
      // Generate PDF from the content
      if (process.env.NODE_ENV === 'development') {
        console.log('Starting PDF generation with options:', opt);
      }
      
      try {
        await html2pdf().set(opt).from(pdfWrapper).save();
        if (process.env.NODE_ENV === 'development') {
          console.log('PDF generation completed successfully');
        }
      } catch (pdfError) {
        console.error('html2pdf error:', pdfError);
        throw new Error(`PDF generation failed: ${pdfError.message}`);
      }
      
      // Clean up
      document.body.removeChild(pdfWrapper);

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`PDF export failed: ${error.message}. Please try again.`);
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
                    Drag & drop or click to select • Supports MP4, AVI, MOV, MKV, WMV • Max 2 hours, 2GB
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
                          <div>Size: {(job.file_size / (1024 * 1024)).toFixed(2)} MB</div>
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
                <div><strong>Frames Analysed:</strong> {results.configuration_used?.frames_analyzed || 0}</div>
              </div>

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
                {results.body_language.explanations && (
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
              </div>

              {/* Teaching Effectiveness Explanations */}
              {results.teaching_effectiveness?.explanations && (
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
              {results.presentation_skills?.explanations && (
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

            {/* Reset Button */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
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
      
      {/* Configuration Panel - Moved to Bottom */}
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
      </div>
    </div>
  );
}

export default App;
