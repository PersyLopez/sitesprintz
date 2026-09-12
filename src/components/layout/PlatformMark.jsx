import React from 'react';

const TYPE_FACE = 'system-ui, ui-sans-serif, sans-serif';
const BODY_LINES = ['Right', 'Site', 'Light'];

/** M1 lockup — L4 browser + beam + URL chip + stacked name. 48×36. */
function PlatformMark() {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 48 36"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
    >
      <path fill="currentColor" opacity="0.22" d="M3 3 L16 34 L46 18 Z" />
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        <rect x="14" y="8" width="31" height="24" rx="2.2" />
        <path d="M14 14 H45" />
      </g>
      <circle cx="4.6" cy="4.2" r="2" fill="currentColor" />
      <circle cx="17.6" cy="11" r="0.85" fill="currentColor" />
      <circle cx="20.2" cy="11" r="0.85" fill="currentColor" />
      <circle cx="22.8" cy="11" r="0.85" fill="currentColor" />
      <rect
        x="25"
        y="9.4"
        width="17.6"
        height="3.2"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <text
        x="26.4"
        y="11.8"
        fill="currentColor"
        fontFamily={TYPE_FACE}
        fontSize="2.35"
        fontStretch="condensed"
      >
        rightsitelight.com
      </text>
      {BODY_LINES.map((line, i) => (
        <text
          key={line}
          x="17.8"
          y={20.2 + i * 5}
          fill="currentColor"
          fontFamily={TYPE_FACE}
          fontWeight="800"
          fontSize="5.8"
          fontStretch="condensed"
          letterSpacing="-0.04"
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

export default PlatformMark;
