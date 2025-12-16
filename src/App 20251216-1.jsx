import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  MapPin, Calendar, ArrowLeft, Plus, X, 
  Trash2, Edit2, Utensils, Car, Camera, Coffee, Bed, Briefcase, Clock,
  Map, List, Wallet, PieChart, Image, Users,
  Globe, LogIn, LogOut, GripVertical, CheckSquare, Calculator,
  WifiOff, Wifi, DollarSign, ArrowRight, Mail, CloudUpload // ⬅️ FIX: 補上這個缺少的引用
} from 'lucide-react';

// --- Firebase ---
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';

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
const FINANCE_MEMBERS_BASE = ['我', '公費', '旅伴 A', '旅伴 B']; 

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '/');
};

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
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setShowAddTripModal(false); };
    window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus); window.addEventListener('offline', handleStatus);
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch(e => console.error(e));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const cached = localStorage.getItem(`trips_${currentUser.uid}`);
        if(cached) { setAllTrips(JSON.parse(cached)); setLoading(false); }

        const tripsQuery = query(collection(db, "trips"), where("uid", "==", currentUser.uid));
        
        const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
          const tripsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          const safeTrips = tripsData.map(t => ({
              ...t, 
              days: t.days || [], 
              members: t.members || FINANCE_MEMBERS_BASE 
          }));
          setAllTrips(safeTrips);
          localStorage.setItem(`trips_${currentUser.uid}`, JSON.stringify(safeTrips));
          setLoading(false);
        }, (err) => {
            console.error("Firestore Err:", err);
            setIsOffline(true);
        });

        let unsubExpenses = () => {};
        if (currentTripId) {
            const expensesQuery = query(
                collection(db, "expenses"), 
                where("uid", "==", currentUser.uid),
                where("tripId", "==", currentTripId)
            );
            unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
                const allEx = snapshot.docs.map(d => ({...d.data(), id: d.id}));
                setExpenses(allEx);
            });
        } else {
            setExpenses([]);
        }
        return () => { unsubTrips(); unsubExpenses(); };
      } else { 
          setAllTrips([]); 
          setExpenses([]);
          setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [currentTripId]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (error) { console.error("Login failed:", error); alert("登入失敗，請確認網路連線或使用無痕模式測試。"); }
  };
  const handleLogout = async () => { await signOut(auth); };

  const handleAddTrip = async (newTrip) => {
    if (!user) return;
    const coverUrl = newTrip.coverImage || getAutoCover(newTrip.title);
    await addDoc(collection(db, "trips"), { ...newTrip, uid: user.uid, coverImage: coverUrl, members: FINANCE_MEMBERS_BASE });
    setShowAddTripModal(false);
  };
  const handleUpdateTrip = async (updatedTrip) => {
    if (!user) return;
    setAllTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t)); 
    const { id, ...dataToUpdate } = updatedTrip;
    await updateDoc(doc(db, "trips", id), dataToUpdate);
  };
  const handleDeleteTrip = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('確定刪除此旅程？')) await deleteDoc(doc(db, "trips", id));
  };
  const handleUpdateImage = async (e, trip) => {
    e.stopPropagation();
    const newUrl = window.prompt("請輸入圖片網址:", trip.coverImage);
    if(newUrl) await handleUpdateTrip({...trip, coverImage: newUrl});
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3"><span className="text-5xl">✈️</span></div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3">Travel OS</h1>
        <p className="text-slate-400 mb-12">單人版．簡約規劃．智慧記帳</p>
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
  if (!trip) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">載入旅程詳情中...</div>;
  
  const currentMembers = trip.members || FINANCE_MEMBERS_BASE;
  const currentTripExpenses = expenses.filter(ex => ex.tripId === trip.id);

  return (
    <TripDetail 
      trip={trip} expenses={currentTripExpenses} categories={categories} 
      currentUserEmail={user.email}
      onBack={() => setCurrentTripId(null)} onUpdate={handleUpdateTrip} 
      onAddExpense={(ex) => addDoc(collection(db, "expenses"), { ...ex, tripId: trip.id, uid: user.uid })}
      onUpdateExpense={(ex) => updateDoc(doc(db, "expenses", ex.id), ex)}
      onDeleteExpense={(id) => deleteDoc(doc(db, "expenses", id))}
      isOffline={isOffline}
      members={currentMembers} 
    />
  );
}

function TripDetail({ trip, expenses, categories, onBack, onUpdate, onAddExpense, onDeleteExpense, onUpdateExpense, isOffline, members }) {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); 
    
    const currentDays = trip.days || [];
    
    useEffect(() => {
        if (activeDayIdx >= currentDays.length && currentDays.length > 0) {
            setActiveDayIdx(currentDays.length - 1);
        }
    }, [currentDays.length, activeDayIdx]);

    const activeDay = currentDays[activeDayIdx];

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const handleAddDay = () => {
      const dateStr = window.prompt("輸入日期 (YYYY/MM/DD):", today);
      if (!dateStr) return;
      onUpdate({ ...trip, days: [...(currentDays), { date: formatDate(dateStr), weekday: `Day ${currentDays.length + 1}`, schedule: [] }] });
      setActiveDayIdx(currentDays.length);
    };
    const handleDeleteDay = (e, index) => {
        e.stopPropagation();
        if(!window.confirm(`確定刪除 ${currentDays[index].date}？`)) return;
        const newDays = currentDays.filter((_, i) => i !== index);
        onUpdate({ ...trip, days: newDays });
        setActiveDayIdx(Math.max(0, index - 1));
    };
  
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
        </div>
  
        {(activeTab === 'plan' || activeTab === 'map') && (
          <div className="px-4 py-3 overflow-x-auto no-scrollbar flex gap-2 items-center border-b border-slate-100/50">
            {currentDays.map((d, i) => (
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
          {activeTab === 'map' && activeDay && <MapView currentDay={activeDay} location={trip.title} />}
          {activeTab === 'map' && !activeDay && <div className="text-center py-20 text-slate-400">請先新增行程天數</div>}
          
          {activeTab === 'budget' && <BudgetView trip={trip} expenses={expenses} categories={categories} members={members} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onUpdateTrip={onUpdate} onUpdateExpense={onUpdateExpense} />}
          {activeTab === 'tools' && <ToolboxView />}
        </div>
        
        <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center pb-8 pt-4 z-50">
          <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
          <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>
      </div>
    );
}

function PlanView({ trip, activeDayIdx, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  
  const currentDay = trip.days?.[activeDayIdx];
  const schedule = currentDay?.schedule || [];

  const handleSaveItem = (itemData) => {
    const newDays = [...(trip.days || [])];
    const daySchedule = [...(newDays[activeDayIdx]?.schedule || [])];
    
    // 如果編輯的是舊資料(無ID)，我們會自動補上 ID
    const newItemWithId = { ...itemData, id: itemData.id || generateId() };

    if (editingIndex >= 0) {
      // 編輯模式：使用 index 直接替換
      daySchedule[editingIndex] = newItemWithId;
    } else {
      // 新增模式
      daySchedule.push(newItemWithId);
      daySchedule.sort((a, b) => a.time.localeCompare(b.time)); 
    }
    
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
    setShowItemModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
  };

  const handleDeleteItem = (index) => {
    if(!window.confirm("確定刪除？")) return;
    const newDays = [...(trip.days || [])];
    // 改用 index 刪除
    const daySchedule = newDays[activeDayIdx].schedule.filter((_, i) => i !== index);
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(schedule);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const newDays = [...(trip.days || [])];
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: items };
    onUpdate({ ...trip, days: newDays });
  };

  const openAdd = () => {
      setEditingIndex(-1);
      setEditingItem(null);
      setShowItemModal(true);
  };

  const openEdit = (item, index) => {
      setEditingIndex(index);
      setEditingItem(item);
      setShowItemModal(true);
  };

  return (
    <div className="pb-10">
      {!currentDay ? (
          <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Calendar size={24} /></div>
              <p className="text-slate-500 font-bold mb-2">還沒有行程天數</p>
              <p className="text-slate-400 text-sm mb-6">點擊上方 + 按鈕來新增你的第一天</p>
          </div>
      ) : (
        <>
          {schedule.length === 0 && <div className="text-center py-16 text-slate-300 text-sm">尚無行程，點擊下方新增</div>}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 px-4">
                  {schedule.map((item, idx) => (
                    <Draggable key={item.id || idx} draggableId={item.id || `item-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} onClick={() => openEdit(item, idx)} className="relative group outline-none">
                           <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-slate-100 -z-10 group-hover:bg-slate-200 transition-colors"></div>
                           <div className={`relative bg-white p-4 pl-3 rounded-2xl border transition-all cursor-pointer ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-black/10' : 'shadow-sm border-slate-50 hover:shadow-md hover:border-slate-200'}`}>
                             <div className="flex justify-between items-start">
                                 <div {...provided.dragHandleProps} onClick={e => e.stopPropagation()} className="p-2 mr-1 text-slate-300 active:text-black cursor-grab touch-none hover:bg-slate-50 rounded-lg"><GripVertical size={16}/></div>
                                 <div className="flex-1 flex gap-4">
                                     <div className="flex flex-col items-center gap-1 min-w-[3.5rem] pt-1"><span className="text-sm font-bold font-mono text-slate-700">{item.time}</span>{item.duration && <span className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.duration}h</span>}</div>
                                     <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-slate-800 text-base truncate ${item.highlight ? 'text-red-500' : ''}`}>{item.title}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-2"><span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>{TYPE_ICONS[item.type] || TYPE_ICONS.other}</span>{item.timezone && item.timezone !== trip.timezone && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md flex items-center gap-1"><Globe size={10}/> {item.timezone.split('/')[1] || 'Zone'}</span>}</div>
                                        {item.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 truncate hover:text-blue-500 hover:underline"><MapPin size={10}/> {item.address}</a>}
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
          <button onClick={openAdd} className="mx-4 mt-6 py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl font-bold hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 text-sm w-[calc(100%-2rem)]"><Plus size={16} /> 新增行程</button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}

function SettlementModal({ expenses, members, onClose }) {
    const calculateBalances = () => {
        const balances = {};
        members.forEach(m => balances[m] = 0);
        
        expenses.forEach(ex => {
            const payer = ex.payer || '我';
            const forWho = ex.forWho || '全體';
            const amount = parseFloat(ex.twdAmount) || 0;

            if(balances[payer] !== undefined) balances[payer] += amount;

            if (forWho === '全體' || forWho === 'All') {
                const splitMembers = members.filter(m => m !== '公費');
                const splitAmount = amount / splitMembers.length;
                splitMembers.forEach(m => { if(balances[m]!==undefined) balances[m] -= splitAmount; });
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
                <div className="mt-6 text-xs text-slate-400 text-center">**公費** 不參與均分計算。<br/>正數代表應收，負數代表應付。</div>
            </div>
        </div>
    )
}

function BudgetView({ trip, expenses, categories, members, onAddExpense, onDeleteExpense, onUpdateTrip, onUpdateExpense }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSettlement, setShowSettlement] = useState(false); 
    const [editingExpense, setEditingExpense] = useState(null);
    useEffect(() => { const h = (e) => { if(e.key === 'Escape') { setShowAddModal(false); setEditingExpense(null); setShowSettlement(false); }}; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

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

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ title: '', dates: '', timezone: 'Asia/Taipei', coverImage: '' });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-slate-800">建立新旅程</h3><button onClick={onClose}><X size={24} className="text-slate-400"/></button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-5">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">旅程名稱</label><input required type="text" placeholder="例：東京五日遊" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black" onChange={e => setFormData({...formData, title: e.target.value})} value={formData.title} /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">日期範圍</label><input required type="text" value={formData.dates} placeholder="2025/12/15-2025/12/22" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-black" onChange={e => setFormData({...formData, dates: formatDate(e.target.value)})} /></div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all">開始規劃</button>
        </form>
      </div>
    </div>
  )
}

// 🟢 Toolbox: 可編輯匯率 + 匯入/匯出功能
function ToolboxView() {
    const [amount, setAmount] = useState('1000');
    const [fromCurr, setFromCurr] = useState('JPY');
    const [toCurr, setToCurr] = useState('TWD');
    const DEFAULT_RATES = { JPY: 0.22, TWD: 1, USD: 31.5, EUR: 34.2, KRW: 0.024, CNY: 4.4 };
    const [customRate, setCustomRate] = useState(DEFAULT_RATES['JPY']);

    useEffect(() => {
        const newRate = DEFAULT_RATES[fromCurr] / DEFAULT_RATES[toCurr];
        setCustomRate(parseFloat(newRate.toFixed(4)));
    }, [fromCurr, toCurr]);

    const result = Math.round(amount * customRate * 100) / 100;

    const [checklist, setChecklist] = useState(() => { const saved = localStorage.getItem('my-travel-checklist'); return saved ? JSON.parse(saved) : [{ id: 1, text: '護照 & 簽證', checked: false }, { id: 2, text: '網卡 / Roaming 開通', checked: false }, { id: 3, text: '行動電源 & 充電線', checked: false }, { id: 4, text: '當地現金 / 信用卡', checked: false }, { id: 5, text: '個人藥品', checked: false }];});
    useEffect(() => { localStorage.setItem('my-travel-checklist', JSON.stringify(checklist)); }, [checklist]);
    const toggleCheck = (id) => { setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };

    // 匯出功能
    const handleExport = async () => {
        if(!auth.currentUser) return alert("請先登入");
        try {
            const tripsQ = query(collection(db, "trips"), where("uid", "==", auth.currentUser.uid));
            const expsQ = query(collection(db, "expenses"), where("uid", "==", auth.currentUser.uid));
            const [tripsSnap, expsSnap] = await Promise.all([getDocs(tripsQ), getDocs(expsQ)]);
            const data = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                trips: tripsSnap.docs.map(d => ({...d.data(), _legacyId: d.id})),
                expenses: expsSnap.docs.map(d => d.data())
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `travel_os_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(e) { console.error(e); alert("匯出失敗"); }
    };

    // 匯入功能
    const fileInputRef = useRef(null);
    const handleImportClick = () => fileInputRef.current.click();
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(!auth.currentUser) return alert("請先登入");
        if(!window.confirm("確定要匯入資料嗎？\n這將會新增行程到您的帳號中 (不會覆蓋舊資料)。")) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if(!data.trips) throw new Error("無效的檔案格式");
                const batch = writeBatch(db);
                const newUserId = auth.currentUser.uid;
                const newUserEmail = auth.currentUser.email;
                const tripIdMap = {};

                data.trips.forEach(trip => {
                    const newTripRef = doc(collection(db, "trips"));
                    const oldId = trip._legacyId || trip.id;
                    if(oldId) tripIdMap[oldId] = newTripRef.id;
                    const { _legacyId, id, ...tripContent } = trip; 
                    batch.set(newTripRef, { ...tripContent, uid: newUserId, ownerEmail: newUserEmail, allowedEmails: [newUserEmail], importedAt: new Date().toISOString() });
                });

                if(data.expenses) {
                    data.expenses.forEach(exp => {
                        const newTripId = tripIdMap[exp.tripId];
                        if(newTripId) {
                            const newExpRef = doc(collection(db, "expenses"));
                            const { id, ...expContent } = exp;
                            batch.set(newExpRef, { ...expContent, uid: newUserId, tripId: newTripId });
                        }
                    });
                }
                await batch.commit();
                alert(`成功匯入 ${data.trips.length} 個旅程！請重新整理頁面。`);
                window.location.reload();
            } catch(err) { console.error(err); alert("匯入失敗：檔案格式錯誤或網路問題"); }
        };
        reader.readAsText(file);
    };

    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2 text-lg"><Calculator size={20}/> 匯率試算</h3>
          <div className="flex gap-4 items-center mb-4">
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">持有</label>
                 <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-transparent font-bold outline-none text-lg" />
                     <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
             <ArrowRight className="text-slate-300" />
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">換算</label>
                 <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                     <div className="w-full font-bold text-lg text-emerald-600">{result.toLocaleString()}</div>
                     <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none text-emerald-700">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
          </div>
          <div className="flex items-center gap-2 justify-center mt-2">
             <span className="text-[10px] text-slate-400">自訂匯率: 1 {fromCurr} =</span>
             <input 
                type="number" 
                value={customRate} 
                onChange={e => setCustomRate(e.target.value)} 
                className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-xs font-bold focus:border-black outline-none"
             />
             <span className="text-[10px] text-slate-400">{toCurr}</span>
          </div>
        </div>
        
        {/* Data Manager */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 text-lg"><CloudUpload size={20}/> 數據管理</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">您可以匯出所有旅程與記帳資料進行備份，或將備份檔匯入至此帳號。</p>
            <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="-rotate-45"/> 匯出備份
                </button>
                <button onClick={handleImportClick} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:border-slate-800 hover:text-slate-800 transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="rotate-135"/> 匯入資料
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2 text-lg"><CheckSquare size={20}/> 行前確認</h3>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-4 cursor-pointer group p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-black border-black scale-110' : 'border-slate-300 bg-white'}`}>{item.checked && <CheckSquare size={14} className="text-white" />}</div>
                <span className={`text-sm font-bold transition-colors ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.text}</span>
              </div>
            ))}
          </div>
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

function TabButton({ icon: Icon, label, isActive, onClick }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-1.5 w-16 transition-all duration-300 ${isActive ? 'text-black scale-110' : 'text-slate-300 hover:text-slate-500'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </button>
    )
}