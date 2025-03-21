export interface Record {
  recordId?: string;
  fields: {
    Title?: number;
    EidYear: string;
    Item: string;
    Unit: string;
    Quantity: number;
    UnitPrice: number;
    Cost: number;
    Category: string;
    "Arabic Category": string;
    "Created time"?: string;
    "Last edited time"?: string;
    Attachment?: AttachmentField[];
    [key: string]: any; // Allow for additional fields that might come from the API
  };
}

export interface FieldOption {
  id: string;
  name: string;
  color?: {
    name: string;
    value: string;
  };
}

export interface Field {
  id: string;
  name: string;
  type: string;
  editable: boolean;
  isPrimary?: boolean;
  property?: {
    precision?: number;
    commaStyle?: string;
    format?: string;
    includeTime?: boolean;
    options?: FieldOption[];
  };
}

export interface ApiResponse {
  code: number;
  success: boolean;
  message: string;
  data: {
    total?: number;
    pageNum?: number;
    pageSize?: number;
    records?: Record[];
    fields?: Field[];
  };
}

export interface CachedData {
  timestamp: number;
  records: Record[];
  fields?: Field[];
}

export interface AttachmentField {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  token: string;
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}