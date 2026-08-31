import { useCallback, useEffect, useRef, useState } from 'react';
import './HeroStoryVideo.css';

/**
 * Two bakery spots — owner hats vs client conversation tax.
 * Same files are reusable as 16:9 ads (public/assets/hero/bakery-*).
 */

const STORIES = [
  {
    id: 'bakery-owner',
    categoryLabel: 'In the kitchen',
    badge: 'Owner',
    video: '/assets/hero/bakery-owner/story.mp4?v=ads5',
    poster: '/assets/hero/bakery-owner/poster.jpg?v=ads5',
    captions: [
      { start: 0, end: 3.2, label: 'Every hat', text: 'You bake. You also run the front desk — dough in one hand, the inbox in the other.' },
      { start: 3.2, end: 5.0, label: 'Time', text: 'Every order is a conversation you didn’t have time for.' },
      { start: 5.0, end: 99, label: 'The page', text: 'The page wears that hat. You get back to the oven.' },
    ],
  },
  {
    id: 'bakery-client',
    categoryLabel: 'Trying to order',
    badge: 'Customer',
    video: '/assets/hero/bakery-client/story.mp4?v=ads5',
    poster: '/assets/hero/bakery-client/poster.jpg?v=ads5',
    captions: [
      { start: 0, end: 5.0, label: 'The line', text: 'You shouldn’t have to ask what’s in it while people wait behind you.' },
      { start: 5.0, end: 99, label: 'The page', text: 'See the food, what’s in it, how to order — no call, no rush.' },
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
  const [activeId, setActiveId] = useState('bakery-owner');
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
      video.currentTime = last.start + 0.3;
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
        const duration = video.duration || 8;
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
          data-testid="hero-story-video"
        />
        <div className="hero-ambient-veil" />
        <div className="hero-ambient-grain" aria-hidden="true" />
      </div>

      <div className="hero-ambient-ui">
        <div className="hero-story-cats" role="tablist" aria-label="Owner and customer stories">
          {STORIES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === activeId}
              className={`hero-story-cat ${s.id === activeId ? 'hero-story-cat--active' : ''}`}
              data-testid={`hero-story-tab-${s.id}`}
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
