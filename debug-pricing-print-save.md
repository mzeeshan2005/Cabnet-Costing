[OPEN] Pricing print/save PDF debug session

Session ID: `pricing-print-save`
Date: 2026-07-06

Symptom:
- In the packaged app, when the client opens a quotation or invoice and clicks `Print`, no save window appears and nothing visibly happens.

Expected:
- Clicking `Print` should open the save flow and generate the quotation/invoice PDF.

Initial hypotheses:
- H1: The print click handler is not firing in the packaged build for opened quotation/invoice records.
- H2: The handler runs, but exits early because required data like firm/client/terms/reference is missing for opened records.
- H3: `html2pdf` or its bundled dependencies are unavailable or failing in the packaged renderer before `.save(...)`.
- H4: The generated filename or save options are invalid on Windows, causing the save dialog step to fail silently.
- H5: A runtime exception or rejected promise occurs in the packaged renderer and is swallowed before the save dialog appears.

Plan:
- Inspect existing instrumentation in `pricing.js`.
- Add focused debug reporting around print click, data loading, filename generation, and `html2pdf().save(...)`.
- Reproduce in packaged build and collect evidence.
- Apply the minimal fix only after evidence identifies the failing step.

Instrumentation added:
- Dynamic debug endpoint/session resolution from `.dbg/pricing-print-save.env` when present.
- Explicit log if no client record matches the selected/opened pricing record during print.
- Explicit log for generated filename and whether it contains Windows-invalid filename characters.
- Explicit log for `html2pdf().save(...)` resolve and reject outcomes.
