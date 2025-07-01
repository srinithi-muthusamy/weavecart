import React, { createContext, useState, useEffect, useContext } from "react";
import { AuthContext } from "../pages/AuthContext";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { isAuthenticated, user } = useContext(AuthContext);

  // Load cart items from localStorage on initial render or when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      const userCart = localStorage.getItem(`cart_${user.id}`);
      setCartItems(userCart ? JSON.parse(userCart) : []);
    } else {
      setCartItems([]);
    }
  }, [isAuthenticated, user]);

  // Optimize updateCartCount function
  const updateCartCount = () => {
    if (isAuthenticated && user) {
      try {
        const userCart = localStorage.getItem(`cart_${user.id}`);
        setCartItems(userCart ? JSON.parse(userCart) : []);
      } catch (error) {
        console.warn('Error updating cart count:', error);
        setCartItems([]);
      }
    }
  };

  const addToCart = (product, navigate) => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }

    try {
      const newCartItem = {
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        // Optimize image storage
        image: optimizeImageForStorage(product.image)
      };

      const userId = user.id;
      
      // Try to get current cart with error handling
      let userCart = [];
      try {
        userCart = JSON.parse(localStorage.getItem(`cart_${userId}`)) || [];
      } catch (error) {
        console.warn('Error parsing cart data, creating new cart');
      }
      
      const existingItemIndex = userCart.findIndex(item => item._id === newCartItem._id);

      if (existingItemIndex !== -1) {
        userCart[existingItemIndex].quantity += 1;
      } else {
        userCart.push(newCartItem);
      }

      // Try to save with fallback for quota exceeded
      try {
        localStorage.setItem(`cart_${userId}`, JSON.stringify(userCart));
      } catch (storageError) {
        console.warn('Storage quota exceeded, using compact storage', storageError);
        // Fallback: Remove large image data
        const compactCart = userCart.map(item => ({
          ...item,
          image: item.image?.startsWith('http') ? item.image : 'https://dummyimage.com/250x250/cccccc/000000&text=No+Image'
        }));
        localStorage.setItem(`cart_${userId}`, JSON.stringify(compactCart));
      }
      
      setCartItems(userCart);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Helper function to optimize image storage
  const optimizeImageForStorage = (image) => {
    const PLACEHOLDER = "https://dummyimage.com/250x250/cccccc/000000&text=No+Image";
    if (!image) return PLACEHOLDER;
    // If it's a URL, keep as is, but fix any /100 or /200 placeholder
    if (typeof image === 'string') {
      if (
        image === "https://via.placeholder.com/100" ||
        image === "https://via.placeholder.com/200?text=Product+Image" ||
        image === "https://via.placeholder.com/250?text=No+Image" ||
        image.includes("placeholder.com/100") ||
        image.includes("placeholder.com/200") ||
        image.includes("placeholder.com/250")
      ) {
        return PLACEHOLDER;
      }
      if (image.startsWith('http') || image.startsWith('https')) {
        return image;
      }
      // For base64 images, keep the data:image/... prefix
      if (image.startsWith('data:image')) {
        if (image.length > 1024 * 10) {
          return PLACEHOLDER;
        }
        return image;
      }
      // If it's a raw base64 string (no prefix), add prefix
      if (/^[A-Za-z0-9+/=]+$/.test(image) && image.length > 100) {
        return `data:image/jpeg;base64,${image}`;
      }
    }
    return PLACEHOLDER;
  };

  // Add clearCart function
  const clearCart = () => {
    if (isAuthenticated && user) {
      localStorage.removeItem(`cart_${user.id}`);
      setCartItems([]);
    }
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      setCartItems, 
      addToCart, 
      updateCartCount,
      clearCart 
    }}>
      {children}
    </CartContext.Provider>
  );
};