/**
 * Storage Helper Utility
 * This utility helps manage localStorage safely, handling quotas and errors
 */

// Constants
const MAX_IMAGE_SIZE = 10 * 1024; // 10KB max for inline image storage
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/200?text=Product+Image";

/**
 * Safely get data from localStorage with error handling
 */
export const safeGetItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error getting item ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Safely set data to localStorage with fallback for quota exceeded
 */
export const safeSetItem = (key, data) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`Error setting item ${key} in localStorage:`, error);
    
    // If it's a quota error, try to compress the data
    if (error.name === 'QuotaExceededError' || error.toString().includes('quota')) {
      return handleQuotaExceeded(key, data);
    }
    
    return false;
  }
};

/**
 * Handle quota exceeded by optimizing data
 */
const handleQuotaExceeded = (key, data) => {
  // For cart data, try to optimize image storage
  if (key.startsWith('cart_')) {
    try {
      // If data is an array (cart items), optimize images
      if (Array.isArray(data)) {
        const optimizedData = data.map(item => ({
          ...item,
          image: optimizeImage(item.image)
        }));
        
        localStorage.setItem(key, JSON.stringify(optimizedData));
        return true;
      }
    } catch (secondError) {
      console.error('Failed to save with image optimization:', secondError);
      
      // Last resort - try removing images completely
      try {
        const strippedData = Array.isArray(data) 
          ? data.map(item => ({ ...item, image: null }))
          : data;
        
        localStorage.setItem(key, JSON.stringify(strippedData));
        return true;
      } catch (finalError) {
        console.error('All storage attempts failed:', finalError);
        return false;
      }
    }
  }
  
  return false;
};

/**
 * Optimize image for storage to avoid quota issues
 */
export const optimizeImage = (image) => {
  if (!image) return null;
  
  // Keep URLs as they are
  if (typeof image === 'string') {
    if (image.startsWith('http') || image.startsWith('https')) {
      return image;
    }
    
    // For base64 images, check size
    if (image.startsWith('data:image')) {
      if (image.length > MAX_IMAGE_SIZE) {
        return PLACEHOLDER_IMAGE;
      }
    }
  }
  
  return image;
};

/**
 * Clear all app-related data from localStorage
 */
export const clearAppStorage = (userId) => {
  try {
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
    }
    
    // You can also clear other app-specific data here
    
    return true;
  } catch (error) {
    console.error('Error clearing app storage:', error);
    return false;
  }
};
