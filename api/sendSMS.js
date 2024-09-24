const dotenv = require("dotenv");

require('dotenv').config();

console.log("inside sendSMS");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const sendSMS = async (body) => {
  
  console.log("inside sendSMS function");
  
   // Split the TO_NUMBER string into an array if it contains commas
   const toNumbers = process.env.TO_NUMBER.includes(',')
   ? process.env.TO_NUMBER.split(',').map(num => num.trim()).filter(Boolean) // Trim spaces and filter out empty strings
   : [process.env.TO_NUMBER.trim()]; // Single number, trimmed
  
  for (let number of toNumbers) {

    if (!number) {
      console.warn("Skipping empty or invalid phone number.");
      continue;
    }

  let msgOptions = {
    from:process.env.TWILIO_FROM_NUMBER,
    to: number,
    body
  };
  try{
    const message = await client.messages.create(msgOptions);
    console.log(`Message sent to ${number}: SID ${message.sid}`);

  }
  catch(error){
    console.error("Error sending SMS:", error);
  }
  }
}
  module.exports = sendSMS;

