import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import HeroStoryVideo from '../../src/components/landing/HeroStoryVideo';

// QA PF-01: story.mp4 (8.6 MB) is the homepage LCP download. The component must
// render the poster with preload="none" and no src until the browser is idle.
// jsdom has no requestIdleCallback, so the test provides a mock that only fires
// when the test flushes it.
let idleCallback = null;

beforeEach(() => {
  idleCallback = null;
  window.requestIdleCallback = vi.fn((cb) => {
    idleCallback = cb;
    return 1;
  });
  window.cancelIdleCallback = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
  vi.restoreAllMocks();
});

describe('HeroStoryVideo deferred hero video (QA PF-01)', () => {
  it('renders poster with preload none and no src before the idle callback', () => {
    render(<HeroStoryVideo />);
    const video = screen.getByTestId('hero-story-video');
    expect(video).toHaveAttribute('preload', 'none');
    expect(video.getAttribute('poster')).toContain('bakery-owner/poster.jpg');
    expect(video.hasAttribute('src')).toBe(false);
  });

  it('does not load or play before the idle callback fires', () => {
    render(<HeroStoryVideo />);
    expect(HTMLMediaElement.prototype.load).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByTestId('hero-story-video').hasAttribute('src')).toBe(false);
  });

  it('attaches the story mp4 and plays once the idle callback fires', () => {
    render(<HeroStoryVideo />);
    const video = screen.getByTestId('hero-story-video');
    expect(video.hasAttribute('src')).toBe(false);

    act(() => {
      idleCallback();
    });

    expect(video.getAttribute('src')).toContain('bakery-owner/story.mp4');
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});