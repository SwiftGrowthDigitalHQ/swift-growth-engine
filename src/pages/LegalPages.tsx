import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedChatWidget } from "@/components/UnifiedChatWidget";
import legalSeo from "@/data/legal-seo.json";

const LAST_UPDATED = "October 1, 2026";
const EMAIL = "hello@swiftgrowthdigital.com";
const PHONE = "+91 9229721835";
const WEBSITE = "https://www.swiftgrowthdigital.com/";
const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.swiftgrowthdigital.com").replace(/\/+$/, "");

type PolicySection = {
  heading: string;
  content: ReactNode;
};

type PolicyPageProps = {
  route: keyof typeof legalSeo.pages;
  heading: string;
  description: string;
  sections: PolicySection[];
  updated?: boolean;
  children?: ReactNode;
};

function PolicyPage({ route, heading, description, sections, updated = true, children }: PolicyPageProps) {
  const seo = legalSeo.pages[route];

  useEffect(() => {
    const title = seo?.title || `${heading} | SwiftGrowthDigital`;
    const metaDescription = seo?.description || description;
    const canonicalUrl = `${SITE_URL}${route}`;

    document.title = title;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("description", metaDescription);
    updateMeta("og:title", title, true);
    updateMeta("og:description", metaDescription, true);
    updateMeta("og:type", "website", true);
    updateMeta("og:url", canonicalUrl, true);
    updateMeta("og:site_name", "SwiftGrowthDigital", true);
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", metaDescription);

    let canonicalEl = document.querySelector("link[rel='canonical']");
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalUrl);
  }, [route, seo, heading, description]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="pt-20" data-policy-route={route}>
          <section className="relative py-12 md:py-20">
            <div className="absolute inset-0 bg-hero-glow" aria-hidden="true" />
            <div className="container relative z-10 mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
                  <Link className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" to="/">Home</Link>
                  <span className="px-2" aria-hidden="true">/</span>
                  <span aria-current="page" className="text-foreground">{heading}</span>
                </nav>
                <h1 className="mb-4 text-4xl font-display font-bold md:text-5xl">
                  <span className="text-gradient">{heading}</span>
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
                {updated && <p className="mt-5 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>}

                {children}

                <div className="mt-10 space-y-8 md:mt-12 md:space-y-10">
                  {sections.map((section, index) => (
                    <section key={section.heading} aria-labelledby={`policy-section-${index + 1}`}>
                      <h2 id={`policy-section-${index + 1}`} className="mb-3 text-xl font-display font-semibold text-foreground md:text-2xl">
                        {section.heading}
                      </h2>
                      <div className="space-y-3 text-sm leading-7 text-muted-foreground md:text-base">
                        {section.content}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </PageTransition>
      <Footer />
      <UnifiedChatWidget />
    </div>
  );
}

function ContactDetails() {
  return (
    <address className="not-italic">
      <ul className="mt-3 space-y-2">
        <li><a className="underline decoration-primary/50 underline-offset-4 hover:text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
        <li><a className="underline decoration-primary/50 underline-offset-4 hover:text-primary" href="tel:+919229721835">{PHONE}</a></li>
        <li><a className="underline decoration-primary/50 underline-offset-4 hover:text-primary" href={WEBSITE}>{WEBSITE}</a></li>
      </ul>
    </address>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-primary">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function PrivacyPolicy() {
  const sections: PolicySection[] = [
    { heading: "1. Introduction", content: <p>This Privacy Policy explains how SwiftGrowthDigital ("SwiftGrowthDigital", "we", "us", or "our") handles personal information when you visit our website, contact us, request an audit, or use our digital marketing and technology services. We operate from India and handle information under applicable requirements. This notice describes our current website and service workflows; a project agreement may also explain how project-specific information is handled.</p> },
    { heading: "2. Information We Collect", content: <><p>The information we receive depends on how you interact with us. It can include:</p><Bullets items={["Contact and inquiry details you submit, such as your name, business type, city, and WhatsApp number.", "Whether you chose the optional WhatsApp marketing updates checkbox, together with the associated source and consent record.", "Messages, files, project details, or other information you choose to share by email, phone, WhatsApp, or the website chat.", "Website usage and device information collected by Google Analytics, such as page views, page paths, page titles, and interaction events."]} /></> },
    { heading: "3. Information Provided by Users", content: <p>You decide what information to include in an inquiry or conversation. Please do not send passwords, payment-card details, government identity numbers, or other sensitive information through public forms or the website chat unless we specifically request it through an appropriate channel.</p> },
    { heading: "4. Contact Information", content: <p>Our website forms currently ask for a name, business type, city, and WhatsApp number. If you contact us directly, we may also receive the email address, phone number, WhatsApp profile details, and message content you use to contact us.</p> },
    { heading: "5. Website Usage Information", content: <p>Google Analytics is configured on this website. It may receive page path and title information and events about website use. Some form conversion events can include business type or city. Google may also receive technical information such as browser, device, and network data as part of providing its analytics service.</p> },
    { heading: "6. Cookies and Similar Technologies", content: <p>Google Analytics may use cookies or similar identifiers for analytics. The site also uses browser storage for interface preferences, such as the sound setting, and the administrative interface may use browser storage for sign-in or interface state. See our <Link className="text-primary underline underline-offset-4" to="/cookie-policy">Cookie Policy</Link> for details and controls.</p> },
    { heading: "7. How We Use Information", content: <Bullets items={["To respond to questions, assess service requests, and provide consultations or services you ask for.", "To manage project delivery, customer support, billing records, and related business communications.", "To operate, secure, troubleshoot, and improve our website and services.", "To understand website usage through analytics and measure interactions with pages and forms.", "To meet legal obligations, maintain appropriate business records, and address security or dispute issues."]} /> },
    { heading: "8. Communication and Marketing", content: <p>We use your contact details to respond to an inquiry or communicate about a service you requested. We send promotional messages only where permitted and, where required or appropriate, after receiving an opt-in. You can ask us to stop marketing communication at any time using the channel described below.</p> },
    { heading: "9. WhatsApp Communication", content: <p>If you contact us on WhatsApp or provide your number for business communication, we may process your number and message details to respond to inquiries, provide requested information, support a service, and send marketing communication where legally permitted and where an appropriate opt-in exists. WhatsApp is operated by Meta and its own terms and privacy information apply to your use of that service.</p> },
    { heading: "10. WhatsApp Business / Meta Platform Data", content: <p>When a conversation is processed through the WhatsApp Business Platform integration configured for our account, our backend can store inbound message content, the sender's phone number, contact name when provided, message type and identifiers, timestamps, delivery status, and related technical metadata. These records are used to respond, manage service communications, operate the integration, and handle opt-outs. A conversation you have only within WhatsApp may also be processed by WhatsApp under its own policies. SwiftGrowthDigital does not claim Meta certification or an official partnership.</p> },
    { heading: "11. Website Analytics", content: <p>Google Analytics is the analytics service currently configured in the website code. It helps us understand aggregate site traffic and interactions. Google Tag Manager and Meta Pixel are not configured with active IDs in the current website code. Analytics data may be processed by Google under its own terms and privacy policy.</p> },
    { heading: "12. Google and Other Third-Party Services", content: <p>We use Supabase backend services to receive website form submissions and operate certain backend features. The website chat sends the messages in the current chat conversation to our backend and a configured generative AI service to produce a response. Google Analytics, WhatsApp/Meta, Supabase, and the configured AI service process information as needed to provide their respective services and under their own terms. When you follow an external link, that provider's privacy practices apply.</p> },
    { heading: "13. Payment Information", content: <p>The public website forms do not request or collect payment-card or bank-account details. If you purchase services, payment instructions and any related invoice or transaction records are handled as described in the relevant service arrangement. A third-party payment provider, if used for a particular engagement, handles payment details under its own terms.</p> },
    { heading: "14. Data Storage", content: <p>Website inquiries submitted through our forms are sent to a backend function and stored in our Supabase database so we can respond and manage the request. Where the WhatsApp Business Platform integration processes messages, message content and associated phone, status, and technical records may also be stored there. Website chat messages are sent to the backend and configured AI service to generate replies; the chat interface itself keeps its conversation in page memory and does not submit it through the lead form.</p> },
    { heading: "15. Data Security", content: <p>We take reasonable steps to protect information handled through our website and services. No website, transmission method, or storage system can be guaranteed to be completely secure, so please use care when deciding what to send online.</p> },
    { heading: "16. Data Retention", content: <p>We retain information for as long as reasonably needed to respond to you, provide or administer services, maintain business and transaction records, protect security, resolve disputes, or meet applicable legal requirements. The time needed can vary by the type of information and the circumstances. We do not state a fixed retention period for all records.</p> },
    { heading: "17. Sharing of Information", content: <p>We do not sell personal information. We may share information with service providers that help us operate the website or deliver requested services, when you direct us to share it, or when sharing is necessary for security, legal compliance, or handling a dispute.</p> },
    { heading: "18. Service Providers", content: <p>Current service providers visible in the website or its connected workflows include Supabase for backend services, Google Analytics for website measurement, and WhatsApp/Meta when a conversation uses the WhatsApp Business Platform. The website chat also sends conversation content to a configured AI service. Provider processing is subject to each provider's terms and privacy information.</p> },
    { heading: "19. Legal Requirements", content: <p>We may preserve or disclose information where we reasonably believe this is required by applicable law, a valid legal process, or a request from a competent authority, or where it is necessary to protect people, the website, our services, or our legal interests.</p> },
    { heading: "20. User Rights", content: <p>Depending on applicable law and the circumstances, you may ask us for information about personal data associated with you, request correction or deletion, or withdraw consent for processing that relies on consent. Some information may need to be retained for lawful business records, security, fraud prevention, transaction records, or dispute resolution. Contact us by email to make a request.</p> },
    { heading: "21. Marketing Communication Preferences", content: <p>Marketing updates on WhatsApp are optional on our website forms. You can ask us to stop promotional messages by replying "STOP" where supported, or by emailing <a className="text-primary underline underline-offset-4" href={`mailto:${EMAIL}`}>{EMAIL}</a>. We may still send non-promotional messages needed to respond to a request or administer an active service.</p> },
    { heading: "22. How to Request Data Deletion", content: <p>To request deletion, email us with enough information for us to identify the relevant inquiry or account. We will review the request and handle it subject to applicable requirements and legitimate record-keeping needs. Full instructions are on our <Link className="text-primary underline underline-offset-4" to="/data-deletion">Data Deletion Request page</Link>.</p> },
    { heading: "23. Children's Privacy", content: <p>Our website and services are intended for businesses and adults acting on behalf of businesses. We do not knowingly seek personal information from children. If you believe a child has provided information to us, contact us so we can review it.</p> },
    { heading: "24. Changes to This Privacy Policy", content: <p>We may update this policy when our website, services, or applicable requirements change. The current version will appear on this page with its updated date.</p> },
    { heading: "25. Contact Information", content: <><p>For privacy questions, rights requests, or other concerns, contact SwiftGrowthDigital:</p><ContactDetails /></> },
  ];

  return <PolicyPage route="/privacy-policy" heading="Privacy Policy" description="How SwiftGrowthDigital collects, uses, stores, and shares information when you visit our website or work with us." sections={sections} />;
}

export function TermsOfService() {
  const sections: PolicySection[] = [
    { heading: "1. Introduction", content: <p>These Terms of Service apply to your use of the SwiftGrowthDigital website and to services we provide, subject to any separate written proposal, order, or service agreement for a project. SwiftGrowthDigital provides digital marketing and technology services, including website and software development, SEO, business automation, and integrations.</p> },
    { heading: "2. Acceptance of Terms", content: <p>By using the website, you agree to follow these terms. A separate written agreement may add to or replace terms for a particular project. If you do not agree, do not use the website.</p> },
    { heading: "3. Services", content: <p>The services available depend on the request, agreed scope, and any written project terms. Website descriptions are general information and do not guarantee availability, suitability, or a specific business outcome.</p> },
    { heading: "4. Website Use", content: <p>You may use the website for lawful information and business inquiries. You are responsible for ensuring that your use follows applicable law and does not interfere with the website or other users.</p> },
    { heading: "5. User Responsibilities", content: <p>Please provide accurate information, maintain access to the contact channels you give us, and ensure that you have permission to share materials, data, or instructions you provide. You are responsible for reviewing work and providing feedback or approvals needed for your project.</p> },
    { heading: "6. Service Requests", content: <p>Submitting a website form or contacting us does not by itself create a service contract or guarantee acceptance of a project. We may ask follow-up questions before deciding whether and how we can help.</p> },
    { heading: "7. Project Scope", content: <p>Deliverables, milestones, dependencies, timelines, revisions, and client responsibilities should be set out in the written proposal or project agreement for each engagement. Work outside the agreed scope may require a separate agreement and fee.</p> },
    { heading: "8. Pricing and Payments", content: <p>Pricing, applicable taxes, billing milestones, due dates, and payment methods are confirmed for the relevant service in its proposal or agreement. Public website information is not a binding quote unless we expressly say so in writing. Any recurring charges, where applicable, will be described in the agreed terms.</p> },
    { heading: "9. Third-Party Services", content: <p>Projects may depend on third-party platforms, hosting providers, software, APIs, or accounts. Their terms, fees, availability, and technical limits apply separately. Unless expressly agreed, third-party costs are not included in our fees.</p> },
    { heading: "10. Website and Software Development Services", content: <p>Development work depends on the agreed scope, access, content, approvals, and third-party systems. You are responsible for checking that supplied materials and final content are accurate and authorized. Maintenance, hosting, licenses, and future changes are included only when agreed.</p> },
    { heading: "11. Digital Marketing Services", content: <p>Marketing performance depends on factors outside our control, including market conditions, platform policies, budgets, competition, and the accuracy of client-provided information. We do not guarantee rankings, leads, sales, reach, or a particular return on investment.</p> },
    { heading: "12. WhatsApp and API Services", content: <p>WhatsApp and other API integrations rely on third-party platforms, approvals, account access, templates, and service availability. You are responsible for having the rights and permissions required to contact your audience and for complying with the applicable platform rules. We do not claim to be certified by or officially partnered with Meta.</p> },
    { heading: "13. Intellectual Property", content: <p>Each party keeps rights in materials it owned before a project. Ownership, license, and handover terms for project deliverables should be stated in the relevant written agreement. Third-party materials remain subject to their own licenses and terms.</p> },
    { heading: "14. User-Provided Content", content: <p>You retain rights in content you provide. You allow us to use that content as needed to assess, perform, and support the requested service. You represent that you have permission for us to use it for those purposes and that it does not knowingly violate another party's rights or applicable law.</p> },
    { heading: "15. Confidentiality", content: <p>Each party should use reasonable care with non-public information received from the other in connection with a project and use it only for the relevant business purpose. This does not cover information already public, independently developed, lawfully received from another source, or required to be disclosed by law.</p> },
    { heading: "16. Availability", content: <p>We aim to keep the website available, but online services can be interrupted for maintenance, technical issues, or events outside our control. We do not guarantee uninterrupted or error-free availability.</p> },
    { heading: "17. Third-Party Platforms", content: <p>We do not control third-party platforms or guarantee that their services, policies, APIs, or accounts will remain available or unchanged. You are responsible for maintaining your own accounts and complying with provider terms.</p> },
    { heading: "18. Prohibited Use", content: <Bullets items={["Do not use the website to break the law, infringe rights, or distribute harmful code.", "Do not attempt unauthorized access, disrupt service, or interfere with security controls.", "Do not use the website or our services to send unlawful, deceptive, or unsolicited communications.", "Do not misrepresent your identity, authority, or permission to provide materials or instructions."]} /> },
    { heading: "19. Limitation of Liability", content: <p>To the extent permitted by applicable law, SwiftGrowthDigital is not liable for indirect, incidental, special, or consequential loss arising from use of the website or services. Any project-specific liability terms will be set out in the applicable agreement. Nothing in these terms excludes liability that cannot lawfully be excluded.</p> },
    { heading: "20. Disclaimer", content: <p>The website and its general information are provided on an as-available basis. Service descriptions and examples are informational and are not guarantees of results. You should obtain independent advice where appropriate before making a business or legal decision.</p> },
    { heading: "21. Termination", content: <p>You may stop using the website at any time. Ending or suspending a paid project, the fees due, and handover obligations are governed by the relevant project agreement. We may restrict access to the website where needed to protect it or comply with law.</p> },
    { heading: "22. Changes to Terms", content: <p>We may update these terms by publishing a revised version on this page. Changes apply to website use from publication. Project terms already agreed in writing remain governed by that agreement unless the parties agree otherwise.</p> },
    { heading: "23. Governing Law", content: <p>These terms are intended to operate subject to applicable laws of India and any mandatory rules that apply to the user or transaction. The appropriate forum, if a dispute arises, will be determined by applicable law and any written project agreement; these website terms do not specify a physical venue or address.</p> },
    { heading: "24. Contact Information", content: <><p>Questions about these terms can be sent to SwiftGrowthDigital:</p><ContactDetails /></> },
  ];

  return <PolicyPage route="/terms-of-service" heading="Terms of Service" description="Terms for using the SwiftGrowthDigital website and engaging our digital marketing and technology services." sections={sections} />;
}

export function DataDeletion() {
  return (
    <PolicyPage
      route="/data-deletion"
      heading="Data Deletion Request"
      description="You can ask SwiftGrowthDigital to delete personal information we have collected or processed, subject to applicable legal and business record requirements."
      sections={[
        { heading: "How to Request Deletion", content: <><p>Send your request to <a className="text-primary underline underline-offset-4" href={`mailto:${EMAIL}`}>{EMAIL}</a>. Include the information below so we can locate the relevant record:</p><ol className="list-decimal space-y-2 pl-5 marker:text-primary"><li>Your full name.</li><li>The email address associated with your inquiry, if applicable.</li><li>Your phone number, if applicable.</li><li>A description of the data, service, or account you want us to review.</li></ol><p>We will review the request and may contact you to verify it or clarify which information is involved. This page provides a human-reviewed request process; it does not submit an automatic deletion or provide an automated confirmation.</p></> },
        { heading: "What Happens Next", content: <p>We will assess the request and take appropriate action on information we control, subject to applicable requirements. Some information may need to be retained where legally required or reasonably necessary for business records, security, fraud prevention, transaction records, or dispute resolution. We will explain if a request cannot be fully completed.</p> },
        { heading: "Contact", content: <><p>For questions about a deletion request, contact SwiftGrowthDigital at:</p><ContactDetails /></> },
      ]}
    >
      <div className="mt-7">
        <Button asChild className="min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Data Deletion Request - SwiftGrowthDigital")}&body=${encodeURIComponent("Full name:\nEmail address:\nPhone number (if applicable):\nData/account to be deleted:\n\nPlease describe the information you would like us to review.")}`}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Request Data Deletion
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </PolicyPage>
  );
}

export function CookiePolicy() {
  const sections: PolicySection[] = [
    { heading: "1. What Cookies Are", content: <p>Cookies are small files saved by a website in your browser. Similar technologies, such as local storage, can remember preferences or support website functions without using a cookie.</p> },
    { heading: "2. Essential Cookies and Browser Storage", content: <p>The site uses browser storage for certain functions, such as remembering a sound preference. The administrative interface may use browser storage for sign-in state and a cookie for its sidebar preference. These functions support site or interface operation rather than advertising.</p> },
    { heading: "3. Analytics Cookies", content: <p>Google Analytics is configured on the website and may use cookies or similar identifiers to measure traffic and interactions, such as page views and form events. Analytics identifiers and data are handled by Google under its own terms.</p> },
    { heading: "4. Functional Cookies", content: <p>Functional browser storage may remember an interface preference or state so the website behaves consistently when you return. If these features are unavailable, some preferences may need to be set again.</p> },
    { heading: "5. Third-Party Cookies", content: <p>Google Analytics is the analytics service currently configured in the website code. We did not find active Meta Pixel, Google Tag Manager, Hotjar, or Microsoft Clarity IDs in the current configuration. If you open a third-party service such as WhatsApp, that service may use its own cookies or similar technologies under its own policy.</p> },
    { heading: "6. How You Can Control Cookies", content: <p>You can use your browser settings to block, limit, or delete cookies and clear local storage. Blocking some storage may affect preferences or signed-in features. The website currently does not provide an on-site cookie preference panel.</p> },
    { heading: "7. Changes to This Cookie Policy", content: <p>We may update this policy if website features or the technologies we use change. The current version and its update date will appear on this page.</p> },
    { heading: "8. Contact", content: <><p>Questions about cookies or similar technologies can be sent to SwiftGrowthDigital:</p><ContactDetails /></> },
  ];

  return <PolicyPage route="/cookie-policy" heading="Cookie Policy" description="Learn which cookies and similar browser technologies are used on this website and how to control them." sections={sections} />;
}

export function RefundPolicy() {
  const sections: PolicySection[] = [
    { heading: "1. General Policy", content: <p>SwiftGrowthDigital provides digital services that may involve custom work, time, tools, and third-party costs. Refund eligibility may depend on the service agreement, project scope, work already completed, third-party costs, and applicable terms agreed with the client. This policy does not create a guaranteed refund amount or period.</p> },
    { heading: "2. Website Development Services", content: <p>For website work, any request is reviewed against the agreed scope, completed design or development work, materials delivered, and project terms. Work already performed or delivered may affect whether a refund is available.</p> },
    { heading: "3. Software Development Services", content: <p>For software and integration work, we consider completed milestones, custom development, configuration, testing, access or licenses obtained, and the agreed project terms when reviewing a request.</p> },
    { heading: "4. Digital Marketing Services", content: <p>Marketing services may include planning, campaign setup, content, optimization, or work performed over time. Fees for completed work and any media or platform costs already incurred may not be refundable, subject to the applicable agreement and law.</p> },
    { heading: "5. Custom Projects", content: <p>Custom projects are reviewed individually based on the approved scope, progress, deliverables, dependencies, and written terms for the engagement.</p> },
    { heading: "6. Advance Payments", content: <p>Any advance or milestone payment is applied as described in the relevant proposal or agreement. Whether an unused portion can be refunded depends on that agreement, work completed, costs incurred, and applicable requirements.</p> },
    { heading: "7. Project Cancellation", content: <p>To cancel a project, send us a written request. We will review the cancellation under the project terms and confirm any outstanding work, amounts due, or refund eligibility. Cancellation does not automatically create a right to a full refund.</p> },
    { heading: "8. Third-Party Costs", content: <p>Fees paid to advertising platforms, hosting companies, software providers, domain registrars, API providers, or other third parties are governed by those providers' terms and may be non-refundable. Any such costs and their treatment should be confirmed for the project.</p> },
    { heading: "9. Subscription or Recurring Services", content: <p>If a service is billed on a recurring basis, the applicable billing, renewal, cancellation, and refund terms will be stated in the service agreement or order. No recurring refund amount or cancellation period is created by this general policy.</p> },
    { heading: "10. Refund Request Process", content: <><p>Email <a className="text-primary underline underline-offset-4" href={`mailto:${EMAIL}?subject=${encodeURIComponent("Refund Request - SwiftGrowthDigital")}`}>{EMAIL}</a> with your name, project or service, payment reference if available, and the reason for your request. We will review the request against the applicable project terms and respond with the outcome or any information needed. Sending a request does not itself confirm that a refund is due.</p></> },
    { heading: "11. Contact", content: <><p>For questions about this policy, contact SwiftGrowthDigital:</p><ContactDetails /></> },
  ];

  return <PolicyPage route="/refund-policy" heading="Refund Policy" description="How cancellation and refund requests are reviewed for digital services, recurring work, and custom projects." sections={sections} />;
}
