import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield, Upload, BookOpen, Clock, Users, CheckCircle2,
  AlertCircle, Trash2, Edit3, Plus, ArrowLeft, RefreshCw,
  Sparkles, FileText, Search, Filter, MessageSquare, Send,
  Check, XCircle, RotateCcw, Calendar, CheckSquare, ChevronRight,
  ChevronLeft, Download, FileSpreadsheet, Eye, Info, Image as ImageIcon,
  FileUp, Loader2, Trophy, Link, ExternalLink, HelpCircle, Star, Zap, LogOut,
  Layers, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Book, Reservation, FAQItem, OperatingHours, LendingSettings, UserMessage, ManagedFile, Competition, CompetitionRegistration, UserProfile, ShelfItem } from '../types';
import { toPersianDigits, getDaysRemaining, toEnglishDigits } from '../utils/persian';
import { SUBJECTS_LIST, INITIAL_SHELVES_CONFIG } from '../data/initialData';
import { PaginationControls } from './PaginationControls';

interface AdminDashboardProps {
  books: Book[];
  reservations: Reservation[];
  faqs: FAQItem[];
  operatingHours: OperatingHours;
  shelvesConfig?: ShelfItem[];
  onUpdateShelvesConfig?: (shelves: ShelfItem[]) => Promise<boolean>;
  onRefreshData: () => void;
  onImportHtml: (htmlContent: string) => Promise<any>;
  onBatchImportBooks?: (books: Partial<Book>[], mode: 'append' | 'replace', fileName: string, fileType: 'excel' | 'txt', description?: string) => Promise<any>;
  onAddBook: (book: Partial<Book>) => Promise<boolean>;
  onUpdateBook: (id: string, updates: Partial<Book>) => Promise<boolean>;
  onDeleteBook: (id: string) => Promise<boolean>;
  onUpdateReservation: (id: string, status: Reservation['status'], notes?: string, loanDays?: number) => Promise<boolean>;
  onUpdateOperatingHours: (hours: OperatingHours) => Promise<boolean>;
  onUpdateFeaturedBooks: (bookIds: string[]) => Promise<boolean>;
  onClose: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  books,
  reservations,
  faqs,
  operatingHours,
  shelvesConfig,
  onUpdateShelvesConfig,
  onRefreshData,
  onImportHtml,
  onBatchImportBooks,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onUpdateReservation,
  onUpdateOperatingHours,
  onUpdateFeaturedBooks,
  onClose,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'books' | 'users' | 'competitions' | 'featured' | 'faq' | 'messages' | 'hours'>('reservations');
  
  // Navigation tabs container ref & smooth scroll
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Feedback banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };
  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 5000);
  };

  // Loan duration per reservation map
  const [loanDaysMap, setLoanDaysMap] = useState<Record<string, number>>({});

  // Delete reservation
  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm('آیا از حذف کامل این مورد از لیست امانت و رزروها اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('مورد با موفقیت حذف گردید.');
        onRefreshData();
      } else {
        showError(data.message || 'خطا در حذف مورد');
      }
    } catch {
      showError('خطا در برقراری ارتباط');
    }
  };

  // Users tab state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && data.users) {
        setUsersList(data.users);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  // FAQ tab state
  const [adminFaqs, setAdminFaqs] = useState<FAQItem[]>(faqs);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('all');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState<{ category: string; question: string; answer: string; published: boolean }>({
    category: 'عضویت و اشتراک',
    question: '',
    answer: '',
    published: true,
  });

  const fetchFaqsList = async () => {
    try {
      const res = await fetch('/api/faq');
      const data = await res.json();
      if (data.success && data.faqs) {
        setAdminFaqs(data.faqs);
      }
    } catch {
      // ignore
    }
  };

  // Competition registrants modal state
  const [selectedCompForRegistrants, setSelectedCompForRegistrants] = useState<Competition | null>(null);
  const [compRegistrants, setCompRegistrants] = useState<CompetitionRegistration[]>([]);
  const [loadingRegistrants, setLoadingRegistrants] = useState(false);
  const [registrantSearch, setRegistrantSearch] = useState('');

  const handleOpenRegistrantsModal = async (comp: Competition) => {
    setSelectedCompForRegistrants(comp);
    setRegistrantSearch('');
    setLoadingRegistrants(true);
    try {
      const res = await fetch(`/api/competitions/${comp.id}/registrants`);
      const data = await res.json();
      if (data.success && data.registrations) {
        setCompRegistrants(data.registrations);
      } else {
        setCompRegistrants([]);
      }
    } catch {
      setCompRegistrants([]);
    } finally {
      setLoadingRegistrants(false);
    }
  };

  const handleExportRegistrantsExcel = (comp: Competition, regs: CompetitionRegistration[]) => {
    if (!regs || regs.length === 0) {
      showError('هیچ شرکت‌کننده‌ای برای دریافت خروجی اکسل وجود ندارد.');
      return;
    }
    const exportData = regs.map((r, idx) => ({
      'ردیف': idx + 1,
      'نام و نام خانوادگی': r.full_name,
      'شماره تلفن همراه': r.phone,
      'واحد ثبت‌نامی': r.unit || 'نامشخص',
      'کتاب منبع انتخابی': r.selected_book || comp.book_title || 'نامشخص',
      'تاریخ ثبت‌نام': r.registered_at || 'نامشخص',
      'شناسه مسابقه': comp.id,
      'عنوان مسابقه': comp.title,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'شرکت‌کنندگان');
    const safeTitle = comp.title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 30);
    XLSX.writeFile(workbook, `شرکت_کنندگان_مسابقه_${safeTitle}.xlsx`);
    showSuccess('فایل اکسل اسامی شرکت‌کنندگان با موفقیت دانلود شد.');
  };

  const handleExportUsersExcel = () => {
    if (!usersList || usersList.length === 0) {
      showError('هیچ کاربری برای دریافت خروجی موجود نیست.');
      return;
    }
    const exportData = usersList.map((u, idx) => ({
      'ردیف': idx + 1,
      'نام': u.name,
      'نام خانوادگی': u.family,
      'نام کامل': `${u.name} ${u.family}`,
      'شماره تلفن همراه': u.phone,
      'اشتراک امانت فعال': u.has_lending_subscription ? 'دارد' : 'ندارد',
      'وضعیت عضویت': u.membership_status || 'فعال',
      'تاریخ عضویت': u.registered_at || 'نامشخص',
      'امانت‌های جاری': u.active_loans_count || 0,
      'کل درخواست‌های رزرو': u.total_reservations || 0,
      'مسابقات شرکت‌کرده': u.competitions_count || 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'کاربران کتابخانه');
    XLSX.writeFile(workbook, 'لیست_کاربران_کتابخانه_شهید_احسان_کربلایی_پور.xlsx');
    showSuccess('فایل اکسل اطلاعات کاربران با موفقیت دانلود شد.');
  };

  // Featured 4 books CMS state
  const [editingFeaturedSlot, setEditingFeaturedSlot] = useState<number | null>(null);
  const [featuredSearchQuery, setFeaturedSearchQuery] = useState('');
  const [featuredForm, setFeaturedForm] = useState<{
    id?: string;
    title: string;
    author: string;
    description: string;
    excerpt: string;
    story: string;
    cover_image: string;
  }>({
    title: '',
    author: '',
    description: '',
    excerpt: '',
    story: '',
    cover_image: '',
  });

  // -------------------------------------------------------------
  // 1. FILE UPLOAD & MANAGEMENT (Excel, TXT, HTML)
  // -------------------------------------------------------------
  // Pagination states for all tables (10 to 50 items)
  const [booksPage, setBooksPage] = useState(1);
  const [booksPageSize, setBooksPageSize] = useState(10);
  const [resPage, setResPage] = useState(1);
  const [resPageSize, setResPageSize] = useState(10);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPageSize, setMessagesPageSize] = useState(10);
  const [registrantsPage, setRegistrantsPage] = useState(1);
  const [registrantsPageSize, setRegistrantsPageSize] = useState(10);

  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [stagedBooks, setStagedBooks] = useState<Partial<Book>[]>([]);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [stagedFileType, setStagedFileType] = useState<'excel' | 'txt' | 'html'>('excel');
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Raw text input for TXT / HTML
  const [rawTextInput, setRawTextInput] = useState('');
  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Fetch managed files
  const fetchManagedFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/admin/files');
      const data = await res.json();
      if (data.success && data.files) {
        setManagedFiles(data.files);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'books') {
      fetchManagedFiles();
    }
  }, [activeTab]);

  // Smart Universal File Upload (Excel, TXT, HTML)
  const handleSmartFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    setErrorBanner(null);
    setStagedFileName(file.name);

    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
      handleExcelUploadFile(file);
    } else if (fileNameLower.endsWith('.html') || fileNameLower.endsWith('.htm')) {
      handleHtmlUploadFile(file);
    } else {
      // Assume text (.txt, .csv, etc.)
      handleTxtUploadFile(file);
    }
    // reset input value so re-selecting same file works
    e.target.value = '';
  };

  const handleExcelUploadFile = (file: File) => {
    setImportLoading(true);
    setStagedFileType('excel');
    setStagedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error('فایل قابل خواندن نیست.');
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          throw new Error('فایل اکسل خالی است یا سطرهای آن خوانده نشدند.');
        }

        const parsedBooks: Partial<Book>[] = [];

        rows.forEach((r, idx) => {
          // Normalize row keys (trim whitespace and lower)
          const norm: Record<string, any> = {};
          Object.keys(r).forEach((k) => {
            const cleanKey = k.trim().toLowerCase();
            norm[cleanKey] = r[k];
            norm[k.trim()] = r[k];
          });

          // Check if row is entirely empty
          const values = Object.values(norm).filter((v) => v !== undefined && v !== null && String(v).trim().length > 0);
          if (values.length === 0) return;

          // Check for title - MUST exist, otherwise skip this row
          const title = (norm['عنوان'] || norm['نام کتاب'] || norm['نام'] || norm['کتاب'] || norm['title'] || '').toString().trim();
          if (!title) {
            // Row has no book name/title -> ignore it
            return;
          }

          const author = (norm['نویسنده'] || norm['پدیدآور'] || norm['مولف'] || norm['author'] || 'ناشناس').toString().trim();
          const series = (norm['دوره'] || norm['سری'] || norm['مجموعه'] || norm['series'] || norm['نوبت چاپ'] || norm['چاپ'] || '').toString().trim();
          const volume = (norm['جلد'] || norm['شماره جلد'] || norm['vol'] || norm['volume'] || '').toString().trim();
          const subject = (norm['موضوع'] || norm['گروه'] || norm['رده'] || norm['subject'] || 'عمومی و متفرقه').toString().trim();

          // Shelf numbers in the source file are often written with Persian digits
          // (e.g. "قفسه ۱"), which the old ASCII-only `\d` regex stripped to an
          // empty string, silently defaulting every book to shelf 1. Convert
          // Persian/Arabic-Indic digits to English digits first.
          const rawShelf = norm['قفسه'] || norm['شماره قفسه'] || norm['shelf'] || '1';
          const parsedShelf = parseInt(toEnglishDigits(String(rawShelf)).replace(/[^\d]/g, ''), 10);
          const shelf = !isNaN(parsedShelf) && parsedShelf > 0 ? parsedShelf : 1;

          // Row number can be decimal or slash (e.g. 216/1 or 10/4)
          const rawRow = norm['شماره ردیف'] || norm['ردیف'] || norm['row'] || (idx + 1);
          const cleanRow = toEnglishDigits(String(rawRow).trim());

          const description = (norm['توضیحات'] || norm['خلاصه'] || norm['شرح'] || norm['description'] || '').toString().trim();
          const rawStatus = (norm['وضعیت'] || norm['وضعیت موجودی'] || '').toString().trim();
          const availability_status = (rawStatus.includes('امانت') ? 'امانت داده شده' : 'موجود') as any;

          parsedBooks.push({
            title,
            author,
            series,
            volume,
            subject,
            shelf,
            row_number: cleanRow || 1,
            description,
            availability_status,
            reservation_allowed: true,
          });
        });

        if (parsedBooks.length === 0) {
          throw new Error('هیچ سطری با عنوان کتاب معتبر در فایل اکسل یافت نشد. سطرهای خالی یا بدون نام کتاب رد شدند.');
        }

        setStagedBooks(parsedBooks);
        showSuccess(`${toPersianDigits(parsedBooks.length)} عنوان کتاب معتبر از فایل اکسل استخراج شد (سطرهای خالی و بدون نام کتاب نادیده گرفته شدند).`);
      } catch (err: any) {
        showError(err.message || 'خطا در خواندن فایل اکسل');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTxtUploadFile = (file: File) => {
    setImportLoading(true);
    setStagedFileType('txt');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('فایل متنی خالی است.');
        parseAndStageTextContent(text, file.name);
      } catch (err: any) {
        showError(err.message || 'خطا در پردازش فایل متنی');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleHtmlUploadFile = (file: File) => {
    setImportLoading(true);
    setStagedFileType('html');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const html = evt.target?.result as string;
        if (!html) throw new Error('فایل HTML خالی است.');
        parseAndStageHtmlContent(html, file.name);
      } catch (err: any) {
        showError(err.message || 'خطا در پردازش فایل HTML');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const parseAndStageHtmlContent = (htmlContent: string, fileName = 'فایل HTML') => {
    const rowMatches = htmlContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rowMatches.length === 0) {
      throw new Error('هیچ سطری (جدولی) در فایل HTML یافت نشد.');
    }

    const cleanText = (raw: string) => {
      return raw
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&zwnj;/g, '‌')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    };

    let headers: string[] = [];
    const parsed: Partial<Book>[] = [];

    for (let i = 0; i < rowMatches.length; i++) {
      const row = rowMatches[i];
      const thMatches = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
      if (thMatches && thMatches.length > 0) {
        headers = thMatches.map(cleanText);
        continue;
      }

      const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (!tdMatches || tdMatches.length === 0) continue;

      const cells = tdMatches.map(cleanText);
      let title = '';
      let author = '';
      let series = '';
      let volume = '';
      let subject = 'عمومی و متفرقه';
      let shelf = 1;
      let row_number: string | number = 1;
      let description = '';

      if (headers.length > 0 && headers.length === cells.length) {
        headers.forEach((h, idx) => {
          const hClean = h.toLowerCase();
          const val = cells[idx];
          if (hClean.includes('نام') || hClean.includes('عنوان') || hClean.includes('کتاب')) title = val;
          else if (hClean.includes('نویسنده') || hClean.includes('مؤلف') || hClean.includes('پدیدآور')) author = val;
          else if (hClean.includes('دوره') || hClean.includes('سری')) series = val;
          else if (hClean.includes('جلد')) volume = val;
          else if (hClean.includes('موضوع') || hClean.includes('رده')) subject = val;
          else if (hClean.includes('قفسه')) {
            const num = parseInt(toEnglishDigits(val).replace(/[^\d]/g, ''), 10);
            if (!isNaN(num) && num > 0) shelf = num;
          } else if (hClean.includes('ردیف')) {
            row_number = toEnglishDigits(val.trim());
          } else if (hClean.includes('توضیح') || hClean.includes('شرح')) description = val;
        });
      } else {
        title = cells[1] || cells[0] || '';
        author = cells[2] || 'ناشناس';
        subject = cells[3] || 'عمومی و متفرقه';
      }

      if (title && title.trim().length > 0) {
        parsed.push({
          title: title.trim(),
          author: author.trim() || 'ناشناس',
          series: series.trim(),
          volume: volume.trim(),
          subject: subject.trim() || 'عمومی و متفرقه',
          shelf,
          row_number: row_number || 1,
          description: description.trim(),
          availability_status: 'موجود',
          reservation_allowed: true,
        });
      }
    }

    if (parsed.length === 0) {
      throw new Error('هیچ اطلاعات کتابی از جدول HTML استخراج نشد.');
    }

    setStagedBooks(parsed);
    setStagedFileName(fileName);
    setStagedFileType('html');
    showSuccess(`${toPersianDigits(parsed.length)} عنوان کتاب از فایل HTML شناسایی شد.`);
  };

  const parseAndStageTextContent = (text: string, fileName = 'متن ورودی') => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) throw new Error('متنی برای پردازش یافت نشد.');

    const parsed: Partial<Book>[] = [];
    
    // Check if first line contains header keywords
    let startIndex = 0;
    const firstLine = lines[0];
    if (firstLine.includes('عنوان') || firstLine.includes('کتاب') || firstLine.includes('title')) {
      startIndex = 1;
    }

    // Delimiter detection (tab, semicolon, pipe, comma)
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes('|')) delimiter = '|';
    else if (firstLine.includes(';')) delimiter = ';';

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Key-value pattern support: عنوان: ... | نویسنده: ...
      if (line.includes(':') && line.includes('|')) {
        const parts = line.split('|');
        const item: any = {};
        for (const p of parts) {
          const [k, ...v] = p.split(':');
          if (k && v) item[k.trim()] = v.join(':').trim();
        }
        parsed.push({
          title: item['عنوان'] || item['نام کتاب'] || item['title'] || `کتاب ${i + 1}`,
          author: item['نویسنده'] || item['مولف'] || item['author'] || 'نامشخص',
          publisher: item['ناشر'] || item['publisher'] || '',
          subject: item['موضوع'] || item['subject'] || 'عمومی و متفرقه',
          shelf: parseInt(toEnglishDigits(item['قفسه'] || '1'), 10) || 1,
          row_number: parseInt(toEnglishDigits(item['ردیف'] || '1'), 10) || 1,
          book_number: item['کد'] || item['شماره'] || `${i + 1}`,
          description: item['توضیحات'] || '',
          availability_status: 'موجود',
          reservation_allowed: true,
        });
      } else {
        // Standard delimited columns
        const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 2) {
          parsed.push({
            title: cols[0],
            author: cols[1] || 'نامشخص',
            publisher: cols[2] || '',
            subject: cols[3] || 'عمومی و متفرقه',
            shelf: parseInt(toEnglishDigits(cols[4] || '1'), 10) || 1,
            row_number: parseInt(toEnglishDigits(cols[5] || '1'), 10) || 1,
            book_number: cols[6] || `${i + 1}`,
            description: cols[7] || '',
            availability_status: 'موجود',
            reservation_allowed: true,
          });
        }
      }
    }

    if (parsed.length === 0) {
      throw new Error('قالب فایل متنی قابل شناسایی نبود. لطفاً ستون‌ها را با کاما، تب یا خط عمودی (|) جدا نمایید.');
    }

    setStagedBooks(parsed);
    setStagedFileName(fileName);
    setStagedFileType('txt');
    showSuccess(`${toPersianDigits(parsed.length)} ردیف از فایل متنی استخراج شد.`);
  };

  // Submit Staged Books to Backend
  const handleCommitStagedImport = async () => {
    if (stagedBooks.length === 0) return;
    setImportLoading(true);
    try {
      const fileNameToUse = stagedFileName || 'فایل_اکسل_کتاب‌ها';
      const fileTypeToUse = stagedFileType === 'excel' ? 'excel' : 'txt';

      if (onBatchImportBooks) {
        const res = await onBatchImportBooks(
          stagedBooks,
          importMode,
          fileNameToUse,
          fileTypeToUse,
          `بارگذاری شده از پنل مدیریت - حالت ${importMode === 'append' ? 'افزودن و بروزرسانی' : 'جایگزینی'}`
        );
        setImportSummary(res);
      } else {
        // Direct fetch with chunking if large
        const CHUNK_SIZE = 400;
        if (stagedBooks.length > CHUNK_SIZE && importMode !== 'replace') {
          let lastData: any = null;
          for (let i = 0; i < stagedBooks.length; i += CHUNK_SIZE) {
            const chunk = stagedBooks.slice(i, i + CHUNK_SIZE);
            const res = await fetch('/api/books/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                books: chunk,
                mode: 'append',
                fileName: `${fileNameToUse} (بخش ${Math.floor(i / CHUNK_SIZE) + 1})`,
                fileType: fileTypeToUse,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.message || 'خطا در ثبت نهایی');
            }
            lastData = data;
          }
          setImportSummary(lastData || { success: true });
        } else {
          const res = await fetch('/api/books/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              books: stagedBooks,
              mode: importMode,
              fileName: fileNameToUse,
              fileType: fileTypeToUse,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'خطا در ثبت نهایی');
          }
          setImportSummary(data);
        }
      }
      showSuccess(`تعداد ${toPersianDigits(stagedBooks.length)} کتاب با موفقیت در کاتالوگ کتابخانه ثبت شد.`);
      setStagedBooks([]);
      onRefreshData();
      fetchManagedFiles();
    } catch (err: any) {
      showError(err.message || 'خطا در ثبت نهایی کاتالوگ کتاب‌ها');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteManagedFile = async (fileId: string) => {
    if (!confirm('آیا از حذف تاریخچه این فایل مطمئن هستید؟ (اطلاعات کتاب‌ها در کاتالوگ باقی خواهند ماند)')) return;
    try {
      await fetch(`/api/admin/files?id=${fileId}`, { method: 'DELETE' });
      fetchManagedFiles();
      showSuccess('رکورد فایل حذف گردید.');
    } catch {
      showError('خطا در حذف رکورد فایل');
    }
  };

  // -------------------------------------------------------------
  // 2. FULL BOOK MANAGEMENT (CRUD) & SHELVES CONFIG
  // -------------------------------------------------------------
  const [localShelvesConfig, setLocalShelvesConfig] = useState<ShelfItem[]>(shelvesConfig || INITIAL_SHELVES_CONFIG);
  useEffect(() => {
    if (shelvesConfig && shelvesConfig.length > 0) {
      setLocalShelvesConfig(shelvesConfig);
    }
  }, [shelvesConfig]);

  const [isEditingShelvesModalOpen, setIsEditingShelvesModalOpen] = useState(false);
  const [newShelfNumber, setNewShelfNumber] = useState<string>('');
  const [newShelfName, setNewShelfName] = useState<string>('');
  const [newShelfInitialSubjects, setNewShelfInitialSubjects] = useState<string>('');
  const [newSubjectInputs, setNewSubjectInputs] = useState<Record<number, string>>({});
  const [savingShelves, setSavingShelves] = useState(false);

  const handleAddSubjectToShelf = (shelfId: number) => {
    const val = (newSubjectInputs[shelfId] || '').trim();
    if (!val) return;
    setLocalShelvesConfig((prev) =>
      prev.map((s) => {
        if (s.id === shelfId) {
          if (s.subjects.includes(val)) return s;
          return { ...s, subjects: [...s.subjects, val] };
        }
        return s;
      })
    );
    setNewSubjectInputs((prev) => ({ ...prev, [shelfId]: '' }));
    showSuccess(`موضوع «${val}» به قفسه ${toPersianDigits(shelfId)} اضافه شد.`);
  };

  const handleRemoveSubjectFromShelf = (shelfId: number, subjectToRemove: string) => {
    setLocalShelvesConfig((prev) =>
      prev.map((s) => {
        if (s.id === shelfId) {
          return { ...s, subjects: s.subjects.filter((sub) => sub !== subjectToRemove) };
        }
        return s;
      })
    );
  };

  const handleAddNewShelf = () => {
    const customNum = parseInt(newShelfNumber, 10);
    const calculatedId = !isNaN(customNum) && customNum > 0
      ? customNum
      : Math.max(...localShelvesConfig.map((s) => s.id), 0) + 1;

    if (localShelvesConfig.some((s) => s.id === calculatedId)) {
      showError(`قفسه شماره ${toPersianDigits(calculatedId)} در حال حاضر وجود دارد.`);
      return;
    }

    const name = newShelfName.trim() || `قفسه شماره ${calculatedId}`;
    const initialSubs = newShelfInitialSubjects
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newShelfItem: ShelfItem = {
      id: calculatedId,
      name,
      subjects: initialSubs.length > 0 ? initialSubs : ['عمومی'],
    };

    setLocalShelvesConfig((prev) => [...prev, newShelfItem].sort((a, b) => a.id - b.id));
    setNewShelfNumber('');
    setNewShelfName('');
    setNewShelfInitialSubjects('');
    showSuccess(`قفسه شماره ${toPersianDigits(calculatedId)} با موفقیت به لیست اضافه شد.`);
  };

  const handleSaveShelvesConfig = async () => {
    setSavingShelves(true);
    try {
      if (onUpdateShelvesConfig) {
        await onUpdateShelvesConfig(localShelvesConfig);
      } else {
        await fetch('/api/shelves-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shelves: localShelvesConfig }),
        });
      }
      showSuccess('تغییرات قفسه‌ها و موضوعات با موفقیت ذخیره و در کل سامانه اعمال گردید.');
      setIsEditingShelvesModalOpen(false);
      onRefreshData();
    } catch {
      showError('خطا در ذخیره پیکربندی قفسه‌ها');
    } finally {
      setSavingShelves(false);
    }
  };

  const [bookSearch, setBookSearch] = useState('');
  const [bookShelfFilter, setBookShelfFilter] = useState<number | 'all'>('all');
  const [bookSubjectFilter, setBookSubjectFilter] = useState<string>('all');
  const [bookStatusFilter, setBookStatusFilter] = useState<string>('all');
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Smart subject options based on active shelf filter
  const adminAvailableSubjects = useMemo(() => {
    if (bookShelfFilter === 'all') {
      const set = new Set<string>();
      localShelvesConfig.forEach((s) => s.subjects.forEach((sub) => set.add(sub)));
      SUBJECTS_LIST.forEach((s) => set.add(s));
      books.forEach((b) => { if (b.subject) set.add(b.subject); });
      return Array.from(set);
    }
    const targetShelf = localShelvesConfig.find((s) => s.id === bookShelfFilter);
    if (targetShelf && targetShelf.subjects.length > 0) {
      return targetShelf.subjects;
    }
    const set = new Set<string>();
    books.filter((b) => b.shelf === bookShelfFilter).forEach((b) => { if (b.subject) set.add(b.subject); });
    return Array.from(set);
  }, [bookShelfFilter, localShelvesConfig, books]);

  // Reset bookSubjectFilter if it's no longer in the active shelf's subjects
  useEffect(() => {
    if (bookSubjectFilter !== 'all' && !adminAvailableSubjects.includes(bookSubjectFilter)) {
      setBookSubjectFilter('all');
    }
  }, [bookShelfFilter, adminAvailableSubjects, bookSubjectFilter]);

  const initialBookForm: Partial<Book> = {
    title: '',
    author: '',
    series: '',
    volume: '',
    subject: 'علوم قرآنی و تفسیر',
    shelf: 1,
    row_number: '1',
    availability_status: 'موجود',
    description: '',
    cover_image: '',
  };
  const [bookForm, setBookForm] = useState<Partial<Book>>(initialBookForm);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم فایل تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    setUploadingCover(true);
    try {
      const reader = new FileReader();
      reader.onload = async (uploadEvt) => {
        const base64Data = uploadEvt.target?.result as string;
        try {
          const res = await fetch('/api/upload/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Data,
              filename: file.name,
            }),
          });
          const data = await res.json();
          if (data.success && data.url) {
            setBookForm((prev) => ({ ...prev, cover_image: data.url }));
            showSuccess('تصویر جلد با موفقیت بارگذاری شد.');
          } else {
            showError(data.message || 'خطا در بارگذاری تصویر');
          }
        } catch {
          setBookForm((prev) => ({ ...prev, cover_image: base64Data }));
          showSuccess('تصویر جلد اعمال شد.');
        } finally {
          setUploadingCover(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showError('خطا در خواندن فایل تصویر');
      setUploadingCover(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = (bookForm.title || '').trim();
    if (!cleanTitle) {
      showError('نام کتاب الزامی است. تا نام کتاب وارد نشود، امکان ثبت وجود ندارد.');
      return;
    }

    try {
      const bookPayload: Partial<Book> = {
        title: cleanTitle,
        author: (bookForm.author || '').trim() || 'ناشناس',
        series: (bookForm.series || (bookForm as any).edition || '').trim(),
        volume: (bookForm.volume || '').trim(),
        subject: (bookForm.subject || '').trim() || 'عمومی و متفرقه',
        shelf: Number(bookForm.shelf) || 1,
        row_number: bookForm.row_number !== undefined && bookForm.row_number !== null ? String(bookForm.row_number).trim() : '1',
        availability_status: bookForm.availability_status === 'امانت داده شده' ? 'امانت داده شده' : 'موجود',
        description: (bookForm.description || '').trim(),
        cover_image: (bookForm.cover_image || '').trim(),
        reservation_allowed: true,
      };

      if (editingBookId) {
        await onUpdateBook(editingBookId, bookPayload);
        showSuccess(`مشخصات کتاب «${cleanTitle}» با موفقیت به‌روزرسانی شد.`);
        setEditingBookId(null);
      } else {
        await onAddBook(bookPayload);
        showSuccess(`کتاب «${cleanTitle}» با موفقیت به کاتالوگ افزوده شد.`);
        setIsAddingBook(false);
      }
      setBookForm(initialBookForm);
      onRefreshData();
    } catch (err: any) {
      showError(err.message || 'خطا در ثبت اطلاعات کتاب');
    }
  };

  const filteredBooks = books.filter((b) => {
    const q = bookSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.series && b.series.toLowerCase().includes(q)) ||
      (b.volume && b.volume.toLowerCase().includes(q)) ||
      (b.subject && b.subject.toLowerCase().includes(q));
    
    const matchesShelf = bookShelfFilter === 'all' || b.shelf === bookShelfFilter;
    const matchesSubject = bookSubjectFilter === 'all' || b.subject === bookSubjectFilter;
    const matchesStatus = bookStatusFilter === 'all' ||
      (bookStatusFilter === 'امانت' || bookStatusFilter === 'امانت داده شده'
        ? (b.availability_status === 'امانت' || b.availability_status === 'امانت داده شده' || (b.availability_status as string) === 'در حال امانت')
        : b.availability_status === bookStatusFilter);

    return matchesSearch && matchesShelf && matchesSubject && matchesStatus;
  });

  // -------------------------------------------------------------
  // 3. LENDING & RESERVATIONS SYSTEM
  // -------------------------------------------------------------
  const [resFilter, setResFilter] = useState<'all' | 'pending' | 'loaned' | 'dueSoon' | 'overdue' | 'extensions'>('all');
  const [lendingSettings, setLendingSettings] = useState<LendingSettings>({
    default_loan_days: 14,
    max_active_reservations: 4,
    extension_days: 7,
    max_extensions: 2,
    allow_extensions: true,
  });
  const [showSettingsCard, setShowSettingsCard] = useState(false);

  // Fetch lending settings
  useEffect(() => {
    fetch('/api/admin/lending-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) setLendingSettings(d.settings);
      })
      .catch(() => {});
  }, []);

  const handleSaveLendingSettings = async () => {
    try {
      const res = await fetch('/api/admin/lending-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lendingSettings),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('تنظیمات امانت با موفقیت ذخیره گردید.');
        setShowSettingsCard(false);
      }
    } catch {
      showError('خطا در ذخیره تنظیمات امانت');
    }
  };

  const handleExtensionAction = async (reservationId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/extension-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, days: lendingSettings.extension_days || 7 }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(action === 'approve' ? 'درخواست تمدید با موفقیت تأیید شد.' : 'درخواست تمدید رد شد.');
        onRefreshData();
      } else {
        showError(data.message || 'خطا در ثبت تصمیم');
      }
    } catch {
      showError('خطا در ارتباط با سرور');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsersList();
    } else if (activeTab === 'faq') {
      fetchFaqsList();
    }
  }, [activeTab]);

  const calculateLoanDaysInfo = (res: Reservation) => {
    if (!res.due_date || (res.status !== 'امانت فعال' && res.status !== 'تأیید شده')) return null;
    const diffDays = getDaysRemaining(res.due_date, res.due_date_iso);
    const safeDiffDays = typeof diffDays === 'number' && !isNaN(diffDays) ? diffDays : 0;
    return {
      due_date_str: res.due_date,
      diffDays: safeDiffDays,
      isOverdue: safeDiffDays < 0,
      isDueSoon: safeDiffDays >= 0 && safeDiffDays <= 3,
    };
  };

  const filteredReservations = reservations
    .filter((r) => {
      if (resFilter === 'pending') return r.status === 'در انتظار بررسی';
      if (resFilter === 'loaned') return r.status === 'امانت فعال';
      if (resFilter === 'extensions') return r.extension_status === 'در انتظار بررسی';
      if (resFilter === 'overdue') {
        const info = calculateLoanDaysInfo(r);
        return info && info.isOverdue;
      }
      if (resFilter === 'dueSoon') {
        const info = calculateLoanDaysInfo(r);
        return info && info.isDueSoon;
      }
      return true;
    })
    .sort((a, b) => {
      const aPending = a.status === 'در انتظار بررسی';
      const bPending = b.status === 'در انتظار بررسی';
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return 0;
    });

  // -------------------------------------------------------------
  // 4. MESSAGES SYSTEM
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab]);

  const handleSendReply = async (messageId: string) => {
    const text = replyTextMap[messageId];
    if (!text || !text.trim()) return;
    setSendingReplyId(messageId);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: text.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('پاسخ برای کاربر با موفقیت ثبت و ارسال شد.');
        fetchMessages();
        setReplyTextMap({ ...replyTextMap, [messageId]: '' });
      } else {
        showError(data.message || 'خطا در ثبت پاسخ');
      }
    } catch {
      showError('خطا در برقراری ارتباط');
    } finally {
      setSendingReplyId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('آیا از حذف این پیام اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('پیام حذف شد.');
        fetchMessages();
      } else {
        showError(data.message || 'خطا در حذف پیام');
      }
    } catch {
      showError('خطا در حذف پیام');
    }
  };

  const handleDeleteAllMessages = async () => {
    if (!confirm('آیا از پاک کردن تمامی پیام‌های کاربران اطمینان کامل دارید؟')) return;
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('تمامی پیام‌ها با موفقیت پاک شدند.');
        fetchMessages();
      } else {
        showError(data.message || 'خطا در حذف پیام‌ها');
      }
    } catch {
      showError('خطا در حذف پیام‌ها');
    }
  };

  // -------------------------------------------------------------
  // 5. COMPETITIONS MANAGEMENT (CRUD + Poster Upload + Link)
  // -------------------------------------------------------------
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [compForm, setCompForm] = useState<Partial<Competition>>({
    title: '',
    book_title: '',
    poster_url: '',
    link_url: '',
    description: '',
    start_date: '',
    end_date: '',
    prizes: '',
    status: 'در حال برگزاری',
  });

  const fetchCompetitions = async () => {
    setLoadingCompetitions(true);
    try {
      const res = await fetch('/api/competitions');
      const data = await res.json();
      if (data.success && data.competitions) {
        setCompetitions(data.competitions);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCompetitions(false);
    }
  };

  const handleDeleteAllCompetitions = async () => {
    if (!confirm('آیا از حذف کلیه مسابقات کتابخوانی اطمینان دارید؟')) return;
    try {
      const res = await fetch('/api/competitions', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('تمامی مسابقات با موفقیت حذف شدند.');
        fetchCompetitions();
        onRefreshData();
      } else {
        showError(data.message || 'خطا در حذف همه مسابقات');
      }
    } catch {
      showError('خطا در حذف مسابقات');
    }
  };

  useEffect(() => {
    if (activeTab === 'competitions') {
      fetchCompetitions();
    } else if (activeTab === 'users') {
      fetchUsersList();
    } else if (activeTab === 'faq') {
      fetchFaqsList();
    }
  }, [activeTab]);

  const handleOpenNewCompModal = () => {
    setEditingCompId(null);
    setCompForm({
      title: '',
      book_title: '',
      poster_url: '',
      link_url: '',
      description: '',
      start_date: new Date().toLocaleDateString('fa-IR'),
      end_date: '',
      prizes: '',
      status: 'در حال برگزاری',
    });
    setShowCompModal(true);
  };

  const handleOpenEditCompModal = (comp: Competition) => {
    setEditingCompId(comp.id);
    setCompForm({
      title: comp.title,
      book_title: comp.book_title || '',
      poster_url: comp.poster_url || '',
      link_url: comp.link_url || '',
      description: comp.description,
      start_date: comp.start_date || '',
      end_date: comp.end_date || '',
      prizes: Array.isArray(comp.prizes) ? comp.prizes.join('\n') : comp.prizes,
      status: comp.status,
    });
    setShowCompModal(true);
  };

  const handleSaveCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.title?.trim() || !compForm.description?.trim()) {
      showError('عنوان مسابقه و توضیحات الزامی هستند.');
      return;
    }

    try {
      const prizesArray = compForm.prizes
        ? (typeof compForm.prizes === 'string' ? compForm.prizes.split('\n').map(p => p.trim()).filter(Boolean) : compForm.prizes)
        : [];

      const payload = {
        ...compForm,
        prizes: prizesArray.length > 0 ? prizesArray : ['جوایز نقدی و بسته‌های فرهنگی نفیس'],
      };

      if (editingCompId) {
        const res = await fetch(`/api/competitions/${editingCompId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess('مسابقه با موفقیت ویرایش شد.');
          setShowCompModal(false);
          fetchCompetitions();
          onRefreshData();
        } else {
          showError(data.message || 'خطا در ویرایش مسابقه');
        }
      } else {
        const res = await fetch('/api/competitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess('مسابقه جدید با موفقیت ثبت شد.');
          setShowCompModal(false);
          fetchCompetitions();
          onRefreshData();
        } else {
          showError(data.message || 'خطا در ثبت مسابقه');
        }
      }
    } catch {
      showError('خطا در برقراری ارتباط با سرور');
    }
  };

  const handleDeleteCompetition = async (compId: string) => {
    if (!confirm('آیا از حذف این مسابقه اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/competitions/${compId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('مسابقه با موفقیت حذف گردید.');
        fetchCompetitions();
        onRefreshData();
      } else {
        showError(data.message || 'خطا در حذف مسابقه');
      }
    } catch {
      showError('خطا در حذف مسابقه');
    }
  };

  const handleCompPosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('لطفاً فقط فایل تصویری (JPG, PNG, WebP) انتخاب نمایید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompForm({ ...compForm, poster_url: base64 });
      showSuccess('پوستر مسابقه با موفقیت بارگذاری شد.');
    };
    reader.onerror = () => {
      showError('خطا در خواندن فایل پوستر.');
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // 6. FEATURED & OPERATING HOURS & ANNOUNCEMENTS
  // -------------------------------------------------------------
  const [hoursForm, setHoursForm] = useState<OperatingHours>(operatingHours);
  const [selectedFeatured, setSelectedFeatured] = useState<string[]>(
    books.filter((b) => b.featured).map((b) => b.id).slice(0, 4)
  );
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  useEffect(() => {
    setLoadingAnnouncement(true);
    fetch('/api/announcement')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAnnouncementText(data.announcement_text || '');
          setAnnouncementEnabled(!!data.announcement_enabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAnnouncement(false));
  }, []);

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_text: announcementText,
          announcement_enabled: announcementEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess('اطلاعیه مهم با موفقیت ذخیره شد.');
      } else {
        showError(data.message || 'خطا در ذخیره اطلاعیه');
      }
    } catch {
      showError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  return (
    <div className="py-10 bg-[#042f2e] min-h-screen text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#0d9488]/30">
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#84cc16] to-[#0d9488] text-[#042f2e] shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#073834] text-[#a3e635] border border-[#84cc16]/40">
                  سامانه مدیریت یکپارچه
                </span>
                <span className="text-[10px] text-[#99f6e4] bg-[#0d9488]/20 px-2 py-0.5 rounded-md">
                  نگارش ۳.۲
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                پنل مدیریت کتابخانه شهید احسان کربلایی‌پور
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onRefreshData();
                fetchManagedFiles();
                fetchMessages();
                showSuccess('اطلاعات کتابخانه به‌روزرسانی شد.');
              }}
              className="p-2.5 rounded-xl bg-[#073834] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 transition-colors"
              title="تازه‌سازی تمام داده‌ها"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#84cc16] text-[#042f2e] font-black text-xs hover:bg-[#a3e635] shadow-lg transition-all"
            >
              بازگشت به سایت
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="خروج از حساب کاربری مدیریت"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>خروج از مدیریت</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Alerts */}
        {successBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-[#84cc16] text-[#a3e635] text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#84cc16]" />
            <span>{successBanner}</span>
          </div>
        )}
        {errorBanner && (
          <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-600 text-rose-300 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Navigation Tabs with bilateral scroll arrows for desktop and mobile */}
        <div className="relative flex items-center gap-1.5 w-full bg-[#042f2e]/60 p-1.5 rounded-2xl border border-[#0d9488]/30">
          <button
            type="button"
            onClick={() => handleScrollTabs('right')}
            className="shrink-0 p-2 rounded-xl bg-[#073834] hover:bg-[#0d9488] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 shadow-md transition-all active:scale-95"
            title="پیمایش به راست"
            aria-label="پیمایش به راست"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={tabsContainerRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar touch-pan-x scroll-smooth"
          >
            {[
              {
                id: 'reservations',
                label: 'امانت و رزروها',
                icon: Users,
                badge: reservations.filter((r) => r.status === 'در انتظار بررسی' || r.extension_status === 'در انتظار بررسی').length,
              },
              {
                id: 'books',
                label: 'مدیریت کتاب‌ها',
                icon: BookOpen,
                count: books.length,
              },
              {
                id: 'users',
                label: 'اطلاعات کاربران',
                icon: Users,
                count: usersList.length > 0 ? usersList.length : undefined,
              },
              {
                id: 'competitions',
                label: 'مسابقات کتابخوانی',
                icon: Trophy,
                count: competitions.length > 0 ? competitions.length : undefined,
              },
              {
                id: 'featured',
                label: '۴ کتاب معرفی',
                icon: Sparkles,
              },
              {
                id: 'faq',
                label: 'سؤالات متداول',
                icon: HelpCircle,
                count: adminFaqs.length > 0 ? adminFaqs.length : undefined,
              },
              {
                id: 'messages',
                label: 'پیام‌های کاربران',
                icon: MessageSquare,
                badge: messages.filter((m) => m.status !== 'پاسخ داده شده').length,
              },
              {
                id: 'hours',
                label: 'ساعات کاری و اطلاعیه',
                icon: Clock,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white border border-[#84cc16]/50 shadow-lg scale-[1.02]'
                      : 'bg-[#073834] text-[#ccfbf1] hover:bg-[#0d9488]/30 hover:text-white border border-[#0d9488]/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#84cc16]' : 'text-[#99f6e4]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                      {toPersianDigits(tab.badge)}
                    </span>
                  )}
                  {tab.count !== undefined && !tab.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#042f2e] text-[#a3e635] text-[10px] font-bold border border-[#0d9488]/40">
                      {toPersianDigits(tab.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleScrollTabs('left')}
            className="shrink-0 p-2 rounded-xl bg-[#073834] hover:bg-[#0d9488] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 shadow-md transition-all active:scale-95"
            title="پیمایش به چپ"
            aria-label="پیمایش به چپ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: RESERVATIONS & LENDING MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            {/* Header and Quick Stats */}
            <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">سامانه هوشمند امانت، رزرو و تمدید</h3>
                  <p className="text-xs text-[#99f6e4] mt-1">
                    محاسبه خودکار تاریخ تحویل ({toPersianDigits(lendingSettings.default_loan_days)} روز)، نظارت بر تاخیرها، و تایید تمدیدهای اعضا
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsCard(!showSettingsCard)}
                    className="px-3.5 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/50 text-xs font-bold text-[#84cc16] hover:bg-[#0d9488]/30 flex items-center gap-1.5"
                  >
                    <span>⚙ تنظیمات مدت امانت</span>
                  </button>
                </div>
              </div>

              {/* Lending Settings Drawer */}
              {showSettingsCard && (
                <div className="p-4 rounded-2xl bg-[#042f2e] border border-[#84cc16]/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-white">تنظیمات سیاست امانت کتابخانه:</strong>
                    <button
                      type="button"
                      onClick={() => setShowSettingsCard(false)}
                      className="text-[11px] text-rose-400 hover:text-rose-300"
                    >
                      بستن
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">مدت زمان امانت (روز):</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={lendingSettings.default_loan_days}
                        onChange={(e) => setLendingSettings({ ...lendingSettings, default_loan_days: parseInt(e.target.value, 10) || 14 })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">مدت هر بار تمدید (روز):</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={lendingSettings.extension_days}
                        onChange={(e) => setLendingSettings({ ...lendingSettings, extension_days: parseInt(e.target.value, 10) || 7 })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">حداکثر امانت همزمان هر عضو:</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={lendingSettings.max_active_reservations}
                        onChange={(e) => setLendingSettings({ ...lendingSettings, max_active_reservations: parseInt(e.target.value, 10) || 4 })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveLendingSettings}
                    className="px-5 py-2 rounded-xl bg-[#84cc16] text-[#042f2e] font-black text-xs hover:bg-[#a3e635]"
                  >
                    ذخیره تنظیمات امانت
                  </button>
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#0d9488]/20">
                {[
                  { id: 'all', label: 'همه موارد', count: reservations.length },
                  { id: 'pending', label: 'در انتظار بررسی', count: reservations.filter((r) => r.status === 'در انتظار بررسی').length },
                  { id: 'extensions', label: 'درخواست‌های تمدید', count: reservations.filter((r) => r.extension_status === 'در انتظار بررسی').length },
                  { id: 'loaned', label: 'امانت‌های فعال', count: reservations.filter((r) => r.status === 'امانت فعال').length },
                  { id: 'dueSoon', label: 'موعد نزدیک (تا ۳ روز)' },
                  { id: 'overdue', label: 'دارای تاخیر (منقضی شده)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setResFilter(f.id as any)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      resFilter === f.id
                        ? 'bg-[#84cc16] text-[#042f2e] shadow-sm'
                        : 'bg-[#042f2e] text-[#99f6e4] hover:bg-[#0d9488]/20'
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.count !== undefined && (
                      <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(f.count)})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Reservations Table */}
            <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl">
              {filteredReservations.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#99f6e4]">
                  هیچ موردی با فیلتر انتخابی یافت نشد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#0d9488]/40 text-[#a3e635]">
                        <th className="py-3 px-3">نام عضو</th>
                        <th className="py-3 px-3">شماره تماس</th>
                        <th className="py-3 px-3">عنوان کتاب</th>
                        <th className="py-3 px-3">قفسه / ردیف</th>
                        <th className="py-3 px-3">وضعیت امانت</th>
                        <th className="py-3 px-3">موعد تحویل</th>
                        <th className="py-3 px-3">وضعیت تمدید</th>
                        <th className="py-3 px-3">عملیات مدیریت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0d9488]/20">
                      {filteredReservations
                        .slice((resPage - 1) * resPageSize, resPage * resPageSize)
                        .map((res) => {
                        const loanInfo = calculateLoanDaysInfo(res);
                        return (
                          <tr key={res.id} className="hover:bg-[#042f2e]/60 transition-colors">
                            <td className="py-3 px-3 font-bold text-white">
                              <div className="flex items-center gap-2">
                                {res.status === 'در انتظار بررسی' && (
                                  <span className="relative flex h-2.5 w-2.5 shrink-0" title="رزرو جدید نیازمند بررسی">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                                  </span>
                                )}
                                <span>{res.user_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#99f6e4]">{toPersianDigits(res.user_phone)}</td>
                            <td className="py-3 px-3 font-semibold text-white max-w-xs truncate">{res.book_title}</td>
                            <td className="py-3 px-3 text-[#5eead4]">
                              قفسه {toPersianDigits(res.shelf)} / ردیف {toPersianDigits(res.row_number || 1)}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                res.status === 'امانت فعال'
                                  ? 'bg-emerald-950 text-[#a3e635] border-[#84cc16]/40'
                                  : res.status === 'در انتظار بررسی'
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                  : res.status === 'تحویل داده شده'
                                  ? 'bg-[#042f2e] text-[#99f6e4] border-[#0d9488]/30'
                                  : 'bg-rose-950 text-rose-300 border-rose-700/40'
                              }`}>
                                {res.status}
                              </span>
                            </td>

                            {/* Due date with countdown */}
                            <td className="py-3 px-3">
                              {loanInfo ? (
                                <div className="space-y-0.5">
                                  <span className="block font-bold text-white text-[11px]">
                                    {toPersianDigits(loanInfo.due_date_str)}
                                  </span>
                                  {loanInfo.isOverdue ? (
                                    <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded">
                                      ⚠️ {toPersianDigits(Math.abs(loanInfo.diffDays))} روز تاخیر
                                    </span>
                                  ) : loanInfo.isDueSoon ? (
                                    <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded">
                                      ⏳ {toPersianDigits(loanInfo.diffDays)} روز باقیمانده
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-[#a3e635]">
                                      {toPersianDigits(loanInfo.diffDays)} روز باقیمانده
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#99f6e4]/60">-</span>
                              )}
                            </td>

                            {/* Extension request decision */}
                            <td className="py-3 px-3">
                              {res.extension_status === 'در انتظار بررسی' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleExtensionAction(res.id, 'approve')}
                                    className="px-2 py-1 rounded bg-[#84cc16] text-[#042f2e] text-[10px] font-black hover:bg-[#a3e635]"
                                    title="تأیید تمدید ۷ روزه"
                                  >
                                    تأیید تمدید
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExtensionAction(res.id, 'reject')}
                                    className="px-2 py-1 rounded bg-rose-900 text-white text-[10px] font-bold hover:bg-rose-800"
                                    title="رد تمدید"
                                  >
                                    رد
                                  </button>
                                </div>
                              ) : res.extension_status === 'تأیید شده' ? (
                                <span className="text-[10px] text-[#a3e635]">تمدید شده</span>
                              ) : res.extension_status === 'رد شده' ? (
                                <span className="text-[10px] text-rose-400">تمدید رد شد</span>
                              ) : (
                                <span className="text-[10px] text-[#99f6e4]/60">ندارد</span>
                              )}
                            </td>

                            {/* Action buttons */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(res.status === 'در انتظار بررسی' || res.status === 'تأیید شده') && (
                                  <div className="flex items-center gap-1 bg-[#042f2e] px-2 py-0.5 rounded-lg border border-[#0d9488]/40">
                                    <span className="text-[#99f6e4] text-[10px]">مدت:</span>
                                    <select
                                      value={loanDaysMap[res.id] || 14}
                                      onChange={(e) => setLoanDaysMap({ ...loanDaysMap, [res.id]: Number(e.target.value) })}
                                      className="bg-transparent text-[#84cc16] font-bold text-[10px] focus:outline-none cursor-pointer"
                                    >
                                      <option value={7} className="bg-[#073834] text-white">۷ روز</option>
                                      <option value={14} className="bg-[#073834] text-white">۱۴ روز</option>
                                      <option value={21} className="bg-[#073834] text-white">۲۱ روز</option>
                                      <option value={30} className="bg-[#073834] text-white">۳۰ روز</option>
                                    </select>
                                  </div>
                                )}

                                {res.status === 'در انتظار بررسی' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateReservation(res.id, 'تأیید شده', 'تأیید شد. آماده تحویل به عضو.', loanDaysMap[res.id] || 14)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white hover:bg-emerald-700 text-[11px] font-bold"
                                    >
                                      تأیید
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateReservation(res.id, 'رد شده', 'رد گردید.')}
                                      className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900 text-[11px]"
                                    >
                                      رد
                                    </button>
                                  </>
                                )}

                                {(res.status === 'تأیید شده' || res.status === 'در انتظار بررسی') && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateReservation(res.id, 'امانت فعال', 'کتاب به عضو تحویل داده شد و دوره امانت آغاز شد.', loanDaysMap[res.id] || 14)}
                                    className="px-2.5 py-1 rounded-lg bg-[#0d9488] text-white hover:bg-[#14b8a6] text-[11px] font-bold"
                                  >
                                    شروع امانت
                                  </button>
                                )}

                                {res.status === 'امانت فعال' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateReservation(res.id, 'تحویل داده شده', 'کتاب با موفقیت به کتابخانه عودت داده شد.')}
                                    className="px-2.5 py-1 rounded-lg bg-[#84cc16] text-[#042f2e] hover:bg-[#a3e635] text-[11px] font-black"
                                  >
                                    ثبت بازگشت کتاب
                                  </button>
                                )}

                                {/* Trash button to permanently delete this reservation/loan record */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReservation(res.id)}
                                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 hover:text-white border border-rose-800/40 transition-colors shadow-sm ml-auto"
                                  title="حذف کامل این رزرو/امانت"
                                  aria-label="حذف کامل"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reservations Pagination */}
              {filteredReservations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#0d9488]/30">
                  <PaginationControls
                    currentPage={resPage}
                    totalItems={filteredReservations.length}
                    pageSize={resPageSize}
                    onPageChange={setResPage}
                    onPageSizeChange={(newSize) => {
                      setResPageSize(newSize);
                      setResPage(1);
                    }}
                    pageSizeOptions={[10, 20, 30, 40, 50]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BOOKS MANAGEMENT (Full CRUD & Smart File Upload) */}
        {/* ========================================================= */}
        {activeTab === 'books' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-6">
              
              {/* Header and Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-[#84cc16]">مرحله ۱.۲ — ویرایش و مدیریت اطلاعات کتاب‌ها</span>
                  <h3 className="text-xl font-black text-white mt-0.5">کاتالوگ و مشخصات کامل کتاب‌ها</h3>
                  <p className="text-xs text-[#99f6e4]">
                    امکان مشاهده، ویرایش عمیق، حذف و افزودن کتاب با تمام ویژگی‌های استاندارد کتابداری
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Shelves & Subjects Editor Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditingShelvesModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-[#042f2e] hover:bg-[#064e3b] text-[#5eead4] border border-[#0d9488]/60 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Layers className="w-4 h-4 text-[#84cc16]" />
                    <span>ویرایش قفسه‌ها و موضوعات</span>
                  </button>

                  {/* Smart File Upload Button (Excel, TXT, HTML) */}
                  <label className="cursor-pointer px-4 py-2.5 rounded-2xl bg-[#0d9488] hover:bg-[#14b8a6] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all">
                    <Upload className="w-4 h-4 text-[#5eead4]" />
                    <span>افزودن هوشمند از فایل (اکسل، متنی، HTML)</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.txt,.csv,.html,.htm"
                      onChange={handleSmartFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBook(true);
                      setEditingBookId(null);
                      setBookForm(initialBookForm);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-[#042f2e] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن کتاب جدید</span>
                  </button>
                </div>
              </div>

              {/* Staged Books Preview & Commit Card inside Books Tab */}
              {stagedBooks.length > 0 && (
                <div className="p-5 rounded-3xl bg-[#042f2e] border-2 border-[#84cc16] space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#84cc16] bg-[#073834] px-2.5 py-0.5 rounded-full border border-[#84cc16]/40">
                        پیش‌نمایش قبل از ذخیره در کاتالوگ
                      </span>
                      <h4 className="text-base font-black text-white mt-1">
                        تعداد {toPersianDigits(stagedBooks.length)} عنوان از «{stagedFileName}» شناسایی گردید
                      </h4>
                    </div>

                    {/* Mode Selector & Quick Commit */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={importLoading}
                        onClick={handleCommitStagedImport}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] hover:from-[#a3e635] hover:to-[#84cc16] text-[#042f2e] font-black text-xs shadow-md flex items-center gap-1.5 transition-all animate-pulse"
                      >
                        <Zap className="w-4 h-4 text-[#042f2e]" />
                        <span>{importLoading ? 'در حال ثبت...' : 'اعمال و ثبت سریع تغییرات'}</span>
                      </button>

                      <div className="flex items-center gap-2 bg-[#073834] p-1 rounded-2xl border border-[#0d9488]/40">
                        <button
                          type="button"
                          onClick={() => setImportMode('append')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            importMode === 'append' ? 'bg-[#84cc16] text-[#042f2e]' : 'text-[#99f6e4]'
                          }`}
                        >
                          افزودن و بروزرسانی
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMode('replace')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            importMode === 'replace' ? 'bg-rose-900 text-white' : 'text-[#99f6e4]'
                          }`}
                        >
                          جایگزینی کامل کاتالوگ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sample rows preview table */}
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-[#0d9488]/30 text-[#a3e635]">
                          <th className="py-2 px-2">نام کتاب</th>
                          <th className="py-2 px-2">نویسنده</th>
                          <th className="py-2 px-2">ناشر</th>
                          <th className="py-2 px-2">قفسه</th>
                          <th className="py-2 px-2">ردیف</th>
                          <th className="py-2 px-2">کد ثبت</th>
                          <th className="py-2 px-2">موضوع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d9488]/20">
                        {stagedBooks.slice(0, 5).map((b, idx) => (
                          <tr key={idx} className="hover:bg-[#073834]/50">
                            <td className="py-2 px-2 font-bold text-white max-w-xs truncate">{b.title}</td>
                            <td className="py-2 px-2 text-[#99f6e4]">{b.author}</td>
                            <td className="py-2 px-2 text-[#ccfbf1]">{b.publisher || '-'}</td>
                            <td className="py-2 px-2 text-[#5eead4]">قفسه {toPersianDigits(b.shelf)}</td>
                            <td className="py-2 px-2 text-[#99f6e4]">{toPersianDigits(b.row_number)}</td>
                            <td className="py-2 px-2 text-[#a3e635]">{toPersianDigits(b.book_number)}</td>
                            <td className="py-2 px-2 text-[#99f6e4]">{b.subject}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={importLoading}
                      onClick={handleCommitStagedImport}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] hover:from-[#a3e635] hover:to-[#84cc16] text-[#042f2e] font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{importLoading ? 'در حال ثبت در پایگاه داده...' : 'تأیید نهایی و ذخیره در کاتالوگ'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagedBooks([])}
                      className="px-4 py-2.5 rounded-2xl bg-[#073834] text-rose-300 text-xs hover:bg-rose-950 transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* Shelves & Subjects Editor Modal */}
              {isEditingShelvesModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#073834] border border-[#0d9488]/60 w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#0d9488]/30 pb-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
                          <Layers className="w-5 h-5 text-[#84cc16]" />
                          <span>ویرایش قفسه‌ها و موضوعات کتابخانه</span>
                        </h3>
                        <p className="text-xs text-[#99f6e4] mt-1">
                          مدیریت ساختار قفسه‌ها و موضوعات؛ تغییرات پس از ذخیره به صورت خودکار و هوشمند در فیلترها، کاتالوگ و صفحه اصلی اعمال می‌شود.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingShelvesModalOpen(false)}
                        className="p-2 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white hover:bg-rose-950/60 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto space-y-6 pr-1 pl-1">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[#a3e635] flex items-center gap-1.5">
                          <span>لیست قفسه‌های تعریف شده و موضوعات هر قفسه:</span>
                          <span className="text-[10px] text-[#99f6e4]">({toPersianDigits(localShelvesConfig.length)} قفسه)</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {localShelvesConfig.map((shelf) => (
                            <div
                              key={shelf.id}
                              className="p-4 rounded-2xl bg-[#042f2e]/80 border border-[#0d9488]/40 space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-[#0d9488]/30 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-[#0d9488]/30 text-[#5eead4] font-black text-xs border border-[#0d9488]/50">
                                    قفسه {toPersianDigits(shelf.id)}
                                  </span>
                                  <span className="text-white font-bold text-xs">{shelf.name}</span>
                                </div>
                                <span className="text-[10px] text-[#99f6e4]">
                                  {toPersianDigits(shelf.subjects.length)} موضوع
                                </span>
                              </div>

                              {/* Subjects list */}
                              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                {shelf.subjects.map((sub) => (
                                  <span
                                    key={sub}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#073834] border border-[#0d9488]/50 text-white text-[11px]"
                                  >
                                    <span>{sub}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubjectFromShelf(shelf.id, sub)}
                                      className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 p-0.5 rounded-full transition-colors"
                                      title="حذف موضوع"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                                {shelf.subjects.length === 0 && (
                                  <span className="text-[11px] text-[#99f6e4]/60 italic">موضوعی برای این قفسه ثبت نشده است.</span>
                                )}
                              </div>

                              {/* Add Subject to shelf */}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  value={newSubjectInputs[shelf.id] || ''}
                                  onChange={(e) => setNewSubjectInputs({ ...newSubjectInputs, [shelf.id]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSubjectToShelf(shelf.id);
                                    }
                                  }}
                                  placeholder="افزودن موضوع جدید به این قفسه..."
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-[#99f6e4]/40"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSubjectToShelf(shelf.id)}
                                  className="px-3 py-1.5 rounded-xl bg-[#0d9488] hover:bg-[#14b8a6] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>افزودن</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add New Shelf */}
                      <div className="p-5 rounded-2xl bg-[#042f2e] border-2 border-dashed border-[#84cc16]/50 space-y-4">
                        <h4 className="text-xs sm:text-sm font-black text-[#a3e635] flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span>افزودن قفسه جدید به همراه موضوعات</span>
                        </h4>
                        <p className="text-xs text-[#99f6e4]">
                          می‌توانید قفسه شماره بعدی را تعریف کرده و موضوعات اولیه آن را وارد فرمایید:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[#99f6e4] mb-1 font-bold">شماره قفسه (عددی):</label>
                            <input
                              type="number"
                              min={1}
                              value={newShelfNumber}
                              onChange={(e) => setNewShelfNumber(e.target.value)}
                              placeholder={`پیش‌فرض: ${Math.max(...localShelvesConfig.map((s) => s.id), 0) + 1}`}
                              className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[#99f6e4] mb-1 font-bold">نام / عنوان قفسه:</label>
                            <input
                              type="text"
                              value={newShelfName}
                              onChange={(e) => setNewShelfName(e.target.value)}
                              placeholder="مثلاً علوم اجتماعی یا ادبیات کهن"
                              className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[#99f6e4] mb-1 font-bold">موضوعات اولیه (با ویرگول جدا کنید):</label>
                            <input
                              type="text"
                              value={newShelfInitialSubjects}
                              onChange={(e) => setNewShelfInitialSubjects(e.target.value)}
                              placeholder="موضوع ۱، موضوع ۲، موضوع ۳"
                              className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewShelf}
                          className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#14b8a6] text-white text-xs font-black flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ثبت و اضافه کردن این قفسه به لیست</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#0d9488]/30">
                      <span className="text-[11px] text-[#99f6e4]">
                        با کلیک روی اعمال تغییرات، قفسه‌ها و موضوعات در تمامی بخش‌ها و فیلترها به‌روز خواهند شد.
                      </span>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsEditingShelvesModalOpen(false)}
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#042f2e] text-[#99f6e4] text-xs font-bold hover:bg-[#064e3b]"
                        >
                          انصراف و بستن
                        </button>
                        <button
                          type="button"
                          disabled={savingShelves}
                          onClick={handleSaveShelvesConfig}
                          className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#84cc16] to-[#65a30d] text-[#042f2e] text-xs font-black flex items-center justify-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-50"
                        >
                          {savingShelves ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>اعمال تغییرات</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add / Edit Form Modal / Card */}
              {(isAddingBook || editingBookId) && (
                <form onSubmit={handleBookSubmit} className="p-6 rounded-3xl bg-[#042f2e] border-2 border-[#84cc16] space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#0d9488]/30 pb-3">
                    <h4 className="text-base font-black text-[#a3e635] flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      <span>{editingBookId ? 'ویرایش مشخصات کتاب' : 'افزودن کتاب جدید به پایگاه داده'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBook(false);
                        setEditingBookId(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      انصراف و بستن
                    </button>
                  </div>

                  {/* Primary & Extended Book Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* نام کتاب: الزامی */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#a3e635] mb-1 font-bold">نام کتاب: * (الزامی)</label>
                      <input
                        type="text"
                        required
                        value={bookForm.title || ''}
                        onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                        placeholder="نام کامل کتاب"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-bold"
                      />
                    </div>

                    {/* نویسنده */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#99f6e4] mb-1 font-bold">نویسنده:</label>
                      <input
                        type="text"
                        value={bookForm.author || ''}
                        onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                        placeholder="نام نویسنده / پدیدآور"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    {/* دوره */}
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">دوره:</label>
                      <input
                        type="text"
                        value={bookForm.series || (bookForm as any).edition || ''}
                        onChange={(e) => setBookForm({ ...bookForm, series: e.target.value, edition: e.target.value })}
                        placeholder="مثلاً دوره ۲ جلدی یا اول"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    {/* جلد */}
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">جلد:</label>
                      <input
                        type="text"
                        value={bookForm.volume || ''}
                        onChange={(e) => setBookForm({ ...bookForm, volume: e.target.value })}
                        placeholder="مثلاً ۱ یا ۲"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    {/* قفسه */}
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">قفسه:</label>
                      <select
                        value={bookForm.shelf || 1}
                        onChange={(e) => setBookForm({ ...bookForm, shelf: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      >
                        {localShelvesConfig.map((s) => (
                          <option key={s.id} value={s.id}>قفسه {toPersianDigits(s.id)} ({s.name})</option>
                        ))}
                      </select>
                    </div>

                    {/* شماره ردیف */}
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">شماره ردیف:</label>
                      <input
                        type="text"
                        value={bookForm.row_number !== undefined && bookForm.row_number !== null ? String(bookForm.row_number) : '1'}
                        onChange={(e) => setBookForm({ ...bookForm, row_number: e.target.value })}
                        placeholder="مثلاً ۱ یا ۲۱۶/۱ یا ۱۰/۴"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-mono"
                      />
                    </div>

                    {/* موضوع */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#99f6e4] mb-1 font-bold">موضوع:</label>
                      <select
                        value={bookForm.subject || ''}
                        onChange={(e) => setBookForm({ ...bookForm, subject: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      >
                        {(() => {
                          const shelfObj = localShelvesConfig.find((s) => s.id === (bookForm.shelf || 1));
                          const subjects = shelfObj && shelfObj.subjects.length > 0 ? shelfObj.subjects : SUBJECTS_LIST;
                          return (
                            <>
                              {subjects.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                              {!subjects.includes(bookForm.subject || '') && bookForm.subject && (
                                <option value={bookForm.subject}>{bookForm.subject}</option>
                              )}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    {/* وضعیت موجودی: فقط ۲ گزینه «موجود» و «امانت داده شده» */}
                    <div className="sm:col-span-2">
                      <label className="block text-[#a3e635] mb-1 font-bold">وضعیت موجودی:</label>
                      <select
                        value={bookForm.availability_status === 'امانت داده شده' ? 'امانت داده شده' : 'موجود'}
                        onChange={(e) => setBookForm({ ...bookForm, availability_status: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-bold"
                      >
                        <option value="موجود">موجود</option>
                        <option value="امانت داده شده">امانت داده شده</option>
                      </select>
                    </div>
                  </div>

                  {/* Cover Image & Description */}
                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="block text-[#99f6e4] mb-1 font-bold">
                        تصویر جلد کتاب (اختیاری):
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={bookForm.cover_image || ''}
                          onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })}
                          placeholder="https://... یا آپلود از رایانه/گوشی"
                          className="flex-1 px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-mono"
                        />
                        <label className={`cursor-pointer shrink-0 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          uploadingCover
                            ? 'bg-[#0d9488]/50 text-white cursor-wait'
                            : 'bg-[#0d9488] hover:bg-[#14b8a6] text-white'
                        }`}>
                          {uploadingCover ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>در حال آپلود...</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="w-3.5 h-3.5 text-[#a3e635]" />
                              <span>آپلود فایل عکس</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingCover}
                            onChange={handleCoverFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {bookForm.cover_image && (
                        <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/30">
                          <img
                            src={bookForm.cover_image}
                            alt="پیش‌نمایش جلد"
                            className="w-10 h-14 object-cover rounded-lg border border-[#84cc16]/50 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-[#a3e635] font-bold block">✓ پیش‌نمایش تصویر جلد</span>
                            <span className="text-[10px] text-[#99f6e4]/70 truncate block">{bookForm.cover_image}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBookForm({ ...bookForm, cover_image: '' })}
                            className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/40"
                          >
                            حذف تصویر
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">توضیحات یا خلاصه کتاب:</label>
                      <textarea
                        rows={2}
                        value={bookForm.description || ''}
                        onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                        placeholder="چکیده‌ای از محتوای کتاب..."
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={!bookForm.title?.trim()}
                      className="px-6 py-2.5 rounded-2xl bg-[#84cc16] text-[#042f2e] font-black text-xs sm:text-sm hover:bg-[#a3e635] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingBookId ? 'ذخیره تغییرات کتاب' : 'ثبت قطعی کتاب'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBook(false);
                        setEditingBookId(null);
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-[#073834] text-white text-xs"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}

              {/* Live Search and 4 Smart Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#042f2e] p-4 rounded-2xl border border-[#0d9488]/30">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#84cc16] absolute right-3 top-3" />
                  <input
                    type="text"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder="جستجو در نام کتاب، نویسنده..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-[#99f6e4]/40"
                  />
                </div>

                <div>
                  <select
                    value={bookShelfFilter}
                    onChange={(e) => setBookShelfFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                  >
                    <option value="all">همه قفسه‌ها</option>
                    {localShelvesConfig.map((s) => (
                      <option key={s.id} value={s.id}>قفسه {toPersianDigits(s.id)} ({s.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={bookSubjectFilter}
                    onChange={(e) => setBookSubjectFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                  >
                    <option value="all">همه موضوعات</option>
                    {adminAvailableSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={bookStatusFilter}
                    onChange={(e) => setBookStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-bold"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="موجود">موجود</option>
                    <option value="امانت داده شده">امانت داده شده</option>
                  </select>
                </div>
              </div>

              {/* Books Table - Exactly the 9 requested columns */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#0d9488]/40 text-[#a3e635]">
                      <th className="py-2.5 px-3">قفسه</th>
                      <th className="py-2.5 px-3">شماره ردیف</th>
                      <th className="py-2.5 px-3">موضوع</th>
                      <th className="py-2.5 px-3">نام کتاب</th>
                      <th className="py-2.5 px-3">نویسنده</th>
                      <th className="py-2.5 px-3">دوره</th>
                      <th className="py-2.5 px-3">جلد</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                      <th className="py-2.5 px-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0d9488]/20">
                    {filteredBooks
                      .slice((booksPage - 1) * booksPageSize, booksPage * booksPageSize)
                      .map((b) => (
                      <tr key={b.id} className="hover:bg-[#042f2e]/60 transition-colors">
                        <td className="py-2.5 px-3 text-[#5eead4] font-bold">قفسه {toPersianDigits(b.shelf)}</td>
                        <td className="py-2.5 px-3 text-[#99f6e4] font-mono">{toPersianDigits(b.row_number)}</td>
                        <td className="py-2.5 px-3 text-[#99f6e4]">{b.subject || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-white max-w-xs truncate">{b.title}</td>
                        <td className="py-2.5 px-3 text-[#ccfbf1]">{b.author || '-'}</td>
                        <td className="py-2.5 px-3 text-[#99f6e4]">{b.series || b.edition || '-'}</td>
                        <td className="py-2.5 px-3 text-[#99f6e4]">{b.volume || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.availability_status === 'موجود'
                              ? 'bg-emerald-950 text-[#a3e635] border border-[#84cc16]/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-600/30'
                          }`}>
                            {b.availability_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBookId(b.id);
                              setIsAddingBook(false);
                              setBookForm(b);
                            }}
                            className="p-1.5 rounded-lg bg-[#073834] text-[#a3e635] hover:bg-[#0d9488]/40"
                            title="ویرایش کامل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`آیا از حذف قطعی کتاب «${b.title}» مطمئن هستید؟`)) {
                                await onDeleteBook(b.id);
                                showSuccess(`کتاب «${b.title}» حذف گردید.`);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Books Pagination */}
              {filteredBooks.length > 0 && (
                <div className="pt-2 border-t border-[#0d9488]/30">
                  <PaginationControls
                    currentPage={booksPage}
                    totalItems={filteredBooks.length}
                    pageSize={booksPageSize}
                    onPageChange={setBooksPage}
                    onPageSizeChange={(newSize) => {
                      setBooksPageSize(newSize);
                      setBooksPage(1);
                    }}
                    pageSizeOptions={[10, 20, 30, 40, 50]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MESSAGES SYSTEM (Stage 11) */}
        {/* ========================================================= */}
        {activeTab === 'messages' && (
          <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#84cc16]">مرحله ۱۱ — سیستم ارتباط و پیام‌رسانی</span>
                <h3 className="text-xl font-black text-white mt-0.5">صندوق پیام‌ها و درخواست‌های اعضا</h3>
                <p className="text-xs text-[#99f6e4]">
                  پاسخ‌گویی مستقیم مدیریت به سوالات، درخواست‌های تهیه کتاب و نظرات کاربران
                </p>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllMessages}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="حذف کلیه پیام‌ها"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف همه پیام‌ها</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchMessages}
                  className="p-2.5 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40"
                  title="بروزرسانی پیام‌ها"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingMessages ? (
              <p className="text-xs text-[#99f6e4] py-8 text-center">در حال بارگذاری پیام‌ها...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-[#99f6e4] py-8 text-center">هیچ پیامی در صندوق دریافت نشده است.</p>
            ) : (
              <div className="space-y-4">
                {[...messages]
                  .sort((a, b) => {
                    const aPending = a.status !== 'پاسخ داده شده';
                    const bPending = b.status !== 'پاسخ داده شده';
                    if (aPending && !bPending) return -1;
                    if (!aPending && bPending) return 1;
                    return 0;
                  })
                  .slice((messagesPage - 1) * messagesPageSize, messagesPage * messagesPageSize)
                  .map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-[#042f2e] border border-[#0d9488]/40 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.status !== 'پاسخ داده شده' && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0" title="پیام جدید نیازمند پاسخ">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                          </span>
                        )}
                        <strong className="text-white font-bold text-sm">{m.user_name}</strong>
                        <span className="text-[11px] text-[#99f6e4]">({toPersianDigits(m.user_phone)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#99f6e4]">{toPersianDigits(m.created_at)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'پاسخ داده شده'
                            ? 'bg-emerald-950 text-[#a3e635] border border-[#84cc16]/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-600/30'
                        }`}>
                          {m.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60"
                          title="حذف پیام"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#073834] text-[#ccfbf1] leading-relaxed">
                      <strong className="block text-[#a3e635] mb-1 font-bold">{m.subject}</strong>
                      <p>{m.content}</p>
                    </div>

                    {/* Existing Admin Reply */}
                    {m.admin_reply && (
                      <div className="p-3.5 rounded-2xl bg-[#073834]/80 border border-[#84cc16]/50 text-[#a3e635] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="block text-[11px] font-bold text-white">پاسخ ثبت‌شده مدیریت:</strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m.id)}
                            className="px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800/40 flex items-center gap-1 transition-colors"
                            title="حذف کامل این پیام پس از پاسخ"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف پیام پس از پاسخ</span>
                          </button>
                        </div>
                        <p className="text-[#f0fdfa] leading-relaxed">{m.admin_reply}</p>
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyTextMap[m.id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [m.id]: e.target.value })}
                        placeholder="متن پاسخ خود به این پیام را بنویسید..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-[#99f6e4]/40"
                      />
                      <button
                        type="button"
                        disabled={sendingReplyId === m.id || !replyTextMap[m.id]?.trim()}
                        onClick={() => handleSendReply(m.id)}
                        className="px-4 py-2 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingReplyId === m.id ? 'در حال ارسال...' : 'ثبت پاسخ'}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Messages Pagination */}
                {messages.length > 0 && (
                  <div className="pt-3 border-t border-[#0d9488]/30">
                    <PaginationControls
                      currentPage={messagesPage}
                      totalItems={messages.length}
                      pageSize={messagesPageSize}
                      onPageChange={setMessagesPage}
                      onPageSizeChange={(newSize) => {
                        setMessagesPageSize(newSize);
                        setMessagesPage(1);
                      }}
                      pageSizeOptions={[10, 20, 30, 40, 50]}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: COMPETITIONS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'competitions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[#84cc16]" />
                  <span>مدیریت مسابقات کتابخوانی</span>
                </h3>
                <p className="text-xs text-[#99f6e4] mt-1">
                  تعریف مسابقات جدید، ویرایش پوستر، تاریخ، جوایز و لینک ورود به مسابقه یا ارسال پاسخ‌ها
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={fetchCompetitions}
                  className="px-3.5 py-2.5 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCompetitions ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی</span>
                </button>
                {competitions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllCompetitions}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="حذف کلیه مسابقات"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف همه مسابقات</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenNewCompModal}
                  className="px-5 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن مسابقه جدید</span>
                </button>
              </div>
            </div>

            {/* Competitions Cards */}
            {loadingCompetitions ? (
              <div className="p-12 text-center text-[#99f6e4] flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#84cc16]" />
                <span>در حال بارگذاری مسابقات...</span>
              </div>
            ) : competitions.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#073834]/60 border border-[#0d9488]/30 text-center space-y-4">
                <Trophy className="w-12 h-12 text-[#84cc16]/50 mx-auto" />
                <p className="text-[#ccfbf1] font-bold">هیچ مسابقه‌ای ثبت نشده است.</p>
                <button
                  type="button"
                  onClick={handleOpenNewCompModal}
                  className="px-4 py-2 rounded-xl bg-[#84cc16] text-[#042f2e] font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>ایجاد اولین مسابقه</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {competitions.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-6 rounded-3xl bg-[#073834]/80 border-2 border-[#0d9488]/40 hover:border-[#84cc16]/50 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Top badge & actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black ${
                            comp.status === 'در حال برگزاری'
                              ? 'bg-[#84cc16] text-[#042f2e]'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {comp.status}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCompModal(comp)}
                            className="p-2 rounded-xl bg-[#042f2e] text-[#5eead4] hover:text-white border border-[#0d9488]/40 transition-colors"
                            title="ویرایش مسابقه"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompetition(comp.id)}
                            className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors"
                            title="حذف مسابقه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Poster if available */}
                      {comp.poster_url && (
                        <div className="w-full h-40 rounded-2xl overflow-hidden bg-[#042f2e] border border-[#0d9488]/30 relative group">
                          <img
                            src={comp.poster_url}
                            alt={comp.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <h4 className="text-lg font-black text-white">{comp.title}</h4>

                      {comp.book_title && (
                        <p className="text-xs text-[#a3e635] font-bold">
                          کتاب منبع: {comp.book_title}
                        </p>
                      )}

                      <p className="text-xs text-[#ccfbf1]/90 leading-relaxed line-clamp-3">
                        {comp.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#99f6e4] pt-2 border-t border-[#0d9488]/20">
                        {comp.start_date && (
                          <div className="flex items-center gap-1.5 bg-[#042f2e] px-2.5 py-1 rounded-lg border border-[#0d9488]/40">
                            <Calendar className="w-3.5 h-3.5 text-[#84cc16]" />
                            <span>شروع: <strong className="text-white">{toPersianDigits(comp.start_date)}</strong></span>
                          </div>
                        )}
                        {comp.end_date && (
                          <div className="flex items-center gap-1.5 bg-[#042f2e] px-2.5 py-1 rounded-lg border border-[#0d9488]/40">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>مهلت: <strong className="text-white">{toPersianDigits(comp.end_date)}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Link preview */}
                      {comp.link_url && (
                        <div className="pt-2">
                          <a
                            href={comp.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#84cc16] hover:text-[#a3e635] hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="truncate max-w-xs">{comp.link_url}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRegistrantsModal(comp)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#042f2e] hover:bg-[#0d9488]/30 border border-[#0d9488]/50 text-[#84cc16] hover:text-[#a3e635] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <Users className="w-4 h-4" />
                        <span>مشاهده اسامی افراد ثبت‌نام شده</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-[#0d9488]/30 flex items-center justify-between text-xs">
                      <span className="text-stone-400 text-[11px]">شناسه: {comp.id}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditCompModal(comp)}
                        className="text-[#84cc16] hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ویرایش جزئیات</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal for Add / Edit Competition */}
            {showCompModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-[#042f2e] border-2 border-[#0d9488]/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-right my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-[#0d9488]/30 mb-6">
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-[#84cc16]" />
                      <span>{editingCompId ? 'ویرایش مسابقه کتابخوانی' : 'افزودن مسابقه جدید'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCompModal(false)}
                      className="p-1.5 rounded-xl bg-[#073834] text-stone-400 hover:text-white border border-[#0d9488]/30"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveCompetition} className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        عنوان مسابقه: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={compForm.title || ''}
                        onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
                        placeholder="مثال: مسابقه بزرگ کتابخوانی «سلام بر ابراهیم»"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                      />
                    </div>

                    {/* Book title & status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          نام کتاب منبع:
                        </label>
                        <input
                          type="text"
                          value={compForm.book_title || ''}
                          onChange={(e) => setCompForm({ ...compForm, book_title: e.target.value })}
                          placeholder="مثال: سلام بر ابراهیم"
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          وضعیت برگزاری:
                        </label>
                        <select
                          value={compForm.status || 'در حال برگزاری'}
                          onChange={(e) => setCompForm({ ...compForm, status: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                        >
                          <option value="در حال برگزاری">در حال برگزاری</option>
                          <option value="به زودی">به زودی</option>
                          <option value="پایان یافته">پایان یافته</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        توضیحات و راهنمای شرکت در مسابقه: <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={compForm.description || ''}
                        onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                        placeholder="اهداف مسابقه، نحوه آزمون و شرایط..."
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                      />
                    </div>

                    {/* Poster Image URL and Upload */}
                    <div className="p-4 rounded-2xl bg-[#073834]/60 border border-[#0d9488]/40 space-y-3">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#84cc16]" />
                        <span>تصویر یا پوستر مسابقه:</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <input
                          type="text"
                          value={compForm.poster_url || ''}
                          onChange={(e) => setCompForm({ ...compForm, poster_url: e.target.value })}
                          placeholder="آدرس اینترنتی پوستر (URL) یا از دکمه آپلود استفاده کنید..."
                          className="w-full px-3 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                        />
                        <label className="shrink-0 px-4 py-2 rounded-xl bg-[#0d9488]/30 hover:bg-[#0d9488]/50 text-[#99f6e4] border border-[#0d9488]/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                          <FileUp className="w-4 h-4 text-[#84cc16]" />
                          <span>انتخاب فایل عکس</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCompPosterUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {compForm.poster_url && (
                        <div className="mt-2 flex items-center gap-3">
                          <img
                            src={compForm.poster_url}
                            alt="پیش‌نمایش پوستر"
                            className="w-20 h-20 object-cover rounded-xl border border-[#84cc16]/50"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setCompForm({ ...compForm, poster_url: '' })}
                            className="text-xs text-rose-400 hover:underline"
                          >
                            حذف تصویر پوستر
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Link URL for participation / test */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-[#84cc16]" />
                        <span>لینک مستقیم ورود به آزمون / صفحه مسابقه (اختیاری):</span>
                      </label>
                      <input
                        type="url"
                        value={compForm.link_url || ''}
                        onChange={(e) => setCompForm({ ...compForm, link_url: e.target.value })}
                        placeholder="مثال: https://eitaa.com/shahidKarbalailibrary یا لینک گوگل‌فرم/دیگر"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500 dir-ltr text-left"
                      />
                    </div>

                    {/* Dates: Start Date & Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          تاریخ شروع:
                        </label>
                        <input
                          type="text"
                          value={compForm.start_date || ''}
                          onChange={(e) => setCompForm({ ...compForm, start_date: e.target.value })}
                          placeholder="۱۴۰۳/۰۱/۱۵"
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          مهلت پایان:
                        </label>
                        <input
                          type="text"
                          value={compForm.end_date || ''}
                          onChange={(e) => setCompForm({ ...compForm, end_date: e.target.value })}
                          placeholder="۱۴۰۳/۰۲/۱۵"
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Prizes (newline separated) */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        جوایز برگزیدگان (هر جایزه در یک خط):
                      </label>
                      <textarea
                        rows={3}
                        value={typeof compForm.prizes === 'string' ? compForm.prizes : (Array.isArray(compForm.prizes) ? compForm.prizes.join('\n') : '')}
                        onChange={(e) => setCompForm({ ...compForm, prizes: e.target.value })}
                        placeholder="کمک‌هزینه مشهد مقدس&#10;کارت هدیه ۵۰۰ هزار تومانی&#10;بسته کتاب نفیس"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                      />
                    </div>

                    {/* Submit buttons */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#0d9488]/30">
                      <button
                        type="button"
                        onClick={() => setShowCompModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-[#073834] text-stone-300 hover:text-white text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs shadow-lg"
                      >
                        {editingCompId ? 'ثبت ویرایش مسابقه' : 'ایجاد مسابقه جدید'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal for Viewing Registrants & Export to Excel */}
            {selectedCompForRegistrants && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-4xl bg-[#042f2e] border-2 border-[#0d9488]/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-right my-8 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-4 border-b border-[#0d9488]/30 mb-4 shrink-0">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-[#84cc16]" />
                        <span>اسامی شرکت‌کنندگان مسابقه «{selectedCompForRegistrants.title}»</span>
                      </h3>
                      <p className="text-xs text-[#99f6e4] mt-1">
                        تعداد کل افراد ثبت‌نام شده:{' '}
                        <span className="font-bold text-white text-sm">{toPersianDigits(compRegistrants.length)}</span> نفر
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCompForRegistrants(null)}
                      className="p-1.5 rounded-xl bg-[#073834] text-stone-400 hover:text-white border border-[#0d9488]/30 transition-colors"
                      title="بستن پنجره"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions & Search */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-[#99f6e4] absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={registrantSearch}
                        onChange={(e) => setRegistrantSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام، تلفن، واحد یا کتاب..."
                        className="w-full pl-3 pr-9 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs placeholder-stone-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExportRegistrantsExcel(selectedCompForRegistrants, compRegistrants)}
                      disabled={compRegistrants.length === 0}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] disabled:opacity-50 text-[#042f2e] font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>خروجی اکسل شرکت‌کنندگان (.csv)</span>
                    </button>
                  </div>

                  {/* Registrants Table */}
                  <div className="flex-1 overflow-y-auto rounded-2xl border border-[#0d9488]/30 bg-[#073834]/60">
                    {loadingRegistrants ? (
                      <div className="p-12 text-center text-[#99f6e4] flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#84cc16]" />
                        <span>در حال دریافت لیست شرکت‌کنندگان...</span>
                      </div>
                    ) : compRegistrants.length === 0 ? (
                      <div className="p-12 text-center text-sm text-[#99f6e4]">
                        هنوز فردی در این مسابقه ثبت‌نام نکرده است.
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead className="sticky top-0 bg-[#042f2e] border-b border-[#0d9488]/40 text-[#a3e635]">
                          <tr>
                            <th className="py-3 px-3">ردیف</th>
                            <th className="py-3 px-3">نام و نام خانوادگی</th>
                            <th className="py-3 px-3">شماره تماس</th>
                            <th className="py-3 px-3">واحد ثبت‌نامی</th>
                            <th className="py-3 px-3">کتاب انتخابی</th>
                            <th className="py-3 px-3">تاریخ ثبت‌نام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0d9488]/20">
                          {(() => {
                            const filtered = compRegistrants.filter((r) => {
                              if (!registrantSearch) return true;
                              const q = registrantSearch.toLowerCase();
                              return (
                                r.full_name.toLowerCase().includes(q) ||
                                r.phone.includes(q) ||
                                (r.unit && r.unit.toLowerCase().includes(q)) ||
                                (r.selected_book && r.selected_book.toLowerCase().includes(q))
                              );
                            });
                            return filtered
                              .slice((registrantsPage - 1) * registrantsPageSize, registrantsPage * registrantsPageSize)
                              .map((r, idx) => {
                                const realIdx = (registrantsPage - 1) * registrantsPageSize + idx;
                                return (
                                  <tr key={r.id || realIdx} className="hover:bg-[#042f2e]/60 transition-colors">
                                    <td className="py-2.5 px-3 text-[#99f6e4] font-bold">{toPersianDigits(realIdx + 1)}</td>
                                    <td className="py-2.5 px-3 font-bold text-white">{r.full_name}</td>
                                    <td className="py-2.5 px-3 text-[#5eead4] dir-ltr text-right">{toPersianDigits(r.phone)}</td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 rounded-full bg-[#042f2e] text-[#a3e635] text-[10px] font-bold border border-[#0d9488]/30">
                                        {r.unit || 'عموم مردم'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-[#ccfbf1]">{r.selected_book || '-'}</td>
                                    <td className="py-2.5 px-3 text-stone-300 text-[11px]">{toPersianDigits(r.registered_at)}</td>
                                  </tr>
                                );
                              });
                          })()}
                        </tbody>
                      </table>
                    )}

                    {/* Registrants Pagination */}
                    {compRegistrants.length > 0 && (
                      <div className="pt-3 border-t border-[#0d9488]/30">
                        <PaginationControls
                          currentPage={registrantsPage}
                          totalItems={
                            compRegistrants.filter((r) => {
                              if (!registrantSearch) return true;
                              const q = registrantSearch.toLowerCase();
                              return (
                                r.full_name.toLowerCase().includes(q) ||
                                r.phone.includes(q) ||
                                (r.unit && r.unit.toLowerCase().includes(q)) ||
                                (r.selected_book && r.selected_book.toLowerCase().includes(q))
                              );
                            }).length
                          }
                          pageSize={registrantsPageSize}
                          onPageChange={setRegistrantsPage}
                          onPageSizeChange={(newSize) => {
                            setRegistrantsPageSize(newSize);
                            setRegistrantsPage(1);
                          }}
                          pageSizeOptions={[10, 20, 30, 40, 50]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: USERS & MEMBERS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#84cc16]" />
                  <span>اطلاعات اعضا و کاربران کتابخانه</span>
                </h3>
                <p className="text-xs text-[#99f6e4] mt-1">
                  مشاهده مشخصات کاربران ثبت‌نامی، وضعیت اشتراک امانت، امانت‌های جاری و امکان دریافت خروجی اکسل کامل
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchUsersList}
                  className="px-3.5 py-2.5 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportUsersExcel}
                  disabled={usersList.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] disabled:opacity-50 text-[#042f2e] font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی اکسل کاربران (.csv)</span>
                </button>
              </div>
            </div>

            {/* Quick stats and Search */}
            <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#042f2e] border border-[#0d9488]/30">
                  <span className="text-xs text-[#99f6e4] block">کل اعضای ثبت‌نام شده:</span>
                  <strong className="text-2xl font-black text-white mt-1 block">
                    {toPersianDigits(usersList.length)} <span className="text-xs font-normal text-[#99f6e4]">نفر</span>
                  </strong>
                </div>
                <div className="p-4 rounded-2xl bg-[#042f2e] border border-[#0d9488]/30">
                  <span className="text-xs text-[#99f6e4] block">دارای اشتراک امانت کتاب:</span>
                  <strong className="text-2xl font-black text-[#a3e635] mt-1 block">
                    {toPersianDigits(usersList.filter((u) => u.has_lending_subscription).length)} <span className="text-xs font-normal text-[#99f6e4]">عضو</span>
                  </strong>
                </div>
                <div className="p-4 rounded-2xl bg-[#042f2e] border border-[#0d9488]/30">
                  <span className="text-xs text-[#99f6e4] block">امانت‌های فعال جاری:</span>
                  <strong className="text-2xl font-black text-[#5eead4] mt-1 block">
                    {toPersianDigits(reservations.filter((r) => r.status === 'امانت فعال').length)} <span className="text-xs font-normal text-[#99f6e4]">جلد</span>
                  </strong>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#99f6e4] absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="جستجوی کاربر بر اساس نام، نام خانوادگی، شماره تماس..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs placeholder-stone-400 focus:outline-none focus:border-[#84cc16]"
                />
              </div>

              {/* Users table */}
              <div className="overflow-x-auto rounded-2xl border border-[#0d9488]/30 bg-[#042f2e]/60">
                {loadingUsers ? (
                  <div className="p-12 text-center text-[#99f6e4] flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#84cc16]" />
                    <span>در حال بارگذاری لیست کاربران...</span>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="p-12 text-center text-sm text-[#99f6e4]">
                    هیچ کاربری یافت نشد.
                  </div>
                ) : (
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#0d9488]/40 text-[#a3e635] bg-[#042f2e]">
                        <th className="py-3 px-3">ردیف</th>
                        <th className="py-3 px-3">نام و نام خانوادگی</th>
                        <th className="py-3 px-3">شماره تماس</th>
                        <th className="py-3 px-3">اشتراک امانت</th>
                        <th className="py-3 px-3">امانت‌های جاری</th>
                        <th className="py-3 px-3">کل رزروها</th>
                        <th className="py-3 px-3">تاریخ ثبت‌نام</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0d9488]/20">
                      {(() => {
                        const filtered = usersList.filter((u) => {
                          if (!userSearchQuery) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (
                            (u.name && u.name.toLowerCase().includes(q)) ||
                            (u.family && u.family.toLowerCase().includes(q)) ||
                            (u.phone && u.phone.includes(q))
                          );
                        });
                        return filtered
                          .slice((usersPage - 1) * usersPageSize, usersPage * usersPageSize)
                          .map((u, idx) => {
                            const realIdx = (usersPage - 1) * usersPageSize + idx;
                            return (
                              <tr key={u.id || realIdx} className="hover:bg-[#073834] transition-colors">
                                <td className="py-3 px-3 text-[#99f6e4] font-bold">{toPersianDigits(realIdx + 1)}</td>
                                <td className="py-3 px-3 font-bold text-white">
                                  {u.name} {u.family}
                                </td>
                                <td className="py-3 px-3 text-[#5eead4] dir-ltr text-right">{toPersianDigits(u.phone)}</td>
                                <td className="py-3 px-3">
                                  {u.has_lending_subscription ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-[#a3e635] border border-[#84cc16]/40">
                                      ✓ اشتراک فعال
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] text-[#99f6e4]/60 bg-[#073834] border border-[#0d9488]/20">
                                      عادی
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-bold text-white">{toPersianDigits(u.active_loans_count || 0)}</span> جلد
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-[#99f6e4]">{toPersianDigits(u.total_reservations || 0)}</span> مورد
                                </td>
                                <td className="py-3 px-3 text-stone-300 text-[11px]">{toPersianDigits(u.registered_at || '-')}</td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                )}

                {/* Users Pagination */}
                {usersList.length > 0 && (
                  <div className="pt-3 border-t border-[#0d9488]/30">
                    <PaginationControls
                      currentPage={usersPage}
                      totalItems={
                        usersList.filter((u) => {
                          if (!userSearchQuery) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (
                            (u.name && u.name.toLowerCase().includes(q)) ||
                            (u.family && u.family.toLowerCase().includes(q)) ||
                            (u.phone && u.phone.includes(q))
                          );
                        }).length
                      }
                      pageSize={usersPageSize}
                      onPageChange={setUsersPage}
                      onPageSizeChange={(newSize) => {
                        setUsersPageSize(newSize);
                        setUsersPage(1);
                      }}
                      pageSizeOptions={[10, 20, 30, 40, 50]}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: FEATURED 4 BOOKS CMS */}
        {/* ========================================================= */}
        {activeTab === 'featured' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Star className="w-6 h-6 text-[#84cc16]" />
                  <span>مدیریت ۴ کتاب ویژه معرفی</span>
                </h3>
                <p className="text-xs text-[#99f6e4] mt-1">
                  ۴ بخش مجزا جهت معرفی کتاب‌های شاخص همراه با گزیده، داستان کتاب، عکس جلد و قابلیت جستجو و درج خودکار از کاتالوگ
                </p>
              </div>
            </div>

            {/* The 4 Featured Books Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1, 2, 3].map((slotIndex) => {
                const bookId = selectedFeatured[slotIndex];
                const slotBook = books.find((b) => b.id === bookId) || books[slotIndex];
                return (
                  <div
                    key={slotIndex}
                    className="p-6 rounded-3xl bg-[#073834]/80 border-2 border-[#0d9488]/40 hover:border-[#84cc16]/50 shadow-xl flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-[#84cc16] text-[#042f2e]">
                          کتاب معرفی شماره {toPersianDigits(slotIndex + 1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFeaturedSlot(slotIndex);
                            setFeaturedSearchQuery('');
                            if (slotBook) {
                              setFeaturedForm({
                                id: slotBook.id,
                                title: slotBook.title || '',
                                author: slotBook.author || '',
                                description: slotBook.description || '',
                                excerpt: slotBook.excerpt || slotBook.description || '',
                                story: slotBook.story || slotBook.description || '',
                                cover_image: slotBook.cover_image || '',
                              });
                            } else {
                              setFeaturedForm({
                                title: '',
                                author: '',
                                description: '',
                                excerpt: '',
                                story: '',
                                cover_image: '',
                              });
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#042f2e] hover:bg-[#84cc16] text-[#84cc16] hover:text-[#042f2e] border border-[#84cc16]/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ویرایش این کتاب</span>
                        </button>
                      </div>

                      {/* Book Cover and Info */}
                      <div className="flex gap-4 items-start pt-2">
                        {slotBook?.cover_image ? (
                          <img
                            src={slotBook.cover_image}
                            alt={slotBook.title}
                            className="w-24 h-32 object-cover rounded-xl border border-[#0d9488]/40 shadow-md shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-24 h-32 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 flex items-center justify-center text-[#99f6e4] shrink-0">
                            <BookOpen className="w-8 h-8 opacity-60 text-[#84cc16]" />
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h4 className="text-base font-black text-white line-clamp-2">
                            {slotBook?.title || `کتاب معرفی ${slotIndex + 1}`}
                          </h4>
                          <p className="text-xs text-[#a3e635] font-semibold">
                            نویسنده: {slotBook?.author || 'نامشخص'}
                          </p>
                          {slotBook?.shelf && (
                            <span className="inline-block text-[11px] text-[#5eead4]">
                              قفسه {toPersianDigits(slotBook.shelf)} / ردیف {toPersianDigits(slotBook.row_number || 1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Excerpt */}
                      <div className="p-3 rounded-2xl bg-[#042f2e]/70 border border-[#0d9488]/20 space-y-1">
                        <span className="text-[11px] font-bold text-[#99f6e4] block">گزیده کتاب:</span>
                        <p className="text-xs text-[#ccfbf1]/90 leading-relaxed line-clamp-3">
                          {slotBook?.excerpt || slotBook?.description || 'هنوز گزیده‌ای ثبت نشده است.'}
                        </p>
                      </div>

                      {/* Story / Part of book */}
                      <div className="p-3 rounded-2xl bg-[#042f2e]/70 border border-[#0d9488]/20 space-y-1">
                        <span className="text-[11px] font-bold text-[#84cc16] block">بخشی از کتاب / داستان اثر:</span>
                        <p className="text-xs text-[#ccfbf1]/90 leading-relaxed line-clamp-3">
                          {slotBook?.story || 'هنوز بخشی از متن اثر ثبت نشده است.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal for editing featured book with search & autofill from catalog */}
            {editingFeaturedSlot !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-2xl bg-[#042f2e] border-2 border-[#0d9488]/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-right my-8 max-h-[90vh] overflow-y-auto space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-[#0d9488]/30">
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <Star className="w-6 h-6 text-[#84cc16]" />
                      <span>ویرایش کتاب معرفی شماره {toPersianDigits(editingFeaturedSlot + 1)}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingFeaturedSlot(null)}
                      className="p-1.5 rounded-xl bg-[#073834] text-stone-400 hover:text-white border border-[#0d9488]/30"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search in catalog to autofill */}
                  <div className="p-4 rounded-2xl bg-[#073834] border border-[#84cc16]/40 space-y-2">
                    <label className="block text-xs font-bold text-[#84cc16] flex items-center gap-1.5">
                      <Search className="w-4 h-4" />
                      <span>وارد کردن سریع اطلاعات از کاتالوگ کتابخانه (جستجوی کتاب):</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={featuredSearchQuery}
                        onChange={(e) => setFeaturedSearchQuery(e.target.value)}
                        placeholder="نام کتاب یا نویسنده را تایپ کنید تا خودکار پر شود..."
                        className="w-full px-3 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs placeholder-stone-400"
                      />
                    </div>

                    {/* Autocomplete list */}
                    {featuredSearchQuery.trim().length > 1 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-[#042f2e] border border-[#0d9488]/40 divide-y divide-[#0d9488]/20">
                        {books
                          .filter((b) =>
                            b.title.toLowerCase().includes(featuredSearchQuery.toLowerCase()) ||
                            b.author.toLowerCase().includes(featuredSearchQuery.toLowerCase())
                          )
                          .slice(0, 5)
                          .map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setFeaturedForm({
                                  id: b.id,
                                  title: b.title,
                                  author: b.author,
                                  description: b.description || '',
                                  excerpt: b.excerpt || b.description || '',
                                  story: b.story || b.description || '',
                                  cover_image: b.cover_image || '',
                                });
                                setFeaturedSearchQuery('');
                                showSuccess(`اطلاعات کتاب «${b.title}» بارگذاری شد.`);
                              }}
                              className="w-full p-2.5 text-right hover:bg-[#073834] flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <strong className="text-white block">{b.title}</strong>
                                <span className="text-[11px] text-[#99f6e4]">{b.author} (قفسه {toPersianDigits(b.shelf)})</span>
                              </div>
                              <span className="text-[10px] text-[#84cc16] font-bold">انتخاب و درج ↵</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!featuredForm.title || !featuredForm.author) {
                        showError('نام کتاب و نویسنده الزامی هستند.');
                        return;
                      }
                      try {
                        let bId = featuredForm.id;
                        if (bId) {
                          await onUpdateBook(bId, {
                            title: featuredForm.title,
                            author: featuredForm.author,
                            description: featuredForm.description || featuredForm.excerpt,
                            excerpt: featuredForm.excerpt,
                            story: featuredForm.story,
                            cover_image: featuredForm.cover_image,
                          });
                        } else {
                          bId = `featured-book-${Date.now()}`;
                          await onAddBook({
                            id: bId,
                            title: featuredForm.title,
                            author: featuredForm.author,
                            description: featuredForm.description || featuredForm.excerpt,
                            excerpt: featuredForm.excerpt,
                            story: featuredForm.story,
                            cover_image: featuredForm.cover_image,
                            shelf: 1,
                            row_number: 1,
                            availability_status: 'موجود',
                          });
                        }

                        const nextFeatured = [...selectedFeatured];
                        while (nextFeatured.length < 4) {
                          nextFeatured.push(books[nextFeatured.length]?.id || bId);
                        }
                        nextFeatured[editingFeaturedSlot] = bId;
                        setSelectedFeatured(nextFeatured);
                        await onUpdateFeaturedBooks(nextFeatured);

                        showSuccess('اطلاعات کتاب با موفقیت ذخیره و در بخش معرفی قرار گرفت.');
                        setEditingFeaturedSlot(null);
                        onRefreshData();
                      } catch {
                        showError('خطا در ذخیره اطلاعات کتاب');
                      }
                    }}
                    className="space-y-4"
                  >
                    {/* Cover image upload / URL */}
                    <div className="p-4 rounded-2xl bg-[#073834]/60 border border-[#0d9488]/40 space-y-3">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#84cc16]" />
                        <span>عکس جلد کتاب:</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <input
                          type="text"
                          value={featuredForm.cover_image || ''}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, cover_image: e.target.value })}
                          placeholder="آدرس تصویر (URL) یا از دکمه آپلود استفاده نمایید..."
                          className="w-full px-3 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs placeholder-stone-500"
                        />
                        <label className="shrink-0 px-4 py-2 rounded-xl bg-[#0d9488]/30 hover:bg-[#0d9488]/50 text-[#99f6e4] border border-[#0d9488]/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                          <FileUp className="w-4 h-4 text-[#84cc16]" />
                          <span>انتخاب فایل عکس</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setFeaturedForm((prev) => ({ ...prev, cover_image: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {featuredForm.cover_image && (
                        <div className="mt-2 flex items-center gap-3">
                          <img
                            src={featuredForm.cover_image}
                            alt="پیش‌نمایش جلد"
                            className="w-16 h-20 object-cover rounded-xl border border-[#84cc16]/50 shadow"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setFeaturedForm({ ...featuredForm, cover_image: '' })}
                            className="text-xs text-rose-400 hover:underline"
                          >
                            حذف تصویر جلد
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Book title & author */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          نام کتاب: <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={featuredForm.title || ''}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                          نام نویسنده: <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={featuredForm.author || ''}
                          onChange={(e) => setFeaturedForm({ ...featuredForm, author: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        گزیده و معرفی کوتاه کتاب:
                      </label>
                      <textarea
                        rows={3}
                        value={featuredForm.excerpt || ''}
                        onChange={(e) => setFeaturedForm({ ...featuredForm, excerpt: e.target.value })}
                        placeholder="متن کوتاه معرفی کتاب جهت ترغیب مخاطب..."
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    {/* Story / Part of book */}
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        بخشی از کتاب (داستان اثر یا فرازی از متن):
                      </label>
                      <textarea
                        rows={4}
                        value={featuredForm.story || ''}
                        onChange={(e) => setFeaturedForm({ ...featuredForm, story: e.target.value })}
                        placeholder="فرازی جذاب از متن کتاب یا داستان کوتاه آن..."
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    {/* Submit buttons */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#0d9488]/30">
                      <button
                        type="button"
                        onClick={() => setEditingFeaturedSlot(null)}
                        className="px-4 py-2.5 rounded-xl bg-[#073834] text-stone-300 hover:text-white text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs shadow-lg"
                      >
                        ذخیره تغییرات کتاب معرفی
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: FAQ MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-[#84cc16]" />
                  <span>مدیریت سؤالات متداول (FAQ)</span>
                </h3>
                <p className="text-xs text-[#99f6e4] mt-1">
                  مشاهده، ویرایش، حذف و افزودن سؤالات و پاسخ‌های متداول کاربران کتابخانه
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchFaqsList}
                  className="px-3.5 py-2.5 rounded-xl bg-[#042f2e] text-[#99f6e4] hover:text-white border border-[#0d9488]/40 text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بروزرسانی</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaqId(null);
                    setFaqForm({
                      category: 'عضویت و اشتراک',
                      question: '',
                      answer: '',
                      published: true,
                    });
                    setShowFaqModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن سؤال متداول جدید</span>
                </button>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="p-6 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#99f6e4] absolute right-3.5 top-3" />
                  <input
                    type="text"
                    value={faqSearchQuery}
                    onChange={(e) => setFaqSearchQuery(e.target.value)}
                    placeholder="جستجو در سؤالات یا پاسخ‌ها..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs placeholder-stone-400 focus:outline-none focus:border-[#84cc16]"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  {['all', 'عضویت و اشتراک', 'امانت و رزرو کتاب', 'مسابقات کتابخوانی', 'ساعات کاری و قوانین'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFaqCategoryFilter(cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        faqCategoryFilter === cat
                          ? 'bg-[#84cc16] text-[#042f2e]'
                          : 'bg-[#042f2e] text-[#99f6e4] hover:bg-[#0d9488]/20'
                      }`}
                    >
                      {cat === 'all' ? 'همه دسته‌ها' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Cards */}
              <div className="space-y-3">
                {adminFaqs
                  .filter((f) => {
                    const matchesCat = faqCategoryFilter === 'all' || f.category === faqCategoryFilter;
                    const q = faqSearchQuery.toLowerCase();
                    const matchesSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
                    return matchesCat && matchesSearch;
                  })
                  .map((faq) => (
                    <div
                      key={faq.id}
                      className="p-5 rounded-2xl bg-[#042f2e] border border-[#0d9488]/30 hover:border-[#84cc16]/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#073834] text-[#a3e635] border border-[#84cc16]/30">
                            {faq.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-[#84cc16] shrink-0" />
                          <span>{faq.question}</span>
                        </h4>
                        <p className="text-xs text-[#ccfbf1]/90 leading-relaxed pl-6">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFaqId(faq.id);
                            setFaqForm({
                              category: faq.category,
                              question: faq.question,
                              answer: faq.answer,
                              published: faq.published !== false,
                            });
                            setShowFaqModal(true);
                          }}
                          className="p-2 rounded-xl bg-[#073834] text-[#5eead4] hover:text-white border border-[#0d9488]/40 transition-colors"
                          title="ویرایش این سؤال"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('آیا از حذف این سؤال متداول اطمینان دارید؟')) return;
                            try {
                              const res = await fetch(`/api/faq/${faq.id}`, { method: 'DELETE' });
                              const data = await res.json();
                              if (data.success) {
                                showSuccess('سؤال متداول با موفقیت حذف شد.');
                                fetchFaqsList();
                                onRefreshData();
                              } else {
                                showError(data.message || 'خطا در حذف');
                              }
                            } catch {
                              showError('خطا در برقراری ارتباط');
                            }
                          }}
                          className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors"
                          title="حذف سؤال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Modal for Add / Edit FAQ */}
            {showFaqModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-lg bg-[#042f2e] border-2 border-[#0d9488]/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-right my-8 max-h-[90vh] overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-[#0d9488]/30">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-[#84cc16]" />
                      <span>{editingFaqId ? 'ویرایش سؤال متداول' : 'افزودن سؤال متداول جدید'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowFaqModal(false)}
                      className="p-1.5 rounded-xl bg-[#073834] text-stone-400 hover:text-white border border-[#0d9488]/30"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!faqForm.question || !faqForm.answer) {
                        showError('عنوان سؤال و متن پاسخ الزامی هستند.');
                        return;
                      }
                      try {
                        if (editingFaqId) {
                          const res = await fetch(`/api/faq/${editingFaqId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(faqForm),
                          });
                          const data = await res.json();
                          if (data.success) {
                            showSuccess('سؤال متداول با موفقیت ویرایش شد.');
                            setShowFaqModal(false);
                            fetchFaqsList();
                            onRefreshData();
                          } else {
                            showError(data.message || 'خطا در ویرایش');
                          }
                        } else {
                          const res = await fetch('/api/faq', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(faqForm),
                          });
                          const data = await res.json();
                          if (data.success) {
                            showSuccess('سؤال متداول جدید ایجاد شد.');
                            setShowFaqModal(false);
                            fetchFaqsList();
                            onRefreshData();
                          } else {
                            showError(data.message || 'خطا در ایجاد');
                          }
                        }
                      } catch {
                        showError('خطا در برقراری ارتباط با سرور');
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        دسته‌بندی سؤال:
                      </label>
                      <select
                        value={faqForm.category}
                        onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs font-bold"
                      >
                        <option value="عضویت و اشتراک">عضویت و اشتراک</option>
                        <option value="امانت و رزرو کتاب">امانت و رزرو کتاب</option>
                        <option value="مسابقات کتابخوانی">مسابقات کتابخوانی</option>
                        <option value="ساعات کاری و قوانین">ساعات کاری و قوانین</option>
                        <option value="عمومی">عمومی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        متن سؤال: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                        placeholder="مثال: هزینه اشتراک سالانه امانت کتاب چقدر است؟"
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#99f6e4] mb-1">
                        متن کامل پاسخ: <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                        placeholder="پاسخ کامل و شفاف به سؤال کاربر..."
                        className="w-full px-3 py-2 rounded-xl bg-[#073834] border border-[#0d9488]/40 text-white text-xs"
                      />
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#0d9488]/30">
                      <button
                        type="button"
                        onClick={() => setShowFaqModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-[#073834] text-stone-300 hover:text-white text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs shadow-lg"
                      >
                        {editingFaqId ? 'ثبت ویرایش سؤال' : 'ایجاد سؤال جدید'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: HOURS AND NOTICE & IMPORTANT ANNOUNCEMENTS */}
        {/* ========================================================= */}
        {activeTab === 'hours' && (
          <div className="space-y-6 max-w-3xl">
            {/* Card 1: Important Announcements */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0d9488]/30 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-xl font-black text-white">مدیریت اطلاعیه‌های مهم کتابخانه</h3>
                  </div>
                  <p className="text-xs text-[#99f6e4] mt-1">
                    متن اطلاعیه مهم در بالای صفحه اصلی و پنل کاربری اعضا به شکل برجسته نمایش داده خواهد شد.
                  </p>
                </div>

                {/* Enable / Disable Toggle */}
                <div className="flex items-center gap-3 bg-[#042f2e] px-3.5 py-2 rounded-2xl border border-[#0d9488]/40 self-start sm:self-auto">
                  <span className="text-xs font-bold text-[#ccfbf1]">وضعیت نمایش:</span>
                  <button
                    type="button"
                    onClick={() => setAnnouncementEnabled(!announcementEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      announcementEnabled ? 'bg-[#84cc16]' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        announcementEnabled ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-black ${announcementEnabled ? 'text-[#a3e635]' : 'text-stone-400'}`}>
                    {announcementEnabled ? 'فعال و نمایان' : 'غیرفعال (مخفی)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#99f6e4] mb-2">
                  متن پیام اطلاعیه مهم:
                </label>
                <textarea
                  rows={4}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="مثال: اعضای محترم، به مناسبت ایام نیمه شعبان مسابقه کتابخوانی ویژه با جوایز ارزنده آغاز شد. مهلت امانت کتاب‌ها در تعطیلات نوروز به صورت خودکار تمدید می‌گردد..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#042f2e] border border-[#0d9488]/40 text-white placeholder-stone-500 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
                />
              </div>

              {/* Fast Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#99f6e4]">متن‌های آماده پیشنهادی:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'به اطلاع می‌رساند کتابخانه فردا در نوبت عصر از ساعت ۱۵ الی ۲۰ دایر می‌باشد.',
                    'مهلت شرکت در مسابقه بزرگ کتابخوانی تا پایان هفته جاری تمدید شد.',
                    'کتاب‌های جدید در حوزه اخلاق و تاریخ اسلام به قفسه‌های کتابخانه اضافه شد.',
                    'به دلیل برگزاری مراسم در شبستان، شیفت کاری امروز تا ساعت ۱۸ خواهد بود.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAnnouncementText(preset)}
                      className="px-2.5 py-1 rounded-xl bg-[#042f2e] hover:bg-[#0d9488]/30 border border-[#0d9488]/30 text-[11px] text-[#ccfbf1] transition-colors"
                    >
                      {preset.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  disabled={savingAnnouncement}
                  onClick={handleSaveAnnouncement}
                  className="px-6 py-2.5 rounded-2xl bg-[#84cc16] hover:bg-[#a3e635] text-[#042f2e] font-black text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{savingAnnouncement ? 'در حال ذخیره‌سازی...' : 'ذخیره و انتشار اطلاعیه'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Operating Hours */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#073834]/80 border border-[#0d9488]/40 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#84cc16]" />
                <span>تنظیمات ساعات کاری کتابخانه</span>
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-[#99f6e4] mb-1">ساعت کاری معمول:</label>
                <input
                  type="text"
                  value={hoursForm.regular_hours || '۱۳:۰۰ تا ۲۰:۰۰'}
                  onChange={(e) => setHoursForm({ ...hoursForm, regular_hours: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#99f6e4] mb-1">اعلام تعطیلی موقت یا مناسبتی (اختیاری):</label>
                <input
                  type="text"
                  value={hoursForm.temporary_closure_reason || ''}
                  onChange={(e) => setHoursForm({ ...hoursForm, temporary_closure_reason: e.target.value })}
                  placeholder="مثال: به مناسبت ایام سوگواری، کتابخانه امروز تعطیل است"
                  className="w-full px-3 py-2 rounded-xl bg-[#042f2e] border border-[#0d9488]/40 text-white text-xs"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  await onUpdateOperatingHours(hoursForm);
                  showSuccess('ساعت کاری با موفقیت به‌روزرسانی شد.');
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#84cc16] text-[#042f2e] font-black text-xs shadow-lg hover:bg-[#a3e635] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ذخیره تغییرات ساعت کاری</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
