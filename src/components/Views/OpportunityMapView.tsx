import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Columns,
  FileSearch,
  List,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  ScatterChart,
  Search,
  Sliders,
  Sparkles,
  Wrench,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { isStaffRole } from '../../services/accessControl';
import type {
  ComplaintRecord,
  FeedbackItem,
  InterventionItem,
  PriorityTier,
  PriorityWeights,
  ScoredOpportunity,
  UserAccount,
} from '../../types/needmap';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  normalizeWeights,
  UNKNOWN_FACTOR_NEUTRAL_SCORE,
} from '../../utils/priorityEngine';
import { LeafletMapCanvas, type MapMarkerItem } from '../Common/LeafletMapCanvas';
import { PriorityMatrixLegend } from '../Common/PriorityMatrixLegend';

interface OpportunityMapViewProps {
  opportunities: ScoredOpportunity[];
  complaints: ComplaintRecord[];
  feedback: FeedbackItem[];
  interventions: InterventionItem[];
  weights: PriorityWeights;
  onUpdateWeights: (weights: PriorityWeights) => void;
  selectedOpportunityId: string | null;
  onSelectOpportunity: (id: string | null) => void;
  onNavigateToComplaint: (id: string) => void;
  globalSearch: string;
  onOpenEvidenceForOpportunity: (id: string) => void;
  onOpenInterventionsForOpportunity: (id: string) => void;
  onNavigateToFeedback: (feedbackId: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  activeAccount: UserAccount;
  onOverrideOpportunityPriority: (params: {
    opportunityId: string;
    tier: PriorityTier;
    reason: string;
  }) => { ok: boolean; error?: string };
}

type ViewLayoutMode = 'map_and_list' | 'list_only' | 'matrix';
type LayerFilter = 'ALL' | 'CLUSTERS_ONLY' | 'COMPLAINTS_ONLY';

export const OpportunityMapView: React.FC<OpportunityMapViewProps> = ({
  opportunities,
  complaints,
  feedback,
  interventions,
  weights,
  onUpdateWeights,
  selectedOpportunityId,
  onSelectOpportunity,
  onNavigateToComplaint,
  globalSearch,
  onOpenEvidenceForOpportunity,
  onOpenInterventionsForOpportunity,
  onNavigateToFeedback,
  onRunAnalysis,
  isAnalyzing,
  activeAccount,
  onOverrideOpportunityPriority,
}) => {
  const { tr, tCategory, tStatus, tPriority } = useI18n();
  const canOverride = isStaffRole(activeAccount.role);

  const [viewMode, setViewMode] = useState<ViewLayoutMode>('map_and_list');
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('ALL');
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | PriorityTier>('ALL');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Staff override form state
  const [overrideTier, setOverrideTier] = useState<PriorityTier>('High');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);

  const feedbackMap = useMemo(() => {
    const map = new Map<string, FeedbackItem>();
    feedback.forEach((f) => map.set(f.id, f));
    return map;
  }, [feedback]);

  const effectiveWeights = useMemo(() => normalizeWeights(weights), [weights]);
  const searchTerm = (localSearch || globalSearch).trim().toLowerCase();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (tierFilter !== 'ALL' && opp.priority.tier !== tierFilter) return false;
      if (searchTerm) {
        const hit =
          opp.title.toLowerCase().includes(searchTerm) ||
          opp.problemDescription.toLowerCase().includes(searchTerm) ||
          opp.category.toLowerCase().includes(searchTerm) ||
          opp.id.toLowerCase().includes(searchTerm);
        if (!hit) return false;
      }
      return true;
    });
  }, [opportunities, tierFilter, searchTerm]);

  const filteredComplaintsForMap = useMemo(() => {
    return complaints.filter((c) => {
      if (tierFilter !== 'ALL' && c.priorityTier !== tierFilter) return false;
      if (searchTerm) {
        const hit =
          c.title.toLowerCase().includes(searchTerm) ||
          c.location.address.toLowerCase().includes(searchTerm) ||
          c.id.toLowerCase().includes(searchTerm);
        if (!hit) return false;
      }
      return true;
    });
  }, [complaints, tierFilter, searchTerm]);

  // Build real geo-markers (ONLY for items with true coordinates : never inventing pins!)
  const mapMarkers = useMemo<MapMarkerItem[]>(() => {
    const list: MapMarkerItem[] = [];

    if (layerFilter === 'ALL' || layerFilter === 'CLUSTERS_ONLY') {
      for (const opp of filteredOpportunities) {
        if (opp.coordinates && Number.isFinite(opp.coordinates.lat)) {
          list.push({
            id: opp.id,
            kind: 'opportunity',
            lat: opp.coordinates.lat,
            lng: opp.coordinates.lng,
            title: opp.title,
            categoryLabel: tCategory(opp.category),
            statusLabel: `${tPriority(opp.priority.tier)} (${opp.priority.totalScore}/100)`,
            priorityTier: opp.priority.tier,
            locationLabel: opp.coordinates.locationLabel,
            reportCount: opp.priority.validSupportCount,
          });
        }
      }
    }

    if (layerFilter === 'ALL' || layerFilter === 'COMPLAINTS_ONLY') {
      for (const cmp of filteredComplaintsForMap) {
        if (
          cmp.location.hasCoordinates &&
          typeof cmp.location.lat === 'number' &&
          typeof cmp.location.lng === 'number'
        ) {
          list.push({
            id: cmp.id,
            kind: 'complaint',
            lat: cmp.location.lat,
            lng: cmp.location.lng,
            title: cmp.title,
            categoryLabel: tCategory(cmp.category),
            statusLabel: tStatus(cmp.status),
            priorityTier: cmp.priorityTier,
            locationLabel: cmp.location.address,
          });
        }
      }
    }

    return list;
  }, [
    layerFilter,
    filteredOpportunities,
    filteredComplaintsForMap,
    tCategory,
    tPriority,
    tStatus,
  ]);

  const unmappedCount = useMemo(() => {
    const unmappedOpps = filteredOpportunities.filter((o) => !o.coordinates).length;
    const unmappedCmps = filteredComplaintsForMap.filter((c) => !c.location.hasCoordinates)
      .length;
    return unmappedOpps + unmappedCmps;
  }, [filteredOpportunities, filteredComplaintsForMap]);

  const activeOpportunity = useMemo(
    () =>
      opportunities.find((o) => o.id === selectedOpportunityId) ||
      filteredOpportunities[0] ||
      null,
    [opportunities, selectedOpportunityId, filteredOpportunities]
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const comparedOpportunities = useMemo(
    () => opportunities.filter((o) => compareIds.includes(o.id)),
    [opportunities, compareIds]
  );

  return (
    <div className="space-y-6">
      {/* Header & View Mode Toggle */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {tr(
              'Interactive Issue & Opportunity Map',
              'உண்மையான வரைபடம் & முன்னுரிமைத் தொகுப்புகள்'
            )}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {tr(
              'Inspect geo-tagged citizen complaints and recurring AI opportunity clusters on the real map, review transparent priority scores, and plan targeted fixes.',
              'புவிசார் புகார்கள் மற்றும் தொடர் சமூகத் தேவைகளை உண்மையான வரைபடத்தில் பார்வையிட்டு, வெளிப்படையான முன்னுரிமை மதிப்பெண்களை ஆய்வு செய்யுங்கள்.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Map / List / Optional Matrix Switcher */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('map_and_list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'map_and_list'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5 text-teal-600" />
              {tr('Map + List', 'வரைபடம் + பட்டியல்')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list_only')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'list_only'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              {tr('List Only', 'பட்டியல் மட்டும்')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ScatterChart className="h-3.5 w-3.5 text-indigo-600" />
              {tr('Score Matrix', 'புள்ளி அணி')}
            </button>
          </div>

          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Columns className="h-3.5 w-3.5" />
              {tr('Compare', 'ஒப்பிடு')} ({compareIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowWeightEditor((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <Sliders className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
            {tr('Scoring Weights', 'மதிப்பெண் எடைகள்')}
          </button>
        </div>
      </div>

      {/* Optional Deterministic Weight Controls */}
      {showWeightEditor && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {tr('Deterministic Priority Formula: ', 'துல்லிய முன்னுரிமைச் சூத்திரம்: ')}
            </span>
            <span className="font-mono tabular-nums">
              (Freq × {effectiveWeights.frequency.toFixed(2)}) + (Impact ×{' '}
              {effectiveWeights.impact.toFixed(2)}) + (Urgency ×{' '}
              {effectiveWeights.urgency.toFixed(2)}) + (Confidence ×{' '}
              {effectiveWeights.confidence.toFixed(2)})
            </span>{' '}
            · Unknown = {UNKNOWN_FACTOR_NEUTRAL_SCORE}/100
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { key: 'frequency', label: tr('Frequency', 'அடிக்கடி நிகழ்தல்') },
                { key: 'impact', label: tr('Reported Impact', 'பாதிப்பு அளவு') },
                { key: 'urgency', label: tr('Urgency', 'அவசர நிலை') },
                { key: 'confidence', label: tr('Evidence Confidence', 'ஆதார நம்பகத்தன்மை') },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                    {Math.round(effectiveWeights[key] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[key]}
                  onChange={(e) =>
                    onUpdateWeights({
                      ...weights,
                      [key]: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-teal-700"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onUpdateWeights({ ...DEFAULT_PRIORITY_WEIGHTS })}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {tr('Reset Defaults (30/30/25/15)', 'இயல்புநிலைக்கு மீட்டமை')}
            </button>
          </div>
        </section>
      )}

      {/* Search & Map Layer Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={tr('Search map & clusters...', 'தேவைகள் மற்றும் இடங்களைத் தேடுக...')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'ALL' | PriorityTier)}
            aria-label="Filter priority"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{tr('All Priority Levels', 'அனைத்து முன்னுரிமைகள்')}</option>
            <option value="High">{tPriority('High')}</option>
            <option value="Medium">{tPriority('Medium')}</option>
            <option value="Low">{tPriority('Low')}</option>
          </select>

          {viewMode === 'map_and_list' && (
            <select
              value={layerFilter}
              onChange={(e) => setLayerFilter(e.target.value as LayerFilter)}
              aria-label="Map pin layer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">
                {tr('Map Pins: Clusters + Complaints', 'வரைபடம்: தொகுப்புகள் + புகார்கள்')}
              </option>
              <option value="CLUSTERS_ONLY">
                {tr('Map Pins: AI Opportunity Clusters Only', 'AI தொகுப்புகள் மட்டும்')}
              </option>
              <option value="COMPLAINTS_ONLY">
                {tr('Map Pins: Citizen Complaints Only', 'குடிமக்கள் புகார்கள் மட்டும்')}
              </option>
            </select>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {mapMarkers.length} {tr('mapped pins', 'வரைபட இடங்கள்')}
          {unmappedCount > 0 &&
            ` · ${unmappedCount} ${tr('unmapped (address/online only)', 'வரைபடமில்லாப் பதிவுகள்')}`}
        </div>
      </div>

      {/* Priority Matrix Legend & Color Explanations */}
      <PriorityMatrixLegend compact={true} />

      {/* REAL INTERACTIVE LEAFLET MAP */}
      {viewMode === 'map_and_list' && (
        <section className="space-y-2">
          <LeafletMapCanvas
            mode="explorer"
            markers={mapMarkers}
            selectedMarkerId={activeOpportunity?.id || null}
            onSelectMarker={(id, kind) => {
              if (kind === 'opportunity') {
                onSelectOpportunity(id);
              } else {
                onNavigateToComplaint(id);
              }
            }}
            heightClassName="h-[390px]"
          />
          <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-teal-700" />
              {tr('Square Badge = Recurring AI Cluster (count inside)', 'சதுரம் = தொடர் AI தொகுப்பு')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-rose-600" />
              {tr('Circle (!) = Individual Service Complaint (click to open)', 'வட்டம் (!) = தனிப்பட்ட புகார்')}
            </span>
          </div>
        </section>
      )}

      {/* OPTIONAL 2D ANALYTICAL SCORE MATRIX */}
      {viewMode === 'matrix' && opportunities.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {tr('2D Analytical Priority Matrix (Urgency vs Impact)', '2D முன்னுரிமை புள்ளி அணி')}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <svg viewBox="0 0 760 250" className="w-full min-w-[540px] h-60">
              <rect
                x="60"
                y="20"
                width="670"
                height="195"
                fill="none"
                stroke="#94a3b8"
                strokeOpacity="0.4"
                rx="6"
              />
              <line x1="60" y1="117" x2="730" y2="117" stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity="0.5" />
              <line x1="395" y1="20" x2="395" y2="215" stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity="0.5" />
              {filteredOpportunities.map((opp, idx) => {
                const xComp = Math.round(
                  opp.priority.frequencyScore * 0.55 + opp.priority.urgencyScore * 0.45
                );
                const cx = Math.max(80, Math.min(710, 60 + (xComp / 100) * 670 + ((idx % 3) - 1) * 8));
                const cy = Math.max(
                  38,
                  Math.min(198, 215 - (opp.priority.impactScore / 100) * 195)
                );
                const r = Math.min(18, 9 + opp.priority.validSupportCount * 1.4);
                const fill =
                  opp.priority.tier === 'High'
                    ? '#0f766e'
                    : opp.priority.tier === 'Medium'
                    ? '#4f46e5'
                    : '#64748b';
                return (
                  <g
                    key={opp.id}
                    onClick={() => onSelectOpportunity(opp.id)}
                    className="cursor-pointer"
                  >
                    <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity="0.9" />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {opp.id.replace('OPP-', '')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
      )}

      {/* Opportunity Clusters Master-Detail List */}
      {opportunities.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {tr('No AI Opportunity Clusters Yet', 'இன்னும் AI தேவைத் தொகுப்புகள் உருவாக்கப்படவில்லை')}
          </p>
          <button
            type="button"
            onClick={onRunAnalysis}
            disabled={isAnalyzing || feedback.length === 0}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {tr('Analyze Feedback Now', 'இப்போது AI பகுப்பாய்வு செய்')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left: Ranked Cards */}
          <div className="space-y-3 lg:col-span-7">
            {filteredOpportunities.map((opp) => {
              const isSelected = activeOpportunity?.id === opp.id;
              const isCompared = compareIds.includes(opp.id);

              return (
                <div
                  key={opp.id}
                  onClick={() => onSelectOpportunity(opp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOpportunity(opp.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-5 transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-white dark:border-teal-500 dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {opp.id}
                        </span>
                        <span>·</span>
                        <span>{tCategory(opp.category)}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {opp.priority.validSupportCount} {tr('reports', 'பதிவுகள்')}
                        </span>
                        {opp.priority.isOverridden && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {tr('Staff Priority Override', 'அதிகாரி முன்னுரிமை மாற்றம்')}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-white">
                        {opp.title}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                        {opp.priority.totalScore}
                      </div>
                      <div className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                        {tPriority(opp.priority.tier)}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {opp.problemDescription}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>
                        {opp.coordinates
                          ? opp.coordinates.locationLabel
                          : tr('Unmapped (Online / Admin Scope)', 'வரைபடமில்லா நிர்வாகப் பிரிவு')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompare(opp.id);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        isCompared
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isCompared ? tr('Comparing', 'ஒப்பீட்டில்') : tr('Compare', 'ஒப்பிடு')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Opportunity Score & Evidence Inspector */}
          <aside className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-5 lg:sticky lg:top-20 dark:border-slate-800 dark:bg-slate-900">
            {activeOpportunity && (
              <>
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center justify-between font-mono text-xs text-slate-500">
                    <span>
                      {activeOpportunity.id} · {tCategory(activeOpportunity.category)}
                    </span>
                    <span>
                      {activeOpportunity.analysisOrigin === 'live_ai'
                        ? tr('Live Gemini AI', 'நேரடி Gemini AI')
                        : tr('Sample Demo', 'மாதிரி தரவு')}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {activeOpportunity.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeOpportunity.problemDescription}
                  </p>
                  <div className="mt-3 rounded-lg bg-teal-50/70 p-2.5 text-xs font-medium text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                    {activeOpportunity.priority.recommendedNextAction}
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {tr('Priority Breakdown', 'முன்னுரிமை மதிப்பெண் விவரம்')}
                    </span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      {activeOpportunity.priority.totalScore}/100
                      {activeOpportunity.priority.isOverridden &&
                        ` (Calc: ${activeOpportunity.priority.calculatedScore})`}
                    </span>
                  </div>

                  {[
                    {
                      label: tr('Frequency', 'அடிக்கடி நிகழ்தல்'),
                      val: activeOpportunity.priority.frequencyScore,
                    },
                    {
                      label: tr('User-Reported Impact', 'பாதிப்பு அளவு'),
                      val: activeOpportunity.priority.impactScore,
                    },
                    {
                      label: tr('Urgency', 'அவசர நிலை'),
                      val: activeOpportunity.priority.urgencyScore,
                    },
                    {
                      label: tr('Evidence Confidence', 'ஆதார நம்பகத்தன்மை'),
                      val: activeOpportunity.priority.confidenceScore,
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>{row.label}</span>
                        <span className="font-mono tabular-nums">{row.val}/100</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{ width: `${row.val}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    {activeOpportunity.priority.explanation}
                  </p>
                </div>

                {/* Staff Priority Override Control */}
                {canOverride && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const res = onOverrideOpportunityPriority({
                        opportunityId: activeOpportunity.id,
                        tier: overrideTier,
                        reason: overrideReason,
                      });
                      setOverrideMsg(
                        res.ok
                          ? tr('Official priority updated.', 'முன்னுரிமை மாற்றப்பட்டது.')
                          : res.error || 'Override failed.'
                      );
                      if (res.ok) setOverrideReason('');
                    }}
                    className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {tr('Admin Official Priority Override', 'அதிகாரப்பூர்வ முன்னுரிமை மாற்றம்')}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={overrideTier}
                        onChange={(e) => setOverrideTier(e.target.value as PriorityTier)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="High">{tPriority('High')}</option>
                        <option value="Medium">{tPriority('Medium')}</option>
                        <option value="Low">{tPriority('Low')}</option>
                      </select>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder={tr('Mandatory reason...', 'காரணம் உள்ளிடவும்...')}
                        className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded bg-slate-900 py-1.5 font-semibold text-white hover:bg-slate-800 dark:bg-teal-600"
                    >
                      {tr('Save Priority Override', 'மாற்றத்தைச் சேமி')}
                    </button>
                    {overrideMsg && (
                      <p className="text-[11px] text-teal-700 dark:text-teal-300">{overrideMsg}</p>
                    )}
                  </form>
                )}

                {/* Supporting Feedback Links */}
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {tr('Supporting Feedback', 'ஆதாரக் கருத்துகள்')} (
                    {activeOpportunity.relatedFeedbackIds.length})
                  </div>
                  <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
                    {activeOpportunity.relatedFeedbackIds.slice(0, 4).map((fbId) => {
                      const fb = feedbackMap.get(fbId);
                      if (!fb) return null;
                      return (
                        <button
                          key={fbId}
                          type="button"
                          onClick={() => onNavigateToFeedback(fbId)}
                          className="block w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                            {fb.id}:{' '}
                          </span>
                          <span className="line-clamp-2 text-slate-700 dark:text-slate-200">
                            {fb.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cross-View Buttons */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenEvidenceForOpportunity(activeOpportunity.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <FileSearch className="h-3.5 w-3.5 text-indigo-600" />
                    {tr('Verify Quotes', 'ஆதாரம் சரிபார்')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInterventionsForOpportunity(activeOpportunity.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    {tr('Plan Actions', 'தீர்வுத் திட்டம்')} (
                    {interventions.filter((i) => i.opportunityId === activeOpportunity.id).length})
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Compare Modal */}
      {isCompareModalOpen && comparedOpportunities.length >= 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {tr('Side-by-Side Opportunity Comparison', 'தேவைத் தொகுப்பு ஒப்பீடு')}
              </h2>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-4 text-slate-500">{tr('Dimension', 'கூறு')}</th>
                    {comparedOpportunities.map((o) => (
                      <th key={o.id} className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        {o.id}: {o.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-600 dark:text-slate-400">
                      {tr('Priority Score', 'முன்னுரிமை மதிப்பெண்')}
                    </td>
                    {comparedOpportunities.map((o) => (
                      <td key={o.id} className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                        {o.priority.totalScore}/100 ({tPriority(o.priority.tier)})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-600 dark:text-slate-400">
                      {tr('Verified Reports', 'சரிபார்க்கப்பட்ட பதிவுகள்')}
                    </td>
                    {comparedOpportunities.map((o) => (
                      <td key={o.id} className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">
                        {o.priority.validSupportCount}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-600 dark:text-slate-400">
                      {tr('Recommended Action', 'அடுத்த நடவடிக்கை')}
                    </td>
                    {comparedOpportunities.map((o) => (
                      <td key={o.id} className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {o.priority.recommendedNextAction}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
