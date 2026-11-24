import { useRef, type ChangeEvent } from 'react';
import { Upload, RotateCcw } from 'lucide-react';

const GENERATED_LOGO_URL = '/src/assets/images/home_decor_logo_1795515699272.jpg';

interface ShopLogoSlotProps {
  customLogoDataUrl: string | null;
  onUploadLogo?: (dataUrl: string) => void;
  onResetLogo?: () => void;
  size?: 'sm' | 'lg';
  editable?: boolean;
}

export function ShopLogoSlot({
  customLogoDataUrl,
  onUploadLogo,
  onResetLogo,
  size = 'lg',
  editable = false,
}: ShopLogoSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const dimensionClass = size === 'sm' ? 'w-9 h-9 rounded-lg' : 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl';
  const imgSrc = customLogoDataUrl || GENERATED_LOGO_URL;

  return (
    <div className="flex flex-col items-start gap-1.5 shrink-0">
      <div
        className={`${dimensionClass} relative overflow-hidden bg-[#132642] border border-[#C59B27]/50 flex items-center justify-center shrink-0`}
      >
        <img
          src={imgSrc}
          alt="HOME DECOR showroom logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          aria-hidden="true"
          style={{ display: 'none' }}
          className="w-full h-full items-center justify-center bg-[#0B192C] text-[#D8B458] font-display font-bold tracking-tight text-sm"
        >
          HD
        </div>
      </div>

      {editable && onUploadLogo && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload custom shop logo"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E5C773] hover:text-white transition-colors whitespace-nowrap py-1"
          >
            <Upload className="w-3 h-3" />
            <span>{customLogoDataUrl ? 'Change Logo' : 'Upload Logo'}</span>
          </button>
          {customLogoDataUrl && onResetLogo && (
            <button
              type="button"
              onClick={onResetLogo}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap py-1"
              aria-label="Reset shop logo to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
