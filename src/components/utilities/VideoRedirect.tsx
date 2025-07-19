import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Component that handles video redirects from query parameters
 * Used to resolve redirect loops from Firebase Functions
 */
export const VideoRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const videoId = urlParams.get('video');
    
    if (videoId) {
      // Redirect to the actual video page
      navigate(`/video/${videoId}`, { replace: true });
    }
  }, [location.search, navigate]);

  return null; // This component doesn't render anything
};
