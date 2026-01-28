import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { trackConversion } from '@/lib/analytics';
import { MessageCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
  source?: string;
  onSuccess?: () => void;
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    business_type: '',
    city: '',
    whatsapp: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.name || !formData.business_type || !formData.city || !formData.whatsapp) {
      toast.error('Please fill all fields');
      return;
    }

    const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10) {
      toast.error('Please enter a valid WhatsApp number');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-lead', {
        body: {
          ...formData,
          whatsapp: cleanedWhatsapp,
          source,
        },
      });

      if (error) throw error;

      // Track conversion
      trackConversion.leadFormSubmit(source, formData.business_type);

      setIsSuccess(true);
      toast.success('Thank you! We\'ll contact you shortly on WhatsApp.');

      // Open WhatsApp with pre-filled message after a short delay
      setTimeout(() => {
        const message = encodeURIComponent(
          `Hi, I'm ${formData.name} from ${formData.city}.\n\n` +
          `I run a ${formData.business_type} and I'm interested in growing my business with digital marketing.\n\n` +
          `Please share more details about your services.`
        );
        window.open(`https://wa.me/919229721835?text=${message}`, '_blank');
      }, 1500);

      onSuccess?.();
    } catch (err) {
      console.error('Form submission error:', err);
      toast.error('Something went wrong. Please try WhatsApp directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display font-bold text-foreground mb-2">
          Thank You! 🎉
        </h3>
        <p className="text-muted-foreground mb-4">
          We'll reach out on WhatsApp shortly.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting to WhatsApp...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name</Label>
        <Input
          id="name"
          placeholder="Enter your name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_type">Business Type</Label>
        <Select
          value={formData.business_type}
          onValueChange={(value) => setFormData({ ...formData, business_type: value })}
        >
          <SelectTrigger>
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
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          placeholder="e.g., Mumbai, Delhi, Bangalore"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp Number</Label>
        <Input
          id="whatsapp"
          type="tel"
          placeholder="e.g., 9876543210"
          value={formData.whatsapp}
          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          required
          maxLength={15}
        />
      </div>

      <Button
        type="submit"
        variant="whatsapp"
        size="lg"
        className="w-full"
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
        We'll contact you on WhatsApp within 1 hour during business hours.
      </p>
    </form>
  );
}
