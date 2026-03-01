export interface Terms {
  id: string;
  version: number;
  title: string;
  content: string;
  effectiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTermsRequest {
  title: string;
  content: string;
  effectiveAt: string;
}

export interface UpdateTermsRequest {
  title?: string;
  content?: string;
  effectiveAt?: string;
}
