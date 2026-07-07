# Debug Session: print-build-failure

- Status: OPEN
- Started: 2026-07-05
- Symptom: In the packaged Windows `.exe`, the Print option for quotation/invoice does not work.
- Expected: Clicking Print from the Pricing page should generate/save the quotation or invoice PDF in the packaged app.
- Scope: Packaged app print flow in `pricing.js`, Electron packaged runtime paths, pdf/html2pdf dependencies, and native dialog interaction.

## Hypotheses

1. The packaged build cannot resolve one or more runtime assets or JSON/DB inputs used by the print flow, so the print handler exits before `html2pdf()` runs.
2. The print flow depends on browser-only libraries or globals that are not available/loaded correctly in the packaged `.exe`.
3. The packaged app is hitting a file path or filename issue during PDF save generation, especially with packaged paths or invalid generated filenames.
4. The print flow is running, but a packaged runtime error occurs inside the async promise chain and is swallowed, so the client only sees “nothing happens”.
5. The issue is specific to the OS save dialog / post-dialog path in packaged mode, not to PDF generation itself.

## Evidence Plan

- Instrument only the Pricing print path and its critical async branches.
- Capture:
  - print click entry
  - quotation vs invoice branch
  - firm/config data load result
  - generated filename/input values
  - html2pdf invocation point
  - caught runtime errors in packaged mode

## Notes

- No business logic fix before runtime evidence.
