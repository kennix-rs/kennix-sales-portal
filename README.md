# Kennix Sales CRM

React/TypeScript preview of the KENNIX Sales portal: the stage after Telesales (and Land Sourcing for customers who need land). It runs on its own sample data in `localStorage`; a `LocalSalesService` sits in front of it so the backend can replace it later, as in the Telesales portal.

## Preview logins

Password `Preview@123` for all:

- `ishaan.bhatia@kennix.in`: Sales Executive (reports to Manish)
- `tanvi.arora@kennix.in`: Sales Executive (reports to Manish)
- `manish.kohli@kennix.in`: Sales Team Lead (reports to Rakesh)
- `rakesh.menon@kennix.in`: Sales Manager

Executives see their own journeys, Team Leads their team's, Managers everything.

## Workflow

- **Intake:** journeys arrive from Telesales with the Sales meeting already fixed, in two queues: *New Leads* (own land) and *New Lead for Land Sourcing* (also sent to Land Sourcing, which reports when land is identified). The meeting shows on the calendar straight away.
- **Home:** tiles for New leads (meetings to reconfirm), Overdue tasks, Calendar (today), Interested and Land sourcing leads, plus today's schedule and the pipeline by stage.
- **Stages:** In Process (Switch Off, RNR, Call Back Later) → Meeting Scheduled → Meeting Done → SV Scheduled → SV Done → Interested → Under Negotiation → Closed, or Dead.
- **Calls:** every call has an outcome and a comment, which joins the feedback thread Telesales started. Switch Off, RNR and Call Back Later need a next-call time and put the journey In Process until the customer is reached.
- **Meetings and site visits:** the executive taps *Start trip*, *I've arrived* and *Complete visit*; each step stamps the location. A completed visit raises a travel claim.
- **Meeting form:** customer details (editable) plus individual or group (family, friends or community), own land or need land, property type, plot registration and government approval (own land), budget, payment plan, plot size, dimensions, approximate built area, decision maker and next action. All of it is required to mark the meeting done.
- **Site visit form:** actual site visited, road access (road-facing width and road width when yes), 2 photos, property documents (optional), verbal soil test and borewell provision. A land sourcing journey can have a site visit only once land is identified.
- **Architecture and closing:** Interested → call with an architect, who gives a rough estimate within ±20% → quotation → Under Negotiation → token amount received closes it → handover call with the customer, the architect and Sales. Closed and Dead journeys are read-only.
- **Travel reimbursement:** claims per visit, approved or rejected by a Team Lead or Manager (not their own). Preview policy, to be confirmed: road distance ≈ 1.3 × the straight line from start to arrival, doubled for the return, at ₹9/km.

## Sample data

The first 13 journeys are exactly the ones the Telesales demo sends to Sales: same IDs, customers, meeting times and Land Sourcing status (257, 260 and 266 have land identified). Twelve earlier own-land journeys fill the later stages. The preview clock starts at Monday 16 Nov 2026, 10:00 IST. Locations are simulated (from the nearest KENNIX office to the customer's city); set `VITE_USE_DEVICE_GPS=true` to use the device GPS.

## Run and check

```bash
npm install
npm run dev -- --port 5176
npm run lint && npm run typecheck && npm test && npm run build
```
