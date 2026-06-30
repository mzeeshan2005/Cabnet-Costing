const path = require("path");
const {faUserCheck} = require("@fortawesome/fontawesome-free-solid");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));

let listData = [];
let opt = '';

function save_func(event, op) {
  event.preventDefault();
  opt = op;
}

function clearFields() {
  document.getElementById("client-name").value = "";
  document.getElementById("select").value = "";
  document.getElementById("select-1").value = "";
  document.getElementById("rate").value = "0";
  document.getElementById("back-area").value = "0";
  document.getElementById("edging").value = "0";
  document.getElementById("screws").value = "0";
  document.getElementById("secondary-top").value = "0";
  file_manager
    .loadFile(path.join(__dirname, "../../db/.codes.json"))
    .then((res) => {
      const id = document.getElementById("id");
      if (res.length === 0 && listData.length === 0) {
        id.innerHTML = "1";
      } else if (listData.length === 0) {
        id.innerHTML = Number(res[res.length - 1].id) + 1;
      } else if (res.length === 0) {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      } else {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      }
    });
}

function toggle(event) {
  if (event.target.checked) {
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (data.id === event.target.id.toString()) {
            const id = document.getElementById("id");
            document.getElementById("fieldset").disabled = true;
            document.getElementById("update").disabled = true;
            document.getElementById("save").disabled = true;
            document.getElementById("clear").disabled = true;
            document.getElementById("add").disabled = true;
            document.getElementById('edit').disabled = false
          }
        });
        file_manager
          .loadFile(path.join(__dirname, "../../db/.codes.json"))
          .then((res) => {
            let count = 0;
            const data1 = res.concat(listData);
            data1.forEach((data) => {
              if (
                document.getElementById(data.id) &&
                document.getElementById(data.id).checked
              ) {
                count += 1;
              }
            });
            if (count > 1) {
              const id = document.getElementById("id");
              clearFields();
              document.getElementById("fieldset").disabled = true;
              document.getElementById("save").disabled = true;
              document.getElementById("add").disabled = true;
              document.getElementById("update").disabled = true;
              document.getElementById("clear").disabled = true;
              document.getElementById('edit').disabled = true
            }
            if(count === data1.length)
            {
              document.getElementById("checkbox-all").checked = true;
            }
          });
      });
  } else {
    clearFields();
    file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        let count = 0;
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (
            document.getElementById(data.id) &&
            document.getElementById(data.id).checked
          ) {
            count += 1;
          }
        });
        if(count < data1.length){
          document.getElementById("checkbox-all").checked = false;
        }
        if (count === 0) {
          clearFields();
          populateTable();
          document.getElementById("delete-selected").disabled = true;
          document.getElementById("delete-selected-1").disabled = true;
          document.getElementById("fieldset").disabled = false;
          if (listData.length === 0) {
            document.getElementById("save").disabled = true;
          } else {
            document.getElementById("save").disabled = false;
          }
          document.getElementById("update").disabled = true;
          document.getElementById("add").disabled = false;
          document.getElementById("clear").disabled = false;
          document.getElementById('edit').disabled = true
        } else if (count === 1) {
          document.getElementById("fieldset").disabled = false;
          file_manager
            .loadFile(path.join(__dirname, "../../db/.codes.json"))
            .then((res) => {
              const data1 = res.concat(listData);
              data1.forEach((data) => {
                if (
                  document.getElementById(data.id) &&
                  document.getElementById(data.id).checked
                ) {
                  const id = document.getElementById("id");
                  document.getElementById("fieldset").disabled = true;
                  document.getElementById("update").disabled = true;
                  document.getElementById('edit').disabled = false
                  document.getElementById("save").disabled = true;
                  document.getElementById("add").disabled = true;
                  document.getElementById("clear").disabled = true;
                }
              });
            });
        } else {
          document.getElementById("fieldset").disabled = true;
          document.getElementById("update").disabled = true;
          document.getElementById("save").disabled = true;
          document.getElementById("add").disabled = true;
          document.getElementById("clear").disabled = true;
          // populateTable()
        }
      });
  }
}

function edit(event){
  file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (document.getElementById(data.id) &&
              document.getElementById(data.id).checked) {
            document.getElementById("fieldset").disabled = false;

            const id = document.getElementById("id");
            id.innerHTML = data.id;
            file_manager
              .loadFile(path.join(__dirname, "../../db/.types.json"))
              .then((res) => {
                const select = document.getElementById("select-1");
                select.innerHTML = "";
                let option = document.createElement("option");
                option.text = "Please Select";
                option.value = "";
                option.classList.add('d-none');
                select.add(option);
                res.forEach((dat) => {
                  if(dat.utility_id === data.utility_id)
                  {
                    let option = document.createElement("option");
                    option.text = dat.title;
                    option.value = dat.id;
                    select.add(option);
                  }
                });
                document.getElementById("select-1").value = data.type_id;
              });
            document.getElementById("client-name").value = data.title;
            document.getElementById("select").value = data.utility_id;

            document.getElementById("rate").value = data.rate;
            document.getElementById("back-area").value = data.back_area;
            document.getElementById("edging").value = data.edging;
            document.getElementById("screws").value = data.screws;
            document.getElementById("secondary-top").value = data.secondary_top;
            document.getElementById("update").disabled = false;
            document.getElementById("save").disabled = true;
            document.getElementById("clear").disabled = false;
            document.getElementById("add").disabled = true;
            document.getElementById('edit').disabled = false
          }
          })
        })
}

function populateTable() {
  document.getElementById("client-table").innerHTML = "";
  document.getElementById("delete-selected").disabled = true;
  document.getElementById("delete-selected-1").disabled = true;
  document.getElementById("update").disabled = true;
  document.getElementById("save").disabled = true;
  file_manager
    .loadFile(path.join(__dirname, "../../db/.codes.json"))
    .then((res) => {
      const id = document.getElementById("id");
      if (res.length === 0 && listData.length === 0) {
        id.innerHTML = "1";
      } else if (listData.length === 0) {
        id.innerHTML = Number(res[res.length - 1].id) + 1;
      } else if (res.length === 0) {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      } else {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      }
      const data1 = res.concat(listData);
      renderCodesTable(data1);
    });
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      const select = document.getElementById("select");
      select.innerHTML = "";
      let option = document.createElement("option");
      option.text = "Please Select";
      option.value = "";
      option.classList.add('d-none');
      select.add(option);
      res.forEach((data) => {
        let option = document.createElement("option");
        option.text = data.title;
        option.value = data.id;
        select.add(option);
      });
    });
  const select = document.getElementById("select-1");
  select.innerHTML = "";
  let option = document.createElement("option");
  option.text = "Please Select";
  option.value = "";
  option.classList.add('d-none');
  select.add(option);

}

function renderCodesTable(rows) {
  const tb = document.getElementById("client-table");
  if (!rows || rows.length === 0) {
    tb.innerHTML = `
      <tr class="tr-shadow" style="border-bottom: 2px solid grey">
        <td style="border: 1px solid black" colspan="8">No Data Added.</td>
      </tr>`;
    document.getElementById("checkbox-all-box").style.display = "none";
    return;
  }

  document.getElementById("checkbox-all-box").style.display = "block";
  const html = rows
    .map(
      (data) => `
        <tr class="tr-shadow" style="border-bottom: 2px solid grey">
          <td style="border: 1px solid black">
            <label class="au-checkbox">
              <input type="checkbox" id="${data.id}" onchange="toggle(event)">
              <span class="au-checkmark" style="border: 1px solid green"></span>
            </label>
          </td>
          <td style="border: 1px solid black">${data.id}</td>
          <td style="border: 1px solid black">${data.title}</td>
          <td style="border: 1px solid black">${data.rate}</td>
          <td style="border: 1px solid black">${data.back_area}</td>
          <td style="border: 1px solid black">${data.secondary_top}</td>
          <td style="border: 1px solid black">${data.edging}</td>
          <td style="border: 1px solid black">${data.screws}</td>
        </tr>`
    )
    .join("");
  tb.innerHTML = html;
}

function currentSearchQuery() {
  const el = document.getElementById("search");
  return el && el.value != null ? String(el.value) : "";
}

function currentFilters() {
  return {
    utility_id: document.getElementById("select") ? document.getElementById("select").value : "",
    type_id: document.getElementById("select-1") ? document.getElementById("select-1").value : "",
  };
}

function listDataFiltered(query, utility_id, type_id) {
  let out = listData.slice();
  if (utility_id) out = out.filter((r) => r && String(r.utility_id) === String(utility_id));
  if (type_id) out = out.filter((r) => r && String(r.type_id) === String(type_id));
  if (query) {
    const q = String(query).toLowerCase();
    out = out.filter((r) => {
      const id = r && r.id != null ? String(r.id) : "";
      const title = r && r.title != null ? String(r.title).toLowerCase() : "";
      return id.indexOf(query) !== -1 || title.indexOf(q) !== -1;
    });
  }
  return out;
}

function mergeById(a, b) {
  const map = {};
  for (const r of a || []) {
    if (r && r.id != null) map[String(r.id)] = r;
  }
  for (const r of b || []) {
    if (r && r.id != null) map[String(r.id)] = r;
  }
  return Object.keys(map)
    .sort((x, y) => Number(x) - Number(y))
    .map((k) => map[k]);
}

function refreshCodesTable() {
  const query = currentSearchQuery();
  const f = currentFilters();
  return file_manager
    .searchCodes(query, f.utility_id, f.type_id, 800)
    .then((rows) => {
      const merged = mergeById(rows || [], listDataFiltered(query, f.utility_id, f.type_id));
      renderCodesTable(merged);
    });
}

let searchTimer = null;
function scheduleRefreshCodesTable() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    refreshCodesTable();
  }, 150);
}

function isProbablyHeaderRow(row) {
  if (!row || row.length === 0) return false;
  for (let i = 0; i < row.length; i++) {
    const v = row[i] != null ? String(row[i]).trim().toLowerCase() : "";
    if (v === "id" || v === "title" || v === "name" || v === "code" || v === "rate") return true;
  }
  return false;
}

function toTitleValue(v) {
  return v != null ? String(v).trim() : "";
}

function toIdString(v) {
  const s = v != null ? String(v).trim() : "";
  if (!s) return "";
  const n = Number(s);
  if (isNaN(n)) return "";
  return String(Math.floor(n));
}

function toNumOrFallback(v, fallback) {
  const s = v != null ? String(v).trim() : "";
  if (!s) return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

function previewImportCodes() {
  const text = document.getElementById("import-text") ? document.getElementById("import-text").value : "";
  const rows = file_manager.parseTabularText(text);
  const usable = rows.length > 0 && isProbablyHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const count = usable.filter((r) => r && r.length > 0 && toTitleValue(r.length >= 2 ? r[1] : r[0])).length;
  const el = document.getElementById("import-result");
  if (el) el.textContent = count ? (String(count) + " row(s) ready to import") : "";
}

function importCodesFromText(text) {
  const utilSelect = document.getElementById("select");
  const typeSelect = document.getElementById("select-1");
  const selectedUtilityId = utilSelect ? String(utilSelect.value) : "";
  const selectedTypeId = typeSelect ? String(typeSelect.value) : "";

  const rows = file_manager.parseTabularText(text);
  const headerIndex = rows.length > 0 && isProbablyHeaderRow(rows[0]) ? file_manager.buildHeaderIndex(rows[0]) : null;
  const usable = headerIndex ? rows.slice(1) : rows;

  const rateDefault = document.getElementById("rate") ? parseFloat(document.getElementById("rate").value) : 0;
  const backAreaDefault = document.getElementById("back-area") ? parseFloat(document.getElementById("back-area").value) : 0;
  const secondaryTopDefault = document.getElementById("secondary-top") ? parseFloat(document.getElementById("secondary-top").value) : 0;
  const edgingDefault = document.getElementById("edging") ? parseFloat(document.getElementById("edging").value) : 0;
  const screwsDefault = document.getElementById("screws") ? parseFloat(document.getElementById("screws").value) : 0;

  return Promise.all([
    file_manager.loadFile(path.join(__dirname, "../../db/.codes.json")),
    file_manager.loadFile(path.join(__dirname, "../../db/.utilities.json")),
    file_manager.loadFile(path.join(__dirname, "../../db/.types.json")),
  ]).then((results) => {
    const existing = Array.isArray(results[0]) ? results[0] : [];
    const utilities = Array.isArray(results[1]) ? results[1] : [];
    const types = Array.isArray(results[2]) ? results[2] : [];

    let maxId = 0;
    const seen = {};

    existing.forEach((c) => {
      const idNum = c && c.id != null && !isNaN(Number(c.id)) ? Number(c.id) : 0;
      if (idNum > maxId) maxId = idNum;
      const u = c && c.utility_id != null ? String(c.utility_id) : "";
      const t = c && c.type_id != null ? String(c.type_id) : "";
      const title = c && c.title != null ? String(c.title).trim().toLowerCase() : "";
      if (u && t && title) seen[u + "::" + t + "::" + title] = true;
    });
    listData.forEach((c) => {
      const idNum = c && c.id != null && !isNaN(Number(c.id)) ? Number(c.id) : 0;
      if (idNum > maxId) maxId = idNum;
      const u = c && c.utility_id != null ? String(c.utility_id) : "";
      const t = c && c.type_id != null ? String(c.type_id) : "";
      const title = c && c.title != null ? String(c.title).trim().toLowerCase() : "";
      if (u && t && title) seen[u + "::" + t + "::" + title] = true;
    });

    let added = 0;
    let skipped = 0;
    let invalid = 0;

    usable.forEach((row) => {
      if (!row || row.length === 0) return;

      let utilityId = selectedUtilityId;
      let typeId = selectedTypeId;

      if (headerIndex) {
        const utilIdIdx = headerIndex.utility_id != null ? headerIndex.utility_id : null;
        const utilIdx = headerIndex.utility != null ? headerIndex.utility : null;
        if (utilIdIdx != null && row[utilIdIdx] != null && String(row[utilIdIdx]).trim()) {
          utilityId = String(row[utilIdIdx]).trim();
        } else if (utilIdx != null && row[utilIdx] != null && String(row[utilIdx]).trim()) {
          const utilName = String(row[utilIdx]).trim().toLowerCase();
          const match = utilities.find((u) => u && u.title != null && String(u.title).trim().toLowerCase() === utilName);
          utilityId = match && match.id != null ? String(match.id) : "";
        }

        const typeIdIdx = headerIndex.type_id != null ? headerIndex.type_id : null;
        const typeIdx = headerIndex.type != null ? headerIndex.type : headerIndex.description != null ? headerIndex.description : null;
        if (typeIdIdx != null && row[typeIdIdx] != null && String(row[typeIdIdx]).trim()) {
          typeId = String(row[typeIdIdx]).trim();
        } else if (typeIdx != null && row[typeIdx] != null && String(row[typeIdx]).trim()) {
          const typeName = String(row[typeIdx]).trim().toLowerCase();
          const matchT = types.find((t) => {
            const okUtil = utilityId ? String(t.utility_id) === String(utilityId) : true;
            const tt = t && t.title != null ? String(t.title).trim().toLowerCase() : "";
            return okUtil && tt === typeName;
          });
          typeId = matchT && matchT.id != null ? String(matchT.id) : "";
        }
      }

      if (!utilityId || !typeId) {
        invalid += 1;
        return;
      }

      let title = "";
      if (headerIndex) {
        const titleIdx = headerIndex.title != null ? headerIndex.title : headerIndex.name != null ? headerIndex.name : headerIndex.code != null ? headerIndex.code : null;
        title = titleIdx != null ? toTitleValue(row[titleIdx]) : "";
      }
      if (!title) {
        const hasLeadingId = row.length >= 2 && toIdString(row[0]);
        title = toTitleValue(hasLeadingId ? row[1] : row[0]);
      }
      if (!title) return;

      const key = utilityId + "::" + typeId + "::" + title.toLowerCase();
      if (seen[key]) {
        skipped += 1;
        return;
      }

      maxId += 1;
      const id = String(maxId);

      let cursor = 0;
      if (!headerIndex) {
        const hasLeadingId = row.length >= 2 && toIdString(row[0]);
        cursor = hasLeadingId ? 2 : 1;
      }

      const rateIdx = headerIndex && headerIndex.rate != null ? headerIndex.rate : null;
      const backAreaIdx = headerIndex && headerIndex.back_area != null ? headerIndex.back_area : headerIndex && headerIndex.backarea != null ? headerIndex.backarea : null;
      const secondaryTopIdx = headerIndex && headerIndex.secondary_top != null ? headerIndex.secondary_top : headerIndex && headerIndex.secondarytop != null ? headerIndex.secondarytop : null;
      const edgingIdx = headerIndex && headerIndex.edging != null ? headerIndex.edging : null;
      const screwsIdx = headerIndex && headerIndex.screws != null ? headerIndex.screws : null;

      const rate = toNumOrFallback(headerIndex ? row[rateIdx] : row[cursor], rateDefault || 0);
      const back_area = toNumOrFallback(headerIndex ? row[backAreaIdx] : row[cursor + 1], backAreaDefault || 0);
      const secondary_top = toNumOrFallback(headerIndex ? row[secondaryTopIdx] : row[cursor + 2], secondaryTopDefault || 0);
      const edging = toNumOrFallback(headerIndex ? row[edgingIdx] : row[cursor + 3], edgingDefault || 0);
      const screws = toNumOrFallback(headerIndex ? row[screwsIdx] : row[cursor + 4], screwsDefault || 0);

      const utilityTextRow = utilities.find((u) => u && String(u.id) === String(utilityId));
      const typeTextRow = types.find((t) => t && String(t.id) === String(typeId));
      const utilityText = utilityTextRow && utilityTextRow.title != null ? String(utilityTextRow.title) : "";
      const typeText = typeTextRow && typeTextRow.title != null ? String(typeTextRow.title) : "";

      listData.push({
        id: id,
        title: title,
        rate: String(rate),
        back_area: String(back_area),
        secondary_top: String(secondary_top),
        edging: String(edging),
        screws: String(screws),
        utility_id: utilityId,
        utility: utilityText,
        type_id: typeId,
        type: typeText,
      });

      seen[key] = true;
      added += 1;
    });

    const idEl = document.getElementById("id");
    if (idEl) {
      let localMax = maxId;
      listData.forEach((c) => {
        const idNum = c && c.id != null && !isNaN(Number(c.id)) ? Number(c.id) : 0;
        if (idNum > localMax) localMax = idNum;
      });
      idEl.innerHTML = String(localMax + 1);
    }

    return { added: added, skipped: skipped, invalid: invalid };
  });
}

let excelImport = null;
if (file_manager && typeof file_manager.bindExcelImportControls === "function") {
  excelImport = file_manager.bindExcelImportControls({ preferredSheetName: "Codes", afterTextSet: previewImportCodes, fileNameDisplayId: "import-file-name" });
}

if (document.getElementById("import-open")) {
  document.getElementById("import-open").addEventListener("click", (event) => {
    event.preventDefault();
    const t = document.getElementById("import-text");
    const r = document.getElementById("import-result");
    if (t) t.value = "";
    if (r) r.textContent = "";
    if ((!excelImport || excelImport.isBound === false) && file_manager && typeof file_manager.bindExcelImportControls === "function") {
      excelImport = file_manager.bindExcelImportControls({ preferredSheetName: "Codes", afterTextSet: previewImportCodes });
    }
    if (excelImport && excelImport.reset) excelImport.reset();
    if (window.$) window.$("#importModal").modal("show");
  });
}

if (document.getElementById("import-text")) {
  document.getElementById("import-text").addEventListener("input", previewImportCodes);
}

if (document.getElementById("import-apply")) {
  document.getElementById("import-apply").addEventListener("click", (event) => {
    event.preventDefault();
    const text = document.getElementById("import-text") ? document.getElementById("import-text").value : "";
    importCodesFromText(text)
      .then((result) => {
        scheduleRefreshCodesTable();
        document.getElementById("save").disabled = listData.length === 0;
        const nameEl = document.getElementById("client-name");
        if (nameEl) nameEl.value = "";
        if (window.$) window.$("#importModal").modal("hide");
        if (result && result.added) alert("Imported " + String(result.added) + " row(s).");
        else alert("Nothing imported.");
      })
      .catch((err) => {
        alert(err && err.message ? err.message : String(err));
      });
  });
}

function depIsProbablyHeaderRow(row) {
  if (!row || row.length === 0) return false;
  for (let i = 0; i < row.length; i++) {
    const v = row[i] != null ? String(row[i]).trim().toLowerCase() : "";
    if (v === "title" || v === "name" || v === "utility" || v === "utility_id" || v === "type" || v === "type_id" || v === "description") return true;
  }
  return false;
}

function depTitleValue(v) {
  return v != null ? String(v).trim() : "";
}

function refreshUtilitySelectAfterDepImport() {
  const select = document.getElementById("select");
  if (!select) return Promise.resolve();
  const prev = select.value != null ? String(select.value) : "";
  return file_manager.loadFile(path.join(__dirname, "../../db/.utilities.json")).then((res) => {
    select.innerHTML = "";
    let option = document.createElement("option");
    option.text = "Please Select";
    option.value = "";
    option.classList.add("d-none");
    select.add(option);
    (Array.isArray(res) ? res : []).forEach((data) => {
      let op = document.createElement("option");
      op.text = data && data.title != null ? String(data.title) : "";
      op.value = data && data.id != null ? String(data.id) : "";
      select.add(op);
    });
    select.value = prev;
  });
}

function refreshTypeSelectAfterDepImport() {
  const utilSel = document.getElementById("select");
  const typeSel = document.getElementById("select-1");
  if (!utilSel || !typeSel) return Promise.resolve();
  const utilId = utilSel.value != null ? String(utilSel.value) : "";
  const prev = typeSel.value != null ? String(typeSel.value) : "";
  return file_manager.loadFile(path.join(__dirname, "../../db/.types.json")).then((res) => {
    typeSel.innerHTML = "";
    let option = document.createElement("option");
    option.text = "Please Select";
    option.value = "";
    option.classList.add("d-none");
    typeSel.add(option);
    (Array.isArray(res) ? res : []).forEach((data) => {
      if (!utilId || (data && String(data.utility_id) === utilId)) {
        let op = document.createElement("option");
        op.text = data && data.title != null ? String(data.title) : "";
        op.value = data && data.id != null ? String(data.id) : "";
        typeSel.add(op);
      }
    });
    typeSel.value = prev;
  });
}

function depImportUtilitiesFromText(text) {
  const rows = file_manager.parseTabularText(text);
  const headerIndex = rows.length > 0 && depIsProbablyHeaderRow(rows[0]) ? file_manager.buildHeaderIndex(rows[0]) : null;
  const usable = headerIndex ? rows.slice(1) : rows;

  return file_manager.loadFile(path.join(__dirname, "../../db/.utilities.json")).then((res) => {
    const existing = Array.isArray(res) ? res : [];
    let maxId = 0;
    const seen = {};
    existing.forEach((u) => {
      const idNum = u && u.id != null && !isNaN(Number(u.id)) ? Number(u.id) : 0;
      if (idNum > maxId) maxId = idNum;
      const title = u && u.title != null ? String(u.title).trim().toLowerCase() : "";
      if (title) seen[title] = true;
    });

    let added = 0;
    let skipped = 0;
    usable.forEach((row) => {
      if (!row || row.length === 0) return;
      let title = "";
      if (headerIndex) {
        const idx = headerIndex.title != null ? headerIndex.title : headerIndex.name != null ? headerIndex.name : null;
        title = idx != null ? depTitleValue(row[idx]) : "";
      }
      if (!title) title = depTitleValue(row[0]);
      if (!title) return;
      const key = title.toLowerCase();
      if (seen[key]) {
        skipped += 1;
        return;
      }
      maxId += 1;
      existing.push({ id: String(maxId), title: title });
      seen[key] = true;
      added += 1;
    });

    return file_manager
      .writeFile(path.join(__dirname, "../../db/.utilities.json"), existing)
      .then(() => ({ added: added, skipped: skipped }));
  });
}

function depImportTypesFromText(text) {
  const rows = file_manager.parseTabularText(text);
  const headerIndex = rows.length > 0 && depIsProbablyHeaderRow(rows[0]) ? file_manager.buildHeaderIndex(rows[0]) : null;
  const usable = headerIndex ? rows.slice(1) : rows;
  const selectedUtilityId = document.getElementById("select") ? String(document.getElementById("select").value) : "";

  return Promise.all([
    file_manager.loadFile(path.join(__dirname, "../../db/.types.json")),
    file_manager.loadFile(path.join(__dirname, "../../db/.utilities.json")),
  ]).then((results) => {
    const existing = Array.isArray(results[0]) ? results[0] : [];
    const utilities = Array.isArray(results[1]) ? results[1] : [];

    let maxId = 0;
    const seen = {};
    existing.forEach((t) => {
      const idNum = t && t.id != null && !isNaN(Number(t.id)) ? Number(t.id) : 0;
      if (idNum > maxId) maxId = idNum;
      const utilId = t && t.utility_id != null ? String(t.utility_id) : "";
      const title = t && t.title != null ? String(t.title).trim().toLowerCase() : "";
      if (utilId && title) seen[utilId + "::" + title] = true;
    });

    let added = 0;
    let skipped = 0;
    let invalid = 0;

    usable.forEach((row) => {
      if (!row || row.length === 0) return;

      let utilityId = selectedUtilityId;
      let utilityName = "";

      if (headerIndex) {
        const utilIdIdx = headerIndex.utility_id != null ? headerIndex.utility_id : null;
        const utilIdx = headerIndex.utility != null ? headerIndex.utility : null;
        if (utilIdIdx != null && row[utilIdIdx] != null && String(row[utilIdIdx]).trim()) {
          utilityId = String(row[utilIdIdx]).trim();
        } else if (utilIdx != null && row[utilIdx] != null && String(row[utilIdx]).trim()) {
          const utilNameLower = String(row[utilIdx]).trim().toLowerCase();
          const match = utilities.find((u) => u && u.title != null && String(u.title).trim().toLowerCase() === utilNameLower);
          utilityId = match && match.id != null ? String(match.id) : "";
          utilityName = match && match.title != null ? String(match.title) : "";
        }
      } else if (row.length >= 2) {
        const utilNameLower = String(row[0]).trim().toLowerCase();
        const match = utilities.find((u) => u && u.title != null && String(u.title).trim().toLowerCase() === utilNameLower);
        if (match && match.id != null) {
          utilityId = String(match.id);
          utilityName = match && match.title != null ? String(match.title) : "";
        }
      }

      if (!utilityId) {
        invalid += 1;
        return;
      }

      let title = "";
      if (headerIndex) {
        const titleIdx =
          headerIndex.title != null
            ? headerIndex.title
            : headerIndex.name != null
              ? headerIndex.name
              : headerIndex.description != null
                ? headerIndex.description
                : headerIndex.type != null
                  ? headerIndex.type
                  : null;
        title = titleIdx != null ? depTitleValue(row[titleIdx]) : "";
      }
      if (!title) title = depTitleValue(row.length >= 2 ? row[1] : row[0]);
      if (!title) return;

      const key = utilityId + "::" + title.toLowerCase();
      if (seen[key]) {
        skipped += 1;
        return;
      }

      if (!utilityName) {
        const uRow = utilities.find((u) => u && u.id != null && String(u.id) === String(utilityId));
        utilityName = uRow && uRow.title != null ? String(uRow.title) : "";
      }

      maxId += 1;
      existing.push({ id: String(maxId), title: title, utility_id: utilityId, utility: utilityName });
      seen[key] = true;
      added += 1;
    });

    return file_manager
      .writeFile(path.join(__dirname, "../../db/.types.json"), existing)
      .then(() => ({ added: added, skipped: skipped, invalid: invalid }));
  });
}

let depMode = "";
let depExcel = null;

function openDepImport(mode) {
  depMode = mode != null ? String(mode) : "";
  const titleEl = document.getElementById("dep-import-title");
  if (titleEl) {
    titleEl.textContent = depMode === "utilities" ? "Import Utilities" : depMode === "types" ? "Import Descriptions" : "Import";
  }
  const t = document.getElementById("dep-import-text");
  const r = document.getElementById("dep-import-result");
  if (t) t.value = "";
  if (r) r.textContent = "";

  const preferred = depMode === "utilities" ? "Utilities" : depMode === "types" ? "Descriptions" : "";
  if (file_manager && typeof file_manager.bindExcelImportControls === "function") {
    depExcel = file_manager.bindExcelImportControls({
      fileInputId: "dep-import-file",
      sheetSelectId: "dep-import-sheet",
      textAreaId: "dep-import-text",
      preferredSheetName: preferred,
      fileNameDisplayId: "dep-import-file-name",
    });
  }
  if (window.$) window.$("#depImportModal").modal("show");
}

function ensureDepImportBindings() {
  const applyEl = document.getElementById("dep-import-apply");
  if (applyEl && !applyEl.__depBound) {
    applyEl.addEventListener("click", (event) => {
      event.preventDefault();
      const text = document.getElementById("dep-import-text") ? document.getElementById("dep-import-text").value : "";
      const job = depMode === "utilities" ? depImportUtilitiesFromText(text) : depMode === "types" ? depImportTypesFromText(text) : Promise.resolve({ added: 0 });
      job
        .then((result) => {
          const added = result && result.added != null ? Number(result.added) : 0;
          if (depMode === "utilities") return refreshUtilitySelectAfterDepImport().then(() => ({ added: added }));
          if (depMode === "types") return refreshTypeSelectAfterDepImport().then(() => ({ added: added }));
          return { added: added };
        })
        .then((finalRes) => {
          if (window.$) window.$("#depImportModal").modal("hide");
          const added = finalRes && finalRes.added != null ? Number(finalRes.added) : 0;
          if (added > 0) alert("Imported " + String(added) + " row(s).");
          else alert("Nothing imported.");
        })
        .catch((err) => {
          alert(err && err.message ? err.message : String(err));
        });
    });
    applyEl.__depBound = true;
  }
}

if (document.getElementById("dep-import-utility")) {
  document.getElementById("dep-import-utility").addEventListener("click", (event) => {
    event.preventDefault();
    ensureDepImportBindings();
    openDepImport("utilities");
  });
}
if (document.getElementById("dep-import-type")) {
  document.getElementById("dep-import-type").addEventListener("click", (event) => {
    event.preventDefault();
    ensureDepImportBindings();
    openDepImport("types");
  });
}

$(document).ready(() => {
  populateTable();
});

document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("id").innerHTML;
  const name = document.getElementById("client-name").value;
  const select = document.getElementById("select");
  const select_1 = document.getElementById("select-1");
  const value = select.value;
  const text = select.options[select.selectedIndex].text;
  const value1 = select_1.value;
  const text1 = select_1.options[select_1.selectedIndex].text;
  const rate = document.getElementById("rate").value;
  const back_area =  document.getElementById("back-area").value;
  const edging = document.getElementById("edging").value;
  const screws = document.getElementById("screws").value;
  const secondary_top = document.getElementById("secondary-top").value;
  const data = {
    id: id,
    title: name,
    rate: rate,
    back_area: back_area,
    edging: edging,
    screws: screws,
    secondary_top: secondary_top,
    utility_id: value,
    utility: text,
    type_id: value1,
    type: text1,
  }; 
  listData.push(data);
  file_manager
    .loadFile(path.join(__dirname, "../../db/.codes.json"))
    .then((res) => {
      if (res.length === 0 && listData.length === 1) {
        document.getElementById("client-table").innerHTML = "";
      }
      clearFields();
      populateTable();
      if (listData.length === 0) {
        document.getElementById("save").disabled = true;
      } else {
        document.getElementById("save").disabled = false;
      }
    });
});

document.getElementById("clear").addEventListener("click", (event) => {
  event.preventDefault();
  clearFields();
  populateTable();
  document.getElementById("add").disabled = false;
  document.getElementById("edit").disabled = true;
});

document.getElementById('cancel').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('pass').value = '';
})

document.getElementById("confirm").addEventListener("click", (event) => {
  event.preventDefault();
  let dd = {}
  const select = document.getElementById("select");
  dd.utility_id = select.value;
  dd.utility = select.options[select.selectedIndex].text;
  const select_1 = document.getElementById("select-1");
  dd.type_id = select_1.value;
  dd.type = select_1.options[select_1.selectedIndex].text;
  file_manager
    .loadFile(path.join(__dirname, "../../db/.credentials.json"))
    .then((res) => {
      if(opt === 'save')
      {
        if(res[0].password === document.getElementById('pass').value)
        {
          file_manager
              .loadFile(path.join(__dirname, "../../db/.codes.json"))
              .then((res) => {
                const clients = res;
                listData.forEach((r) => {
                  clients.push(r);
                });

                file_manager
                    .writeFile(
                        path.join(__dirname, "../../db/.codes.json"),
                        clients
                    )
                    .then((res) => {
                      if (res === "success") {
                        alert("Saved Successfully!");
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                        listData = [];
                        document.getElementById("save").disabled = true;
                        populateTable();
                      } else {
                        alert("Could Not Saved!");
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                      }
                    });
              });
        }
        else
        {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      }
      else if (opt === 'update')
      {
        if(document.getElementById('select').value.trim().length !== 0 &&
            document.getElementById('select-1').value.trim().length !== 0 &&
            document.getElementById('client-name').value.trim().length !== 0 &&
            document.getElementById('rate').value.trim().length !== 0 &&
            document.getElementById("back-area").value.trim().length !== 0 &&
            document.getElementById("edging").value.trim().length !== 0 &&
            document.getElementById("screws").value.trim().length !== 0 &&
            document.getElementById("secondary-top").value.trim().length !== 0 )
        {
          if(res[1].pass === document.getElementById('pass').value)
          {
            file_manager
                .loadFile(path.join(__dirname, "../../db/.codes.json"))
                .then((res) => {
                  res.forEach((d) => {
                    if (d.id === document.getElementById("id").innerHTML) {
                      d.title = document.getElementById("client-name").value;
                      d.utility_id = dd.utility_id;
                      d.utility = dd.utility;
                      d.type_id = dd.type_id;
                      d.type = dd.type
                      d.rate = document.getElementById("rate").value;
                      d.back_area = document.getElementById("back-area").value;
                      d.edging = document.getElementById("edging").value;
                      d.screws = document.getElementById("screws").value;
                      d.secondary_top = document.getElementById("secondary-top").value;
                    }
                  });
                  file_manager
                      .writeFile(path.join(__dirname, "../../db/.codes.json"), res)
                      .then((res) => {
                        document.getElementById('edit').disabled = true;
                        populateTable();
                        clearFields();
                        if (listData.length === 0) {
                          document.getElementById("save").disabled = true;
                        } else {
                          document.getElementById("save").disabled = false;
                        }
                        document.getElementById("add").disabled = false;
                      });
                });
            listData.forEach((d) => {
              if (d.id === document.getElementById("id").innerHTML) {
                d.title = document.getElementById("client-name").value;
                d.utility_id = dd.utility_id;
                d.utility = dd.utility;
                d.type_id = dd.type_id;
                d.type = dd.type
                d.rate = document.getElementById("rate").value;
                d.back_area = document.getElementById("back-area").value;
                d.edging = document.getElementById("edging").value;
                d.screws = document.getElementById("screws").value;
                d.secondary_top = document.getElementById("secondary-top").value;
              }
            });
            populateTable();
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
          }
          else
          {
            alert("Password Not Matched!");
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
          }
        }
        else {
          alert("Incomplete Data! Please fill all fields.")
          document.getElementById('cancel').click();
        }

      }
      else
      {
        if(res[1].pass === document.getElementById('pass').value)
        {
          del();
          document.getElementById('cancel').click();
        }
        else
        {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      }
    });
});

document.getElementById("checkbox-all").addEventListener("change", (event) => {
  if (event.target.checked) {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        const data = res.concat(listData);
        data.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag && !tag.checked) {
            tag.click();
          }
        });
      });
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    document.getElementById("fieldset").disabled = true;
    document.getElementById("save").disabled = true;
    document.getElementById("clear").disabled = true;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = true;
    clearFields();
  } else {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        const data = res.concat(listData);
        data.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag && tag.checked) {
            tag.click();
          }
        });
      });
    clearFields();
    populateTable();
    document.getElementById("delete-selected").disabled = true;
    document.getElementById("delete-selected-1").disabled = true;
    document.getElementById("fieldset").disabled = false;
    if (listData.length === 0) {
      document.getElementById("save").disabled = true;
    } else {
      document.getElementById("save").disabled = false;
    }
    document.getElementById("clear").disabled = false;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = false;
  }
});

document.getElementById("selectUtil").addEventListener("click", (event) => {
  document.getElementById("select").value = "";
  document.getElementById("select-1").innerHTML = ''
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  document.getElementById('delete-selected-1').disabled = true
  document.getElementById('edit').disabled = true
  filter_by_dropdown(document.getElementById("select-1").value,'');

});

document.getElementById("selectTyp").addEventListener("click", (event) => {
  document.getElementById("select-1").value = "";
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  document.getElementById('delete-selected-1').disabled = true
  document.getElementById('edit').disabled = true
  filter_by_dropdown_1(document.getElementById("select").value,'');
});

function del_from_other(selected) {
  file_manager
    .loadFile(path.join(__dirname, "../../db/.doors.json"))
    .then((res) => {
      res.forEach((d) => {
        selected.forEach((i) => {
          res = res.filter((item) => item.code_id !== i.id);
        });
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.doors.json"), res)
        .then((res) => {});
    });

  file_manager
    .loadFile(path.join(__dirname, "../../db/.hardwares.json"))
    .then((res) => {
      res.forEach((d) => {
        selected.forEach((i) => {
          res = res.filter((item) => item.code_id !== i.id);
        });
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.hardwares.json"), res)
        .then((res) => {});
    });

  file_manager
    .loadFile(path.join(__dirname, "../../db/.handlers.json"))
    .then((res) => {
      res.forEach((d) => {
        selected.forEach((i) => {
          res = res.filter((item) => item.code_id !== i.id);
        });
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.handlers.json"), res)
        .then((res) => {});
    });

  file_manager
    .loadFile(path.join(__dirname, "../../db/.shelves.json"))
    .then((res) => {
      res.forEach((d) => {
        selected.forEach((i) => {
          res = res.filter((item) => item.code_id !== i.id);
        });
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.shelves.json"), res)
        .then((res) => {});
    });
}

function del() {
  const selected = [];

  file_manager
    .loadFile(path.join(__dirname, "../../db/.codes.json"))
    .then((res) => {
      res.forEach((data) => {
        if (
          document.getElementById(data.id) &&
          document.getElementById(data.id).checked
        ) {
          selected.push(data);
        }
      });
      res = res.filter(function (el) {
        return !selected.includes(el);
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.codes.json"), res)
        .then((res) => {
          if (res === "success") {
            document.getElementById('edit').disabled = true
            alert("Deleted Successfully!");
            document.getElementById("checkbox-all").checked = false;
            const selected1 = [];

            listData.forEach((data) => {
              if (
                document.getElementById(data.id) &&
                document.getElementById(data.id).checked
              ) {
                selected1.push(data);
              }
            });
            if (selected1.length > 0) {
              listData = listData.filter(function (el) {
                return !selected1.includes(el);
              });
            }
            const s = selected.concat(selected1);
            del_from_other(s);
            clearFields();
            populateTable();
            if (document.getElementById("checkbox-all").checked)
              document.getElementById("checkbox-all").click();
            document.getElementById("fieldset").disabled = false;
            document.getElementById("add").disabled = false;
            document.getElementById("save").disabled = false;
            document.getElementById("clear").disabled = false;
            if (listData.length === 0) {
              document.getElementById("save").disabled = true;
            } else {
              document.getElementById("save").disabled = false;
            }
          }
        });
    });
}


document.getElementById("select").addEventListener("change", (event) => {
  event.preventDefault();
  scheduleRefreshCodesTable();
  file_manager
    .loadFile(path.join(__dirname, "../../db/.types.json"))
    .then((res) => {
      const select = document.getElementById("select-1");
      select.innerHTML = "";
      let option = document.createElement("option");
      option.text = "Please Select";
      option.value = "";
      option.classList.add('d-none');
      select.add(option);
      res.forEach((data) => {
        let option = document.createElement("option");
        option.text = data.title;
        option.value = data.id;
        if (event.target.value === "" || data.utility_id === event.target.value)
          select.add(option);
      });
    });
});

document.getElementById("select-1").addEventListener("change", (event) => {
  event.preventDefault();
  scheduleRefreshCodesTable();
});

function filter(query) {
  if (document.getElementById("search")) {
    document.getElementById("search").value = query != null ? String(query) : "";
  }
  scheduleRefreshCodesTable();
}

function filter_by_dropdown(query, query1) {
  if (document.getElementById("select-1") && query != null) {
    document.getElementById("select-1").value = String(query);
  }
  if (document.getElementById("select") && query1 != null) {
    document.getElementById("select").value = String(query1);
  }
  scheduleRefreshCodesTable();
}

function filter_by_dropdown_1(query, query1) {
  if (document.getElementById("select") && query != null) {
    document.getElementById("select").value = String(query);
  }
  if (document.getElementById("select-1") && query1 != null) {
    document.getElementById("select-1").value = String(query1);
  }
  scheduleRefreshCodesTable();
}

document.getElementById("search").addEventListener("input", (event) => {
  if (event && event.target && event.target.value != null && String(event.target.value) === "") {
    scheduleRefreshCodesTable();
    return;
  }
  scheduleRefreshCodesTable();
});
