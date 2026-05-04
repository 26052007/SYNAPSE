import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, EyeOff, Camera, CameraOff, Play, Square, 
  AlertTriangle, CheckCircle, Clock, Brain, Zap,
  Shield, Volume2, VolumeX
} from 'lucide-react';

// Declare face-api globally loaded from CDN
declare const faceapi: any;

type FocusStatus = 'idle' | 'loading' | 'focused' | 'warning' | 'distracted';

const FACE_API_WEIGHTS_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

export default function FocusMode() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<FocusStatus>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [focusedSecs, setFocusedSecs] = useState(0);
  const [distractedSecs, setDistractedSecs] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const closedEyeTicksRef = useRef(0);
  const noFaceTicksRef = useRef(0);

  // Format seconds to display
  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Calculate focus percentage
  const totalSecs = focusedSecs + distractedSecs;
  const focusPercentage = totalSecs > 0 ? Math.round((focusedSecs / totalSecs) * 100) : 0;

  // Load face-api models
  const loadModels = useCallback(async () => {
    try {
      setStatus('loading');
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_WEIGHTS_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_WEIGHTS_URL);
      setIsModelLoaded(true);
      return true;
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      return false;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionDenied(false);
      return true;
    } catch (err) {
      console.error('Camera access denied:', err);
      setPermissionDenied(true);
      return false;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Distance utility
  const getDistance = (p1: any, p2: any) => 
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  // Face detection loop
  const startDetectionLoop = useCallback(() => {
    closedEyeTicksRef.current = 0;
    noFaceTicksRef.current = 0;

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detections.length > 0) {
          noFaceTicksRef.current = 0;
          const landmarks = detections[0].landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          // EAR (Eye Aspect Ratio) calculation
          const leftEAR = (getDistance(leftEye[1], leftEye[5]) + getDistance(leftEye[2], leftEye[4])) 
            / (2 * getDistance(leftEye[0], leftEye[3]));
          const rightEAR = (getDistance(rightEye[1], rightEye[5]) + getDistance(rightEye[2], rightEye[4])) 
            / (2 * getDistance(rightEye[0], rightEye[3]));
          const avgEAR = (leftEAR + rightEAR) / 2;

          if (avgEAR < 0.28) {
            closedEyeTicksRef.current++;
            if (closedEyeTicksRef.current > 30) {
              // Eyes closed for >30s — distracted/sleeping
              setStatus('distracted');
              setDistractedSecs(prev => prev + 1);
              if (alarmRef.current && !alarmRef.current.paused) { /* already playing */ }
              else if (alarmRef.current) alarmRef.current.play().catch(() => {});
            } else {
              // Eyes closed briefly — warning
              setStatus('warning');
              setFocusedSecs(prev => prev + 1);
            }
          } else {
            closedEyeTicksRef.current = 0;
            setStatus('focused');
            setFocusedSecs(prev => prev + 1);
            if (alarmRef.current) {
              alarmRef.current.pause();
              alarmRef.current.currentTime = 0;
            }
          }
        } else {
          noFaceTicksRef.current++;
          if (noFaceTicksRef.current > 3) {
            // No face detected for >3s
            setStatus('distracted');
            setDistractedSecs(prev => prev + 1);
            if (alarmRef.current) alarmRef.current.play().catch(() => {});
          } else {
            // Brief absence buffer
            setFocusedSecs(prev => prev + 1);
          }
        }
      } catch (err) {
        // Detection error — skip this tick
      }
    }, 1000);
  }, []);

  // Start session
  const handleStartSession = async () => {
    setStatus('loading');
    
    // Load models if not already loaded
    if (!isModelLoaded) {
      const loaded = await loadModels();
      if (!loaded) {
        setStatus('idle');
        alert('Failed to load AI face detection models. Please check your internet connection.');
        return;
      }
    }

    // Start camera
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      setStatus('idle');
      return;
    }

    // Wait for video to be ready
    if (videoRef.current) {
      videoRef.current.onloadeddata = () => {
        startDetectionLoop();
        setIsSessionActive(true);
        setSessionStartTime(new Date());
        setFocusedSecs(0);
        setDistractedSecs(0);
        setStatus('focused');
      };
    }
  };

  // Stop session
  const handleStopSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopCamera();
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    setIsSessionActive(false);
    setStatus('idle');
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(prev => {
      if (alarmRef.current) {
        alarmRef.current.muted = !prev;
      }
      return !prev;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  const statusConfig: Record<FocusStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
    idle: { label: 'INACTIVE', color: 'text-gray-400', bgColor: 'bg-white/5', borderColor: 'border-white/10', icon: <CameraOff className="w-4 h-4" /> },
    loading: { label: 'LOADING AI...', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: <Brain className="w-4 h-4 animate-spin" /> },
    focused: { label: 'FOCUSED', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/30', icon: <Eye className="w-4 h-4" /> },
    warning: { label: 'EYES CLOSING...', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: <AlertTriangle className="w-4 h-4" /> },
    distracted: { label: 'DISTRACTED', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: <EyeOff className="w-4 h-4" /> },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Alarm audio element */}
      <audio 
        ref={alarmRef} 
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" 
        preload="auto" 
        loop 
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Brain className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Deep <span className="gradient-text">Focus</span>
            </h1>
            <p className="text-gray-500 text-sm">AI Face Tracking • Keep your eyes on the mission</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed — spans 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2"
        >
          <div className="glass rounded-2xl overflow-hidden border border-white/10 relative group">
            {/* Video Container */}
            <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Overlay when idle */}
              {!isSessionActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4"
                  >
                    <Camera className="w-8 h-8 text-gray-500" />
                  </motion.div>
                  <p className="text-gray-500 text-sm font-medium">Camera feed will appear here</p>
                  <p className="text-gray-600 text-xs mt-1">Camera permission required</p>
                </div>
              )}

              {/* Status Badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={status}
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute top-4 right-4 px-4 py-2 rounded-full ${currentStatus.bgColor} ${currentStatus.borderColor} border backdrop-blur-md flex items-center gap-2`}
                >
                  <span className={currentStatus.color}>{currentStatus.icon}</span>
                  <span className={`text-xs font-bold tracking-widest uppercase ${currentStatus.color}`}>
                    {currentStatus.label}
                  </span>
                  {status === 'distracted' && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-red-500"
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Live indicator when session active */}
              {isSessionActive && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-red-500"
                  />
                  <span className="text-red-400 text-[10px] font-bold tracking-widest">LIVE</span>
                </div>
              )}

              {/* Scan line effect when focused */}
              {status === 'focused' && (
                <motion.div
                  className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isSessionActive ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartSession}
                    disabled={status === 'loading'}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-lg hover:shadow-primary/20"
                  >
                    {status === 'loading' ? (
                      <>
                        <Brain className="w-5 h-5 animate-spin" />
                        Loading AI Core...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        Start Focus Session
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStopSession}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold rounded-xl transition-shadow hover:shadow-lg hover:shadow-red-500/20"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    Stop Session
                  </motion.button>
                )}
              </div>

              <button 
                onClick={toggleMute}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Permission denied warning */}
          <AnimatePresence>
            {permissionDenied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-bold text-sm">Camera Access Denied</p>
                  <p className="text-red-400/70 text-xs mt-1">
                    Please allow camera access in your browser settings to use Focus Mode. 
                    Make sure you're on <span className="font-mono">localhost</span> or <span className="font-mono">HTTPS</span>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Side — Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Focus Score */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Focus Score</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <motion.circle 
                    cx="60" cy="60" r="52" 
                    fill="none" 
                    stroke={focusPercentage >= 70 ? '#00f2ff' : focusPercentage >= 40 ? '#ffb800' : '#ff0055'}
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - focusPercentage / 100)}`}
                    animate={{ strokeDashoffset: `${2 * Math.PI * 52 * (1 - focusPercentage / 100)}` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{focusPercentage}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Metrics */}
          <div className="glass rounded-2xl p-6 border border-white/10 space-y-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Session Metrics</h3>
            
            {/* Focused Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Focused</span>
                </div>
                <motion.span
                  key={focusedSecs}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-primary"
                >
                  {formatTime(focusedSecs)}
                </motion.span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                  style={{ width: totalSecs > 0 ? `${(focusedSecs / totalSecs) * 100}%` : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Distracted Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Distracted</span>
                </div>
                <motion.span
                  key={distractedSecs}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-red-400"
                >
                  {formatTime(distractedSecs)}
                </motion.span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 to-red-500/60 rounded-full"
                  style={{ width: totalSecs > 0 ? `${(distractedSecs / totalSecs) * 100}%` : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Total Session Time */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</span>
                </div>
                <span className="text-lg font-bold text-white">
                  {formatTime(totalSecs)}
                </span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">How it Works</h3>
            <div className="space-y-3">
              {[
                { icon: <Camera className="w-3.5 h-3.5" />, text: 'Webcam tracks your face in real-time', color: 'text-primary' },
                { icon: <Eye className="w-3.5 h-3.5" />, text: 'AI measures Eye Aspect Ratio (EAR)', color: 'text-secondary' },
                { icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Alerts when distracted or sleeping', color: 'text-accent' },
                { icon: <Shield className="w-3.5 h-3.5" />, text: 'All processing done locally — 100% private', color: 'text-green-400' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`${item.color} mt-0.5`}>{item.icon}</div>
                  <span className="text-xs text-gray-400 leading-relaxed">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
