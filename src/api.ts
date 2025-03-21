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
    // Call API to add record
    const response = await api.post<ApiResponse>(`/records?fieldKey=name`, {
      records: [record],
    });
    
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
    console.error('Error adding record:', error);
    throw error;
  }
};

export const updateRecord = async (record: Record) => {
  // Check if we're online
  if (!isOnline()) {
    throw new Error('No internet connection. Cannot update record while offline.');
  }
  
  try {
    // Call API to update record
    const response = await api.patch<ApiResponse>(`/records?fieldKey=name`, {
      records: [record],
    });
    
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
    console.error('Error updating record:', error);
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

/**
 * Uploads a file to AITable and returns the attachment object
 * @param file File to upload
 * @returns Promise with attachment object that can be added to a record
 */
export const uploadAttachment = async (file: File): Promise<any> => {
  try {
    console.log('Starting file upload process for:', file.name, 'size:', file.size, 'type:', file.type);
    
    // First get the pre-signed URL for upload using the attachment API endpoint
    const preSignedUrlResponse = await axios.post(ATTACHMENT_API_URL, {
      name: file.name,
      size: file.size,
      mimeType: file.type
    }, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Pre-signed URL response:', preSignedUrlResponse.data);

    if (!preSignedUrlResponse.data.success) {
      throw new Error(`Failed to get pre-signed URL for upload: ${JSON.stringify(preSignedUrlResponse.data)}`);
    }

    // Extract necessary data from response
    const { url, token, id } = preSignedUrlResponse.data.data;
    
    // Create FormData object to upload file
    const formData = new FormData();
    formData.append('file', file);
    
    // Use axios directly to upload to the pre-signed URL
    console.log('Uploading to URL:', url);
    const uploadResponse = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('Upload response:', uploadResponse.data);

    // AITable might return different response structures
    // Check if the response contains the expected data
    if (uploadResponse.data && 
        (uploadResponse.data.success === false || 
         (typeof uploadResponse.data === 'object' && !uploadResponse.data.data?.url))) {
      throw new Error('Failed to upload file: ' + JSON.stringify(uploadResponse.data));
    }

    // Get the URL from different possible response formats
    let fileUrl = '';
    let thumbnailUrl = '';
    
    if (uploadResponse.data.data?.url) {
      fileUrl = uploadResponse.data.data.url;
      thumbnailUrl = uploadResponse.data.data.thumbnailUrl || '';
    } else if (uploadResponse.data.url) {
      fileUrl = uploadResponse.data.url;
      thumbnailUrl = uploadResponse.data.thumbnailUrl || '';
    } else if (typeof uploadResponse.data === 'string' && uploadResponse.data.startsWith('http')) {
      // Some APIs just return the URL as a string
      fileUrl = uploadResponse.data;
    }

    if (!fileUrl) {
      throw new Error('Failed to get file URL from response');
    }

    console.log('File upload successful. URL:', fileUrl);
    
    // Return the attachment object to be inserted into the record
    return {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      token: token,
      url: fileUrl,
      thumbnailUrl: thumbnailUrl
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};