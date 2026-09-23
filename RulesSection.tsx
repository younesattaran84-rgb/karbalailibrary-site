import React from 'react';
import { motion } from 'motion/react';
import { UserCheck, BookCopy, VolumeX, Library, CheckCircle } from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

export const RulesSection: React.FC = () => {
  const steps = [
    {
      step: '۱',
      title: 'شرایط عضویت',
      icon: UserCheck,
      color: 'from-[#0d9488] to-[#0f766e]',
      accentBg: 'bg-[#0d9488]/20',
      items: [
        'عضویت در کتابخانه برای عموم علاقه‌مندان و پژوهشگران آزاد است.',
        'برای ثبت‌نام، تکمیل فرم کتابخانه و به همراه داشتن یک کارت شناسایی معتبر لازم است.',
        'مدت اعتبار عضویت یک سال کامل است و پس از آن با مراجعه به کتابدار قابل تمدید می‌باشد.',
      ],
    },
    {
      step: '۲',
      title: 'امانت کتاب',
      icon: BookCopy,
      color: 'from-[#84cc16] to-[#65a30d]',
      accentBg: 'bg-[#84cc16]/20',
      items: [
        'امانت کتاب اشتراک جداگانه‌ای نسبت به اشتراک عضویت پایه کتابخانه دارد.',
        'هر عضو می‌تواند همزمان تا سقف ۴ کتاب را برای حداقل ۱ هفته و حداکثر ۴ هفته امانت بگیرد.',
        'در صورت عدم رزرو توسط سایر مراجعان، تا ۲ هفته امکان تمدید امانت وجود دارد.',
        'در صورت تأخیر در بازگرداندن کتاب، جریمه نقدی جزئی طبق تعرفه دریافت می‌گردد.',
        'در صورت مفقودی یا آسیب جدی به کتاب، عضو موظف به جبران معادل قیمت روز کتاب است.',
      ],
    },
    {
      step: '۳',
      title: 'رفتار و نظم',
      icon: VolumeX,
      color: 'from-[#0284c7] to-[#0369a1]',
      accentBg: 'bg-[#0284c7]/20',
      items: [
        'رعایت کامل سکوت و آرامش در تمام بخش‌های سالن مطالعه ضروری است.',
        'استفاده از تلفن همراه به‌صورت بی‌صدا (Silent) بوده و مکالمه در سالن مطالعه اکیداً ممنوع است.',
        'خارج کردن هرگونه کتاب بدون ثبت رسمی در سیستم توسط کتابدار غیرمجاز است.',
        'حفظ نظافت، پاکیزگی و مرتب نگه‌داشتن میزها و صندلی‌ها بر عهده استفاده‌کنندگان محترم است.',
      ],
    },
    {
      step: '۴',
      title: 'استفاده از منابع و فضا',
      icon: Library,
      color: 'from-[#eab308] to-[#ca8a04]',
      accentBg: 'bg-[#eab308]/20',
      items: [
        'جابه‌جایی کتاب‌ها از قفسه‌ها به سایر بخش‌ها مجاز نیست؛ پس از مطالعه در محل مخصوص عودت قرار دهید.',
        'استفاده از لپ‌تاپ و تبلت برای مطالعه و پژوهش آزاد است، مشروط به عدم ایجاد مزاحمت برای دیگران.',
        'برگزاری جلسات گروهی و نشست‌های کتابخوانی صرفاً با هماهنگی قبلی با مسئول کتابخانه انجام می‌شود.',
      ],
    },
  ];

  return (
    <section id="rules-section" className="py-20 bg-[#042f2e] relative overflow-hidden border-b border-[#0d9488]/30">
      {/* Glow elements */}
      <div className="absolute top-1/2 left-0 w-72 h-72 rounded-full bg-[#0d9488]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header - Phase 16: Title strictly 'قوانین و مقررات کتابخانه' */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-white hover-hop tracking-tight">
            قوانین و مقررات کتابخانه
          </h2>
        </motion.div>

        {/* 4 Staggered Steps with Dynamic Scroll Entrance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            // Direction: 0 from right (x: 50), 1 & 2 from bottom (y: 50), 3 from left (x: -50)
            const initialX = idx === 0 ? 55 : idx === 3 ? -55 : 0;
            const initialY = (idx === 1 || idx === 2) ? 50 : 25;

            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: initialX, y: initialY }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between group"
              >
                <div>
                  {/* Step header with badge */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-[#042f2e] text-[#a3e635] border border-[#84cc16]/40">
                      مرحله {toPersianDigits(item.step)}#
                    </span>
                    <div className={`p-3 rounded-2xl ${item.accentBg} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-[#84cc16]" />
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-white mb-4 hover:text-[#a3e635] transition-colors">
                    {item.title}
                  </h3>

                  <ul className="space-y-3 text-xs sm:text-sm text-[#ccfbf1]/90">
                    {item.items.map((line, idx2) => (
                      <li key={idx2} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle className="w-4 h-4 text-[#84cc16] shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#0d9488]/20 flex items-center justify-between text-[11px] text-[#5eead4]">
                  <span>کتابخانه شهید احسان کربلایی‌پور</span>
                  <span className="font-bold text-[#84cc16]">گام {toPersianDigits(item.step)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
