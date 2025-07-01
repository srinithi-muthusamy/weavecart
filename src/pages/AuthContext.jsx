import { createContext, useState, useEffect } from "react";
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          // Fetch fresh user data including profile picture
          await fetchUserData(token);
        } catch (error) {
          console.error("Error parsing user data:", error);
          logout();
        }
      }
    };

    initializeAuth();
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: token }
      });

      if (response.data?.user) {
        const updatedUser = {
          ...response.data.user,
          profilePic: response.data.user.profilePic
        };
        setUser(updatedUser);
        // Update localStorage with new user data
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, logout user
        logout();
      } else {
        console.error('Error fetching user data:', error);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      fetchUserData(token);
    }
  }, [isAuthenticated]);

  const login = async ({ token, user }) => {
    if (token && user) {
      localStorage.setItem("token", `Bearer ${token}`);
      localStorage.setItem("user", JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user);
      await fetchUserData(`Bearer ${token}`);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateUserProfile = async (updatedUser) => {
    try {
      const token = localStorage.getItem("token");
      setUser(currentUser => ({
        ...currentUser,
        ...updatedUser
      }));

      // Update localStorage with complete user data
      localStorage.setItem('user', JSON.stringify({
        ...user,
        ...updatedUser
      }));

      // Refresh user data from server
      await fetchUserData(token);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
