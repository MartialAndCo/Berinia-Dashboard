**BerinAgents UI/UX audit — 7 September 2026**

The site has a coherent visual identity and a clear business benefit. The main weaknesses are the reliability of its product demonstration, the credibility of its claims, and the accessibility of its conversion flow. Fix those before investing in a visual redesign.

**Scope and evidence.** Inspected the public [homepage](https://www.berinagents.com/), [sign-in](https://www.berinagents.com/login), and [password recovery](https://www.berinagents.com/forgot-password) pages. Chrome was unavailable in this session; live inspection used the connected in-app browser. Tested the default desktop viewport, 1440 × 900, 390 × 844, 390 × 600, and 320 × 568. Checks included screenshots, navigation, keyboard behavior, DOM accessibility information, calculator interaction, and local source review. Mobile tests used viewport resizing, not physical devices or a software keyboard.

No demo calls, recovery emails, or account changes were submitted. The authenticated dashboard was not accessible in the browser, so its findings below are explicitly source-only. No product code was changed. This is a heuristic and functional audit, not an analytics study, a performance benchmark, or a complete accessibility certification. The deployed commit was not independently matched to the local checkout; source observations corroborate visible behavior where stated.

**What is working.** The cream/black palette, serif headings, restrained accent color, and consistent cards form a recognizable identity. Primary and secondary hero actions are visually distinct. The mobile menu opens, navigates to sections, and closes correctly. The inspected homepage sections reflow without horizontal overflow at 390px. Industry-specific scenarios and transcripts are useful ways to explain the product. Sign-in and recovery have a simple structure and correctly associated email/password labels.

Priorities: **P1** affects a core journey, accessibility, or trust and should be addressed first. **P2** creates meaningful friction or weakens clarity. **P3** is secondary polish. Priorities represent audit judgment, not measured conversion loss.

| Priority | Finding | Evidence | Recommended change |
| --- | --- | --- | --- |
| P1 | The advertised call-audio demo is a timer simulation | Live interaction + source | Connect real playable recordings or explicitly present the module as a transcript simulation |
| P1 | Demo modal leaves keyboard focus on the underlying page | Live keyboard test + source | Use an accessible dialog with focus containment, Escape dismissal, and focus restoration |
| P1 | ROI presents revenue less one fee as net profit | Live calculator + source | Display price assumptions and model conversion and margin, or accurately rename the output |
| P1 | Privacy and terms are inert text styled as links | Live interaction/DOM + source | Provide real destinations and expose them in the demo form |
| P2 | Scheduling CTAs open an immediate phone-call form | Live interaction + source | Separate instant testing from scheduled consultation |
| P2 | Demo modal clips at a compact phone size | Live 320 × 568 test + source | Constrain height, enable modal scrolling, and prevent background scrolling |
| P2 | Form and slider labels are not programmatically connected | Live DOM + source | Associate visible labels and expose meaningful slider names/values |
| P2 | Mobile scenario names truncate useful information | Live 390px screenshot + source | Permit two-line labels or shorten the titles |
| P2 | Cost & ROI navigation skips the interactive calculator | Live navigation | Link to the calculator or group it with the comparison section |
| P2 | The hero and proof need clearer, more credible messaging | Visual/content review | State the product category immediately and support claims with evidence |
| P3 | Two consecutive closing CTA sections repeat the same appeal | Live screenshot + source | Consolidate into one final conversion block |

**1. P1 — The voice demonstration does not implement audio playback.**

On the homepage, “Hear Real Call Examples” leads to a player with “Play call audio.” Activating it changes the UI to “CALL IN PROGRESS (DEMO)” and advances the counter; it reached 0:09 during inspection. The live DOM contains no audio/video element. The corresponding component advances `currentTime` using an interval and animates a transcript, with no recording, stream, or speech playback implementation. This conclusion combines browser behavior and source; audible output was not independently recorded.

This is the primary proof mechanism for a voice product. A simulated player presented as real audio can undermine the rest of the sales pitch. Connect actual recordings, drive transcript timing from the recording, and implement loading, pause/resume, end, and failure states. Until then, label it “Example conversation” and remove audio promises.

Acceptance: every scenario produces a playable recording; pause stops it; the timeline follows playback; an unavailable recording displays an honest error rather than continuing the timer. See [AudioDemoSection.tsx:109](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/AudioDemoSection.tsx:109) and [the audio promise at line 148](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/AudioDemoSection.tsx:148).

**2. P1 — Keyboard users remain behind the demo modal.**

Reproduction: open “Request a Live Demo,” press Tab, then Escape. Focus moves to “Hear Real Call Examples” behind the overlay, and Escape does not close the modal. The DOM has no dialog element or dialog role. Keyboard users must traverse background controls instead of entering the visible form, and the modal is not identified as a dialog to assistive technology.

Use an established accessible dialog component. Move focus into it on opening, contain focus, support Escape, make the background inert, give the dialog a name/description, and restore focus to the trigger on close. Acceptance: opening from the keyboard immediately exposes the form, Tab/Shift+Tab stay inside, Escape closes, and the trigger regains focus. See [ConsultationModal.tsx:70](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/ConsultationModal.tsx:70).

**3. P1 — The ROI output overstates what the calculation establishes.**

The default inputs show four saved calls at $500 each and “+$1,501 net profit in your pocket each month.” Selecting $250 produces +$501. The code subtracts an undisclosed $499 monthly cost from calls × customer value. It assumes every saved call becomes a paying job and ignores the cost of delivering those jobs. “Every call after that is 100% profit” compounds the misunderstanding. This is an audit of the product's labeling, not a validation of its pricing or business economics.

At minimum, show “Estimated additional revenue less a $499/month subscription; before operating costs” and state the conversion assumption. A more useful model includes call-to-customer conversion and contribution margin: captured calls × conversion rate × job value × margin − subscription. Use the same assumptions for break-even. The graphic should also reflect all ten selectable calls; it currently ends at five.

Acceptance: users can identify the assumed plan cost and distinguish revenue from profit; the amount and break-even use the same visible assumptions. See [BreakEvenCalculator.tsx:19](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/BreakEvenCalculator.tsx:19) and [output labels at line 167](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/BreakEvenCalculator.tsx:167).

**4. P1 — Privacy and terms have no destination.**

Clicking “Privacy Policy” in the footer produces no navigation or content change. DOM inspection identifies it as a `span` without a link, role, or tab stop. Both privacy and terms use this pattern in the source. The demo form simultaneously asks for company, name, phone, and email, with a “100% confidential” reassurance but no policy link in the form.

Create real policy destinations, use actual anchors, and link the relevant information beside the form. This finding concerns trust and access to information; it is not a legal compliance assessment. Acceptance: both destinations work by pointer and keyboard and can be reached from the form. See [Footer.tsx:123](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/Footer.tsx:123).

**5. P2 — Scheduled consultation and instant call testing are conflated.**

The closing section promises a “15-minute live demo,” and the footer offers “Schedule an Onboarding Call.” Clicking the latter opens “Test Our AI Agent on Your Phone,” with “Call My Phone Now” and an immediate-call promise. No scheduling UI is offered. Visitors may be willing to book later but unable or unwilling to answer a phone immediately.

Provide two clear actions: “Try an instant AI call” and “Book a 15-minute demo.” Show the timing before opening the form. For instant testing, consider whether both company and email must be required before demonstrating value. Acceptance: every CTA's label matches the actual next step. See [HowItWorks.tsx:118](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/HowItWorks.tsx:118), [Footer.tsx:110](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/Footer.tsx:110), and [ConsultationModal.tsx:158](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/ConsultationModal.tsx:158).

**6. P2 — The modal does not adapt to a short viewport.**

At 390 × 844 the form fits. At 320 × 568 its top/close area and bottom reassurance are clipped. Scrolling over the modal changes the page scrollbar behind it while the modal remains fixed. The submit button remained visible in this particular test; the finding is cropped content and absent usable modal scrolling, not a universally unreachable submit button.

Add a maximum height relative to the available viewport, an internal vertical scrolling region, sufficient outer padding, and background scroll locking. Validate real iOS/Android keyboard behavior as a follow-up. Acceptance: all form content and dismissal controls remain reachable at compact widths, short heights, enlarged text, and with a mobile keyboard. See [ConsultationModal.tsx:72](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/ConsultationModal.tsx:72).

**7. P2 — Visible labels do not consistently name controls.**

The four demo inputs have visible labels but no associated labels in the live DOM; their `labels` collections are empty and they have no `aria-label`. Both calculator ranges likewise have no associated label or accessible name. Placeholder text is not a durable replacement for an associated visible label. In contrast, sign-in/recovery label associations were correct.

Connect labels using `htmlFor`/`id`, retain meaningful input types, and use appropriate autocomplete tokens. Name the sliders and provide value text such as “$500 average job value” and “4 saved calls per month.” Acceptance: assistive technology announces each field's purpose and each range's units/value. See [ConsultationModal.tsx:170](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/ConsultationModal.tsx:170) and [BreakEvenCalculator.tsx](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/BreakEvenCalculator.tsx).

**8. P2 — Mobile demo selectors hide the scenario names.**

At 390px, the four selector cards show clipped titles such as “Emergency AC Repair...” and “Legal Intake & Consul...”. Industry labels use 10px text and scenario titles use 12px text with explicit truncation. The industry is understandable, but the actual situation becomes harder to compare.

Use shorter labels or allow two lines; increase small secondary type where space allows. Preserve full selected-scenario context above the player. Acceptance: the distinguishing scenario information is readable at 320–390px without hover. See [AudioDemoSection.tsx:175](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/AudioDemoSection.tsx:175).

**9. P2 — “Cost & ROI” does not lead to the calculator.**

The navigation and footer cost/ROI links target `#comparison`, which is below the calculator and feature section. The arrival screen is “What Is An Unanswered Call Really Costing You?” Users explicitly looking for ROI can miss the interactive tool above them.

Give the calculator an anchor and link to it, or group pricing, calculator, and comparison into one navigable section. Acceptance: a visitor selecting ROI lands where the calculator is immediately discoverable.

**10. P2 — The first screen and proof should explain the product more directly.**

The headline emphasizes a missed-call problem, while the product explanation sits in a long paragraph. On mobile, that paragraph and headline consume much of the first screen. The page also makes strong assertions—100% pickup, 70%+ savings, an 85% voicemail abandonment figure, and an agent that “will never make things up”—without visible supporting evidence or conditions. This audit does not establish those claims as false; it establishes that their support is absent from the page.

Test a direct headline such as “Your AI receptionist answers calls and books jobs, 24/7,” followed by one concise benefit sentence. Place working audio and an authentic call-summary or calendar-booking example nearby. Add verifiable customer evidence and explain numerical assumptions. Replace guarantees about perfect AI behavior with bounded descriptions of escalation and fallback behavior. These are design hypotheses to validate with user testing, not measured conversion gains. See [HeroSection.tsx:30](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/HeroSection.tsx:30), [CostComparison.tsx:23](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/CostComparison.tsx:23), and [HowItWorks.tsx:16](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/HowItWorks.tsx:16).

**11. P3 — The page repeats its closing appeal.**

Two consecutive dark sections ask visitors to stop losing callers and request a demo. Their repetition adds mobile reading length without answering a new question. Consolidate them into one closing action, then use the footer for navigation, company information, and working trust links. See [HowItWorks.tsx:112](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/HowItWorks.tsx:112) and [Footer.tsx:17](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/Footer.tsx:17).

**Additional source-only risks.** These were found in the repository and require authenticated or controlled runtime verification; they are not presented as observed production failures.

| Priority | Source-only risk | Recommended fix and reference |
| --- | --- | --- |
| P1 | An actual 0% satisfaction value renders as 100% because of `satisfactionRate || 100`; no-call agents also receive a 100% default | Preserve zero and display “No data” for unmeasured performance. [agents/page.tsx:165](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/agents/page.tsx:165), [actions.ts:324](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/actions.ts:324) |
| P1 | Team invitation UI describes success and displays “Active” although the checked action only inserts a membership row; ownership-based access lookup also needs review | Implement/verify invitation delivery, acceptance, and membership access; show Pending/Active/Failed accurately. External database automation was not verified. [actions.ts:376](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/actions.ts:376), [settings/page.tsx:409](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/settings/page.tsx:409) |
| P1 | Failed/expired token exchange can leave the password-reset page in its loading state | Handle exchange failure and offer a new recovery link. [reset-password/page.tsx:37](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/reset-password/page.tsx:37) |
| P1 | Dashboard sorting and call expansion use clickable headers/rows without keyboard-operable buttons | Add sort buttons with state, and a focusable disclosure control for call details. [dashboard/page.tsx:1116](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/page.tsx:1116) |
| P2 | Demo feedback can promise a forthcoming call even when call triggering failed or is disabled; success claims the phone is ringing without verified ringing status | Distinguish lead received, call requested, ringing, and failure; provide an actual follow-up or retry path. [request-demo/route.ts:66](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/api/request-demo/route.ts:66), [ConsultationModal.tsx:136](C:/Users/marti/Desktop/BerinIA/Dashboard/src/components/landing/ConsultationModal.tsx:136) |
| P2 | Mobile call details omit desktop notes, tags, transcript-copy, and fuller playback controls | Share one detail component across layouts so follow-up work can be completed on mobile. [dashboard/page.tsx:1168](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/page.tsx:1168), [mobile view at line 1277](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/page.tsx:1277) |
| P2 | Some failed requests fall through to empty-account UI | Separate Loading/Error/Empty/Ready states and add Retry. [agents/page.tsx:21](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/agents/page.tsx:21), [dashboard/page.tsx:180](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/page.tsx:180) |
| P2 | The dashboard enables a roughly 1024px-wide table at the same breakpoint as a 256px sidebar, while preventing horizontal scrolling | Verify tablet/small laptop widths; keep cards until the table fits or allow discoverable horizontal scrolling. [dashboard/page.tsx:1111](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/page.tsx:1111), [layout.tsx:92](C:/Users/marti/Desktop/BerinIA/Dashboard/src/app/dashboard/layout.tsx:92) |

**Recommended implementation order.** First make the public promise dependable: real audio, honest calculator labels/assumptions, working policies, and distinct instant/scheduled demo actions. Next repair dialog focus, labels, and compact-screen scrolling. Then improve the hero, supporting proof, scenario labels, navigation targets, and repeated closing content. Audit the authenticated dashboard in a test account before considering that experience verified.

**Validation after changes.** Run the public journey with keyboard only and a screen reader; test physical mobile devices with the keyboard open; listen to each recording through completion and exercise a failed recording; verify callback failure in a controlled environment; compare calculator outputs to the displayed assumptions. For the dashboard, include no-data, true-zero, failed-request, pending-invite, expired-link, and tablet-width scenarios. Analytics can then track demo play/start/completion and funnel progression to determine whether the clearer journey improves conversion.
