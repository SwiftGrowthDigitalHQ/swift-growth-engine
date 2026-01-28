import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { trackConversion } from '@/lib/analytics';
import { MessageCircle, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
  source?: string;
  onSuccess?: () => void;
}

interface SubmissionResult {
  success: boolean;
  leadName?: string;
  businessType?: string;
  city?: string;
  error?: string;
}

const businessTypes = [
  'Dental Clinic',
  'Medical Clinic',
  'Real Estate',
  'Restaurant',
  'Cloud Kitchen',
  'Salon / Spa',
  'Gym / Fitness',
  'Education / Coaching',
  'E-commerce',
  'Other',
];

export function ContactForm({ source = 'contact_form', onSuccess }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    business_type: '',
    city: '',
    whatsapp: '',
  });

  const resetForm = () => {
    setFormData({ name: '', business_type: '', city: '', whatsapp: '' });
    setSubmissionResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.business_type) {
      toast.error('Please select your business type');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('Please enter your city');
      return;
    }
    if (!formData.whatsapp.trim()) {
      toast.error('Please enter your WhatsApp number');
      return;
    }

    const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10) {
      toast.error('Please enter a valid 10-digit WhatsApp number');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('submit-lead', {
        body: {
          name: formData.name.trim(),
          business_type: formData.business_type,
          city: formData.city.trim(),
          whatsapp: cleanedWhatsapp,
          source,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to submit form');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Submission failed');
      }

      // Track conversion
      trackConversion.leadFormSubmit(source, formData.business_type);

      // Set success state
      setSubmissionResult({
        success: true,
        leadName: formData.name.trim(),
        businessType: formData.business_type,
        city: formData.city.trim(),
      });

      toast.success('🎉 Thank you! Your request has been received.');

      // Open WhatsApp with pre-filled message after a short delay
      setTimeout(() => {
        const message = encodeURIComponent(
          `Hi, I'm ${formData.name.trim()} from ${formData.city.trim()}.\n\n` +
          `I run a ${formData.business_type} and I'm interested in growing my business with digital marketing.\n\n` +
          `Please share more details about your services.`
        );
        window.open(`https://wa.me/919229721835?text=${message}`, '_blank');
      }, 2000);

      onSuccess?.();
    } catch (err) {
      console.error('Form submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      
      setSubmissionResult({
        success: false,
        error: errorMessage,
      });
      
      toast.error('Submission failed. Please try again or contact us on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success State
  if (submissionResult?.success) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-whatsapp/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <CheckCircle className="w-10 h-10 text-whatsapp" />
        </div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-3">
          Thank You, {submissionResult.leadName}! 🎉
        </h3>
        <p className="text-muted-foreground mb-2">
          We've received your request for <span className="text-primary font-medium">{submissionResult.businessType}</span> marketing.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Our team will contact you on WhatsApp within 1 hour during business hours.
        </p>
        <div className="bg-card/50 rounded-xl p-4 border border-border mb-6">
          <p className="text-sm text-muted-foreground">
            📱 Redirecting to WhatsApp to start the conversation...
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetForm}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Submit Another Request
        </Button>
      </div>
    );
  }

  // Error State
  if (submissionResult?.success === false) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-3">
          Oops! Something went wrong
        </h3>
        <p className="text-muted-foreground mb-6">
          {submissionResult.error || 'Please try again or contact us directly on WhatsApp.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={resetForm}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <a href="https://wa.me/919229721835?text=Hi%2C%20I%20had%20trouble%20submitting%20the%20contact%20form.%20Please%20help." target="_blank" rel="noopener noreferrer">
            <Button variant="whatsapp" className="gap-2 w-full">
              <MessageCircle className="w-4 h-4" />
              Contact on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Form State
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name *</Label>
        <Input
          id="name"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
          disabled={isSubmitting}
          className="bg-background/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_type">Business Type *</Label>
        <Select
          value={formData.business_type}
          onValueChange={(value) => setFormData({ ...formData, business_type: value })}
          disabled={isSubmitting}
        >
          <SelectTrigger className="bg-background/50">
            <SelectValue placeholder="Select your business type" />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          placeholder="e.g., Mumbai, Delhi, Bangalore"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
          maxLength={100}
          disabled={isSubmitting}
          className="bg-background/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp Number *</Label>
        <Input
          id="whatsapp"
          type="tel"
          placeholder="e.g., 9876543210"
          value={formData.whatsapp}
          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          required
          maxLength={15}
          disabled={isSubmitting}
          className="bg-background/50"
        />
        <p className="text-xs text-muted-foreground">
          Enter 10-digit mobile number (without country code)
        </p>
      </div>

      <Button
        type="submit"
        variant="whatsapp"
        size="lg"
        className="w-full btn-shine"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            Get Free Consultation
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        ✅ We'll contact you on WhatsApp within 1 hour during business hours (10 AM - 7 PM).
      </p>
    </form>
  );
}
