import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LoginSignup.css";

const LoginSignup = ({handleLogin}) => {

  console.log("handleLogin:", typeof handleLogin);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const changeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const apiUrl = process.env.REACT_APP_BACKEND_URL
 

  const login = async () => {
    console.log("Inside login function");
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Data is:", data);
      if (data.success) {
        console.log("Auth token in login is", data.token);
        localStorage.setItem("auth-token", data.token);
        handleLogin();
        window.location.replace("/");
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

 

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>Login</h1>
        <div className="loginsignup-fields">
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              value={formData.email}
              onChange={changeHandler}
              type="email"
              placeholder="Email Address"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              name="password"
              value={formData.password}
              onChange={changeHandler}
              type="password"
              placeholder="Password"
            />
          </div>
          <div className="loginsignup-agree">
            <input type="checkbox" name="" id="" />
            <p>
              By continuing, I agree to the terms of use and privacy policy.
            </p>
          </div>
        </div>
        <div className="btn">
          <button onClick={login}>Continue</button>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
