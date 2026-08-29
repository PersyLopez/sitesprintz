import { useCallback, useEffect, useRef, useState } from 'react';
import './HeroStoryVideo.css';

/**
 * Ambient value stories — diffused into the hero, not a boxed player.
 * Second-person "you": busy today → gone tomorrow → one page → they come back.
 */

const STORIES = [
  {
    id: 'food',
    categoryLabel: 'Food & Dining',
    badge: 'Street stand',
    video: '/assets/hero/food/story.mp4',
    poster: '/assets/hero/food/poster.jpg',
    captions: [
      { start: 0, end: 2.3, label: 'Today', text: 'Your stand is busy. People taste, smile, and move on.' },
      { start: 2.3, end: 4.5, label: 'Tomorrow', text: 'They want those mangoes again — and can’t remember which corner.' },
      { start: 4.5, end: 6.7, label: 'Your page', text: 'One link: today’s fruit, your hours, how to find you.' },
      { start: 6.7, end: 99, label: 'They return', text: 'They come back. Your stand isn’t only a moment — it’s a place they can find.' },
    ],
  },
  {
    id: 'service',
    categoryLabel: 'Service',
    badge: 'Barbershop',
    video: '/assets/hero/service/story.mp4',
    poster: '/assets/hero/service/poster.jpg',
    captions: [
      { start: 0, end: 2.3, label: 'Today', text: 'Your chair is ready. The street is full of people who need a cut.' },
      { start: 2.3, end: 4.5, label: 'Tomorrow', text: 'They walk past, unsure of your hours — and keep scrolling.' },
      { start: 4.5, end: 6.7, label: 'Your page', text: 'Hours, style photos, and a simple way to message you.' },
      { start: 6.7, end: 99, label: 'They return', text: 'The chair stays filled — because customers finally know how to find you.' },
    ],
  },
  {
    id: 'professional',
    categoryLabel: 'Home bakery',
    badge: 'Home bakery',
    video: '/assets/hero/professional/story.mp4',
    poster: '/assets/hero/professional/poster.jpg',
    captions: [
      { start: 0, end: 2.3, label: 'Today', text: 'Your kitchen is busy. The smell of cinnamon fills the room.' },
      { start: 2.3, end: 4.5, label: 'Tomorrow', text: 'Someone wants those rolls again — but the order is buried in your DMs.' },
      { start: 4.5, end: 6.7, label: 'Your page', text: 'One link: flavors this week, how to order, when you’re full.' },
      { start: 6.7, end: 99, label: 'They return', text: 'Customers order on purpose — not by hunting through message threads.' },
    ],
  },
];

function captionIndexAt(captions, time) {
  const i = captions.findIndex((c) => time >= c.start && time < c.end);
  return i >= 0 ? i : captions.length - 1;
}

export default function HeroStoryVideo() {
  const videoRef = useRef(null);
  const rootRef = useRef(null);
  const [activeId, setActiveId] = useState(STORIES[0].id);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [captionIdx, setCaptionIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [inView, setInView] = useState(true);

  const story = STORIES.find((s) => s.id === activeId) ?? STORIES[0];
  const caption = story.captions[captionIdx] ?? story.captions[0];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    setProgress(0);
    setCaptionIdx(0);
    video.load();

    if (reduceMotion) {
      video.pause();
      const last = story.captions[story.captions.length - 1];
      video.currentTime = Math.min(last.start + 0.3, 10);
      setCaptionIdx(story.captions.length - 1);
      setProgress(1);
      setPlaying(false);
      return undefined;
    }

    let rafId = 0;
    let lastCaption = -1;
    let lastProgressBucket = -1;

    // timeupdate fires often; coalesce to rAF and skip no-op React state writes
    const onTime = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const t = video.currentTime || 0;
        const duration = video.duration || 9;
        const nextCaption = captionIndexAt(story.captions, t);
        if (nextCaption !== lastCaption) {
          lastCaption = nextCaption;
          setCaptionIdx(nextCaption);
        }
        const progressValue = duration ? Math.min(1, t / duration) : 0;
        const bucket = Math.floor(progressValue * 40);
        if (bucket !== lastProgressBucket) {
          lastProgressBucket = bucket;
          setProgress(progressValue);
        }
      });
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const idx = STORIES.findIndex((s) => s.id === activeId);
      setActiveId(STORIES[(idx + 1) % STORIES.length].id);
    };

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [activeId, reduceMotion, story]);

  // Pause decode/composite work while the hero is off-screen
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return undefined;
    if (!inView) {
      video.pause();
      return undefined;
    }
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => setPlaying(false));
    }
    return undefined;
  }, [inView, reduceMotion, activeId]);

  const togglePlay = useCallback(() => {
    if (reduceMotion) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, [reduceMotion]);

  return (
    <div className="hero-ambient" ref={rootRef} aria-hidden={false}>
      <div className="hero-ambient-media">
        <video
          key={story.id}
          ref={videoRef}
          className="hero-ambient-video"
          src={story.video}
          poster={story.poster}
          muted
          playsInline
          preload="metadata"
          aria-label={caption.text}
        />
        <div className="hero-ambient-veil" />
        <div className="hero-ambient-grain" aria-hidden="true" />
      </div>

      <div className="hero-ambient-ui">
        <div className="hero-story-cats" role="tablist" aria-label="Business category stories">
          {STORIES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === activeId}
              className={`hero-story-cat ${s.id === activeId ? 'hero-story-cat--active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              {s.categoryLabel}
            </button>
          ))}
        </div>

        <div className="hero-ambient-caption" key={`${story.id}-${captionIdx}`}>
          <span className="hero-story-phase">{caption.label}</span>
          <p className="hero-story-caption">{caption.text}</p>
        </div>

        <div className="hero-ambient-controls">
          <button
            type="button"
            className="hero-story-play"
            onClick={togglePlay}
            aria-label={playing ? 'Pause story' : 'Play story'}
            disabled={reduceMotion}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <div
            className="hero-story-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Story progress"
          >
            <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
          <span className="hero-story-badge">{story.badge}</span>
        </div>
      </div>
    </div>
  );
}
