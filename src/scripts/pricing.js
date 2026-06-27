const remote = require('electron').remote
const fs = require("fs");
const { event } = require('jquery');
const path = require('path')
const file_manager = remote.require(path.join(__dirname, '../scripts/file_manager.js'))

let pricing = {}
let item = null
let items = []
let code_rate = 0
let door = 0
let handler = 0
let hardware = 0
let shelve = 0
let check_list = []
let check_list2 = []
let custom_val = 0.0


function toggle(event){
  const elevation = event.target.id.split('~')[0]
  const my_item_id = event.target.id.split('~')[1]
  const elevation_items = pricing[elevation]
  if(event.target.checked)
  {
    document.getElementById('print').disabled = true;
    elevation_items.forEach(i => {
      if(i.item_id.toString() === my_item_id){
        check_list.push(i)
        document.getElementById('delete').disabled = false;
        if(check_list.length >= 2)
        {
          clear_dropdowns()
          item = null
          document.getElementById('edit').disabled = true
          if(check_list.length === items.length)
          {
            document.getElementById('checkbox-all').checked=true;
          }
        }
        else
        {
          item = i;
          document.getElementById('edit').disabled = false
        }
      }
    })
  }
  else
  {
    elevation_items.forEach(i => {
      if(i.item_id.toString() === my_item_id){
        const ind = check_list.indexOf(i)
        check_list.splice(ind, 1)
      }
    })
    if(check_list.length === 1)
    {
      item = check_list[0];
      document.getElementById('edit').disabled = false
      document.getElementById('delete').disabled = false;
    }
    else
    {
      document.getElementById('checkbox-all').checked = false
      document.getElementById('edit').disabled = true
      document.getElementById('delete').disabled = false;

      if(check_list.length === 0) {
        document.getElementById('print').disabled = false;
        document.getElementById('delete').disabled = true;
      }
      clear_dropdowns();

    }
  }
}

document.getElementById('delete').addEventListener('click', (event) => {
  event.preventDefault();
  check_list.forEach(i => {
    const ind = items.indexOf(i);
    items.splice(ind, 1);
  })
  const pinfo = pricing['pinfo']
  pricing = {}
  items.forEach(i => {
    if(!(i.elevation in pricing)){
      pricing[i.elevation] = [i]
    }
    else
    {
      pricing[i.elevation].push(i)
    }
  })
  pricing["pinfo"] = pinfo
  check_list = []
  clear_dropdowns();
  document.getElementById('delete').disabled = true;
  document.getElementById('edit').disabled = true
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').click()
  populate_table();
  discount_and_tax()
})


function change_code_rate(event){
  if(event.which === 13)
  {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById('code').value)
              {
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - code_rate;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                try {
                  const select = document.getElementById("code-price");
                  const selectedIndex = select.selectedIndex;
                  const selectedValue = select.value;
                  const selectedText = select.options[selectedIndex].text; 
                  if (selectedText === "Box Sheet Price/PC") {
                    code_rate = parseFloat(i.rate)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.back_area) * parseFloat(rates.back_area_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.secondary_top) * parseFloat(rates.secondary_top_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                  else if (selectedText === "Box Back Sheet Price/PC") {
                    code_rate = parseFloat(i.back_area)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.rate) * parseFloat(rates.rate_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.secondary_top) * parseFloat(rates.secondary_top_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                  else if (selectedText === "Secondary Top Sheet Price/PC") {
                    code_rate = parseFloat(i.secondary_top)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.back_area) * parseFloat(rates.back_area_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.rate) * parseFloat(rates.rate_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                  
                }
                catch (e){
                  code_rate = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + code_rate;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
        })
  }
}


function change_finishing_rate(event){
  if(event.which === 13)
  {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById('door-panel').value)
              {
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - door;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                try{
                  door = parseFloat(i.rate)
                  door = door * parseFloat(document.getElementById('finishing-new-rate').value);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                  door = door + edging;
                }
                catch (e) {
                  door = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + door;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
          
        })
  }
}


function change_handles_rate(event){
  if(event.which === 13)
  {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById('handler').value)
              {
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - handler;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                try{
                  handler = parseFloat(i.rate)
                  handler = handler * parseFloat(document.getElementById('handle-new-rate').value);
                }
                catch (e) {
                  handler = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + handler;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
         
        })
  }
}


function change_hardware_rate(event){
  if(event.which === 13)
  {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById('hardware').value)
              {
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - hardware;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                try{
                  const select = document.getElementById("hardware-price");
                  const selectedIndex = select.selectedIndex;
                  const selectedValue = select.value;
                  const selectedText = select.options[selectedIndex].text; 
                  if(selectedText === "Hinges Price/SET"){
                    hardware = parseFloat(i.rate)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.slider) * parseFloat(rates.slider_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.lift) * parseFloat(rates.lift_hardware);
                    hardware = hardware + lift;
                  }
                  else if (selectedText === "Slider Price/SET"){
                    hardware = parseFloat(i.slider)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.rate) * parseFloat(rates.rate_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.lift) * parseFloat(rates.lift_hardware);
                    hardware = hardware + lift;
                  }
                  else if (selectedText === "Lift Up Price/SET"){
                    hardware = parseFloat(i.lift)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.rate) * parseFloat(rates.rate_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.slider) * parseFloat(rates.slider_hardware);
                    hardware = hardware + lift;
                  }
                }
                catch (e) {
                  hardware = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + hardware;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
        })
  }
}


function change_shelve_rate(event){
  if(event.which === 13)
  {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById("shelves").value)
              {
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - shelve;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                try{
                  shelve = parseFloat(i.rate)
                  shelve = shelve * parseFloat(document.getElementById('shelve-new-rate').value);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + shelve;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
          
        })
  }
}


document.getElementById('edit').addEventListener('click', (event) => {
  event.preventDefault()

  document.getElementById('elevation-input').value = item.elevation;
  document.getElementById('utility').value = item.utility;

  file_manager.loadFile(path.join(__dirname, `../db/.types.json`))
      .then(res => {
        const types = document.getElementById('type')
        types.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        types.options.add(opt)
        res.forEach(iter => {
          if(iter.utility_id === item.utility)
          {
            const opt = document.createElement('option')
            opt.value = iter.id;
            opt.text = iter.title
            types.options.add(opt)
          }
        })
        document.getElementById('type').value = item.type;
      })

  file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
      .then(res => {
        const codes = document.getElementById('code')
        codes.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        codes.options.add(opt)
        res.forEach(iter => {
          if(iter.utility_id === document.getElementById('utility').value && iter.type_id === item.type)
          {
            const opt = document.createElement('option')
            opt.value = iter.id;
            opt.text = iter.title
            codes.options.add(opt)
          }
        })
        document.getElementById('code').value = item.code;
        file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === item.code)
              {
                try { 
                  if (item.code_rate_type === "Box Sheet Price/PC") {
                    document.getElementById("code-price").selectedIndex = 0;
                    document.getElementById('code-new-rate').value = item.code_rate;
                    code_rate = parseFloat(i.rate)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.back_area) * parseFloat(rates.back_area_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.secondary_top) * parseFloat(rates.secondary_top_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                  else if (item.code_rate_type === "Box Back Sheet Price/PC") {
                    document.getElementById("code-price").selectedIndex = 1;
                    document.getElementById('code-new-rate').value = item.code_rate;
                    code_rate = parseFloat(i.back_area)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.rate) * parseFloat(rates.rate_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.secondary_top) * parseFloat(rates.secondary_top_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                  else if (item.code_rate_type === "Secondary Top Sheet Price/PC") {
                    document.getElementById("code-price").selectedIndex = 2;
                    document.getElementById('code-new-rate').value = item.code_rate;
                    code_rate = parseFloat(i.secondary_top)
                    code_rate = code_rate * parseFloat(document.getElementById('code-new-rate').value)
                    const back_area = parseFloat(i.back_area) * parseFloat(rates.back_area_codes);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                    const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                    const secondary_top = parseFloat(i.rate) * parseFloat(rates.rate_codes);
                    code_rate = code_rate + back_area + edging + screws + secondary_top;
                  }
                }
                catch (e){
                  code_rate = i.rate
                }
              }
            })
          })
        })
      })

  document.getElementById('qty').value = item.qty;

  file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
      .then(res => {
        const doors = document.getElementById('door-panel')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(iter => {
          if(iter.utility_id === document.getElementById('utility').value && iter.type_id === document.getElementById('type').value && iter.code_id === item.code)
          {
            const opt = document.createElement('option')
            opt.value = iter.id;
            opt.text = iter.title
            doors.options.add(opt)
          }
        })
        document.getElementById('door-panel').value = item.door_panel;
        file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === item.door_panel)
              {
                try{
                  door = parseFloat(i.rate)
                  document.getElementById('finishing-new-rate').value = item.finishing_rate;
                  door = door * parseFloat(item.finishing_rate);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                  door = door + edging;
                }
                catch (e) {
                  door = i.rate
                }
              
              }
            })
          })
          
        })
      })

  file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
      .then(res => {
        const doors = document.getElementById('handler')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if(document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code)
          {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
        document.getElementById('handler').value = item.handler;
        file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === item.handler)
              {
                try{
                  handler = parseFloat(i.rate)
                  document.getElementById('handle-new-rate').value = item.handle_rate;
                  handler = handler * parseFloat(item.handle_rate);
                }
                catch (e) {
                  handler = i.rate
                }
              }
            })
          })
         
        })
      })

  file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
      .then(res => {
        const doors = document.getElementById('hardware')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if(i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code)
          {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
        document.getElementById('hardware').value = item.hardware;
        file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === item.hardware)
              {
                try{
                  
                  if(item.hardware_rate_type === "Hinges Price/SET"){
                    document.getElementById("hardware-price").selectedIndex = 0;
                    document.getElementById('harware-new-rate').value = item.hardware_rate
                    hardware = parseFloat(i.rate)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.slider) * parseFloat(rates.slider_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.lift) * parseFloat(rates.lift_hardware);
                    hardware = hardware + lift;
                  }
                  else if (item.hardware_rate_type === "Slider Price/SET"){
                    document.getElementById("hardware-price").selectedIndex = 1;
                    document.getElementById('harware-new-rate').value = item.hardware_rate
                    hardware = parseFloat(i.slider)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.rate) * parseFloat(rates.rate_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.lift) * parseFloat(rates.lift_hardware);
                    hardware = hardware + lift;
                  }
                  else if (item.hardware_rate_type === "Lift Up Price/SET"){
                    document.getElementById("hardware-price").selectedIndex = 2;
                    document.getElementById('harware-new-rate').value = item.hardware_rate
                    hardware = parseFloat(i.lift)
                    hardware = hardware * parseFloat(document.getElementById('harware-new-rate').value);
                    const slider = parseFloat(i.rate) * parseFloat(rates.rate_hardware);
                    hardware = hardware + slider;
                    const lift = parseFloat(i.slider) * parseFloat(rates.slider_hardware);
                    hardware = hardware + lift;
                  }
                }
                catch (e) {
                  hardware = i.rate
                }
              
              }
            })
          })
          
        })
      })

  file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
      .then(res => {
        const doors = document.getElementById('shelves')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if(i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code)
          {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
          if(i.id === item.shelves)
            shelve = parseFloat(i.rate);
        })
        document.getElementById('shelves').value = item.shelves;
        file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === item.shelves)
              {
                try{
                  shelve = parseFloat(i.rate)
                  document.getElementById('shelve-new-rate').value = item.shelve_rate;
                  shelve = shelve * parseFloat(item.shelve_rate);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
              }
            })
          })
          
        })
      })

  document.getElementById('is_shelve').value = item.is_shelve;
  document.getElementById('additional').value = item.additional;
  document.getElementById('unit').value = item.unit;
  document.getElementById('total').innerHTML = item.total;

  // item = {
  //   "item_id": items.length + 1,
  //   "elevation": document.getElementById('elevation-input').value,
  //   "utility": document.getElementById('utility').value,
  //   "utility_text": document.getElementById('utility').options[document.getElementById('utility').selectedIndex].text,
  //   "type": document.getElementById('type').value,
  //   "type_text": document.getElementById('type').options[document.getElementById('type').selectedIndex].text,
  //   "code": document.getElementById('code').value,
  //   "code_text": document.getElementById('code').options[document.getElementById('code').selectedIndex].text,
  //   "qty": document.getElementById('qty').value,
  //   "door_panel": document.getElementById('door-panel').value,
  //   "door_panel_text": document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text,
  //   "handler": document.getElementById('handler').value,
  //   "handler_text": document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text,
  //   "hardware": document.getElementById('hardware').value,
  //   "hardware_text": document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text,
  //   "shelves": document.getElementById('shelves').value,
  //   "shelves_text": document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text === "Select" ? "no" : document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text,
  //   "is_shelve": document.getElementById('is_shelve').value,
  //   "custom": document.getElementById('custom').value,
  //   "unit": parseFloat(document.getElementById('unit').value),
  //   "total": parseFloat(document.getElementById('total').innerHTML)
  // }
  //
  //   item.item_id = check_list[0].item_id;
  //   items.forEach((ii, ind) => {
  //     if(ii.item_id === item.item_id)
  //       items[ind] = item
  //   })
  //
  // let pinfo = ""
  // if("pinfo" in pricing)
  // {
  //   pinfo = pricing["pinfo"]
  // }
  // pricing = {}
  // items.forEach(kk => {
  //   if(!(kk.elevation in pricing)){
  //     pricing[kk.elevation] = [kk]
  //   }
  //   else
  //   {
  //     pricing[kk.elevation].push(kk)
  //   }
  //   if(pinfo !== "")
  //     pricing["pinfo"] = pinfo
  //   check_list = []
  // })
  // document.getElementById('edit').disabled = true;
  // document.getElementById('delete').disabled = true;
  // document.getElementById('save').disabled = false;
  // populate_table()
  // clear_dropdowns()
})

function clear_dropdowns() {
  document.getElementById('elevation-input').value = "";
  document.getElementById('utility').value = "";
  document.getElementById('type').innerHTML = "";
  document.getElementById('code').innerHTML = "";
  document.getElementById('qty').value = "1";
  document.getElementById('door-panel').innerHTML = "";
  document.getElementById('handler').innerHTML = "";
  document.getElementById('hardware').innerHTML = "";
  document.getElementById('shelves').innerHTML = "";
  document.getElementById('is_shelve').value = "yes";
  document.getElementById('additional').value = "0";
  document.getElementById('unit').value = "0";
  document.getElementById('total').innerHTML = "0";
  document.getElementById('unit').readOnly = true;
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  item = null;
  code_rate = 0;
  door = 0;
  handler = 0;
  hardware = 0;
  shelve = 0;
  custom_val = 0;
}

document.getElementById('clear').addEventListener('click', (event) => {
  event.preventDefault();
  clear_dropdowns();
  // file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
  //     .then(res => {
  //       document.getElementById('pricing-no').value = res.length + 1;
  //       document.getElementById("entry-date").valueAsDate = new Date();
  //       document.getElementById('delivery-days').value = "";
  //       document.getElementById('manual-input').value = "";
  //       document.getElementById('client-input').value = "";
  //       document.getElementById('product-input').value = "";
  //       document.getElementById('sales-input').value = "";
  //       document.getElementById('carcass-input').value = "";
  //       if (document.getElementById('is_quotation').checked)
  //         document.getElementById('is_quotation').click()
  //       document.getElementById('elevation-input').value = "";
  //       document.getElementById('utility').value = "";
  //       document.getElementById('type').innerHTML = "";
  //       document.getElementById('code').innerHTML = "";
  //       document.getElementById('qty').value = "1";
  //       document.getElementById('door-panel').innerHTML = "";
  //       document.getElementById('handler').innerHTML = "";
  //       document.getElementById('hardware').innerHTML = "";
  //       document.getElementById('shelves').innerHTML = "";
  //       document.getElementById('is_shelve').value = "yes";
  //       document.getElementById('custom').value = "no";
  //       document.getElementById('unit').value = "0";
  //       document.getElementById('total').innerHTML = "0";
  //       item = null;
  //       code_rate = 0;
  //       door = 0;
  //       handler = 0;
  //       hardware = 0;
  //       shelve = 0;
  //     })
})

function all_clear(){
  file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        if(res.length === 0)
        {
          document.getElementById('pricing-no').value = "1"
        }
        else {
          document.getElementById('pricing-no').value = parseFloat(res[res.length - 1]["pinfo"].pricing_no) + 1;
        }
        document.getElementById("entry-date").valueAsDate = new Date();
        document.getElementById('entry-date-backup').value = '';
        document.getElementById('pricing-type').value = ''
        document.getElementById('delivery-days').value = "";
        document.getElementById('manual-input').value = "";
        document.getElementById('category-input').value = "";
        document.getElementById('client-input').value = "";
        document.getElementById('product-input').value = "";
        document.getElementById('sales-input').value = "";
        document.getElementById('carcass-input').value = "";
        if (document.getElementById('is_quotation').checked)
          document.getElementById('is_quotation').click()
        document.getElementById('elevation-input').value = "";
        document.getElementById('utility').value = "";
        document.getElementById('type').innerHTML = "";
        document.getElementById('code').innerHTML = "";
        document.getElementById('qty').value = "1";
        document.getElementById('door-panel').innerHTML = "";
        document.getElementById('handler').innerHTML = "";
        document.getElementById('hardware').innerHTML = "";
        document.getElementById('shelves').innerHTML = "";
        document.getElementById('is_shelve').value = "yes";
        document.getElementById('additional').value = "0";
        document.getElementById('unit').value = "0";
        document.getElementById('total').innerHTML = "0";
        document.getElementById('table-body-div').innerHTML = "";
        document.getElementById('save').disabled = true;
        document.getElementById('edit').disabled = true;
        document.getElementById('save').innerHTML = 'Save'
        document.getElementById('delete').disabled = true;
        document.getElementById('print').disabled = true;
        document.getElementById('open').disabled = false;
        document.getElementById('gross-amount').value = 0;
        document.getElementById('discount').value = 0;
        document.getElementById('discount').disabled = true;
        document.getElementById('tax').value = 0;
        document.getElementById('tax').disabled = true;
        document.getElementById('calculated-tax').value = 0;
        document.getElementById('net').value = 0;
        document.getElementById('is_quotation').checked = true
        pricing = {}
        item = null
        items = []
        code_rate = 0
        door = 0
        handler = 0
        hardware = 0
        shelve = 0
        custom_val = 0
        check_list = []
        check_list2 = []
      })
}

function save_func(event) {
  event.preventDefault();
}

function load_pricing_dropdown() {
  const files = ['manuals', 'products', 'sales', 'carcass', 'elevations', 'category']
  files.forEach(i => {
    file_manager
        .loadFile(path.join(__dirname, `../db/.${i}.json`))
        .then((res) => {
          const manual = document.getElementById(i);
          res.forEach(i => {
            const opt = document.createElement('option')
              opt.value = i
            opt.style.color = 'black'
            manual.appendChild(opt)
          })
        })
  })
  file_manager
      .loadFile(path.join(__dirname, `../db/.utilities.json`))
      .then((res) => {
        const utilities = document.getElementById('utility');
        utilities.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = ""
        opt.text = "Select"
        opt.style.color = 'black'
        opt.classList.add('d-none')
        utilities.appendChild(opt)
        res.forEach(i => {
          const opt = document.createElement('option')
          opt.value = i.id
          opt.text = i.title
          opt.style.color = 'black'
          utilities.options.add(opt)
        })
      })
  file_manager
      .loadFile(path.join(__dirname, `../db/.clients.json`))
      .then((res) => {
        const utilities = document.getElementById('client-input');
        utilities.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = ""
        opt.text = "Select"
        opt.style.color = 'black'
        opt.classList.add("d-none")
        utilities.appendChild(opt)
        res.forEach(i => {
          const opt = document.createElement('option')
          opt.value = i.id
          opt.text = i.name
          opt.style.color = 'black'
          utilities.appendChild(opt)
        })
      })
  const qty = document.getElementById('qty')
  for (let i = 1; i < 100; i++) {
    const opt = document.createElement('option')
    opt.value = i
    opt.text = i
    opt.style.color = 'black'
    qty.options.add(opt)
  }
  
  file_manager
      .loadFile(path.join(__dirname, `../db/.rates.json`))
      .then((res) => {
        const hardwarePrice = document.getElementById('hardware-price')
        hardwarePrice.innerHTML = "";
        [["Hinges Price/SET", "rate_hardware"], ["Slider Price/SET", "slider_hardware"], ["Lift Up Price/SET", "lift_hardware"]].forEach(i => {
          const opt = document.createElement('option')
          opt.value = res[i[1]]
          opt.text = i[0]
          opt.style.color = 'black'
          hardwarePrice.options.add(opt)
        })
        const codePrice = document.getElementById('code-price')
        codePrice.innerHTML = "";
        [["Box Sheet Price/PC", "rate_codes"], ["Box Back Sheet Price/PC", "back_area_codes"], ["Secondary Top Sheet Price/PC", "secondary_top_codes"]].forEach(i => {
          const opt = document.createElement('option')
          opt.value = res[i[1]]
          opt.text = i[0]
          opt.style.color = 'black'
          codePrice.options.add(opt)
        })
      })
}

function delete_dropdown( drp, inp){
  const val = document.getElementById(inp).value;
  file_manager
      .loadFile(path.join(__dirname, `../db/.${drp}.json`))
      .then((res) => {
        ittems = []
        res.forEach(i => {
          if(i !== val)
            ittems.push(i)
        })
        file_manager
            .writeFile(path.join(__dirname, `../db/.${drp}.json`), ittems)
            .then((ress) => {
              file_manager
                  .loadFile(path.join(__dirname, `../db/.${drp}.json`))
                  .then((res) => {
                    const manual = document.getElementById(drp);
                    manual.innerHTML = ""
                    res.forEach(i => {
                      const opt = document.createElement('option')
                      opt.value = i
                      opt.style.color = 'black'
                      manual.appendChild(opt)
                    })
                    document.getElementById(inp).value = ""
                  })
            })
      })
}

function update_dropdown_del(event, drp, inp){
  const val = document.getElementById(inp).value;
  if(val !== '' && event.key === "Delete")
  {
    delete_dropdown(drp, inp)
  }
}

function save_dropdown(event, drp, drp_text){
  if(event.which === 13)
  {
    event.preventDefault();
    const new_val = document.getElementById(drp_text).value
    let values= new Set();
    const ddl = document.getElementById(drp);
    for (let i = 0; i < ddl.options.length; i++) {
      values.add(ddl.options[i].value);
    }
    const manual = document.getElementById(drp);
    manual.innerHTML = ""
    values.add(new_val)
    values.forEach(i => {
      const opt = document.createElement('option')
      opt.value = i
      manual.appendChild(opt)
    })
    manual.value = new_val
    file_manager
        .writeFile(path.join(__dirname, `../db/.${drp}.json`), Array.from(values))
        .then((res) => {
        })
  }
}

function utility_change(event){
  event.preventDefault();
  const utility = event.target.value;
  document.getElementById('type').innerHTML = ""
  document.getElementById('code').innerHTML = ""
  document.getElementById('door-panel').innerHTML = ''
  document.getElementById('handler').innerHTML = ''
  document.getElementById('hardware').innerHTML = ''
  document.getElementById('shelves').innerHTML = ''
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  code_rate = 0
  door = 0
  handler = 0
  hardware = 0
  shelve = 0
  document.getElementById('unit').value = 0
  document.getElementById('total').innerHTML = '0'
  if(utility !== "")
  {
    file_manager.loadFile(path.join(__dirname, `../db/.types.json`))
        .then(res => {
          const types = document.getElementById('type')
          types.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          types.options.add(opt)
          res.forEach(i => {
            if(i.utility_id === utility)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              types.options.add(opt)
            }
          })
        })
  }
}

function type_change(event){
  event.preventDefault();
  const type = event.target.value;
  document.getElementById('door-panel').innerHTML = ''
  document.getElementById('handler').innerHTML = ''
  document.getElementById('hardware').innerHTML = ''
  document.getElementById('shelves').innerHTML = ''
  document.getElementById('code').innerHTML = ''
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  code_rate = 0
  door = 0
  handler = 0
  hardware = 0
  shelve = 0
  document.getElementById('unit').value = 0
  document.getElementById('total').innerHTML = '0'
  if(type !== "")
  {
    file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
        .then(res => {
          const codes = document.getElementById('code')
          codes.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          codes.options.add(opt)
          res.forEach(i => {
            if(i.utility_id === document.getElementById('utility').value && i.type_id === type)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              codes.options.add(opt)
            }
          })
        })
  }
}

function code_change(event){
  event.preventDefault();
  const code = event.target.value;
  if(code === '')
  {
    document.getElementById('additional').value = 0;
    custom_val = 0
    document.getElementById('unit').value = 0;
    document.getElementById('total').innerHTML = '0'
    code_rate = 0
    door = 0
    handler = 0
    hardware = 0
    shelve = 0
    document.getElementById('door-panel').innerHTML = '';
    document.getElementById('handler').innerHTML = '';
    document.getElementById('hardware').innerHTML = '';
    document.getElementById('shelves').innerHTML = '';
    document.getElementById('code-new-rate').value = 0;
    document.getElementById('finishing-new-rate').value = 0;
    document.getElementById('harware-new-rate').value = 0;
    document.getElementById("hardware-price").selectedIndex = 0;
    document.getElementById('handle-new-rate').value = 0;
    document.getElementById('shelve-new-rate').value = 0;
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === code)
              {
                try {
                  document.getElementById("code-price").selectedIndex = 0;
                  code_rate = parseFloat(i.rate)
                  document.getElementById('code-new-rate').value = rates.rate_codes
                  code_rate = code_rate * parseFloat(rates.rate_codes);
                  const back_area = parseFloat(i.back_area) * parseFloat(rates.back_area_codes);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_codes);
                  const screws = parseFloat(i.screws) * parseFloat(rates.screws_codes);
                  const secondary_top = parseFloat(i.secondary_top) * parseFloat(rates.secondary_top_codes);
                  code_rate = code_rate + back_area + edging + screws + secondary_top;
                }
                catch (e){
                  code_rate = i.rate
                }
                document.getElementById('unit').value = code_rate;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * code_rate, 0);
              }
            })
          })
        })
    door = 0
    handler = 0
    hardware = 0
    shelve = 0
    document.getElementById('door-panel').value = ''
    document.getElementById('handler').value = ''
    document.getElementById('hardware').value = ''
    document.getElementById('shelves').value = ''
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
        .then(res => {
          const doors = document.getElementById('door-panel')
          doors.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          doors.options.add(opt)
          res.forEach(i => {
            if(i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              doors.options.add(opt)
            }
          })
        })

    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
        .then(res => {
          const doors = document.getElementById('handler')
          doors.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          doors.options.add(opt)
          res.forEach(i => {
            if(document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              doors.options.add(opt)
            }
          })
        })

    file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
        .then(res => {
          const doors = document.getElementById('hardware')
          doors.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          doors.options.add(opt)
          res.forEach(i => {
            if(i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              doors.options.add(opt)
            }
          })
        })

    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
        .then(res => {
          const doors = document.getElementById('shelves')
          doors.innerHTML = ""
          const opt = document.createElement('option')
          opt.value = "";
          opt.text = "Select"
          opt.classList.add('d-none')
          doors.options.add(opt)
          res.forEach(i => {
            if(i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code)
            {
              const opt = document.createElement('option')
              opt.value = i.id;
              opt.text = i.title
              doors.options.add(opt)
            }
          })
        })
  }
}

document.getElementById("hardware-price").addEventListener("change", (event) => {
  document.getElementById("harware-new-rate").value = event.target.value;
})

document.getElementById("code-price").addEventListener("change", (event) => {
  document.getElementById("code-new-rate").value = event.target.value;
})

function discount_and_tax(){
  if(document.getElementById('gross-amount').value.toString() === '0')
  {
    document.getElementById('discount').value = 0;
    document.getElementById('tax').value = 0;
    document.getElementById('calculated-tax').value = 0;
    document.getElementById('net').value = document.getElementById('gross-amount').value;
  }
  else if( document.getElementById('discount').value !== "" && document.getElementById('tax').value !== "" ) {
    const disc = Math.round(document.getElementById('discount').value)
    const discounted_value =  Math.round(document.getElementById('gross-amount').value) - disc;
    const tax = Math.round(document.getElementById('tax').value);
    const calculated = (discounted_value * tax) / 100;
    document.getElementById('net').value = Math.round(discounted_value + calculated)
    document.getElementById('calculated-tax').value = Math.round(calculated);
  }
  else if( document.getElementById('discount').value !== "" && document.getElementById('tax').value === "" ) {
    const disc = Math.round(document.getElementById('discount').value)
    document.getElementById('net').value = Math.round(Math.round(document.getElementById('gross-amount').value) - disc);
    document.getElementById('tax').value = 0;
    document.getElementById('calculated-tax').value = 0;
  }
  else if(document.getElementById('discount').value === "" && document.getElementById('tax').value !== "") {
    const tax = Math.round(document.getElementById('tax').value);
    const calculated = Math.round(Math.round(document.getElementById('gross-amount').value) * tax) / 100;
    document.getElementById('calculated-tax').value = Math.round(calculated);
    document.getElementById('net').value = Math.round(Math.round(document.getElementById('gross-amount').value) + calculated);
    document.getElementById('discount').value = 0;
  }
  else {
    document.getElementById('discount').value = 0;
    document.getElementById('tax').value = 0;
    document.getElementById('calculated-tax').value = 0;
    document.getElementById('net').value = document.getElementById('gross-amount').value;
  }
}

function populate_table() {
  document.getElementById('gross-amount').value = 0;
  const table = document.getElementById('table-body-div')
  table.innerHTML = ""
  const keys = Object.keys(pricing)
  let count = 1
  keys.forEach(i => {
    if(pricing[i].length>0 && i !== "pinfo")
    {
      table.innerHTML += `<tr class="elevation-row-pricing"><td style=" font-size: large; text-align: center; padding: 0px; color: black; font-weight: bold; border-bottom: 1px solid black" colspan="12">${i}</td></tr>`;
      pricing[i].forEach((j, ind) => {
        table.innerHTML += `
          <tr class="tr-shadow" style=" ">
            <td class="p-1" style="width: 60px; border-right: 1px solid black; border-bottom: 1px solid black;">
              <label class="au-checkbox" style="margin-top: 2.5px"> 
                <input type="checkbox" id="${i+'~'+j.item_id.toString()}" onchange="toggle(event);">
                <span class="au-checkmark" style="border: 1px solid green; width: 20px; height: 20px"></span>
              </label>
            </td>
            <td style="width: 40px; color: black; border-right: 1px solid black; border-bottom: 1px solid black;" class="p-1">${count}</td>
            <td class="p-1 might-overflow" style="width: 150px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.utility_text}</td>
            <td class="p-1" style="width: 185px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black;  border-right: 1px solid black; border-bottom: 1px solid black;">${j.type_text}</td>
            <td class="p-1" style="width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.code_text}</td>
            <td class="p-1" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; width: 35px; border-right: 1px solid black; border-bottom: 1px solid black;">${j.qty}</td>
            <td class="p-1" style="width: 175px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.door_panel_text}</td>
            <td class="p-1" style="width: 100px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.handler_text}</td>
            <td class="p-1" style="width: 120px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.hardware_text}</td>
            <td class="p-1" style="width: 105px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.shelves_text}</td>
            <td class="p-1" style="width: 85px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${Intl.NumberFormat('en-US').format(j.unit)}</td>
            <td class="p-1" style="width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-bottom: 1px solid black; ">${Intl.NumberFormat('en-US').format(j.total)}</td>
          </tr>`;
        document.getElementById('gross-amount').value = Math.round(document.getElementById('gross-amount').value) + Math.round(j.total);
        count +=1
      });
      discount_and_tax()
    }
  })
}

document.getElementById('form-pricing').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('open').disabled = true;
  const select = document.getElementById("hardware-price");
  const selectedIndex = select.selectedIndex;
  const selectedValue = select.value;
  const selectedText = select.options[selectedIndex].text; 
  const select1 = document.getElementById("code-price");
  const selectedIndex1 = select.selectedIndex;
  const selectedValue1 = select.value;
  const selectedText1 = select.options[selectedIndex].text; 
  item = {
    "item_id": items.length + 1,
    "elevation": document.getElementById('elevation-input').value,
    "utility": document.getElementById('utility').value,
    "utility_text": document.getElementById('utility').options[document.getElementById('utility').selectedIndex].text,
    "type": document.getElementById('type').value,
    "type_text": document.getElementById('type').options[document.getElementById('type').selectedIndex].text,
    "code": document.getElementById('code').value,
    "code_text": document.getElementById('code').options[document.getElementById('code').selectedIndex].text,
    "qty": document.getElementById('qty').value,
    "door_panel": document.getElementById('door-panel').value,
    "door_panel_text": document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text === "Select" ? "" : document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text,
    "handler": document.getElementById('handler').value,
    "handler_text": document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text === "Select" ? "" : document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text,
    "hardware": document.getElementById('hardware').value,
    "hardware_text": document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text === "Select" ? "" : document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text,
    "shelves": document.getElementById('shelves').value,
    "shelves_text": document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text === "Select" ? "" : document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text,
    "is_shelve": document.getElementById('is_shelve').value,
    "additional": document.getElementById('additional').value,
    "unit": parseFloat(document.getElementById('unit').value),
    "total": Math.round(parseFloat(document.getElementById('total').innerHTML), 0),
    "code_rate": document.getElementById('code-new-rate').value,
    "finishing_rate": document.getElementById('finishing-new-rate').value,
    "handle_rate": document.getElementById('handle-new-rate').value,
    "hardware_rate": document.getElementById('harware-new-rate').value,
    "hardware_rate_type": selectedText,
    "code_rate_type": selectedText1,
    "shelve_rate": document.getElementById('shelve-new-rate').value,
  }
  if(document.getElementById('is_shelve').value === 'no')
  {
    item.shelves_text = ''
  }
  if(check_list.length === 0)
  {
    items.push(item);
  }
  else
  {
    item.item_id = check_list[0].item_id;
    items.forEach((ii, ind) => {
      if(ii.item_id === item.item_id)
        items[ind] = item
    })
  }

  let pinfo = ""
  if("pinfo" in pricing)
  {
    pinfo = pricing["pinfo"]
  }
  pricing = {}
  items.forEach(kk => {
    if(!(kk.elevation in pricing)){
      pricing[kk.elevation] = [kk]
    }
    else
    {
      pricing[kk.elevation].push(kk)
    }
    if(pinfo !== "")
      pricing["pinfo"] = pinfo
    check_list = []
  })
  document.getElementById('delete').disabled = true;
  document.getElementById('save').disabled = false;
  document.getElementById('unit').readOnly = true;
  populate_table()
  clear_dropdowns()
  document.getElementById('edit').disabled = true;
})

document.getElementById('additional').addEventListener('keyup', (event) => {
  var key = event.keyCode || event.charCode;
  if( key == 8 || key == 46 ) {
    if(parseFloat(document.getElementById('additional').value)){
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - custom_val;
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2);
      document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('unit').value) * parseFloat(document.getElementById('qty').value), 0);
  
      document.getElementById('unit').value = parseFloat(document.getElementById('additional').value) + parseFloat(document.getElementById('unit').value);
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
      custom_val = parseFloat(document.getElementById('additional').value)
      document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('unit').value) * parseFloat(document.getElementById('qty').value), 0);
    }
    else{
      if(custom_val!==0)
      {
        document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - custom_val;
        document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
        document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('unit').value) * parseFloat(document.getElementById('qty').value), 0);
        custom_val = 0
        document.getElementById('additional').value = 0;
      }
      
    }
  }
  else{
    if(parseFloat(document.getElementById('additional').value)){
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - custom_val;
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
      document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('unit').value) * parseFloat(document.getElementById('qty').value), 0);
  
      document.getElementById('unit').value = parseFloat(document.getElementById('additional').value) + parseFloat(document.getElementById('unit').value);
      document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
      custom_val = parseFloat(document.getElementById('additional').value)
      document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('unit').value) * parseFloat(document.getElementById('qty').value), 0);
      
    }
  }
})

document.getElementById('is_shelve').addEventListener('change', (event) => {
  const val = event.target.value;
  if(val === "yes" && shelve === 0){
    // document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - shelve;
    // document.getElementById('total').innerHTML = (parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value)).toFixed(2);
      file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
          .then(res => {
            file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === document.getElementById("shelve").value)
              {
                try{
                  shelve = parseFloat(i.rate)
                  document.getElementById('shelve-new-rate').value = rates.rate_shelve;
                  shelve = shelve * parseFloat(rates.rate_shelve);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + shelve;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
          })
  }
  else if(val === "no" && shelve !== 0){
    document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - shelve;
    document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
    document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
    document.getElementById('shelves').value = ""
    shelve = 0
  }
})

document.getElementById('qty').addEventListener('change', (event) => {
  if(document.getElementById('unit').value !== '0' && document.getElementById('unit').value !== '')
  document.getElementById('total').innerHTML = Math.round(parseFloat(event.target.value) * parseFloat(document.getElementById('unit').value), 0);
})

document.getElementById('door-panel').addEventListener('change', (event) => {
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - door;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
  document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
  if(val === '')
  {
    door = 0
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === val)
              {
                try{
                  door = parseFloat(i.rate)
                  document.getElementById('finishing-new-rate').value = rates.rate_doors;
                  door = door * parseFloat(rates.rate_doors);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                  door = door + edging;
                }
                catch (e) {
                  door = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + door;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
          
        })
  }
})

document.getElementById('handler').addEventListener('change', (event) => {
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - handler;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
  document.getElementById('total').innerHTML = (parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value));
  if(val === '')
  {
    handler = 0
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === val)
              {
                try{
                  handler = parseFloat(i.rate)
                  document.getElementById('handle-new-rate').value = rates.rate_handles;
                  handler = handler * parseFloat(rates.rate_handles);
                }
                catch (e) {
                  handler = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + handler;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = (parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value));
              }
            })
          })
         
        })
  }
})

document.getElementById('hardware').addEventListener('change', (event) => {
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - hardware;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
  document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
  if(val === '')
  {
    hardware = 0
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === val)
              {
                try{
                  hardware = parseFloat(i.rate);
                  document.getElementById("hardware-price").selectedIndex = 0;
                  document.getElementById('harware-new-rate').value = rates.rate_hardware;
                  hardware = hardware * parseFloat(rates.rate_hardware);
                  const slider = parseFloat(i.slider) * parseFloat(rates.slider_hardware);
                  hardware = hardware + slider;
                  const lift = parseFloat(i.lift) * parseFloat(rates.lift_hardware);
                  hardware = hardware + lift;
                }
                catch (e) {
                  hardware = i.rate;
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + hardware;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
              }
            })
          })
          
        })
  }
})

document.getElementById('shelves').addEventListener('change', (event) => {
  const val = event.target.value;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - shelve;
  document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
  document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
  if(val === '')
  {
    shelve = 0
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if(i.id === val)
              {
                try{
                  shelve = parseFloat(i.rate)
                  document.getElementById('shelve-new-rate').value = rates.rate_shelve;
                  shelve = shelve * parseFloat(rates.rate_shelve);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) + shelve;
                document.getElementById('unit').value = parseFloat(document.getElementById('unit').value).toFixed(2)
                document.getElementById('total').innerHTML = Math.round(parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value), 0);
                document.getElementById('is_shelve').value = 'yes';
              }
            })
          })
          
        })
  }
})

document.getElementById('tax').addEventListener('keyup', (event) => {
  if(parseFloat(document.getElementById('gross-amount').value) !== 0)
    discount_and_tax();
})

document.getElementById('discount').addEventListener('keyup', (event) => {
  if(parseFloat(document.getElementById('gross-amount').value) !== 0)
    discount_and_tax();
})

document.getElementById('confirm').addEventListener('click', (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../db/.credentials.json"))
      .then((res) => {
        if (res[0].password === document.getElementById("pass").value) {
          file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
              .then(res => {
                const old_pricing = res;
                // let indd = -1;
                // res.forEach((kk, ind) => {
                //   if(kk["pinfo"].pricing_no === document.getElementById('pricing-no').value)
                //   {
                //     indd = ind;
                //     return
                //   }
                // })
                if(pricing["pinfo"] && pricing["pinfo"].manual_no === document.getElementById('manual-input').value)
                {
                  r = confirm("Want to save with same Reference number?")
                  if (r)
                  {
                    old_pricing.forEach((l, ind) => {
                      if(l['pinfo'].id == pricing["pinfo"].id)
                      {
                        pricing["pinfo"] = {
                          "id": l['pinfo'].id ,
                          "pricing_no": document.getElementById('pricing-no').value,
                          "entry_date": document.getElementById("entry-date").valueAsDate,
                          "delivery_days": document.getElementById('delivery-days').value,
                          "manual_no": document.getElementById('manual-input').value,
                          "client": document.getElementById('client-input').value,
                          "client_name": document.getElementById('client-input').options[document.getElementById('client-input').selectedIndex].text,
                          "product_type": document.getElementById('product-input').value,
                          "sales_rp": document.getElementById('sales-input').value,
                          "carcass": document.getElementById('carcass-input').value,
                          "is_quotation": document.getElementById('is_quotation').checked,
                          "gross_amount": document.getElementById('gross-amount').value,
                          "discount": document.getElementById('discount').value,
                          "tax": document.getElementById('tax').value,
                          "calculated_tax": document.getElementById('calculated-tax').value,
                          "net": document.getElementById('net').value,
                          "category": document.getElementById('category-input').value,
                        }
                        old_pricing[ind] = pricing
                      }
                    })
                    file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), old_pricing)
                        .then(res => {
                          document.getElementById('cancel').click();
                          if (res === 'success') {

                            alert("Pricing Saved Successfully!")
                            all_clear()
                            document.getElementById('save').disabled = true;
                            document.getElementById('print').classList.add("d-none");
                            document.getElementById('delete').disabled = true;
                          }
                          else
                          {
                            alert("An Error Occurred While Saving!")
                          }
                        })
                  }
                  else
                  {
                    document.getElementById("pass").value = ""
                    document.getElementById('cancel').click();
                  }
                }
                else
                {
                  pricing["pinfo"] = {
                    "id": Date.now().toString(),
                    "pricing_no": document.getElementById('pricing-no').value,
                    "entry_date": document.getElementById("entry-date").valueAsDate,
                    "delivery_days": document.getElementById('delivery-days').value,
                    "manual_no": document.getElementById('manual-input').value,
                    "client": document.getElementById('client-input').value,
                    "client_name": document.getElementById('client-input').options[document.getElementById('client-input').selectedIndex].text,
                    "product_type": document.getElementById('product-input').value,
                    "sales_rp": document.getElementById('sales-input').value,
                    "carcass": document.getElementById('carcass-input').value,
                    "is_quotation": document.getElementById('is_quotation').checked,
                    "gross_amount": document.getElementById('gross-amount').value,
                    "discount": document.getElementById('discount').value,
                    "tax": document.getElementById('tax').value,
                    "calculated_tax": document.getElementById('calculated-tax').value,
                    "net": document.getElementById('net').value,
                    "category": document.getElementById('category-input').value,
                  }
                  // if(indd === -1)
                  // {
                  old_pricing.push(pricing);
                  // }
                  // else{
                  //   old_pricing[indd] = pricing
                  // }
                  file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), old_pricing)
                      .then(res => {
                        document.getElementById('cancel').click();
                        if (res === 'success') {

                          alert("Pricing Saved Successfully!")
                          all_clear()
                          document.getElementById('save').disabled = true;
                          document.getElementById('print').classList.add("d-none");
                          document.getElementById('delete').disabled = true;
                        }
                        else
                        {
                          alert("An Error Occurred While Saving!")
                        }
                      })
                }
              })
        }
        else
        {
          document.getElementById('cancel').click();
          document.getElementById('pass').value = "";
          alert("Invalid Password, Try Again!")
        }
      })
  if(document.getElementById('checkbox-all-open').checked)
    document.getElementById('checkbox-all-open').checked = false
})

function toggle_open(event){
  const val = event.target.id
  if(event.target.checked)
  {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
        .then(res => {
          res.forEach(i => {
            if(i["pinfo"].id.toString() === val){
              check_list2.push(i)
              document.getElementById('delete-1').disabled = false;
              document.getElementById('confirm-1').disabled = false;
            }
          })
          if(check_list2.length === res.length)
          {
            if(!document.getElementById('checkbox-all-open').checked)
              document.getElementById('checkbox-all-open').checked = true
          }
          if(check_list2.length > 1)
          {
            document.getElementById('confirm-1').disabled = true;
          }
        })

  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
        .then(res => {
          res.forEach(i => {
            if(i["pinfo"].id.toString() === val){
              const ind = check_list2.indexOf(i)
              check_list2.splice(ind, 1)
            }
          })
          if(check_list2.length === 0)
          {
            document.getElementById('confirm-1').disabled = true;
            document.getElementById('delete-1').disabled = true;
            if(document.getElementById('checkbox-all-open').checked)
              document.getElementById('checkbox-all-open').checked = false
          }
          if(check_list2.length === 1)
          {
            document.getElementById('confirm-1').disabled = false;
            document.getElementById('delete-1').disabled = false;
            if(document.getElementById('checkbox-all-open').checked)
              document.getElementById('checkbox-all-open').checked = false
          }
          if(check_list2.length > 1)
          {
            document.getElementById('confirm-1').disabled = true;
            document.getElementById('delete-1').disabled = false;
          }
          if(check_list2.length !== res.length)
          {
            if(document.getElementById('checkbox-all-open').checked)
              document.getElementById('checkbox-all-open').checked = false
          }


        })
  }
}

document.getElementById('open').addEventListener('click', (event) => {
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
      .then(res => {
        check_list2 = []
        document.getElementById('checkbox-all-open').checked = false;
        document.getElementById('confirm-1').disabled = true;
        const tb = document.getElementById('load-pricing-table');
        tb.innerHTML = "";
        res.forEach((i, ind) => {
          let col = 'black'
          if(i["pinfo"].is_quotation)
            col = 'red'
          tb.innerHTML += `
            <tr style="text-align: center">
                <td>
                    <label class="au-checkbox">
                       <input type="checkbox" id="${i["pinfo"].id}" onclick="toggle_open(event)" style="border: 1px solid green"/>
                       <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                </td>
                <td>${ind+1}</td>
                <td class="d-none">${i["pinfo"].id}</td>
                <td>${i["pinfo"].pricing_no}</td>
                <td>${i["pinfo"].entry_date.split('T')[0]}</td>
                <td>${i["pinfo"].client_name}</td>
                <td>${i["pinfo"].manual_no}</td>
                <td style="color: ${col}">${i["pinfo"].is_quotation ? "Quotation" : "Invoice"}</td>
            </tr>
          `;
        })
      })
})

document.getElementById('form-pricing').addEventListener('input', (event) => {
  if(items.length>0)
  {
    document.getElementById('save').disabled = false;
    document.getElementById('print').classList.add('d-none')
  }
})

document.getElementById('confirm-1').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('cancel-1').click();
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
      .then(res => {
        document.getElementById('print').classList.remove('d-none')
        res.forEach(i => {
          if(document.getElementById(i["pinfo"].id) && document.getElementById(i["pinfo"].id).checked)
          {
            document.getElementById('save').innerHTML = "Update";
            document.getElementById('pricing-no').value = i["pinfo"].pricing_no;
            document.getElementById("entry-date").value = i["pinfo"].entry_date.split('T')[0];
            document.getElementById('entry-date-backup').value = '';
            document.getElementById('pricing-type').value = ''
            document.getElementById('delivery-days').value = i["pinfo"].delivery_days;
            document.getElementById('manual-input').value = i["pinfo"].manual_no;
            document.getElementById('client-input').value = i["pinfo"].client;
            document.getElementById('product-input').value = i["pinfo"].product_type;
            document.getElementById('sales-input').value = i["pinfo"].sales_rp;
            document.getElementById('carcass-input').value = i["pinfo"].carcass;
            document.getElementById('is_quotation').checked = i["pinfo"].is_quotation;
            document.getElementById('gross-amount').value = i["pinfo"].gross_amount;
            document.getElementById('discount').value = i["pinfo"].discount;
            document.getElementById('tax').value = i["pinfo"].tax;
            document.getElementById('calculated-tax').value = i["pinfo"].calculated_tax;
            document.getElementById('net').value = i["pinfo"].net;
            document.getElementById('category-input').value = i["pinfo"].category;
            document.getElementById('open').disabled = true
            document.getElementById('confirm-1').disabled = true;
            document.getElementById('print').disabled = false;
            document.getElementById('delete-1').disabled = true;
            check_list2 = []
            item = null;
            code_rate = 0;
            door = 0;
            handler = 0;
            hardware = 0;
            shelve = 0;
            pricing = i
            const keys = Object.keys(pricing)
            keys.forEach(i => {
              if(pricing[i].length>0 && i !== "pinfo")
              {
                pricing[i].forEach(j => {
                  items.push(j)
                });
              }
            })
            if(document.getElementById('is_quotation').checked)
            {
              document.getElementById('discount').disabled = true;
              document.getElementById('tax').disabled = true;
            }
            else {
              document.getElementById('discount').disabled = false;
              document.getElementById('tax').disabled = false;
            }
            populate_table();
          }
        })
      })
})

document.getElementById('is_quotation').addEventListener('change', (event) => {
  if(event.target.checked)
  {
    document.getElementById('tax').disabled = true;
    document.getElementById('discount').disabled = true;
    if (document.getElementById('pricing-type').value == '') {
      document.getElementById('pricing-type').value = 'invoice';
    }

    if (document.getElementById('pricing-type').value == 'quotation') {
      const backupDate = document.getElementById('entry-date-backup').value;
      if (backupDate != '') {
        document.getElementById("entry-date").value = backupDate;
      }
    }

  }
  else {
    document.getElementById('tax').disabled = false;
    document.getElementById('discount').disabled = false;

    var date = new Date();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;

    var today = year + "-" + month + "-" + day;

    if (document.getElementById('pricing-type').value == '') {
      document.getElementById('pricing-type').value = 'quotation';
      document.getElementById("entry-date-backup").value = document.getElementById("entry-date").value;
    }

    if (document.getElementById('pricing-type').value == 'invoice') {
      const backupDate = document.getElementById('entry-date-backup').value;
      if (backupDate != '') {
        document.getElementById("entry-date").value = backupDate;
      }
    } else {
      document.getElementById("entry-date").value = today;
    }
    
  }
})

function close_modal(event) {
  event.preventDefault();
  document.getElementById('del-pass').value = '';
  // document.getElementById('load-pricing-table').innerHTML = ''
  // document.getElementById('checkbox-all-open').checked = false;
  // document.getElementById('confirm-1').disabled = true;
}

document.getElementById('print').addEventListener('click', async function (event)  {
  let element = document.getElementById('my-table');
  const r = confirm("PDF report generated successfully!")
  if (r)
  {
    var opt = {
      margin:       0.5,
      filename:     'invoice.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 5 },
      jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
    };
    file_manager.loadFile(path.join(__dirname, '../db/.firm.json'))
        .then(res => {
          // const header = element.rows[0]
          // for (var i = 0; i < element.rows[0].cells.length; i++) {
          //
          //   // Getting the text of columnName
          //   var str = element.rows[0].cells[i].innerHTML;
          //
          //   // If 'Geek_id' matches with the columnName 
          //   if (str.search("All") != -1) {
          //     for (var j = 0; j < element.rows.length; j++) {
          //       if(element.rows[j].classList[0] !== "elevation-row-pricing")
          //         element.rows[j].deleteCell(i);
          //     }
          //   }
          // }
          file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
              .then(ress => {
                ress.forEach(k => {
                  let qout = ""
                  let total = ""
                  let name = ""
                  let days_notice = ``
                  if(document.getElementById('is_quotation').checked)
                  {
                    days_notice = `<div style="position: absolute; right: 0;"><p style="color: red; font-size: 9px;"><b>Notice: </b>This Quotation is valid for 15 days only.</p></div>`
                    qout = `
                          <div style="display: flex; flex-direction: row; justify-content: space-between">
                                <h3 style="color: black">${res[0].name}</h3>
                                <div style="background-color: black; height: 30px; width: 100px; text-align: center; align-items: center; position: absolute; right: 0; border-radius: 20px">
                                    <p style="color: white; font-size: 13px; text-align: center; margin-top: 5px"><b>QUOTATION</b></p>
                                </div>
                            </div>
                        `
                    total = `
                           
                          <div style="display: flex; flex-direction: column; text-align: right">
                                <p style="color: black; font-size: 10px"><b>Total:</b></p>
                            </div>
                            <div style="display: flex; flex-direction: column; width: 100px; text-align: left; margin-left: 10px">
                                <p style="color: black; font-size: 10px;"><b>${Intl.NumberFormat('en-US').format(document.getElementById('gross-amount').value)}.00</b></p>
                                
                            </div>
                        `;
                    name = " Quotation.pdf"
                  }
                  else
                  {
                    qout = `<h3 style="color: black">${res[0].name}</h3>`
                    total = `
                              <div style="display: flex; flex-direction: column; text-align: right; ">
                                <p style="color: black; font-size: 10px;"><b>Total:</b></p>
                                <p style="color: black; font-size: 10px;"><b>Discount:</b></p>
                                <p style="color: black; font-size: 10px;"><b>Taxes:</b></p>
                                <p style="color: black; font-size: 10px;"><b>Net Value:</b></p>
                            </div>
                            <div style="display: flex; flex-direction: column; width: 60px; text-align: left; margin-left: 10px">
                                <p style="color: black; font-size: 10px; font-weight: 500">${Intl.NumberFormat('en-US').format(document.getElementById('gross-amount').value)}</p>
                                <p style="color: black; font-size: 10px;font-weight: 500">${Intl.NumberFormat('en-US').format(document.getElementById('discount').value)}</p>
                                <p style="color: black; font-size: 10px;font-weight: 500; border-bottom: 1px solid black;">${Intl.NumberFormat('en-US').format(document.getElementById('calculated-tax').value)}</p>
                                <p style="color: black; font-size: 10px; border-bottom: 1px black double;"><b>${Intl.NumberFormat('en-US').format(document.getElementById('net').value)}</b></p>
                            </div>
                          `;
                    name = " Invoice.pdf"
                  }
                  if(k.id === document.getElementById('client-input').value)
                  {
                    file_manager.loadFile(path.join(__dirname, '../db/terms.json'))
                        .then(obj => {
                          let terms = ``;
                          for (const key in obj) {
                            terms += `
                            <p style="color: black; font-size: 10px"><b>${key}</b></p>
                          `
                            obj[key].forEach(term => {
                              terms += `
                              <ul>
                                <li style="font-size: 8px; color: black">&#8226; ${term}</li>
                              </ul>
                            `
                            })
                          }
                          let body = ``
                          const keys = Object.keys(pricing)
                          let count = 1
                          keys.forEach(i => {
                            if(pricing[i].length>0 && i !== "pinfo")
                            {
                              body += `<tr><td style="font-size: 11px; text-align: center; padding: 0px; color: black; font-weight: bold;" colspan="12">${i}</td></tr>`;
                              pricing[i].forEach((j, ind) => {
                                body += `
                                <tr style="padding-top: 3px; padding-bottom: 3px; font-weight: 500">
                                  <td style="text-align: center;width: 40px; color: black; font-size: 9px; padding-left: 3px; padding-top: 2.5px; padding-bottom: 2.5px;" >${count}</td>
                                  <td style="text-align: center;padding-left: 3px; width: 170px; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; overflow: hidden; color: black; ">${j.utility_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;width: 150px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px;">${j.type_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black; ">${j.code_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px; width: 35px; ">${j.qty}</td>
                                  <td  style="text-align: center;padding-left: 3px;width: 120px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black; ">${j.door_panel_text}</td>
                                  <td  style="text-align: center;width: 80px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.handler_text}</td>
                                  <td  style="text-align: center;width: 140px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.hardware_text}</td>
                                  <td  style="text-align: center;width: 110px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.shelves_text}</td>
                                  <td  style="text-align: center;width: 95px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${Intl.NumberFormat('en-US').format(j.unit)}</td>
                                  <td style="text-align: right; padding-right: 3px;width: 100px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px;">${Intl.NumberFormat('en-US').format(j.total)}</td>
                                </tr>`;
                                count +=1
                              });
                            }
                          })
                          let table = `
                                    <table style="font-size: 12px; color: black;">
                                        <thead style="background-color: #C0C0C0; padding-top: 2px; padding-bottom: 2px">
                                            <tr style="padding-top: 2.5px; padding-bottom: 2.5px; ">
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black; padding-top: 2.5px; padding-bottom: 2.5px;">No.</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black; padding-top: 2px; padding-bottom: 2px;">UTILITY</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">DESCRIPTION</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">CODE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">QTY</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">FINISHING</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">HANDLES</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">HARDWARE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">ADJ. SHELVES</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">UNIT PRICE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody style="border: 0.5px solid black">${body}</tbody>
                                    </table>
                                    `

                          let html = `
                   <div style="display: flex; flex-direction: row; margin-bottom: 5px">
                        <img alt="img" src="${res[0].logo}" style="height: 100px; width: 80px; margin-right: 10px" />
                        <div style="display: flex; flex-direction: column;">
                            ${qout}
                            <div style="display: flex; flex-direction: row; justify-content: space-between">
                                <p style="color: black; font-size: 12px;">${res[0].address}, Ph # ${res[0].contact}</p>
                                <p style="color: black; font-size: 13px; position: absolute; right: 0;">Date: ${document.getElementById('entry-date').valueAsDate.getDate()}-${document.getElementById('entry-date').valueAsDate.getMonth()+1}-${document.getElementById('entry-date').valueAsDate.getFullYear()}</p>
                            </div>
                           
                            <div style="width: 100%; border-bottom: 2px solid grey; padding-bottom: 10px; margin-bottom: 10px"></div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px; "><b>Client Name: &nbsp;</b>${k.name}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Contact: &nbsp;</b> ${k.contact}</p>
                                <p style="color: black; width: 230px; font-size: 11px;"><b>Address: &nbsp;</b> ${k.address}</p>
                            </div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px;"><b>Pricing No: &nbsp;</b>${document.getElementById('pricing-no').value}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Reference No. &nbsp;</b>${document.getElementById('manual-input').value}</p>
                                <p style="color: black; font-size: 11px; width: 230px;"><b>Sales RP: &nbsp;</b>${document.getElementById('sales-input').value}</p>
                                
                            </div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px;"><b>Product Type: &nbsp;</b>${document.getElementById('product-input').value}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Carcass: &nbsp;</b> ${document.getElementById('carcass-input').value}</p>
                                <p style="color: black; width: 230px; font-size: 11px;"><b>Category: &nbsp;</b>${document.getElementById('category-input').value}</p>
                            </div>
                        </div>
                    </div>
                    ${table}
                    ${days_notice}
                    <div style="display: flex; flex-direction: row; justify-content: space-between">
                        <div style="display: flex; flex-direction: row; justify-content: space-between; padding-top: 60px; width: 470px;">
                            <p style="color: black; font-size: 10px; width: 250px;"><b>Authorized By: -----------------------</b></p>
                            <p style="color: black; font-size: 10px; width: 300px; margin-left: 10px; "><b>Customer Signature: -----------------------</b></p>
                        </div>
                          <div style="display: flex; flex-direction: row; width: 155px; margin-left: 95px; margin-top: 15px">
                              ${total}
                          </div>
                    </div>
                    <p style="color: black; font-size: 10px; border-bottom: 1px solid black; width: 105px; margin-top: 10px"><b>Terms & Conditions:</b></p>
                    <p style="color: black; font-size: 10px; width: 230px; margin-top: 10px; margin-bottom: 5px;"><b>Delivery Time: &nbsp;</b><span style="font-size: 10px; font-weight: 500">${document.getElementById('delivery-days').value} Working Days.<span/></p>
                    ${terms}     
                    <p style="color: red; font-size: 8px"><b>Please Note:</b></p>
                    <p style="color: red; font-size: 8px">Any electrical / plumbing and gas connections for Hob, Hood, Oven & Sink is excluded from our scope of work. To avoid any possible damage to plumbing pipes / electrical wiring, we request you to mark such areas with dotted lines failing which; we accept no responsibility for any such incident, occurred while drilling holes for fixing the cabinets.</p>         
                    <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 60px">
                            <p style="color: black; font-size: 10px; "><b>Authorized By: ------------------------------</b></p>
                            <p style="color: black; font-size: 10px; margin-left: 30px;"><b>Customer Signature: ------------------------------</b></p>
                    </div>
                    `
                          html2pdf().set(opt).from(html).to('pdf').save(`${k.name}'s${name}`);

                        })
                  }
                })
              })
        })
  }

})

document.getElementById('filter-pricing').addEventListener('change', (event) => {
  const val = event.target.value
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
      .then(res => {
        const tb = document.getElementById('load-pricing-table');
        tb.innerHTML = "";
        res.forEach((i, ind) => {
          if(i["pinfo"].is_quotation && val === "qou"){
            tb.innerHTML += `
            <tr>
                <td>
                    <label class="au-checkbox">
                       <input type="checkbox" id="${i["pinfo"].id}" onclick="toggle_open(event)" style="border: 1px solid green"/>
                       <span class="au-checkmark" style="border: 1px solid green;"></span>
                    </label>
                </td>
                <td>${ind+1}</td>
                <td class="d-none">${i["pinfo"].id}</td>
                <td>${i["pinfo"].pricing_no}</td>
                <td>${i["pinfo"].entry_date.split('T')[0]}</td>
                <td>${i["pinfo"].client_name}</td>
                <td>${i["pinfo"].manual_no}</td>
                <td>${i["pinfo"].is_quotation ? "Quotation" : "Invoice"}</td>
            </tr>
          `;
          }
          else if(!i["pinfo"].is_quotation && val === "inv")
          {
            tb.innerHTML += `
            <tr>
                <td>
                    <label class="au-checkbox">
                       <input type="checkbox" id="${i["pinfo"].id}" onclick="toggle_open(event)" style="border: 1px solid green"/>
                       <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                </td>
                <td>${ind+1}</td>
                <td class="d-none">${i["pinfo"].id}</td>
                <td>${i["pinfo"].pricing_no}</td>
                <td>${i["pinfo"].entry_date.split('T')[0]}</td>
                <td>${i["pinfo"].client_name}</td>
                <td>${i["pinfo"].manual_no}</td>
                <td>${i["pinfo"].is_quotation ? "Quotation" : "Invoice"}</td>
            </tr>
          `;
          }
          else if(val === "")
          {
            tb.innerHTML += `
            <tr>
                <td>
                    <label class="au-checkbox">
                       <input type="checkbox" id="${i["pinfo"].id}" onclick="toggle_open(event)" style="border: 1px solid green"/>
                       <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                </td>
                <td>${ind+1}</td>
                <td class="d-none">${i["pinfo"].id}</td>
                <td>${i["pinfo"].pricing_no}</td>
                <td>${i["pinfo"].entry_date.split('T')[0]}</td>
                <td>${i["pinfo"].client_name}</td>
                <td>${i["pinfo"].manual_no}</td>
                <td>${i["pinfo"].is_quotation ? "Quotation" : "Invoice"}</td>
            </tr>
          `;
          }
        })
      })
})

function delete_pricing() {
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
      .then(res => {
        let my_data = []
        check_list2.forEach(i => {
          res.forEach((j, ind) => {
            if(j["pinfo"].id === i["pinfo"].id)
            {
              res.splice(ind, 1)
              return
            }
          })
        })
        file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), res)
            .then(res => {
              document.getElementById('cancel-1').click();
              document.getElementById('delete-1').disabled = true
              if(document.getElementById('checkbox-all-open').checked)
                document.getElementById('checkbox-all-open').click()
              document.getElementById('filter-pricing').value = ""
              document.getElementById('del-pass').value = ""
              alert("Pricing Deleted!");
              all_clear();
            })
      })
  all_clear();
}

document.getElementById('checkbox-all-open').addEventListener('change', (event) => {
  if(event.target.checked)
  {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
        .then(res => {
          res.forEach(i => {
            if(document.getElementById(i["pinfo"].id) && !document.getElementById(i["pinfo"].id).checked)
              document.getElementById(i["pinfo"].id).click()
          })
        })
  }
  else
  {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
        .then(res => {
          res.forEach(i => {
            if(document.getElementById(i["pinfo"].id) && document.getElementById(i["pinfo"].id).checked)
              document.getElementById(i["pinfo"].id).click()
          })
        })
  }
})

document.getElementById('delete-form').addEventListener('submit', (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../db/.credentials.json"))
      .then((res) => {
        if (res[1].pass === document.getElementById("del-pass").value) {
          delete_pricing()
        }
        else
        {
          alert("Wrong Password!")
        }
      })
})

document.getElementById('checkbox-all').addEventListener('change', (event) => {
  if(document.getElementById('checkbox-all').checked)
  {
    items.forEach(i => {
      if(!(document.getElementById(`${i.elevation}~${i.item_id.toString()}`).checked))
        document.getElementById(`${i.elevation}~${i.item_id.toString()}`).click()
    })
  }
  else
  {
    items.forEach(i => {
      if (document.getElementById(`${i.elevation}~${i.item_id.toString()}`).checked)
        document.getElementById(`${i.elevation}~${i.item_id.toString()}`).click()
    })
  }
})

$(document).ready(() => {
  var date = new Date();

  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();

  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;

  var today = year + "-" + month + "-" + day;
  document.getElementById("entry-date").value = today;
  load_pricing_dropdown();
  document.getElementById('unit').value = 0;
  document.getElementById('gross-amount').value = 0;
  document.getElementById('discount').value = 0;
  document.getElementById('net').value = 0;
  document.getElementById('tax').value = 0;
  document.getElementById('tax').disabled = true;
  document.getElementById('discount').disabled = true;
  document.getElementById('is_quotation').checked = true;
  document.getElementById('calculated-tax').value = 0;
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        if(res.length === 0)
        {
          document.getElementById('pricing-no').value = "1"
        }
        else {
          document.getElementById('pricing-no').value = parseFloat(res[res.length - 1]["pinfo"].pricing_no) + 1;
        }
      })
});
