const AWS = require('aws-sdk');
const dotenv = require("dotenv");
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

dotenv.config();  // Ensure environment variables are loaded

console.log("acces key is ",process.env.AWS_ACCESS__KEY)
console.log("s key is ",process.env.AWS_SECRET_ACCESS_KEY)
console.log("region is",process.env.AWS_SES_REGION )

const SES_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS__KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_SES_REGION,
}

const AWS_SES = new AWS.SES(SES_CONFIG);

const sendEmail = async (recipientEmail, name, status) => {
  let params = {
    Source: process.env.AWS_SES_SENDER,
    Destination: {
      ToAddresses: [recipientEmail],
    },
    ReplyToAddresses: [process.env.AWS_SES_REPLY_TO || 'your-reply-email@example.com'],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `
            <h1>Hello, ${name}!</h1>
            <p>Your service <strong>${name}</strong> is now <strong>${status}</strong>.</p>
            <p>Thank you for using our service!</p>
          `,
        },
        Text: {
          Charset: 'UTF-8',
          Data: `Hello, ${name}!\nYour service ${name} is now ${status}.\nThank you for using our service!`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Update: ${name} is now ${status}`,
      },
    },
  };

  try {
    const res = await AWS_SES.sendEmail(params).promise();
    console.log("Email has been sent!", res);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
}

module.exports = { sendEmail };  // Correctly export the sendEmail function





