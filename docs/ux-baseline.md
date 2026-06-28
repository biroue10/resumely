# ApplyCraft UX Baseline and Conversion Notes

Date: 2026-06-28

## Baseline Findings

- Homepage start path previously required a template choice before editing. That made the first meaningful action two decisions: click start, then choose among many templates.
- Above-the-fold CTAs were visually similar: resume, cover letter, and ATS checker competed for attention.
- The landing header displayed sign-in affordances despite the core promise being no signup.
- A product outcome was not visible in the first viewport on desktop.
- Download actions were easiest to find only after AI resume generation, even though live-preview export can work without AI.
- Mobile showed editor and preview as stacked content, creating a long scroll path.
- Optional sections were visible immediately, increasing perceived form length.
- Save state was implicit; users had to infer browser storage behavior.
- ATS language was mostly useful but needed clearer caveats that scores do not guarantee interviews.

## Primary Conversion Funnel

Homepage -> Create my resume -> Recommended template selected -> Enter core details -> Live preview -> Download PDF or DOCX.

Secondary flows remain available:

- Check existing resume
- Browse templates
- Change resume language
- Use achievement coaching
- Create a cover letter
- Review ATS tips

## Before and After Measurements

Approximate interaction counts from homepage:

- Start editing before: 2 clicks minimum, with mandatory template decision.
- Start editing after: 1 click, recommended template selected automatically.
- Mandatory decisions before editing before: 1 template decision.
- Mandatory decisions before editing after: 0.
- Above-fold primary CTAs before: 3 competing actions.
- Above-fold primary CTAs after: 1 dominant primary action plus 1 secondary action.
- Export visibility before: shown after AI-generated result in the form action area.
- Export visibility after: always visible in editor actions and preview toolbar.
- Mobile preview access before: scroll to preview.
- Mobile preview access after: explicit Edit/Preview toggle plus sticky action bar.

## Remaining Research Questions

- Whether "Modern" should remain the default template for the highest completion and download rate.
- Whether showing sample resume content in the hero increases trust or makes users worry about sample data in their own document.
- Which checklist labels best motivate completion without creating pressure.
- Whether users understand the difference between resume language, interface language, and AI translation.
- Whether the mobile sticky action bar helps or distracts on iOS Safari and mid-range Android devices.

## Measurement Position

The code includes a disabled internal event interface. It does not send data anywhere by default and does not capture resume content. If analytics are configured later, events must avoid names, emails, employers, job titles, uploaded content, or field values.
