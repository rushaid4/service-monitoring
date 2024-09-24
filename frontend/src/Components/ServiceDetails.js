import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './styles/ServiceDetails.css';  // Import the CSS file
import io from 'socket.io-client'

const socket = io('http://localhost:5000');
// const socket = io(`${window.location.origin}`);

const ServiceDetails = () => {

  const { id } = useParams();
  const [service, setService] = useState(null);


  useEffect(() => {
    
    const fetchServiceDetails = async () => {
      try {
        console.log("inside fetch 11")
        const response = await fetch(`http://localhost:5000/service/${id}`);
        // const response = await fetch(`${window.location.origin}/service/${id}`);
        console.log("inside fetch 11")
        const data = await response.json();
        console.log("data is ",data)

        if (response.ok) {
          setService(data);
        } else {
          console.error("Error fetching service details:", data.message);
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
      }
    };

    fetchServiceDetails();

    // Listen for updates from the server
    socket.on('ServiceDetails', (updatedService) => {
      if (updatedService._id === id) {
        setService(updatedService); // Update the service details with the new data
      }
    });


  return () => {
      
    socket.off('ServiceDetails'); // Clean up the socket listener on component unmount
    };
  }, [id]);

  if (!service) {
    return <div className="loading">Loading...</div>;
  }

  
  const borderColorClass = service.status === 'up' ? 'status-up' :
                         service.status === 'down' ? 'status-down' :
                         'status-unknown';

  return (
    <div className={`service-details-container ${borderColorClass}`}>
      <h2 className="service-title">Service Details: {service.name}</h2>
      <div className="service-info">
        <p><strong>Current Status:</strong> {service.status}</p>
        <p><strong>Response Time:</strong> {service.responseTime || 'N/A'} ms</p>
        <p><strong>Last Checked:</strong> {new Date(service.lastChecked).toLocaleString()}</p>
      </div>

      <h3 className="history-title">Status History</h3>
      <ul className="status-history-list">
        {service.statusHistory.slice().reverse().map((entry, index) => (
          <li key={index} className={`status-history-item ${entry.status === 'down'? 'status-down':'status-up'}`}>
            <p><strong>Status:</strong> {entry.status}</p>
            <p><strong>Response Time:</strong> {entry.responseTime} ms</p>
            <p><strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString()}</p>
            {/* {entry.status === 'down' && (
              <> */}
                <p><strong>Status Code:</strong> {entry.errorDetails?.errorCode || 'N/A'}</p>
                <p><strong>Status Message:</strong> {entry.errorDetails?.errorMessage || 'N/A'}</p>
              {/* </>
            )} */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ServiceDetails;


