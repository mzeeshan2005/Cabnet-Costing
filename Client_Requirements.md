Markdown  
\# Cabinet Costing App — AI Coding Agent Implementation Context

\#\# 1\. Project Overview & Technical Stack  
You are assisting in upgrading "Cabinet Costing", a desktop application used by a cabinetry manufacturing business to build quotations and manage catalogs.

\* **\*\*Environment:\*\*** Node.js \+ Electron v4 (Legacy).  
\* **\*\*Architecture:\*\*** Single-user local desktop app. The Renderer processes heavily utilize the deprecated Electron \`remote\` module to invoke Node.js backend scripts.  
\* **\*\*UI Stack:\*\*** HTML5, Bootstrap 4, jQuery. No modern reactive frameworks (no React/Vue).  
\* **\*\*Database:\*\*** Migrating to \`better-sqlite3\` (Serverless local \`.db\` file).  
\* **\*\*New Dependencies to Use:\*\*** \`xlsx\` (SheetJS) for Excel parsing.

\---

\#\# 2\. Problem Statement

The client has reported two major critical business blockers:

1\. **\*\*The "Manual Data Entry" Bottleneck:\*\*** The client maintains a complex "Master Data" Excel workbook containing thousands of pricing variables, dimensions, and hardware mappings across multiple sheets (e.g., "Base Unit", "Hardware", "Accessories"). Currently, if the catalog changes, they must manually type every single update into the app's UI. This is highly error-prone and time-consuming.  
2\. **\*\*The "Broken Multiplier" Pricing Flaw:\*\*** The current pricing engine uses hardcoded quantity multipliers to calculate profit. Due to market inflation, as base material costs rise, these fixed multipliers cause the final quotation prices to inflate exponentially, resulting in unjustifiably high quotes that lose business.

\---

\#\# 3\. Proposed Solution Architecture

\#\#\# 3.1. The "Sheet Link" (Excel Sync Engine)  
We will implement a Two-Way Synchronization system using the \`xlsx\` library:  
\* **\*\*Import:\*\*** The app reads the Master Excel file, parses specific sheets natively, and executes a high-speed SQLite transaction to update the local application database.  
\* **\*\*Export/Sync (Read-Modify-Write):\*\*** When a user edits a price in the app UI, the app writes to SQLite, reads the master Excel workbook into memory, surgically replaces *\*only\** the affected sheet's data, and overwrites the \`.xlsx\` file to preserve the formatting of unedited sheets.

\#\#\# 3.2. The "Cost \+ Margin" Pricing Engine  
We will decouple base material costs from the profit calculation:  
\* Calculate the true, exact **\*\*Base Cost\*\*** of materials and hardware.  
\* Introduce a global **\*\*Profit Margin Percentage\*\*** (e.g., 20%) defined in the Settings UI.  
\* Add a **\*\*"Apply Profit Margin" Toggle\*\*** on the Pricing quotation screen. When checked, the final price \= \`Base Cost \+ (Base Cost \* Profit Margin %)\`.

\---

\#\# 4\. Database Schema Updates (SQLite)

The AI agent must implement or ensure the following schema exists via \`better-sqlite3\`:

\`\`\`sql  
\-- Store the path to the Master Excel file and the new Profit Margin  
CREATE TABLE IF NOT EXISTS system\_config (  
    id INTEGER PRIMARY KEY CHECK (id \= 1),  
    master\_excel\_path TEXT,  
    profit\_margin\_percentage REAL DEFAULT 0.0  
);

\-- Catalog Tables (Subset example for mapping Excel sheets)  
CREATE TABLE IF NOT EXISTS catalog\_carcass (  
    code TEXT PRIMARY KEY,  
    description TEXT,  
    box\_size\_sft REAL DEFAULT 0.0,  
    back\_press\_sft REAL DEFAULT 0.0,  
    edging\_rft REAL DEFAULT 0.0  
);

CREATE TABLE IF NOT EXISTS catalog\_fixed\_items (  
    code TEXT PRIMARY KEY,  
    description TEXT,  
    base\_price REAL DEFAULT 0.0  
);

## **5\. Implementation Guide & Task Sequence**

**Agent Instruction:** Please execute the following tasks in order.

### **Task 1: Build the Excel Parser & Importer (src/scripts/excel\_parser.js)**

* Use xlsx to read the Excel file path.  
* Target specific sheets (e.g., Base Unit, Acessories).  
* Map row headers (e.g., row\["Box Size \\nin sft"\]) to database parameters.  
* **Constraint:** Wrap the database insertions in a db.transaction() for performance. Handle empty rows by skipping if \!row\["Code"\].

### **Task 2: Build the Excel Bidirectional Sync (src/scripts/excel\_sync.js)**

* Implement a function syncDatabaseToExcel(sheetName, sqlQuery).  
* **Logic Flow:**  
  1. Fetch master\_excel\_path from system\_config.  
  2. Read workbook using XLSX.readFile(path, { cellStyles: true, NF: true }).  
  3. Query SQLite for updated data.  
  4. Convert to sheet: XLSX.utils.json\_to\_sheet(dbRows).  
  5. Replace target sheet: workbook.Sheets\[sheetName\] \= newSheet.  
  6. Write to disk using XLSX.writeFile().  
* **Constraint:** Catch EBUSY file system errors and return a user-friendly message indicating the file is open in Microsoft Excel.

### **Task 3: Update Settings UI for Profit Margin (src/screens/settings/price-change.html)**

* Add a numerical input field for "Global Profit Margin (%)".  
* Add a file picker button (\<input type="file"\> or Electron dialog) to "Link Master Excel File".  
* Update the attached jQuery script to save these values into the system\_config table.

### **Task 4: Refactor the Pricing Calculation Engine (src/scripts/pricing.js)**

* Add a checkbox to the Pricing UI: \<input type="checkbox" id="apply-profit-margin" checked\>.  
* Modify the calculateLineItemTotal() (or equivalent) function.  
* **New Math Logic:**  
  JavaScript  
  let baseCost \= (materialSft \* boardRate) \+ hardwareCost \+ finishingCost;  
  let finalPrice \= baseCost;

  if ($('\#apply-profit-margin').is(':checked')) {  
      const marginPct \= getGlobalProfitMargin(); // Fetch from config  
      finalPrice \= baseCost \* (1 \+ (marginPct / 100));  
  }

  return finalPrice;

## **6\. Critical Agent Constraints & Rules**

* **No ipcRenderer refactoring unless requested:** The app relies on the deprecated remote module. Continue using const file\_manager \= remote.require(...) to match the existing codebase style unless explicitly instructed to refactor to secure IPC. (check if this point is true or we need to modify this).  
* **Header Matching:** When querying SQLite to sync *back* to Excel, you MUST use SQL aliases (AS "Column Name") that exactly match the string headers the user's Excel file expects (including stray spaces/newlines if necessary).  
* **Sanitization:** Excel users frequently leave text in numeric columns. Always wrap numeric imports with parseFloat(row\["Value"\]) || 0\.

