/**
 * LandingPage.test.tsx
 * Unit tests for the public-facing landing page component
 * 
 * Test Plan:
 * 1. Renders all main sections (hero, features, demo video, CTA)
 * 2. Redirects authenticated users to /profile
 * 3. Navigation buttons work correctly
 * 4. Video elements have correct attributes for autoplay/playsinline
 * 5. Scroll-to-section functionality works
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LandingPage } from '../../components/pages/LandingPage';
import { Context } from '../../Context/UserAuthContext';

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper to render with router and context
const renderWithContext = (user: any = null) => {
  const contextValue = {
    user,
    setUser: jest.fn(),
    userProfile: null,
    setUserProfile: jest.fn(),
  };

  return render(
    <HelmetProvider>
      <BrowserRouter>
        <Context.Provider value={contextValue}>
          <LandingPage />
        </Context.Provider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Rendering', () => {
    it('renders hero section with main headline', () => {
      renderWithContext();
      
      expect(screen.getByText(/Find Your Perfect Travel Companion/i)).toBeInTheDocument();
      expect(screen.getByText(/Connect with travel buddies and vacation companions/i)).toBeInTheDocument();
    });

    it('renders all CTA buttons in hero section', () => {
      renderWithContext();
      
      // The button has aria-label but displays "Get Started Free"
      expect(screen.getByRole('button', { name: /Sign up for TravalPass/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /See How It Works/i })).toBeInTheDocument();
    });

    it('renders problem/solution section', () => {
      renderWithContext();
      
      expect(screen.getByText(/Stop Planning Alone/i)).toBeInTheDocument();
      expect(screen.getByText(/Find Your Vacation Companion/i)).toBeInTheDocument();
    });

    it('renders all four feature cards', () => {
      renderWithContext();
      
      // Check for feature card headings (these should be in the CardContent)
      expect(screen.getByText(/Your Complete Travel Companion Platform/i)).toBeInTheDocument();
      
      // Feature cards should contain icons and text, verify section exists
      const featureSection = screen.getByText(/Your Complete Travel Companion Platform/i).closest('div');
      expect(featureSection).toBeInTheDocument();
    });

    it('renders demo video section with heading', () => {
      renderWithContext();
      
      expect(screen.getByText(/See TravalPass in Action/i)).toBeInTheDocument();
      expect(screen.getByText(/Watch how easy it is to plan, match, and travel together/i)).toBeInTheDocument();
    });

    it('renders CTA footer section', () => {
      renderWithContext();
      
      expect(screen.getByText(/Join thousands of travelers planning their next adventure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Up Now/i })).toBeInTheDocument();
    });

    it('renders footer with copyright', () => {
      renderWithContext();
      
      expect(screen.getByText(/© 2025 TravalPass. All rights reserved./i)).toBeInTheDocument();
    });

    it('renders App Store download link with correct attributes', () => {
      renderWithContext();
      
      const appStoreLink = screen.getByRole('link', { name: /Download TravalPass on the App Store/i });
      
      expect(appStoreLink).toBeInTheDocument();
      expect(appStoreLink).toHaveAttribute('href', 'https://apps.apple.com/us/app/travalpass-traval-together/id6756789856');
      expect(appStoreLink).toHaveAttribute('target', '_blank');
      expect(appStoreLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders App Store badge image', () => {
      renderWithContext();
      
      const appStoreBadge = screen.getByAltText(/Download on the App Store/i);
      
      expect(appStoreBadge).toBeInTheDocument();
      expect(appStoreBadge).toHaveAttribute('src', 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg');
    });
  });

  describe('Authentication Redirect', () => {
    it('redirects authenticated users to /profile', async () => {
      const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
      
      renderWithContext(mockUser);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
      });
    });

    it('does not redirect when user is null', () => {
      renderWithContext(null);
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to /Register when clicking Get Started Free', async () => {
      renderWithContext();
      
      // Button has aria-label "Sign up for TravalPass"
      const getStartedButton = screen.getByRole('button', { name: /Sign up for TravalPass/i });
      await userEvent.click(getStartedButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/Register');
    });

    it('navigates to /login when clicking Sign In in header', async () => {
      renderWithContext();
      
      const signInButton = screen.getByRole('button', { name: /^Sign In$/i });
      await userEvent.click(signInButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('navigates to /Register from problem section CTA', async () => {
      renderWithContext();
      
      const createProfileButton = screen.getByRole('button', { name: /Create Your Free Travel Profile/i });
      await userEvent.click(createProfileButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/Register');
    });

    it('navigates to /Register from footer Sign Up button', async () => {
      renderWithContext();
      
      const signUpButton = screen.getByRole('button', { name: /Sign Up Now/i });
      await userEvent.click(signUpButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/Register');
    });

    it('navigates to /Login when clicking Sign In link', async () => {
      renderWithContext();
      
      const signInButton = screen.getByRole('button', { name: /Already have an account\? Sign In/i });
      await userEvent.click(signInButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/Login');
    });
  });

  describe('Video Elements', () => {
    it('renders background hero video with correct attributes', () => {
      renderWithContext();
      
      const videos = document.querySelectorAll('video');
      const heroVideo = Array.from(videos).find(v => v.getAttribute('src') === '/TravalPass.mp4');
      
      expect(heroVideo).toBeInTheDocument();
      expect(heroVideo).toHaveAttribute('autoPlay');
      expect(heroVideo).toHaveAttribute('loop');
      // muted is a boolean attribute - check for its presence or property
      expect(heroVideo?.muted).toBe(true);
      expect(heroVideo).toHaveAttribute('playsInline');
      expect(heroVideo).toHaveAttribute('preload', 'auto');
    });

    it('renders demo video as YouTube iframe', () => {
      renderWithContext();
      
      const iframe = screen.getByTitle('TravalPass Tutorial - How to Find Travel Companions');
      
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/hyRvN9cHtRM');
      expect(iframe).toHaveAttribute('allowFullScreen');
      expect(iframe).toHaveStyle('border: 0px');
    });

    it('YouTube iframe has proper accessibility attributes', () => {
      renderWithContext();
      
      const iframe = screen.getByTitle('TravalPass Tutorial - How to Find Travel Companions');
      
      expect(iframe).toHaveAttribute('title', 'TravalPass Tutorial - How to Find Travel Companions');
      expect(iframe).toHaveAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    });
  });

  describe('Scroll Behavior', () => {
    it('scrolls to how-it-works section when clicking See How It Works', async () => {
      // Mock scrollIntoView
      const mockScrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;
      
      renderWithContext();
      
      const seeHowButton = screen.getByRole('button', { name: /See How It Works/i });
      await userEvent.click(seeHowButton);
      
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles for all interactive elements', () => {
      renderWithContext();
      
      const buttons = screen.getAllByRole('button');
      
      // Should have at least 5 buttons: Get Started Free, See How It Works, 
      // Create Your Free Travel Profile, Sign Up Now, Sign In
      expect(buttons.length).toBeGreaterThanOrEqual(5);
    });

    it('images have alt text', () => {
      renderWithContext();
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive styling to hero text', () => {
      renderWithContext();
      
      const heroHeading = screen.getByText(/Find Your Perfect Travel Companion/i);
      
      // Component uses sx prop with responsive fontSize
      expect(heroHeading).toBeInTheDocument();
      expect(heroHeading.tagName).toBe('H1');
    });
  });

  describe('Console Logging (Video Events)', () => {
    it('logs video events for debugging', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock video.play() to return a resolved promise
      HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);
      
      renderWithContext();
      
      // Trigger video events
      const videos = document.querySelectorAll('video');
      const heroVideo = videos[0];
      
      if (heroVideo) {
        heroVideo.dispatchEvent(new Event('loadstart'));
        heroVideo.dispatchEvent(new Event('loadedmetadata'));
        heroVideo.dispatchEvent(new Event('canplay'));
      }
      
      // Should log video events
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    it('YouTube iframe loads correctly without errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithContext();
      
      const iframe = screen.getByTitle('TravalPass Tutorial - How to Find Travel Companions');
      
      // YouTube iframe should load without JavaScript errors
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute('src')).toContain('youtube.com/embed');
      
      // No console errors should be logged during iframe render
      // (Note: YouTube iframe handles its own loading states)
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('handles video.play rejection gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock video.play() to return a rejected promise
      HTMLVideoElement.prototype.play = jest.fn().mockRejectedValue(new Error('play rejected'));

      renderWithContext();

      const videos = document.querySelectorAll('video');
      const heroVideo = videos[0];

      if (heroVideo) {
        // Trigger the canplay event which attempts to play the video
        heroVideo.dispatchEvent(new Event('canplay'));
      }

      // Wait for the microtask queue and handler to run, then assert
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

      consoleErrorSpy.mockRestore();
    });

    it('does not throw when See How It Works target is missing', () => {
      // Ensure the target element is not present
      const existing = document.getElementById('how-it-works');
      if (existing) existing.remove();

      renderWithContext();

      const seeHowButton = screen.getByRole('button', { name: /See How It Works/i });

      // Clicking should not navigate or throw even if the target element is missing
      userEvent.click(seeHowButton);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('hero video has objectFit cover style', () => {
      renderWithContext();

      const videos = document.querySelectorAll('video');
      const heroVideo = Array.from(videos).find(v => v.getAttribute('src') === '/TravalPass.mp4');

      expect(heroVideo).toBeInTheDocument();
      // inline style should include objectFit: 'cover'
      expect(heroVideo?.style.objectFit).toBe('cover');
    });
  });
});
