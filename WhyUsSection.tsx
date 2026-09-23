import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Users, HeartHandshake, Calendar } from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

export const WhyUsSection: React.FC = () => {
  const points = [
    {
      id: 1,
      title: 'مجموعه‌ای متنوع از کتاب‌ها در حوزه‌های مختلف',
      description: 'دارای +۷۰۰۰ جلد کتاب در موضوعات متنوع معارفی،تاریخی،علمی،ادبی،کودک و نوجوان برای تمام سلیقه‌ها.',
      icon: BookOpen,
      color: 'from-[#0d9488] to-[#0f766e]',
      accentBg: 'bg-[#0d9488]/20',
      badge: 'تنوع بالا',
    },
    {
      id: 2,
      title: 'فضای مطالعه آرام برای علاقه‌مندان به کتاب و پژوهش',
      description: 'سالن مطالعه آرام، منظم و استاندارد برای مطالعه روزانه، نگارش مقالات، آماده‌سازی آزمون‌ها و تمرکز فکری.',
      icon: Sparkles,
      color: 'from-[#84cc16] to-[#65a30d]',
      accentBg: 'bg-[#84cc16]/20',
      badge: 'سکوت و تمرکز',
    },
    {
      id: 3,
      title: 'عضویت برای عموم علاقه‌مندان',
      description: 'فراهم‌سازی فضایی پویا برای امانت حضوری و بهره‌مندی تمامی اقشار جامعه از گنجینه ارزشمند کتاب‌ها،',
      icon: Users,
      color: 'from-[#0284c7] to-[#0369a1]',
      accentBg: 'bg-[#0284c7]/20',
      badge: 'دسترسی همگانی',
    },
    {
      id: 4,
      title: 'آرامش معنوی در کنار عطر مسجد',
      description: 'استقرار در حیاط باصفای مسجد امام خمینی (ره) و آمیختگی دانش و مطالعه با معنویت و اخلاق ناب.',
      icon: HeartHandshake,
      color: 'from-[#eab308] to-[#ca8a04]',
      accentBg: 'bg-[#eab308]/20',
      badge: 'فضای معنوی',
    },
    {
      id: 5,
      title: 'برنامه‌های فرهنگی در طول سال',
      description: 'برگزاری مسابقات کتابخوانی با جوایز نفیس، نشست‌های نقد کتاب، مشاوره‌های تخصصی مطالعه و برنامه‌های مناسبتی.',
      icon: Calendar,
      color: 'from-[#ec4899] to-[#be185d]',
      accentBg: 'bg-[#ec4899]/20',
      badge: 'رویدادهای پویا',
    },
  ];

  return (
    <section className="py-20 bg-[#073834] relative overflow-hidden border-b border-[#0d9488]/30">
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#0d9488]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-[#84cc16]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-12"
        >
          <span className="px-4 py-1 rounded-full bg-[#042f2e] border border-[#84cc16]/40 text-[#a3e635] text-xs font-black inline-block mb-3">
            امتیازات و ویژگی‌ها
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white hover-hop">
            <span className="shimmer-text">چرا کتابخانه ما؟</span>
          </h2>
        </motion.div>

        {/* 5 Cards Grid with Alternating Scroll Entrance (Right, Bottom, Left) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {points.map((p, idx) => {
            const Icon = p.icon;
            // Alternating entrance: 0 from right, 1 from bottom, 2 from left, 3 from right, 4 from bottom
            const initialX = idx % 3 === 0 ? 55 : idx % 3 === 2 ? -55 : 0;
            const initialY = idx % 3 === 1 ? 50 : 25;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: initialX, y: initialY }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: (idx % 3) * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className={`relative rounded-3xl bg-[#042f2e]/90 hover:bg-[#042f2e] border border-[#0d9488]/40 hover:border-[#84cc16]/60 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group flex flex-col justify-between ${
                  idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#073834] text-[#a3e635] border border-[#0d9488]/40">
                      {p.badge}
                    </span>
                    <div className={`p-3 rounded-2xl ${p.accentBg} text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-[#84cc16]" />
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-white leading-snug group-hover:text-[#a3e635] transition-colors mb-3">
                    {p.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#ccfbf1]/85 leading-relaxed font-normal">
                    {p.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#0d9488]/20 flex items-center justify-between text-xs text-[#5eead4]">
                  <span>کتابخانه شهید کربلایی‌پور</span>
                  <span className="font-bold text-[#84cc16]">۰{toPersianDigits(p.id)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
