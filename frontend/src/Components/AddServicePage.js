import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddServiceForm from './AddServiceForm';
import './styles/AddServicePage.css';


const AddServicePage = () => {
 
  const navigate = useNavigate();
  

  const addService = async (service) => {

    console.log("Inside add service function")
    try {
    
      let endpoint;

      switch (service.type) {
        case 'HTTP':
          endpoint = '/add-service';
          break;
  
        case 'API':
          endpoint = '/add-api-service';
          break;

        case 'WhatsApp':  // Add this case
        endpoint = '/add-whatsapp-service';
        break;
  
        default:
          console.error("Unknown service type:", service.type);
          return;
      }
   
      const response = await axios.post(`http://localhost:5001${endpoint}`, service);
    
      console.log('Service added successfully:', response.data);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.error(error.response.data || error.response.data); 
      } else {
        console.log("An error occured")
        console.error("An unexpected error occurred.");
      }
    }  
  };
  

  return (
    <div className="add-service-page">
      <button className="back-button" onClick={() => navigate('/')}>Monitoring</button>
      <h2>Add Single Monitor</h2>
      <AddServiceForm onAddService={addService} />
    </div>
  );
};

export default AddServicePage;





