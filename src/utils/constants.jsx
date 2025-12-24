import React from 'react';
import { 
  Car, Utensils, Camera, Coffee, Bed, Briefcase, MapPin 
} from 'lucide-react';

// --- Icons & Colors ---
export const TYPE_ICONS = {
  transport: <Car size={14} />, 
  food: <Utensils size={14} />, 
  spot: <Camera size={14} />,
  relax: <Coffee size={14} />, 
  stay: <Bed size={14} />, 
  work: <Briefcase size={14} />, 
  other: <MapPin size={14} />
};

export const TYPE_COLORS = {
  transport: 'bg-blue-100 text-blue-700', 
  food: 'bg-orange-100 text-orange-700', 
  spot: 'bg-emerald-100 text-emerald-700',
  relax: 'bg-purple-100 text-purple-700', 
  stay: 'bg-indigo-100 text-indigo-700', 
  work: 'bg-slate-100 text-slate-700', 
  other: 'bg-gray-100 text-gray-700'
};

// --- Static Data ---
export const DEFAULT_CATEGORIES = ['餐飲', '交通', '購物', '住宿', '娛樂', '伴手禮', '機票', '其他'];

export const CURRENCIES = [
  { code: 'TWD', label: '台幣' }, { code: 'JPY', label: '日圓' }, 
  { code: 'USD', label: '美金' }, { code: 'EUR', label: '歐元' }, 
  { code: 'KRW', label: '韓元' }, { code: 'CNY', label: '人民幣' }
];

export const PAYMENT_METHODS = ['現金', '信用卡', 'Apple Pay', 'Line Pay', 'Suica', 'ICOCA'];

export const FINANCE_MEMBERS_BASE = ['我', '公費', '旅伴 A', '旅伴 B']; 

export const COVER_IMAGES = {
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    'osaka': 'https://images.unsplash.com/photo-1590559318608-fc06fca0c497?w=800&q=80',
    'japan': 'https://images.unsplash.com/photo-1528360983277-13d9012356ee?w=800&q=80',
    'taipei': 'https://images.unsplash.com/photo-1552417723-45217852668b?w=800&q=80',
    'tainan': 'https://images.unsplash.com/photo-1626278664285-f796b9ee7806?w=800&q=80',
    'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80'
};

// --- Helper Functions ---

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '/');
};

export const getAutoCover = (inputTitle) => {
    const lowerTitle = inputTitle.toLowerCase();
    for (const [key, url] of Object.entries(COVER_IMAGES)) {
        if (lowerTitle.includes(key)) return url;
    }
    return COVER_IMAGES.default;
};

// 計算時間加總 (Start Time + Duration)
export const addTime = (timeStr, durationHours) => {
    if (!timeStr) return '00:00';
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + (parseFloat(durationHours) * 60);
    
    // 簡單處理跨日 (超過 24 小時取餘數)
    const newTotalMinutes = totalMinutes % (24 * 60);
    
    const newH = Math.floor(newTotalMinutes / 60);
    const newM = Math.round(newTotalMinutes % 60);
    
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

// ✨ 修復版：絕對準確的星期計算 (不受時區影響)
export const getWeekday = (dateStr) => {
    if (!dateStr) return '';
    
    // 強制解析 YYYY/MM/DD 或 YYYY-MM-DD
    // 將分隔符號統一為 '/'
    const normalized = dateStr.replace(/-/g, '/');
    const parts = normalized.split('/');
    
    if (parts.length !== 3) return '';
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS 月份是 0-11
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) return '';
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const zhDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    
    const dayIdx = date.getDay();
    
    return `${zhDays[dayIdx]} ${days[dayIdx]}`;
};