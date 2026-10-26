import { sanitizeComplaintForViewer } from '../services/accessControl';
import type {
  ComplaintRecord,
  Department,
  FeedbackItem,
  ImpactMetricTracker,
  InterventionItem,
  PriorityWeights,
  ScoredOpportunity,
  UserAccount,
  WorkspaceState,
} from '../types/needmap';

function escapeCsvCell(val: string | number | boolean): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFeedbackToCsv(
  feedback: FeedbackItem[],
  analyzedIds: Set<string>,
  opportunities: ScoredOpportunity[],
  workspaceName: string
): void {
  const oppByFeedbackId = new Map<string, string[]>();
  for (const opp of opportunities) {
    for (const fbId of opp.relatedFeedbackIds) {
      const list = oppByFeedbackId.get(fbId) || [];
      list.push(`${opp.id}: ${opp.title}`);
      oppByFeedbackId.set(fbId, list);
    }
  }

  const headers = [
    'id',
    'feedback',
    'category',
    'date',
    'source',
    'reported_impact',
    'analysis_status',
    'linked_opportunities',
    'data_type',
  ];

  const rows = feedback.map((f) => {
    const status = analyzedIds.has(f.id) ? 'Analyzed' : 'Pending Analysis';
    const linked = (oppByFeedbackId.get(f.id) || []).join(' | ');
    const dataType = f.isDemo ? 'Sample Demo Data' : 'User Data';
    return [
      escapeCsvCell(f.id),
      escapeCsvCell(f.text),
      escapeCsvCell(f.category),
      escapeCsvCell(f.date),
      escapeCsvCell(f.source),
      escapeCsvCell(f.reportedImpact),
      escapeCsvCell(status),
      escapeCsvCell(linked),
      escapeCsvCell(dataType),
    ].join(',');
  });

  const slug =
    workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'needmap';

  triggerBlobDownload(
    [headers.join(','), ...rows].join('\n'),
    `${slug}-feedback-${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportComplaintsToCsv(params: {
  complaints: ComplaintRecord[];
  departments: Department[];
  viewer: UserAccount;
  workspaceName: string;
}): void {
  const deptMap = new Map<string, string>();
  params.departments.forEach((d) => deptMap.set(d.id, d.name));

  const headers = [
    'reference_id',
    'title',
    'category',
    'status',
    'priority_tier',
    'priority_overridden',
    'assigned_department',
    'location_address',
    'area_zone',
    'has_exact_coordinates',
    'lat',
    'lng',
    'reporter_display',
    'created_at',
    'expected_resolution_date',
    'data_origin',
  ];

  const rows = params.complaints.map((raw) => {
    const safe = sanitizeComplaintForViewer(params.viewer, raw);
    return [
      escapeCsvCell(safe.id),
      escapeCsvCell(safe.title),
      escapeCsvCell(safe.category),
      escapeCsvCell(safe.status),
      escapeCsvCell(safe.priorityOverride ? safe.priorityOverride.tier : safe.priorityTier),
      escapeCsvCell(Boolean(safe.priorityOverride)),
      escapeCsvCell(deptMap.get(safe.assignedDepartmentId) || safe.assignedDepartmentId),
      escapeCsvCell(safe.location.address),
      escapeCsvCell(safe.location.areaZone || ''),
      escapeCsvCell(safe.location.hasCoordinates),
      escapeCsvCell(safe.location.hasCoordinates && safe.location.lat !== undefined ? safe.location.lat : ''),
      escapeCsvCell(safe.location.hasCoordinates && safe.location.lng !== undefined ? safe.location.lng : ''),
      escapeCsvCell(safe.reporterDisplayName),
      escapeCsvCell(safe.createdAt),
      escapeCsvCell(safe.expectedResolutionDate || ''),
      escapeCsvCell(safe.isDemo ? 'Sample Demo Record' : 'User Submitted'),
    ].join(',');
  });

  const slug =
    params.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'needmap';

  triggerBlobDownload(
    [headers.join(','), ...rows].join('\n'),
    `${slug}-complaints-${new Date().toISOString().slice(0, 10)}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportFullWorkspaceBackupJson(workspace: WorkspaceState, viewer: UserAccount): void {
  const sanitizedComplaints = workspace.complaints.map((c) =>
    sanitizeComplaintForViewer(viewer, c)
  );

  const payload = {
    application: 'NEEDMAP AI',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    exportedByRole: viewer.role,
    workspaceName: workspace.workspaceName,
    workspaceContext: workspace.workspaceContext,
    weights: workspace.weights,
    departments: workspace.departments,
    routingRules: workspace.routingRules,
    complaints: sanitizedComplaints,
    feedback: workspace.feedback,
    opportunities: workspace.opportunities,
    interventions: workspace.interventions,
    impactTrackers: workspace.impactTrackers,
    vacancies: workspace.vacancies,
  };

  const slug =
    workspace.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'needmap';

  triggerBlobDownload(
    JSON.stringify(payload, null, 2),
    `${slug}-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json;charset=utf-8;'
  );
}

export function exportAnalysisToJson(params: {
  workspaceName: string;
  workspaceContext: string;
  analysisOrigin: string | null;
  lastAnalyzedAt: string | null;
  weights: PriorityWeights;
  feedbackCount: number;
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  impactTrackers: ImpactMetricTracker[];
  complaintsCount?: number;
}): void {
  const payload = {
    application: 'NEEDMAP AI',
    tagline: 'From Scattered Feedback to Evidence-Backed Action.',
    exportedAt: new Date().toISOString(),
    workspace: {
      name: params.workspaceName,
      context: params.workspaceContext,
      analysisOrigin:
        params.analysisOrigin === 'live_ai'
          ? 'Live Gemini AI Analysis'
          : params.analysisOrigin === 'sample_demo'
          ? 'Illustrative Sample Demo Analysis'
          : 'Unanalyzed',
      lastAnalyzedAt: params.lastAnalyzedAt,
      totalFeedbackItems: params.feedbackCount,
      totalComplaints: params.complaintsCount ?? 0,
    },
    priorityEngine: {
      formula:
        'Priority Score = (Frequency * w_frequency) + (Reported Impact * w_impact) + (Urgency * w_urgency) + (Evidence Confidence * w_confidence)',
      configuredWeights: params.weights,
      unknownFactorNeutralScore: 50,
    },
    opportunities: params.opportunities,
    interventions: params.interventions,
    impactTrackers: params.impactTrackers,
  };

  const slug =
    params.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'needmap';

  triggerBlobDownload(
    JSON.stringify(payload, null, 2),
    `${slug}-opportunity-analysis-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json;charset=utf-8;'
  );
}

function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportPrintableHtmlReport(params: {
  workspaceName: string;
  workspaceContext: string;
  analysisOrigin: string | null;
  lastAnalyzedAt: string | null;
  weights: PriorityWeights;
  feedback: FeedbackItem[];
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  impactTrackers: ImpactMetricTracker[];
  complaints?: ComplaintRecord[];
}): void {
  const {
    workspaceName,
    workspaceContext,
    analysisOrigin,
    lastAnalyzedAt,
    weights,
    feedback,
    opportunities,
    interventions,
    impactTrackers,
    complaints = [],
  } = params;

  const originLabel =
    analysisOrigin === 'live_ai'
      ? 'Live Gemini AI Analysis (Evidence-Verified)'
      : analysisOrigin === 'sample_demo'
      ? 'Illustrative Sample Demo Analysis (Sample Dataset)'
      : 'No Analysis Executed Yet';

  const oppSections = opportunities
    .map((opp, idx) => {
      const oppInts = interventions.filter((i) => i.opportunityId === opp.id);
      const oppTrackers = impactTrackers.filter((t) => t.opportunityId === opp.id);

      const excerptsHtml =
        opp.evidenceExcerpts.length > 0
          ? opp.evidenceExcerpts
              .map(
                (ex) => `
              <li style="margin-bottom:8px;">
                <strong>[${escapeHtml(ex.feedbackId)}]</strong>
                ${ex.isContradictory ? '<em style="color:#b45309;">(Scope/Contradictory Note)</em> ' : ''}
                &ldquo;${escapeHtml(ex.excerpt)}&rdquo;
                <span style="color:#64748b;font-size:11px;"> — ${
                  ex.verificationStatus === 'unverified' ? 'Unverified' : 'Verified against inbox'
                }</span>
              </li>`
              )
              .join('')
          : '<li><em>No verified excerpts available — requires investigation.</em></li>';

      const gapsHtml =
        opp.informationGaps.length > 0
          ? opp.informationGaps.map((g) => `<li>${escapeHtml(g)}</li>`).join('')
          : '<li>None documented.</li>';

      const intsHtml =
        oppInts.length > 0
          ? oppInts
              .map(
                (intItem) => `
              <div style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px;">
                <div style="font-weight:600;color:#0f172a;">
                  ${escapeHtml(intItem.title)}
                  <span style="font-weight:400;color:#475569;font-size:12px;">
                    · Status: ${escapeHtml(intItem.status)} · Effort: ${escapeHtml(
                  intItem.effort
                )} (Est.) · Potential Impact: ${escapeHtml(intItem.potentialImpact)} (Est.)
                  </span>
                </div>
                <div style="font-size:12px;color:#334155;margin-top:3px;">
                  Owner: ${escapeHtml(intItem.responsibleRole)} · Target Metric: ${escapeHtml(
                  intItem.successMetric
                )}
                </div>
                ${
                  intItem.userNotes
                    ? `<div style="font-size:12px;color:#0f766e;margin-top:3px;">Notes: ${escapeHtml(
                        intItem.userNotes
                      )}</div>`
                    : ''
                }
              </div>`
              )
              .join('')
          : '<p style="font-size:12px;color:#64748b;">No interventions recorded.</p>';

      const trackersHtml =
        oppTrackers.length > 0
          ? oppTrackers
              .map((trk) => {
                const latest =
                  trk.followUps.length > 0
                    ? trk.followUps[trk.followUps.length - 1]
                    : null;
                return `<div style="font-size:12px;color:#334155;margin-top:4px;">
                  <strong>${escapeHtml(trk.metricName)}:</strong>
                  Baseline: ${
                    trk.baseline
                      ? `${trk.baseline.value} ${escapeHtml(trk.unit)} (${escapeHtml(
                          trk.baseline.date
                        )})`
                      : 'Not recorded yet'
                  } · Latest Follow-up: ${
                  latest
                    ? `${latest.value} ${escapeHtml(latest.date)}`
                    : 'Awaiting post-intervention measurement'
                }
                </div>`;
              })
              .join('')
          : '<div style="font-size:12px;color:#64748b;">No baseline measurements recorded yet.</div>';

      return `
        <section style="border:1px solid #cbd5e1;border-radius:8px;padding:18px;margin-bottom:18px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div>
              <div style="font-size:12px;color:#475569;">
                Rank #${idx + 1} · ${escapeHtml(opp.id)} · ${escapeHtml(opp.category)} · ${
        opp.priority.tier
      } Priority ${opp.priority.isOverridden ? '(Staff Override)' : ''}
              </div>
              <h3 style="margin:4px 0 6px 0;font-size:17px;color:#0f172a;">${escapeHtml(
                opp.title
              )}</h3>
            </div>
            <div style="text-align:right;font-family:monospace;font-size:18px;font-weight:700;color:#0f172a;">
              ${opp.priority.totalScore}/100
            </div>
          </div>
          <p style="margin:6px 0;font-size:13px;line-height:1.55;color:#1e293b;">${escapeHtml(
            opp.problemDescription
          )}</p>
          <p style="margin:6px 0;font-size:12px;color:#475569;font-family:monospace;">
            Breakdown: Freq ${opp.priority.frequencyScore} · User-Reported Impact ${
        opp.priority.impactScore
      } · Urgency ${opp.priority.urgencyScore} · Confidence ${
        opp.priority.confidenceScore
      } (${opp.priority.validSupportCount} linked entries)
          </p>
          <div style="margin-top:10px;">
            <strong style="font-size:12px;color:#0f172a;">Observed Supporting Evidence Excerpts:</strong>
            <ul style="margin:6px 0 0 18px;padding:0;font-size:12px;color:#334155;">${excerptsHtml}</ul>
          </div>
          <div style="margin-top:10px;">
            <strong style="font-size:12px;color:#0f172a;">Evidence Gaps & Uncertainties:</strong>
            <ul style="margin:4px 0 0 18px;padding:0;font-size:12px;color:#475569;">${gapsHtml}</ul>
          </div>
          <div style="margin-top:10px;">
            <strong style="font-size:12px;color:#0f172a;">Candidate & Planned Interventions (AI Estimates Labeled):</strong>
            ${intsHtml}
          </div>
          <div style="margin-top:10px;">
            <strong style="font-size:12px;color:#0f172a;">Impact Tracking Status:</strong>
            ${trackersHtml}
          </div>
        </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NEEDMAP AI Report — ${escapeHtml(workspaceName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; max-width: 920px; margin: 32px auto; padding: 0 24px; line-height: 1.5; }
    h1, h2, h3 { letter-spacing: -0.015em; }
    .meta { color: #475569; font-size: 13px; }
    .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 20px 0; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
    .kpi-val { font-family: monospace; font-size: 20px; font-weight: 700; margin-top: 4px; }
    .print-bar { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
    @media print { .print-bar { display: none; } body { margin: 0; padding: 12px; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <span style="font-size:13px;color:#334155;">Printable NEEDMAP AI Report — Use your browser Print dialog ("Save as PDF") to export PDF.</span>
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <header style="border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:20px;">
    <div class="meta">NEEDMAP AI · From Scattered Feedback to Evidence-Backed Action</div>
    <h1 style="margin:6px 0 4px 0;font-size:24px;">${escapeHtml(workspaceName)}</h1>
    <div class="meta">${escapeHtml(workspaceContext)}</div>
    <div class="meta" style="margin-top:6px;">
      Analysis Source: <strong>${escapeHtml(originLabel)}</strong> ·
      Generated: ${escapeHtml(new Date().toLocaleString())}
      ${lastAnalyzedAt ? ` · Last Analysis Run: ${escapeHtml(new Date(lastAnalyzedAt).toLocaleString())}` : ''}
    </div>
  </header>

  <div class="kpi-row">
    <div class="kpi">
      <div class="meta">Complaints Logged</div>
      <div class="kpi-val">${complaints.length}</div>
    </div>
    <div class="kpi">
      <div class="meta">Feedback Volume</div>
      <div class="kpi-val">${feedback.length}</div>
    </div>
    <div class="kpi">
      <div class="meta">Opportunity Clusters</div>
      <div class="kpi-val">${opportunities.length}</div>
    </div>
    <div class="kpi">
      <div class="meta">High Priority (&ge;70)</div>
      <div class="kpi-val">${opportunities.filter((o) => o.priority.tier === 'High').length}</div>
    </div>
    <div class="kpi">
      <div class="meta">Active/Planned Actions</div>
      <div class="kpi-val">${
        interventions.filter((i) => i.status === 'Planned' || i.status === 'In Progress' || i.status === 'Completed').length
      }</div>
    </div>
  </div>

  <p class="meta" style="margin-bottom:20px;">
    <strong>Transparent Priority Formula:</strong>
    Score = (Frequency &times; ${weights.frequency}%) + (User-Reported Impact &times; ${
    weights.impact
  }%) + (Urgency &times; ${weights.urgency}%) + (Evidence Confidence &times; ${
    weights.confidence
  }%). Unknown factors receive a neutral 50/100 score.
  </p>

  <h2 style="font-size:18px;margin-bottom:12px;">Prioritized Opportunities &amp; Evidence</h2>
  ${oppSections || '<p>No opportunities have been generated yet.</p>'}
</body>
</html>`;

  const slug =
    workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'needmap';

  triggerBlobDownload(
    html,
    `${slug}-printable-report-${new Date().toISOString().slice(0, 10)}.html`,
    'text/html;charset=utf-8;'
  );
}
