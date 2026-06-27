// file_manager
// .loadFile(path.join(__dirname, "../../db/.codes.json"))
// .then((res) => {
//   console.log(res);
//   const new_data = [];
//   res.forEach((r) => {
//     const data = {
//       id: r.id,
//       title: r.title,
//       rate: r.rate,
//       back_area: "0",
//       edging: "0",
//       screws: "0",
//       secondary_top: "0",
//       utility_id: r.utility_id,
//       utility: r.utility,
//       type_id: r.type_id,
//       type: r.type,
//     }; 
//     new_data.push(data);
//   });
//   file_manager
//       .writeFile(
//           path.join(__dirname, "../../db/.codes.json"),
//           new_data
//       )
//       .then((res) => {})
// });

file_manager
.loadFile(path.join(__dirname, "../../db/.doors.json"))
.then((res) => {
  console.log(res);
  const new_data = [];
  res.forEach((r) => {
    const data = {
      id: r.id,
      title: r.title,
      rate: r.rate,
      edging: "0",
      utility_id: r.utility_id,
      utility: r.utility,
      type_id: r.type_id,
      type: r.type,
      code: r.code,
      code_id: r.code_id
    }; 
    new_data.push(data);
  });
  file_manager
      .writeFile(
          path.join(__dirname, "../../db/.doors.json"),
          new_data
      )
      .then((res) => {})
});