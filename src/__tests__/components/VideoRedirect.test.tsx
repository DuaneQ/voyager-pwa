import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VideoRedirect } from '../../components/utilities/VideoRedirect';

describe('VideoRedirect', () => {
  it('navigates to /video/:id when video param is present', () => {
    const navigateMock = jest.fn();

    // Render with a memory router and initial entries including the video query
    render(
      <MemoryRouter initialEntries={["/somepath?video=abc123"]}>
        <Routes>
          <Route path="/somepath" element={<VideoRedirect />} />
          {/* a catch-all route so navigation doesn't error in test environment */}
          <Route path="/video/:id" element={<div data-testid="video-page" />} />
        </Routes>
      </MemoryRouter>
    );

    // Using the actual router, we expect the DOM to contain the video-page element
    // However react-router's v6 MemoryRouter will perform the navigation replace
    // and render the target route. Assert that the target element exists.
    expect(document.querySelector('[data-testid="video-page"]')).toBeInTheDocument();
  });

  it('does not navigate when video param is absent', () => {
    render(
      <MemoryRouter initialEntries={["/somepath"]}>
        <Routes>
          <Route path="/somepath" element={<VideoRedirect />} />
          <Route path="/video/:id" element={<div data-testid="video-page" />} />
        </Routes>
      </MemoryRouter>
    );

    expect(document.querySelector('[data-testid="video-page"]')).not.toBeInTheDocument();
  });
});
