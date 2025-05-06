// src/services/imageUploadService.js

/**
 * Uploads images to the server
 * @param {File[]} images - Array of image files to upload
 * @returns {Promise<string[]>} - Promise resolving to array of image paths
 */
export const uploadImages = async (images) => {
    if (!images || images.length === 0) {
      return [];
    }
  
    // Create a FormData instance
    const formData = new FormData();
    
    // Append each image to the FormData
    images.forEach(image => {
      formData.append('images', image);
    });
  
    try {
      // Send the request to the API endpoint
      const response = await fetch('http://localhost:5000/api/upload-images', {
        method: 'POST',
        body: formData,
      });
  
      // Handle server errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload images');
      }
  
      // Parse the response
      const result = await response.json();
      
      // Check if upload was successful
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload images');
      }
  
      // Return the image paths
      return result.paths;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  };
  
  /**
   * Validates an image file
   * @param {File} file - The file to validate
   * @returns {boolean} - Whether the file is valid
   */
  export const validateImage = (file) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      return false;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return false;
    }
    
    return true;
  };