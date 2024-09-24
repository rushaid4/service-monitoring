import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./styles/HomePage.css";
import io from "socket.io-client";
import { FiLogOut } from "react-icons/fi";
import { FiLogIn } from "react-icons/fi";
import { CgDetailsMore } from "react-icons/cg";
import { FaAngleLeft } from "react-icons/fa";
import { FaAngleRight } from "react-icons/fa";

const HomePage = ({ isLoggedIn, handleLogout }) => {
  const [services, setServices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // State to track current page
  const servicesPerPage = 7; // Number of services per page

  const navigate = useNavigate();
  
  const socket = io("https://service-monitoring-server.vercel.app/");


    useEffect(() => {
    fetchServices();

    socket.on("serviceAdded", (newService) => {
      setServices((prevServices) => [...prevServices, newService]); // Add new service directly to the list
    });

    socket.on("WhatsappServiceAdded", (newService) => {
      setServices((prevServices) => [...prevServices, newService]); // Add new WhatsApp service directly to the list
    });

    // Listen for updates from the backend
    socket.on("serviceStatusUpdated", (updatedService) => {
      setServices((prevServices) =>
        prevServices.map((service) =>
          service._id === updatedService._id ? updatedService : service
        )
      );
    });

    socket.on('initial-data', (data) => {
      console.log('Received from server:', data);
    });

    io.on('connection', (socket) => {
      console.log('a user connected');

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      // Implement a backoff strategy or limit reconnection attempts
    });

    // Cleanup on component unmount
    return () => {
      socket.off("serviceStatusUpdated");
      socket.off("serviceAdded");
      socket.off("WhatsappServiceAdded");
    };
  }, []);


  const fetchServices = async () => {
    try {
      const response = await axios.get("https://service-monitoring-server.vercel.app/status");
      // const response = await axios.get(`${window.location.origin}/status`);

      if (Array.isArray(response.data)) {
        setServices(response.data); // assuming response.data is an array of services
      } else {
        setServices(response.data.services || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  // On Details button click
  const handleDetailsClick = (serviceId) => {
    console.log("inside handle  detials click");
    navigate(`/service/${serviceId}`);
  };

  // Handle "Add Monitor" button click
  const handleAddServiceClick = () => {
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

  // Find the most recent update time
  const latestUpdateTime =
    services.length > 0
      ? new Date(
          Math.max(...services.map((service) => new Date(service.lastChecked)))
        ).toLocaleString()
      : "No updates available";

  // Handle login/logout button click
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
      
      {/* <p>Last Updated on {latestUpdateTime}</p> */}
      {console.log("Rendering services: ", services)} {/* Debugging */}
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
      <div className="services">
        {currentServices.map((serviceItem, index) => (
          <div
            className={`service-item ${
              serviceItem.status === "up" ? "up" : "down"
            }`}
            key={index}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="service-url">
                <span
                  className={`status-dot ${
                    serviceItem.status === "up" ? "up" : "down"
                  }`}
                ></span>
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
