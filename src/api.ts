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

/**
 * Uploads a file to AITable and returns the attachment object
 * @param file File to upload
 * @returns Promise with attachment object that can be added to a record
 */
export const uploadAttachment = async (file: File): Promise<any> => {
  try {
    console.log('--------- ATTACHMENT UPLOAD START ---------');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // Create FormData object to upload file
    const formData = new FormData();
    formData.append('file', file);
    
    // The correct endpoint from documentation - specific to this datasheet
    const attachmentUrl = 'https://aitable.ai/fusion/v1/datasheets/dstkzT6hfEtyEPTEn8/attachments';
    console.log('Upload URL:', attachmentUrl);
    console.log('FormData entries:', Array.from(formData.entries()).map(entry => {
      if (entry[1] instanceof File) {
        return [entry[0], `File: ${(entry[1] as File).name}`];
      }
      return entry;
    }));
    
    // Upload the file - explicitly setting Content-Type to undefined lets browser set the correct multipart boundary
    console.log('Sending request with authorization token length:', API_TOKEN.length);
    const uploadResponse = await axios.post(attachmentUrl, formData, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': undefined // Let browser set the correct multipart/form-data with boundary
      }
    });
    
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response data:', JSON.stringify(uploadResponse.data, null, 2));
    
    if (!uploadResponse.data.success) {
      console.error('Upload unsuccessful despite 200 status:', uploadResponse.data);
      throw new Error('Upload failed: ' + JSON.stringify(uploadResponse.data));
    }
    
    const attachmentData = uploadResponse.data.data;
    console.log('Attachment data received:', JSON.stringify(attachmentData, null, 2));
    
    // Return the attachment object properly formatted for AITable attachment fields
    // Note: AITable expects a specific format for attachments in records
    const formattedAttachment = {
      id: attachmentData.id || `attachment_${Date.now()}`, // Generate an ID if none provided
      name: attachmentData.name,
      size: attachmentData.size,
      mimeType: attachmentData.mimeType,
      token: attachmentData.token,
      url: attachmentData.url,
      width: attachmentData.width,
      height: attachmentData.height,
      thumbnailUrl: attachmentData.preview || attachmentData.url
    };
    
    console.log('Formatted attachment for UI:', JSON.stringify(formattedAttachment, null, 2));
    console.log('--------- ATTACHMENT UPLOAD COMPLETE ---------');
    
    return formattedAttachment;
  } catch (error) {
    console.error('--------- ATTACHMENT UPLOAD ERROR ---------');
    console.error('Error uploading attachment:', error);
    
    // Provide more detailed error information when available
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data, null, 2)
      });
    }
    
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