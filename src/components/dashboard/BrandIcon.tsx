import { Globe } from 'lucide-react';
import { popularServices } from '../../data/serviceDictionary';

interface BrandIconProps {
  name: string;
  className?: string;
  useBrandColor?: boolean;
}

export default function BrandIcon({
  name,
  className = 'w-5 h-5',
  useBrandColor = false,
}: BrandIconProps) {
  // 1. Try to find the exact service by name (case-insensitive)
  const service = popularServices.find((s) => s.name.toLowerCase() === name.toLowerCase());

  // 2. If found and it has an icon mapped, render it!
  if (service && service.icon) {
    const IconComponent = service.icon;

    return (
      <IconComponent
        className={className}
        style={useBrandColor && service.brandColor ? { color: service.brandColor } : undefined}
      />
    );
  }

  // 3. Fallback: If it's a custom website we don't know, use the generic Globe
  return <Globe className={className} />;
}
