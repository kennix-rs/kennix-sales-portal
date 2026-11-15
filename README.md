# Kennix Sales CRM

React/TypeScript preview of the KENNIX Sales portal: the stage after Telesales (and Land Sourcing for customers who need land). Built from the Sales CRM whiteboards, flow charts and the 13 voice notes of 2026-11-11. It runs on its own sample data in `localStorage`; a `LocalSalesService` sits in front of it so the backend can replace it later, as in the Telesales portal.

## Preview logins

Password `Preview@123` for all:

- `ishaan.bhatia@kennix.in`: Sales Executive (reports to Manish)
- `tanvi.arora@kennix.in`: Sales Executive (reports to Manish)
- `manish.kohli@kennix.in`: Sales Team Lead (reports to Rakesh)
- `rakesh.menon@kennix.in`: Sales Manager

Executives see their own journeys, Team Leads their team's, Managers everything. Team Leads and Managers also get stage alerts under the bell.

## Workflow

- **Intake:** journeys arrive from Telesales with the Sales meeting already fixed, in two queues: *New Leads* (own land) and *New Lead for Land Sourcing* (also sent to Land Sourcing, which reports when land is identified). The meeting shows on the calendar straight away.
- **Home:** tiles for New leads (meetings to reconfirm), Overdue tasks, Calendar (today), Interested and Land sourcing leads, plus today's schedule, the pipeline by stage and the count sent back to Telesales.
- **Calendar:** a dot on each day with meetings; click a day to list them below. Meetings fixed by Telesales are marked **T**.
- **Stages:** In Process (RNR, Plan Postponed, Call Back Later, Switch Off) → Meeting Scheduled → Meeting Done → SV Scheduled → SV Done → Interested → Under Negotiation → Closed, or Dead; or Sales Rejected.
- **Calls:** every call has an outcome and a comment, which joins the feedback thread Telesales started. The In Process outcomes need a next-call time. **After 5 of them within 3 days** the journey goes back to Telesales as *Sales rejected*.
- **Not interested:** before any meeting or site visit the journey goes back to Telesales (*Sales rejected*, with a comment); after one it is marked Dead.
- **Meetings and site visits:** the executive taps *Start meeting*, *Arrived at client location* and *Meeting completed* (and the same for site visits); each step stamps the location. A completed visit raises a travel claim.
- **Meeting form:** customer details (editable) plus individual or group (family, friends or community), own land or need land, property type, plot registration and government approval (own land), budget, payment plan, plot size, dimensions, approximate built area, type of package (Basic, Standard, Luxury or Ultra Luxury, with an indicative cost from the website's per-sq-ft rates), decision maker and next action. All of it is required to mark the meeting done.
- **Site visit form:** actual site visited, road access (road-facing width and road width when yes), 2 photos, property documents (optional), verbal soil test and borewell provision. A land sourcing journey can have a site visit only once land is identified.
- **Interested → quotation → closing:** marking a customer interested shares their details with the Architecture team and fixes a requirement call. The architect uploads the quotation (actual price may vary ±20%); Sales shares it with the client on WhatsApp, which moves it to Under Negotiation. A token amount (about ₹2–3 lakh) closes it, followed by a handover call with the customer, the architect and Sales. Closed, Dead and Sales Rejected journeys are read-only.
- **Stage alerts:** Meeting Done, SV Done, Interested, Quotation shared and Closed alert the owner's Team Lead and Manager under the bell.
- **Travel reimbursement:** claims per visit, approved or rejected by a Team Lead or Manager (not their own). Preview policy, to be confirmed: road distance ≈ 1.3 × the straight line from start to arrival, doubled for the return, at ₹9/km.

## Sample data

The first 13 journeys are exactly the ones the Telesales demo sends to Sales: same IDs, customers, meeting times and Land Sourcing status (257, 260 and 266 have land identified). Twelve earlier own-land journeys fill the later stages. Anita Rawat was sent back to Telesales before her meeting; Sameer Khan has 4 unanswered attempts, so the next one sends him back. The preview clock starts at Monday 16 Nov 2026, 10:00 IST. Saved data uses `kennix.sales.state.v2`. Locations are simulated (from the nearest KENNIX office to the customer's city); set `VITE_USE_DEVICE_GPS=true` to use the device GPS.

## Run and check

```bash
npm install
npm run dev -- --port 5176
npm run lint && npm run typecheck && npm test && npm run build
```
