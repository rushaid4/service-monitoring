require('dotenv').config();

console.log("inside makeCall");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const toNum = process.env.TO_NUMBER;
const fromnum = process.env.TWILIO_FROM_NUMBER;
console.log(accountSid)
console.log(authToken)
console.log(toNum)
console.log(fromnum)

if (!toNum) {
  console.error("TO_NUMBERS environment variable is not defined");
  process.exit(1); // Exit the process if TO_NUMBERS is not defined
}

if (!fromnum) {
  console.error("TWILIO_FROM_NUMBER environment variable is not defined");
  process.exit(1); // Exit the process if TWILIO_FROM_NUMBER is not defined
}

const client = require('twilio')(accountSid, authToken);

const makeCall = async (message) => {
  
  console.log("inside makeCall function");
  
  const toNumbers = toNum.includes(',') 
  ? toNum.split(',').map(num => num.trim()).filter(Boolean) // Trim spaces and filter out empty strings
  : [toNum.trim()];
  // Ensure the message is properly wrapped in TwiML
  const twimlMessage = `<Response><Say>${message}</Say></Response>`;
  
  for (let number of toNumbers) {
  let callOptions = {
    from: fromnum,  // The Twilio number making the call
    to: number,      // The number to call
    twiml: twimlMessage // The message to be spoken during the call
  }
  
  try {
    const call = await client.calls.create(callOptions);
    console.log(`Call initiated with SID: ${call.sid}`);
  } catch (error) {
    console.error("Error making call:", error);
  }
}
}

module.exports = makeCall;
