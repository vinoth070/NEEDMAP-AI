import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

const defaultProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const Activity: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

export const AlertCircle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const AlertTriangle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const ArrowLeft: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const ArrowRight: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const ArrowUpDown: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </svg>
);

export const ArrowUpRight: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

export const BarChart2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const BarChart3 = BarChart2;

export const Bell: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const Bot: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8.01" y2="16" />
    <line x1="16" y1="16" x2="16.01" y2="16" />
  </svg>
);

export const Briefcase: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const Building: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="12" />
    <line x1="15" y1="22" x2="15" y2="12" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="8" y1="6" x2="10" y2="6" />
    <line x1="14" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
  </svg>
);

export const Building2 = Building;

export const Calendar: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const Check: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CheckCheck: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="18 6 9 15 4 10" />
    <polyline points="22 10 13 19 10 16" />
  </svg>
);

export const CheckCircle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const CheckCircle2 = CheckCircle;

export const ChevronDown: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronLeft: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRight: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ChevronUp: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export const ClipboardList: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

export const Clock: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const Columns: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

export const Command: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

export const Compass: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const Copy: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const Cpu: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

export const Crosshair: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </svg>
);

export const Database: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export const Download: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const Edit3: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const Edit = Edit3;

export const ExternalLink: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const Eye: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOff: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const FileCheck: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

export const FileCode2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 18 3-3-3-3" />
    <path d="m5 12-3 3 3 3" />
  </svg>
);

export const FileSearch: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="11.5" cy="14.5" r="2.5" />
    <path d="m13.3 16.3 2.2 2.2" />
  </svg>
);

export const FileSpreadsheet: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </svg>
);

export const FileText: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const FileUp: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 12v6" />
    <path d="m15 15-3-3-3 3" />
  </svg>
);

export const FileWarning: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const Filter: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const FlaskConical: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
    <path d="M8.5 2h7" />
    <path d="M7 16h10" />
  </svg>
);

export const FolderKanban: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M8 10v4" />
    <path d="M12 10v2" />
    <path d="M16 10v6" />
  </svg>
);

export const Globe: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const HardHat: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
    <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
  </svg>
);

export const HelpCircle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const Inbox: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const Info: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const KeyRound: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

export const Keyboard: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="6" y1="8" x2="6.01" y2="8" />
    <line x1="10" y1="8" x2="10.01" y2="8" />
    <line x1="14" y1="8" x2="14.01" y2="8" />
    <line x1="18" y1="8" x2="18.01" y2="8" />
    <line x1="6" y1="12" x2="6.01" y2="12" />
    <line x1="18" y1="12" x2="18.01" y2="12" />
    <line x1="10" y1="16" x2="14" y2="16" />
  </svg>
);

export const Layers: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const LayoutDashboard: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

export const List: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

export const Loader2: React.FC<IconProps> = ({ className = 'w-4 h-4 animate-spin', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export const Lock: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const LogOut: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const Mail: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const Map: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

export const MapIcon = Map;

export const MapPin: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const Maximize2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export const Megaphone: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="m3 11 18-5v12L3 13v-2z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

export const Menu: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const MessageCircle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const MessageSquare: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const MessageSquarePlus: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
);

export const Minimize2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export const Moon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const Paperclip: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export const Phone: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const Play: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const Plus: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Printer: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const RefreshCw: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const RotateCcw: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export const ScatterChart: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="18.5" cy="5.5" r=".5" fill="currentColor" />
    <circle cx="11.5" cy="11.5" r=".5" fill="currentColor" />
    <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="14.5" r=".5" fill="currentColor" />
    <line x1="3" y1="3" x2="3" y2="21" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

export const Search: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const Send: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const Share2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const Shield: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const ShieldAlert: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const ShieldCheck = Shield;

export const Sliders: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

// Neutral badge icon representing analytical synthesis (without prohibited decorative sparkles)
export const Sparkles: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeDasharray="2 2" />
  </svg>
);

export const Star: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const Sun: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const Target: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const ThumbsDown: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

export const ThumbsUp: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4.33A2.31 2.31 0 0 1 2 20v-7a2.31 2.31 0 0 1 2.33-2H7" />
  </svg>
);

export const Trash2: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const TrendingUp: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const Upload: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const User: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const UserCheck: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);

export const Users: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Wrench: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const X: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const XCircle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const Circle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 18, ...props }) => (
  <svg width={size} height={size} className={className} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

