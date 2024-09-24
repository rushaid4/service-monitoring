import React, { useState } from 'react';
import './styles/AddServiceForm.css';
import { useNavigate } from 'react-router-dom';

const AddServiceForm = ({ onAddService }) => {
  
  const [name, setName] = useState('');
  const [type, setType] = useState('HTTP');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState(false);  // Email notification by default
  const [sms, setSms] = useState(false);
  const [voice, setVoice] = useState(false);
  const [mobilePush, setMobilePush] = useState(false); // Mobile push notification by default
  const [apiMethod, setApiMethod] = useState('POST');// Default method for API
  const [payload, setPayload] = useState('{}');
  const [payloadVersion, setPayloadVersion] = useState('3.0');
  const [payloadAction, setPayloadAction] = useState('ping');
  const [token, setToken] = useState('');
  const [expectedResponse, setExpectedResponse] = useState('{}');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState('');

  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    
    e.preventDefault();


    // Validate the URL format
    if (!validateUrl(url)) {
      setError('Please enter a valid URL that starts with http:// or https://');
      return;
    }

     // Check if any notification method is selected and set it accordingly
     if (name && (type === 'HTTP' ? url : (type === 'API' ? payload : (type === 'WhatsApp' ? (payloadVersion && payloadAction) : undefined)))){
      const contact = email ? 'email' : sms ? 'sms' : voice ? 'voice' : 'mobilePush';
      const selectedMethod = email ? 'email' : sms ? 'sms' : voice ? 'voice' : mobilePush ? 'push' : '';
     
      let healthCheckPayload = undefined;
      if (type === 'API') {
        healthCheckPayload = JSON.parse(payload); // Assuming payload is a JSON string
      } else if (type === 'WhatsApp') {
        healthCheckPayload = { version: payloadVersion, action: payloadAction };
      }



      const newService = {
        name,
        url: type === 'API' || type === 'HTTP' || type === 'WhatsApp' ? url : undefined,
        type, // Add the type field here
        notifications: { email, sms, voice, mobilePush },
        method: type === 'API' ? apiMethod : undefined, // API-specific fields
        healthCheckPayload,
        token: token ? token : undefined,
        expectedResponse: type === 'API' ? JSON.parse(expectedResponse) : undefined,
      };
  
      try {
        
        onAddService(newService);
        setName('');
        setUrl('');
        setPayload('{}');
        setPayloadVersion('3.0');
        setPayloadAction('ping');
        setExpectedResponse('{}');
        setError('');
        setSuccessMessage('Service added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        navigate('/');
      } catch (error) {
        console.log('Error adding new service:', error);
        setError('Failed to add service. Please try again.');
      }
    } else {
      setError('Please fill out all required fields.');
    }
  };
  
  const getPlaceholder = () => {
    switch (type) {
      case 'HTTP':
        return 'URL of the website';
      case 'API':
        return 'API endpoint URL';

      case 'WhatsApp':
          return 'WhatsApp Endpoint URL'; 
      default:
        return '';
    }
  };

  
  const handleUrlChange = (e) => {
    const inputValue = e.target.value;
    if (!inputValue.startsWith('http://') && !inputValue.startsWith('https://')) {
      setUrl(`https://${inputValue}`);
    } else {
      setUrl(inputValue);
    }
  };


    // URL validation function
    const validateUrl = (url) => {
      const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
      return !!pattern.test(url);
    };
  return (
    <form className="add-service-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Service Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="HTTP">HTTP / Website Monitoring</option>
        {/* <option value="API">API Monitoring</option> */}
        <option value="WhatsApp">WhatsApp Service Monitoring</option>
      </select>
      
      <input
          type="text"
          placeholder={getPlaceholder()}
          value={url}
          onChange={handleUrlChange}
          required
      />


      {type === 'API' && (
        <>
          <div className='api-settings-section'>
            <label>Request Method</label>
            <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)}>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
               <option value="DELETE">DELETE</option>
        
            </select>
          </div>
          <div className='sub'>
            <label>Payload</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>
          <div>
        <label>Authorization Token (optional):</label>
        <input type="text" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className='sub'>
            <label>Expected Response</label>
            <textarea
              value={expectedResponse}
              onChange={(e) => setExpectedResponse(e.target.value)}
              placeholder='{"status": "success"}'
            />
          </div>
        </>
      )}

{type === 'WhatsApp' && (
        <>
          <div className='sub'>
            <label>Health Check Version</label>
            <select value={payloadVersion} onChange={(e) => setPayloadVersion(e.target.value)}>
              <option value="1.0">1.0</option>
              <option value="2.0">2.0</option>
              <option value="3.0">3.0</option>
              {/* Add other versions as needed */}
            </select>
          </div>
          <div className='sub'>
            <label>Health Check Action</label>
            <select value={payloadAction} onChange={(e) => setPayloadAction(e.target.value)}>
              <option value="ping">ping</option>
              <option value="status">status</option>
              <option value="check">check</option>
              {/* Add other actions as needed */}
            </select>
          </div>
        </>
      )}



      {/* Notification Options */}
      <div className="notification-options">
        {/* <label>
          <input
            type="checkbox"
            checked={email}
            onChange={() => setEmail(!email)}
          />
          Email
        </label> */}
        <label>
          <input
            type="checkbox"
            checked={sms}
            onChange={() => setSms(!sms)}
          />
          SMS
        </label>
        <label>
          <input
            type="checkbox"
            checked={voice}
            onChange={() => setVoice(!voice)}
          />
          Voice call
        </label>
        {/* <label>
          <input
            type="checkbox"
            checked={mobilePush}
            onChange={() => setMobilePush(!mobilePush)}
          />
          Mobile push
        </label> */}
      </div>

      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <button type="submit">Add Service</button>
    </form>
  );
};

export default AddServiceForm;
