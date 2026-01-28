import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackConversion } from '@/lib/analytics';

// Replace these with your actual IDs
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 Measurement ID
const GTM_CONTAINER_ID = 'GTM-XXXXXXX'; // Replace with your GTM Container ID
const META_PIXEL_ID = 'XXXXXXXXXXXXXXX'; // Replace with your Meta Pixel ID

export function AnalyticsScripts() {
  const location = useLocation();

  useEffect(() => {
    // Initialize Google Tag Manager
    const initGTM = () => {
      if (typeof window !== 'undefined' && GTM_CONTAINER_ID !== 'GTM-XXXXXXX') {
        window.dataLayer = window.dataLayer || [];
        const script = document.createElement('script');
        script.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
        `;
        document.head.appendChild(script);
      }
    };

    // Initialize Google Analytics 4
    const initGA4 = () => {
      if (typeof window !== 'undefined' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        const script1 = document.createElement('script');
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `;
        document.head.appendChild(script2);
      }
    };

    // Initialize Meta Pixel
    const initMetaPixel = () => {
      if (typeof window !== 'undefined' && META_PIXEL_ID !== 'XXXXXXXXXXXXXXX') {
        const script = document.createElement('script');
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
      }
    };

    initGTM();
    initGA4();
    initMetaPixel();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackConversion.pageView(location.pathname, document.title);
  }, [location]);

  return null;
}
