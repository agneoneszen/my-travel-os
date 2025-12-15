import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  MapPin, Calendar, ArrowLeft, Plus, X, Save, 
  Trash2, Edit2, Utensils, Car, Camera, Coffee, Bed, Briefcase, Clock,
  Map, List, Wallet, PieChart, Image, Users,
  Globe, LogIn, LogOut, CloudUpload, GripVertical, CheckSquare, Calculator,
  Sun, Cloud, CloudRain, WifiOff, Wifi, DollarSign, ArrowRight, RefreshCw, Mail
} from 'lucide-react';

// --- Firebase ---
import { auth, googleProvider, db } from './firebase';
import { signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

// --- Constants & Helpers ---
const TYPE_ICONS = {
  transport: <Car size={14} />, food: <Utensils size={14} />, spot: <Camera size={14} />,
  relax: <Coffee size={14} />, stay: <Bed size={14} />, work: <Briefcase size={14} />, other: <MapPin size={14} />
};
const TYPE_COLORS = {
  transport: 'bg-blue-100 text-blue-700', food: 'bg-orange-100 text-orange-700', spot: 'bg-emerald-100 text-emerald-700',
  relax: 'bg-purple-100 text-purple-700', stay: 'bg-indigo-100 text-indigo-700', work: 'bg-slate-100 text-slate-700', other: 'bg-gray-100 text-gray-700'
};
const DEFAULT_CATEGORIES = ['餐飲', '交通', '購物', '住宿', '娛樂', '伴手禮', '機票', '其他'];
const CURRENCIES = [
  { code: 'TWD', label: '台幣' }, { code: 'JPY', label: '日圓' }, 
  { code: 'USD', label: '美金' }, { code: 'EUR', label: '歐元' }, 
  { code: 'KRW', label: '韓元' }, { code: 'CNY', label: '人民幣' }
];
const PAYMENT_METHODS = ['現金', '信用卡', 'Apple Pay', 'Line Pay', 'Suica'];

// 日期格式化 YYYY/MM/DD
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '/');
};

// 圖片關鍵字對照 (解決 Unsplash 隨機圖失效問題)
const COVER_IMAGES = {
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    'osaka': 'https://images.unsplash.com/photo-1590559318608-fc06fca0c497?w=800&q=80',
    'japan': 'https://images.unsplash.com/photo-1528360983277-13d9012356ee?w=800&q=80',
    'taipei': 'https://images.unsplash.com/photo-1552417723-45217852668b?w=800&q=80',
    'tainan': 'https://images.unsplash.com/photo-1626278664285-f796b9ee7806?w=800&q=80',
    'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80'
};

const getAutoCover = (inputTitle) => {
    const lowerTitle = inputTitle.toLowerCase();
    for (const [key, url] of Object.entries(COVER_IMAGES)) {
        if (lowerTitle.includes(key)) return url;
    }
    return COVER_IMAGES.default;
};

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [allTrips, setAllTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [currentTripId, setCurrentTripId] = useState(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false); 
  const [loading, setLoading] = useState(true);
  
  // ESC close global
  useEffect(() => {
    const handleEsc = (e) => { 
        if (e.key === 'Escape') { 
            setShowAddTripModal(false); 
            setShowMemberModal(false); 
        } 
    };
    window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Network listener
  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus); window.addEventListener('offline', handleStatus);
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, []);

  // Firebase Auth & Data (Collaborative Logic)
  useEffect(() => {
    getRedirectResult(auth).catch(e => console.error(e));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 核心改變：現在查詢包含 "allowedEmails" 陣列中包含我的 Email 的旅程
        const myEmail = currentUser.email;
        
        // 為了支援 "別人分享給我的"，我們需要查詢 ownerId 是我 OR allowedEmails 包含我
        // 但 Firestore 不支援 OR 查詢跨欄位，所以我們這裡統一邏輯：
        // 建立旅程時，把建立者也放進 allowedEmails。
        
        const tripsQuery = query(collection(db, "trips"), where("allowedEmails", "array-contains", myEmail));
        const expensesQuery = query(collection(db, "expenses"), where("uid", "==", currentUser.uid)); // 記帳暫時還是跟著人，或需進一步優化

        const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
          const tripsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          const safeTrips = tripsData.map(t => ({...t, days: t.days || [], allowedEmails: t.allowedEmails || [] }));
          setAllTrips(safeTrips);
          setLoading(false);
        }, (err) => {
            console.error("Firestore Err:", err);
            // Fallback to cache if error (offline)
            const cached = localStorage.getItem(`trips_${currentUser.uid}`);
            if(cached) setAllTrips(JSON.parse(cached));
            setIsOffline(true);
        });

        // 記帳部分需要更複雜的權限邏輯，這裡簡化：讀取所有我能看到的 Trip ID 相關的帳目
        // 由於 Firestore 限制，我們先讀取所有 Expenses，前端過濾 (MVP 做法)
        const qAllExpenses = query(collection(db, "expenses"));
        const unsubExpenses = onSnapshot(qAllExpenses, (snapshot) => {
             const allEx = snapshot.docs.map(d => ({...d.data(), id: d.id}));
             setExpenses(allEx);
        });

        return () => { unsubTrips(); unsubExpenses(); };
      } else { setAllTrips([]); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithRedirect(auth, googleProvider);
  const handleLogout = async () => { await signOut(auth); };

  // CRUD
  const handleAddTrip = async (newTrip) => {
    if (!user) return;
    const coverUrl = newTrip.coverImage || getAutoCover(newTrip.title);
    // 關鍵：將建立者加入 allowedEmails，這樣查詢時統一邏輯
    await addDoc(collection(db, "trips"), { 
        ...newTrip, 
        uid: user.uid, 
        ownerEmail: user.email,
        allowedEmails: [user.email], // 預設權限給自己
        coverImage: coverUrl 
    });
    setShowAddTripModal(false);
  };
  const handleUpdateTrip = async (updatedTrip) => {
    if (!user) return;
    setAllTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t)); 
    await updateDoc(doc(db, "trips", updatedTrip.id), updatedTrip);
  };
  const handleDeleteTrip = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('確定刪除此旅程？')) await deleteDoc(doc(db, "trips", id));
  };
  const handleUpdateImage = async (e, trip) => {
    e.stopPropagation();
    const newUrl = window.prompt("請輸入圖片網址 (可用 Unsplash 連結):", trip.coverImage);
    if(newUrl) await handleUpdateTrip({...trip, coverImage: newUrl});
  };

  // --- Render ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3"><span className="text-5xl">✈️</span></div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3">Travel OS</h1>
        <p className="text-slate-400 mb-12">多人協作．即時天氣．智慧記帳</p>
        <button onClick={handleLogin} className="bg-black text-white px-10 py-4 rounded-full font-bold shadow-xl flex items-center gap-3"><LogIn size={20} /> 使用 Google 登入</button>
      </div>
    );
  }

  if (!currentTripId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 pb-24 font-sans">
        <header className="mb-10 mt-4 flex justify-between items-center">
          <div><h1 className="text-3xl font-extrabold text-slate-800">我的旅程</h1><p className="text-sm text-slate-400 mt-1 font-medium">{user.email}</p></div>
          <button onClick={handleLogout} className="w-10 h-10 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm flex items-center justify-center"><LogOut size={18} /></button>
        </header>
        {isOffline && <div className="mb-6 bg-orange-50 border border-orange-100 text-orange-600 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold"><WifiOff size={16}/> 離線模式</div>}
        
        {loading ? <div className="text-center text-slate-300 mt-20">載入中...</div> : (
          <div className="grid gap-6">
            {allTrips.map(trip => (
              <div key={trip.id} onClick={() => setCurrentTripId(trip.id)} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer h-64">
                <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                  <h2 className="text-2xl font-bold text-white mb-2">{trip.title}</h2>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-white/90 text-xs font-medium bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 w-fit"><Calendar size={12} /> {formatDate(trip.dates)}</span>
                        {/* 顯示成員數 */}
                        <span className="text-white/80 text-[10px] flex items-center gap-1 px-1"><Users size={10}/> {trip.allowedEmails?.length || 1} 人協作</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0">
                       <button onClick={(e) => handleUpdateImage(e, trip)} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black"><Image size={14} /></button>
                       <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {allTrips.length === 0 && <div onClick={() => setShowAddTripModal(true)} className="h-48 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-slate-400"><Plus size={32} className="mb-2"/><p className="font-bold">建立第一個旅程</p></div>}
          </div>
        )}
        <button onClick={() => setShowAddTripModal(true)} className="fixed bottom-8 right-6 bg-black text-white w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-50"><Plus size={28} /></button>
        {showAddTripModal && <AddTripModal onClose={() => setShowAddTripModal(false)} onSave={handleAddTrip} />}
      </div>
    );
  }

  const trip = allTrips.find(t => t.id === currentTripId);
  if (!trip && currentTripId) { setCurrentTripId(null); return null; }
  // 過濾出屬於此 Trip 的支出
  const currentTripExpenses = expenses.filter(ex => ex.tripId === trip.id);

  return (
    <TripDetail 
      trip={trip} expenses={currentTripExpenses} categories={categories} 
      currentUserEmail={user.email}
      onBack={() => setCurrentTripId(null)} onUpdate={handleUpdateTrip} 
      onAddExpense={(ex) => addDoc(collection(db, "expenses"), { ...ex, tripId: trip.id, uid: user.uid })} // 確保寫入 tripId
      onUpdateExpense={(ex) => updateDoc(doc(db, "expenses", ex.id), ex)}
      onDeleteExpense={(id) => deleteDoc(doc(db, "expenses", id))}
      isOffline={isOffline}
    />
  );
}

// --- Detail View ---
function TripDetail({ trip, expenses, categories, currentUserEmail, onBack, onUpdate, onAddExpense, onDeleteExpense, onUpdateExpense, isOffline }) {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); 
    const [showMemberModal, setShowMemberModal] = useState(false);

    // Sync members to 'allowedEmails' in Firestore
    const handleUpdateMembers = (newEmails) => {
        onUpdate({ ...trip, allowedEmails: newEmails });
        setShowMemberModal(false);
    };

    const handleAddDay = () => {
      const dateStr = window.prompt("輸入日期 (YYYY/MM/DD):", "2025/12/15");
      if (!dateStr) return;
      onUpdate({ ...trip, days: [...(trip.days||[]), { date: formatDate(dateStr), weekday: `Day ${(trip.days||[]).length + 1}`, schedule: [] }] });
      setActiveDayIdx((trip.days||[]).length);
    };
    const handleDeleteDay = (e, index) => {
        e.stopPropagation();
        if(!window.confirm(`確定刪除 ${trip.days[index].date}？`)) return;
        const newDays = trip.days.filter((_, i) => i !== index);
        onUpdate({ ...trip, days: newDays });
        setActiveDayIdx(Math.max(0, index - 1));
    };
  
    // 整合成員名單：Email 當作 ID，顯示名稱暫用 Email 前綴
    const membersList = trip.allowedEmails || [currentUserEmail];
    const displayMembers = membersList.map(email => email.split('@')[0]);
    // 加上 "公費" 選項
    const financeMembers = [...displayMembers, '公費'];

    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-28">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-4 py-3 flex items-center gap-4 border-b border-slate-100">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-slate-800 text-lg truncate">{trip.title}</h1>
            <div className="text-[10px] text-slate-500 flex items-center gap-2 font-medium">
                {isOffline ? <span className="text-orange-500 flex items-center gap-1"><WifiOff size={10}/> 離線</span> : <span className="text-emerald-500 flex items-center gap-1"><Wifi size={10}/> 連線</span>}
                <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(trip.dates)}</span>
            </div>
          </div>
          {/* 成員管理按鈕 */}
          <button onClick={() => setShowMemberModal(true)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 flex items-center gap-1 text-xs font-bold">
              <Users size={16} /> {membersList.length}
          </button>
        </div>
  
        {(activeTab === 'plan' || activeTab === 'map') && (
          <div className="px-4 py-3 overflow-x-auto no-scrollbar flex gap-2 items-center border-b border-slate-100/50">
            {trip.days && trip.days.map((d, i) => (
              <div key={i} onClick={() => setActiveDayIdx(i)} className={`relative group flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${i === activeDayIdx ? 'bg-black text-white shadow-lg scale-105 border-transparent' : 'bg-white text-slate-400 border-slate-100'}`}>
                <span className="block text-[9px] opacity-60 font-medium mb-0.5">{d.weekday}</span>
                {d.date}
                {i === activeDayIdx && <button onClick={(e) => handleDeleteDay(e, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>}
              </div>
            ))}
            <button onClick={handleAddDay} className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-50"><Plus size={18} /></button>
          </div>
        )}
  
        <div className="animate-fade-in">
          {activeTab === 'plan' && <PlanView trip={trip} activeDayIdx={activeDayIdx} onUpdate={onUpdate} />}
          {activeTab === 'map' && <MapView currentDay={trip.days?.[activeDayIdx] || {schedule:[]}} location={trip.title} />}
          {activeTab === 'budget' && <BudgetView trip={trip} expenses={expenses} categories={categories} members={financeMembers} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onUpdateTrip={onUpdate} onUpdateExpense={onUpdateExpense} />}
          {activeTab === 'tools' && <ToolboxView />}
        </div>
        
        {showMemberModal && <MemberManagementModal currentEmails={membersList} currentUserEmail={currentUserEmail} onSave={handleUpdateMembers} onClose={() => setShowMemberModal(false)} />}

        <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pb-8 pt-4 z-50">
          <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
          <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>
      </div>
    );
}

// --- Real Weather API Component (Open-Meteo) ---
function WeatherWidget({ locationName, date }) {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!locationName) return;
            setLoading(true);
            try {
                // 1. Geocoding
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`);
                const geoData = await geoRes.json();
                
                if (!geoData.results) { throw new Error("Location not found"); }
                const { latitude, longitude } = geoData.results[0];

                // 2. Weather Data (Forecast)
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=auto`);
                const weatherData = await weatherRes.json();

                // 3. Find specific date match or use today
                // Open-Meteo returns daily arrays. Simple logic to pick first day for now.
                const code = weatherData.daily.weather_code[0];
                const temp = weatherData.daily.temperature_2m_max[0];
                const rain = weatherData.daily.precipitation_probability_max[0];

                let icon = <Sun size={24} className="text-orange-400"/>;
                let text = "晴朗";
                
                // WMO Weather interpretation
                if (code > 3) { icon = <Cloud size={24} className="text-slate-300"/>; text = "多雲"; }
                if (code > 50) { icon = <CloudRain size={24} className="text-blue-400"/>; text = "有雨"; }

                setWeather({ icon, temp, text, rain });
            } catch (e) {
                console.error("Weather API Error:", e);
                setWeather(null); // Fallback UI
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, [locationName]);

    if (loading) return <div className="mx-4 mt-4 p-4 bg-slate-100 rounded-2xl animate-pulse text-xs text-slate-400 text-center">正在連線氣象衛星...</div>;
    if (!weather) return null;

    return (
        <div className="mx-4 mt-4 mb-2 p-4 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 flex items-center justify-between">
            <div>
                <div className="text-xs font-medium opacity-80 mb-1">{locationName} 天氣預報</div>
                <div className="text-2xl font-bold flex items-center gap-2">{weather.icon} {weather.temp}°C <span className="text-sm font-normal opacity-90">{weather.text}</span></div>
            </div>
            <div className="text-right">
                <div className="text-xs opacity-80">降雨機率</div>
                <div className="font-bold">{weather.rain}%</div>
            </div>
        </div>
    )
}

// --- Plans & Items ---
function PlanView({ trip, activeDayIdx, onUpdate }) {
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const currentDay = trip.days?.[activeDayIdx];
  const schedule = currentDay?.schedule || [];

  const handleSaveItem = (itemData) => {
    const newDays = [...trip.days];
    const daySchedule = [...(newDays[activeDayIdx].schedule || [])];
    if (editingItem) {
      const index = daySchedule.findIndex(i => i === editingItem);
      if(index !== -1) daySchedule[index] = itemData;
    } else {
      daySchedule.push(itemData);
      daySchedule.sort((a, b) => a.time.localeCompare(b.time)); 
    }
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
    setShowItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemIdx) => {
    if(!window.confirm("確定刪除？")) return;
    const newDays = [...trip.days];
    const daySchedule = newDays[activeDayIdx].schedule.filter((_, i) => i !== itemIdx);
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(schedule);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const newDays = [...trip.days];
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: items };
    onUpdate({ ...trip, days: newDays });
  };

  return (
    <div className="pb-10">
      {!currentDay ? <div className="text-center py-20 text-slate-400 text-sm">請先選擇日期</div> : (
        <>
          <WeatherWidget locationName={trip.title} date={currentDay.date} />
          {schedule.length === 0 && <div className="text-center py-16 text-slate-300 text-sm">尚無行程，點擊下方新增</div>}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 px-4">
                  {schedule.map((item, idx) => (
                    <Draggable key={idx} draggableId={`item-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} onClick={() => {setEditingItem(item); setShowItemModal(true)}} className="relative group outline-none">
                           <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-slate-100 -z-10 group-hover:bg-slate-200 transition-colors"></div>
                           <div className={`relative bg-white p-4 pl-3 rounded-2xl border transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-black/10' : 'shadow-sm border-slate-50 hover:shadow-md hover:border-slate-200'}`}>
                             <div className="flex justify-between items-start">
                                 <div {...provided.dragHandleProps} onClick={e => e.stopPropagation()} className="p-2 mr-1 text-slate-300 active:text-black cursor-grab touch-none hover:bg-slate-50 rounded-lg"><GripVertical size={16}/></div>
                                 <div className="flex-1 flex gap-4">
                                     <div className="flex flex-col items-center gap-1 min-w-[3.5rem] pt-1"><span className="text-sm font-bold font-mono text-slate-700">{item.time}</span>{item.duration && <span className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.duration}h</span>}</div>
                                     <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-slate-800 text-base truncate ${item.highlight ? 'text-red-500' : ''}`}>{item.title}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-2"><span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>{TYPE_ICONS[item.type] || TYPE_ICONS.other}</span>{item.timezone && item.timezone !== trip.timezone && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md flex items-center gap-1"><Globe size={10}/> {item.timezone.split('/')[1] || 'Zone'}</span>}</div>
                                        {item.address && <a href={`http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 truncate hover:text-blue-500 hover:underline"><MapPin size={10}/> {item.address}</a>}
                                     </div>
                                 </div>
                                 <div className="flex flex-col gap-1 pl-2"><button onClick={(e) => { e.stopPropagation(); handleDeleteItem(idx); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14}/></button></div>
                             </div>
                             {item.tips && <div className="mt-3 ml-10 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">💡 {item.tips}</div>}
                           </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button onClick={() => {setEditingItem(null); setShowItemModal(true)}} className="mx-4 mt-6 py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl font-bold hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 text-sm w-[calc(100%-2rem)]"><Plus size={16} /> 新增行程</button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}

// --- Member Management (Real Google Invite) ---
function MemberManagementModal({ currentEmails, currentUserEmail, onSave, onClose }) {
    const [input, setInput] = useState('');
    const [emails, setEmails] = useState(currentEmails || []);

    const handleAdd = (e) => {
        e.preventDefault();
        const newEmail = input.trim();
        if (newEmail && newEmail.includes('@') && !emails.includes(newEmail)) {
            setEmails([...emails, newEmail]);
            setInput('');
        } else {
            alert("請輸入有效的 Email");
        }
    };

    const handleDelete = (email) => {
        if (email === currentUserEmail) { alert("不能移除自己！"); return; }
        setEmails(emails.filter(e => e !== email));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Users size={24}/> 邀請旅伴</h3><button onClick={onClose} className="bg-slate-50 p-2 rounded-full"><X size={20} className="text-slate-500"/></button></div>
                
                <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl">輸入朋友的 Google Email，他們登入後就能看到並編輯此旅程。</p>

                <form onSubmit={handleAdd} className="flex gap-3 mb-6">
                    <input type="email" value={input} onChange={(e) => setInput(e.target.value)} placeholder="friend@gmail.com" className="flex-1 p-4 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black font-bold" />
                    <button type="submit" className="bg-black text-white px-5 py-4 rounded-xl font-bold"><Plus size={20}/></button>
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto pb-4 custom-scrollbar">
                    {emails.map(email => (
                        <div key={email} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700">
                            <span className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {email} {email === currentUserEmail && '(我)'}</span>
                            <button onClick={() => handleDelete(email)} className={`p-2 rounded-full transition-colors ${email === currentUserEmail ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:bg-red-50'}`} disabled={email === currentUserEmail}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={() => onSave(emails)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all mt-6">儲存並送出權限</button>
            </div>
        </div>
    );
}

// ... ItemModal, SettlementModal, BudgetView, AddExpenseModal, AddTripModal, MapView, ToolboxView ...
// (這些組件邏輯穩定，保持與上一版一致，但為了確保完整性，我會在這裡列出 AddTripModal 的自動封面修復)

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ title: '', dates: '2025/12/15-2025/12/22', timezone: 'Asia/Taipei', coverImage: '' });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-slate-800">建立新旅程</h3><button onClick={onClose}><X size={24} className="text-slate-400"/></button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-5">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">旅程名稱</label><input required type="text" placeholder="例：東京五日遊" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black" onChange={e => setFormData({...formData, title: e.target.value})} /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">日期範圍</label><input required type="text" value={formData.dates} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black" onChange={e => setFormData({...formData, dates: e.target.value})} /></div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all">開始規劃</button>
        </form>
      </div>
    </div>
  )
}

// --- Toolbox: Flexible Currency ---
function ToolboxView() {
    const [amount, setAmount] = useState('1000');
    const [fromCurr, setFromCurr] = useState('JPY');
    const [toCurr, setToCurr] = useState('TWD');
    // Static rates for stability (Real API requires backend/key)
    const RATES = { 
        JPY: 0.22, TWD: 1, USD: 31.5, EUR: 34.2, KRW: 0.024, CNY: 4.4 
    };
    
    const result = Math.round(amount * (RATES[fromCurr] / RATES[toCurr]) * 100) / 100;

    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2 text-lg"><Calculator size={20}/> 匯率試算</h3>
          <div className="flex gap-4 items-center mb-4">
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">持有</label>
                 <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-transparent font-bold outline-none text-lg" />
                     <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none">{Object.keys(RATES).map(c=><option key={c} value={c}>{c}</option>)}</select>
                 </div>
             </div>
             <ArrowRight className="text-slate-300" />
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">換算</label>
                 <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                     <div className="w-full font-bold text-lg text-emerald-600">{result.toLocaleString()}</div>
                     <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none text-emerald-700">{Object.keys(RATES).map(c=><option key={c} value={c}>{c}</option>)}</select>
                 </div>
             </div>
          </div>
          <div className="text-[10px] text-slate-400 text-center">匯率僅供參考 (1 {fromCurr} ≈ {(RATES[fromCurr]/RATES[toCurr]).toFixed(3)} {toCurr})</div>
        </div>
      </div>
    )
}

// ... Re-include SettlementModal, BudgetView, AddExpenseModal, ItemModal, MapView, TabButton ...
// (Since I cannot output infinite length, please assume the standard Modals I provided in previous step are here. 
//  IMPORTANT: Ensure AddExpenseModal uses the new `members` prop correctly passed down from BudgetView -> App)

function SettlementModal({ expenses, members, onClose }) {
    const calculateBalances = () => {
        const balances = {};
        // members passed here are strings like "UserA", "UserB"
        members.forEach(m => balances[m] = 0);
        expenses.forEach(ex => {
            const payer = ex.payer || '我';
            const forWho = ex.forWho || '全體';
            const amount = parseFloat(ex.twdAmount) || 0;
            if(balances[payer] !== undefined) balances[payer] += amount;
            if (forWho === '全體' || forWho === 'All') {
                const split = amount / members.length;
                members.forEach(m => { if(balances[m]!==undefined) balances[m] -= split; });
            } else if(balances[forWho] !== undefined) {
                balances[forWho] -= amount;
            }
        });
        return balances;
    };
    const balances = calculateBalances();
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-6" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-[2rem] p-8 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><DollarSign size={24} className="text-emerald-500"/> 結算報表</h3><button onClick={onClose}><X size={24} className="text-slate-400"/></button></div>
                <div className="space-y-4">
                    {members.map(member => {
                        const bal = Math.round(balances[member] || 0);
                        return (<div key={member} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"><span className="font-bold text-slate-700">{member}</span><span className={`font-mono font-bold text-lg ${bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{bal >= 0 ? `收 $${bal.toLocaleString()}` : `付 $${Math.abs(bal).toLocaleString()}`}</span></div>)
                    })}
                </div>
            </div>
        </div>
    )
}

function BudgetView({ trip, expenses, categories, members, onAddExpense, onDeleteExpense, onUpdateTrip, onUpdateExpense }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettlement, setShowSettlement] = useState(false); 
    const [editingExpense, setEditingExpense] = useState(null);
    const totalSpentTWD = expenses.reduce((acc, curr) => acc + (parseFloat(curr.twdAmount) || 0), 0);
    const budget = trip.budget || 50000; 
    const progress = Math.min((totalSpentTWD / budget) * 100, 100);
    const handleEditBudget = () => { const newBudget = window.prompt("輸入總預算 (TWD)", budget); if(newBudget && !isNaN(newBudget)) onUpdateTrip({...trip, budget: parseFloat(newBudget)}); };
    const handleOpenEdit = (expense) => { setEditingExpense(expense); };
    useEffect(() => { if(editingExpense) setShowAddModal(true); }, [editingExpense]);
    const handleCloseModal = () => { setShowAddModal(false); setEditingExpense(null); }
  
    return (
      <div className="p-4 pb-20 space-y-6">
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4"><span className="text-slate-400 text-xs font-bold tracking-wider">總支出 (TWD)</span><div className="flex gap-2"><button onClick={() => setShowSettlement(true)} className="bg-emerald-500/20 text-emerald-300 backdrop-blur px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 transition-colors font-bold"><DollarSign size={10} /> 結算</button><button onClick={handleEditBudget} className="bg-white/10 backdrop-blur px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 hover:bg-white/20 transition-colors"><Edit2 size={10} /> 預算</button></div></div>
            <div className="text-4xl font-mono font-bold mb-6 tracking-tighter">${Math.round(totalSpentTWD).toLocaleString()}</div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2"><div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${progress}%` }}></div></div>
            <div className="flex justify-between text-[10px] text-slate-400"><span>{Math.round(progress)}%</span><span>剩餘 ${Math.max(0, budget - Math.round(totalSpentTWD)).toLocaleString()}</span></div>
          </div>
          <PieChart className="absolute -bottom-6 -right-6 text-white/5 w-48 h-48" />
        </div>
        <div className="space-y-3">
            {expenses.map((item) => (
                <div key={item.id} onClick={() => handleOpenEdit(item)} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-slate-300 transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg">{item.category?.[0]}</div>
                        <div>
                            <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium flex gap-2 items-center">{item.category} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {item.date.slice(5)} {(item.payer || item.forWho) && <span className="text-slate-500 bg-slate-100 px-1.5 rounded">付:{item.payer} / 算:{item.forWho === '全體' ? 'All' : item.forWho}</span>}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right"><div className="font-bold font-mono text-slate-800">${parseInt(item.twdAmount).toLocaleString()}</div><div className="text-[10px] text-slate-400">{item.currency} {item.amount}</div></div>
                        <button onClick={(e) => {e.stopPropagation(); onDeleteExpense(item.id)}} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {expenses.length === 0 && <div className="text-center text-slate-400 text-xs py-10">暫無支出紀錄</div>}
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:scale-[1.02]"><Plus size={20} /> 記一筆</button>
        {showAddModal && <AddExpenseModal tripId={trip.id} categories={categories} members={members} initialData={editingExpense} onClose={handleCloseModal} onSave={editingExpense ? onUpdateExpense : onAddExpense} />}
        {showSettlement && <SettlementModal expenses={expenses} members={members} onClose={() => setShowSettlement(false)} />}
      </div>
    );
}

function AddExpenseModal({ tripId, categories, members, initialData, onClose, onSave }) {
    const [formData, setFormData] = useState(initialData || { amount: '', currency: 'JPY', rate: '0.22', twdAmount: 0, title: '', category: '餐飲', paymentMethod: '現金', location: '', notes: '', payer: members[0] || '我', forWho: '全體', date: new Date().toISOString().split('T')[0].replace(/-/g, '/') });
    useEffect(() => { const amt = parseFloat(formData.amount) || 0; const rt = parseFloat(formData.rate) || 1; setFormData(prev => ({...prev, twdAmount: Math.round(amt * rt)})); }, [formData.amount, formData.rate]);
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); if(!formData.amount || !formData.title) return; const dataToSave = initialData ? { ...formData, id: initialData.id } : { ...formData, id: Date.now().toString(), tripId, location: formData.location || '', notes: formData.notes || '' }; onSave(dataToSave); onClose(); };
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
          <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-extrabold text-slate-800">{initialData ? '調整支出' : '新增支出'}</h3><button onClick={onClose}><X size={24} className="text-slate-400"/></button></div>
          <form onSubmit={handleSubmit} className="space-y-5">
             <div className="bg-slate-50 p-5 rounded-2xl flex items-end gap-3 border border-slate-100">
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 mb-1 block">金額</label><input type="number" name="amount" placeholder="0" className="w-full bg-transparent text-4xl font-bold outline-none text-slate-800" value={formData.amount} onChange={handleChange} autoFocus /></div>
                 <select name="currency" value={formData.currency} onChange={handleChange} className="bg-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm outline-none border border-slate-200">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
             </div>
             <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2 text-xs text-slate-400">匯率 <input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-14 bg-slate-100 rounded px-1 py-0.5 text-center text-slate-600 font-mono"/></div>
                 <div className="text-sm font-bold text-slate-800">≈ TWD {formData.twdAmount.toLocaleString()}</div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">項目名稱</label><input type="text" name="title" placeholder="例: 一蘭拉麵" className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" value={formData.title} onChange={handleChange}/></div>
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">分類</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">誰付 (Payer)</label><select name="payer" value={formData.payer} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black">{members.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">算誰的 (For Who)</label><select name="forWho" value={formData.forWho} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black"><option value="全體">全體 (均分)</option>{members.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">付款方式</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                 <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">日期</label><input type="text" name="date" placeholder="YYYY/MM/DD" className="w-full p-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" value={formData.date} onChange={handleChange} /></div>
             </div>
             <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">地點</label><input type="text" name="location" placeholder="例: 澀谷百貨" className="w-full p-4 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black" value={formData.location} onChange={handleChange}/></div>
             <div><label className="text-[10px] text-slate-400 font-bold mb-1 block">備註</label><textarea name="notes" rows="2" placeholder="其他細節..." className="w-full p-4 bg-slate-50 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-black" value={formData.notes} onChange={handleChange}></textarea></div>
             <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">{initialData ? '儲存變更' : '儲存支出'}</button>
          </form>
        </div>
      </div>
    )
}

function ItemModal({ initialData, tripTimezone, onClose, onSave }) {
  const defaultTz = initialData?.timezone || tripTimezone || 'Asia/Taipei';
  const [formData, setFormData] = useState(initialData || { time: '09:00', duration: '1', title: '', type: 'spot', address: '', tips: '', highlight: false, timezone: defaultTz });
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
        <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-extrabold text-slate-800">{initialData ? '編輯行程' : '新增行程'}</h3><button onClick={onClose} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500"/></button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
           <div className="flex gap-4">
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">時間</label><div className="relative"><input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" /><Clock size={16} className="absolute left-3 top-4 text-slate-400"/></div></div>
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">時區</label><div className="relative"><select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-black"><option value="Asia/Taipei">台北 (GMT+8)</option><option value="Asia/Tokyo">東京 (GMT+9)</option><option value="Asia/Seoul">首爾 (GMT+9)</option><option value="Asia/Bangkok">曼谷 (GMT+7)</option><option value="Europe/London">倫敦 (GMT+0)</option><option value="America/New_York">紐約 (GMT-5)</option></select><Globe size={16} className="absolute left-3 top-4 text-slate-400"/></div></div>
           </div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">標題</label><input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full px-4 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" /></div>
           <div className="flex gap-4">
              <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">類型</label><div className="relative"><select name="type" value={formData.type} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black"><option value="spot">景點</option><option value="food">餐廳</option><option value="transport">交通</option><option value="stay">住宿</option><option value="relax">放鬆</option><option value="work">工作</option></select><div className="absolute left-3 top-4 text-slate-400">{TYPE_ICONS[formData.type] || <MapPin size={16}/>}</div></div></div>
              <div className="w-1/3"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">時長 (hr)</label><input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none text-center focus:ring-2 focus:ring-black" /></div>
           </div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">地點</label><div className="relative"><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址..." className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black" /><MapPin size={16} className="absolute left-3 top-4 text-slate-400"/></div></div>
           <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">筆記</label><textarea name="tips" rows="3" value={formData.tips} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black resize-none" placeholder="備註..."></textarea></div>
           <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"><input type="checkbox" name="highlight" checked={formData.highlight} onChange={handleChange} className="w-5 h-5 accent-red-500 rounded" /><span className="text-sm font-bold text-slate-600">標記為重點行程 🔥</span></label>
           <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all mt-4">{initialData ? '儲存變更' : '新增行程'}</button>
        </form>
      </div>
    </div>
  );
}

function MapView({ currentDay, location }) {
    const addresses = currentDay?.schedule?.filter(item => item.address && item.address.length > 2).map(item => encodeURIComponent(item.address)) || [];
    let routeUrl = `http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(location)}`;
    if (addresses.length > 0) {
        const destination = addresses[addresses.length - 1];
        const waypoints = addresses.slice(0, -1).join('|');
        routeUrl = `http://googleusercontent.com/maps.google.com/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
    }
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm text-center border border-slate-100">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><Map size={32} /></div>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">今日路線圖</h3>
          <p className="text-sm text-slate-400 mb-6">已自動偵測 {addresses.length} 個地點</p>
          <a href={routeUrl} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all">開啟 Google Maps 導航</a>
        </div>
      </div>
    )
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-1.5 w-16 transition-all duration-300 ${isActive ? 'text-black scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </button>
    )
}