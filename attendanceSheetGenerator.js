const ExcelJS = require('exceljs');

const downloadFile= async (req, res) => {
  try { 
    let tasks = [
          {id:1, name:"task1", status:"approved"},
          {id:2, name:"task2", status:"denied"}   
    ]
    if (tasks.length > 0) {
      const xlsBuffer = await generateXLS(tasks);
      res.set("Content-Disposition", "attachment; filename=data.xls");
      res.type("application/vnd.ms-excel");
      res.send(xlsBuffer);
    }
  } catch (err) {
    res.json("Something went wrong");
  }
}
const data = [
  {
    id:"352352",
    name: "Markone",
    status:"present"
  }
]
const generateXLS = async (data) =>{
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Data", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    // Initialize the row index
    let rowIndex = 2;

    let row = worksheet.getRow(rowIndex);
    row.values = ["Task # id", "Name", "Status"];
    row.font = { bold: true };

    const columnWidths = [20, 20, 20];
    
    row.eachCell((cell, colNumber) => {
        const columnIndex = colNumber - 1;
        const columnWidth = columnWidths[columnIndex];
        worksheet.getColumn(colNumber).width = columnWidth;
      });

      // Loop over the grouped data
      data.forEach((task, index) => {
        const row = worksheet.getRow(rowIndex + index + 1);
        row.getCell("A").value = task.id;
        row.getCell("B").value = task.name;
        row.getCell("C").value = task.status;
       
        row.getCell("B").alignment = { wrapText: true };
      });
      // Increment the row index
      rowIndex += data.length;

    // Merge cells for the logo
    worksheet.mergeCells(
      `A1:${String.fromCharCode(65 + worksheet.columns.length - 1)}1`
    );

    // const image = workbook.addImage({
    //   base64: LOGO_64, //replace it your image (base 64 in this case)
    //   extension: "png",
    // });

    // worksheet.addImage(image, {
    //   tl: { col: 0, row: 0 },
    //   ext: { width: 60, height: 40 },
    // });

    worksheet.getRow(1).height = 40;

    
    // Define the border style
    const borderStyle = {
      style: "thin", // You can use 'thin', 'medium', 'thick', or other valid styles
      color: { argb: "00000000" },
    };

    // Loop through all cells and apply the border style
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          top: borderStyle,
          bottom: borderStyle,
        };
      });
    });

    // Generate the XLS file
    return workbook.xlsx.writeBuffer();
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  generateXLS
};