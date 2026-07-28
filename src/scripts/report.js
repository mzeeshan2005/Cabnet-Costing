const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));

let items = []
let table_body_html = ``

$(document).ready(() => {
  $('#datetimepicker6').datetimepicker({format: 'L'});
  $('#datetimepicker7').datetimepicker({
    useCurrent: false ,
    format: 'L'//Important! See issue #1075
  });
  $("#datetimepicker6").on("dp.change", function (e) {
    $('#datetimepicker7').data("DateTimePicker").minDate(e.date).show();
    $('#datetimepicker6').data("DateTimePicker").hide();
    document.getElementById('print').classList.add('d-none')
  });
  $("#datetimepicker7").on("dp.change", function (e) {
    $('#datetimepicker6').data("DateTimePicker").maxDate(e.date);
    $('#datetimepicker7').data("DateTimePicker").hide();
    document.getElementById('print').classList.add('d-none')
  });
});

document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('open-modal').click();
})

function populate_table(){
  document.getElementById('table-body-div').innerHTML = ''
  let table_body = ``
  let totalNet = 0
  let totalDefined = 0
  let totalAddItem = 0
  const typee = document.getElementById('filter-pricing').value;
  items.forEach((item, ind) => {
    const check_type = item['pinfo'].is_quotation ? 'qou' : 'inv'
    if(check_type.includes(typee)){
      totalNet += parseInt(item['pinfo'].net) || 0
      if(item['pinfo'].defined_cost != null) totalDefined += parseInt(item['pinfo'].defined_cost) || 0
      if(item['pinfo'].add_item_cost != null) totalAddItem += parseInt(item['pinfo'].add_item_cost) || 0
    table_body += `
     <tr >
     <td style="width: 40px; color: black; border: 1px solid black;">${ind+1}</td>
     <td style="width: 70px; color: black; border: 1px solid black;">${item['pinfo'].pricing_no}</td>
     <td style="width: 70px; color: black; border: 1px solid black;">${item['pinfo'].manual_no}</td>
     <td style="width: 170px; color: black; border: 1px solid black;">${item['pinfo'].client_name}</td>
     <td style="width: 90px; color: black; border: 1px solid black;">${item['pinfo'].is_quotation ? 'Quotation' : 'Invoice' }</td>
     <td style="width: 90px; color: black; border: 1px solid black;">${item['pinfo'].entry_date.split('T')[0] }</td>
     <td style="width: 80px; color: black; border: 1px solid black;">${item['pinfo'].defined_cost != null ? Intl.NumberFormat('en-US').format(item['pinfo'].defined_cost) : '-'}</td>
     <td style="width: 80px; color: black; border: 1px solid black;">${item['pinfo'].add_item_cost != null ? Intl.NumberFormat('en-US').format(item['pinfo'].add_item_cost) : '-'}</td>
     <td style="width: 80px; color: black; border: 1px solid black;">${Intl.NumberFormat('en-US').format(item['pinfo'].net)}</td>
    </tr>
     `
    }
  })
  if(table_body === ``)
  {
    table_body = '<tr><td colspan="9">No Data To Show...</td></tr>'
    document.getElementById('print').classList.add('d-none')
    document.getElementById('report-totals').classList.add('d-none')
  }
  else
  {
    document.getElementById('print').classList.remove('d-none')
    document.getElementById('report-totals').classList.remove('d-none')
    document.getElementById('total-net-val').textContent = Intl.NumberFormat('en-US').format(totalNet)
    document.getElementById('total-defined-val').textContent = Intl.NumberFormat('en-US').format(totalDefined)
    document.getElementById('total-additem-val').textContent = Intl.NumberFormat('en-US').format(totalAddItem)
  }
  document.getElementById('table-body-div').innerHTML = table_body;
}

async function create_data()
{
  items = []
  const from_date = new Date(document.getElementById('from').value)
  const to_date = new Date(document.getElementById('to').value)
  await file_manager
      .loadFile(path.join(__dirname, "../../db/.credentials.json"))
      .then(async (res) => {
        if (res[0].password === document.getElementById('pass').value) {
          document.getElementById('cancel').click();
          await file_manager
              .loadFile(path.join(__dirname, "../../db/.pricings.json"))
              .then((res) => {
                res.forEach(item => {
                  const date = new Date(item['pinfo'].entry_date);
                  const typee = document.getElementById('filter-pricing').value;
                  const check_type = item['pinfo'].is_quotation ? 'qou' : 'inv'
                  if ((date >= from_date && date <= to_date) && check_type.includes(typee)) {
                    items.push(item)
                  }
                })
                document.getElementById('print').classList.remove('d-none')
                document.getElementById('clear').classList.remove('d-none')
                document.getElementById('create').classList.add('d-none')
                populate_table()
              })
        } else {
          alert('Password Incorrect!');
          document.getElementById('cancel').click();
        }
      })
}

document.getElementById('clear').addEventListener('click', (event) => {
  document.getElementById('create').classList.remove('d-none');
  document.getElementById('print').classList.add('d-none')
  document.getElementById('clear').classList.add('d-none')
  document.getElementById('table-body-div').innerHTML = '<tr><td colspan="7">No Data To Show...</td></tr>'
  document.getElementById('filter-pricing').value = '';
  document.getElementById('from').value = '';
  document.getElementById('to').value = '';
})

document.getElementById('confirm').addEventListener('click', (event) => {
  event.preventDefault();
  create_data().then();
})

document.getElementById('filter-pricing').addEventListener('change', (event) => {
  // document.getElementById('print').classList.add('d-none');
  populate_table();
})

document.getElementById('print').addEventListener('click', (event) => {
  var opt = {
    margin:       0.3,
    filename:     `report-${document.getElementById('from').value}-${document.getElementById('to').value}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 5 },
    jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
  };
  file_manager.loadFile(path.join(__dirname, '../../db/.firm.json'))
      .then(res => {
        if (!res || !Array.isArray(res) || res.length === 0) {
          res = [{ name: "", logo: "", address: "", contact: "" }];
        }
        let logoSrc = "";
        if (res[0].logo) {
          try {
            const logoBuffer = fs.readFileSync(res[0].logo);
            const ext = path.extname(res[0].logo).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : ext === '.bmp' ? 'image/bmp' : 'image/png';
            logoSrc = `data:${mime};base64,${logoBuffer.toString('base64')}`;
          } catch (e) {
            logoSrc = "";
          }
        }
        if (!logoSrc) {
          try {
            const defaultLogoPath = path.join(__dirname, '../../images/logo.png');
            const logoBuffer = fs.readFileSync(defaultLogoPath);
            logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          } catch (e) {
            logoSrc = "";
          }
        }
        let table_body = ``
        let total_amount = 0
        let total_defined = 0
        let total_additem = 0
        const typee = document.getElementById('filter-pricing').value;
        items.forEach((item, ind) => {
          const check_type = item['pinfo'].is_quotation ? 'qou' : 'inv'
          if(check_type.includes(typee))
          {
            total_amount += parseInt(item['pinfo'].net) || 0;
            if(item['pinfo'].defined_cost != null) total_defined += parseInt(item['pinfo'].defined_cost) || 0;
            if(item['pinfo'].add_item_cost != null) total_additem += parseInt(item['pinfo'].add_item_cost) || 0;
            table_body += `
               <tr >
                   <td style="width: 39px; color: black; ">${ind+1}</td>
                   <td style="width: 65px; color: black;">${item['pinfo'].pricing_no}</td>
                   <td style="width: 70px; color: black; ">${item['pinfo'].manual_no}</td>
                   <td style="width: 170px; color: black; ">${item['pinfo'].client_name}</td>
                   <td style="width: 90px; color: black; ">${item['pinfo'].is_quotation ? 'Quotation' : 'Invoice' }</td>
                   <td style="width: 90px; color: black; ">${item['pinfo'].entry_date.split('T')[0] }</td>
                    <td style="width: 80px; color: black; ">${item['pinfo'].defined_cost != null ? Intl.NumberFormat('en-US').format(item['pinfo'].defined_cost) : '-'}</td>
                    <td style="width: 80px; color: black; ">${item['pinfo'].add_item_cost != null ? Intl.NumberFormat('en-US').format(item['pinfo'].add_item_cost) : '-'}</td>
                    <td style="width: 80px; color: black; ">${Intl.NumberFormat('en-US').format(item['pinfo'].net)}</td>
          </tr>
              `
          }
        })
        let header = `
            <div style="display: flex; flex-direction: row; margin-bottom: 5px">
                <img alt="img" src="${logoSrc}" style="height: 100px; width: 80px; margin-right: 10px" />
                <div style="display: flex; flex-direction: column; ">
                   <h3 style="color: black">${res[0].name}</h3>
                   <div style="display: flex; flex-direction: row; justify-content: space-between; border-bottom: 2px solid grey; width: 700px">
                       <p style="color: black; font-size: 12px;">${res[0].address}, Ph # ${res[0].contact}</p>
                       <p style="color: black; font-size: 13px; position: absolute; right: 0;">Date: ${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}</p>
                   </div>
                   <p style="color: black; font-size: 10px; margin-top: 5px">This is a system generated report of all pricings [ Quotations / Invoices ] between following dates:</p>
                    <div style="display: flex; flex-direction: row; margin-top: 1px">
                         <p style="color: black; width: 150px; font-size: 10px;"><b>From Date:&nbsp; </b>${ new Date(Date.parse(document.getElementById('from').value)).getDate()}-${new Date(Date.parse(document.getElementById('from').value)).getMonth()+1}-${new Date(Date.parse(document.getElementById('from').value)).getFullYear()}</p>
                         <p style="color: black; width: 150px; font-size: 10px;"><b>To Date:&nbsp; </b> ${ new Date(Date.parse(document.getElementById('to').value)).getDate()}-${new Date(Date.parse(document.getElementById('to').value)).getMonth()+1}-${new Date(Date.parse(document.getElementById('to').value)).getFullYear()}</p>
                         <p style="color: black; width: 350px; font-size: 10px;"><b>Total Amount:&nbsp; </b> ${ ' ' + Intl.NumberFormat('en-US').format(total_amount) + ' /-' }</p>
                    </div>
                </div>
            </div>
          `;

        let table = `
                                
                                    <table style="width: 100%; table-layout: fixed; font-size: 10px; border: 1px solid black;" >
                                        <thead style="font-size: 10px">
                                        <tr style="text-align: center; background-color: darkgrey; border-top: 1px solid black; border-bottom: 0.5px solid black">
                                             <th class="p-1" style="width: 40px; color: black;  border-left: 1px solid black; border-right: 0.5px solid black; font-size: 10px;">No.</th>
                                             <th class="" style="width: 90px;  color: black;border-left: 0.5px solid black; border-right: 0.5px solid black;font-size: 10px ">Pricing No.</th>
                                             <th class="" style="width: 100px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black;font-size: 10px">Reference No.</th>
                                             <th class="p-1" style="width: 170px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black;font-size: 10px">Client Name</th>
                                             <th class="p-1" style="width: 70px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black;font-size: 10px">Type</th>
                                             <th class="p-1" style="width: 70px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black;font-size: 10px">Date</th>
                                             <th class="" style="width: 80px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black; font-size: 10px">Defined Cost</th>
                                             <th class="" style="width: 80px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black; font-size: 10px">Add Item Cost</th>
                                             <th class="" style="width: 80px; border-left: 0.5px solid black; color: black; border-right: 0.5px solid black; font-size: 10px">Net Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody id="table-body-div" style="font-size: 10px; text-align: center">
                                            ${table_body}
                                        </tbody>
                                    </table>
  `
        let totals = `
            <div style="display: flex; justify-content: flex-end; gap: 40px; padding: 8px 20px; background-color: darkgrey; border: 1px solid black; border-top: 2px solid black; margin-top: 0;">
                <div><b style="color: black; font-size: 11px;">Total Defined Cost: ${Intl.NumberFormat('en-US').format(total_defined)}</b></div>
                <div><b style="color: black; font-size: 11px;">Total Add Item Cost: ${Intl.NumberFormat('en-US').format(total_additem)}</b></div>
                <div><b style="color: black; font-size: 11px;">Total Net Amount: ${Intl.NumberFormat('en-US').format(total_amount)}</b></div>
            </div>
        `
        let html = `
                    ${header}
                    ${table}
                    ${totals}
                    `
        html2pdf().set(opt).from(html).to('pdf').save(`report-${document.getElementById('from').value}-to-${document.getElementById('to').value}.pdf`);
        alert("PDF Report is generated successfully!")
      })

})
