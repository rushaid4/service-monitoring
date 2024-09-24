require('dotenv').config();
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const {Server} = require('socket.io');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const sendSMS = require('./sendSMS')
const sendCall = require('./sendCall');

const app = express();
const port = 5000;

const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key'; 

app.use(bodyParser.json());
app.use(cors())
app.use(express.json());



const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ["GET","POST"],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  console.log('New client connected');

   // Emit initial data to the connected client
   socket.emit('initial-data', { message: 'Hello from the server' });
  
  // You can handle client events here if needed
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});



mongoose.connect('mongodb+srv://Rushaid44:1234@cluster0.dkoeb.mongodb.net/')
.then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
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


const Service = mongoose.model('Service', serviceSchema);


const notifyUser = (notifications, serviceName, status) => {

  if (!notifications) return;
  
  console.log("inside notify user");
  const message = `Service ${serviceName} is now ${status}`;
  console.log("message is ",message )

  if (notifications.email) {
    console.log(`Sending email to  about ${serviceName} being ${status}`);
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
  monitorServices()
}, 60000);




app.post('/add-service' , async (req, res) => {
  try {
    console.log("Received request at /add-service");
    const newService = new Service(req.body);
  
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
      errorDetails.errorCode = response.status,
      errorDetails.errorMessage = response.statusText
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
    io.emit('serviceAdded', newService);

 
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
    io.emit('WhatsappServiceAdded', newService1);

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
    io.emit('ServiceDetails', service);
    res.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).send('Server Error');
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
      errorDetails.errorCode = response.status,
      errorDetails.errorMessage = response.statusText
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

        // Update the service with new status details
   const updatedService = await Service.findByIdAndUpdate(service._id, {
    status,
    responseTime,
    lastChecked: new Date(),
    statusHistory: service.statusHistory,
    

  }, { new: true });

  // Emit updated service data to the frontend
  io.emit('serviceStatusUpdated', updatedService);
    }
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






// const checkAPIServices = async () => {
  
//   console.log("Inside check API services");
  
//   const services = await Service.find({ type: 'API' });
//   console.log("APIs to check:", services);

//   const promises = services.map(async (service) => {
//     let status;
//     try {
//     const response = await axios({
//         method: service.method,
//         url: service.url,
//         data: service.payload,
//         timeout: 5000,
//       });

//       // Validate the response based on the criteria
//       const isResponseValid = validateResponse(response.data, service.expectedResponse);
//       status = isResponseValid ? 'up' : 'down';
//     } catch (error) {
//       console.log(`Error checking API service ${service.name}:`, error.message);
//       status = 'down';
//     }

//     const existingStatus = await Status.findOne({ service: service._id });
//     console.log("notification preferene is",service.notificationPreference)

//     if (!existingStatus || existingStatus.status !== status) {
//       notifyUser(service.notifications, service.name, status); 
//     }

//     await Status.findOneAndUpdate(
//       { service: service._id },
//       { status, lastChecked: new Date() },
//       { upsert: true, new: true }
//     );
//   });

//   await Promise.all(promises);
//   console.log("API services checked.");
// };

// Function to periodically check the health of all WhatsApp endpoints
// const checkWhatsAppEndpoints = async () => {
//   const services = await Service.find({ type: 'WhatsApp' });
//   console.log("WhatsApp services to check:", services);

//   const promises = services.map(async (service) => {
//     const status = await checkWhatsAppEndpoint(service);

//     // Check if status has changed
//     const existingStatus = await Status.findOne({ service: service._id });
//     if (!existingStatus || existingStatus.status !== status) {
//       notifyUser(service.notifications, service.name, status);
//     }

//     // Update the status in the database
//     await Status.findOneAndUpdate(
//       { service: service._id },
//       { status, lastChecked: new Date() },
//       { upsert: true, new: true }
//     );
//   });

//   await Promise.all(promises);
//   console.log("WhatsApp endpoints checked.");
// };

// app.post('/add-api-service', async (req, res) => {
//   console.log("Inside API services");
//   console.log(req.body);

//   try {
//     const { name, url, method, payload, expectedResponse, notifications, token } = req.body;

//     if (!name || !url || !method || !payload || !expectedResponse) {
//       return res.status(400).send('All fields are required');
//     }

//     console.log('Payload:', payload);

//     // Ensure payload is a valid JSON string or convert it
//     const validPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

//     // Define the new service object
//     const newService = new Service({
//       name,
//       type: 'API',
//       url,
//       method,
//       payload: validPayload,
//       expectedResponse,
//       notifications,
//     });

//     console.log("New service is", newService);

//     // Save the new service to the database
//     await newService.save();
//     console.log("API service saved");

//     try {
//       console.log("Making API request");

//       // Define headers based on the presence of a token
//       const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

//       // Send the API request
//       const response = await axios({
//         method: method,
//         url :url,
//         data: validPayload,
//         headers, // Include headers if provided
//         timeout: 5000,
//       });

//       console.log("API request successful");

//       // Validate the response data against the expected format
//       const isResponseValid = validateResponse(response.data, expectedResponse);

//       if (isResponseValid) {
//         console.log(`API response for ${name} is valid.`);
//       } else {
//         console.log(`API response for ${name} is invalid.`);
//       }
//     } catch (apiError) {
//       console.error('Error during API request:', apiError.message);
//     }

//     res.status(201).send('API Service added successfully');
//   } catch (error) {
//     console.error('Error adding API service:', error);
//     res.status(500).send('Server Error');
//   }
// });

// app.listen(port, () => {
//   console.log(`Backend listening at http://localhost:${port}`);
// });

// const validateResponse = (actualResponse, expectedResponse) => {
//   try {
//     const expected = JSON.parse(expectedResponse);
    
//     // Simple validation based on structure
//     return Object.keys(expected).every(key => key in actualResponse);
//   } catch (error) {
//     console.log("Error in response validation:", error.message);
//     return false;
//   }
// };

