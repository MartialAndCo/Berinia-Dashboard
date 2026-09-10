# Sales funnel

- `/strategy`: sales page and a questionnaire showing one question at a time (service area, company name, annual revenue). Answers do not qualify or disqualify anyone. Back navigation preserves entered answers; the final step saves the complete response.
- `/strategy/book`: English Cal.com embed.
- `/strategy/confirmation`: post-booking video and call preparation.
- `/funnel`: authenticated content editor, draft/publish controls, responsive preview, questions, media, testimonials, and the latest 100 responses.

The editor supports bold selections using its B button, bold blocks, and three responsive text sizes. All content is rendered as text and structured formatting, never arbitrary HTML. Videos accept YouTube, Vimeo, and Loom links. The sales video appears directly beneath the form, with a player placeholder when no video is configured. Both videos have editable titles and introductions, and show a player placeholder until their video links are configured. The post-booking video introduces call preparation. Empty testimonials remain hidden publicly. No funnel step navigation or benefit cards are displayed on the sales page.

## Storage

Uses the existing Supabase URL and service role key. A private `sales-funnel` Storage bucket is created on the first save/submission. No database migration is required. `draft.json` and `published.json` hold the page configuration; each response has an independent JSON object under `leads/`, including a snapshot of question labels and advertising attribution. Objects are accessible only through server-side code; do not add public Storage policies to this bucket. Submissions are retained until explicitly removed by an operator; the console shows the most recent 100.

The API validates answers, accepts only configured dropdown options, limits request/field sizes, checks the request origin, and uses a honeypot and a short cooldown cookie. The cookie is basic duplicate suppression, not a distributed abuse prevention service. For high-volume campaigns, add platform-level request rate limiting.

## Cal.com setup

The initial calendar URL comes from `CALENDAR_URL`, falling back to the existing website's `https://cal.com/yann/15min`. Confirm that this is the intended event, then edit the URL in Sales funnel if necessary.

In the event settings:

1. Use an English event title, description, and booking question labels. Locale `en` translates Cal.com's interface, not custom event text.
2. Require name, email, and company. Use `company` as the company field identifier for prefilling from the questionnaire.
3. Set the custom success redirect to `https://YOUR-DOMAIN/strategy/confirmation` for bookings opened via the fallback link in a separate tab. Disable forwarding query parameters if they are not needed.
4. Add the sales and post-booking video links and real customer testimonials in the admin editor; publish when ready.

The embed listens for Cal.com's `bookingSuccessfulV2` event before navigating to the post-booking page. Preview mode does not load a live calendar or save leads. Lead ID and company are passed to Cal.com metadata so a booking can be matched to its questionnaire response. The page does not claim payment or host approval is complete: Cal.com remains the source of truth for booking status and meeting details. The existing Cal.com webhook is unchanged.

Official integration references: [embed events](https://cal.com/help/embedding/embed-events), [prefilling](https://cal.com/help/embedding/prefill-booking-form-embed), [success redirects](https://cal.com/help/event-types/booking-success-page-query-params).

## Checks

Run `node scripts/test-funnel.cjs`, `npx tsc --noEmit`, and `npm run build`. Lint the changed funnel files with ESLint. Real bookings send calendar invitations; complete that final end-to-end check with an intended test event before running ads.
