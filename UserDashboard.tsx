import React, { useState, useEffect } from 'react';
import {
  Shield,
  BookOpen,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle,
  Bookmark,
} from 'lucide-react';
import { UserProfile, Reservation, UserMessage } from '../types';
import { toPersianDigits, getDaysRemaining } from '../utils/persian';
import { PaginationControls } from './PaginationControls';

interface UserDashboardProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onExtendReservation?: (reservationId: string, weeks?: 1 | 2) => Promise<boolean>;
  onRefreshReservations?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigateHome,
  onNavigateCatalog,
  onExtendReservation,
  onRefreshReservations,
}) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'messages'>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [deletingResId, setDeletingResId] = useState<string | null>(null);

  // Pagination for User's Reservations
  const [resPage, setResPage] = useState(1);
  const [resPageSize, setResPageSize] = useState(10);

  // Messages State
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  // Pagination for User's Messages
  const [msgPage, setMsgPage] = useState(1);
  const [msgPageSize, setMsgPageSize] = useState(10);

  // Notifications / Feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Announcement State
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string } | null>(null);
  const [announcementSeen, setAnnouncementSeen] = useState<boolean>(false);

  // Seen Replies State
  const [seenReplyIds, setSeenReplyIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lib_user_seen_replies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch('/api/announcement')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.announcement_enabled && data.announcement_text) {
          setAnnouncement({ enabled: true, text: data.announcement_text });
          const seenKey = `lib_announcement_seen_${encodeURIComponent(data.announcement_text.slice(0, 30))}`;
          const isSeen = localStorage.getItem(seenKey) === 'true';
          setAnnouncementSeen(isSeen);
        } else {
          setAnnouncement(null);
        }
      })
      .catch(() => {});
  }, []);

  const handleMarkAnnouncementSeen = () => {
    if (!announcement?.text) return;
    const seenKey = `lib_announcement_seen_${encodeURIComponent(announcement.text.slice(0, 30))}`;
    localStorage.setItem(seenKey, 'true');
    setAnnouncementSeen(true);
  };

  const markReplyAsSeen = (id: string) => {
    setSeenReplyIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('lib_user_seen_replies', JSON.stringify(next));
      return next;
    });
  };

  const unreadRepliesCount = messages.filter(
    (m) => m.admin_reply && !seenReplyIds.includes(m.id)
  ).length;

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4500);
  };

  // Fetch User's Reservations
  const fetchReservations = async () => {
    if (!currentUser?.phone) return;
    setLoadingReservations(true);
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      if (data.success && Array.isArray(data.reservations)) {
        const userList = data.reservations.filter((r: Reservation) => r.user_phone === currentUser.phone);
        setReservations(userList);
      }
    } catch (err: any) {
      console.warn('Could not load reservations', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Fetch User's Messages
  const fetchMessages = async () => {
    if (!currentUser?.phone) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?phone=${currentUser.phone}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err: any) {
      console.warn('Could not load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    fetchMessages();
  }, [currentUser?.phone]);

  // Handle Send New Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) {
      showError('لطفاً متن پیام را وارد کنید.');
      return;
    }
    setMsgSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: `${currentUser.name} ${currentUser.family}`,
          user_phone: currentUser.phone,
          subject: msgSubject.trim() || 'پیام کاربر',
          content: msgText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('پیام شما با موفقیت برای مدیریت ارسال شد و در وضعیت «در حال بررسی» قرار گرفت.');
        setMsgSubject('');
        setMsgText('');
        fetchMessages();
      } else {
        showError(data.message || 'خطا در ارسال پیام');
      }
    } catch (err: any) {
      showError(err.message || 'خطای شبکه در ارسال پیام');
    } finally {
      setMsgSending(false);
    }
  };

  // Handle User Deleting Their Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('آیا از حذف این پیام اطمینان دارید؟')) return;
    setDeletingMsgId(msgId);
    try {
      const res = await fetch(`/api/messages/${msgId}?phone=${currentUser.phone}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('پیام مورد نظر با موفقیت حذف گردید.');
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        showError(data.message || 'خطا در حذف پیام');
      }
    } catch (err: any) {
      showError(err.message || 'خطا در حذف پیام');
    } finally {
      setDeletingMsgId(null);
    }
  };

  // Handle Deleting Finished Reservation Record
  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm('آیا مایل به حذف این رکورد از تاریخچه رزروهای خود هستید؟')) return;
    setDeletingResId(reservationId);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('رکورد با موفقیت از تاریخچه حذف شد.');
        setReservations((prev) => prev.filter((r) => r.id !== reservationId));
        if (onRefreshReservations) onRefreshReservations();
      } else {
        showError(data.message || 'تنها رکوردهای تحویل داده‌شده یا لغوشده قابلیت حذف دارند.');
      }
    } catch (err: any) {
      showError(err.message || 'خطا در حذف رکورد');
    } finally {
      setDeletingResId(null);
    }
  };

  const activeReservationsCount = reservations.filter(
    (r) => r.status === 'امانت فعال' || r.status === 'در انتظار بررسی' || r.status === 'تأیید شده'
  ).length;

  // Paginated Slices
  const paginatedReservations = reservations.slice(
    (resPage - 1) * resPageSize,
    resPage * resPageSize
  );

  const paginatedMessages = messages.slice(
    (msgPage - 1) * msgPageSize,
    msgPage * msgPageSize
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#042f2e] via-[#073834] to-[#042f2e] text-[#f0fdfa] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#84cc16] selection:text-[#042f2e]">
      {/* Toast Messages */}
      {successToast && (
        <div className="fixed top-24 right-4 z-50 p-4 rounded-2xl bg-[#84cc16] text-[#042f2e] font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-24 right-4 z-50 p-4 rounded-2xl bg-rose-600 text-white font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Centered Minimal Container */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#073834]/90 border border-[#0d9488]/40 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#84cc16] text-[#042f2e] flex items-center justify-center font-black text-xl shadow-md">
              {currentUser.name?.[0] || 'ع'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">
                  {currentUser.name} {currentUser.family}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#042f2e] text-[#84cc16] border border-[#84cc16]/40">
                  عضو کتابخانه
                </span>
              </div>
              <p className="text-xs text-[#99f6e4] mt-0.5">
                شماره همراه: {toPersianDigits(currentUser.phone)}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateCatalog}
              className="px-4 py-2 rounded-2xl bg-[#0d9488] hover:bg-[#14b8a6] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#84cc16]" />
              <span>مشاهده کتاب‌ها / امانت</span>
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-4 py-2 rounded-2xl bg-[#042f2e] hover:bg-[#073834] text-[#99f6e4] hover:text-white font-bold text-xs border border-[#0d9488]/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>صفحه اصلی</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs border border-rose-800/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Important Announcements Section with Red Dot Notification */}
        {announcement && announcement.enabled && announcement.text && (
          <div className="relative p-5 rounded-3xl bg-gradient-to-r from-[#073834] via-[#08423e] to-[#042f2e] border-2 border-[#84cc16]/50 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              {/* Red Dot Indicator with Pulse */}
              {!announcementSeen && (
                <div className="relative flex h-3.5 w-3.5 mt-1 sm:mt-0 shrink-0" title="اطلاعیه جدید">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 shadow-md shadow-rose-500/50"></span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-white text-sm font-black">اطلاعیه مهم کتابخانه</strong>
                  {!announcementSeen ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-900/90 text-rose-200 border border-rose-500/40 animate-pulse">
                      جدید
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#042f2e] text-[#99f6e4] border border-[#0d9488]/40">
                      مشاهده شده
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#ccfbf1] mt-1 leading-relaxed">
                  {announcement.text}
                </p>
              </div>
            </div>
            {!announcementSeen && (
              <button
                type="button"
                onClick={handleMarkAnnouncementSeen}
                className="px-3.5 py-1.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] text-xs font-black shadow-md transition-colors shrink-0 self-end sm:self-center cursor-pointer"
              >
                متوجه شدم (دیدم)
              </button>
            )}
          </div>
        )}

        {/* Minimal Tab Buttons - Centered */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-[#073834]/90 border border-[#0d9488]/30 shadow-md">
            <button
              type="button"
              onClick={() => setActiveTab('reservations')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'reservations'
                  ? 'bg-[#84cc16] text-[#042f2e] shadow-md font-black'
                  : 'text-[#ccfbf1] hover:text-[#84cc16] hover:bg-[#042f2e]/60'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>رزروها و امانت‌ها</span>
              {activeReservationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#042f2e] text-[#84cc16] font-black">
                  {toPersianDigits(activeReservationsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-[#84cc16] text-[#042f2e] shadow-md font-black'
                  : 'text-[#ccfbf1] hover:text-[#84cc16] hover:bg-[#042f2e]/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>پیام‌ها و پشتیبانی</span>
              {unreadRepliesCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600 text-white font-black">
                    {toPersianDigits(unreadRepliesCount)}
                  </span>
                </span>
              ) : messages.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#042f2e] text-[#84cc16] font-black">
                  {toPersianDigits(messages.length)}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Golden Rotating Aura Border Container wrapping the active section */}
        <div className="golden-rotating-border-container shadow-2xl">
          <div className="golden-rotating-border-inner p-5 sm:p-7">
            
            {/* ========================================================= */}
            {/* SECTION 1: RESERVATIONS & BORROWINGS */}
            {/* ========================================================= */}
            {activeTab === 'reservations' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-[#0d9488]/30 pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-[#84cc16]" />
                      <span>رزروها و امانت‌های من</span>
                    </h3>
                    <p className="text-xs text-[#99f6e4] mt-0.5">
                      پیگیری وضعیت امانت فعال، سررسیدها و امکان تمدید آنلاین
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchReservations}
                    className="p-2 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 transition-colors"
                    title="تازه‌سازی"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingReservations ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingReservations ? (
                  <div className="py-12 text-center text-xs text-[#99f6e4]">
                    در حال بارگذاری لیست رزروها...
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#99f6e4] space-y-3">
                    <p>هنوز هیچ کتابی را به امانت نگرفته‌اید یا رزرو نکرده‌اید.</p>
                    <button
                      type="button"
                      onClick={onNavigateCatalog}
                      className="px-5 py-2 rounded-xl bg-[#84cc16] text-[#042f2e] font-black text-xs inline-flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>مشاهده کتاب‌ها / امانت</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {paginatedReservations.map((res) => {
                        const daysLeft = res.due_date ? getDaysRemaining(res.due_date) : null;
                        const canExtend = res.status === 'امانت فعال' && daysLeft !== null && daysLeft <= 3 && !res.extension_status;
                        const hasAlreadyExtended = res.extension_status === 'تأیید شده';
                        const canDelete = res.status === 'تحویل داده شده' || res.status === 'لغو شده' || res.status === 'رد شده';

                        return (
                          <div
                            key={res.id}
                            className="p-4 sm:p-5 rounded-2xl bg-[#042f2e]/80 border border-[#0d9488]/40 hover:border-[#84cc16]/50 transition-all space-y-3 text-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0d9488]/20 pb-3">
                              <div>
                                <h4 className="text-sm sm:text-base font-black text-white">{res.book_title}</h4>
                                <span className="text-[11px] text-[#5eead4]">
                                  قفسه {toPersianDigits(res.shelf)} / ردیف {toPersianDigits(res.row_number || 1)}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <span
                                className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border ${
                                  res.status === 'امانت فعال'
                                    ? 'bg-emerald-950 text-[#a3e635] border-[#84cc16]/50'
                                    : res.status === 'در انتظار بررسی'
                                    ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                                    : res.status === 'تحویل داده شده'
                                    ? 'bg-[#042f2e] text-[#99f6e4] border-[#0d9488]/30'
                                    : 'bg-rose-950 text-rose-300 border-rose-700/50'
                                }`}
                              >
                                {res.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div className="p-2 rounded-xl bg-[#073834]/60 border border-[#0d9488]/20">
                                <span className="text-[10px] text-[#99f6e4] block">تاریخ ثبت درخواست:</span>
                                <strong className="text-white font-mono">{toPersianDigits(res.request_date || '-')}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-[#073834]/60 border border-[#0d9488]/20">
                                <span className="text-[10px] text-[#99f6e4] block">موعد بازگشت:</span>
                                <strong className="text-[#a3e635] font-mono">{toPersianDigits(res.due_date || 'تعیین نشده')}</strong>
                              </div>
                              {res.due_date && daysLeft !== null && (
                                <div
                                  className={`p-2 rounded-xl col-span-2 sm:col-span-1 flex flex-col justify-center ${
                                    daysLeft < 0
                                      ? 'bg-rose-950/70 text-rose-300 border border-rose-700/50'
                                      : daysLeft <= 3
                                      ? 'bg-amber-950/70 text-amber-300 border border-amber-600/50'
                                      : 'bg-[#073834]/60 text-[#99f6e4] border border-[#0d9488]/20'
                                  }`}
                                >
                                  <span className="text-[10px] block">وضعیت سررسید:</span>
                                  <strong className="font-black text-[11px]">
                                    {daysLeft < 0
                                      ? `${toPersianDigits(Math.abs(daysLeft))} روز تاخیر`
                                      : `${toPersianDigits(daysLeft)} روز باقی‌مانده`}
                                  </strong>
                                </div>
                              )}
                            </div>

                            {/* Extension Notes */}
                            {res.extension_status === 'در انتظار بررسی' && (
                              <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-600/40 text-xs text-amber-300 text-center font-bold">
                                ⏳ درخواست تمدید ({toPersianDigits(res.extension_requested_weeks || 1)} هفته) به مدیریت ارسال شد.
                              </div>
                            )}
                            {res.extension_status === 'تأیید شده' && (
                              <div className="p-2 rounded-xl bg-emerald-950/50 border border-[#84cc16]/40 text-xs text-[#a3e635] text-center font-bold">
                                ✓ درخواست تمدید این امانت تأیید شده است.
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-[#0d9488]/20 flex flex-wrap items-center justify-between gap-2">
                              {canExtend && onExtendReservation ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={extendingId === res.id}
                                    onClick={async () => {
                                      setExtendingId(res.id);
                                      try {
                                        await onExtendReservation(res.id, 1);
                                        showSuccess('درخواست تمدید ۱ هفته با موفقیت ثبت شد.');
                                        fetchReservations();
                                      } catch (err: any) {
                                        showError(err.message || 'خطا در تمدید');
                                      } finally {
                                        setExtendingId(null);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] text-xs font-black cursor-pointer"
                                  >
                                    {extendingId === res.id ? '...' : 'تمدید ۱ هفته'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={extendingId === res.id}
                                    onClick={async () => {
                                      setExtendingId(res.id);
                                      try {
                                        await onExtendReservation(res.id, 2);
                                        showSuccess('درخواست تمدید ۲ هفته با موفقیت ثبت شد.');
                                        fetchReservations();
                                      } catch (err: any) {
                                        showError(err.message || 'خطا در تمدید');
                                      } finally {
                                        setExtendingId(null);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-[#0d9488] hover:bg-[#14b8a6] text-white text-xs font-black cursor-pointer"
                                  >
                                    {extendingId === res.id ? '...' : 'تمدید ۲ هفته'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#99f6e4]/60">
                                  {hasAlreadyExtended
                                    ? 'سقف ۱ بار تمدید استفاده شده است'
                                    : res.status === 'امانت فعال'
                                    ? 'تمدید در ۳ روز پایانی فعال می‌گردد'
                                    : ''}
                                </span>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  disabled={deletingResId === res.id}
                                  onClick={() => handleDeleteReservation(res.id)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/40 flex items-center gap-1.5 transition-colors mr-auto cursor-pointer"
                                  title="حذف این رکورد از تاریخچه"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{deletingResId === res.id ? 'در حال حذف...' : 'حذف از سابقه'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls for Reservations */}
                    <PaginationControls
                      currentPage={resPage}
                      totalItems={reservations.length}
                      pageSize={resPageSize}
                      onPageChange={setResPage}
                      onPageSizeChange={setResPageSize}
                      itemLabel="رزرو و امانت"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: MESSAGING SYSTEM WITH ADMIN */}
            {/* ========================================================= */}
            {activeTab === 'messages' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Create Message Form */}
                <div className="border-b border-[#0d9488]/30 pb-6 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#84cc16]">ارتباط مستقیم با مدیریت کتابخانه</span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">ارسال پیام یا درخواست جدید</h3>
                    <p className="text-xs text-[#99f6e4]">
                      پیام شما در وضعیت «در حال بررسی» قرار گرفته و پاسخ مدیریت در همین بخش ظاهر خواهد شد.
                    </p>
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">موضوع پیام:</label>
                      <input
                        type="text"
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        placeholder="مثلاً: پیشنهاد اضافه شدن کتاب یا سوال درباره امانت"
                        className="w-full p-2.5 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-xs text-white placeholder-[#99f6e4]/40 focus:ring-2 focus:ring-[#84cc16]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">متن کامل پیام:</label>
                      <textarea
                        rows={3}
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                        placeholder="متن خود را اینجا بنویسید..."
                        className="w-full p-2.5 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-xs text-white placeholder-[#99f6e4]/40 focus:ring-2 focus:ring-[#84cc16]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={msgSending || !msgText.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] hover:from-[#a3e635] hover:to-[#84cc16] text-[#042f2e] font-black text-xs shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{msgSending ? 'در حال ارسال...' : 'ارسال پیام به مدیریت'}</span>
                    </button>
                  </form>
                </div>

                {/* User Messages History */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">پیام‌های ارسال‌شده و پاسخ‌های مدیریت</h4>
                      <p className="text-xs text-[#99f6e4]">
                        پیام‌ها تا پاسخ‌گویی در وضعیت «در حال بررسی» هستند.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchMessages}
                      className="p-2 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40"
                      title="تازه‌سازی"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loadingMessages ? (
                    <div className="py-8 text-center text-xs text-[#99f6e4]">در حال بارگذاری پیام‌ها...</div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#99f6e4]">
                      هنوز هیچ پیامی ارسال نکرده‌اید.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedMessages.map((m) => (
                        <div
                          key={m.id}
                          className="p-4 rounded-2xl bg-[#042f2e] border border-[#0d9488]/40 space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-black text-white">{m.subject}</strong>
                              <span className="text-[10px] text-[#99f6e4]">
                                ({toPersianDigits(m.created_at)})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                  m.status === 'پاسخ داده شده'
                                    ? 'bg-emerald-950 text-[#a3e635] border-[#84cc16]/50'
                                    : 'bg-amber-950 text-amber-300 border-amber-600/50'
                                }`}
                              >
                                {m.status === 'پاسخ داده شده' ? 'پاسخ داده شده' : 'در حال بررسی'}
                              </span>

                              <button
                                type="button"
                                disabled={deletingMsgId === m.id}
                                onClick={() => handleDeleteMessage(m.id)}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 transition-colors cursor-pointer"
                                title="حذف این پیام"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#073834] text-[#ccfbf1] leading-relaxed">
                            <p>{m.content}</p>
                          </div>

                          {m.admin_reply ? (
                            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-[#84cc16]/50 text-[#a3e635] space-y-2 animate-in fade-in">
                              <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <strong className="text-white font-bold flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-[#84cc16]" />
                                    <span>پاسخ مدیر کتابخانه:</span>
                                  </strong>
                                  {!seenReplyIds.includes(m.id) && (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/50 text-[10px] font-black animate-pulse">
                                        پاسخ جدید
                                      </span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[#99f6e4] text-[10px]">
                                    {toPersianDigits(m.replied_at || '')}
                                  </span>
                                  {!seenReplyIds.includes(m.id) && (
                                    <button
                                      type="button"
                                      onClick={() => markReplyAsSeen(m.id)}
                                      className="px-2.5 py-1 rounded-lg bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-[10px] transition-colors cursor-pointer shadow-sm"
                                    >
                                      مشاهده شد
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-[#f0fdfa] leading-relaxed pt-1">
                                {m.admin_reply}
                              </p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#99f6e4]/60 italic flex items-center gap-1.5 pt-1">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>پیام شما در صف بررسی مدیریت است؛ به زودی پاسخ در این کادر نمایش داده می‌شود.</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Pagination Controls for Messages */}
                      <PaginationControls
                        currentPage={msgPage}
                        totalItems={messages.length}
                        pageSize={msgPageSize}
                        onPageChange={setMsgPage}
                        onPageSizeChange={setMsgPageSize}
                        itemLabel="پیام"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
