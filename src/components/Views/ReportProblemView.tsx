import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  MapPin,
  Megaphone,
  Paperclip,
  Shield,
  Trash2,
  Upload,
} from "../Common/Icons";
import { DEFAULT_CAMPUS_CENTER } from '../../data/platformDemoData';
import { useI18n } from '../../i18n/I18nContext';
import type {
  CategoryRoutingRule,
  ComplaintAttachment,
  ComplaintCategory,
  ComplaintPreferences,
  ComplaintRecord,
  Department,
  UrgencyLevel,
  UserAccount,
} from '../../types/needmap';
import { formatBytes, MAX_ATTACHMENTS_PER_STAGE, validateAndProcessUpload } from '../../utils/fileUpload';
import { routeComplaintToDepartment } from '../../utils/routingEngine';
import { LeafletMapCanvas } from '../Common/LeafletMapCanvas';

interface ReportProblemViewProps {
  activeAccount: UserAccount;
  departments: Department[];
  routingRules: CategoryRoutingRule[];
  complaintPrefs: ComplaintPreferences;
  onSubmitComplaint: (params: {
    complaint: Omit<ComplaintRecord, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>;
    alsoAddToFeedbackInbox: boolean;
  }) => { ok: boolean; createdId?: string; error?: string };
  onOpenMyComplaints: (complaintId?: string) => void;
  existingComplaints?: ComplaintRecord[];
}

const ALL_CATEGORIES: ComplaintCategory[] = [
  'water_supply',
  'electricity',
  'roads',
  'sanitation',
  'waste_collection',
  'public_facilities',
  'accessibility',
  'transport',
  'wifi_it',
  'education',
  'dining_canteen',
  'other',
];

const AREA_ZONES = [
  'Main Academic Block',
  'Science Annex',
  'East Library',
  'North Hostel',
  'East Hostel',
  'Central Canteen',
  'South Quad',
  'Main Gate Corridor',
  'Admin Block',
  'Other / Off-Campus',
];

export const ReportProblemView: React.FC<ReportProblemViewProps> = ({
  activeAccount,
  departments,
  routingRules,
  complaintPrefs,
  onSubmitComplaint,
  onOpenMyComplaints,
  existingComplaints = [],
}) => {
  const { t, tr, tCategory, tPriority } = useI18n();

  const [step, setStep] = useState<'form' | 'review' | 'submitted'>('form');
  const [confirmedReferenceId, setConfirmedReferenceId] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState<ComplaintCategory>('electricity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Medium');
  const [incidentDateTime, setIncidentDateTime] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );

  // Location fields
  const [locationMode, setLocationMode] = useState<'map_pin' | 'address_only'>('map_pin');
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(
    DEFAULT_CAMPUS_CENTER
  );
  const [coordSource, setCoordSource] = useState<'pin_selected' | 'gps_detected'>('pin_selected');
  const [address, setAddress] = useState('');
  const [areaZone, setAreaZone] = useState(complaintPrefs.defaultAreaZone || AREA_ZONES[0]);

  // Privacy & Contact
  const [isAnonymous, setIsAnonymous] = useState(complaintPrefs.defaultAnonymous);
  const [contactName, setContactName] = useState(activeAccount.name);
  const [contactEmail, setContactEmail] = useState(activeAccount.email);
  const [contactPhone, setContactPhone] = useState(activeAccount.phone || '');
  const [preferredContactMethod, setPreferredContactMethod] = useState<
    'in_app' | 'email' | 'phone' | 'none'
  >(complaintPrefs.defaultContactMethod);

  // Attachments & AI link
  const [attachments, setAttachments] = useState<ComplaintAttachment[]>([]);
  const [attachmentVisibility, setAttachmentVisibility] = useState<
    'reporter_and_staff' | 'public_summary'
  >('reporter_and_staff');
  const [alsoAddToFeedbackInbox, setAlsoAddToFeedbackInbox] = useState(
    complaintPrefs.sharePublicSummaryByDefault
  );

  // Validation & Upload messages
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const routingPreview = useMemo(
    () =>
      routeComplaintToDepartment({
        category,
        urgency,
        departments,
        routingRules,
      }),
    [category, urgency, departments, routingRules]
  );

  // Real-time duplicate complaint detection
  const potentialDuplicates = useMemo(() => {
    if (!existingComplaints.length || (!title.trim() && !description.trim())) return [];
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'need', 'there', 'please', 'problem', 'issue']);
    const rawTokens = (title + ' ' + description)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));
    const tokenSet = new Set(rawTokens);
    if (tokenSet.size === 0) return [];

    return existingComplaints
      .filter((c) => {
        if (c.status === 'closed' || c.status === 'cancelled' || c.status === 'rejected') {
          return false;
        }
        const sameCategory = c.category === category;
        const sameZone = Boolean(
          c.location?.areaZone && areaZone && c.location.areaZone.toLowerCase() === areaZone.toLowerCase()
        );

        const cTokens = (c.title + ' ' + c.description)
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 4);

        let overlap = 0;
        for (const tok of cTokens) {
          if (tokenSet.has(tok)) overlap++;
        }

        return (sameCategory && sameZone && overlap >= 1) || (sameCategory && overlap >= 2) || overlap >= 3;
      })
      .slice(0, 3);
  }, [existingComplaints, title, description, category, areaZone]);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    if (attachments.length + files.length > MAX_ATTACHMENTS_PER_STAGE) {
      setUploadError(
        tr(
          `Maximum ${MAX_ATTACHMENTS_PER_STAGE} files allowed per submission.`,
          `ஒரு புகாருக்கு அதிகபட்சம் ${MAX_ATTACHMENTS_PER_STAGE} கோப்புகள் மட்டுமே இணைக்க முடியும்.`
        )
      );
      return;
    }

    setIsUploading(true);
    const nextList = [...attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await validateAndProcessUpload({
        file,
        actorRole: activeAccount.role,
        actorName: isAnonymous ? 'Anonymous Citizen' : activeAccount.name,
        stage: 'submission',
        visibility: attachmentVisibility,
      });

      if (!res.ok || !res.attachment) {
        setUploadError(res.error || 'File upload failed.');
        break;
      }
      nextList.push(res.attachment);
    }

    setAttachments(nextList);
    setIsUploading(false);
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 6) {
      setFormError(
        tr(
          'Please enter a clear short title (at least 6 characters).',
          'தெளிவான சுருக்கமான தலைப்பை உள்ளிடவும் (குறைந்தது 6 எழுத்துகள்).'
        )
      );
      return;
    }
    if (description.trim().length < 15) {
      setFormError(
        tr(
          'Please describe the problem in at least 15 characters so staff can act effectively.',
          'துறை ஊழியர்கள் நடவடிக்கை எடுக்க குறைந்தது 15 எழுத்துகளில் விவரத்தை விவரிக்கவும்.'
        )
      );
      return;
    }
    if (address.trim().length < 4) {
      setFormError(
        tr(
          'Please enter the building, street, or landmark address.',
          'கட்டிடம், தெரு அல்லது அடையாள முகவரியை உள்ளிடவும்.'
        )
      );
      return;
    }
    if (locationMode === 'map_pin' && !pickedCoords) {
      setFormError(
        tr(
          'Click on the map to place a location pin, or switch to "Written Address Only".',
          'வரைபடத்தில் இடத்தைக் குறிக்கவும் அல்லது "எழுத்துப்பூர்வ முகவரி மட்டும்" என்பதைத் தேர்ந்தெடுக்கவும்.'
        )
      );
      return;
    }

    setStep('review');
  };

  const handleConfirmSubmit = () => {
    setFormError(null);

    const hasCoordinates = locationMode === 'map_pin' && Boolean(pickedCoords);

    const result = onSubmitComplaint({
      alsoAddToFeedbackInbox,
      complaint: {
        title: title.trim(),
        category,
        description: description.trim(),
        urgency,
        priorityTier: routingPreview.priorityTier,
        status: 'submitted',
        location: {
          hasCoordinates,
          lat: hasCoordinates ? pickedCoords!.lat : undefined,
          lng: hasCoordinates ? pickedCoords!.lng : undefined,
          address: address.trim(),
          areaZone,
          source: hasCoordinates ? coordSource : 'address_only',
        },
        incidentDateTime,
        expectedResolutionDate: routingPreview.expectedResolutionDate,
        reporterAccountId: activeAccount.id,
        isAnonymous,
        reporterDisplayName: isAnonymous ? 'Anonymous Citizen' : contactName.trim() || activeAccount.name,
        privateContactName: isAnonymous ? undefined : contactName.trim(),
        privateContactEmail: isAnonymous ? undefined : contactEmail.trim(),
        privateContactPhone: isAnonymous ? undefined : contactPhone.trim(),
        preferredContactMethod: isAnonymous ? 'in_app' : preferredContactMethod,
        assignedDepartmentId: routingPreview.departmentId,
        routingExplanation: routingPreview.rationale,
        attachments,
        isDemo: false,
      },
    });

    if (!result.ok || !result.createdId) {
      setFormError(
        result.error ||
          tr(
            'Could not save your complaint to browser storage. Please remove large attachments and retry.',
            'புகாரைச் சேமிக்க இயலவில்லை. பெரிய கோப்புகளை நீக்கிவிட்டு மீண்டும் முயற்சிக்கவும்.'
          )
      );
      return;
    }

    setConfirmedReferenceId(result.createdId);
    setStep('submitted');
  };

  const resetForAnother = () => {
    setTitle('');
    setDescription('');
    setAddress('');
    setAttachments([]);
    setConfirmedReferenceId(null);
    setStep('form');
  };

  // STEP 3: Confirmed Submission Screen (shown ONLY after actual state persistence!)
  if (step === 'submitted' && confirmedReferenceId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-sm dark:border-teal-900/60 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
          {tr('Problem Report Submitted Successfully', 'உங்கள் புகார் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {tr(
            'Save your unique reference ID below to track department updates and confirm resolution.',
            'துறை நடவடிக்கைகளைக் கண்காணிக்கவும் தீர்வை உறுதிப்படுத்தவும் கீழுள்ள குறிப்பு எண்ணைச் சேமித்துக் கொள்ளுங்கள்.'
          )}
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {tr('Official Complaint Reference ID', 'புகார் குறிப்பு எண் (Reference ID)')}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-teal-700 dark:text-teal-400 tabular-nums">
            {confirmedReferenceId}
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">
              {tr('Routed Department: ', 'ஒதுக்கப்பட்ட துறை: ')}
            </span>
            {routingPreview.departmentName} ·{' '}
            <span className="font-mono tabular-nums">
              {tr('Target SLA:', 'இலக்கு தேதி:')} {routingPreview.expectedResolutionDate}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onOpenMyComplaints(confirmedReferenceId)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            {tr('Track in My Complaints', 'எனது புகார்களில் கண்காணிக்க')}
          </button>
          <button
            type="button"
            onClick={resetForAnother}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {tr('Report Another Problem', 'மற்றொரு புகார் பதிவு செய்க')}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: Pre-Submission Review Screen
  if (step === 'review') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {tr('Review Your Report Before Submitting', 'சமர்ப்பிக்கும் முன் விவரங்களைச் சரிபார்க்கவும்')}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {tr(
                'Verify the issue summary, location, and privacy settings below.',
                'கீழுள்ள பிரச்சினை விவரம், இருப்பிடம் மற்றும் தனியுரிமை அமைப்புகளைச் சரிபார்க்கவும்.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr('Edit Details', 'விவரங்களைத் திருத்து')}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-b border-slate-100 pb-4 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {tr('Category', 'பிரிவு')}
              </span>
              <div className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {tCategory(category)}
              </div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {tr('Initial Priority & Department', 'முன்னுரிமை & துறை')}
              </span>
              <div className="mt-0.5 font-semibold text-teal-700 dark:text-teal-400">
                {tPriority(routingPreview.priorityTier)} → {routingPreview.departmentName}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tr('Problem Title & Description (Public Summary)', 'தலைப்பு & விவரம் (பொதுச் சுருக்கம்)')}
            </div>
            <h2 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {tr('Location', 'இருப்பிடம்')}
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {address} ({areaZone})
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                {locationMode === 'map_pin' && pickedCoords
                  ? `GPS Pin: ${pickedCoords.lat}, ${pickedCoords.lng}`
                  : tr('Address only (no map coordinates attached)', 'முகவரி மட்டும் (வரைபடப் புள்ளி இல்லை)')}
              </p>
            </div>

            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {tr('Privacy & Contact Visibility', 'தனியுரிமை & தொடர்பு')}
              </div>
              {isAnonymous ? (
                <p className="mt-1 text-teal-700 dark:text-teal-400 font-medium">
                  {tr(
                    'Anonymous Mode ON : Your name, email, and phone will NOT be stored on this complaint.',
                    'அடையாளம் மறைக்கப்பட்ட முறை : உங்கள் பெயர் மற்றும் தொடர்பு விவரம் பகிரப்படாது.'
                  )}
                </p>
              ) : (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {contactName} ({preferredContactMethod})  - {' '}
                  <span className="text-slate-500">
                    {tr('Visible only to you and assigned staff.', 'உங்களுக்கும் துறை அதிகாரிகளுக்கும் மட்டுமே தெரியும்.')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {tr('Supporting Files', 'இணைக்கப்பட்ட கோப்புகள்')} ({attachments.length})
              </div>
              <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300">
                {attachments.map((att) => (
                  <li key={att.id} className="font-mono text-[11px]">
                    {att.name} ({formatBytes(att.sizeBytes)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {potentialDuplicates.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900/70 dark:bg-amber-950/40">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    {t('complaint.duplicateWarning')}
                  </div>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    {t('complaint.duplicateExplanation')}
                  </p>
                  <div className="mt-2 space-y-1">
                    {potentialDuplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 border border-amber-200 dark:bg-slate-900/70 dark:border-amber-900/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                            {dup.id}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {dup.title}
                          </span>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200 uppercase">
                            {dup.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenMyComplaints(dup.id)}
                          className="font-semibold text-teal-700 hover:underline dark:text-teal-400 text-[11px]"
                        >
                          {tr('View Existing Report', 'ஏற்கெனவே உள்ள புகாரைப் பார்')} →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {formError && (
            <p className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {tr('Back to Edit', 'பின்சென்று திருத்து')}
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              {tr('Confirm & Submit Report', 'உறுதிசெய்து புகாரைச் சமர்ப்பி')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: Main Entry Form
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
          <Megaphone className="h-4 w-4" />
          <span>{tr('Citizen & Student Service Portal', 'மக்கள் மற்றும் மாணவர் புகார் தளம்')}</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          {tr('Report a Local Problem or Service Request', 'புதிய புகார் அல்லது சேவைக் கோரிக்கையைப் பதிவு செய்க')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {tr(
            'Provide clear details and pin the location on the map. Your report will be automatically routed to the responsible department with a trackable reference ID.',
            'தெளிவான விவரங்களுடன் வரைபடத்தில் இடத்தைக் குறிக்கவும். உங்கள் புகார் உரிய துறைக்குத் தானாக அனுப்பப்பட்டு கண்காணிப்பு எண் வழங்கப்படும்.'
          )}
        </p>
      </div>

      <form onSubmit={handleProceedToReview} className="space-y-6">
        {/* Card 1: Category & Description */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {tr('1. What is the problem?', '1. என்ன பிரச்சினை?')}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="report-category"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {tr('Issue Category *', 'பிரச்சினையின் பிரிவு *')}
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {tCategory(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="report-urgency"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {tr('Urgency / Safety Risk *', 'அவசர நிலை *')}
              </label>
              <select
                id="report-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="Low">{tr('Low : Minor inconvenience', 'குறைவு : சிறிய சிரமம்')}</option>
                <option value="Medium">{tr('Medium : Needs scheduled fix', 'நடுத்தரம் : பராமரிப்பு தேவை')}</option>
                <option value="High">{tr('High : Disrupts daily access/work', 'அதிகம் : அன்றாடப் பணி பாதிப்பு')}</option>
                <option value="Critical">{tr('Critical : Immediate safety/health hazard', 'மிக அவசரம் : பாதுகாப்பு ஆபத்து')}</option>
              </select>
            </div>
          </div>

          {/* Transparent Routing Preview */}
          <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-3.5 py-2.5 text-xs text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
            <span className="font-semibold">
              {tr('Automatic Department Routing: ', 'தானியங்கி துறை ஒதுக்கீடு: ')}
            </span>
            {routingPreview.departmentName} ({tr('Target date:', 'இலக்கு தேதி:')}{' '}
            <span className="font-mono">{routingPreview.expectedResolutionDate}</span>)
          </div>

          <div>
            <label
              htmlFor="report-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {tr('Short Summary Title *', 'சுருக்கமான தலைப்பு *')}
            </label>
            <input
              id="report-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr(
                'e.g., Drinking water cooler leaking on 2nd floor corridor',
                'எ.கா., இரண்டாவது தளத்தில் குடிநீர் குழாய் கசிவு'
              )}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="report-desc"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {tr('Detailed Description *', 'விரிவான விளக்கம் *')}
            </label>
            <textarea
              id="report-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr(
                'Describe what is broken or missing, when it happens, and how it affects people. Avoid typing private passwords or sensitive ID numbers in this public description.',
                'என்ன பழுது, எப்போது நிகழ்கிறது, யாரெல்லாம் பாதிக்கப்படுகிறார்கள் என்பதைத் தெளிவாக எழுதவும்.'
              )}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {potentialDuplicates.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs dark:border-amber-900/70 dark:bg-amber-950/40">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    {t('complaint.duplicateWarning')}
                  </div>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    {t('complaint.duplicateExplanation')}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {potentialDuplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/90 px-2.5 py-1.5 border border-amber-200 dark:bg-slate-900/80 dark:border-amber-900/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                            {dup.id}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                            {dup.title}
                          </span>
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200 uppercase">
                            {dup.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenMyComplaints(dup.id)}
                          className="font-semibold text-teal-700 hover:underline dark:text-teal-400 text-[11px]"
                        >
                          {tr('View Existing Report', 'ஏற்கெனவே உள்ள புகாரைப் பார்')} →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="sm:w-64">
            <label
              htmlFor="report-datetime"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {tr('When was this noticed?', 'எப்போது கண்டறியப்பட்டது?')}
            </label>
            <input
              id="report-datetime"
              type="datetime-local"
              value={incidentDateTime}
              onChange={(e) => setIncidentDateTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </section>

        {/* Card 2: Location Selection (Real Map Pin vs Honest Address-Only) */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {tr('2. Where is the problem located?', '2. பிரச்சினை எங்கே உள்ளது?')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  'Click on the street/campus map to drop a pin, use GPS, or choose address-only for online/general services.',
                  'வரைபடத்தில் சொடுக்கி இடத்தைக் குறிக்கவும், அல்லது முகவரியை மட்டும் உள்ளிடவும்.'
                )}
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setLocationMode('map_pin')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                  locationMode === 'map_pin'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-teal-600" />
                {tr('Pin on Map', 'வரைபடத்தில் குறிக்க')}
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('address_only')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  locationMode === 'address_only'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tr('Written Address Only', 'முகவரி மட்டும்')}
              </button>
            </div>
          </div>

          {locationMode === 'map_pin' && (
            <div className="space-y-2">
              <LeafletMapCanvas
                mode="picker"
                pickedCoords={pickedCoords}
                onPickCoords={(lat, lng) => {
                  setPickedCoords({ lat, lng });
                  setCoordSource('pin_selected');
                }}
                heightClassName="h-72"
              />
              {pickedCoords && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                  <span>
                    {tr('Selected Coordinates:', 'தேர்ந்தெடுக்கப்பட்ட புள்ளி:')} {pickedCoords.lat},{' '}
                    {pickedCoords.lng}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="report-address"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {tr('Building / Street / Landmark Address *', 'கட்டிடம் / தெரு / அடையாள முகவரி *')}
              </label>
              <input
                id="report-address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={tr(
                  'e.g., Near East Library Wheelchair Ramp, Ground Floor',
                  'எ.கா., கிழக்கு நூலக சாய்வுதளம் அருகில், தரைத்தளம்'
                )}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="report-zone"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {tr('Area / Service Zone', 'பகுதி / மண்டலம்')}
              </label>
              <select
                id="report-zone"
                value={areaZone}
                onChange={(e) => setAreaZone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {AREA_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Card 3: Supporting Photos & Documents */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {tr('3. Photos or Supporting Documents (Optional)', '3. புகைப்படம் அல்லது ஆவணம் (விருப்பத்தேர்வு)')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  'Accepted: JPG, PNG, WEBP, PDF (max 1.5 MB stored in local browser storage for this workspace).',
                  'அனுமதிக்கப்பட்டவை: JPG, PNG, WEBP, PDF (உங்கள் உலாவியில் பாதுகாப்பாகச் சேமிக்கப்படும்).'
                )}
              </p>
            </div>

            <select
              value={attachmentVisibility}
              onChange={(e) =>
                setAttachmentVisibility(
                  e.target.value as 'reporter_and_staff' | 'public_summary'
                )
              }
              aria-label={tr('Attachment visibility', 'இணைப்பு யாருக்குத் தெரியும்')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="reporter_and_staff">
                {tr('Visible to Assigned Staff & Me Only', 'துறை அதிகாரிகள் மற்றும் எனக்கு மட்டும்')}
              </option>
              <option value="public_summary">
                {tr('Visible on Public Issue Summary', 'பொதுச் சுருக்கத்திலும் காட்டு')}
              </option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              id="complaint-file-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => void handleFileChange(e.target.files)}
              className="sr-only"
            />
            <label
              htmlFor="complaint-file-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Upload className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              {isUploading
                ? tr('Processing file...', 'கோப்பு செயலாக்கப்படுகிறது...')
                : tr('Attach Photo or PDF', 'புகைப்படம் / PDF இணைக்க')}
            </label>
          </div>

          {uploadError && (
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400" role="alert">
              {uploadError}
            </p>
          )}

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <FileText className="h-7 w-7 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {att.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {formatBytes(att.sizeBytes)} ·{' '}
                        {att.visibility === 'public_summary'
                          ? tr('Public', 'பொது')
                          : tr('Staff Only', 'அதிகாரிகளுக்கு மட்டும்')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                    }
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                    aria-label={`Remove ${att.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Card 4: Privacy, Anonymous Option & Contact Preferences */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {tr('4. Privacy & Contact Preferences', '4. தனியுரிமை மற்றும் தொடர்பு விருப்பம்')}
          </h2>

          {/* Public vs Private Transparency Box */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Eye className="h-3.5 w-3.5 text-teal-600" />
                {tr('What is Visible on Public Issue Map', 'பொது வரைபடத்தில் தெரிபவை')}
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {tr(
                  'Issue title, category, general location, description, assigned department, and resolution status.',
                  'தலைப்பு, பிரிவு, பொது இருப்பிடம், விளக்கம், துறை மற்றும் தீர்வு நிலை மட்டுமே தெரியும்.'
                )}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Lock className="h-3.5 w-3.5 text-indigo-600" />
                {tr('What Stays Strictly Private', 'தனியுரிமையாகப் பாதுகாக்கப்படுபவை')}
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {tr(
                  'Your name, email, phone number, and staff-only attachments are hidden from other citizens.',
                  'உங்கள் பெயர், மின்னஞ்சல், தொலைபேசி எண் மற்ற பொதுமக்களுக்கு ஒருபோதும் காட்டப்படாது.'
                )}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <Shield className="h-3.5 w-3.5 text-teal-600" />
                {tr('Submit Anonymously', 'அடையாளத்தை மறைத்து புகார் அளிக்க (Anonymous)')}
              </div>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {tr(
                  'Your personal contact details will not be attached. You can still track updates and confirm resolution from this browser account.',
                  'உங்கள் பெயர் மற்றும் தொடர்பு விவரம் இணைக்கப்படாது; இருப்பினும் இந்தக் கணக்கில் நிலையைக் கண்காணிக்கலாம்.'
                )}
              </p>
            </div>
          </label>

          {!isAnonymous && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {tr('Your Name', 'உங்கள் பெயர்')}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {tr('Email (Private)', 'மின்னஞ்சல் (தனிப்பட்டது)')}
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {tr('Phone (Private)', 'தொலைபேசி (தனிப்பட்டது)')}
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {tr('Preferred Contact', 'தொடர்பு முறை')}
                </label>
                <select
                  value={preferredContactMethod}
                  onChange={(e) =>
                    setPreferredContactMethod(
                      e.target.value as 'in_app' | 'email' | 'phone' | 'none'
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="in_app">{tr('In-App Portal Updates', 'செயலி அறிவிப்பு')}</option>
                  <option value="email">{tr('Email', 'மின்னஞ்சல்')}</option>
                  <option value="phone">{tr('Phone Call / SMS', 'தொலைபேசி')}</option>
                  <option value="none">{tr('Do not contact directly', 'நேரடித் தொடர்பு வேண்டாம்')}</option>
                </select>
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={alsoAddToFeedbackInbox}
              onChange={(e) => setAlsoAddToFeedbackInbox(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span>
              {tr(
                'Also include non-identifying summary in AI Feedback Inbox to help detect recurring community patterns',
                'தொடர் சமூகப் பிரச்சினைகளைக் கண்டறிய AI கருத்துப் பெட்டியிலும் இச்சுருக்கத்தைச் சேர்க்கவும்'
              )}
            </span>
          </label>
        </section>

        {formError && (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            {formError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <Paperclip className="h-4 w-4" />
            {tr('Review Before Submitting →', 'சமர்ப்பிக்கும் முன் சரிபார்க்க →')}
          </button>
        </div>
      </form>
    </div>
  );
};
