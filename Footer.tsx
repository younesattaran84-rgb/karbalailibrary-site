import React from 'react';
import { MapPin, Clock, Phone, Heart, ExternalLink, ShieldCheck } from 'lucide-react';
import { LibraryLogo } from './LibraryLogo';
import { EitaaIcon } from './EitaaIcon';
import { isLibraryOpenNow } from '../utils/persian';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenAdmin: () => void;
}

const RedTulip: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block filter drop-shadow-[0_0_5px_rgba(239,68,68,0.7)] ${className}`}
  >
    {/* Center Petal */}
    <path
      d="M12 2.5C10.6 5.8 9.8 8.8 9.8 11.8C9.8 14.3 10.7 16.2 12 16.8C13.3 16.2 14.2 14.3 14.2 11.8C14.2 8.8 13.4 5.8 12 2.5Z"
      fill="#ef4444"
    />
    {/* Left Petal */}
    <path
      d="M12 16.8C9.2 16.2 6.2 13.2 5.2 9.2C7 9 9 9.8 9.8 11.8C9.8 14 10.7 15.8 12 16.8Z"
      fill="#dc2626"
    />
    {/* Right Petal */}
    <path
      d="M12 16.8C14.8 16.2 17.8 13.2 18.8 9.2C17 9 15 9.8 14.2 11.8C14.2 14 13.3 15.8 12 16.8Z"
      fill="#b91c1c"
    />
    {/* Green Stem */}
    <path
      d="M12 16.8V22"
      stroke="#16a34a"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAdmin }) => {
  const status = isLibraryOpenNow();

  return (
    <footer className="bg-[#031d1c] border-t-2 border-[#0d9488]/40 text-[#ccfbf1] text-right pt-16 pb-12 select-none relative overflow-hidden">
      
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 right-1/3 w-80 h-80 rounded-full bg-[#0d9488]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#0d9488]/25">
          
          {/* Col 1: High Contrast Library Logo & About */}
          <div className="space-y-4">
            <div className="inline-block p-2 rounded-2xl bg-[#073834] border border-[#0d9488]/40 shadow-md">
              <LibraryLogo size="md" />
            </div>

            <p className="text-xs leading-relaxed text-[#99f6e4] text-justify font-normal">
              کتابخانه شهید احسان کربلایی‌پور، در جوار مسجد امام خمینی (ره) اهواز؛ کانون پیوند اندیشه، معنویت، آگاهی و فرهنگ ایثار و شهادت با بیش از ۷۰۰۰ جلد کتاب تخصصی.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#073834] border border-[#0d9488]/40 text-[11px] text-[#a3e635]">
              <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-[#a3e635] animate-ping' : 'bg-rose-500'}`} />
              <span>{status.statusText} (۱۳:۰۰ الی ۲۰:۰۰)</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-black text-white mb-4 pb-2 border-b border-[#0d9488]/30 flex items-center gap-1.5">
              <span>بخش‌های اصلی پایگاه</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-[#ccfbf1]">
              {[
                { id: 'books', label: 'همه کتاب‌ها' },
                { id: 'intro', label: 'معرفی ۴ کتاب برگزیده' },
                { id: 'competitions', label: 'مسابقات بزرگ کتابخوانی' },
                { id: 'faq', label: 'پرسش‌های متداول مراجعان' },
                { id: 'rules', label: 'آیین‌نامه و قوانین امانت' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (link.id === 'rules') {
                        onNavigate('home');
                        setTimeout(() => {
                          const el = document.getElementById('rules-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 200);
                      } else {
                        onNavigate(link.id);
                      }
                    }}
                    className="hover-hop text-right hover:text-[#a3e635] transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-[#84cc16]">‹</span>
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Exact Address and Map */}
          <div>
            <h4 className="text-sm font-black text-white mb-4 pb-2 border-b border-[#0d9488]/30 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#84cc16]" />
              <span>نشانی و موقعیت مکانی</span>
            </h4>
            
            <p className="text-xs leading-relaxed text-[#99f6e4] mb-3">
              اهواز، فاز دو پادادشهر، بلوار سعادت، مسجد امام خمینی(ره)، طبقه فوقانی، کتابخانه شهید احسان کربلایی‌پور
            </p>

            <a
              href="https://nshn.ir/8brbkMj5IBbN0X"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#073834] hover:bg-[#0d9488]/30 border border-[#0d9488]/50 text-[#99f6e4] hover:text-white text-xs font-bold transition-all shadow-sm group"
            >
              <MapPin className="w-4 h-4 text-[#84cc16] group-hover:scale-125 transition-transform" />
              <span>مسیریابی مستقیم در نشان</span>
              <ExternalLink className="w-3 h-3 text-[#5eead4]" />
            </a>

            <p className="mt-2.5 text-[11px] leading-relaxed text-[#a3e635]">
              💡 بعد از ورود به حیاط مسجد امام خمینی(ره)، جنب پایگاه بسیج، زنگ درب کتابخانه قرار دارد،
            </p>
          </div>

          {/* Col 4: Eitaa & Communication */}
          <div>
            <h4 className="text-sm font-black text-white mb-4 pb-2 border-b border-[#0d9488]/30 flex items-center gap-1.5">
              <span>ارتباط و کانال ایتا</span>
            </h4>

            <p className="text-xs leading-relaxed text-[#99f6e4] mb-3">
              برای آگاهی از مسابقات، کتب تازه رسیده و اطلاعیه‌های ثبت‌نام در کانال رسمی ما عضو شوید:
            </p>

            <a
              href="https://eitaa.com/shahidKarbalailibrary"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-md hover:scale-105"
            >
              <EitaaIcon size={20} />
              <span>کانال ایتا: @shahidKarbalailibrary</span>
            </a>

            <div className="mt-4 pt-3 border-t border-[#0d9488]/20 flex items-center justify-between text-[11px]">
              <span className="text-[#99f6e4]">ورود کادر کتابخانه:</span>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-[#84cc16] font-bold hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>پنل مدیریت</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Memorial Dedication - Fully Mobile Responsive */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#99f6e4]/80 text-center sm:text-right">
          <p>
            تمامی حقوق مادی و معنوی متعلق به <strong className="text-white">کتابخانه شهید احسان کربلایی‌پور</strong> است.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-xs">
            <span className="text-white/95 font-semibold bg-[#073834] px-3 py-1 rounded-lg border border-[#0d9488]/30">
              طراح: <strong className="text-[#84cc16] font-bold">یونس عطاران زاده</strong>
            </span>
            <span className="hidden sm:inline text-[#0d9488]">|</span>
            <div className="flex items-center gap-1.5 text-[#ccfbf1]">
              <span>گرامی‌باد یاد شهید مدافع حرم</span>
              <strong className="text-[#84cc16]">احسان کربلایی‌پور</strong>
              <RedTulip className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
