import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, PhoneCall, Lock, Eye, LogOut, User, Search, BarChart, RefreshCw, Wifi, WifiOff, Paperclip, ExternalLink, Image as ImageIcon, FileText, File as FileIcon, Maximize2 } from 'lucide-react';
import { Record, Field, AttachmentField as BaseAttachmentField } from './types';
import { getRecords, addRecord, updateRecord, deleteRecord } from './api';
import { RecordForm } from './components/RecordForm';
import { SaudiRiyalSymbol } from './components/SaudiRiyalSymbol';
import ExpenseCharts from './components/ExpenseCharts';
import { YearlySummarySkeleton, RecordsListSkeleton, FilterControlsSkeleton } from './components/SkeletonLoaders';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Extend the AttachmentField type to include fullSizeUrl
interface AttachmentField extends BaseAttachmentField {
  fullSizeUrl?: string;
}

// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT = "sultaneng";
const AZURE_CONTAINER = "sultangengwebsite";
const AZURE_SAS_TOKEN = "?sv=2023-01-03&st=2025-03-21T11%3A53%3A56Z&se=2025-04-22T11%3A53%3A00Z&sr=c&sp=racwdxltf&sig=O4LWckRIsuxZaCE4ZTJmi7Bl38QocgXKBIv9PltPlGc%3D";
const AZURE_BASE_URL = `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_CONTAINER}`;

// List of authorized users with their phone numbers and names
const AUTHORIZED_USERS = [
  { name: 'جابر معيوض', phone: '0565983017' },
  { name: 'نايف محمد', phone: '0554472615' },
  { name: 'منصور جابر', phone: '0562244965' },
  { name: 'ابراهيم معيوض', phone: '0565117007' },
  { name: 'عبدالرحمن معيوض', phone: '0564166761' }
];

// Authorized phone numbers (extracted for easy lookup)
const AUTHORIZED_PHONES = AUTHORIZED_USERS.map(user => user.phone);

// Local storage keys
const STORAGE_KEY_PHONE = 'expenses_app_phone';

const AttachmentsList = ({ attachments, isOpen, onClose }: { attachments?: AttachmentField[] | null, isOpen: boolean, onClose: () => void }) => {
  const [selectedImage, setSelectedImage] = useState<AttachmentField | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  // Track which images have failed loading with their final fallback status
  const [imageLoadFailed, setImageLoadFailed] = useState<{[key: string]: boolean}>({});
  // Track blob URLs for images we've successfully loaded
  const [blobUrls, setBlobUrls] = useState<{[key: string]: string}>({});
  // Track which images have attempted fallback options
  const [fallbackAttempted, setFallbackAttempted] = useState<{[key: string]: boolean}>({});
  
  // Maximum number of load attempts per image to prevent infinite loops
  const MAX_LOAD_ATTEMPTS = 1;
  
  // Cleanup blob URLs on component unmount
  useEffect(() => {
    return () => {
      // Revoke any blob URLs to prevent memory leaks
      Object.values(blobUrls).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [blobUrls]);
  
  // Reset states when attachments change
  useEffect(() => {
    console.log('AttachmentsList: Rendering with attachments:', attachments);
    
    // Reset the failed states when attachments change
    setImageLoadFailed({});
    setFallbackAttempted({});
  }, [attachments]);
  
  if (!isOpen || !attachments || attachments.length === 0) return null;

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-indigo-500" />;
    } else if (mimeType.startsWith('application/pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else {
      return <FileIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format file size for display
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Generate a placeholder image based on the file type
  const getPlaceholderImage = (attachment: AttachmentField): string => {
    const fileType = attachment.mimeType?.split('/')[0] || 'unknown';
    
    if (fileType === 'image') {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg==';
    } else if (fileType === 'application' && attachment.mimeType?.includes('pdf')) {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmODU5NWIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1maWxlLXRleHQiPjxwYXRoIGQ9Ik0xNCAyYTIgMiAwIDAgMSAyIDJ2MTZhMiAyIDAgMCAxLTIgMkg2YTIgMiAwIDAgMS0yLTJWNGEyIDIgMCAwIDEgMi0yeiIvPjxwYXRoIGQ9Ik0xNCA2SDZNMTQgMThINk0xNCAxNEg2TTggMTBoNC4ybDEuNC0xLjQiLz48L3N2Zz4=';
    } else {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM1NTU1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1maWxlIj48cGF0aCBkPSJNMTYgMkg4YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmg4YTIgMiAwIDAgMCAyLTJWNGEyIDIgMCAwIDAtMi0yeiIvPjxyZWN0IHg9IjgiIHk9IjIiIHdpZHRoPSI4IiBoZWlnaHQ9IjQiIHJ4PSIxIiByeT0iMSIvPjwvc3ZnPg==';
    }
  };

  // Convert AITable URL to Azure Blob URL
  const getAzureBlobUrl = (originalUrl: string): string => {
    if (!originalUrl) return '';
    
    try {
      // If it's already an Azure URL, check if it needs a SAS token
      if (originalUrl.includes(AZURE_STORAGE_ACCOUNT)) {
        const hasSasToken = originalUrl.includes('sv=') || 
                           originalUrl.includes('sig=') || 
                           originalUrl.includes(AZURE_SAS_TOKEN);
        
        if (!hasSasToken && originalUrl.includes(AZURE_CONTAINER)) {
          return `${originalUrl}${AZURE_SAS_TOKEN}`;
        }
        return originalUrl;
      }
      
      // Extract the file name from the original URL
      // This assumes AITable URLs end with the file name
      const urlParts = originalUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (!fileName || fileName === '') {
        console.error('Could not extract filename from URL:', originalUrl);
        return originalUrl;
      }
      
      // Remove any query parameters from the filename
      const cleanFileName = fileName.split('?')[0];
      
      // Construct Azure URL with SAS token
      const azureUrl = `${AZURE_BASE_URL}/${cleanFileName}${AZURE_SAS_TOKEN}`;
      console.log(`Converted URL ${originalUrl} to Azure URL: ${azureUrl}`);
      
      return azureUrl;
    } catch (error) {
      console.error('Error converting to Azure URL:', error);
      return originalUrl;
    }
  };

  // Get image URL with fallback logic
  const getSafeImageUrl = (attachment: AttachmentField): string => {
    const id = attachment.id;
    
    // If we already have a blob URL, use it
    if (blobUrls[id]) {
      return blobUrls[id];
    }
    
    // If this image has already failed and we've tried fallbacks, use placeholder
    if (imageLoadFailed[id] && fallbackAttempted[id]) {
      return getPlaceholderImage(attachment);
    }
    
    if (!attachment.url) {
      return getPlaceholderImage(attachment);
    }
    
    // Check if the URL already includes the SAS token
    const hasSasToken = attachment.url.includes(AZURE_SAS_TOKEN) || 
                        attachment.url.includes('sv=') || 
                        attachment.url.includes('sig=');
    
    // If URL is an Azure Blob URL
    if (attachment.url.includes(AZURE_STORAGE_ACCOUNT)) {
      // Add SAS token if needed
      if (!hasSasToken && attachment.url.includes(AZURE_CONTAINER)) {
        return `${attachment.url}${AZURE_SAS_TOKEN}`;
      }
      return attachment.url;
    }
    
    // If this is first attempt or the image failed but we haven't tried fallbacks yet,
    // try with Azure URL
    if (!imageLoadFailed[id] || !fallbackAttempted[id]) {
      if (imageLoadFailed[id]) {
        // Mark that we've attempted fallback
        setFallbackAttempted(prev => ({
          ...prev,
          [id]: true
        }));
      }
      
      // Try Azure URL with SAS token
      return getAzureBlobUrl(attachment.url);
    }
    
    // Fallback to original URL if all else fails
    return attachment.url;
  };

  // Handle image selection
  const handleImageSelect = (attachment: AttachmentField) => {
    console.log('Selected image:', attachment);
    setSelectedImage(attachment);
    setIsImageLoading(true);
    
    // Pre-process the URL for the full-size view
    if (attachment.url) {
      // If it's an Azure URL without SAS token, add it
      if (attachment.url.includes(AZURE_STORAGE_ACCOUNT) && 
          !attachment.url.includes('sv=') && 
          !attachment.url.includes('sig=')) {
        attachment.fullSizeUrl = `${attachment.url}${AZURE_SAS_TOKEN}`;
      } else if (!attachment.url.includes(AZURE_STORAGE_ACCOUNT)) {
        // If it's not an Azure URL, convert it
        attachment.fullSizeUrl = getAzureBlobUrl(attachment.url);
      } else {
        // Already has SAS token or is a different URL
        attachment.fullSizeUrl = attachment.url;
      }
    }
  };

  // Filter images for gallery view
  const imageAttachments = attachments.filter(a => a.mimeType?.startsWith('image/'));
  const documentAttachments = attachments.filter(a => !a.mimeType?.startsWith('image/'));
  
  console.log('AttachmentsList: Image attachments:', imageAttachments);
  console.log('AttachmentsList: Document attachments:', documentAttachments);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">المرفقات ({attachments.length})</h3>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Image gallery section */}
          {imageAttachments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">الصور ({imageAttachments.length})</h4>
              <div className="grid grid-cols-3 gap-3">
                {imageAttachments.map(attachment => {
                  const imageUrl = getSafeImageUrl(attachment);
                  
                  return (
                    <div 
                      key={attachment.id || `img-${attachment.name}-${Date.now()}`} 
                      className="aspect-square rounded border border-gray-200 bg-gray-100 overflow-hidden cursor-pointer relative group shadow hover:shadow-md transition-shadow"
                      onClick={() => handleImageSelect(attachment)}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <img 
                          src={imageUrl} 
                          alt={attachment.name}
                          className="max-w-full max-h-full object-contain"
                          onLoad={() => {
                            console.log('Image thumbnail loaded successfully:', attachment.name, 'URL:', imageUrl);
                            
                            // If this was using a fallback URL and it loaded successfully,
                            // store it in blobUrls for future use
                            if (fallbackAttempted[attachment.id] && !blobUrls[attachment.id]) {
                              setBlobUrls(prev => ({
                                ...prev,
                                [attachment.id]: imageUrl
                              }));
                            }
                            
                            // Reset the failed state if it was previously marked as failed
                            if (imageLoadFailed[attachment.id]) {
                              setImageLoadFailed(prev => ({
                                ...prev,
                                [attachment.id]: false
                              }));
                            }
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.error('Error loading thumbnail:', attachment.name, e);
                            
                            // Prevent further error events
                            target.onerror = null;
                            
                            // Mark this image as failed
                            setImageLoadFailed(prev => ({
                              ...prev,
                              [attachment.id]: true
                            }));
                            
                            // Set to placeholder directly to stop errors
                            target.src = getPlaceholderImage(attachment);
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Document attachments section */}
          {documentAttachments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">المستندات ({documentAttachments.length})</h4>
              <div className="space-y-2">
                {documentAttachments.map(attachment => {
                  // For documents, use the direct URL without proxies
                  return (
                    <a 
                      key={attachment.id || `doc-${attachment.name}-${Date.now()}`} 
                      href={attachment.url}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      {getFileIcon(attachment.mimeType)}
                      <div className="mr-3 overflow-hidden flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{attachment.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Image preview modal with loading state */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]" 
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative w-full h-full flex flex-col items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 bg-gray-800 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all z-20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Image container */}
            <div className="relative flex items-center justify-center w-full h-full">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                </div>
              )}
              
              <img 
                src={selectedImage.fullSizeUrl || selectedImage.url} 
                alt={selectedImage.name} 
                style={{ maxHeight: '80vh', maxWidth: '90vw' }}
                className="rounded-lg shadow-2xl object-contain"
                onLoad={() => {
                  console.log('Full-size image loaded successfully:', selectedImage.name);
                  setIsImageLoading(false);
                }}
                onError={(e) => {
                  console.error('Error loading full-size image:', selectedImage.name);
                  setIsImageLoading(false);
                  
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  
                  // Try direct URL as fallback for the full-size view
                  if (target.src !== selectedImage.url) {
                    target.src = selectedImage.url;
                  } else {
                    // Use placeholder as last resort
                    target.src = getPlaceholderImage(selectedImage);
                  }
                }}
              />
            </div>
            
            {/* Image info */}
            <div className="text-white mt-6 text-center max-w-2xl">
              <h3 className="text-lg font-medium mb-1">{selectedImage.name}</h3>
              <p className="text-gray-400 text-sm">
                {formatFileSize(selectedImage.size)}
                {selectedImage.width && selectedImage.height && (
                  <span> • {selectedImage.width}×{selectedImage.height}px</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Section-specific loading states
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [isFiltersLoading, setIsFiltersLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<AttachmentField[] | null>(null);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [userName, setUserName] = useState('');
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // State for charts visibility
  const [showCharts, setShowCharts] = useState(false);
  
  // Cache-related states
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);
  const [isFetchingFreshData, setIsFetchingFreshData] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Form submission state
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for cached phone number on initial load
  useEffect(() => {
    const cachedPhone = localStorage.getItem(STORAGE_KEY_PHONE);
    if (cachedPhone) {
      setPhoneNumber(cachedPhone);
      // Validate if phone is in authorized list
      if (AUTHORIZED_PHONES.includes(cachedPhone)) {
        const user = AUTHORIZED_USERS.find(user => user.phone === cachedPhone);
        setUserName(user ? user.name : '');
        setIsAuthenticated(true);
        setIsReadOnly(false);
      } else {
        setIsAuthenticated(true);
        setIsReadOnly(true);
      }
    }
  }, []);

  const fetchRecords = async (forceRefresh = false) => {
    try {
      // Set section-specific loading states instead of full page loading
      setIsSummaryLoading(true);
      setIsRecordsLoading(true);
      setIsFiltersLoading(true);
      
      if (forceRefresh) {
        setIsFetchingFreshData(true);
      }
      
      const response = await getRecords(forceRefresh);
      
      // Check if data is from cache and set timestamp
      if (response.message && response.message.includes('cache')) {
        // Use current time if we can't find a timestamp in the data
        const now = new Date();
        
        // Try to get a timestamp from a record if available
        if (response.data.records && response.data.records.length > 0) {
          // Use any available timestamp data
          const record = response.data.records[0];
          const timestamp = record.fields["Last edited time"] || now.toISOString();
          setCacheTimestamp(new Date(timestamp));
        } else {
          setCacheTimestamp(now);
        }
      } else {
        setCacheTimestamp(new Date());
      }
      
      // Update fields metadata if available
      if (response.data.fields) {
        setFields(response.data.fields);
      }
      
      // Filter out test records and ensure required fields
      const validRecords = response.data.records
        ?.filter(record => {
          // Skip records that explicitly have "test" as the Item
          return !record.fields.Item || record.fields.Item.toLowerCase() !== 'test';
        })
        .map(record => {
          // Ensure all required fields have values
          const fields = record.fields;
          
          // Use Title as Item if Item is missing
          if (!fields.Item) {
            fields.Item = `عنصر ${fields.Title || 'غير معروف'}`;
          }
          
          // Ensure EidYear has a value
          if (!fields.EidYear) {
            fields.EidYear = "N/A";
          }
          
          // Ensure Category and Arabic Category are synchronized
          if (fields.Category && !fields["Arabic Category"]) {
            // Map English category to Arabic if needed
            const categoryMapping: { [key: string]: string } = {
              'Food & Beverages': 'المأكولات والمشروبات',
              'Services & Labor': 'الخدمات والعمالة',
              'Party & Event Supplies': 'مستلزمات الحفلات والفعاليات',
              'Utilities & Cleaning': 'المرافق والتنظيف',
              'Equipment & Miscellaneous': 'المعدات والمتفرقات',
              'Ambience & Fragrances': 'الأجواء والعطور',
            };
            fields["Arabic Category"] = categoryMapping[fields.Category] || 'غير مصنف';
          } else if (fields["Arabic Category"] && !fields.Category) {
            // Try to reverse map from Arabic to English
            const reverseCategoryMapping: { [key: string]: string } = {
              'المأكولات والمشروبات': 'Food & Beverages',
              'الخدمات والعمالة': 'Services & Labor',
              'مستلزمات الحفلات والفعاليات': 'Party & Event Supplies',
              'المرافق والتنظيف': 'Utilities & Cleaning',
              'المعدات والمتفرقات': 'Equipment & Miscellaneous',
              'الأجواء والعطور': 'Ambience & Fragrances',
            };
            fields.Category = reverseCategoryMapping[fields["Arabic Category"]] || 'Uncategorized';
          } else if (!fields.Category && !fields["Arabic Category"]) {
            // Neither category exists
            fields.Category = 'Uncategorized';
            fields["Arabic Category"] = 'غير مصنف';
          }
          
          // Ensure cost is calculated if missing
          if (!fields.Cost && fields.Quantity && fields.UnitPrice) {
            fields.Cost = fields.Quantity * fields.UnitPrice;
          }
          
          // Ensure Unit has a value
          if (!fields.Unit) {
            fields.Unit = 'حبة';
          }
          
          return record;
        }) || [];
      
      setRecords(validRecords);
      setError(null); // Clear any previous errors
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'فشل في جلب السجلات');
      } else {
        setError('فشل في جلب السجلات');
      }
    } finally {
      // Clear all loading states with a slight delay to avoid abrupt transitions
      setTimeout(() => {
        setIsLoading(false);
        setIsSummaryLoading(false);
        setIsFiltersLoading(false);
        setIsRecordsLoading(false);
        setIsFetchingFreshData(false);
      }, 500);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords(false); // Don't force refresh on initial load
    }
  }, [isAuthenticated]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number format (simple validation)
    if (!/^05\d{8}$/.test(phoneNumber)) {
      setPhoneError('يرجى إدخال رقم هاتف صحيح يبدأ ب 05 ويتكون من 10 أرقام');
      return;
    }
    
    // Cache phone number in localStorage
    localStorage.setItem(STORAGE_KEY_PHONE, phoneNumber);
    
    // Check if phone is in authorized list
    if (AUTHORIZED_PHONES.includes(phoneNumber)) {
      const user = AUTHORIZED_USERS.find(user => user.phone === phoneNumber);
      setUserName(user ? user.name : '');
      setIsAuthenticated(true);
      setIsReadOnly(false);
    } else {
      // Allow access but in read-only mode
      setUserName('');
      setIsAuthenticated(true);
      setIsReadOnly(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_PHONE);
    setIsAuthenticated(false);
    setIsReadOnly(false);
    setPhoneNumber('');
    setUserName('');
    setRecords([]);
  };

  const handleAddRecord = async (fields: Record['fields']) => {
    if (isReadOnly) return;
    
    try {
      setIsFormSubmitting(true);
      setIsRecordsLoading(true); // Show records loading only
      await addRecord({ fields });
      await fetchRecords(true); // Force refresh after adding
      setIsFormOpen(false);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'فشل في إضافة السجل');
      } else {
        setError('فشل في إضافة السجل');
      }
    } finally {
      setIsFormSubmitting(false);
      // We don't need to clear isRecordsLoading here as fetchRecords will do it
    }
  };

  const handleUpdateRecord = async (fields: Record['fields']) => {
    if (isReadOnly || !editingRecord?.recordId) return;
    
    // Prevent editing records from year 1445
    if (editingRecord.fields.EidYear === '1445') {
      setError('لا يمكن تعديل سجلات العام 1445');
      return;
    }
    
    try {
      setIsFormSubmitting(true);
      setIsRecordsLoading(true); // Show records loading only
      await updateRecord({ recordId: editingRecord.recordId, fields });
      await fetchRecords(true); // Force refresh after updating
      setEditingRecord(null);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'فشل في تحديث السجل');
      } else {
        setError('فشل في تحديث السجل');
      }
    } finally {
      setIsFormSubmitting(false);
      // We don't need to clear isRecordsLoading here as fetchRecords will do it
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (isReadOnly) return;
    
    // Find the record to check its year
    const recordToCheck = records.find(record => record.recordId === recordId);
    
    // Prevent deleting records from year 1445
    if (recordToCheck && recordToCheck.fields.EidYear === '1445') {
      setError('لا يمكن حذف سجلات العام 1445');
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      return;
    }
    
    // Check if the record has attachments
    const hasAttachments = recordToCheck?.fields["Attachment URL"] ? true : false;
    
    try {
      setIsFormSubmitting(true);
      setIsRecordsLoading(true); // Show records loading only
      
      // If the record has attachments, show a message indicating we're deleting them too
      if (hasAttachments) {
        setError('جاري حذف السجل والمرفقات المرتبطة به...');
      } else {
        setError('جاري حذف السجل...');
      }
      
      await deleteRecord(recordId);
      
      await fetchRecords(true); // Force refresh after deleting
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      
      // Show a success message
      if (hasAttachments) {
        setError('تم حذف السجل والمرفقات بنجاح');
      } else {
        setError(null); // Clear error message for records without attachments
      }
      
      // Clear the success message after 3 seconds
      if (hasAttachments) {
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error during record deletion:', err);
        // Extract a more user-friendly message from the error
        if (err.message.includes('404')) {
          setError('فشل في حذف السجل: السجل غير موجود أو تم حذفه بالفعل');
        } else if (err.message.includes('network') || err.message.includes('internet')) {
          setError('فشل في حذف السجل: يرجى التحقق من اتصالك بالإنترنت');
        } else {
          setError(err.message || 'فشل في حذف السجل');
        }
      } else {
        setError('فشل في حذف السجل');
      }
    } finally {
      setIsFormSubmitting(false);
      // We don't need to clear isRecordsLoading here as fetchRecords will do it
    }
  };

  const confirmDelete = (recordId: string) => {
    if (isReadOnly) return;
    
    // Find the record to check its year
    const recordToCheck = records.find(record => record.recordId === recordId);
    
    // Prevent deleting records from year 1445
    if (recordToCheck && recordToCheck.fields.EidYear === '1445') {
      setError('لا يمكن حذف سجلات العام 1445');
      return;
    }
    
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  // Calculate yearly totals and count records per year
  const yearlyStats = records.reduce((acc, record) => {
    const year = record.fields.EidYear;
    if (!acc[year]) {
      acc[year] = { total: 0, count: 0 };
    }
    acc[year].total += record.fields.Cost || 0;
    acc[year].count += 1;
    return acc;
  }, {} as { [key: string]: { total: number, count: number } });

  // Calculate percentage change between 1446 and 1445
  const calculateYearlyComparison = () => {
    const year1446 = yearlyStats['1446']?.total || 0;
    const year1445 = yearlyStats['1445']?.total || 0;
    
    if (year1446 && year1445) {
      const percentageChange = ((year1446 - year1445) / year1445) * 100;
      return {
        percentageChange,
        isIncrease: percentageChange > 0
      };
    }
    return null;
  };
  
  const yearlyComparison = calculateYearlyComparison();

  // Sort years in descending order
  const sortedYears = Object.keys(yearlyStats).sort((a, b) => {
    // Handle non-numeric years (like "N/A")
    const yearA = isNaN(parseInt(a)) ? -1 : parseInt(a);
    const yearB = isNaN(parseInt(b)) ? -1 : parseInt(b);
    return yearB - yearA;
  });

  // Get all unique categories from records
  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    records.forEach(record => {
      const category = record.fields["Arabic Category"] || record.fields.Category || 'غير مصنف';
      categorySet.add(category);
    });
    return Array.from(categorySet).sort();
  }, [records]);

  // Filter records based on category and search
  const filteredRecords = React.useMemo(() => {
    return records.filter(record => {
      const category = record.fields["Arabic Category"] || record.fields.Category || 'غير مصنف';
      const matchesCategory = !selectedCategory || category === selectedCategory;
      
      // Search in item name
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        record.fields.Item.toLowerCase().includes(searchLower);
      
      return matchesCategory && matchesSearch;
    });
  }, [records, selectedCategory, searchQuery]);

  // Group filtered records by Item and sort by year
  const groupedRecords = React.useMemo(() => {
    return filteredRecords.reduce((acc, record) => {
      const item = record.fields.Item;
      if (!acc[item]) {
        acc[item] = [];
      }
      acc[item].push(record);
      return acc;
    }, {} as { [key: string]: Record[] });
  }, [filteredRecords]);

  // Sort items by most recent year first
  const sortedItems = React.useMemo(() => {
    return Object.entries(groupedRecords).sort(([, recordsA], [, recordsB]) => {
      const maxYearA = Math.max(...recordsA.map(r => parseInt(r.fields.EidYear)));
      const maxYearB = Math.max(...recordsB.map(r => parseInt(r.fields.EidYear)));
      return maxYearB - maxYearA;
    });
  }, [groupedRecords]);

  // Get all unique items from records
  const uniqueItems = React.useMemo(() => {
    const itemSet = new Set<string>();
    records.forEach(record => {
      const item = record.fields.Item?.trim();
      if (item && item.toLowerCase() !== 'test') {
        itemSet.add(item);
      }
    });
    return Array.from(itemSet).sort();
  }, [records]);

  // Get all unique units from records
  const uniqueUnits = React.useMemo(() => {
    const unitSet = new Set<string>();
    // Default units to ensure we always have common ones
    ['حبة', 'كيلو', 'كرتون', 'علبة'].forEach(unit => unitSet.add(unit));
    
    records.forEach(record => {
      const unit = record.fields.Unit?.trim();
      if (unit) {
        unitSet.add(unit);
      }
    });
    return Array.from(unitSet).sort();
  }, [records]);

  // Manual refresh function
  const handleManualRefresh = () => {
    // Prevent multiple fetches
    if (isFetchingFreshData) return;
    
    // Set loading states
    setIsSummaryLoading(true);
    setIsRecordsLoading(true);
    setIsFiltersLoading(true);
    
    // Force refresh data
    fetchRecords(true);
  };

  // Function to validate attachments before displaying them
  const validateAndShowAttachments = (record?: Record) => {
    console.log('Validating attachments for record:', record);
    
    let attachments: AttachmentField[] = [];
    
    // Check if we have the Attachment URL field
    if (record?.fields["Attachment URL"]) {
      try {
        // Try to parse the Attachment URL field as JSON
        const urlString = record.fields["Attachment URL"];
        
        // Check if it's already an array or a JSON string
        let urls: string[] = [];
        if (typeof urlString === 'string') {
          if (urlString.startsWith('[') && urlString.endsWith(']')) {
            // It's a JSON array string
            urls = JSON.parse(urlString);
          } else {
            // It's a single URL
            urls = [urlString];
          }
        } else if (Array.isArray(urlString)) {
          urls = urlString;
        }
        
        // Create attachment objects from URLs
        attachments = urls.map((url, index) => {
          // Try to extract file name from URL
          const fileName = url.split('/').pop()?.split('?')[0] || `file-${index + 1}`;
          
          // Try to determine mime type from file extension
          let mimeType = 'application/octet-stream';
          if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
            mimeType = 'image/' + fileName.split('.').pop()?.toLowerCase();
          } else if (fileName.match(/\.(pdf)$/i)) {
            mimeType = 'application/pdf';
          } else if (fileName.match(/\.(doc|docx)$/i)) {
            mimeType = 'application/msword';
          } else if (fileName.match(/\.(xls|xlsx)$/i)) {
            mimeType = 'application/vnd.ms-excel';
          }
          
          // Extract token from URL or create one based on URL
          // AITable tokens are typically the path portion of the URL after the domain
          let token = '';
          try {
            // Extract path portion from URL (excluding domain and query params)
            const urlObj = new URL(url);
            token = urlObj.pathname.replace(/^\//, ''); // Remove leading slash
            if (!token) {
              token = `attachment-token-${index}-${Date.now()}`;
            }
          } catch (e) {
            // If URL parsing fails, create a token based on the URL string
            token = url.replace(/^https?:\/\/[^\/]+\//, '') || `attachment-token-${index}-${Date.now()}`;
          }
          
          // If it's an Azure URL, add SAS token if missing
          let fullUrl = url;
          if (url.includes(AZURE_STORAGE_ACCOUNT) && 
              !url.includes('sv=') && 
              !url.includes('sig=')) {
            fullUrl = `${url}${AZURE_SAS_TOKEN}`;
          }
          
          return {
            id: `attachment-${index}-${Date.now()}`,
            name: fileName,
            url: fullUrl,
            mimeType: mimeType,
            size: 0, // We don't know the size from just the URL
            token: token
          };
        });
        
        console.log('Parsed attachments from Attachment URL:', attachments);
      } catch (error) {
        console.error('Error parsing Attachment URL:', error);
      }
    }
    
    if (attachments.length === 0) {
      console.error('No attachments found for record');
      return;
    }
    
    // Log the structure of each attachment for debugging
    attachments.forEach((att, index) => {
      console.log(`Attachment ${index + 1}:`, {
        id: att.id,
        name: att.name,
        url: att.url,
        thumbnailUrl: att.thumbnailUrl,
        mimeType: att.mimeType,
        size: att.size
      });
    });
    
    // Filter out any invalid attachment objects that don't have required properties
    const validAttachments = attachments.filter(att => 
      att && typeof att === 'object' && att.url && att.name
    );
    
    if (validAttachments.length === 0) {
      console.error('No valid attachments found in:', attachments);
      return;
    }
    
    console.log('Valid attachments:', validAttachments);
    setSelectedAttachments(validAttachments);
    setIsAttachmentsDialogOpen(true);
  };

  // Phone Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <PhoneCall className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل الدخول</h1>
            <p className="text-gray-600">يرجى إدخال رقم الهاتف للوصول إلى النظام</p>
          </div>
          
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                id="phone"
                placeholder="05xxxxxxxx"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError(''); // Clear error when typing
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm py-3 px-4 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                dir="ltr"
              />
              {phoneError && (
                <p className="mt-2 text-sm text-red-600">
                  {phoneError}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Only show the full page loading spinner on initial load
  if (isLoading && !records.length) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 relative pb-16">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سجلات المصروفات</h1>
            {userName && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <User className="w-4 h-4 ml-1" />
                <span>{userName}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={handleManualRefresh}
              className={`flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-md hover:bg-green-600 ${(isFetchingFreshData || isOffline) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isFetchingFreshData || isOffline}
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingFreshData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-md hover:bg-red-600"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Network status indicator */}
        {isOffline && (
          <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-md flex items-center">
            <WifiOff className="w-5 h-5 text-amber-500 mr-2 shrink-0" />
            <p className="text-sm text-amber-700">
              أنت حالياً في وضع عدم الاتصال. سيتم استخدام البيانات المخزنة مسبقاً.
            </p>
          </div>
        )}

        {isReadOnly && (
          <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-md flex items-center">
            <Eye className="w-5 h-5 text-amber-500 mr-2 shrink-0" />
            <p className="text-sm text-amber-700">
              أنت في وضع القراءة فقط. لا يمكنك إضافة أو تعديل أو حذف السجلات.
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        {isFiltersLoading ? (
          <FilterControlsSkeleton />
        ) : (
          <div className="mb-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <div className="relative">
                <input
                  id="search-items"
                  type="text"
                  placeholder="ابحث عن عنصر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm py-2 pr-10 pl-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Category Filter - Tab style */}
            <div>
              <div className="relative">
                <style dangerouslySetInnerHTML={{ 
                  __html: `
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    .no-scrollbar {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `
                }} />
                <div className="overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex space-x-2 rtl:space-x-reverse py-1 px-0.5">
                    <button
                      className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium transition-colors ${
                        !selectedCategory
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedCategory(null)}
                    >
                      الكل
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gradient fades for scroll indication */}
                <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            {/* Show filter status if any filter is active */}
            {(selectedCategory || searchQuery) && (
              <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-md">
                <span className="text-sm text-blue-700">
                  {filteredRecords.length.toLocaleString('ar-SA')} عنصر {filteredRecords.length !== records.length && `(من أصل ${records.length.toLocaleString('ar-SA')})`}
                </span>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className="text-xs text-blue-700 hover:text-blue-900 underline"
                >
                  مسح التصفية
                </button>
              </div>
            )}
          </div>
        )}

        {/* Yearly Totals */}
        {isSummaryLoading ? (
          <YearlySummarySkeleton />
        ) : (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">إجمالي المصروفات حسب السنة</h2>
            <div className="grid grid-cols-2 gap-4">
              {sortedYears.map(year => (
                <div key={year} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">
                    سنة {isNaN(parseInt(year)) ? year : parseInt(year).toLocaleString('ar-SA')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-end">
                    <span className="mx-1">{yearlyStats[year].total.toLocaleString('ar-SA')}</span>
                    <SaudiRiyalSymbol size={16} className="text-gray-700" />
                  </div>
                  <div className="text-xs text-gray-500">
                    ({yearlyStats[year].count.toLocaleString('ar-SA')} سجل)
                  </div>
                  {year === '1446' && (
                    <>
                      {/* Budget progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-600">الميزانية: 17,970.60 ريال</span>
                          <span className={`font-medium ${yearlyStats[year].total > 17970.60 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.min(100, Math.round((yearlyStats[year].total / 17970.60) * 100))}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${yearlyStats[year].total > 17970.60 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, (yearlyStats[year].total / 17970.60) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-1 text-right">
                          {yearlyStats[year].total > 17970.60 ? (
                            <span className="text-red-600">تجاوز الميزانية بمقدار {(yearlyStats[year].total - 17970.60).toLocaleString('ar-SA')} ريال</span>
                          ) : (
                            <span className="text-green-600">متبقي {(17970.60 - yearlyStats[year].total).toLocaleString('ar-SA')} ريال</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {year === '1446' && yearlyComparison && (
                    <div className={`text-xs mt-1 text-right ${yearlyComparison.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                      {yearlyComparison.isIncrease ? '▲' : '▼'} {parseFloat(Math.abs(yearlyComparison.percentageChange).toFixed(1)).toLocaleString('ar-SA')}% مقارنة بعام ١٤٤٥
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Toggle charts button */}
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="mt-4 flex items-center justify-center w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              <BarChart className="w-4 h-4 ml-2" />
              <span>{showCharts ? 'إخفاء مقارنة الفئات' : 'عرض مقارنة الفئات بين ١٤٤٥ و١٤٤٦'}</span>
            </button>

            {/* Charts section */}
            {showCharts && (
              <div className="mt-4">
                <ExpenseCharts 
                  records={records}
                  yearlyStats={yearlyStats}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Floating Add Button - only show if not in read-only mode */}
        {!isReadOnly && (
          <button
            onClick={() => setIsFormOpen(true)}
            className={`fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="إضافة سجل"
            disabled={isFormSubmitting}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-md flex items-center">
            <div className="w-5 h-5 text-red-500 mr-2 shrink-0">⚠️</div>
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {(isFormOpen || editingRecord) && !isReadOnly && (
          <div className="mb-6 bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-1">
              {editingRecord ? 'تعديل السجل' : 'إضافة سجل جديد'}
            </h2>
            {!editingRecord && (
              <div className="bg-indigo-50 p-2 rounded mb-6 border border-indigo-100">
                <p className="text-sm text-indigo-800 font-medium">للسنة الهجرية ١٤٤٦</p>
              </div>
            )}
            <RecordForm
              onSubmit={editingRecord ? handleUpdateRecord : handleAddRecord}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingRecord(null);
              }}
              initialData={editingRecord?.fields}
              isEditing={!!editingRecord}
              predefinedItems={uniqueItems}
              predefinedUnits={uniqueUnits}
              isSubmitting={isFormSubmitting}
              recordId={editingRecord?.recordId}
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && !isReadOnly && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">تأكيد الحذف</h3>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isFormSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-700 mb-3">هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه العملية.</p>
              
              {recordToDelete && records.find(r => r.recordId === recordToDelete)?.fields["Attachment URL"] && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                  <p className="text-amber-700 text-sm">
                    <strong>تنبيه:</strong> سيتم أيضًا حذف جميع المرفقات المرتبطة بهذا السجل.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isFormSubmitting}
                >
                  إلغاء
                </button>
                <button
                  onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)}
                  className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isFormSubmitting}
                >
                  {isFormSubmitting ? (
                    <span className="flex items-center">
                      <span className="mr-2 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      جارٍ الحذف...
                    </span>
                  ) : 'حذف'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Records List */}
        {isRecordsLoading ? (
          <RecordsListSkeleton />
        ) : (
          <div className="space-y-4">
            {sortedItems.map(([item, records]) => {
              const sortedRecords = [...records].sort((a, b) => 
                parseInt(b.fields.EidYear) - parseInt(a.fields.EidYear)
              );
              const latestRecord = sortedRecords[0];

              return (
                <div key={item} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item}</h3>
                        <p className="text-sm text-gray-500">
                          {latestRecord.fields["Arabic Category"] || latestRecord.fields.Category || 'غير مصنف'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500">الوحدة:</span>
                          <span className="mr-1 text-gray-900">{latestRecord.fields.Unit || 'غير محدد'}</span>
                        </div>
                        {latestRecord.fields["Attachment URL"] && (
                          <button
                            onClick={() => validateAndShowAttachments(latestRecord)}
                            className="flex items-center text-blue-500 hover:text-blue-700"
                            aria-label="عرض المرفقات"
                            title="عرض المرفقات"
                          >
                            <Paperclip className="w-4 h-4 ml-1" />
                            <span className="text-xs">مرفقات</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">السنة</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">الكمية</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">سعر الوحدة</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">التكلفة</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">المرفقات</th>
                          {!isReadOnly && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">الإجراءات</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedRecords.map((record) => (
                          <tr key={record.recordId} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900 text-center">
                              {isNaN(parseInt(record.fields.EidYear)) ? 
                                record.fields.EidYear : 
                                parseInt(record.fields.EidYear).toLocaleString('ar-SA')}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-center">{record.fields.Quantity.toLocaleString('ar-SA')}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              <div className="flex items-center justify-center">
                                <span className="mx-1">{record.fields.UnitPrice.toLocaleString('ar-SA')}</span>
                                <SaudiRiyalSymbol size={14} className="text-gray-700" />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">
                              <div className="flex items-center justify-center">
                                <span className="mx-1">{record.fields.Cost.toLocaleString('ar-SA')}</span>
                                <SaudiRiyalSymbol size={14} className="text-gray-700" />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 text-center">
                              {record.fields["Attachment URL"] && (
                                <button
                                  onClick={() => validateAndShowAttachments(record)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  aria-label="عرض المرفقات"
                                  title="عرض المرفقات"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                            {!isReadOnly && (
                              <td className="px-3 py-2 text-sm font-medium text-gray-900 flex space-x-1 rtl:space-x-reverse justify-center">
                                {record.fields.EidYear !== '1445' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRecord(record);
                                        setIsFormOpen(false);
                                      }}
                                      className={`text-blue-600 hover:text-blue-900 p-1 ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      aria-label="تعديل"
                                      title="تعديل"
                                      disabled={isFormSubmitting}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(record.recordId!)}
                                      className={`text-red-600 hover:text-red-900 p-1 ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      aria-label="حذف"
                                      title="حذف"
                                      disabled={isFormSubmitting}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {record.fields.EidYear === '1445' && (
                                  <span className="text-xs text-gray-500">للقراءة فقط</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attachments Dialog */}
      {selectedAttachments && isAttachmentsDialogOpen && (
        <AttachmentsList
          attachments={selectedAttachments}
          isOpen={isAttachmentsDialogOpen}
          onClose={() => {
            setIsAttachmentsDialogOpen(false);
            setSelectedAttachments(null);
          }}
        />
      )}
    </div>
  );
}

export default App;