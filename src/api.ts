import axios from 'axios';
import { Record, ApiResponse, CachedData } from './types';

const API_BASE_URL = 'https://aitable.ai/fusion/v1/datasheets/dstkzT6hfEtyEPTEn8';
const API_TOKEN = 'uskh2274ZKtAWpN2oGnEdvh';

// Attachment API endpoint might be different from the main datasheet endpoint
const ATTACHMENT_API_URL = 'https://aitable.ai/fusion/v1/attachments';

// Cache keys
const CACHE_KEY_RECORDS = 'expenses_app_cache_records';
const CACHE_KEY_FIELDS = 'expenses_app_cache_fields';
const CACHE_KEY_LAST_FETCH = 'expenses_app_last_fetch';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Function to save data to cache
const saveToCache = (data: ApiResponse) => {
  if (!data.success || !data.data) return;
  
  const timestamp = Date.now();
  const cachedData: CachedData = {
    timestamp,
    records: data.data.records || [],
    fields: data.data.fields
  };
  
  try {
    localStorage.setItem(CACHE_KEY_RECORDS, JSON.stringify(cachedData));
    localStorage.setItem(CACHE_KEY_LAST_FETCH, timestamp.toString());
    console.log('Data cached successfully at', new Date(timestamp).toLocaleString());
  } catch (error) {
    console.error('Failed to save data to cache:', error);
  }
};

// Function to get cached data
const getFromCache = (): CachedData | null => {
  const cachedDataString = localStorage.getItem(CACHE_KEY_RECORDS);
  if (!cachedDataString) return null;
  
  try {
    const cachedData: CachedData = JSON.parse(cachedDataString);
    return cachedData;
  } catch (error) {
    console.error('Failed to parse cached data:', error);
    return null;
  }
};

// Function to check if cache is expired
const isCacheExpired = (timestamp: number): boolean => {
  const now = Date.now();
  return now - timestamp > CACHE_EXPIRY_TIME;
};

// Function to check network connectivity
const isOnline = (): boolean => {
  return navigator.onLine;
};

export const getRecords = async (forceRefresh = false) => {
  // If force refresh, but we're offline, we can't refresh
  if (forceRefresh && !isOnline()) {
    console.warn('Force refresh requested but device is offline, using cache');
    forceRefresh = false;
  }
  
  try {
    // If not forcing refresh, check for cached data first
    if (!forceRefresh) {
      const cachedData = getFromCache();
      
      // If we have valid cached data and it's not expired, use it
      if (cachedData && !isCacheExpired(cachedData.timestamp)) {
        console.log('Using cached data from', new Date(cachedData.timestamp).toLocaleString());
        return {
          code: 200,
          success: true,
          message: 'SUCCESS (from cache)',
          data: {
            records: cachedData.records,
            fields: cachedData.fields
          }
        };
      }
      
      // If we're offline but have expired cache, still use it
      if (!isOnline() && cachedData) {
        console.log('Offline mode: using expired cache data');
        return {
          code: 200,
          success: true,
          message: 'SUCCESS (from expired cache - offline mode)',
          data: {
            records: cachedData.records,
            fields: cachedData.fields
          }
        };
      }
    }
    
    // If online, fetch from API (either cache expired, forced refresh, or no cache)
    if (isOnline()) {
      console.log(forceRefresh ? 'Forcing refresh from API' : 'Fetching fresh data from API');
      const response = await api.get<ApiResponse>(`/records?fieldKey=name`);
      
      // Cache the new data
      if (response.data.success) {
        saveToCache(response.data);
      }
      
      return response.data;
    } else {
      // If offline and we got here, we have no cache or it's expired
      throw new Error('No internet connection and no valid cached data');
    }
  } catch (error) {
    console.error('API error:', error);
    
    // Any API error should fall back to cache if available
    const cachedData = getFromCache();
    if (cachedData) {
      console.log('Error fetching data: using cached data as fallback');
      return {
        code: 200,
        success: true,
        message: 'SUCCESS (from cache due to error)',
        data: {
          records: cachedData.records,
          fields: cachedData.fields
        }
      };
    }
    
    // If no cache, throw the error
    throw error;
  }
};

// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT = "sultaneng";
const AZURE_CONTAINER = "sultangengwebsite";
const AZURE_SAS_TOKEN = "?sv=2023-01-03&st=2025-03-21T11%3A53%3A56Z&se=2025-04-22T11%3A53%3A00Z&sr=c&sp=racwdxltf&sig=O4LWckRIsuxZaCE4ZTJmi7Bl38QocgXKBIv9PltPlGc%3D";
const AZURE_BASE_URL = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}`;

// Upload file to Azure Blob Storage
export const uploadToAzureBlob = async (file: File): Promise<string> => {
  console.log('--------- AZURE BLOB UPLOAD START ---------');
  console.log('Uploading file to Azure Blob Storage:', file.name);
  
  try {
    // Create a unique blob name using timestamp and original filename
    const blobName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadUrl = `${AZURE_BASE_URL}/${blobName}${AZURE_SAS_TOKEN}`;
    
    console.log('Uploading to Azure URL:', uploadUrl);
    
    // Create headers for the upload
    const headers = {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type || 'application/octet-stream'
    };
    
    // Upload the file using PUT
    const response = await axios.put(uploadUrl, file, { headers });
    
    console.log('Azure upload response:', response.status, response.statusText);
    
    // Return the public URL (without SAS token for storage)
    const publicUrl = `${AZURE_BASE_URL}/${blobName}`;
    console.log('File uploaded successfully, public URL:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Azure Blob Storage:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Azure API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw new Error(`Failed to upload to Azure: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Upload multiple files to Azure Blob Storage and return an array of URLs
export const uploadFilesToAzure = async (files: File[]): Promise<string[]> => {
  console.log(`Uploading ${files.length} files to Azure Blob Storage`);
  
  const uploadPromises = files.map(file => uploadToAzureBlob(file));
  return Promise.all(uploadPromises);
};

// Updated attachment upload function to use Azure Blob Storage
export const uploadAttachment = async (file: File): Promise<any> => {
  console.log('--------- ATTACHMENT UPLOAD START ---------');
  console.log('Uploading attachment:', file.name, file.type, file.size);
  
  try {
    // Upload the file to Azure Blob Storage
    const azureUrl = await uploadToAzureBlob(file);
    
    // Generate attachment metadata (no need for AITable tokens anymore)
    const attachmentData = {
      id: `attachment_${Date.now()}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      url: azureUrl,
      // For images, try to get dimensions
      width: undefined,
      height: undefined
    };
    
    // If it's an image, try to get dimensions
    if (file.type.startsWith('image/')) {
      try {
        const dimensions = await getImageDimensions(file);
        attachmentData.width = dimensions.width;
        attachmentData.height = dimensions.height;
      } catch (err) {
        console.warn('Could not get image dimensions:', err);
      }
    }
    
    console.log('Attachment data prepared:', attachmentData);
    
    return attachmentData;
  } catch (error) {
    console.error('--------- ATTACHMENT UPLOAD ERROR ---------');
    console.error('Error uploading attachment:', error);
    
    // In development environment, if upload fails, fall back to mock implementation
    if (window.location.hostname === 'localhost') {
      console.warn('Using mock attachment as fallback due to API error');
      try {
        return await mockAttachmentUpload(file);
      } catch (mockError) {
        console.error('Error creating mock attachment:', mockError);
      }
    }
    
    throw new Error(`Failed to upload attachment: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper function to get image dimensions
const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(img.src); // Clean up
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
      URL.revokeObjectURL(img.src); // Clean up
    };
    img.src = URL.createObjectURL(file);
  });
};

export const addRecord = async (record: Record) => {
  // Check if we're online
  if (!isOnline()) {
    throw new Error('No internet connection. Cannot add record while offline.');
  }
  
  try {
    // Process attachments - AITable expects a specific format for the Attachment field
    // If record has attachments, format them correctly
    const processedRecord = { ...record };
    
    console.log('--------- RECORD CREATE START ---------');
    console.log('Original record:', JSON.stringify(record, null, 2));
    
    // Remove fields that can't be edited in AITable
    if (processedRecord.fields.Title !== undefined) {
      console.log('Removing auto-number Title field:', processedRecord.fields.Title);
      delete processedRecord.fields.Title;
    }
    
    // Also remove any other auto-generated fields
    if (processedRecord.fields['Created time'] !== undefined) {
      delete processedRecord.fields['Created time'];
    }
    
    if (processedRecord.fields['Last edited time'] !== undefined) {
      delete processedRecord.fields['Last edited time'];
    }
    
    if (processedRecord.fields.Attachment && processedRecord.fields.Attachment.length > 0) {
      console.log('Original attachments:', JSON.stringify(processedRecord.fields.Attachment, null, 2));
      
      // Format attachments for AITable API - only need to send token, name, and size
      processedRecord.fields.Attachment = processedRecord.fields.Attachment.map(attachment => {
        const formattedAttachment = {
          token: attachment.token,
          name: attachment.name,
          size: attachment.size
        };
        
        if (!attachment.token) {
          console.error('Missing token in attachment!', attachment);
        }
        
        return formattedAttachment;
      });
      
      console.log('Formatted attachments for API:', JSON.stringify(processedRecord.fields.Attachment, null, 2));
    }
    
    // If we have attachments in the upload UI, convert them to a JSON string in the Attachment URL field
    if (processedRecord.fields.attachmentUrls && Array.isArray(processedRecord.fields.attachmentUrls)) {
      console.log('Converting attachment URLs to JSON string:', processedRecord.fields.attachmentUrls);
      processedRecord.fields["Attachment URL"] = JSON.stringify(processedRecord.fields.attachmentUrls);
      // Remove the temp field
      delete processedRecord.fields.attachmentUrls;
    }
    
    // Remove legacy Attachment field if present
    if (processedRecord.fields.Attachment) {
      delete processedRecord.fields.Attachment;
    }
    
    console.log('Final record being sent to API:', JSON.stringify(processedRecord, null, 2));
    
    // Call API to add record
    console.log('Sending create request to /records endpoint');
    const response = await api.post<ApiResponse>(`/records?fieldKey=name`, {
      records: [processedRecord],
    });
    
    console.log('Create response status:', response.status);
    console.log('Create response:', JSON.stringify(response.data, null, 2));
    
    // If successful, update the cache with fresh data
    if (response.data.success) {
      console.log('Create successful, fetching fresh data to update cache');
      // Fetch fresh data to update cache
      const freshData = await api.get<ApiResponse>(`/records?fieldKey=name`);
      if (freshData.data.success) {
        saveToCache(freshData.data);
        console.log('Cache updated with fresh data');
      }
    } else {
      console.error('Create not successful:', response.data);
    }
    
    console.log('--------- RECORD CREATE COMPLETE ---------');
    return response.data;
  } catch (error) {
    console.error('--------- RECORD CREATE ERROR ---------');
    console.error('Error adding record:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data, null, 2)
      });
    }
    
    throw error;
  }
};

export const updateRecord = async (record: Record) => {
  // Check if we're online
  if (!isOnline()) {
    throw new Error('No internet connection. Cannot update record while offline.');
  }
  
  try {
    // Process attachments - AITable expects a specific format for the Attachment field
    // If record has attachments, format them correctly
    const processedRecord = { ...record };
    
    console.log('--------- RECORD UPDATE START ---------');
    console.log('Original record:', JSON.stringify(record, null, 2));
    
    // Remove fields that can't be edited in AITable
    if (processedRecord.fields.Title !== undefined) {
      console.log('Removing auto-number Title field:', processedRecord.fields.Title);
      delete processedRecord.fields.Title;
    }
    
    // Also remove any other auto-generated fields
    if (processedRecord.fields['Created time'] !== undefined) {
      delete processedRecord.fields['Created time'];
    }
    
    if (processedRecord.fields['Last edited time'] !== undefined) {
      delete processedRecord.fields['Last edited time'];
    }
    
    if (processedRecord.fields.Attachment && processedRecord.fields.Attachment.length > 0) {
      console.log('Original attachments:', JSON.stringify(processedRecord.fields.Attachment, null, 2));
      
      // Format attachments for AITable API - only need to send token, name, and size
      processedRecord.fields.Attachment = processedRecord.fields.Attachment.map(attachment => {
        const formattedAttachment = {
          token: attachment.token,
          name: attachment.name,
          size: attachment.size
        };
        
        if (!attachment.token) {
          console.error('Missing token in attachment!', attachment);
        }
        
        return formattedAttachment;
      });
      
      console.log('Formatted attachments for API:', JSON.stringify(processedRecord.fields.Attachment, null, 2));
    } else {
      console.log('No attachments in record');
    }
    
    // If we have attachments in the upload UI, convert them to a JSON string in the Attachment URL field
    if (processedRecord.fields.attachmentUrls && Array.isArray(processedRecord.fields.attachmentUrls)) {
      console.log('Converting attachment URLs to JSON string:', processedRecord.fields.attachmentUrls);
      processedRecord.fields["Attachment URL"] = JSON.stringify(processedRecord.fields.attachmentUrls);
      // Remove the temp field
      delete processedRecord.fields.attachmentUrls;
    }
    
    // Remove legacy Attachment field if present
    if (processedRecord.fields.Attachment) {
      delete processedRecord.fields.Attachment;
    }
    
    console.log('Final record being sent to API:', JSON.stringify(processedRecord, null, 2));
    
    // Call API to update record
    console.log('Sending update request to /records endpoint');
    const response = await api.patch<ApiResponse>(`/records?fieldKey=name`, {
      records: [processedRecord],
    });
    
    console.log('Update response status:', response.status);
    console.log('Update response:', JSON.stringify(response.data, null, 2));
    
    // If successful, update the cache with fresh data
    if (response.data.success) {
      console.log('Update successful, fetching fresh data to update cache');
      // Fetch fresh data to update cache
      const freshData = await api.get<ApiResponse>(`/records?fieldKey=name`);
      if (freshData.data.success) {
        saveToCache(freshData.data);
        console.log('Cache updated with fresh data');
      }
    } else {
      console.error('Update not successful:', response.data);
    }
    
    console.log('--------- RECORD UPDATE COMPLETE ---------');
    return response.data;
  } catch (error) {
    console.error('--------- RECORD UPDATE ERROR ---------');
    console.error('Error updating record:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data, null, 2)
      });
    }
    
    throw error;
  }
};

export const deleteRecord = async (recordId: string) => {
  // Check if we're online
  if (!isOnline()) {
    throw new Error('No internet connection. Cannot delete record while offline.');
  }
  
  try {
    // Call API to delete record
    const response = await api.delete(`/records?recordIds=${recordId}`);
    
    // If successful, update the cache with fresh data
    if (response.data.success) {
      // Fetch fresh data to update cache
      const freshData = await api.get<ApiResponse>(`/records?fieldKey=name`);
      if (freshData.data.success) {
        saveToCache(freshData.data);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting record:', error);
    throw error;
  }
};

// For development, provide a fallback for attachment uploads
const mockAttachmentUpload = async (file: File): Promise<any> => {
  console.log('Using mock attachment upload for development');
  
  return new Promise((resolve) => {
    // Create a FileReader to generate a data URL
    const reader = new FileReader();
    
    reader.onload = () => {
      // Generate a mock ID
      const mockId = 'mock_' + Math.random().toString(36).substring(2, 15);
      
      // Create a mock attachment object
      const mockAttachment = {
        id: mockId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        token: 'mock_token_' + mockId,
        url: reader.result as string,
        thumbnailUrl: file.type.startsWith('image/') ? reader.result as string : ''
      };
      
      console.log('Created mock attachment:', mockAttachment);
      resolve(mockAttachment);
    };
    
    // Read the file as a data URL (base64 encoded)
    reader.readAsDataURL(file);
  });
};