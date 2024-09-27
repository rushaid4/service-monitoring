  import React, { useEffect, useState } from 'react';
  import { useParams } from 'react-router-dom';
  import './styles/ServiceDetails.css';  // Import the CSS file
  import Pusher from 'pusher-js';

  const ServiceDetails = () => {

    const { id } = useParams();
    const [service, setService] = useState(null);


    useEffect(() => {

      console.log("Service details component Rendered")

      const pusher = new Pusher(process.env.REACT_APP_APP_ID, {
        cluster: 'ap2',
        encrypted: true,
      });

      const channel = pusher.subscribe('service-channel');
      
      channel.bind('service-update', function (data) {
        console.log("channal bind service page")
        console.log("data in channel bind is ",data.id);
        console.log("data id is ",data.id);
        console.log("id is ",id);
        if (data.id === id) {
          setService(data); // Update service details in real-time
        }
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe('service-channel');
      };
    }, [id]);

    useEffect(() => {
      
      const fetchServiceDetails = async () => {
        try {
          console.log("inside fetchServiceDetails function")
          const response = await fetch(`https://service-monitoring-server.vercel.app/service/${id}`);
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


