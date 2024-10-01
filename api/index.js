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

console.log("frontend url",process.env.FRONTEND_URL)

console.log('Pusher App ID:', process.env.PUSHER_APPID);
console.log('Pusher Key:', process.env.PUSHER_KEY);
console.log('Pusher Cluster:', process.env.PUSHER_CLUSTER);
console.log('Pusher secret:', process.env.PUSHER_SECRET);


const pusher = new Pusher({
   appId : process.env.PUSHER_APPID,
   key : process.env.PUSHER_KEY,
   secret : process.env.PUSHER_SECRET,
   cluster : process.env.PUSHER_CLUSTER,
   useTLS: true
});

// const corsOptions = {
//   origin: process.env.FRONTEND_URL, // Ensure this is correctly set
//   methods: ["GET", "POST", "PUT", "DELETE"],
  // allowedHeaders: ["Content-Type", "Authorization"],
  // credentials: true
// };

const jwt = require('jsonwebtoken');
const { clearScreenDown } = require('readline');
const JWT_SECRET = process.env.JWT_SECRET;

console.log(process.env.FRONTEND_URL, "local")


app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

const server = http.createServer(app)
const MONGODB_URI = process.env.MONGODB_URL



mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

pusher.trigger("service-channel", "test-event", { message: "Test event!" });



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


const Service = mongoose.model('Service', serviceSchema);


const notifyUser = (notifications, serviceName, status) => {

  if (!notifications) return;
  
  console.log("inside notify user");
  const message = `Service ${serviceName} is now ${status}`;
  console.log("message is ",message )

  if (notifications.email) {
    console.log("inside email")
    // const recipientEmail = 'shameer@cblu.io';  // Replace with actual recipient email or fetch dynamically
    const recipientEmail = 'shameer@cblu.io'; 
    console.log(`Sending email about ${serviceName} being ${status}`);
    
    sendEmail(recipientEmail, serviceName,status)  // Call sendEmail to send the notification
      .then(() => console.log("Email notification sent successfully!"))
      .catch(err => console.error("Error sending email notification:", err));
  }
  
  if (notifications.voice) {
    console.log("inside call notify");
    sendCall(message);
    console.log(`Calling about ${serviceName} being ${status}`);
  }
  
  if (notifications.sms) {
    console.log("reached sendSMS");
    sendSMS(message);
  }

  if (notifications.mobilePush) {
    console.log(`Sending push notification about ${serviceName} being ${status}`);
  }
};


setInterval(() => {
  monitorServices();
}, 60000); // 1 min





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

 
     // Notify the user about the initial status
     notifyUser(newService.notifications, newService.name, status);
 
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

    // Notify the user about the initial status
    notifyUser(newService1.notifications, newService1.name, status);
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
      notifyUser(service.notifications, service.name, status);

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










