  import React, { useEffect, useState } from 'react';
  import { useParams , useNavigate} from 'react-router-dom';
  import './styles/ServiceDetails.css';  // Import the CSS file
  import Pusher from 'pusher-js';

  const ServiceDetails = () => {

    const { id } = useParams();
    const [service, setService] = useState(null);
    const navigate = useNavigate();

    const apiUrl = process.env.REACT_APP_BACKEND_URL


    useEffect(() => {

      console.log("Service details component Rendered")

    }, [id]);

    useEffect(() => {
      
      const fetchServiceDetails = async () => {
        try {
          console.log("inside fetchServiceDetails function")
          const response = await fetch(`${apiUrl}/service/${id}`);
          console.log("inside fetch 1111")
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

  }, [id]);

  const handleDeleteService = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${service.name}? This action cannot be undone.`);
    if (confirmDelete) {
      try {
        const response = await fetch(`${apiUrl}/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          alert("Service deleted successfully");
          navigate('/');  // Redirect to home or another page after deletion
        } else {
          const errorData = await response.json();
          alert(`Error deleting service: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error deleting service:", error.message);
        alert("An error occurred while deleting the service");
      }
    }
  };

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

        {/* Delete button */}
      <button className="delete-button" onClick={handleDeleteService}>
        Delete Service
      </button>
      </div>
    );
  };

  export default ServiceDetails;


