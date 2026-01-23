/**
 * LandingPage - Main marketing page for TravalPass
 * Public-facing page that introduces the app and encourages signups
 * SEO optimized for: travel companions, travel buddies, travel itineraries, travel tips
 */

import { Box, Button, Typography, Container, Grid, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContext, useEffect, useRef } from 'react';
import { Context } from '../../Context/UserAuthContext';
import { Helmet } from 'react-helmet-async';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import PeopleIcon from '@mui/icons-material/People';
import HotelIcon from '@mui/icons-material/Hotel';
import ChatIcon from '@mui/icons-material/Chat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(Context);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Redirect authenticated users to their profile
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  // Video troubleshooting
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.error('Video element ref not found');
      return;
    }

    console.log('Video element found, attempting to play...');
    console.log('Video src:', video.src);
    console.log('Video currentSrc:', video.currentSrc);
    console.log('Video readyState:', video.readyState);
    console.log('Video paused:', video.paused);
    console.log('Video networkState:', video.networkState);
    console.log('Video error:', video.error);

    const handleCanPlay = () => {
      console.log('Video can play - readyState:', video.readyState);
      video.play()
        .then(() => console.log('Video playing successfully'))
        .catch(err => console.error('Video play error:', err));
    };

    const handleLoadedData = () => {
      console.log('Video data loaded');
    };

    const handleError = (e: Event) => {
      console.error('Video error event:', e);
      console.error('Video error:', video.error);
    };

    const handlePlay = () => {
      console.log('Video play event fired');
    };

    const handlePause = () => {
      console.log('Video pause event fired');
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Try to play immediately if already loaded
    if (video.readyState >= 3) {
      console.log('Video already loaded, playing now');
      video.play()
        .then(() => console.log('Immediate play successful'))
        .catch(err => console.error('Immediate play error:', err));
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* SEO Meta Tags for Landing Page */}
      <Helmet>
        <title>TravalPass – Find Your Perfect Travel Companion | Travel Buddies & Itineraries</title>
        <meta name="description" content="Find your perfect travel companion, vacation buddy, or trip partner on TravalPass. Connect with like-minded travelers, share itineraries, discover travel tips, and explore the world together safely. Join our community of travel companions today!" />
        <link rel="canonical" href="https://travalpass.com/" />
      </Helmet>

      {/* Top Navigation Bar with Sign In */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: { xs: 2, sm: 4 },
          py: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          TravalPass
        </Typography>
        <Button
          variant="text"
          onClick={() => navigate('/login')}
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: '1rem',
            textTransform: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Sign In
        </Button>
      </Box>

      {/* Full-screen Video Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6))',
            zIndex: 1,
          }
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="/TravalPass.mp4"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            transform: 'translate(-50%, -50%)',
            objectFit: 'cover',
          }}
          onLoadStart={() => console.log('Video load started')}
          onLoadedMetadata={() => console.log('Video metadata loaded')}
          onLoadedData={() => console.log('Video data loaded')}
          onCanPlay={() => console.log('Video can play')}
          onError={(e) => console.error('Video error:', e)}
        >
          <source src="/TravalPass.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >

        {/* Hero Content */}
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            color: 'white',
            px: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            component="h1"
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
              fontWeight: 700,
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Find Your Perfect Travel Companion
          </Typography>
          
          <Typography
            component="h2"
            variant="h5"
            sx={{
              fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
              mb: 4,
              maxWidth: '800px',
              mx: 'auto',
              textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Connect with travel buddies and vacation companions headed to the same destination. Build AI-powered itineraries in seconds. Get expert travel tips. Find your perfect travel partner and explore the world together safely.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/Register')}
              aria-label="Sign up for TravalPass"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 },
                borderRadius: 3,
                textTransform: 'none',
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                  transform: 'scale(1.05)',
                  transition: 'all 0.3s ease',
                },
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
              }}
            >
              Get Started Free
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                const element = document.getElementById('how-it-works');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                py: { xs: 1.5, sm: 2 },
                px: { xs: 3, sm: 4 },
                borderRadius: 3,
                textTransform: 'none',
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)',
                  transition: 'all 0.3s ease',
                },
              }}
            >
              See How It Works
            </Button>
          </Box>

          {/* App Store Download Button */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <a
              href="https://apps.apple.com/us/app/travalpass-traval-together/id6756789856"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download TravalPass on the App Store"
            >
              <Box
                component="img"
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                sx={{
                  height: { xs: 45, sm: 50 },
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              />
            </a>
          </Box>
        </Container>
      </Box>

      {/* Problem → Solution Section */}
      <Box
        id="how-it-works"
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'rgba(245, 245, 245, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop"
                alt="Frustrated traveler planning"
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography
                component="h2"
                variant="h3"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  fontWeight: 700,
                  mb: 2,
                  color: '#1a1a1a',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Stop Planning Alone. Find Your Vacation Companion.
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1.1rem', sm: '1.2rem' },
                  mb: 3,
                  color: '#555',
                  lineHeight: 1.8,
                }}
              >
                Whether you're a solo traveler seeking a travel buddy or planning a group adventure, TravalPass connects you with compatible vacation companions. Share travel tips, build collaborative itineraries with your travel partner, and explore destinations together safely. Join thousands who've found their perfect trip companion.
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/Register')}
                aria-label="Create your free travel profile to find travel companions"
                sx={{
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 4,
                  borderRadius: 3,
                  textTransform: 'none',
                  bgcolor: '#1976d2',
                  '&:hover': {
                    bgcolor: '#1565c0',
                  },
                }}
              >
                Create Your Free Travel Profile
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Feature Highlights Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            variant="h3"
            align="center"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 6,
              color: '#1a1a1a',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Your Complete Travel Companion Platform
          </Typography>

          <Grid container spacing={4}>
            {/* AI Itineraries */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} aria-hidden="true" />
                  <Typography component="h3" variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                    AI Travel Itineraries
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '1rem' }}>
                    Get personalized travel itineraries with destinations, activities, and tips powered by AI.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Traveler Matching */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <PeopleIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} aria-hidden="true" />
                  <Typography component="h3" variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Find Travel Buddies
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '1rem' }}>
                    Connect with travel companions headed to the same destination during your travel dates.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Smart Search */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <HotelIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Smart Search
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '1rem' }}>
                    Find and compare flights, stays, and attractions in one place.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Connect & Chat */}
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <ChatIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Connect & Chat
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: '1rem' }}>
                    Talk to your matches before your trip and plan together.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Demo Video Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'rgba(245, 245, 245, 0.95)', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 2,
              color: '#1a1a1a',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            See TravalPass in Action
          </Typography>
          
          <Typography
            variant="body1"
            align="center"
            sx={{
              fontSize: '1.2rem',
              mb: 4,
              color: '#666',
            }}
          >
            Watch how easy it is to plan, match, and travel together.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              minHeight: { xs: '400px', sm: '500px', md: '600px' },
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/hyRvN9cHtRM"
              title="TravalPass Tutorial - How to Find Travel Companions"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                width: '100%',
                maxWidth: '340px',
                height: '600px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                border: 0,
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* CTA Footer */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'rgba(25, 118, 210, 0.95)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 4,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Join thousands of travelers planning their next adventure.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/Register')}
            sx={{
              fontSize: '1.2rem',
              py: 2,
              px: 5,
              borderRadius: 3,
              textTransform: 'none',
              bgcolor: 'white',
              color: '#1976d2',
              mb: 2,
              '&:hover': {
                bgcolor: '#f5f5f5',
                transform: 'scale(1.05)',
                transition: 'all 0.3s ease',
              },
            }}
          >
            Sign Up Now
          </Button>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="text"
              onClick={() => navigate('/Login')}
              sx={{
                color: 'white',
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Already have an account? Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* FAQ Section for SEO */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'rgba(245, 245, 245, 0.95)', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            variant="h3"
            align="center"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              mb: 6,
              color: '#1a1a1a',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Frequently Asked Questions
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  How do I find a travel companion on TravalPass?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  Simply create your free profile, enter your travel destination and dates, and our matching algorithm will connect you with compatible vacation companions heading to the same place. You can browse profiles, chat safely, and plan your adventure together.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  Is TravalPass safe for solo travelers looking for travel buddies?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  Our secure chat system keeps your personal information private until you're ready to share. We also provide travel safety tips and best practices for meeting your trip companion.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  What's the difference between a travel companion and a vacation buddy?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  They're essentially the same! Whether you call them travel companions, vacation buddies, trip partners, or adventure companions, TravalPass helps you find like-minded travelers to share experiences with. Our platform matches you based on travel style, interests, and destination preferences.
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  Can I find a travel partner for international trips?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  Yes! TravalPass connects travelers worldwide. Whether you're planning a European backpacking adventure, an Asian cultural tour, or a South American expedition, you can find compatible travel partners who share your destination and travel dates.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  How does the AI itinerary planner work with my travel buddy?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  Our AI creates personalized itineraries based on both travelers' preferences. Share the itinerary with your vacation companion, collaborate on activities, and make real-time adjustments together. It's the perfect way to plan your trip with your travel partner.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography component="h3" variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
                  Is TravalPass free for finding travel companions?
                </Typography>
                <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                  Yes! Basic features including profile creation, travel companion matching, and secure messaging are completely free. Premium features like AI-powered itinerary generation and unlimited matches are available with our affordable subscription plans.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 3,
          bgcolor: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          © 2025 TravalPass. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};
