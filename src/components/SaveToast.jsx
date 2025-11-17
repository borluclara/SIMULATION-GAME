/**
 * SaveToast - Toast notification component for save confirmations
 * Provides visual feedback for successful saves and errors
 */

import React, { useEffect, useState } from 'react';
import './SaveToast.css';

const SaveToast = ({ 
  message, 
  type = 'success', // 'success', 'error', 'info'
  isVisible = false,
  onClose,
  duration = 3000,
  simulationId = null
}) => {
  const [isShowing, setIsShowing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      setProgress(100);

      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 50));
          return newProgress > 0 ? newProgress : 0;
        });
      }, 50);

      // Auto-hide after duration
      const hideTimer = setTimeout(() => {
        setIsShowing(false);
        clearInterval(progressInterval);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300); // Wait for exit animation
      }, duration);

      return () => {
        clearTimeout(hideTimer);
        clearInterval(progressInterval);
      };
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📄';
    }
  };

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`save-toast ${type} ${isShowing ? 'show' : 'hide'}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {getIcon()}
        </div>
        
        <div className="toast-message">
          <div className="toast-title">
            {type === 'success' ? 'Simulation Saved!' : 
             type === 'error' ? 'Save Failed' : 'Information'}
          </div>
          <div className="toast-text">
            {message}
          </div>
          {simulationId && type === 'success' && (
            <div className="toast-meta">
              ID: {simulationId.split('_')[1]}
            </div>
          )}
        </div>

        <button className="toast-close" onClick={handleClose}>
          ×
        </button>
      </div>

      {type === 'success' && (
        <div className="toast-progress">
          <div 
            className="toast-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SaveToast;