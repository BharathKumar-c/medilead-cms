import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Square, Volume2, VolumeX,
  RotateCcw, RotateCw, X, Headphones,
  PhoneIncoming, PhoneOutgoing,
} from 'lucide-react';

const SKIP_SECONDS = 10;

const formatTime = (seconds) => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const AudioPlayerModal = ({ isOpen, onClose, recordingUrl, callInfo }) => {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when modal opens with new recording
  useEffect(() => {
    if (isOpen && recordingUrl) {
      setIsPlaying(false);
      setIsMuted(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
    }
  }, [isOpen, recordingUrl]);

  // Cleanup on unmount — stop audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        togglePlay();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying]);

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onClose();
  }, [onClose]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const skip = useCallback((seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds)
    );
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !audioRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    audioRef.current.currentTime = ratio * duration;
  }, [duration]);

  if (!isOpen) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const DirectionIcon = callInfo?.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-h3 text-on-surface">Call Recording</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {callInfo && (
            <div className="bg-surface-container rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-caption text-on-surface-variant">Caller</span>
                <span className="font-data-tabular text-on-surface">{callInfo.caller_number}</span>
              </div>
              {callInfo.lead_name && (
                <div className="flex items-center justify-between">
                  <span className="font-caption text-on-surface-variant">Patient</span>
                  <span className="font-body-md text-on-surface font-medium">{callInfo.lead_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-caption text-on-surface-variant">Direction</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-caption font-bold ${
                  callInfo.direction === 'inbound'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-green-500/10 text-green-500'
                }`}>
                  <DirectionIcon className="w-3 h-3" />
                  {callInfo.direction}
                </span>
              </div>
              {callInfo.duration > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-caption text-on-surface-variant">Duration</span>
                  <span className="font-data-tabular text-on-surface">{formatTime(callInfo.duration)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-3">
          <div
            ref={progressRef}
            className="w-full h-2 bg-surface-container-high rounded-full cursor-pointer relative group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-secondary rounded-full transition-[width] duration-100 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-secondary rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-data-tabular text-xs text-on-surface-variant">
              {formatTime(currentTime)}
            </span>
            <span className="font-data-tabular text-xs text-on-surface-variant">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-5 pb-5 pt-1">
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-full transition-colors ${
              isMuted
                ? 'bg-error/10 text-error'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => skip(-SKIP_SECONDS)}
            className="p-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            title={`Back ${SKIP_SECONDS}s`}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-secondary text-on-secondary hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50 shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStop}
            className="p-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            title="Stop"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={() => skip(SKIP_SECONDS)}
            className="p-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            title={`Forward ${SKIP_SECONDS}s`}
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={recordingUrl}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default AudioPlayerModal;
