
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./styles/HomePage.css";
import { FiLogOut } from "react-icons/fi";
import { FiLogIn } from "react-icons/fi";
import { CgDetailsMore } from "react-icons/cg";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import Pusher from 'pusher-js';

const HomePage = ({ isLoggedIn, handleLogout }) => {
  
  const [services, setServices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 7;

  const apiUrl = process.env.REACT_APP_BACKEND_URL;
  
  useEffect(() => {
    fetchServices();
  }, []);

  const pusherRef = useRef(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchServices();

    if (!pusherRef.current) {
      console.log("Initializing Pusher...");
      pusherRef.current = new Pusher(process.env.REACT_APP_PUSHER_APP_ID, {
        cluster: 'ap2',
        encrypted: true,
      });

      console.log('Pusher instance:', pusherRef.current);
      const pusher = pusherRef.current;

      pusher.connection.bind('connected', () => {
        console.log('Pusher is connected');
      });
  
      pusher.connection.bind('disconnected', () => {
        console.log('Pusher is disconnected');
      });
  
      pusher.connection.bind('error', (err) => {
        console.error('Pusher connection error:', err);
      });
    }

    const pusher = pusherRef.current;

    // Subscribe to the Pusher channel
    var channel = pusher.subscribe('service-channel');
    console.log('Subscribed to Pusher channel: service-channel');

    // Listen for service added event
    channel.bind('service-added', (data) => { 
      console.log("Channel bind: service-added");
      const newService = data;
      console.log("New service in service-added:", newService);
      setServices((prevServices) => [...prevServices, newService]);
    });

    // Listen for WhatsApp service added event
    channel.bind('whatsapp-service-added', (data) => {
      console.log("Channel bind: whatsapp-service-added");
      const newService = data;
      console.log("New service in whatsapp-service-added:", newService);
      setServices((prevServices) => [...prevServices, newService]);
    });

    // Listen for service status updated event
    channel.bind('service-status-updated', (data) => {
      console.log("Channel bind: service-status-updated");
      console.log("Data received:", data);
      const updatedService = data;
      setServices((prevServices) =>
        prevServices.map((service) =>
          service._id === updatedService._id ? updatedService : service
        )
      );
    });

    channel.bind('test-event', function(data) {
      console.log(data.message); // Logs "Test event!"
    });

    // Cleanup on component unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('service-channel');
    };
  }, [apiUrl]);

  const fetchServices = async () => {
    console.log("Inside fetchServices");
    console.log(`${apiUrl}/status`);
    try {
      const response = await axios.get(`${apiUrl}/status`);
      console.log("Request sent");

      console.log(response.data);

      if (Array.isArray(response.data)) {
        setServices(response.data);
        console.log("Services updated (array)");
      } else {
        setServices(response.data.services || []);
        console.log("Services updated (object)");
      }
    } catch (error) {
      if (error.response) {
        console.error("Error fetching services:", error.response.data);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error:", error.message);
      }
    }
  };

  const handleDetailsClick = (serviceId) => {
    console.log("Handle details click for service ID:", serviceId);
    navigate(`/service/${serviceId}`);
  };

  const handleAddServiceClick = () => {
    console.log("Inside handleAddServiceClick");
    if (isLoggedIn) {
      navigate("/add-service");
    } else {
      if (
        window.confirm(
          "To add services, you need to log in. Do you want to log in now?"
        )
      ) {
        navigate("/login");
      }
    }
  };

  const latestUpdateTime =
    services.length > 0
      ? new Date(
          Math.max(...services.map((service) => new Date(service.lastChecked)))
        ).toLocaleString()
      : "No updates available";

  const handleAuthButtonClick = () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      navigate("/login");
    }
  };

  // Pagination logic
  const indexOfLastService = currentPage * servicesPerPage;
  const indexOfFirstService = indexOfLastService - servicesPerPage;
  const currentServices = services.slice(
    indexOfFirstService,
    indexOfLastService
  );

  const totalPages = Math.ceil(services.length / servicesPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="homepage">
      <header className="header1">
        <div className="header-content">
          <div>
            <img
              src="https://www.buktor.com/uploads/medium/f3bd3290755eb3f77d674ba5738bd460_medium-1000x270.png"
              alt="buktor"
              className="logo"
            />
          </div>

          <button onClick={handleAuthButtonClick} className="logout-button">
            {isLoggedIn ? <FiLogOut size={25}/> : <FiLogIn size={25} />}
          </button>
        </div>
      </header>
      <div className="heading">
        <h1>Status of Buktor Business Platforms</h1>
      </div>
      
      <div className="header">
        {isLoggedIn && (
          <button
            className="new-monitor-button"
            onClick={handleAddServiceClick}
          >
            + New Monitor
          </button>
        )}
      </div>
      <div className="services-container">
      <div className="services">
        {currentServices.map((serviceItem) => (
          <div
            className={`service-item ${serviceItem.status === "up" ? "up" : "down"}`}
            key={serviceItem._id}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="service-url">
                <span className={`status-dot ${serviceItem.status === 'up' ? 'up' : serviceItem.status === 'down' ? 'down' : 'unknown'}`}>
                </span>

                <a href={serviceItem.url}>{serviceItem.name}</a>
              </div>
              <div className="service-details">
                <span>
                  {serviceItem.status.charAt(0).toUpperCase() +
                    serviceItem.status.slice(1)}{" "}
                  at {new Date(serviceItem.lastChecked).toLocaleString()}
                </span>

                <span>{serviceItem.status === "up" ? "100%" : "0%"}</span>
              </div>
            </div>
            <div>
              <button
                className="details-button"
                onClick={() => handleDetailsClick(serviceItem._id)}
              >
                <CgDetailsMore size={20}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Pagination controls */}
      <div className="pagination">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="pagination-button"
        >
          <FaAngleLeft />
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          <FaAngleRight />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
