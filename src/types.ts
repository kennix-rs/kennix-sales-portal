/**
 * Sales CRM domain. A journey reaches Sales from Telesales with a fixed Sales meeting
 * (DOMAIN.md §4, §8); Sales takes it from meeting to site visit, the architect's quotation,
 * negotiation and the token payment that closes it.
 */

export type Role = 'executive' | 'team_lead' | 'manager'

/** Pipeline stages, in order (whiteboard "Pipeline by stage"). */
export type SalesStage =
  | 'In Process'
  | 'Meeting Scheduled'
  | 'Meeting Done'
  | 'SV Scheduled'
  | 'SV Done'
  | 'Interested'
  | 'Under Negotiation'
  | 'Closed'
  | 'Dead'
  /** Sent back to Telesales: not interested before the meeting, or 5 unanswered attempts in 3 days. */
  | 'Sales Rejected'

/** Sub-dispositions shown under "In Process" when the customer can't be reached or asks for later. */
export type InProcessReason = 'RNR' | 'Plan Postponed' | 'Call Back Later' | 'Switch Off'

/** What a Sales call ended with. The In Process reasons put the journey "In Process". */
export type CallOutcome = InProcessReason | 'Meeting Confirmed' | 'Rescheduled' | 'Spoke to Customer' | 'Not Interested'

/** Intake tab the journey arrived in (Telesales `salesQueue`). */
export type SalesQueue = 'New Leads' | 'New Lead for Land Sourcing'

export type Priority = 'High' | 'Medium' | 'Low'
export type CustomerType = 'Individual' | 'Group of People'
export type GroupKind = 'Family' | 'Friends' | 'Community'
export type LandStatus = 'Own Land' | 'Need to Source Land'
/** Sales captures a finer property type than Telesales ("Individual House (1 Floor / Villa)"). */
export type SalesPropertyType = 'Independent House' | 'Duplex Villa' | 'Standalone Apartment' | 'Commercial'
export type RegistrationStatus = 'Registration to be done' | 'In process of sourcing'
export type PaymentPlan = 'Self' | 'Loan' | '50:50'
export type NextAction = 'Site Visit' | 'Follow-up Meeting' | 'Follow-up Call' | 'Quotation'
export type DecisionMaker = 'Self' | 'Dependent'
/** The website's construction packages (Packages page; backend masterdata `Package`). */
export type PackageType = 'Basic' | 'Standard' | 'Luxury' | 'Ultra Luxury'
export type RoadWidth = '20 ft' | '30 ft' | '40 ft' | '60 ft' | '100 ft'
export type YesNo = 'Yes' | 'No'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  initials: string
  managerId?: string
}

export interface RequirementLocation {
  name: string
  pincode: string
}

/** The editable customer box at the top of the meeting form. */
export interface CustomerDetails {
  name: string
  mobile: string
  alternateMobile: string
  email: string
  location: string
  city: string
  state: string
  pincode: string
}

/** Read-only summary of what Telesales captured (DOMAIN.md §4 qualification). */
export interface TelesalesBrief {
  owner: string
  sentAt: string
  customerType: 'Individual' | 'Group / Community'
  propertyType: string
  requirement: string
  budget: string
  size: string
  timeline: string
  landStatus: LandStatus
  locations: RequirementLocation[]
  source: string
}

export interface LandSourcingStatus {
  reference: string
  status: 'Submitted' | 'Land Identified'
  submittedAt: string
  completedAt?: string
  /** The option Land Sourcing selected, once land is identified. */
  selectedOption?: { title: string; location: string; area: string; askingPrice: string }
}

/** "Meeting fixed lead flow" whiteboard: details Sales confirms or captures at the meeting. */
export interface MeetingProfile {
  customerType: CustomerType | ''
  groupKind: GroupKind | ''
  landStatus: LandStatus | ''
  propertyType: SalesPropertyType | ''
  plotRegistered: YesNo | ''
  registrationStatus: RegistrationStatus | ''
  govtApproval: YesNo | ''
  budget: string
  paymentPlan: PaymentPlan | ''
  nextAction: NextAction | ''
  plotSize: string
  dimensions: string
  approxBuiltArea: string
  decisionMaker: DecisionMaker | ''
  /** Voice notes: asked after plot size and dimensions. */
  packageType: PackageType | ''
}

/** "Property details" whiteboard: what the site visit must record. */
export interface SiteVisitReport {
  actualSiteVisited: YesNo | ''
  roadAccess: YesNo | ''
  roadFacingWidth: string
  roadWidth: RoadWidth | ''
  photos: string[]
  propertyDocuments: string[]
  soilTest: 'OK' | 'Not OK' | ''
  borewell: YesNo | ''
}

export interface GeoStamp {
  at: string
  lat: number
  lng: number
  /** True when the preview simulated the position instead of reading the device GPS. */
  simulated: boolean
}

export type VisitKind = 'Sales Meeting' | 'Follow-up Meeting' | 'Site Visit'
export type VisitStatus = 'Scheduled' | 'Completed' | 'Cancelled'

/** A trip to the customer. Start, arrival and completion are stamped with the location. */
export interface Visit {
  id: string
  kind: VisitKind
  /** Who fixed it: Telesales fixes the first Sales meeting (shown as "T" on the calendar). */
  fixedBy: 'Telesales' | 'Sales'
  scheduledAt: string
  place: string
  status: VisitStatus
  ownerId: string
  /** Sales reconfirms the meeting with the customer before going (whiteboard). */
  confirmedAt?: string
  started?: GeoStamp
  arrived?: GeoStamp
  completed?: GeoStamp
}

export type ClaimStatus = 'Pending Approval' | 'Approved' | 'Rejected'

/** Travel allowance worked out from a completed visit's location stamps. */
export interface TravelClaim {
  id: string
  visitId: string
  journeyId: string
  ownerId: string
  date: string
  oneWayKm: number
  claimKm: number
  amount: number
  status: ClaimStatus
  decidedBy?: string
  decidedAt?: string
  note?: string
}

export interface CallLog {
  id: string
  at: string
  outcome: CallOutcome
  notes: string
  employee: string
}

export type FeedbackTeam = 'Telesales' | 'Sales' | 'Land Sourcing'

/** The journey's running feedback thread, continued from Telesales (DOMAIN.md §8). */
export interface FeedbackComment {
  id: string
  text: string
  author: string
  team: FeedbackTeam
  createdAt: string
  outcome?: CallOutcome
}

export type TaskType = 'Reconfirm Meeting' | 'Call' | 'Follow-up Call' | 'Quotation' | 'Architect Call' | 'Handover Call'
export type TaskStatus = 'Open' | 'Done'

export interface Task {
  id: string
  journeyId: string
  type: TaskType
  title: string
  dueAt: string
  status: TaskStatus
  ownerId: string
}

/**
 * Interested → Architecture: the architect gets the client's details, takes the requirements and
 * uploads a quotation (a rough estimate: the actual price may vary ±20%). Sales shares it with the
 * client on WhatsApp from the CRM, and the journey moves to Under Negotiation.
 */
export interface ArchitectureStep {
  architect: string
  callAt: string
  quotation?: { number: string; amount: number; fileName: string; uploadedBy: string; uploadedAt: string }
  /** When Sales shared the quotation with the client. */
  shared?: { at: string; via: 'WhatsApp'; by: string }
}

/** Closed: the customer pays the token amount, then Sales fixes a handover call with the architect. */
export interface Closing {
  tokenAmount: number
  paidAt: string
  paymentReference: string
  handoverCallAt: string
}

export interface Activity {
  id: string
  type: string
  description: string
  actor: string
  createdAt: string
}

export interface SalesLead {
  journeyId: string
  /** Sales handoff reference, KX-SH-<year>-<number>. */
  reference: string
  queue: SalesQueue
  ownerId: string
  priority: Priority
  stage: SalesStage
  inProcessReason?: InProcessReason
  /** Stage before "In Process", to return to once the customer is reached. */
  resumeStage?: SalesStage
  /** Set when Sales sends the journey back to Telesales ("Sales rejected"). */
  returnedToTelesales?: { at: string; reason: string; attempts: number; by: string }
  receivedAt: string
  customer: CustomerDetails
  telesales: TelesalesBrief
  landSourcing?: LandSourcingStatus
  profile: MeetingProfile
  siteVisit: SiteVisitReport
  visits: Visit[]
  calls: CallLog[]
  feedback: FeedbackComment[]
  architecture?: ArchitectureStep
  closing?: Closing
  deadReason?: string
  activities: Activity[]
}

/** Bell alert for Team Leads and Managers when a journey reaches a key stage. */
export interface StageAlert {
  id: string
  journeyId: string
  customer: string
  stage: SalesStage
  actor: string
  ownerId: string
  at: string
  /** User IDs that have read it. */
  readBy: string[]
}

export interface SalesState {
  alerts: StageAlert[]
  leads: SalesLead[]
  tasks: Task[]
  claims: TravelClaim[]
  assignmentCursor: number
}
