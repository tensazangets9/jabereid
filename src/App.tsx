import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, PhoneCall, Lock, Eye, LogOut, User, Search, BarChart, RefreshCw, Wifi, WifiOff, Paperclip, ExternalLink, Image as ImageIcon, FileText, File as FileIcon, Maximize2 } from 'lucide-react';
import { Record, Field, AttachmentField } from './types';
import { getRecords, addRecord, updateRecord, deleteRecord } from './api';
import { RecordForm } from './components/RecordForm';
import { SaudiRiyalSymbol } from './components/SaudiRiyalSymbol';
import ExpenseCharts from './components/ExpenseCharts';

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

const AttachmentsList = ({ attachments }: { attachments?: AttachmentField[] }) => {
  const [selectedImage, setSelectedImage] = useState<AttachmentField | null>(null);
  
  if (!attachments || attachments.length === 0) return null;

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

  // Filter images for gallery view
  const imageAttachments = attachments.filter(a => a.mimeType?.startsWith('image/'));
  const documentAttachments = attachments.filter(a => !a.mimeType?.startsWith('image/'));

  return (
    <div className="pt-3 border-t border-gray-200 mt-3">
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Paperclip className="w-4 h-4 ml-1" />
        <span>المرفقات ({attachments.length})</span>
      </div>
      
      {/* Image gallery section */}
      {imageAttachments.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-cols-3 gap-2">
            {imageAttachments.map(attachment => (
              <div 
                key={attachment.id} 
                className="aspect-square rounded bg-gray-100 overflow-hidden cursor-pointer relative group"
                onClick={() => setSelectedImage(attachment)}
              >
                <img 
                  src={attachment.thumbnailUrl || attachment.url} 
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Other attachments */}
      {documentAttachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {documentAttachments.map(attachment => (
            <a 
              key={attachment.id} 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {getFileIcon(attachment.mimeType)}
              <div className="mr-2 overflow-hidden flex-1">
                <div className="text-xs font-medium text-gray-900 truncate">{attachment.name}</div>
                <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
            </a>
          ))}
        </div>
      )}
      
      {/* Image preview modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button 
              className="absolute top-3 right-3 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name} 
              className="max-w-full max-h-[calc(100vh-2rem)] rounded object-contain"
            />
            <div className="text-white text-sm mt-2">{selectedImage.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  
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
      setIsLoading(true);
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
      setIsLoading(false);
      setIsFetchingFreshData(false);
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
    }
  };

  const handleUpdateRecord = async (fields: Record['fields']) => {
    if (isReadOnly || !editingRecord?.recordId) return;
    
    try {
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
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (isReadOnly) return;
    
    try {
      await deleteRecord(recordId);
      await fetchRecords(true); // Force refresh after deleting
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'فشل في حذف السجل');
      } else {
        setError('فشل في حذف السجل');
      }
    }
  };

  const confirmDelete = (recordId: string) => {
    if (isReadOnly) return;
    
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

  const handleManualRefresh = () => {
    if (isFetchingFreshData) return;
    fetchRecords(true); // Force refresh
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

  if (isLoading) {
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
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </button>
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

        {/* Cache information */}
        {cacheTimestamp && (
          <div className="mb-4 bg-gray-50 border border-gray-200 p-3 rounded-md flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                {isOffline ? (
                  <WifiOff className="w-4 h-4 text-gray-500 ml-1" />
                ) : (
                  <Wifi className="w-4 h-4 text-green-500 ml-1" />
                )}
                <span className="font-medium">آخر تحديث:</span> {cacheTimestamp.toLocaleString('ar-SA')}
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              className={`flex items-center text-sm px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${(isFetchingFreshData || isOffline) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isFetchingFreshData || isOffline}
            >
              <RefreshCw className={`w-4 h-4 ml-1 ${isFetchingFreshData ? 'animate-spin' : ''}`} />
              <span>{isFetchingFreshData ? 'جارٍ التحديث...' : 'تحديث'}</span>
            </button>
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
        <div className="mb-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="search-items" className="block text-sm font-medium text-gray-700 mb-1">
              بحث عن عنصر
            </label>
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

          {/* Category Filter */}
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              تصفية حسب الفئة
            </label>
            <select
              id="category-filter"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">جميع الفئات</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* Show filter status if any filter is active */}
          {(selectedCategory || searchQuery) && (
            <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-md">
              <span className="text-sm text-blue-700">
                {filteredRecords.length} عنصر {filteredRecords.length !== records.length && `(من أصل ${records.length})`}
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

        {/* Yearly Totals */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">إجمالي المصروفات حسب السنة</h2>
          <div className="grid grid-cols-2 gap-4">
            {sortedYears.map(year => (
              <div key={year} className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500">سنة {year}</div>
                <div className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-end">
                  <span className="mx-1">{yearlyStats[year].total.toLocaleString('ar-SA')}</span>
                  <SaudiRiyalSymbol size={16} className="text-gray-700" />
                </div>
                <div className="text-xs text-gray-500">
                  ({yearlyStats[year].count} سجل)
                </div>
                {year === '1446' && yearlyComparison && (
                  <div className={`text-xs mt-1 text-right ${yearlyComparison.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                    {yearlyComparison.isIncrease ? '▲' : '▼'} {Math.abs(yearlyComparison.percentageChange).toFixed(1)}% مقارنة بعام ١٤٤٥
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
        
        {/* Floating Add Button - only show if not in read-only mode */}
        {!isReadOnly && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center"
            aria-label="إضافة سجل"
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
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-700 mb-6">هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه العملية.</p>
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}

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
                    <div>
                      <span className="text-gray-500">الوحدة:</span>
                      <span className="mr-1 text-gray-900">{latestRecord.fields.Unit || 'غير محدد'}</span>
                    </div>
                    
                    <AttachmentsList attachments={latestRecord.fields.Attachment} />
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
                        {!isReadOnly && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">الإجراءات</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedRecords.map((record) => (
                        <tr key={record.recordId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900 text-center">{record.fields.EidYear}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-center">{record.fields.Quantity}</td>
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
                          {!isReadOnly && (
                            <td className="px-3 py-2 text-sm text-gray-500 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => confirmDelete(record.recordId!)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  aria-label="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingRecord(record)}
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                  aria-label="تعديل"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
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
      </div>
    </div>
  );
}

export default App;