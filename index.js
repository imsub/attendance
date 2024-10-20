const { Client, GatewayIntentBits ,Collection, REST,Routes, SlashCommandBuilder  } = require('discord.js');
const dotenv = require('dotenv');
const moongoose = require("mongoose");
//const  {generateXLS} = require('./attendanceSheetGenerator.js');
const credentialAPI = require("./credentials.json");
const {Attendance} = require("./attendance.modal.js");
const {spreadSheet} = require("./googleSheet.modal.js");
const TOKEN = credentialAPI.TOKEN;
const CLIENT_ID = credentialAPI.CLIENT_ID;
const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const serviceAccountKeyFile = "./googleSheetAPI.json";
const { JWT } = require('google-auth-library');
const sheetId = '';
const credentials = require("./googleSheetAPI.json");
const tabName = 'Sheet1'
const range = 'A:E';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds , 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]    
});
const jwt = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
client.commands = new Collection();

client.on("message",(message )=>{
    const roleName = message.member.roles.cache.find(r => r.name === "Owner")
            if (roleName) {
                return message.reply("You can use this command.")
            } else {
                return message.reply("Sorry, an error occured.")
            }
});
const data = new SlashCommandBuilder()
	.setName('delete')
	.setDescription('admin/moderator can delete record from tracker.')
	.addStringOption(option =>
		option.setName('displayname')
		.setDescription('enter name shown in discord channel').setRequired(true))
	    .addBooleanOption(option =>
		option.setName('username')
		.setDescription('enter userid/username of user'));
const commands = [
    {
        name : "lock",
        description : "Lock Attendance Sheet"
    },
    {
        name : "present",
        description : "record attendance"
    },
    {
        name : "yes",
        description : "record attendance"
    },
    {
        name : "all",
        description : "get attendance sheet"
    },
    data
]

const rest = new REST({version:"10"}).setToken(TOKEN);
(async ()=>{
    try {
        await moongoose.connect("mongodb+srv://temoz:5870ZRW3UEfOILAR@a3elatus-temoz.zk4y2.mongodb.net/?retryWrites=true&w=majority&appName=A3Elatus-Temoz",{  serverSelectionTimeoutMS: 5000 });
        console.log("connected to mongo db");
        console.log('Started refreshing application (/) commands.');
      
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });//command cannot be longer than 15 charecters
      
        console.log('Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error(error);
      }
})();
const getRoleIdBasedonRole = async (interaction,roleName)=>{
    const guildRole = await interaction.guild.fetch();
    const fetchRole = await guildRole.roles.fetch();
    const roleId = await fetchRole.find(r => r.name === roleName);
    return roleId;
}
const checkUserRole = (interaction,roleId)=>{
    return interaction.member.roles.cache.has(roleId);
}
client.on('interactionCreate', async interaction => {
    console.log(interaction);
    switch(interaction.commandName){
        case "present":
        case "yes": 
        try{
            const interactionUser = await interaction.guild.members.fetch(interaction.user.id);
            //const userRole = await interaction.guild.roles.fetch(interaction.user.id);
            //const getrole = await interaction.guild.members.fetch(interaction.user.id);
            const nickName = interactionUser.nickname;
            const {username  , globalName , id}= interactionUser.user;
            const guildRole = await interaction.guild.fetch();
            const fetchRole = await guildRole.roles.fetch();
            const roleId = await fetchRole.find(r => r.name === "moderator");
            const isModerator = interaction.member.roles.cache.has(roleId.id);
            console.log(nickName,username ,globalName , id , roleId);
            const dateTime = new Date().toLocaleString("en-US", {timeZone: 'Asia/Kolkata'});
            const date = dateTime.split(',')[0];
            const time = dateTime.split(',')[1];
            const checkRecord = await Attendance.findOne({username});
            if(!checkRecord || checkRecord.date !== date){ // checkRecord is null for new user
                const query = {  userId : id};
                const update = { $set: { username , globalName , userId : id , nickName,  date ,  attendance : "present" , time}};
                const options = { upsert: true };
                await Attendance.updateOne(query, update, options);
                await interaction.reply(`Hello, ${globalName} your attendance is captured in our records.`);
            }else{
                await interaction.reply(`Hello, ${globalName} your attendance is already captured in our records, please try again tomorrow.`);
            }
        }catch(error){
            await interaction.reply(error.message);
        }
            break;
        case "delete":
            try{
                const moderatorRoleId = await getRoleIdBasedonRole(interaction,"moderator");
                const isModerator = checkUserRole(interaction,moderatorRoleId.id);
                if(isModerator && !!interaction.options.getString("displayname")){
                    await Attendance.deleteOne( { globalName: interaction.options.getString("displayname") } );
                    await interaction.reply("Attendance deleted.");
                }
                else{
                    await interaction.reply("You are not authorized to delete records from database.");
                }
            }catch(error){
                await interaction.reply(error.message);
            }
            break;
        case "all":
            try{
                const moderatorRoleId = await getRoleIdBasedonRole(interaction,"moderator");
                const isModerator = checkUserRole(interaction,moderatorRoleId.id);
                if(isModerator){
                    await interaction.reply("Generating URL for Excel Spread Sheet.");
                    const dateTime = new Date().toLocaleString("en-US", {timeZone: 'Asia/Kolkata'});
                    const date = dateTime.split(',')[0];
                    const data = await Attendance.find( { date: date } );
                    const url = await main(data,date);
                    console.log(`url---> ${url}`);
                    await interaction.channel.send({content : url})
                    // data.forEach(async element => {
                    //     await interaction.channel.send({ content: element.toString()});
                    // });
                }
                else{
                    await interaction.reply("You are not authorized to fetch attendance sheet.");
                }
            }catch(error){
                await interaction.reply(error.message);
            }
            break;
        default : 
            await interaction.reply("invalid command. Please try again!");
    }
    // Making sure the interaction is a command
    if (!interaction.isCommand()) return false;
})
client.login(TOKEN);

async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
    let doc ='';
    const dateTime = new Date().toLocaleString("en-US", {timeZone: 'Asia/Kolkata'});
    const date = dateTime.split(',')[0];
    const time = dateTime.split(',')[1];
    const existingSpreadsheet = await spreadSheet.find( { date: date } );
    if(existingSpreadsheet?.length){
        const object = existingSpreadsheet[0].toJSON();
        doc = {spreadsheetId: object.url.split("/")[5] , _spreadsheetUrl:object.url};
    }
    else{
        doc = await create();
    }
    //const permission =  await shareFile(newSpreadsheetId);
      const resource1 = {
          values : data,
      };
      const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountKeyFile,
        scopes: SCOPES,
      });
      const service = google.sheets({version: 'v4', auth});
      
          await googleSheetClient.spreadsheets.values.clear({
              spreadsheetId: doc.spreadsheetId,
          range: `${tabName}!${range}`,
          })
        //   await googleSheetClient.spreadsheets.values.append({
        //   spreadsheetId: doc.spreadsheetId,
        //   range: `${tabName}!${range}`,
        //   valueInputOption: 'USER_ENTERED',
        //   insertDataOption: 'INSERT_ROWS',
        //   resource: {
        //       "majorDimension": "ROWS",
        //       "values": data
        //   },
        //   });
        const result = await service.spreadsheets.values.update({
            spreadsheetId : doc.spreadsheetId,
            range: `${tabName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            resource: resource1,
          });
          console.log('%d cells updated.', result.data.updatedCells);
    const query = {  url : doc._spreadsheetUrl};
    const update = { $set: { url : doc._spreadsheetUrl ,  date , time}};
    const options = { upsert: true };
    await spreadSheet.updateOne(query, update, options);
    return doc._spreadsheetUrl;
  }
  async function create() {
    try {
      const dateTime = new Date().toLocaleString("en-US", {timeZone: 'Asia/Kolkata'});
      const date = dateTime.split(',')[0];
      const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(jwt, { title: `attendance sheet ${date}` });
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
  async function main(data,date) {
    const googleSheetClient = await _getGoogleSheetClient();
    // Reading Google Sheet from a specific range
    //const data = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
    console.log(data);
    // Adding a new row to Google Sheet
    const dataToBeInserted = [  
      ['Global Name' , 'User Name', 'Date', 'Time','Share Given'],
    ];
    data.forEach(element =>{
        const obj = element.toJSON();
        dataToBeInserted.push([obj.globalName,obj.username,obj.date,obj.time,obj.shareGiven]);
    })
    const url =  _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, dataToBeInserted);
    return url;
  }

  async function _getGoogleSheetClient() {
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyFile,
      scopes: SCOPES,
    });
    const authClient = await auth.getClient();
    return google.sheets({
      version: 'v4',
      auth: authClient,
    });
  }
