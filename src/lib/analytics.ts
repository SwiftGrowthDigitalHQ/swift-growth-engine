// Analytics tracking utilities for GA4, GTM, and Meta Pixel

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    fbq: (...args: unknown[]) => void;
  }
}

// Google Analytics 4 Event Tracking
export const trackGA4Event = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Meta Pixel Event Tracking
export const trackMetaEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

// Custom Meta Pixel Event
export const trackMetaCustomEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, parameters);
  }
};

// Google Tag Manager DataLayer Push
export const pushToDataLayer = (data: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
};

// Conversion Events
export const trackConversion = {
  whatsappChatStart: (source?: string) => {
    trackGA4Event('whatsapp_chat_start', { source });
    trackMetaEvent('Contact', { source });
    trackMetaCustomEvent('WhatsAppChatStart', { source });
    pushToDataLayer({ event: 'whatsapp_chat_start', source });
  },
  
  leadFormSubmit: (formName: string, businessType?: string) => {
    trackGA4Event('lead_form_submit', { form_name: formName, business_type: businessType });
    trackMetaEvent('Lead', { form_name: formName, business_type: businessType });
    pushToDataLayer({ event: 'lead_form_submit', form_name: formName, business_type: businessType });
  },
  
  callButtonClick: (source?: string) => {
    trackGA4Event('call_button_click', { source });
    trackMetaCustomEvent('CallButtonClick', { source });
    pushToDataLayer({ event: 'call_button_click', source });
  },
  
  freeAuditSubmit: (businessType?: string, city?: string) => {
    trackGA4Event('free_audit_submit', { business_type: businessType, city });
    trackMetaEvent('Lead', { content_name: 'Free Audit', business_type: businessType, city });
    trackMetaCustomEvent('FreeAuditSubmit', { business_type: businessType, city });
    pushToDataLayer({ event: 'free_audit_submit', business_type: businessType, city });
  },
  
  pageView: (pagePath: string, pageTitle: string) => {
    trackGA4Event('page_view', { page_path: pagePath, page_title: pageTitle });
    trackMetaEvent('PageView');
    pushToDataLayer({ event: 'page_view', page_path: pagePath, page_title: pageTitle });
  },
};
