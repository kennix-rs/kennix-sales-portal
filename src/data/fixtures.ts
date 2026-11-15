/**
 * Sales demo data. The first 13 journeys are exactly the ones the Telesales demo sends to Sales
 * (kennix-telesales-portal fixtures, "Sent to Sales"): same IDs, customers, mobiles, cities,
 * Sales meeting times and Land Sourcing status (257, 260 and 266 have land identified, with the
 * option the Land Sourcing demo selected). Twelve earlier own-land journeys, handed over in
 * October, fill the later pipeline stages. The demo clock starts Monday 16 Nov 2026, 10:00 IST.
 */
import { CITY_POSITIONS, simulatedStamp } from '../lib/geo'
import { allowanceFor } from '../lib/rules'
import { teamReference } from '../lib/utils'
import type {
  Activity, CallLog, FeedbackComment, LandSourcingStatus, MeetingProfile, Priority, SalesLead, SalesPropertyType, SalesStage,
  SalesState, SiteVisitReport, Task, TravelClaim, User, Visit,
} from '../types'

export const PASSWORD = 'Preview@123'

export const previewUsers: User[] = [
  { id: 's-ishaan', name: 'Ishaan Bhatia', email: 'ishaan.bhatia@kennix.in', role: 'executive', title: 'Sales Executive', initials: 'IB', managerId: 's-manish' },
  { id: 's-tanvi', name: 'Tanvi Arora', email: 'tanvi.arora@kennix.in', role: 'executive', title: 'Sales Executive', initials: 'TA', managerId: 's-manish' },
  { id: 's-manish', name: 'Manish Kohli', email: 'manish.kohli@kennix.in', role: 'team_lead', title: 'Sales Team Lead', initials: 'MK', managerId: 's-rakesh' },
  { id: 's-rakesh', name: 'Rakesh Menon', email: 'rakesh.menon@kennix.in', role: 'manager', title: 'Sales Manager', initials: 'RM' },
]

const userName = (id: string) => previewUsers.find(user => user.id === id)?.name ?? id
const ist = (date: string, time = '10:00') => new Date(`${date}T${time}:00+05:30`).toISOString()
const shift = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3600_000).toISOString()

/** Telesales property type → the finer type Sales records. Sales confirms it at the meeting. */
function salesTypeFor(telesalesType: string, duplex: boolean): SalesPropertyType {
  if (telesalesType === 'Commercial Building') return 'Commercial'
  if (telesalesType === 'Standalone Apartment') return 'Standalone Apartment'
  return duplex ? 'Duplex Villa' : 'Independent House'
}

interface Row {
  journeyId: string
  name: string
  phone: string
  city: string
  pincode: string
  locality: string
  customerType: 'Individual' | 'Group / Community'
  propertyType: 'Individual House (1 Floor / Villa)' | 'Standalone Apartment' | 'Commercial Building'
  budget: string
  size: string
  timeline: string
  landStatus: 'Own Land' | 'Need to Source Land'
  meetingAt: string
  receivedAt: string
  telesalesOwner: string
  owner: string
  priority: Priority
  /** Furthest stage reached on the way to closing. */
  progress: Exclude<SalesStage, 'In Process' | 'Dead'>
  confirmed?: boolean
  inProcess?: { reason: 'Switch Off' | 'RNR' | 'Call Back Later'; at: string; nextCallAt: string; notes: string }
  dead?: { at: string; reason: string }
  landSourcing?: LandSourcingStatus
  duplex?: boolean
  siteVisitAt?: string
  quotation?: number
  overdueFollowUp?: string
}

const ORDER: Row['progress'][] = ['Meeting Scheduled', 'Meeting Done', 'SV Scheduled', 'SV Done', 'Interested', 'Under Negotiation', 'Closed']

const ls = (journeyId: string, submittedAt: string, identified?: { at: string; title: string; location: string; area: string; askingPrice: string }): LandSourcingStatus => ({
  reference: teamReference('LS', journeyId),
  status: identified ? 'Land Identified' : 'Submitted',
  submittedAt,
  ...(identified ? { completedAt: identified.at, selectedOption: { title: identified.title, location: identified.location, area: identified.area, askingPrice: identified.askingPrice } } : {}),
})

const rows: Row[] = [
  // --- Sent by the Telesales demo (meeting times from Telesales) ---
  { journeyId: 'KX-2026-000244', name: 'Neha Kapoor', phone: '+91 9810052173', city: 'Zirakpur', pincode: '140603', locality: 'VIP Road', customerType: 'Individual', propertyType: 'Commercial Building', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-10', '11:30'), receivedAt: '2026-10-27T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'Medium', progress: 'Meeting Done', landSourcing: ls('KX-2026-000244', '2026-10-27T10:30:00.000Z') },
  { journeyId: 'KX-2026-000245', name: 'Sandeep Gill', phone: '+91 9810069564', city: 'Panchkula', pincode: '134109', locality: 'Sector 20', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹3–4 Cr', size: '3,000–3,500 sq ft', timeline: 'Immediate', landStatus: 'Own Land', meetingAt: ist('2026-11-11', '12:00'), receivedAt: '2026-10-30T10:30:00.000Z', telesalesOwner: 'Priya Singh', owner: 's-tanvi', priority: 'High', progress: 'SV Done', duplex: true, siteVisitAt: ist('2026-11-13', '11:00'), overdueFollowUp: ist('2026-11-15', '12:00') },
  { journeyId: 'KX-2026-000248', name: 'Rohan Khanna', phone: '+91 9810121737', city: 'Delhi NCR', pincode: '110001', locality: 'Connaught Place', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-12', '13:30'), receivedAt: '2026-10-31T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'Low', progress: 'Meeting Done', landSourcing: ls('KX-2026-000248', '2026-10-31T10:30:00.000Z') },
  { journeyId: 'KX-2026-000250', name: 'Amanpreet Singh', phone: '+91 9810156519', city: 'Gurugram', pincode: '122001', locality: 'Sector 56', customerType: 'Group / Community', propertyType: 'Commercial Building', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: '1–3 months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-13', '14:00'), receivedAt: '2026-11-02T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'Medium', progress: 'Meeting Scheduled', confirmed: true, landSourcing: ls('KX-2026-000250', '2026-11-02T10:30:00.000Z'), inProcess: { reason: 'RNR', at: ist('2026-11-13', '13:15'), nextCallAt: ist('2026-11-16', '12:00'), notes: 'Customer did not answer before the meeting; reached the office but no one available.' } },
  { journeyId: 'KX-2026-000251', name: 'Sneha Joshi', phone: '+91 9810173910', city: 'Mohali', pincode: '160055', locality: 'Sector 82, Aerocity', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹3–4 Cr', size: '3,000–3,500 sq ft', timeline: '3–6 months', landStatus: 'Own Land', meetingAt: ist('2026-11-14', '15:30'), receivedAt: '2026-11-04T10:30:00.000Z', telesalesOwner: 'Priya Singh', owner: 's-ishaan', priority: 'High', progress: 'SV Scheduled', siteVisitAt: ist('2026-11-18', '11:00') },
  { journeyId: 'KX-2026-000256', name: 'Aditya Rao', phone: '+91 9810260865', city: 'Ludhiana', pincode: '141001', locality: 'Ferozepur Road', customerType: 'Individual', propertyType: 'Commercial Building', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-15', '16:00'), receivedAt: '2026-11-08T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'Medium', progress: 'Meeting Done', landSourcing: ls('KX-2026-000256', '2026-11-08T10:30:00.000Z') },
  { journeyId: 'KX-2026-000257', name: 'Pooja Malhotra', phone: '+91 9810278256', city: 'Kharar', pincode: '140301', locality: 'Sunny Enclave', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹3–4 Cr', size: '3,000–3,500 sq ft', timeline: 'Immediate', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-16', '10:30'), receivedAt: '2026-11-09T10:30:00.000Z', telesalesOwner: 'Priya Singh', owner: 's-ishaan', priority: 'High', progress: 'Meeting Scheduled', confirmed: true, landSourcing: ls('KX-2026-000257', '2026-11-09T10:30:00.000Z', { at: '2026-11-12T09:30:00.000Z', title: 'Kharar residential plot', location: 'Sunny Enclave, Kharar', area: '2300 sq ft', askingPrice: '₹127 lakh' }) },
  { journeyId: 'KX-2026-000260', name: 'Deepak Yadav', phone: '+91 9810330429', city: 'Gurugram', pincode: '122001', locality: 'Golf Course Extension', customerType: 'Group / Community', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-17', '11:00'), receivedAt: '2026-10-25T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'Low', progress: 'Meeting Scheduled', landSourcing: ls('KX-2026-000260', '2026-10-25T10:30:00.000Z', { at: '2026-10-28T09:30:00.000Z', title: 'Gurugram residential plot', location: 'Golf Course Extension, Gurugram', area: '2425 sq ft', askingPrice: '₹135 lakh' }) },
  { journeyId: 'KX-2026-000264', name: 'Varun Sehgal', phone: '+91 9810399993', city: 'Zirakpur', pincode: '140603', locality: 'Patiala Road', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹4 Cr+', size: '3,500+ sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-19', '13:00'), receivedAt: '2026-10-29T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'High', progress: 'Meeting Scheduled', landSourcing: ls('KX-2026-000264', '2026-10-29T10:30:00.000Z') },
  { journeyId: 'KX-2026-000266', name: 'Rajiv Khurana', phone: '+91 9810434775', city: 'Ludhiana', pincode: '141001', locality: 'Ferozepur Road', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '1–3 months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-20', '14:30'), receivedAt: '2026-10-31T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'Low', progress: 'Meeting Scheduled', landSourcing: ls('KX-2026-000266', '2026-10-31T10:30:00.000Z', { at: '2026-11-03T09:30:00.000Z', title: 'Ludhiana residential plot', location: 'Ferozepur Road, Ludhiana', area: '2675 sq ft', askingPrice: '₹151 lakh' }), inProcess: { reason: 'Call Back Later', at: ist('2026-11-15', '17:10'), nextCallAt: ist('2026-11-16', '17:00'), notes: 'Customer travelling; asked to call back Monday evening to confirm the meeting.' } },
  { journeyId: 'KX-2026-000270', name: 'Arnav Chopra', phone: '+91 9810504339', city: 'Gurugram', pincode: '122001', locality: 'Sector 65', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹4 Cr+', size: '3,500+ sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-11-22', '16:30'), receivedAt: '2026-11-05T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'High', progress: 'Meeting Scheduled' },
  { journeyId: 'KX-2026-000272', name: 'Jayant Kumar', phone: '+91 9810539121', city: 'New Chandigarh', pincode: '140901', locality: 'Mullanpur', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '6+ months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-23', '10:00'), receivedAt: '2026-11-06T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'Low', progress: 'Meeting Scheduled', landSourcing: ls('KX-2026-000272', '2026-11-06T10:30:00.000Z') },
  { journeyId: 'KX-2026-000278', name: 'Lakshay Gupta', phone: '+91 9810643467', city: 'Delhi NCR', pincode: '110001', locality: 'Karol Bagh', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '1–3 months', landStatus: 'Need to Source Land', meetingAt: ist('2026-11-24', '11:30'), receivedAt: '2026-10-25T10:30:00.000Z', telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'Low', progress: 'Meeting Scheduled', landSourcing: ls('KX-2026-000278', '2026-10-25T10:30:00.000Z') },
  // --- Earlier own-land journeys, handed over in October ---
  { journeyId: 'KX-2026-000196', name: 'Gurleen Kaur', phone: '+91 9876500196', city: 'Mohali', pincode: '160062', locality: 'Sector 70', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: 'Immediate', landStatus: 'Own Land', meetingAt: ist('2026-10-08', '11:00'), receivedAt: ist('2026-10-03', '16:00'), telesalesOwner: 'Priya Singh', owner: 's-ishaan', priority: 'High', progress: 'Closed', siteVisitAt: ist('2026-10-11', '11:00'), quotation: 2_45_00_000 },
  { journeyId: 'KX-2026-000201', name: 'Manav Sethi', phone: '+91 9876500201', city: 'Panchkula', pincode: '134112', locality: 'Sector 21', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹3–4 Cr', size: '3,000–3,500 sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-10-10', '12:00'), receivedAt: ist('2026-10-05', '15:00'), telesalesOwner: 'Arjun Nair', owner: 's-tanvi', priority: 'High', progress: 'Closed', duplex: true, siteVisitAt: ist('2026-10-14', '10:30'), quotation: 3_40_00_000 },
  { journeyId: 'KX-2026-000205', name: 'Ritu Bansal', phone: '+91 9876500205', city: 'Zirakpur', pincode: '140603', locality: 'Dhakoli', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1.5–2 Cr', size: '2,000–2,500 sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-10-15', '11:30'), receivedAt: ist('2026-10-09', '17:00'), telesalesOwner: 'Priya Singh', owner: 's-ishaan', priority: 'Medium', progress: 'Under Negotiation', siteVisitAt: ist('2026-10-20', '11:00'), quotation: 1_85_00_000, overdueFollowUp: ist('2026-11-14', '11:00') },
  { journeyId: 'KX-2026-000209', name: 'Kunal Ahuja', phone: '+91 9876500209', city: 'Gurugram', pincode: '122002', locality: 'DLF Phase 4', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹4 Cr+', size: '3,500+ sq ft', timeline: 'Immediate', landStatus: 'Own Land', meetingAt: ist('2026-10-17', '15:00'), receivedAt: ist('2026-10-11', '12:00'), telesalesOwner: 'Arjun Nair', owner: 's-manish', priority: 'High', progress: 'Under Negotiation', duplex: true, siteVisitAt: ist('2026-10-22', '12:00'), quotation: 4_60_00_000 },
  { journeyId: 'KX-2026-000212', name: 'Shalini Verma', phone: '+91 9876500212', city: 'Chandigarh', pincode: '160036', locality: 'Sector 36', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-10-21', '11:00'), receivedAt: ist('2026-10-14', '16:30'), telesalesOwner: 'Priya Singh', owner: 's-tanvi', priority: 'Medium', progress: 'Interested', siteVisitAt: ist('2026-10-27', '11:30') },
  { journeyId: 'KX-2026-000215', name: 'Harsh Vardhan', phone: '+91 9876500215', city: 'Noida', pincode: '201301', locality: 'Sector 150', customerType: 'Group / Community', propertyType: 'Standalone Apartment', budget: '₹4 Cr+', size: '3,500+ sq ft', timeline: '3–6 months', landStatus: 'Own Land', meetingAt: ist('2026-10-23', '12:30'), receivedAt: ist('2026-10-16', '11:00'), telesalesOwner: 'Arjun Nair', owner: 's-manish', priority: 'High', progress: 'Interested', siteVisitAt: ist('2026-10-29', '11:00') },
  { journeyId: 'KX-2026-000218', name: 'Nidhi Saxena', phone: '+91 9876500218', city: 'Mohali', pincode: '160071', locality: 'Sector 79', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1.5–2 Cr', size: '2,000–2,500 sq ft', timeline: '3–6 months', landStatus: 'Own Land', meetingAt: ist('2026-11-03', '11:00'), receivedAt: ist('2026-10-27', '15:00'), telesalesOwner: 'Priya Singh', owner: 's-tanvi', priority: 'Medium', progress: 'SV Done', siteVisitAt: ist('2026-11-09', '10:30') },
  { journeyId: 'KX-2026-000222', name: 'Mohit Grover', phone: '+91 9876500222', city: 'Kharar', pincode: '140301', locality: 'Landran Road', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-11-06', '12:00'), receivedAt: ist('2026-10-30', '16:00'), telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'Medium', progress: 'SV Scheduled', siteVisitAt: ist('2026-11-17', '11:30') },
  { journeyId: 'KX-2026-000226', name: 'Prerna Dutta', phone: '+91 9876500226', city: 'Ludhiana', pincode: '141013', locality: 'South City', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1.5–2 Cr', size: '2,000–2,500 sq ft', timeline: '6+ months', landStatus: 'Own Land', meetingAt: ist('2026-11-10', '15:00'), receivedAt: ist('2026-11-02', '12:00'), telesalesOwner: 'Priya Singh', owner: 's-tanvi', priority: 'Low', progress: 'Meeting Done' },
  { journeyId: 'KX-2026-000229', name: 'Vivek Thakur', phone: '+91 9876500229', city: 'Panchkula', pincode: '134109', locality: 'Sector 26', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: 'Below ₹1 Cr', size: '1,000–1,500 sq ft', timeline: '6+ months', landStatus: 'Own Land', meetingAt: ist('2026-10-24', '11:00'), receivedAt: ist('2026-10-18', '14:00'), telesalesOwner: 'Arjun Nair', owner: 's-ishaan', priority: 'Low', progress: 'Meeting Done', dead: { at: ist('2026-10-30', '16:00'), reason: 'Budget too low for the plot size; customer will revisit next year.' } },
  { journeyId: 'KX-2026-000233', name: 'Anita Rawat', phone: '+91 9876500233', city: 'Zirakpur', pincode: '140603', locality: 'Lohgarh', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹1–1.5 Cr', size: '1,500–2,000 sq ft', timeline: '1–3 months', landStatus: 'Own Land', meetingAt: ist('2026-10-28', '12:00'), receivedAt: ist('2026-10-22', '11:30'), telesalesOwner: 'Priya Singh', owner: 's-tanvi', priority: 'Medium', progress: 'Meeting Scheduled', dead: { at: ist('2026-10-27', '18:00'), reason: 'Bought a ready-built house elsewhere before the meeting.' } },
  { journeyId: 'KX-2026-000236', name: 'Sameer Khan', phone: '+91 9876500236', city: 'Mohali', pincode: '160059', locality: 'Phase 7', customerType: 'Individual', propertyType: 'Individual House (1 Floor / Villa)', budget: '₹2–3 Cr', size: '2,500–3,000 sq ft', timeline: '3–6 months', landStatus: 'Own Land', meetingAt: ist('2026-11-12', '11:00'), receivedAt: ist('2026-11-05', '17:30'), telesalesOwner: 'Priya Singh', owner: 's-ishaan', priority: 'Medium', progress: 'Meeting Scheduled', confirmed: true, inProcess: { reason: 'Switch Off', at: ist('2026-11-12', '10:20'), nextCallAt: ist('2026-11-15', '11:00'), notes: 'Phone switched off on the meeting day; meeting not held.' } },
]

const ARCHITECT = 'Ar. Nikhil Bose'
let counter = 0
const id = (prefix: string) => `${prefix}-${String(++counter).padStart(4, '0')}`

function completedTrip(visit: Visit, city: string): Visit {
  return {
    ...visit,
    status: 'Completed',
    started: simulatedStamp('start', city, visit.id, shift(visit.scheduledAt, -1)),
    arrived: simulatedStamp('destination', city, visit.id, shift(visit.scheduledAt, -0.1)),
    completed: simulatedStamp('destination', city, `${visit.id}-done`, shift(visit.scheduledAt, 1.25)),
  }
}

function buildLead(row: Row, tasks: Task[], claims: TravelClaim[]): SalesLead {
  const reached = (stage: Row['progress']) => ORDER.indexOf(row.progress) >= ORDER.indexOf(stage)
  const ownLand = row.landStatus === 'Own Land'
  const isGroup = row.customerType === 'Group / Community'
  const state = CITY_POSITIONS[row.city]?.state ?? 'Punjab'
  const owner = userName(row.owner)
  const salesType = salesTypeFor(row.propertyType, !!row.duplex)
  const activities: Activity[] = [{ id: id('ACT'), type: 'Received from Telesales', description: `${teamReference('SH', row.journeyId)} received in ${ownLand ? 'New Leads' : 'New Lead for Land Sourcing'} and assigned to ${owner}.`, actor: 'System', createdAt: row.receivedAt }]
  const feedback: FeedbackComment[] = [
    { id: id('FB'), text: `Customer interested in a ${row.propertyType.toLowerCase()} in ${row.city}; ${ownLand ? 'owns the land' : 'needs land sourced'}. Budget ${row.budget}.`, author: row.telesalesOwner, team: 'Telesales', createdAt: shift(row.receivedAt, -26) },
    { id: id('FB'), text: `Qualified and Sales meeting fixed for ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(row.meetingAt))}.`, author: row.telesalesOwner, team: 'Telesales', createdAt: shift(row.receivedAt, -0.5) },
  ]
  const calls: CallLog[] = []

  let meeting: Visit = { id: id('VIS'), kind: 'Sales Meeting', scheduledAt: row.meetingAt, place: `${row.locality}, ${row.city}`, status: 'Scheduled', ownerId: row.owner }
  if (row.confirmed || reached('Meeting Done')) {
    const confirmedAt = shift(row.meetingAt, -22)
    meeting = { ...meeting, confirmedAt }
    calls.push({ id: id('CALL'), at: confirmedAt, outcome: 'Meeting Confirmed', notes: 'Reconfirmed the meeting time and place with the customer.', employee: owner })
    feedback.push({ id: id('FB'), text: 'Reconfirmed the meeting time and place with the customer.', author: owner, team: 'Sales', createdAt: confirmedAt, outcome: 'Meeting Confirmed' })
  }
  const visits: Visit[] = [reached('Meeting Done') ? completedTrip(meeting, row.city) : meeting]

  const profile: MeetingProfile = reached('Meeting Done') ? {
    customerType: isGroup ? 'Group of People' : 'Individual', groupKind: isGroup ? 'Friends' : '', landStatus: row.landStatus,
    propertyType: salesType, plotRegistered: ownLand ? 'Yes' : '', registrationStatus: '', govtApproval: ownLand ? (row.progress === 'Meeting Done' ? 'No' : 'Yes') : '',
    budget: row.budget, paymentPlan: row.budget.includes('4 Cr') ? 'Self' : row.budget.includes('Below') ? 'Loan' : '50:50',
    nextAction: reached('SV Scheduled') || !ownLand ? 'Site Visit' : 'Follow-up Call',
    plotSize: ownLand ? `${row.size.split('–')[0].replace('+', '')} sq ft` : row.size, dimensions: ownLand ? '40 ft × 60 ft' : '',
    approxBuiltArea: row.size, decisionMaker: isGroup ? 'Dependent' : 'Self',
  } : {
    customerType: isGroup ? 'Group of People' : 'Individual', groupKind: '', landStatus: row.landStatus,
    propertyType: row.propertyType === 'Individual House (1 Floor / Villa)' ? '' : salesType, plotRegistered: '', registrationStatus: '',
    govtApproval: '', budget: row.budget, paymentPlan: '', nextAction: '', plotSize: '', dimensions: '', approxBuiltArea: '', decisionMaker: '',
  }
  if (reached('Meeting Done')) {
    const done = visits[0].completed!.at
    activities.push({ id: id('ACT'), type: 'Meeting done', description: `Sales meeting completed at ${visits[0].place}; next action ${profile.nextAction}.`, actor: owner, createdAt: done })
    feedback.push({ id: id('FB'), text: `Met the customer at ${row.locality}. ${ownLand ? `Plot ${profile.dimensions}, ${profile.govtApproval === 'Yes' ? 'approvals in place' : 'government approval pending'}.` : 'Explained the land sourcing process; waiting for options from Land Sourcing.'}`, author: owner, team: 'Sales', createdAt: done })
  }

  const siteVisit: SiteVisitReport = { actualSiteVisited: '', roadAccess: '', roadFacingWidth: '', roadWidth: '', photos: [], propertyDocuments: [], soilTest: '', borewell: '' }
  if (reached('SV Scheduled') && row.siteVisitAt) {
    const sv: Visit = { id: id('VIS'), kind: 'Site Visit', scheduledAt: row.siteVisitAt, place: `${ownLand ? 'Customer plot' : 'Identified land'}, ${row.locality}, ${row.city}`, status: 'Scheduled', ownerId: row.owner, confirmedAt: shift(row.siteVisitAt, -20) }
    visits.push(reached('SV Done') ? completedTrip(sv, row.city) : sv)
    activities.push({ id: id('ACT'), type: 'Site visit scheduled', description: `Site visit fixed for ${new Date(row.siteVisitAt).toLocaleDateString('en-IN')}.`, actor: owner, createdAt: shift(visits[0].completed?.at ?? row.meetingAt, 2) })
  }
  if (reached('SV Done')) {
    Object.assign(siteVisit, {
      actualSiteVisited: 'Yes', roadAccess: 'Yes', roadFacingWidth: '40 ft', roadWidth: '30 ft',
      photos: ['plot-front.jpg', 'road-facing.jpg'], propertyDocuments: row.progress === 'Closed' ? ['registry-copy.pdf'] : [],
      soilTest: 'OK', borewell: row.journeyId.endsWith('5') ? 'No' : 'Yes',
    } satisfies Partial<SiteVisitReport>)
    const done = visits[1].completed!.at
    activities.push({ id: id('ACT'), type: 'Site visit done', description: 'Site visited; road access, soil (verbal) and borewell recorded with 2 photos.', actor: owner, createdAt: done })
    feedback.push({ id: id('FB'), text: 'Site visit done: 30 ft road, 40 ft frontage, soil OK as per neighbour borewell report.', author: owner, team: 'Sales', createdAt: done })
  }

  const architecture = reached('Interested') ? {
    architect: ARCHITECT,
    callAt: shift(row.siteVisitAt ?? row.meetingAt, reached('Under Negotiation') ? 96 : 24 * 21),
    ...(reached('Under Negotiation') && row.quotation ? {
      estimateLow: Math.round(row.quotation * 0.8), estimateHigh: Math.round(row.quotation * 1.2),
      estimateNotes: 'Rough estimate from the architect call (±20% of actual cost).',
      quotation: { number: `QT-${row.journeyId.slice(-6)}`, amount: row.quotation, sharedAt: shift(row.siteVisitAt ?? row.meetingAt, 24 * 7) },
    } : {}),
  } : undefined
  if (architecture && !reached('Under Negotiation')) {
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Architect Call', title: `Call with ${ARCHITECT} and the customer to take requirements`, dueAt: architecture.callAt, status: 'Open', ownerId: row.owner })
  }
  const closing = row.progress === 'Closed' && row.quotation ? {
    tokenAmount: Math.round(row.quotation * 0.02 / 1000) * 1000, paidAt: shift(architecture!.quotation!.sharedAt, 24 * 6),
    paymentReference: `UTR${row.journeyId.slice(-6)}0042`, handoverCallAt: shift(architecture!.quotation!.sharedAt, 24 * 8),
  } : undefined
  if (closing) {
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Handover Call', title: `Handover call: customer, ${ARCHITECT} and Sales`, dueAt: closing.handoverCallAt, status: 'Done', ownerId: row.owner })
    activities.push({ id: id('ACT'), type: 'Closed', description: `Token amount received; handed over to the Architecture team.`, actor: owner, createdAt: closing.paidAt })
  }

  let stage: SalesStage = row.progress
  let inProcessReason: SalesLead['inProcessReason']
  let resumeStage: SalesStage | undefined
  if (row.inProcess) {
    calls.push({ id: id('CALL'), at: row.inProcess.at, outcome: row.inProcess.reason, notes: row.inProcess.notes, employee: owner })
    feedback.push({ id: id('FB'), text: row.inProcess.notes, author: owner, team: 'Sales', createdAt: row.inProcess.at, outcome: row.inProcess.reason })
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Follow-up Call', title: `Call back (${row.inProcess.reason})`, dueAt: row.inProcess.nextCallAt, status: 'Open', ownerId: row.owner })
    resumeStage = stage
    stage = 'In Process'
    inProcessReason = row.inProcess.reason
  }
  let deadReason: string | undefined
  if (row.dead) {
    stage = 'Dead'
    deadReason = row.dead.reason
    visits.forEach((visit, index) => { if (visit.status === 'Scheduled') visits[index] = { ...visit, status: 'Cancelled' } })
    calls.push({ id: id('CALL'), at: row.dead.at, outcome: 'Not Interested', notes: row.dead.reason, employee: owner })
    feedback.push({ id: id('FB'), text: row.dead.reason, author: owner, team: 'Sales', createdAt: row.dead.at, outcome: 'Not Interested' })
    activities.push({ id: id('ACT'), type: 'Marked dead', description: row.dead.reason, actor: owner, createdAt: row.dead.at })
  }

  // Tasks for live journeys.
  if (stage === 'Meeting Scheduled' && !meeting.confirmedAt) {
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Reconfirm Meeting', title: 'Reconfirm the Sales meeting with the customer', dueAt: shift(row.meetingAt, -24), status: 'Open', ownerId: row.owner })
  }
  if (row.overdueFollowUp) {
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Follow-up Call', title: row.progress === 'Under Negotiation' ? 'Follow up on the quotation' : 'Discuss site visit findings and next steps', dueAt: row.overdueFollowUp, status: 'Open', ownerId: row.owner })
  }
  if (stage === 'Meeting Done' && profile.nextAction === 'Follow-up Call') {
    tasks.push({ id: id('TSK'), journeyId: row.journeyId, type: 'Follow-up Call', title: 'Follow up on government approval status', dueAt: shift(visits[0].completed!.at, 24 * 6), status: 'Open', ownerId: row.owner })
  }

  // Travel claims for completed trips: approved if older than a week, otherwise awaiting approval.
  for (const visit of visits) {
    const allowance = visit.status === 'Completed' ? allowanceFor(visit) : null
    if (!allowance) continue
    const recent = new Date(visit.scheduledAt) > new Date('2026-11-09T00:00:00+05:30')
    claims.push({
      id: id('CLM'), visitId: visit.id, journeyId: row.journeyId, ownerId: row.owner, date: visit.completed!.at, ...allowance,
      status: recent ? 'Pending Approval' : 'Approved', ...(recent ? {} : { decidedBy: 'Manish Kohli', decidedAt: shift(visit.completed!.at, 30) }),
    })
  }

  return {
    journeyId: row.journeyId,
    reference: teamReference('SH', row.journeyId),
    queue: ownLand ? 'New Leads' : 'New Lead for Land Sourcing',
    ownerId: row.owner,
    priority: row.priority,
    stage,
    ...(inProcessReason ? { inProcessReason, resumeStage } : {}),
    receivedAt: row.receivedAt,
    customer: { name: row.name, mobile: row.phone, alternateMobile: '', email: `${row.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`, location: row.locality, city: row.city, state, pincode: row.pincode },
    telesales: {
      owner: row.telesalesOwner, sentAt: row.receivedAt, customerType: row.customerType, propertyType: row.propertyType,
      requirement: `${row.size} ${row.propertyType.toLowerCase()}`, budget: row.budget, size: row.size, timeline: row.timeline,
      landStatus: row.landStatus, locations: [{ name: row.city, pincode: row.pincode }], source: 'Website',
    },
    ...(row.landSourcing ? { landSourcing: row.landSourcing } : {}),
    profile,
    siteVisit,
    visits,
    calls,
    feedback: feedback.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    ...(architecture ? { architecture } : {}),
    ...(closing ? { closing } : {}),
    ...(deadReason ? { deadReason } : {}),
    activities: activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }
}

export function createInitialState(): SalesState {
  counter = 0
  const tasks: Task[] = []
  const claims: TravelClaim[] = []
  const leads = rows.map(row => buildLead(row, tasks, claims)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  return { leads, tasks, claims, assignmentCursor: 0 }
}

/** The 13 journeys the Telesales demo sends to Sales. */
export const TELESALES_SENT_JOURNEYS = rows.slice(0, 13).map(row => row.journeyId)
