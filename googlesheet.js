const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const serviceAccountKeyFile = "./googleSheetAPI.json";
const { JWT } = require('google-auth-library');
const sheetId = '1YHh2D_Q4qVcxcHU9FmEp55o0XIkV82tMxZSF-2JMlQQ';
const credentials = require("./googleSheetAPI.json");
const tabName = 'Sheet1'
const range = 'A:E';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];
main().then(() => {
    console.log('Completed')
  }).catch(error =>{
    console.log(error.message);
  })
  
  async function main() {
    const googleSheetClient = await _getGoogleSheetClient();
    // Reading Google Sheet from a specific range
    const data = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
    console.log(data);
  
    // Adding a new row to Google Sheet
    const dataToBeInserted = [  
      ['Global Name' , 'User Name', 'Date', 'Time','Share Given'],
      ['11', 'rohith', 'Rohith', 'Sharma', 'Active'],
      ['12', 'virat', 'Virat', 'Kohli', 'Active'],
      ['13', 'virat', 'sharma', 'rohit', 'Active']
    ]
    await _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted,data);
  }
  async function _getGoogleSheetClient() {
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({
      version: 'v4',
      auth: authClient,
    });
  }
  
  async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
    const res = await googleSheetClient.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!${range}`,
    });
  
    return res.data.values;
  }
  /**
 * Upload a file to the specified folder
 * @param{string} folderId folder ID
 * @return{obj} file Id
 * */
async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data,existingData) {
  const doc = await create();
  //const permission =  await shareFile(newSpreadsheetId);
    const resource1 = {
        values : data,
    };
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyFile,
      scopes: SCOPES,
    });
    const service = google.sheets({version: 'v4', auth});
    const result = await service.spreadsheets.values.update({
      spreadsheetId : doc.spreadsheetId,
      range: `${tabName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: resource1,
    });
    console.log('%d cells updated.', result.data.updatedCells);
    
        await googleSheetClient.spreadsheets.values.clear({
            spreadsheetId: sheetId,
        range: `${tabName}!${range}`,
        })
        await googleSheetClient.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${tabName}!${range}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            "majorDimension": "ROWS",
            "values": data
        },
        })
}

async function create() {
  try {
    const jwt = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    });
    const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(jwt, { title: 'new fancy doc' });
    await doc.loadInfo();
    //const sheet1 = doc.sheetsByIndex[0];
    //const spreadsheetGenerated = new GoogleSpreadsheet(doc.spreadsheetId, jwt);
    //const permissions = await doc.listPermissions();
    await doc.setPublicAccessLevel('writer');
    console.log(`url ${doc._spreadsheetUrl}`);
    console.log(doc._spreadsheetUrl);
    return doc;
  } catch (err) {
      // TODO (developer) - Handle exception
      throw err;
  }
}
