require('dotenv').config();
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const sendSMS = require('./sendSMS')
const sendCall = require('./sendCall');
const { sendEmail } = require('./sendEmail');  // Import sendEmail
const Pusher = require('pusher');
const { ObjectId } = require('mongoose').Types;


const app = express()
const port = 5001;

// Environment Variables
const {
  FRONTEND_URL,
  PUSHER_APPID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
  JWT_SECRET,
  MONGODB_URL,
} = process.env;

// Validate essential environment variables
if (
  !FRONTEND_URL ||
  !PUSHER_APPID ||
  !PUSHER_KEY ||
  !PUSHER_SECRET ||
  !PUSHER_CLUSTER ||
  !JWT_SECRET ||
  !MONGODB_URL
) {
  console.error("One or more essential environment variables are missing.");
  process.exit(1); // Exit the application if essential variables are missing
}

console.log("Frontend URL:", FRONTEND_URL);
console.log('Pusher App ID:', PUSHER_APPID);
console.log('Pusher Key:', PUSHER_KEY);
console.log('Pusher Cluster:', PUSHER_CLUSTER);
console.log('Pusher Secret:', PUSHER_SECRET);


const pusher = new Pusher({
   appId : process.env.PUSHER_APPID,
   key : process.env.PUSHER_KEY,
   secret : process.env.PUSHER_SECRET,
   cluster : process.env.PUSHER_CLUSTER,
   useTLS: true
});

// CORS Configuration
// const corsOptions = {
//   origin: FRONTEND_URL, // Restrict to your frontend URL
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// };

const jwt = require('jsonwebtoken');

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());


const server = http.createServer(app)
const MONGODB_URI = process.env.MONGODB_URL



mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

// Test Pusher Connection
pusher.trigger("service-channel", "test-event", { message: "Test event!" })
  .then(() => {
    console.log("Test event triggered successfully.");
  })
  .catch((err) => {
    console.error("Error triggering test event:", err);
  });


const serviceSchema = new mongoose.Schema({

  name: { type: String, required: true },
  url: { type: String, required: true },
  status: { type: String , default: 'unknown'},
  type: { type: String, required: true }, // Make sure this field is in the request
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: false },
  payload: { type: Object, required: false },
  expectedResponse: { type: Object, required: false },
  notifications: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    voice: { type: Boolean, default: false },
    mobilePush: { type: Boolean, default: false }
  },
  healthCheckPayload: { type: Object, required: false },
  responseTime: { type: Number, required: false },
  lastChecked: { type: Date, default: Date.now },
  statusHistory: [
    {
      status: { type: String },
      responseTime: { type: Number },
      timestamp: { type: Date, default: Date.now },
      errorDetails: {
        errorCode: { type: String, required: false },
        errorMessage: { type: String, required: false }
      },
    }
  ],
 

});



const contactSchema = new mongoose.Schema({
  email: { type: String, required: false }, // Email for email notifications
  phone: { type: String, required: false }, // Phone for SMS or calls
});



const Contact = mongoose.model('Contact', contactSchema);
const Service = mongoose.model('Service', serviceSchema);


const notifyUser = async (notifications, serviceName, status, firstAdd, timestamp, errorCode, errorMessage, responseTime) => {

  console.log("inside notify user");

  if (!notifications) return;

  const contacts = await Contact.find({});
  const phoneNumbers = contacts.map(contact => contact.phone).filter(Boolean);
  const emails = contacts.map(contact => contact.email).filter(Boolean);

  const dateTimestamp = new Date(timestamp); // Convert timestamp to a Date object
  // In notifyUser function, use the formatTimestamp function
  let formattedTimestamp = formatTimestamp(dateTimestamp);

  // Create the details message with relevant information
  let details = `<strong>Service Name:</strong> ${serviceName}<br>` +
                `<strong>Status:</strong> ${status}<br>` +
                `<strong>Response Time:</strong> ${responseTime} ms<br>` +
                `<strong>Timestamp:</strong> ${formattedTimestamp}<br>`;
  // Create plain text version for SMS
  let smsDetails = `Service Name: ${serviceName}\n` +
                   `Status: ${status}\n` +
                   `Response Time: ${responseTime || 'N/A'} ms\n` +
                   `Timestamp: ${formattedTimestamp}\n`;

  // If the service is down, add error details
  if (status === 'down') {
    details += `<strong>Error Code:</strong> ${errorCode}<br>` +
               `<strong>Error Message:</strong>${errorMessage}<br>`;

    smsDetails += `Error Code: ${errorCode || 'N/A'}\n` +
    `Error Message: ${errorMessage || 'N/A'}\n`;
  }

  console.log("details are ", details);

  if (notifications.email) {
    console.log("inside email")
    // const recipientEmail = 'shameer@cblu.io';  // Replace with actual recipient email or fetch dynamically

    console.log(`Sending email about ${serviceName} being ${status}`);
    
    for (const recipientEmail of emails) {
      console.log(`Sending email about ${serviceName} being ${status} to ${recipientEmail}`);
      await sendEmail(recipientEmail, serviceName, status, details);
    } // Call sendEmail to send the notification
    console.log("Email notification sent successfully!");
  }
  
  if (notifications.voice) {
    console.log("inside call notify");
    for (const number of phoneNumbers) {
      console.log(`Calling about ${serviceName} being ${status} to ${number}`);
      await sendCall(smsDetails); // Assuming sendCall takes phone number as argument
    }
    console.log(`Calling about ${serviceName} being ${status}`);
  }
  
  if (notifications.sms) {
    console.log("reached sendSMS");
    for (const number of phoneNumbers) {
      console.log(`Sending SMS about ${serviceName} being ${status} to ${number}`);
      await sendSMS(smsDetails); // Assuming sendSMS takes phone number as argument
    }
  }

  if (notifications.mobilePush) {
    console.log(`Sending push notification about ${serviceName} being ${status}`);
  }
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`; // Format as "YYYY-MM-DD HH:MM"
};

setInterval(() => {
  monitorServices();
}, 60000); // 1 min


// Get all contacts
app.get('/contacts', async (req, res) => {
  try {
      const contacts = await Contact.find({});
      const phoneNumbers = contacts.map(contact => contact.phone).filter(Boolean);
      const emails = contacts.map(contact => contact.email).filter(Boolean);
      res.json({ phoneNumbers, emails });
  } catch (error) {
      res.status(500).json({ message: 'Error fetching contacts' });
  }
});

// Add a new phone number
app.post('/contacts/phone', async (req, res) => {
  const { phone } = req.body;

  if (!phone.match(/^\d{10}$/)) {
    return res.status(400).json({ message: 'Invalid phone number format' });
}
  try {
      const newContact = new Contact({ phone });
      await newContact.save();
      res.status(201).json(newContact);
  } catch (error) {
      res.status(500).json({ message: 'Error adding phone number' });
  }
});

// Add a new email
app.post('/contacts/email', async (req, res) => {
  const { email } = req.body;


  try {
      const newContact = new Contact({ email });
      await newContact.save();
      res.status(201).json(newContact);
  } catch (error) {
      res.status(500).json({ message: 'Error adding email' });
  }
});

// Delete a phone number
app.delete('/contacts/phone/:phone', async (req, res) => {
  const { phone } = req.params;
  try {
      await Contact.deleteOne({ phone });
      res.status(204).send();
  } catch (error) {
      res.status(500).json({ message: 'Error deleting phone number' });
  }
});

// Delete an email
app.delete('/contacts/email/:email', async (req, res) => {
  const { email } = req.params;
  try {
      await Contact.deleteOne({ email });
      res.status(204).send();
  } catch (error) {
      res.status(500).json({ message: 'Error deleting email' });
  }
});






app.post('/add-service' , async (req, res) => {
  try {
    console.log("Received request at /add-service  ");
    const newService = new Service(req.body);
    console.log(newService)
    let status;
    let responseTime;
    let errorDetails = { errorCode: null, errorMessage: null }; 
    
    try {
      const url = newService.url;
      console.log("url in add service is",url)
      const start = Date.now();
      const response = await axios.get(url);
      responseTime = Date.now() - start;
      status = (response.status >= 200 && response.status < 300) ? 'up' : 'down';
      errorDetails.errorCode = response.status;
      errorDetails.errorMessage = response.statusText;
    } catch (error) {
      status = 'down';
      responseTime = 0; // Assuming 0 as response time in case of failure
      errorDetails.errorCode = error.code || 'N/A';
      errorDetails.errorMessage = error.message || 'Request failed';
    }

    // Update the service object with status details
    newService.status = status;
    newService.responseTime = responseTime;
    newService.lastChecked = new Date();
     // Update error details
     
    

    newService.statusHistory.push({
      status: status,
      responseTime: responseTime,
      timestamp: new Date(),
      errorDetails:errorDetails
    });

    // Save the new service with status details
     await newService.save();
     console.log("newService after saving is ",newService)
     console.log("Service saved with status:", status);

     // Emit the new service data to the frontend
     await pusher.trigger("service-channel", "service-added", newService);

     // Set firstAdd to true since it's a new service being added
      const firstAdd = true;
 
    // Call notifyUser with all necessary information
  notifyUser(
  newService.notifications,
  newService.name,
  status,
  firstAdd,
  new Date(),
  errorDetails.errorCode,
  errorDetails.errorMessage, // Assuming you have an error message
  responseTime
);
 
     res.status(201).json({ message: 'Service added successfully'});
   } catch (error) {
     console.error("Error in /add-service:", error);
     res.status(400).send('Failed to add service: ' + error.message);
   }
 });



// Add WhatsApp service and immediately check its health

app.post('/add-whatsapp-service', async (req, res) => {
  
  console.log("inside whatsapp endpoint")
  try {
    const newService1 = new Service(req.body);
    
    let status;
    let responseTime;
    let errorDetails = { errorCode: null, errorMessage: null };
    
    try {
      const url = req.body.url;
      console.log("url in whatsapp is",url)
      const start = Date.now();
      const response = await axios.get(url);
      responseTime = Date.now() - start;
      status = (response.status >= 200 && response.status < 300) ? 'up' : 'down';
      errorDetails.errorCode = response.status;
      errorDetails.errorMessage = response.statusText;
    } catch (error) {
      status = 'down';
      responseTime = 0; // Assuming 0 as response time in case of failure
      errorDetails.errorCode = error.code || 'N/A';
      errorDetails.errorMessage = error.message || 'Request failed';
    }

    // Update the service object with status details
    newService1.status = status;
    newService1.responseTime = responseTime;
    newService1.lastChecked = new Date();

    newService1.statusHistory.push({
      status: status,
      responseTime: responseTime,
      timestamp: new Date(),
      errorDetails:errorDetails
    });

    console.log("hii")
    console.log("new service 1 is",newService1)


    // Save the new service with all its details
    await newService1.save();
    
    // Emit the new WhatsApp service data to the frontend
    await pusher.trigger("service-channel", "whatsapp-service-added", newService1);

    console.log("new service in add :",newService1)
    console.log("status of whatsapp is",status)

    // Set firstAdd to true since it's a new service being added
    const firstAdd = true;

    // Call notifyUser with all necessary information
notifyUser(
  newService1.notifications,
  newService1.name,
  status,
  firstAdd,
  new Date(),
  errorDetails.errorCode,
  errorDetails.errorMessage, // Assuming you have an error message
  responseTime
);
    console.log("Sending response to frontend");
    res.status(201).json({ message: 'WhatsApp service added successfully' });
  } catch (error) {
    console.error('Error adding WhatsApp service:', error);
    res.status(500).send('Server Error');
  }
});


app.get('/status', async (req, res) => {
  console.log("Inside /status");
  try {
    // Fetch all services with their status and monitoring details
    const services = await Service.find();
    console.log("Services with status:", services);
    res.json(services);
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).send('Error fetching status');
  }
});



app.post('/login', async (req, res) => {
  
  console.log("INSIDE LOGIN ENDPOINT")
  
  const hardCodedEmail = "rushaid1@gmail.com";
  const hardCodedPassword = "12345678";

  const email = req.body.email.trim();
  const password = req.body.password.trim();
  
  if (email === hardCodedEmail) {
    console.log("inside email")
    console.log("Request password:", password);
    console.log("Hardcoded password:", hardCodedPassword);
    if (password === hardCodedPassword) {
      console.log("inside email and pass")
      const token = jwt.sign({ user: { id: "someUniqueId" } }, JWT_SECRET);
      console.log("token in login is", token);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, error: "Wrong password" });
    }
  } else {
    res.json({ success: false, error: "Wrong email ID" });
  }
});

app.get('/service/:id', async (req, res) => {

  console.log("inside serviceid")
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).send('Service not found');
    }
    // Emit the new WhatsApp service data to the frontend
    console.log("Service Data:", service);  // Log service data
  
    // Broadcast service update through SSE
    // broadcastEvent('ServiceDetails', service);
    
    // Trigger Pusher event
    await pusher.trigger("service-channel", "service-update", {
      id: req.params.id,
      service
    });

    res.json(service);
  } catch (error) {
    console.error("Error fetching service:", error.message);
    res.status(500).send('Server Error');
  }
});

app.delete('/service/:id', async (req, res) => {

  console.log("inside delete service");
  const serviceId = req.params.id; // Get the service ID from the request parameters
  console.log("Service ID from params:", serviceId);
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }

    // Attempt to delete the service
    const deletedService = await Service.findByIdAndDelete(serviceId);

    if (!deletedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Emit Pusher event for deletion (if needed)
    // await pusher.trigger("service-channel", "service-deleted", { id: serviceId });

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Server error while deleting service' });
  }
});



const monitorServices = async () => {
  const services = await Service.find();
  for (let service of services) {
    await monitorService(service);
  }
};


const monitorService = async (service) => {
  try {
    let status;
    let responseTime;
    let errorDetails = { errorCode: null, errorMessage: null };
    

    try {
      const start = Date.now();
      const response = await axios.get(service.url);
      responseTime = Date.now() - start;
      status = (response.status >= 200 && response.status < 300) ? 'up' : 'down';
      errorDetails.errorCode = response.status;
      errorDetails.errorMessage = response.statusText;
    } catch (error) {
      console.log("in error")
      status = 'down';
      responseTime = 0;
      errorDetails.errorCode = error.code || 'N/A';
      errorDetails.errorMessage = error.message || 'Request failed';
    }

    if (service.status !== status) {
      console.log("Status has changed, notifying the user");

      console.log("Before notifyUser call:");
      console.log("responseTime:", responseTime);
      console.log("errorCode:", errorDetails.errorCode);
      console.log("errorMessage:", errorDetails.errorMessage);

      const firstAdd = false; 
      const timestamp = new Date();
      notifyUser(
        service.notifications,
        service.name,
        status,
        firstAdd,
        timestamp,
        errorDetails.errorCode, // Pass the error code
        errorDetails.errorMessage, // Pass the error message
        responseTime // Pass the response time
      );

      // Update status history
      service.statusHistory.push({
        status,
        responseTime,
        timestamp: new Date(),
        errorDetails: errorDetails // Update error details

      });
    }
        // Update the service with new status details
   const updatedService = await Service.findByIdAndUpdate(service._id, {
    status,
    responseTime,
    lastChecked: new Date(),
    statusHistory: service.statusHistory,
    }, { new: true });


  
  // Broadcast service update through Pusher
  await pusher.trigger("service-channel", "service-status-updated", updatedService);

// pusher.trigger('service-channel', 'service-status-updated', {
//   serviceName: updatedService.name,
//   status: updatedService.status,
//   timestamp: new Date()
// });
   
  console.log(`Service ${service.name} status updated to ${status}`);
  } catch (error) {
    console.error("Error checking service status:", error);
  }
};

// module.exports = app;

// app.get("/", (req, res) => {
//   app.use(express.static(path.resolve(__dirname, "frontend", "build")));
  
//   res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
// });

app.get('/', (req, res) => {
  res.json("hello world");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});










