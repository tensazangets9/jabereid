import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Record, AttachmentField } from '../types';
import { SaudiRiyalSymbol } from './SaudiRiyalSymbol';
import { uploadAttachment } from '../api';
import { Upload, X, FileText, Image as ImageIcon, File as FileIcon, Paperclip, Maximize2 } from 'lucide-react';

interface RecordFormProps {
  onSubmit: (data: Record['fields']) => void;
  onCancel: () => void;
  initialData?: Record['fields'];
  isEditing?: boolean;
  predefinedItems?: string[];
  predefinedUnits?: string[];
}

const categories = [
  'Food & Beverages',
  'Services & Labor',
  'Party & Event Supplies',
  'Utilities & Cleaning',
  'Equipment & Miscellaneous',
  'Ambience & Fragrances',
];

const categoryMapping: { [key: string]: string } = {
  'Food & Beverages': 'المأكولات والمشروبات',
  'Services & Labor': 'الخدمات والعمالة',
  'Party & Event Supplies': 'مستلزمات الحفلات والفعاليات',
  'Utilities & Cleaning': 'المرافق والتنظيف',
  'Equipment & Miscellaneous': 'المعدات والمتفرقات',
  'Ambience & Fragrances': 'الأجواء والعطور',
};

// Default items when no items are provided from the API
const defaultItems = [
  'التين',
  'البلح والشكلاطة',
  'أرز بسمتي',
  'شاي الكوبس',
  'سكر الأسرة',
  'بطاط',
  'تمر زمزم',
  'بن محمص',
  'هيل',
  'مياه',
  'ملح خشن',
  'زيت',
];

export function RecordForm({ onSubmit, onCancel, initialData, isEditing, predefinedItems = [], predefinedUnits = [] }: RecordFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Record['fields']>({
    defaultValues: initialData || {
      EidYear: '1446',
      Quantity: 1,
      UnitPrice: 0,
      Cost: 0,
      Unit: 'حبة',
    },
  });
  
  // Reference to the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quantity = watch('Quantity');
  const unitPrice = watch('UnitPrice');
  const [itemFilter, setItemFilter] = useState(initialData?.Item?.trim() || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [registeredItem, setRegisteredItem] = useState(initialData?.Item?.trim() || '');
  
  // Unit state, similar to item
  const [unitFilter, setUnitFilter] = useState(initialData?.Unit?.trim() || '');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [registeredUnit, setRegisteredUnit] = useState(initialData?.Unit?.trim() || '');
  
  // Attachment states
  const [attachments, setAttachments] = useState<AttachmentField[]>(initialData?.Attachment || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AttachmentField | null>(null);

  // Use initial item value when editing
  useEffect(() => {
    if (initialData?.Item && isEditing) {
      setItemFilter(initialData.Item.trim());
      setRegisteredItem(initialData.Item.trim());
    }
    if (initialData?.Unit && isEditing) {
      setUnitFilter(initialData.Unit.trim());
      setRegisteredUnit(initialData.Unit.trim());
    }
  }, [initialData?.Item, initialData?.Unit, isEditing]);
  
  // Use items from API if available, otherwise fall back to defaults
  const itemsList = predefinedItems.length > 0 ? predefinedItems : defaultItems;
  
  // Use units from API if available, otherwise fall back to defaults
  const unitsList = predefinedUnits.length > 0 ? predefinedUnits : [
    'حبة',
    'كيلو',
    'كرتون',
    'علبة',
    'صحن',
    'درزن',
  ];

  // Filter items based on search input (with sanitization)
  const sanitizedFilter = itemFilter.trim().toLowerCase();
  const filteredItems = sanitizedFilter
    ? itemsList.filter(item => 
        item.toLowerCase().includes(sanitizedFilter)
      )
    : itemsList;
    
  // Filter units based on search input
  const sanitizedUnitFilter = unitFilter.trim().toLowerCase();
  const filteredUnits = sanitizedUnitFilter
    ? unitsList.filter(unit => 
        unit.toLowerCase().includes(sanitizedUnitFilter)
      )
    : unitsList;

  // Handle selecting an item from dropdown
  const handleSelectItem = (item: string) => {
    // Sanitize the item by trimming
    const sanitizedItem = item.trim();
    setValue('Item', sanitizedItem);
    setRegisteredItem(sanitizedItem);
    setShowDropdown(false);
  };
  
  // Handle selecting a unit from dropdown
  const handleSelectUnit = (unit: string) => {
    const sanitizedUnit = unit.trim();
    setValue('Unit', sanitizedUnit);
    setRegisteredUnit(sanitizedUnit);
    setShowUnitDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.item-dropdown-container')) {
        setShowDropdown(false);
        
        // If the input has a value but it's not in the list, add it as a custom item
        if (itemFilter && !registeredItem) {
          // Sanitize the input
          const sanitizedInput = itemFilter.trim();
          if (sanitizedInput) {
            setValue('Item', sanitizedInput);
            setRegisteredItem(sanitizedInput);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [itemFilter, registeredItem, setValue]);

  // Close unit dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.unit-dropdown-container')) {
        setShowUnitDropdown(false);
        
        // If the input has a value but it's not registered yet, register it
        if (unitFilter && !registeredUnit) {
          const sanitizedInput = unitFilter.trim();
          if (sanitizedInput) {
            setValue('Unit', sanitizedInput);
            setRegisteredUnit(sanitizedInput);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [unitFilter, registeredUnit, setValue]);

  const calculateCost = (data: Record['fields']) => {
    // Sanitize the item field
    if (data.Item) {
      data.Item = data.Item.trim();
    }
    
    // Add attachments to the form data
    console.log('Adding attachments to form data for submission:', attachments);
    data.Attachment = attachments;
    
    const cost = data.Quantity * data.UnitPrice;
    return { ...data, Cost: cost };
  };

  // Handle file selection from the file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('--------- FILE SELECTION START ---------');
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log(`Selected ${files.length} file(s):`, 
      Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    );
    
    setUploadError(null);
    setIsUploading(true);
    console.log('Setting isUploading to true');
    
    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i+1}/${files.length}:`, file.name);
        
        // Upload the file
        console.log('Calling uploadAttachment function...');
        const attachmentData = await uploadAttachment(file);
        console.log('Received attachment data from upload:', attachmentData);
        
        // Ensure the attachment has an ID
        if (!attachmentData.id) {
          console.log('Attachment is missing ID, generating one...');
          attachmentData.id = `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Verify the required fields exist
        if (!attachmentData.token) {
          console.error('Attachment is missing token!', attachmentData);
          throw new Error('Attachment data is missing token');
        }
        
        // Add the returned attachment to the list
        console.log('Adding attachment to state with ID:', attachmentData.id);
        console.log('Current attachments count:', attachments.length);
        setAttachments(prev => {
          // Check if we already have this attachment to avoid duplicates
          const exists = prev.some(att => 
            att.token === attachmentData.token || 
            att.id === attachmentData.id || 
            att.name === attachmentData.name
          );
          
          if (exists) {
            console.log('Attachment already exists in list, not adding duplicate');
            return prev;
          }
          
          const newAttachments = [...prev, attachmentData];
          console.log('New attachments list:', newAttachments);
          return newAttachments;
        });
      }
      console.log('All files processed successfully');
    } catch (error) {
      console.error('Upload failed in handleFileChange:', error);
      setUploadError('فشل في رفع الملف. يرجى المحاولة مرة أخرى.');
      console.log('Set upload error message');
    } finally {
      setIsUploading(false);
      console.log('Setting isUploading to false');
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        console.log('Reset file input');
      }
      console.log('--------- FILE SELECTION COMPLETE ---------');
    }
  };

  // Remove attachment from the list
  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    } else if (mimeType.startsWith('application/pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else {
      return <FileIcon className="w-5 h-5 text-gray-500" />;
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

  // Filter attachments by type
  const imageAttachments = attachments.filter(a => a.mimeType?.startsWith('image/'));
  const documentAttachments = attachments.filter(a => !a.mimeType?.startsWith('image/'));
  
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(calculateCost(data)))} className="space-y-6">
      <div className="space-y-6">
        {!isEditing ? (
          <input type="hidden" {...register('EidYear')} />
        ) : (
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">السنة الهجرية</label>
            <input
              {...register('EidYear')}
              className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">الفئة</label>
          <select
            {...register('Category')}
            onChange={(e) => {
              register('Category').onChange(e);
              register('Arabic Category').onChange({
                target: { value: categoryMapping[e.target.value] },
              });
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">اختر الفئة</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryMapping[category]}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4 relative item-dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-2">البند</label>
          <input
            value={itemFilter}
            onChange={(e) => {
              setItemFilter(e.target.value);
              setShowDropdown(true);
              if (e.target.value !== registeredItem) {
                setRegisteredItem('');
              }
              
              // If the user clears the input, also clear the registered item
              if (e.target.value === '') {
                setRegisteredItem('');
              }
            }}
            onFocus={() => {
              // Only show dropdown if user hasn't selected an item yet or there's no text
              if (!registeredItem || itemFilter === '') {
                setShowDropdown(true);
              }
            }}
            onClick={() => setShowDropdown(true)} // Show dropdown on click as well
            className={`block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${registeredItem ? 'text-black font-medium' : ''}`}
            placeholder="اختر أو اكتب اسم البند"
          />
          {registeredItem && (
            <button
              type="button"
              className="absolute inset-y-0 left-0 pl-3 flex items-center"
              onClick={() => {
                setItemFilter('');
                setRegisteredItem('');
                setShowDropdown(true);
              }}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" aria-hidden="true" />
            </button>
          )}
          <input type="hidden" {...register('Item')} value={registeredItem || itemFilter.trim()} />
          
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto border border-gray-300">
              {filteredItems.length > 0 ? (
                <React.Fragment key="items-with-results">
                  {filteredItems.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-right"
                      onClick={() => {
                        handleSelectItem(item);
                        setItemFilter(item);
                      }}
                    >
                      {item}
                    </div>
                  ))}
                  
                  {/* If typed text doesn't exactly match any item, show option to add it */}
                  {sanitizedFilter && 
                   !filteredItems.some(item => item.toLowerCase() === sanitizedFilter) && (
                    <div 
                      key="add-new-item"
                      className="px-4 py-2 cursor-pointer hover:bg-indigo-50 text-right text-indigo-600 border-t border-gray-200"
                      onClick={() => {
                        handleSelectItem(itemFilter);
                      }}
                    >
                      <span className="font-medium">إضافة: </span>
                      {itemFilter.trim()}
                    </div>
                  )}
                </React.Fragment>
              ) : (
                <React.Fragment key="items-no-results">
                  <div key="no-results" className="px-4 py-2 text-gray-500 text-right">لا توجد نتائج</div>
                  {sanitizedFilter && (
                    <div 
                      key="add-new-item"
                      className="px-4 py-2 cursor-pointer hover:bg-indigo-50 text-right text-indigo-600 border-t border-gray-200"
                      onClick={() => {
                        handleSelectItem(itemFilter);
                      }}
                    >
                      <span className="font-medium">إضافة: </span>
                      {itemFilter.trim()}
                    </div>
                  )}
                </React.Fragment>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="relative unit-dropdown-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة</label>
            <input
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setShowUnitDropdown(true);
                if (e.target.value !== registeredUnit) {
                  setRegisteredUnit('');
                }
                
                // If the user clears the input, also clear the registered unit
                if (e.target.value === '') {
                  setRegisteredUnit('');
                }
              }}
              onFocus={() => {
                // Only show dropdown if user hasn't selected a unit yet or there's no text
                if (!registeredUnit || unitFilter === '') {
                  setShowUnitDropdown(true);
                }
              }}
              onClick={() => setShowUnitDropdown(true)} // Show dropdown on click as well
              className={`block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${registeredUnit ? 'text-black font-medium' : ''}`}
              placeholder="اختر أو اكتب وحدة"
            />
            {registeredUnit && (
              <button
                type="button"
                className="absolute inset-y-0 left-0 pl-3 flex items-center"
                onClick={() => {
                  setUnitFilter('');
                  setRegisteredUnit('');
                  setShowUnitDropdown(true);
                }}
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" aria-hidden="true" />
              </button>
            )}
            <input type="hidden" {...register('Unit')} value={registeredUnit || unitFilter.trim()} />
            
            {showUnitDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto border border-gray-300">
                {filteredUnits.length > 0 ? (
                  <React.Fragment key="units-with-results">
                    {filteredUnits.map((unit, index) => (
                      <div
                        key={`${unit}-${index}`}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-right"
                        onClick={() => {
                          handleSelectUnit(unit);
                          setUnitFilter(unit);
                        }}
                      >
                        {unit}
                      </div>
                    ))}
                    
                    {/* If typed text doesn't exactly match any unit, show option to add it */}
                    {sanitizedUnitFilter && 
                     !filteredUnits.some(unit => unit.toLowerCase() === sanitizedUnitFilter) && (
                      <div 
                        key="add-new-unit"
                        className="px-4 py-2 cursor-pointer hover:bg-indigo-50 text-right text-indigo-600 border-t border-gray-200"
                        onClick={() => {
                          handleSelectUnit(unitFilter);
                        }}
                      >
                        <span className="font-medium">إضافة: </span>
                        {unitFilter.trim()}
                      </div>
                    )}
                  </React.Fragment>
                ) : (
                  <React.Fragment key="units-no-results">
                    <div key="no-unit-results" className="px-4 py-2 text-gray-500 text-right">لا توجد نتائج</div>
                    {sanitizedUnitFilter && (
                      <div 
                        key="add-new-unit"
                        className="px-4 py-2 cursor-pointer hover:bg-indigo-50 text-right text-indigo-600 border-t border-gray-200"
                        onClick={() => {
                          handleSelectUnit(unitFilter);
                        }}
                      >
                        <span className="font-medium">إضافة: </span>
                        {unitFilter.trim()}
                      </div>
                    )}
                  </React.Fragment>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
            <input
              type="number"
              {...register('Quantity', { valueAsNumber: true })}
              className="block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">سعر الوحدة</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                {...register('UnitPrice', { valueAsNumber: true })}
                className="w-full text-right py-2.5 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-200 focus:border-indigo-300"
                style={{ paddingLeft: "2rem" }}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SaudiRiyalSymbol size={14} className="text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">التكلفة الإجمالية</label>
          <div className="relative">
            <input
              type="number"
              value={quantity * unitPrice}
              disabled
              className="w-full text-right py-2.5 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-indigo-300 bg-gray-50 text-lg font-semibold"
              style={{ paddingLeft: "2rem" }}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SaudiRiyalSymbol size={14} className="text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* File Attachment Section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">المرفقات</label>
        
        {/* File input (hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
        
        {/* Upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          {isUploading ? (
            <div className="flex items-center text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
              <span>جاري الرفع...</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-600">
              <Upload className="w-5 h-5 ml-2" />
              <span>انقر لإضافة ملفات أو صور</span>
            </div>
          )}
        </button>
        
        {/* Error message */}
        {uploadError && (
          <div className="mt-2 text-sm text-red-600">
            {uploadError}
          </div>
        )}
        
        {/* Attached files list */}
        {attachments.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-gray-500 mb-2">
              الملفات المرفقة ({attachments.length})
            </div>
            
            {/* Image gallery */}
            {imageAttachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {imageAttachments.map(attachment => (
                  <div key={attachment.id || `img-${attachment.name}-${Date.now()}`} className="relative group">
                    <div 
                      className="aspect-square rounded bg-gray-100 overflow-hidden cursor-pointer relative"
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(attachment.id);
                      }}
                      className="absolute -top-1 -right-1 bg-white rounded-full shadow-md p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Documents list */}
            {documentAttachments.map(attachment => (
              <div key={attachment.id || `doc-${attachment.name}-${Date.now()}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  {getFileIcon(attachment.mimeType)}
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Image preview modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" 
            onClick={() => setSelectedImage(null)}
          >
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

      <div className="flex space-x-3 rtl:space-x-reverse mt-8 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="w-1/3 px-4 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          disabled={isSubmitting || isUploading}
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="w-2/3 px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          disabled={isSubmitting || isUploading}
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              <span>جاري الرفع...</span>
            </div>
          ) : isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              <span>جاري الحفظ...</span>
            </div>
          ) : (
            <>{isEditing ? 'تحديث' : 'إضافة'} السجل</>
          )}
        </button>
      </div>
    </form>
  );
}