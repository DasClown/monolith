import type { SVGProps } from 'react';
import type { UpgradeIcon } from '../../core/types';

export type IconName =
  | UpgradeIcon
  | 'cash'
  | 'coin'
  | 'gem'
  | 'turret'
  | 'workshop'
  | 'vault'
  | 'pause'
  | 'play'
  | 'fast'
  | 'skull'
  | 'trophy'
  | 'close'
  | 'check'
  | 'lock'
  | 'sparkle'
  | 'rocket'
  | 'pass'
  | 'shield'
  | 'core'
  | 'wave'
  | 'timer'
  | 'arrow-right'
  | 'plus'
  | 'star';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

const filledNames = new Set<IconName>([
  'bolt',
  'gem',
  'play',
  'star',
  'sparkle',
  'skull',
]);

export function Icon({ name, size = 24, strokeWidth = 2.2, ...rest }: IconProps) {
  const filled = filledNames.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {name === 'cash' && (
        <>
          <rect x="2.6" y="5.6" width="18.8" height="12.8" rx="2.8" />
          <path d="M6.6 12h10.8M12 9.1v5.8" />
          <circle cx="5.8" cy="8.8" r="0.9" />
        </>
      )}
      {name === 'coin' && (
        <>
          <circle cx="12" cy="12" r="8.7" opacity="0.35" />
          <circle cx="12" cy="12" r="6.2" />
          <path d="M12 7.7l1.25 2.55 2.8.4-2.03 1.98.48 2.8L12 14.1l-2.5 1.33.48-2.8-2.03-1.98 2.8-.4L12 7.7z" />
        </>
      )}
      {name === 'gem' && (
        <>
          <path d="M7.1 3.8h9.8L21 9.3 12 21 3 9.3 7.1 3.8z" opacity="0.9" />
          <path
            d="M3.3 9.3h17.4M7.4 4.1 9.7 9.3 12 20.6l2.3-11.3 2.3-5.2"
            fill="none"
            stroke="rgba(10,10,12,0.65)"
            strokeWidth="1.3"
          />
        </>
      )}
      {name === 'bolt' && <path d="M13.6 2.7 4.9 13h5.7l-.3 8.3L19.1 11h-5.7l.2-8.3z" />}
      {name === 'cycle' && (
        <>
          <path d="M20 8.2A8.2 8.2 0 0 0 5 5.9L3.4 8.1" />
          <path d="M3.4 3.2v4.9h4.9M4 15.8a8.2 8.2 0 0 0 15-2.3l1.6-2.2" />
          <path d="M20.6 20.8v-4.9h-4.9" />
        </>
      )}
      {name === 'split' && (
        <>
          <path d="M3.5 12h5.2M8.7 12 15 5.8M8.7 12H15M8.7 12l6.3 6.2" />
          <path d="M15 2.8v6M15 8.8v6.4M15 15.2v6" />
          <circle cx="19.2" cy="4.8" r="1.4" />
          <circle cx="19.2" cy="12" r="1.4" />
          <circle cx="19.2" cy="19.2" r="1.4" />
        </>
      )}
      {name === 'range' && (
        <>
          <circle cx="12" cy="12" r="8.4" opacity="0.5" />
          <circle cx="12" cy="12" r="4.3" />
          <path d="M12 2.2v4M12 17.8v4M2.2 12h4M17.8 12h4" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'crit' && (
        <>
          <path d="M12 2.4v5.1M12 16.5v5.1M2.4 12h5.1M16.5 12h5.1" />
          <path d="m5.2 5.2 3.1 3.1M15.7 15.7l3.1 3.1M18.8 5.2l-3.1 3.1M8.3 15.7l-3.1 3.1" />
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'hull' && (
        <>
          <path d="M12 2.7 20 6v6.1c0 4.7-3.4 7.8-8 9.2-4.6-1.4-8-4.5-8-9.2V6l8-3.3z" />
          <path d="M8.4 12.2h7.2M12 8.6v7.2" opacity="0.55" />
        </>
      )}
      {name === 'repair' && (
        <>
          <path d="M14.7 4.4a4.6 4.6 0 0 0-6 6L4 15.1a2 2 0 0 0 2.8 2.8l4.7-4.7a4.6 4.6 0 0 0 6-6l-2.3 2.3-2.6-.4-.4-2.6 2.5-2.1z" />
          <path d="M4.7 20.5h.1" />
        </>
      )}
      {name === 'orb' && (
        <>
          <circle cx="12" cy="12" r="3.1" />
          <ellipse cx="12" cy="12" rx="9" ry="4.4" transform="rotate(-26 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.4" transform="rotate(34 12 12)" opacity="0.55" />
        </>
      )}
      {name === 'orb-damage' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.2v4M12 17.8v4M2.2 12h4M17.8 12h4M5.1 5.1l2.8 2.8M16.1 16.1l2.8 2.8M18.9 5.1l-2.8 2.8M7.9 16.1l-2.8 2.8" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'orb-speed' && (
        <>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19.8 8.2a8.5 8.5 0 0 0-14.7-1M4.2 15.8a8.5 8.5 0 0 0 14.7 1" />
          <path d="M20.8 3.6v4.9h-4.9M3.2 20.4v-4.9h4.9" />
        </>
      )}
      {name === 'training' && (
        <>
          <path d="M12 3.2v4M12 16.8v4M3.2 12h4M16.8 12h4" />
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'blueprint' && (
        <>
          <path d="M5 3.2h10l4 4v13.6H5V3.2z" />
          <path d="M15 3.2v4h4M8 11h8M8 14.5h8M8 18h5" />
        </>
      )}
      {name === 'magnet' && (
        <>
          <path d="M4 4.2h4.8v7.3a3.2 3.2 0 0 0 6.4 0V4.2H20v7.3a8 8 0 0 1-16 0V4.2z" />
          <path d="M8.8 15.8h6.4M4 8.2h4.8M15.2 8.2H20" opacity="0.55" />
        </>
      )}
      {name === 'turret' && (
        <>
          <path d="M12 3.2 19 7v10l-7 3.8L5 17V7l7-3.8z" />
          <path d="M12 7.8v8.4M8.6 14.8h6.8" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'workshop' && (
        <>
          <path d="M14.8 5.6a4.2 4.2 0 0 0-5.3 5.3l-5.3 5.3a1.8 1.8 0 0 0 2.6 2.6l5.3-5.3a4.2 4.2 0 0 0 5.3-5.3l-2.2 2.2-2.4-.4-.4-2.4 2.4-2z" />
        </>
      )}
      {name === 'vault' && (
        <>
          <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.8" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 8.5V6.9M12 17.1v-1.6M8.5 12H6.9M17.1 12h-1.6" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'pause' && (
        <>
          <rect x="6.1" y="4.2" width="3.8" height="15.6" rx="1.6" fill="currentColor" stroke="none" />
          <rect x="14.1" y="4.2" width="3.8" height="15.6" rx="1.6" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'play' && <path d="M7.3 4.3 19.4 12 7.3 19.7V4.3z" />}
      {name === 'fast' && (
        <>
          <path d="M3.6 5.2 10.9 12l-7.3 6.8V5.2z" fill="currentColor" />
          <path d="M12.8 5.2 20.1 12l-7.3 6.8V5.2z" fill="currentColor" />
        </>
      )}
      {name === 'skull' && (
        <path d="M12 2.7c-4.7 0-8 3.2-8 7.5 0 2.4 1.1 4.2 2.7 5.4v2.2c0 .8.6 1.5 1.5 1.5h1.1v-2.8h1.8v2.8h1.8v-2.8h1.8v2.8h1.1c.9 0 1.5-.7 1.5-1.5v-2.2c1.6-1.2 2.7-3 2.7-5.4 0-4.3-3.3-7.5-8-7.5zm-3.1 6.1a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zm6.2 0a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z" />
      )}
      {name === 'trophy' && (
        <>
          <path d="M8 4h8v4.2a4 4 0 0 1-8 0V4z" />
          <path d="M8 5.2H4.8v1.5A3.2 3.2 0 0 0 8 9.9M16 5.2h3.2v1.5A3.2 3.2 0 0 1 16 9.9M12 12.2v4.1M8.7 20.2h6.6M9.6 16.3h4.8v3.9H9.6z" />
        </>
      )}
      {name === 'close' && <path d="M6 6l12 12M18 6 6 18" />}
      {name === 'check' && <path d="M4.5 12.4 9.3 17l10.2-10.2" />}
      {name === 'lock' && (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2.3" />
          <path d="M8.2 10V7.5a3.8 3.8 0 0 1 7.6 0V10M12 14v2.4" />
        </>
      )}
      {name === 'burn' && (
        <>
          <path d="M12.4 2.5c1.1 3.3-2.6 4.6-2.6 7.1 0 1.4.9 2.4 2 2.8-.3-2 .8-3.4 2.1-4.6 2.3 2.1 3.7 4.3 3.7 6.6a5.6 5.6 0 0 1-11.2 0c0-4.2 2.8-7.5 6-11.9z" />
          <path d="M12.2 13.2c1.7 1.6 2.4 3 2.4 4.3a2.5 2.5 0 0 1-5 0c0-1.4.8-2.8 2.6-4.3z" opacity="0.5" />
        </>
      )}
      {name === 'slow' && (
        <>
          <path d="M12 2.2v19.6M3.5 7.1l17 9.8M20.5 7.1l-17 9.8" />
          <path d="m9.4 4 2.6 2.3L14.6 4M9.4 20l2.6-2.3 2.6 2.3M4.4 9.6l3.4-.4-1.5-3.1M19.6 14.4l-3.4.4 1.5 3.1M4.4 14.4l3.4.4-1.5 3.1M19.6 9.6l-3.4-.4 1.5-3.1" />
        </>
      )}
      {name === 'chain' && (
        <>
          <path d="M9.2 14.8 7 17a3.4 3.4 0 0 1-4.8-4.8l3.6-3.6a3.4 3.4 0 0 1 4.8 0" />
          <path d="m14.8 9.2 2.2-2.2a3.4 3.4 0 0 1 4.8 4.8l-3.6 3.6a3.4 3.4 0 0 1-4.8 0" />
          <path d="m8.5 15.5 7-7" />
        </>
      )}
      {name === 'sparkle' && <path d="M12 2.3l2.2 6 6 2.2-6 2.2-2.2 6-2.2-6-6-2.2 6-2.2 2.2-6z" />}
      {name === 'rocket' && (
        <>
          <path d="M14.7 4.2c2.2-1.4 5.1-1.1 5.1-1.1s.3 2.9-1.1 5.1c-1.2 1.9-4.9 5-4.9 5l-4.1-4.1s3.1-3.7 5-4.9z" />
          <path d="m9.7 9.1-4.2.8-2.3 3.2 4.1.2M14.9 14.3l-.8 4.2-3.2 2.3-.2-4.1" />
          <circle cx="15.8" cy="8.2" r="1.4" />
        </>
      )}
      {name === 'pass' && (
        <>
          <path d="M3.2 7.2h17.6v4.1a2.7 2.7 0 0 0 0 5.4v4.1H3.2v-4.1a2.7 2.7 0 0 0 0-5.4V7.2z" />
          <path d="M14.8 7.2v13.6" strokeDasharray="2.2 2.6" />
        </>
      )}
      {(name === 'shield' || name === 'armor') && (
        <>
          <path d="M12 2.8 20 6v6.2c0 4.7-3.4 7.8-8 9-4.6-1.2-8-4.3-8-9V6l8-3.2z" />
          <path d="m8.4 12.2 2.4 2.4 4.8-4.9" />
        </>
      )}
      {name === 'core' && (
        <>
          <circle cx="12" cy="12" r="8.6" opacity="0.5" />
          <circle cx="12" cy="12" r="4.1" />
          <path d="m12 2.9 2.4 4.2h-4.8L12 2.9zM12 21.1l-2.4-4.2h4.8L12 21.1z" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'wave' && (
        <>
          <path d="M2.5 9.2c2.4-3.2 4.8-3.2 7.2 0s4.8 3.2 7.2 0 4.6-3.2 4.6-3.2" opacity="0.55" />
          <path d="M2.5 15c2.4-3.2 4.8-3.2 7.2 0s4.8 3.2 7.2 0 4.6-3.2 4.6-3.2" />
        </>
      )}
      {name === 'timer' && (
        <>
          <circle cx="12" cy="13" r="8.2" />
          <path d="M12 8.8V13l2.8 1.7M9.2 2.8h5.6" />
        </>
      )}
      {name === 'arrow-right' && <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" />}
      {name === 'plus' && <path d="M12 5v14M5 12h14" />}
      {name === 'star' && <path d="M12 2.6 15 8.9l6.9 1-5 4.8 1.2 6.9-6.1-3.3-6.1 3.3 1.2-6.9-5-4.8 6.9-1L12 2.6z" />}
    </svg>
  );
}

export function MonolithMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 5 55 18v28L32 59 9 46V18L32 5z"
        fill="#0e1018"
        stroke="#00f0ff"
        strokeWidth="3.5"
      />
      <path
        d="M32 11.5 49.5 21.5v21L32 52.5 14.5 42.5v-21L32 11.5z"
        fill="#141726"
        stroke="#ff0055"
        strokeOpacity="0.65"
        strokeWidth="1.6"
      />
      <path
        d="M21 43V21l11 14.5L43 21v22"
        fill="none"
        stroke="#f7f7ff"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 8.5v5M32 50.5v5" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
