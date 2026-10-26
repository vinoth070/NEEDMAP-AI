import type {
  FeedbackItem,
  ImpactMetricTracker,
  InterventionItem,
  OpportunityCluster,
} from '../types/needmap';
import {
  type RawAiOpportunity,
  validateAndGroundAiAnalysis,
} from '../utils/evidenceVerifier';

/**
 * 36 realistic, clearly labeled fictional demo feedback entries covering
 * 6+ campus/community themes, varied phrasings, shared-keyword distinct problems,
 * and contradictory/uncertain reports.
 */
export const DEMO_FEEDBACK_ITEMS: FeedbackItem[] = [
  // Theme 1: Hostel Wi-Fi Reliability (7 supporting + 1 nuanced/contradictory scope report)
  {
    id: 'FB-001',
    text: 'Wi-Fi in North Hostel Block B drops every evening between 8:30 PM and 11:30 PM right when timed LMS quizzes and coding lab submissions are due.',
    category: 'Wi-Fi & IT',
    date: '2026-10-08',
    source: 'Hostel Resident Survey',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-08T20:45:00.000Z',
  },
  {
    id: 'FB-002',
    text: '3rd and 4th floor rooms in Block C have almost zero campus wireless signal; I burned through my entire monthly mobile hotspot data just to attend evening project calls.',
    category: 'Wi-Fi & IT',
    date: '2026-10-10',
    source: 'IT Helpdesk Portal',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-10T21:10:00.000Z',
  },
  {
    id: 'FB-003',
    text: 'My online linear algebra quiz auto-submitted half-blank on Tuesday at 9:15 PM because the East & North Hostel access points kept disconnecting every three minutes.',
    category: 'Wi-Fi & IT',
    date: '2026-10-13',
    source: 'Student Council Form',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-13T21:35:00.000Z',
  },
  {
    id: 'FB-004',
    text: 'Corridor routers on upper floors of North Hostel blink amber every night under peak load and nobody can load lecture recordings without constant buffering.',
    category: 'Wi-Fi & IT',
    date: '2026-10-15',
    source: 'Hostel Resident Survey',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-15T22:00:00.000Z',
  },
  {
    id: 'FB-005',
    text: 'Internet authentication portal logs students out every 20 minutes in East Hostel wing 3B, breaking SSH sessions to university compute servers.',
    category: 'Wi-Fi & IT',
    date: '2026-10-18',
    source: 'IT Helpdesk Portal',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-18T19:50:00.000Z',
  },
  {
    id: 'FB-006',
    text: 'Peak-hour hostel internet instability from 8 PM onward is forcing dozens of students to walk to the main library at night just to upload assignments.',
    category: 'Wi-Fi & IT',
    date: '2026-10-20',
    source: 'Town Hall Box',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-20T20:15:00.000Z',
  },
  {
    id: 'FB-007',
    text: 'Upper floor Block B Wi-Fi packet loss exceeds 40% after dinner hours even though morning speeds are completely fine.',
    category: 'Wi-Fi & IT',
    date: '2026-10-22',
    source: 'IT Helpdesk Portal',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-22T21:05:00.000Z',
  },
  {
    id: 'FB-008',
    text: 'Ever since IT upgraded the access points on Ground Floor Block A last week, Wi-Fi there has been rock solid at 95 Mbps even at 10 PM - the dead zones are strictly on floors 3 and 4 of Blocks B and C.',
    category: 'Wi-Fi & IT',
    date: '2026-10-23',
    source: 'Hostel Resident Survey',
    reportedImpact: 'Low',
    isDemo: true,
    createdAt: '2026-10-23T11:20:00.000Z',
  },

  // Theme 2: Canteen Lunch Queue & Payment Bottlenecks (6 entries)
  {
    id: 'FB-009',
    text: 'Central Canteen lunch queue takes 30 to 35 minutes between 12:30 PM and 1:30 PM because only one cashier counter accepts UPI/QR payments.',
    category: 'Dining & Canteen',
    date: '2026-10-09',
    source: 'Campus Dining Survey',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-09T13:20:00.000Z',
  },
  {
    id: 'FB-010',
    text: 'Students with a 12:00 PM lecture and a 1:00 PM wet lab routinely skip lunch altogether because waiting for a meal token and pickup takes 30+ minutes.',
    category: 'Dining & Canteen',
    date: '2026-10-11',
    source: 'Student Council Form',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-11T14:00:00.000Z',
  },
  {
    id: 'FB-011',
    text: 'The single POS billing machine at the main canteen freezes whenever 40 students crowd the counter at 12:45 PM, backing the line out into the rain.',
    category: 'Dining & Canteen',
    date: '2026-10-14',
    source: 'Campus Dining Survey',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-14T13:10:00.000Z',
  },
  {
    id: 'FB-012',
    text: 'People ordering a quick grab-and-go sandwich or coffee have to stand in the exact same slow billing line as full hot-meal thali orders.',
    category: 'Dining & Canteen',
    date: '2026-10-17',
    source: 'QR Table Feedback',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-17T12:55:00.000Z',
  },
  {
    id: 'FB-013',
    text: 'Was 12 minutes late to my 1:00 PM thermodynamics tutorial twice this week after waiting 28 minutes just to pay and collect pre-plated lunch.',
    category: 'Dining & Canteen',
    date: '2026-10-21',
    source: 'Student Council Form',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-21T13:45:00.000Z',
  },
  {
    id: 'FB-014',
    text: 'Adding a pre-order pickup window or second digital kiosk during the 12:15–1:45 PM rush would cut canteen congestion immediately.',
    category: 'Dining & Canteen',
    date: '2026-10-24',
    source: 'QR Table Feedback',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-24T13:05:00.000Z',
  },

  // Theme 3: Campus Accessibility Barriers (5 entries - high impact & critical urgency)
  {
    id: 'FB-015',
    text: 'The sole wheelchair-accessible elevator in the Science Annex has been out of service for 11 consecutive days, preventing mobility-impaired students from reaching 3rd-floor chemistry labs.',
    category: 'Accessibility',
    date: '2026-10-12',
    source: 'Disability Access Desk',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-12T09:30:00.000Z',
  },
  {
    id: 'FB-016',
    text: 'I am on crutches after knee surgery and had to miss two upper-level seminar sessions in Science Annex because the lift still has an "Awaiting Technician" paper sign.',
    category: 'Accessibility',
    date: '2026-10-16',
    source: 'Student Council Form',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-16T11:15:00.000Z',
  },
  {
    id: 'FB-017',
    text: 'Temporary concrete ramp at the East Library entrance is far too steep, lacks a side handrail, and becomes dangerously slick whenever sprinklers run.',
    category: 'Accessibility',
    date: '2026-10-18',
    source: 'Disability Access Desk',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-18T15:20:00.000Z',
  },
  {
    id: 'FB-018',
    text: 'Automatic door opener push-plate at the Main Academic Block accessible entrance does not trigger the door motor; wheelchair users have to wait for passersby.',
    category: 'Accessibility',
    date: '2026-10-20',
    source: 'Facilities Helpdesk',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-20T10:40:00.000Z',
  },
  {
    id: 'FB-019',
    text: 'Science Annex elevator outage is entering its second week with no temporary ground-floor room reassignment offered for affected lab sections.',
    category: 'Accessibility',
    date: '2026-10-23',
    source: 'Disability Access Desk',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-23T09:50:00.000Z',
  },

  // Theme 4: Classroom AV & Equipment Failures (6 entries)
  {
    id: 'FB-020',
    text: 'HDMI adapter cables in Lecture Halls 201 and 203 have bent pins, so the first 10–15 minutes of morning classes are wasted hunting for IT support.',
    category: 'Classroom Facilities',
    date: '2026-10-09',
    source: 'Faculty & TA Feedback',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-09T10:20:00.000Z',
  },
  {
    id: 'FB-021',
    text: 'Projector lamp in Room 204 flickers dim yellow; nobody seated past row 5 can read code slides or circuit diagrams.',
    category: 'Classroom Facilities',
    date: '2026-10-12',
    source: 'Student Council Form',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-12T16:00:00.000Z',
  },
  {
    id: 'FB-022',
    text: 'Wireless lapel and podium microphones in Auditorium B cut out constantly, which also leaves lecture capture recordings completely silent for revision.',
    category: 'Classroom Facilities',
    date: '2026-10-15',
    source: 'Faculty & TA Feedback',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-15T14:30:00.000Z',
  },
  {
    id: 'FB-023',
    text: 'USB-C display dongles are missing from podiums in Humanities 102 and 105, forcing professors to draw slides by hand on worn whiteboards.',
    category: 'Classroom Facilities',
    date: '2026-10-19',
    source: 'Facilities Helpdesk',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-19T11:45:00.000Z',
  },
  {
    id: 'FB-024',
    text: 'Audio-visual support phone number taped to the Lecture Hall 201 lectern goes straight to voicemail during 8:30 AM classes.',
    category: 'Classroom Facilities',
    date: '2026-10-21',
    source: 'Faculty & TA Feedback',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-21T09:05:00.000Z',
  },
  {
    id: 'FB-025',
    text: 'Three seminar rooms on the 2nd floor have broken projector remotes and loose HDMI wall plates that disconnect whenever someone touches the desk.',
    category: 'Classroom Facilities',
    date: '2026-10-24',
    source: 'Facilities Helpdesk',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-24T15:10:00.000Z',
  },

  // Theme 5: Student Service & Registrar Response Delays (5 entries)
  {
    id: 'FB-026',
    text: 'Requested an official bonafide certificate for myexternal scholarship deadline 16 days ago on the Registrar portal and the ticket still says "Unread".',
    category: 'Student Services',
    date: '2026-10-10',
    source: 'Admin Service Survey',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'FB-027',
    text: 'Financial aid email inquiries take over two weeks to receive a generic reply, and in-person counter hours (11 AM–1 PM) clash directly with core classes.',
    category: 'Student Services',
    date: '2026-10-13',
    source: 'Student Council Form',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-13T16:40:00.000Z',
  },
  {
    id: 'FB-028',
    text: 'Had to visit the Student Records Window four separate times to track my internship NOC letter because there is no status update or SLA on submitted forms.',
    category: 'Student Services',
    date: '2026-10-16',
    source: 'Admin Service Survey',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-16T15:00:00.000Z',
  },
  {
    id: 'FB-029',
    text: 'Transcript verification requests sit in a black box with zero estimated completion date, risking graduate school application deadlines.',
    category: 'Student Services',
    date: '2026-10-19',
    source: 'Town Hall Box',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-19T17:25:00.000Z',
  },
  {
    id: 'FB-030',
    text: 'Student Services helpdesk closes tickets automatically after 7 days even when the registrar office has not answered the question yet.',
    category: 'Student Services',
    date: '2026-10-22',
    source: 'Admin Service Survey',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-22T14:15:00.000Z',
  },

  // Theme 6: Campus Waste Management & Weekend Overflow (4 entries)
  {
    id: 'FB-031',
    text: 'Trash and food-waste bins outside the Hostel Courtyard overflow every Saturday night and Sunday, attracting stray dogs that scatter wrappers across the walkway.',
    category: 'Waste & Sanitation',
    date: '2026-10-11',
    source: 'Hostel Resident Survey',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-11T09:15:00.000Z',
  },
  {
    id: 'FB-032',
    text: 'Engineering Quad recycling stations have faded labels so wet food cups get dumped into paper recycling, ruining the entire bin.',
    category: 'Waste & Sanitation',
    date: '2026-10-18',
    source: 'Green Campus Form',
    reportedImpact: 'Low',
    isDemo: true,
    createdAt: '2026-10-18T13:30:00.000Z',
  },
  {
    id: 'FB-033',
    text: 'Weekend waste collection seems paused between Saturday noon and Monday morning near the student plaza, leaving a strong odor near outdoor benches.',
    category: 'Waste & Sanitation',
    date: '2026-10-19',
    source: 'Town Hall Box',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-19T10:10:00.000Z',
  },
  {
    id: 'FB-034',
    text: 'Open-top bins outside Block C allow crows and stray animals to pull out leftover food containers every Sunday.',
    category: 'Waste & Sanitation',
    date: '2026-10-25',
    source: 'Green Campus Form',
    reportedImpact: 'Medium',
    isDemo: true,
    createdAt: '2026-10-25T08:45:00.000Z',
  },

  // Theme 7 & 8: Distinct shared-keyword issue + Isolated/Uncertain reports (demonstrates non-conflation & weak-evidence flagging!)
  {
    id: 'FB-035',
    text: 'Central Canteen daily specials board does not list peanut, sesame, or dairy allergens; a friend with a severe nut allergy had to guess ingredients.',
    category: 'Dining & Canteen',
    date: '2026-10-22',
    source: 'Campus Dining Survey',
    reportedImpact: 'High',
    isDemo: true,
    createdAt: '2026-10-22T13:50:00.000Z',
  },
  {
    id: 'FB-036',
    text: 'Heard a rumor that the covered bicycle rack behind the Chemistry building might be removed next month - not sure if that is confirmed or where cyclists will park.',
    category: 'Safety & Transport',
    date: '2026-10-24',
    source: 'Town Hall Box',
    reportedImpact: 'Unknown',
    isDemo: true,
    createdAt: '2026-10-24T18:05:00.000Z',
  },
];

const RAW_SAMPLE_OPPORTUNITIES: RawAiOpportunity[] = [
  {
    title: 'Peak-Hour Hostel Wi-Fi Dropouts on Upper Floors (Blocks B & C)',
    problemDescription:
      'Residents on the 3rd and 4th floors of North and East Hostels (specifically Blocks B and C) experience severe wireless dropouts, packet loss, and portal logouts every evening between 8:00 PM and 11:30 PM, disrupting timed online assessments and remote server work.',
    category: 'Wi-Fi & IT',
    affectedUsers:
      'Hostel residents on upper floors of North Hostel (Blocks B & C) and East Hostel (Wing 3B)',
    reportedConsequences:
      'Auto-submitted incomplete online quizzes, exhausted personal mobile data plans, broken SSH compute sessions, and late-night walks to the library.',
    relatedFeedbackIds: ['FB-001', 'FB-002', 'FB-003', 'FB-004', 'FB-005', 'FB-006', 'FB-007'],
    contradictoryFeedbackIds: ['FB-008'],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-001',
        excerpt: 'Wi-Fi in North Hostel Block B drops every evening between 8:30 PM and 11:30 PM right when timed LMS quizzes and coding lab submissions are due.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-003',
        excerpt: 'My online linear algebra quiz auto-submitted half-blank on Tuesday at 9:15 PM because the East & North Hostel access points kept disconnecting',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-005',
        excerpt: 'Internet authentication portal logs students out every 20 minutes in East Hostel wing 3B, breaking SSH sessions',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-008',
        excerpt: 'Ever since IT upgraded the access points on Ground Floor Block A last week, Wi-Fi there has been rock solid at 95 Mbps even at 10 PM - the dead zones are strictly on floors 3 and 4 of Blocks B and C.',
        isContradictory: true,
      },
    ],
    reportedImpactLevel: 'High',
    urgencyLevel: 'High',
    aiConfidenceNote:
      'High corroboration across 7 independent resident reports, with 1 scope-refining report confirming Ground Floor Block A was already fixed.',
    informationGaps: [
      'Exact access-point hardware models and backhaul switch capacity on Floors 3–4 of Blocks B and C.',
      'Whether captive-portal session timeout (20 min) is a misconfigured policy or AP controller crash.',
    ],
    suggestedSuccessMetrics: [
      'Evening (8 PM–11:30 PM) packet loss percentage on Floors 3–4 of Blocks B & C',
      'Weekly IT helpdesk Wi-Fi ticket count from North & East Hostels',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Extend Block A Access Point Upgrade & Session Timeout Fix to Upper Floors B & C',
        problemAddressed: 'Upper-floor dead zones, peak-evening AP overload, and 20-minute captive portal disconnects.',
        effort: 'Medium',
        potentialImpact: 'High',
        dependencies: ['Switch PoE port budget audit', 'Replacement Wi-Fi 6 AP inventory'],
        responsibleRole: 'Campus IT Network Operations',
        implementationSteps: [
          'Audit evening AP client load and switch logs on Floors 3–4 of Blocks B, C, and East Wing 3B.',
          'Increase captive-portal authentication lease time from 20 minutes to 24 hours for hostel subnets.',
          'Deploy high-density access points matching the proven Ground Floor Block A upgrade.',
          'Verify signal strength and packet loss between 8:30 PM and 11:00 PM across 5 sample rooms.',
        ],
        expectedOutcome: 'Estimated elimination of evening quiz disconnects and stable throughput comparable to Block A.',
        successMetric: 'Evening packet loss (%) on Floors 3–4',
        infoRequiredBeforeImpl: ['Count of defective or legacy APs on Floors 3–4', 'Existing Ethernet cabling health check'],
      },
      {
        title: 'Designate Wired Ethernet Fallback Ports in Hostel Common Study Rooms',
        problemAddressed: 'Immediate exam-safety fallback so students do not have to walk to the main library at night.',
        effort: 'Low',
        potentialImpact: 'Medium',
        dependencies: ['Hostel warden room access', 'Patch cables and wall-jack testing'],
        responsibleRole: 'Hostel Administration & IT Support Desk',
        implementationSteps: [
          'Test and activate existing Ethernet wall ports in North and East Hostel ground-floor study lounges.',
          'Label active exam-safe wired desks clearly for timed assessments.',
        ],
        expectedOutcome: 'Estimated immediate reduction in missed/corrupted evening online quizzes while AP upgrades proceed.',
        successMetric: 'Number of quiz-disruption complaints per week',
        infoRequiredBeforeImpl: ['Availability of working wall jacks in hostel study rooms'],
      },
    ],
  },
  {
    title: 'Inoperative Science Annex Elevator & Physical Campus Accessibility Barriers',
    problemDescription:
      'Mobility-impaired and injured students face acute physical access barriers, led by an 11+ day outage of the sole wheelchair-accessible elevator in the Science Annex, alongside an unrailed steep ramp at East Library and a broken automatic door opener at the Main Academic Block.',
    category: 'Accessibility',
    affectedUsers:
      'Wheelchair users, students on crutches, and mobility-impaired students/staff accessing Science Annex, East Library, and Main Academic Block',
    reportedConsequences:
      'Students directly excluded from attending upper-floor chemistry labs and academic seminars for nearly two weeks.',
    relatedFeedbackIds: ['FB-015', 'FB-016', 'FB-017', 'FB-018', 'FB-019'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-015',
        excerpt: 'The sole wheelchair-accessible elevator in the Science Annex has been out of service for 11 consecutive days, preventing mobility-impaired students from reaching 3rd-floor chemistry labs.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-017',
        excerpt: 'Temporary concrete ramp at the East Library entrance is far too steep, lacks a side handrail, and becomes dangerously slick whenever sprinklers run.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-018',
        excerpt: 'Automatic door opener push-plate at the Main Academic Block accessible entrance does not trigger the door motor',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'High',
    urgencyLevel: 'Critical',
    aiConfidenceNote:
      'Consistent, specific reports across Disability Access Desk and student submissions documenting active exclusion from classes.',
    informationGaps: [
      'Root cause of the 11-day Science Annex elevator delay (awaiting spare part vs vendor contract hold).',
      'Measured slope grade of the East Library ramp against accessibility code standards.',
    ],
    suggestedSuccessMetrics: [
      'Days of unmitigated elevator downtime affecting scheduled classes',
      'Percentage of audited accessible entrances in full working order',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Immediate Ground-Floor Room Reassignment Protocol & Emergency Elevator Repair',
        problemAddressed: 'Students missing upper-floor labs and seminars during Science Annex lift downtime.',
        effort: 'Low',
        potentialImpact: 'High',
        dependencies: ['Registrar room scheduling authority', 'Elevator maintenance vendor SLA escalation'],
        responsibleRole: 'Disability Access Office & Academic Scheduling',
        implementationSteps: [
          'Relocate affected Science Annex seminar sections to accessible ground-floor rooms within 24 hours.',
          'Provide accommodated lab alternatives or ground-floor bench access until lift inspection passes.',
          'Escalate vendor repair ticket with daily public status updates posted on the Accessibility portal.',
        ],
        expectedOutcome: 'Estimated zero missed classes due to lift downtime while mechanical repair finishes.',
        successMetric: 'Hours to relocate affected courses when an elevator outage exceeds 24h',
        infoRequiredBeforeImpl: ['List of enrolled students/courses in Science Annex floors 2–3'],
      },
      {
        title: 'East Library Ramp Handrail/Non-Slip Retrofit & Main Block Door Actuator Repair',
        problemAddressed: 'Slippery, unrailed East Library ramp and non-functioning Main Academic Block door actuator.',
        effort: 'Medium',
        potentialImpact: 'High',
        dependencies: ['Campus carpentry/metalwork crew', 'Door motor replacement relay'],
        responsibleRole: 'Campus Facilities Maintenance',
        implementationSteps: [
          'Redirect lawn sprinkler heads away from the East Library entrance ramp immediately.',
          'Install compliant bilateral handrails and high-traction anti-slip surfacing on the ramp.',
          'Replace or recalibrate the Main Academic Block push-plate door actuator.',
        ],
        expectedOutcome: 'Estimated restoration of safe, independent entry at both academic buildings.',
        successMetric: 'Pass rate on bi-weekly physical accessibility walkthroughs',
        infoRequiredBeforeImpl: ['Structural inspection of temporary concrete ramp slope'],
      },
    ],
  },
  {
    title: 'Central Canteen Midday Payment & Pickup Queue Bottlenecks',
    problemDescription:
      'Between 12:30 PM and 1:30 PM, Central Canteen wait times reach 28–35 minutes because all orders - including grab-and-go items - funnel through a single QR/POS billing counter that frequently freezes.',
    category: 'Dining & Canteen',
    affectedUsers:
      'Students and staff with tight 12:00 PM–1:00 PM lecture-to-lab transitions dining at Central Canteen',
    reportedConsequences:
      'Students skipping midday meals or arriving 10–15 minutes late to 1:00 PM laboratories and tutorials.',
    relatedFeedbackIds: ['FB-009', 'FB-010', 'FB-011', 'FB-012', 'FB-013', 'FB-014'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-009',
        excerpt: 'Central Canteen lunch queue takes 30 to 35 minutes between 12:30 PM and 1:30 PM because only one cashier counter accepts UPI/QR payments.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-010',
        excerpt: 'Students with a 12:00 PM lecture and a 1:00 PM wet lab routinely skip lunch altogether because waiting for a meal token and pickup takes 30+ minutes.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-012',
        excerpt: 'People ordering a quick grab-and-go sandwich or coffee have to stand in the exact same slow billing line as full hot-meal thali orders.',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'High',
    urgencyLevel: 'Medium',
    aiConfidenceNote:
      '6 corroborating entries across three feedback channels consistently pinpoint the 12:30–1:30 PM single-POS bottleneck.',
    informationGaps: [
      'Canteen vendor staffing availability during the 90-minute peak window.',
      'Whether POS freezes are caused by terminal hardware or weak canteen Wi-Fi.',
    ],
    suggestedSuccessMetrics: [
      'Average lunch queue wait time (minutes) between 12:30 PM and 1:30 PM',
      'Transactions processed per minute during peak lunch hour',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Split Express Grab-and-Go Counter with Dedicated Static UPI QR Lane',
        problemAddressed: 'Single-cashier bottleneck mixing quick packaged items with full hot meals.',
        effort: 'Low',
        potentialImpact: 'High',
        dependencies: ['Canteen operator agreement', 'Second handheld receipt/verification tablet'],
        responsibleRole: 'Campus Dining Committee & Canteen Vendor',
        implementationSteps: [
          'Open a dedicated Express Counter from 12:15 PM to 1:45 PM for pre-packed sandwiches, fruit, and beverages.',
          'Provide a second UPI QR payment terminal to eliminate single-POS failure.',
          'Diagnose and wire the primary POS terminal via Ethernet if Wi-Fi drops cause freezes.',
        ],
        expectedOutcome: 'Estimated 40–50% reduction in peak queue waiting time for both express and hot-meal lines.',
        successMetric: 'Measured 12:45 PM queue wait time (minutes)',
        infoRequiredBeforeImpl: ['Peak transaction breakdown (express vs cooked-to-order)'],
      },
    ],
  },
  {
    title: 'Lecture Hall & Seminar Room AV, Projector, and Microphone Failures',
    problemDescription:
      'Damaged HDMI/USB-C adapters, dim projector lamps, and cutting-out podium microphones across Lecture Halls 201–204, Auditorium B, and Humanities rooms delay classes and ruin lecture recordings.',
    category: 'Classroom Facilities',
    affectedUsers:
      'Instructors, TAs, and students in Lecture Halls 201–204, Auditorium B, and 2nd-floor seminar rooms',
    reportedConsequences:
      'Loss of 10–15 minutes of instructional time per class, unreadable slides from back rows, and silent lecture capture audio.',
    relatedFeedbackIds: ['FB-020', 'FB-021', 'FB-022', 'FB-023', 'FB-024', 'FB-025'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-020',
        excerpt: 'HDMI adapter cables in Lecture Halls 201 and 203 have bent pins, so the first 10–15 minutes of morning classes are wasted hunting for IT support.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-022',
        excerpt: 'Wireless lapel and podium microphones in Auditorium B cut out constantly, which also leaves lecture capture recordings completely silent',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'Medium',
    urgencyLevel: 'Medium',
    aiConfidenceNote:
      '6 detailed reports from both faculty/TAs and students naming specific room numbers (201, 203, 204, Auditorium B, Humanities 102/105).',
    informationGaps: [
      'Full inventory of rooms needing projector bulb replacement vs simple cable/dongle tether replacement.',
    ],
    suggestedSuccessMetrics: [
      'Weekly classroom AV incident reports during morning lectures',
      'Percentage of lecture halls passing Monday 8:00 AM AV readiness check',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Tethered HDMI/USB-C Adapter Replacement Blitz & 8:00 AM AV Readiness Sweep',
        problemAddressed: 'Bent HDMI pins, missing USB-C dongles, dim bulb in Room 204, and unanswered 8:30 AM helpline.',
        effort: 'Low',
        potentialImpact: 'High',
        dependencies: ['Security cable tethers', 'Spare projector lamp stock'],
        responsibleRole: 'Classroom AV & IT Support Team',
        implementationSteps: [
          'Replace damaged HDMI cables and install steel-tethered USB-C/HDMI adapter rings in Halls 201–204 and Humanities 102/105.',
          'Replace the degraded projector bulb in Room 204 and service Auditorium B wireless mic receivers.',
          'Staff the morning AV rapid-response line starting at 8:15 AM on weekdays.',
        ],
        expectedOutcome: 'Estimated recovery of lost lecture start time and reliable audio on recorded lectures.',
        successMetric: 'Morning AV support calls per week',
        infoRequiredBeforeImpl: ['Complete list of affected podium wall plates'],
      },
    ],
  },
  {
    title: 'Registrar & Financial Aid Ticket Backlogs and Opaque Document Turnaround',
    problemDescription:
      'Students requesting time-sensitive documents (bonafide certificates, transcripts, internship NOCs) or financial aid answers face 2+ week delays, auto-closed unanswered tickets, and narrow midday counter hours that conflict with classes.',
    category: 'Student Services',
    affectedUsers:
      'Students applying for external scholarships, internships, graduate school, or financial aid support',
    reportedConsequences:
      'Risk of missed external scholarship/admission deadlines and repeated skipped classes for in-person follow-ups.',
    relatedFeedbackIds: ['FB-026', 'FB-027', 'FB-028', 'FB-029', 'FB-030'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-026',
        excerpt: 'Requested an official bonafide certificate for myexternal scholarship deadline 16 days ago on the Registrar portal and the ticket still says "Unread".',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-030',
        excerpt: 'Student Services helpdesk closes tickets automatically after 7 days even when the registrar office has not answered the question yet.',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'High',
    urgencyLevel: 'High',
    aiConfidenceNote:
      '5 consistent student reports highlighting systemic SLA, ticket auto-close, and office-hour scheduling friction.',
    informationGaps: [
      'Current volume of backlogged Registrar requests and whether standard bonafide letters can be digitally signed.',
    ],
    suggestedSuccessMetrics: [
      'Median turnaround time (days) for bonafide/NOC/transcript requests',
      'Count of unanswered helpdesk tickets auto-closed per month',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Disable Premature Auto-Close, Publish Document SLAs & Shift Counter Hours',
        problemAddressed: 'Tickets closing before staff reply, zero status visibility, and 11 AM–1 PM class clash.',
        effort: 'Low',
        potentialImpact: 'High',
        dependencies: ['Helpdesk configuration admin access', 'Registrar staffing schedule'],
        responsibleRole: 'Office of the Registrar & Student Services',
        implementationSteps: [
          'Immediately disable the 7-day auto-close rule on tickets awaiting staff action.',
          'Publish clear 3-business-day turnaround targets and stage indicators (Received, Verifying, Ready) on the portal.',
          'Extend or shift in-person window hours to include 4:00 PM–5:30 PM twice a week.',
        ],
        expectedOutcome: 'Estimated elimination of prematurely closed tickets and fewer repeat walk-in visits.',
        successMetric: 'Median business days to fulfill standard certificate requests',
        infoRequiredBeforeImpl: ['Review current Registrar ticket queue size'],
      },
    ],
  },
  {
    title: 'Weekend Outdoor Waste Overflow & Unclear Recycling Signage',
    problemDescription:
      'Outdoor bins near the Hostel Courtyard, Block C, and Student Plaza overflow between Saturday afternoon and Monday morning, allowing stray animals to scatter food waste, while faded labels contaminate Engineering Quad paper recycling.',
    category: 'Waste & Sanitation',
    affectedUsers:
      'Hostel residents and campus pedestrians using courtyard walkways and outdoor plaza seating',
    reportedConsequences:
      'Littered walkways, unpleasant odors on weekends, and contaminated recyclable paper streams.',
    relatedFeedbackIds: ['FB-031', 'FB-032', 'FB-033', 'FB-034'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-031',
        excerpt: 'Trash and food-waste bins outside the Hostel Courtyard overflow every Saturday night and Sunday, attracting stray dogs that scatter wrappers across the walkway.',
        isContradictory: false,
      },
      {
        feedbackId: 'FB-032',
        excerpt: 'Engineering Quad recycling stations have faded labels so wet food cups get dumped into paper recycling',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'Medium',
    urgencyLevel: 'Low',
    aiConfidenceNote:
      '4 corroborating reports clearly identify the Sunday collection gap and open-top bin vulnerability.',
    informationGaps: [
      'Current sanitation vendor contract terms regarding Sunday morning pickup rounds.',
    ],
    suggestedSuccessMetrics: [
      'Weekend overflowing-bin reports per month',
      'Clean-stream pass rate of Engineering Quad paper recycling bins',
    ],
    requiresFurtherInvestigation: false,
    interventions: [
      {
        title: 'Add Sunday Morning Pickup Round, Animal-Proof Lids & High-Contrast Bin Decals',
        problemAddressed: 'Weekend waste accumulation, animal scavenging, and wet/dry sorting confusion.',
        effort: 'Medium',
        potentialImpact: 'Medium',
        dependencies: ['Sanitation schedule adjustment', 'Swing-lid/pedal bin covers'],
        responsibleRole: 'Campus Housekeeping & Sustainability Cell',
        implementationSteps: [
          'Schedule one Sunday 8:00 AM collection sweep covering Hostel Courtyard, Block C, and Student Plaza.',
          'Replace open-top food waste receptacles outside hostels with heavy latched/covered lids.',
          'Apply weatherproof graphic wet/dry decals on Engineering Quad bins.',
        ],
        expectedOutcome: 'Estimated cleaner weekend walkways and reduced recycling contamination.',
        successMetric: 'Sunday/Monday morning litter complaints',
        infoRequiredBeforeImpl: ['Count of uncovered outdoor bins around hostels'],
      },
    ],
  },
  {
    title: 'Missing Allergen Disclosures on Central Canteen Daily Specials Board',
    problemDescription:
      'A distinct food-safety report (separate from queue wait times) notes that Central Canteen daily specials do not display peanut, sesame, or dairy allergen warnings, creating health risk for students with severe food allergies.',
    category: 'Dining & Canteen',
    affectedUsers:
      'Students and staff with severe nut, sesame, dairy, or other food allergies',
    reportedConsequences:
      'Risk of accidental allergen exposure or inability to dine safely.',
    relatedFeedbackIds: ['FB-035'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-035',
        excerpt: 'Central Canteen daily specials board does not list peanut, sesame, or dairy allergens; a friend with a severe nut allergy had to guess ingredients.',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'High',
    urgencyLevel: 'High',
    aiConfidenceNote:
      'Single-source report so far, but clearly describes a high-severity health/safety gap distinct from canteen queue complaints.',
    informationGaps: [
      'Whether kitchen staff maintain standardized ingredient sheets for daily rotating specials.',
      'Whether cross-contamination controls exist in food prep areas.',
    ],
    suggestedSuccessMetrics: [
      'Percentage of daily menu items displaying verified top-8 allergen icons',
    ],
    requiresFurtherInvestigation: true,
    interventions: [
      {
        title: 'Mandate Standardized Allergen Icon Cards on All Daily Menu Boards',
        problemAddressed: 'Missing nut, sesame, and dairy disclosures on rotating canteen specials.',
        effort: 'Low',
        potentialImpact: 'High',
        dependencies: ['Kitchen recipe ingredient audit'],
        responsibleRole: 'Canteen Manager & Campus Health Officer',
        implementationSteps: [
          'Inspect canteen kitchen ingredient logs for daily specials to verify allergen presence.',
          'Provide laminated allergen checklist tags (Peanuts, Tree Nuts, Dairy, Sesame, Soy, Gluten) for the menu board.',
        ],
        expectedOutcome: 'Estimated clear, visible allergen transparency for diners.',
        successMetric: 'Daily specials compliance check (%)',
        infoRequiredBeforeImpl: ['Confirm kitchen cross-contact practices before making "allergen-free" claims'],
      },
    ],
  },
  {
    title: 'Unconfirmed Rumor Regarding Chemistry Building Bicycle Rack Removal',
    problemDescription:
      'A single uncertain submission asks whether the covered bicycle rack behind the Chemistry building will be removed next month and whether alternative parking is planned.',
    category: 'Safety & Transport',
    affectedUsers: 'Student and staff cyclists parking near the Chemistry building',
    reportedConsequences: 'Unknown : based on an unverified rumor with no confirmed disruption yet.',
    relatedFeedbackIds: ['FB-036'],
    contradictoryFeedbackIds: [],
    evidenceExcerpts: [
      {
        feedbackId: 'FB-036',
        excerpt: 'Heard a rumor that the covered bicycle rack behind the Chemistry building might be removed next month - not sure if that is confirmed',
        isContradictory: false,
      },
    ],
    reportedImpactLevel: 'Unknown',
    urgencyLevel: 'Low',
    aiConfidenceNote:
      'Low confidence: single uncorroborated rumor; requires factual check with Campus Planning before planning any intervention.',
    informationGaps: [
      'Confirm with Campus Estates whether any construction or rack removal is actually scheduled behind Chemistry.',
    ],
    suggestedSuccessMetrics: [
      'Published clarification notice to campus cyclists if relocation is planned',
    ],
    requiresFurtherInvestigation: true,
    interventions: [
      {
        title: 'Verify Construction Plans with Campus Estates & Post Clarification Notice',
        problemAddressed: 'Uncertainty around Chemistry building bicycle parking availability.',
        effort: 'Low',
        potentialImpact: 'Low',
        dependencies: ['Confirmation from Campus Estates'],
        responsibleRole: 'Campus Transport & Estates Liaison',
        implementationSteps: [
          'Check upcoming minor works schedule behind the Chemistry building.',
          'If relocation is planned, designate adjacent temporary racks prior to removal; otherwise dispel rumor.',
        ],
        expectedOutcome: 'Clear factual communication without premature expenditure.',
        successMetric: 'Confirmation published (Yes/No)',
        infoRequiredBeforeImpl: ['Verify whether any work order actually exists'],
      },
    ],
  },
];

export function buildDemoSampleAnalysis(): {
  opportunities: OpportunityCluster[];
  interventions: InterventionItem[];
  impactTrackers: ImpactMetricTracker[];
  summaryNarrative: string;
} {
  const validated = validateAndGroundAiAnalysis(
    RAW_SAMPLE_OPPORTUNITIES,
    DEMO_FEEDBACK_ITEMS,
    'sample_demo'
  );

  // Set realistic initial demo statuses on two interventions to showcase Intervention Planner & Impact Tracker
  const interventions = validated.interventions.map((item) => {
    if (item.id === 'INT-01-1') {
      return {
        ...item,
        status: 'In Progress' as const,
        isSelected: true,
        userNotes:
          '[Demo Illustration] Captive portal session timeout updated on test subnet; Floors 3–4 AP hardware audit scheduled for Thursday.',
      };
    }
    if (item.id === 'INT-02-1') {
      return {
        ...item,
        status: 'Planned' as const,
        isSelected: true,
        userNotes:
          '[Demo Illustration] Registrar notified to move Section B seminar to Science 104 while elevator vendor delivers controller board.',
      };
    }
    return item;
  });

  // Provide 3 demo trackers:
  // 1) One with baseline + 1 follow-up (labeled Demo Illustration) to show visual before/after comparison
  // 2) One with baseline only (needs follow-up measurement before impact can be evaluated)
  // 3) One with no baseline yet (demonstrates guidance on what needs to be recorded first)
  const impactTrackers: ImpactMetricTracker[] = [
    {
      id: 'TRK-DEMO-01',
      opportunityId: 'OPP-01',
      interventionId: 'INT-01-1',
      metricName: 'Evening Packet Loss on Hostel Upper Floors (Demo Illustration)',
      unit: '% packet loss',
      desiredDirection: 'decrease',
      baseline: {
        id: 'MSR-01',
        value: 38,
        date: '2026-10-18',
        notes: 'Illustrative demo baseline sampled at 9:30 PM in North Hostel Block B Floor 3 prior to subnet lease adjustment.',
      },
      followUps: [
        {
          id: 'MSR-02',
          value: 19,
          date: '2026-10-24',
          notes: 'Illustrative interim measurement after portal lease fix; AP hardware upgrade on Floor 3–4 still pending.',
        },
      ],
      isDemoIllustration: true,
      updatedAt: '2026-10-24T22:00:00.000Z',
    },
    {
      id: 'TRK-DEMO-02',
      opportunityId: 'OPP-03',
      interventionId: 'INT-03-1',
      metricName: 'Central Canteen Peak Lunch Queue Wait Time (Demo Illustration)',
      unit: 'minutes',
      desiredDirection: 'decrease',
      baseline: {
        id: 'MSR-03',
        value: 31,
        date: '2026-10-21',
        notes: 'Illustrative demo baseline timed at 12:45 PM before Express Grab-and-Go lane rollout.',
      },
      followUps: [],
      isDemoIllustration: true,
      updatedAt: '2026-10-21T13:30:00.000Z',
    },
    {
      id: 'TRK-DEMO-03',
      opportunityId: 'OPP-02',
      interventionId: 'INT-02-1',
      metricName: 'Hours to Relocate Courses Affected by Elevator Outage',
      unit: 'hours',
      desiredDirection: 'decrease',
      baseline: null,
      followUps: [],
      isDemoIllustration: true,
      updatedAt: '2026-10-23T10:00:00.000Z',
    },
  ];

  return {
    opportunities: validated.opportunities,
    interventions,
    impactTrackers,
    summaryNarrative:
      'Illustrative sample synthesis of 36 fictional campus feedback entries: identified 6 corroborated recurring needs (led by upper-floor hostel Wi-Fi dropouts, Science Annex accessibility lockout, and midday canteen payment queues) alongside 2 single-report items separated for verification (canteen allergen labeling and an unconfirmed bike rack rumor).',
  };
}
