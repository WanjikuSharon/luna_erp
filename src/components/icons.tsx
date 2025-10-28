import type { SVGProps } from 'react';
import Image from 'next/image';

const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';


export function Logo({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <div className={cn("relative", className)} {...props}>
        <Image
            src={newLogoUrl}
            alt="Luna Industries Logo"
            fill
            className="object-contain"
        />
    </div>
  );
}
