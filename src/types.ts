// Roles and Users
export type Role = "مربی" | "سرمربی" | "سوپروایزر" | "تیم_تخصصی" | "ادمین" | "درمانگر";

export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  centerIds: string[];
  supervisorId?: string; // For tracing hierarchy
  password?: string; // Hashed password
  scope?: string; // Future scope-based access e.g., 'Center_A', 'Global'
  isActive?: boolean;
  lastLogin?: string;
}

export interface Center {
  id: string;
  name: string;
  code?: string;
  region: string;
  managerId?: string;
  isActive?: boolean;
  phone?: string;
  address?: string;
}

export interface ClassGroup {
  id: string;
  centerId: string;
  name: string;
  teacherId?: string;
  supervisorId: string;
  startDate: string;
  endDate?: string;
  capacity?: number;
}

// Child and Enrollment
export interface ChildEnrollment {
  id: string;
  childId: string;
  centerId: string;
  classId?: string;
  stage: "مهد" | "پیش‌دبستانی۱" | "پیش‌دبستانی۲";
  fromDate: string;
  toDate: string | null;
}

export type CaseStatus = "عادی" | "نیازمند_بررسی" | "در_حال_ارزیابی" | "مداخله" | "فالوآپ" | "بررسی_تخصصی" | "بسته_شده" | "بایگانی";
export type Priority = "عادی" | "متوسط" | "بالا" | "فوری";

// Child statuses per PDF section 2.6
export type ChildActiveStatus = "فعال" | "غیرفعال" | "منتقل_شده" | "خروج_از_پروژه" | "آرشیوشده";

export interface Child {
  id: string;
  childId?: string; // e.g. CH-000001
  nationalId?: string; // کد ملی (برای ورود والدین)
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "پسر" | "دختر";
  parentContactPhone: string;
  parentName?: string;
  currentCenterId: string;
  currentClassId?: string;
  currentStage: "مهد" | "پیش‌دبستانی۱" | "پیش‌دبستانی۲";
  caseStatus?: CaseStatus;
  priority?: Priority;
  activeStatus?: ChildActiveStatus;
  statusChangeReason?: string;
  statusChangeDate?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Assessment Enums — PDF section 4: standard statuses
export type AssessmentStatus =
  | "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED" | "REOPENED" | "ARCHIVED"
  | "شروع_نشده" | "در_حال_تکمیل" | "آماده_ثبت_نهایی" | "ثبت_نهایی_شده"
  | "گذشته_از_موعد" | "غیرفعال";

export type FormType = "TPCS" | "PPCS";

export interface FormVersion {
  formId: string;
  formType: FormType;
  version: string;
  status: "ACTIVE" | "INACTIVE";
  publishedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: "Assessment" | "FollowUp" | "Child" | "User" | "System" | "Case" | "Center" | "Referral";
  entityId: string;
  action: "CREATE" | "SUBMIT" | "LOCK" | "REOPEN" | "UPDATE" | "EXPORT" | "DELETE" | "ARCHIVE" | "STATUS_CHANGE";
  userId: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ipAddress?: string;
  details?: string;
}

// Assessment Responses
export interface AssessmentAnswer {
  questionId: string | number;
  answerValue: number | string | string[] | any; 
}

export interface AssessmentSubscaleScore {
  domain: "A" | "B" | "C" | "D" | "E"; // A:Emotional, B:Conduct, C:Hyperactivity, D:Peer, E:Prosocial
  score: number;
  level: "بهنجار" | "مرزی" | "نابهنجار";
}

export interface AssessmentScore {
  totalDifficultiesScore: number;
  totalLevel: "بهنجار" | "مرزی" | "نابهنجار";
  subscales: AssessmentSubscaleScore[];
}

export interface ImpactScore {
  impactScore: number; // 0-10
  level?: "پایین" | "بالا";
}

export interface TeacherAssessment {
  id: string;
  childId: string;
  teacherId: string;
  centerId: string;
  formType: "TPCS";
  formVersion: string;
  status: AssessmentStatus;
  
  // Data
  childAgeAtAssessment: string; // e.g. "4 سال و 2 ماه"
  familiarityDuration: "کمتر از یک ماه" | "۱ تا ۳ ماه" | "بیش از ۳ ماه";
  
  answers: AssessmentAnswer[]; // The 25 questions
  
  // Q26
  overallProblem: "خیر" | "بله، کمی مشکل دارد." | "بله، قطعاً مشکل دارد." | "بله، خیلی مشکل دارد.";
  problemAreas: { domain: string; severity: "کمی" | "قطعا" | "خیلی" }[];
  
  // Q27-30
  durationOfProblem?: "کمتر از یک ماه" | "۱ تا ۳ ماه" | "۴ تا ۶ ماه" | "بیش از یک سال";
  childDistressLevel?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnPeerRelations?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnLearning?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  burdenOnTeacherOrClass?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";

  // Scenario-based
  scenarios: { domain: string; scenarioId: string; selectedOption: string }[];
  
  freeTextNotes?: string; // Max 150-200 chars
  
  score?: AssessmentScore;
  
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface ParentAssessment {
  id: string;
  childId: string;
  parentId: string;
  centerId: string;
  formType: "PPCS";
  formVersion: string;
  status: AssessmentStatus;

  // Data
  childAgeAtAssessment: string;
  relationToChild: "مادر" | "پدر" | "سرپرست قانونی" | "سایر";
  
  answers: AssessmentAnswer[]; // The 25 questions

  overallProblem: "خیر" | "بله، کمی مشکل دارد." | "بله، قطعاً مشکل دارد." | "بله، خیلی مشکل دارد.";
  problemAreas: { domain: string; severity: "کمی" | "قطعا" | "خیلی" }[];
  
  durationOfProblem?: "کمتر از یک ماه" | "۱ تا ۵ ماه" | "۶ تا ۱۲ ماه" | "بیش از یک سال";
  childDistressLevel?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  
  impactOnFamilyLife?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnFriendships?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnLearning?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnLeisure?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  burdenOnFamily?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";

  // Contextual factors Qs
  importantChanges: string[]; // multi-select
  servicesUsed: string[]; // multi-select
  
  freeTextNotes?: string; // Max 50 words
  
  score?: AssessmentScore;
  impactScore?: ImpactScore;

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

// Alignment and Decision
export interface AlignmentResult {
  id: string;
  childId: string;
  teacherAssessmentId: string;
  parentAssessmentId: string;
  
  overallParentLevel: string;
  overallTeacherLevel: string;
  
  domainAlignments: {
    domain: string;
    parentLevel: string;
    teacherLevel: string;
    isAligned: boolean;
  }[];
  
  alignedAreas: string[];
  misalignedAreas: string[];
  misalignmentSeverity: "خفیف" | "قابل‌توجه";
  
  suggestedPath: "پایش عادی" | "بررسی حوزه مرزی و مشاهده هدفمند فضای کلاس" | "بررسی شرایط خانه و گفت‌وگوی سرمربی با والد" | "ورود به رصد و فالوآپ" | "بررسی فوری‌تر محیط مرکز و گزارش مربی" | "بررسی شرایط خانه و مصاحبه تکمیلی با والد" | "بررسی تکمیلی و احتمال ورود به مسیر زرد یا قرمز" | "بررسی تخصصی و تعیین شدت ارجاع";
  
  createdAt: string;
}

// Referral — PDF Section 6: Full lifecycle statuses
export type ReferralStatus =
  | "ایجاد_شده"
  | "ارسال_شده"
  | "در_انتظار_پذیرش_درمانگر"
  | "پذیرفته_شده"
  | "رد_شده"
  | "در_انتظار_تماس_با_خانواده"
  | "وقت_تعیین_شده"
  | "خانواده_مراجعه_نکرده"
  | "درمان_شروع_شده"
  | "در_حال_درمان"
  | "درمان_موقتا_متوقف"
  | "درمان_پایان_یافته"
  | "ارجاع_لغو_شده"
  | "ارجاع_به_متخصص_دیگر"
  | "نیازمند_پیگیری_پروژه";

export type RejectionReason = "ظرفیت_تکمیل" | "حوزه_تخصصی_نامرتبط" | "عدم_امکان_ارائه_خدمت" | "خارج_از_محدوده" | "سایر";

export type ContactResult = "تماس_انجام_شد" | "پاسخ_نداد" | "وقت_تعیین_شد" | "خانواده_تمایل_ندارد" | "شماره_در_دسترس_نیست" | "نیازمند_پیگیری_مجدد";

export type NonAttendanceReason = "مراجعه_نکرد" | "قطع_بعد_از_جلسه_اول" | "قطع_بعد_از_چند_جلسه" | "خانواده_نپذیرفت" | "امکان_تماس_نبود";

export type TreatmentEndStatus = "بهبود" | "بهبود_نسبی" | "بدون_تغییر" | "قطع_توسط_خانواده" | "ارجاع_به_سطح_بالاتر";

export interface ReferralDecision {
  id: string;
  childId: string;
  alignmentId?: string;
  // Who created the referral
  createdById: string;
  // Therapist info
  therapistId?: string;
  therapistName?: string;
  therapistSpecialty?: string;
  therapistCenter?: string;
  // Core info
  serviceType?: string; // نوع خدمت
  reason?: string;
  priority?: Priority;
  essentialNotes?: string; // توضیح ضروری برای درمانگر
  projectFollowUpPersonId?: string; // مسئول پیگیری پروژه
  
  status: ReferralStatus;
  rejectionReason?: RejectionReason;
  rejectionNote?: string;
  
  // Contact tracking
  contactResults: { date: string; result: ContactResult; nextFollowUpDate?: string; note?: string }[];
  
  // Treatment start
  firstSessionDate?: string;
  attendanceStatus?: "حضور_یافت" | "حضور_نیافت";
  treatmentContinues?: boolean;
  
  // Treatment progress reports (PDF 14)
  progressReports: TherapistReport[];
  
  // Non-attendance / treatment stop (PDF 17)
  nonAttendanceReason?: NonAttendanceReason;
  treatmentStopReason?: string;
  
  // Treatment end (PDF 18)
  endDate?: string;
  approximateSessions?: number;
  endStatus?: TreatmentEndStatus;
  overallTrend?: string;
  needsFollowUp?: boolean;
  needsOtherService?: boolean;
  endNotes?: string;
  nextReviewDate?: string;
  
  // Re-referral (PDF 19)
  needsReReferral?: boolean;
  
  // Therapist change (PDF 26)
  therapistChanges: { previousTherapistId: string; newTherapistId: string; date: string; reason: string }[];
  
  // Timeline (PDF 20)
  timeline: { date: string; event: string; details?: string; userId?: string }[];
  
  // Legacy fields
  finalPath?: string;
  notes?: string;
  dueDate?: string;
  lastUpdateDate?: string;
  
  createdAt: string;
}

// Therapist progress report (PDF 14)
export interface TherapistReport {
  id: string;
  referralId: string;
  reportDate: string;
  sessionCount: number;
  attendanceStatus: "منظم" | "نامنظم" | "قطع_موقت";
  treatmentStatus: "در_جریان" | "متوقف" | "پایان_یافته";
  overallTrend: "بهبود" | "بدون_تغییر" | "تشدید" | "زود_است";
  familyCooperation: "خوب" | "متوسط" | "ضعیف" | "بدون_همکاری";
  needsContinuation: boolean;
  nextReportDate?: string;
  shortDescription?: string;
  needsProjectAction: boolean;
  projectActionType?: "تماس_با_خانواده" | "هماهنگی" | "بررسی_مجدد" | "ارزیابی_تکمیلی" | "ارجاع_دیگر" | "پیگیری_عدم_مراجعه" | "سایر";
  isNew?: boolean; // Badge for new report
  viewedByProject?: boolean;
  createdAt: string;
}

// Follow-up
export interface FollowUp {
  id: string;
  childId: string;
  teacherId: string;
  formType: "FOLLOWUP";
  formVersion: string;
  followUpNumber: number;
  status: AssessmentStatus;
  
  triggerReason: "نمره مرزی یا نابهنجار در فرم مربی" | "نمره مرزی یا نابهنجار در فرم والد" | "اختلاف بین فرم والد و مربی" | "نمره تأثیر بالا" | "نگرانی ثبت‌شده مربی" | "تصمیم سرمربی یا تیم تخصصی" | "پیگیری پس از ارائه راهکار" | "پیگیری پس از شروع خدمات تخصصی" | "بروز نشانه جدید";
  previousAssessmentId?: string;
  
  targetDomains: ("نشانگان هیجانی" | "مشکلات سلوک" | "بیش‌فعالی و کمبود توجه" | "مشکلات با همتایان" | "رفتارهای جامعه‌پسند" | "مشاهده تکمیلی خارج از گویه‌های اصلی")[];
  targetBehaviors: string[];
  
  answers: AssessmentAnswer[];
  scaleScores?: { domain: string; score: number; level: "بهنجار" | "مرزی" | "نابهنجار" }[];
  
  overallChange: "خیلی بدتر شده است." | "کمی بدتر شده است." | "تقریباً مانند قبل است." | "کمی بهتر شده است." | "خیلی بهتر شده است." | "امکان مقایسه ندارم.";
  
  centerActionsDone?: string[];
  specialistServicesDone?: { service: string; status: "در حال انجام" | "انجام شده و پایان یافته" | "قطع شده" | "هنوز شروع نشده" | "وضعیت نامشخص" }[];
  
  implementationLevel: "اجرا نشده‌اند." | "به میزان کم اجرا شده‌اند." | "تا حدی اجرا شده‌اند." | "به‌طور کامل اجرا شده‌اند." | "هنوز راهکاری پیشنهاد نشده است." | "اطلاعی ندارم.";
  nonImplementationReason?: "شرایط کلاس و مرکز فراهم نبود." | "امکان همکاری خانواده فراهم نبود." | "توقف حضور نوآموز در مرکز رخ داد.";
  
  effectiveness: "خیر" | "کمی" | "زیاد" | "خیلی زیاد" | "هنوز اقدامی انجام نشده است." | "برای قضاوت زود است." | "اطلاعی ندارم.";
  
  problemStillExists?: "خیر" | "بله، به میزان کم" | "بله، به میزان قابل توجه" | "بله، به میزان زیاد";
  childDistress: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnLearning: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnPeers: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  impactOnTeacher?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  classManagementBurden?: "خیر" | "کمی" | "زیاد" | "خیلی زیاد";
  
  newBehaviorObserved: boolean;
  newBehaviorKeywords?: string[];
  newBehaviorDescription?: string;
  newBehaviorDate?: string;
  requiresImmediateReport?: boolean;
  
  freeTextNotes?: string;
  
  specialistDecision?: "پایان فالوآپ و بازگشت به پایش معمول" | "ادامه فالوآپ در همین حوزه" | "پیگیری حوزه دیگری" | "راهنمایی بیشتر مربی" | "بررسی سرمربی" | "گفت‌وگو با خانواده" | "بررسی تیم تخصصی" | "پیگیری خدمات یا ارجاع قبلی" | "نیاز به اقدام سریع";
  
  createdAt: string;
  submittedAt?: string;
}

export interface FollowUpComparison {
  id: string;
  followUpId: string;
  domain?: string;
  initialScore: number;
  followUpScore: number;
  delta: number;
  direction: "بهبود" | "تشدید" | "ثابت";
  levelBefore: string;
  levelAfter: string;
  behaviorBefore: string;
  behaviorAfter: string;
  distressBeforeAfter: string;
  functionalImpactBeforeAfter: string;
  
  resultCategory: "بهبود واضح" | "بهبود نسبی" | "بدون تغییر معنادار" | "تشدید" | "نتیجه نامشخص به‌دلیل اجرا نشدن راهکار" | "نتیجه نامشخص به‌دلیل کوتاه‌بودن مدت مداخله" | "بروز نشانه جدی";
}

// Intervention statuses per PDF section 5.6
export type InterventionStatus = "شروع_نشده" | "در_حال_انجام" | "انجام_شده" | "متوقف_شده" | "لغوشده" | "نیازمند_بازبینی";

export interface ActionItem {
  id: string;
  childId: string;
  sourceId?: string; // FollowUp ID or Alignment ID
  action: string;
  responsiblePersonId: string;
  targetDomain?: string;
  dueDate: string;
  status: "شروع_نشده" | "در_حال_انجام" | "انجام_شده" | "متوقف_شده" | "لغوشده" | "نیازمند_بازبینی";
  resultNotes?: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export interface AppData {
  users: User[];
  centers: Center[];
  classes?: ClassGroup[];
  children: Child[];
  enrollments: ChildEnrollment[];
  teacherAssessments: TeacherAssessment[];
  parentAssessments: ParentAssessment[];
  alignments: AlignmentResult[];
  referralDecisions: ReferralDecision[];
  followUps: FollowUp[];
  followUpComparisons: FollowUpComparison[];
  actionItems: ActionItem[];
  auditLogs: AuditLog[];
  formVersions: FormVersion[];
  permissions?: Record<string, Record<string, Record<"view" | "create" | "edit" | "delete" | "approve", boolean>>>;
}
