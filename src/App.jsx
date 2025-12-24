import React, { useState, useEffect } from 'react';
import { 
  Calendar, ArrowLeft, Plus, X, Trash2, Image, LogIn, LogOut, 
  WifiOff, Wifi, List, Map, Wallet, Briefcase, Plane, Ticket 
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// --- Firebase ---
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- Components ---
import PlanView from './components/PlanView';
import BudgetView from './components/BudgetView';
import MapView from './components/MapView';
import ToolboxView from './components/ToolboxView';

// --- Constants & Utils ---
import { 
  DEFAULT_CATEGORIES, FINANCE_MEMBERS_BASE, 
  getAutoCover, formatDate, getWeekday 
} from './utils/constants';

// -----------------------------------------------------------------------------
// Sub-components (UI Helpers)
// -----------------------------------------------------------------------------

function TabButton({ icon: Icon, label, isActive, onClick }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-1.5 w-16 transition-all duration-300 ${isActive ? 'text-hero-sky-600 scale-110' : 'text-hero-dark-muted hover:text-hero-dark'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </button>
    )
}

function TransportModal({ trip, onClose, onUpdate }) {
  const [transports, setTransports] = useState(trip.transports || []);
  const [formData, setFormData] = useState({ 
      type: 'Flight', code: '', date: '', time: '', arrTime: '', 
      dep: '', arr: '', terminal: '', note: '' 
  });

  const handleAdd = () => {
    if(!formData.code) return;
    const newTransports = [...transports, { ...formData, id: Date.now().toString() }];
    setTransports(newTransports);
    onUpdate({ ...trip, transports: newTransports });
    setFormData({ type: 'Flight', code: '', date: '', time: '', arrTime: '', dep: '', arr: '', terminal: '', note: '' });
  };

  const handleDelete = (id) => {
    const newTransports = transports.filter(t => t.id !== id);
    setTransports(newTransports);
    onUpdate({ ...trip, transports: newTransports });
  };

  const getDuration = (start, end) => {
      if(!start || !end) return '';
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if(diff < 0) diff += 24 * 60; 
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-6" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-[2rem] p-6 w-full max-w-lg shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-hero-dark flex items-center gap-2"><Plane className="text-hero-sky-500"/> 交通票券統整</h3><button onClick={onClose}><X size={24} className="text-hero-dark-muted"/></button></div>
        
        <div className="bg-hero-sand-50 p-4 rounded-2xl border border-hero-sand-200 mb-6 space-y-3">
           <div className="flex gap-2">
              <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="bg-white p-2 rounded-xl font-bold text-xs outline-none border border-hero-sand-200 text-hero-dark"><option value="Flight">✈️ 航班</option><option value="Train">🚄 鐵路</option><option value="Bus">🚌 巴士</option></select>
              <input type="text" placeholder="班次 (BR198)" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-24 bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 uppercase text-hero-dark"/>
              <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="flex-1 bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
           </div>

           <div className="flex items-center gap-2">
               <input type="text" placeholder="出發地 (TPE)" value={formData.dep} onChange={e=>setFormData({...formData, dep: e.target.value})} className="flex-1 bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
               <span className="text-hero-dark-muted text-xs">➔</span>
               <input type="text" placeholder="抵達地 (NRT)" value={formData.arr} onChange={e=>setFormData({...formData, arr: e.target.value})} className="flex-1 bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
           </div>

           <div className="flex gap-2 items-center">
              <div className="flex-1">
                  <label className="text-[9px] text-hero-dark-muted font-bold pl-1">出發時間</label>
                  <input type="time" value={formData.time} onChange={e=>setFormData({...formData, time: e.target.value})} className="w-full bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
              </div>
              <div className="flex-1">
                  <label className="text-[9px] text-hero-dark-muted font-bold pl-1">抵達時間</label>
                  <input type="time" value={formData.arrTime} onChange={e=>setFormData({...formData, arrTime: e.target.value})} className="w-full bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
              </div>
              <input type="text" placeholder="航廈/座位" value={formData.terminal} onChange={e=>setFormData({...formData, terminal: e.target.value})} className="flex-1 mt-4 bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
           </div>

           <input type="text" placeholder="備註 (訂位代號...)" value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})} className="w-full bg-white p-2 rounded-xl text-xs font-bold outline-none border border-hero-sand-200 text-hero-dark"/>
           <button onClick={handleAdd} className="w-full bg-hero-sky-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-transform hover:bg-hero-sky-600">新增票券資訊</button>
        </div>

        <div className="space-y-3">
          {transports.map(t => (
            <div key={t.id} className="relative bg-white border border-hero-sand-200 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
               <button onClick={()=>handleDelete(t.id)} className="absolute top-3 right-3 text-hero-dark-muted hover:text-hero-smash-500"><X size={14}/></button>
               
               <div className="flex items-center gap-2">
                   <span className="bg-hero-sky-100 text-hero-sky-600 px-2 py-0.5 rounded text-[10px] font-bold">{t.type}</span>
                   <span className="font-extrabold text-lg text-hero-dark">{t.code}</span>
                   {t.date && <span className="text-xs text-hero-dark-muted font-mono bg-hero-sand-50 px-1 rounded">{t.date.slice(5)}</span>}
               </div>

               <div className="flex justify-between items-center bg-hero-sand-50 p-3 rounded-xl border border-hero-sand-100">
                   <div className="text-center">
                       <div className="text-lg font-bold text-hero-dark">{t.time}</div>
                       <div className="text-xs text-hero-dark-muted font-bold">{t.dep || 'DEP'}</div>
                   </div>
                   <div className="flex flex-col items-center px-4">
                       <span className="text-[10px] text-hero-dark-muted font-mono mb-1">{getDuration(t.time, t.arrTime)}</span>
                       <div className="w-16 h-[2px] bg-hero-dark-muted/30 relative">
                           <div className="absolute -right-1 -top-1 w-2 h-2 border-r-2 border-t-2 border-hero-dark-muted/30 rotate-45"></div>
                       </div>
                   </div>
                   <div className="text-center">
                       <div className="text-lg font-bold text-hero-dark">{t.arrTime || '--:--'}</div>
                       <div className="text-xs text-hero-dark-muted font-bold">{t.arr || 'ARR'}</div>
                   </div>
               </div>

               {(t.terminal || t.note) && (
                   <div className="flex gap-2 text-[10px] text-hero-dark-muted font-medium">
                       {t.terminal && <span className="bg-hero-sky-50 text-hero-sky-600 px-2 py-1 rounded-lg">📍 {t.terminal}</span>}
                       {t.note && <span className="bg-gray-50 text-gray-500 px-2 py-1 rounded-lg">📝 {t.note}</span>}
                   </div>
               )}
            </div>
          ))}
          {transports.length === 0 && <div className="text-center text-hero-dark-muted text-xs py-4">尚無交通資訊</div>}
        </div>
      </div>
    </div>
  )
}

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ title: '', dates: '', timezone: 'Asia/Taipei', coverImage: '' });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-hero-dark">建立新旅程</h3><button onClick={onClose}><X size={24} className="text-hero-dark-muted"/></button></div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-5">
          <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">旅程名稱</label><input required type="text" placeholder="例：東京五日遊" className="w-full p-4 bg-hero-sand-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" onChange={e => setFormData({...formData, title: e.target.value})} value={formData.title} /></div>
          <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">日期範圍</label><input required type="text" value={formData.dates} placeholder="YYYY/MM/DD-YYYY/MM/DD" className="w-full p-4 bg-hero-sand-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" onChange={e => setFormData({...formData, dates: formatDate(e.target.value)})} /></div>
          <button type="submit" className="w-full bg-hero-sky-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-hero-sky-600 active:scale-95 transition-all">開始規劃</button>
        </form>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function App() {
  const [user, setUser] = useState(null); 
  const [allTrips, setAllTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [currentTripId, setCurrentTripId] = useState(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // --- Effects ---
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
        // Load Custom Categories if saved (Optional: could save to Firestore user profile)
        const savedCats = localStorage.getItem(`categories_${currentUser.uid}`);
        if (savedCats) setCategories(JSON.parse(savedCats));

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

  // --- Handlers ---
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

  // ✨ Helper to add new category
  const handleAddCategory = (newCat) => {
      if (newCat && !categories.includes(newCat)) {
          const newCategories = [...categories, newCat];
          setCategories(newCategories);
          if (user) localStorage.setItem(`categories_${user.uid}`, JSON.stringify(newCategories));
      }
  };

  // --- Render Views ---

  if (!user) {
    return (
      <div className="min-h-screen bg-hero-sand-50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-hero-dark rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3"><span className="text-5xl">✈️</span></div>
        <h1 className="text-4xl font-extrabold text-hero-dark mb-3">Travel OS</h1>
        <p className="text-hero-dark-muted mb-12">單人版．簡約規劃．智慧記帳</p>
        <button onClick={handleLogin} className="bg-hero-sky-500 hover:bg-hero-sky-600 text-white px-10 py-4 rounded-full font-bold shadow-xl flex items-center gap-3"><LogIn size={20} /> 使用 Google 登入</button>
      </div>
    );
  }

  if (!currentTripId) {
    return (
      <div className="min-h-screen bg-hero-sand-50 p-6 pb-24 font-sans">
        <header className="mb-10 mt-4 flex justify-between items-center">
          <div><h1 className="text-3xl font-extrabold text-hero-dark">我的旅程</h1><p className="text-sm text-hero-dark-muted mt-1 font-medium">{user.email}</p></div>
          <button onClick={handleLogout} className="w-10 h-10 bg-white rounded-full text-hero-dark-muted hover:text-hero-smash-500 shadow-sm flex items-center justify-center"><LogOut size={18} /></button>
        </header>
        {isOffline && <div className="mb-6 bg-orange-50 border border-orange-100 text-orange-600 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold"><WifiOff size={16}/> 離線模式</div>}
        {loading ? <div className="text-center text-hero-dark-muted mt-20">載入中...</div> : (
          <div className="grid gap-6">
            {allTrips.map(trip => (
              <div key={trip.id} onClick={() => setCurrentTripId(trip.id)} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer h-64 border border-hero-sand-200">
                <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                  <h2 className="text-2xl font-bold text-white mb-2">{trip.title}</h2>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-white/90 text-xs font-medium bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 w-fit"><Calendar size={12} /> {formatDate(trip.dates)}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0">
                       <button onClick={(e) => handleUpdateImage(e, trip)} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black"><Image size={14} /></button>
                       <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-hero-smash-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {allTrips.length === 0 && <div onClick={() => setShowAddTripModal(true)} className="h-48 rounded-[2rem] border-2 border-dashed border-hero-sand-200 flex flex-col items-center justify-center text-hero-dark-muted cursor-pointer hover:border-hero-dark-muted"><Plus size={32} className="mb-2"/><p className="font-bold">建立第一個旅程</p></div>}
          </div>
        )}
        <button onClick={() => setShowAddTripModal(true)} className="fixed bottom-8 right-6 bg-hero-sky-500 text-white w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-50 shadow-hero-sky-500/30"><Plus size={28} /></button>
        {showAddTripModal && <AddTripModal onClose={() => setShowAddTripModal(false)} onSave={handleAddTrip} />}
      </div>
    );
  }

  const trip = allTrips.find(t => t.id === currentTripId);
  if (!trip) return <div className="min-h-screen bg-hero-sand-50 flex items-center justify-center text-hero-dark-muted">載入旅程詳情中...</div>;
  
  const currentMembers = trip.members || FINANCE_MEMBERS_BASE;
  const currentTripExpenses = expenses.filter(ex => ex.tripId === trip.id);

  return (
    <TripDetailWrapper 
      trip={trip} 
      expenses={currentTripExpenses} 
      categories={categories} 
      currentUserEmail={user.email}
      members={currentMembers} 
      isOffline={isOffline}
      onBack={() => setCurrentTripId(null)} 
      onUpdateTrip={handleUpdateTrip}
      onAddExpense={(ex) => {
          handleAddCategory(ex.category); // ✨ Save category when adding expense
          addDoc(collection(db, "expenses"), { ...ex, tripId: trip.id, uid: user.uid });
      }}
      onUpdateExpense={(ex) => {
          handleAddCategory(ex.category);
          updateDoc(doc(db, "expenses", ex.id), ex);
      }}
      onDeleteExpense={(id) => deleteDoc(doc(db, "expenses", id))}
    />
  );
}

// -----------------------------------------------------------------------------
// Helper Component: TripDetailWrapper
// -----------------------------------------------------------------------------

function TripDetailWrapper({ 
  trip, expenses, categories, onBack, onUpdateTrip, 
  onAddExpense, onDeleteExpense, onUpdateExpense, 
  isOffline, members 
}) {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); 
    const [showTransport, setShowTransport] = useState(false);
    
    const currentDays = trip.days || [];
    
    useEffect(() => {
        if (activeDayIdx >= currentDays.length && currentDays.length > 0) {
            setActiveDayIdx(currentDays.length - 1);
        }
    }, [currentDays.length, activeDayIdx]);

    const activeDay = currentDays[activeDayIdx];
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');

    const handleAddDay = () => {
      let defaultDate = today;
      if (currentDays.length > 0) {
          const lastDate = new Date(currentDays[currentDays.length - 1].date);
          lastDate.setDate(lastDate.getDate() + 1);
          defaultDate = lastDate.toISOString().split('T')[0].replace(/-/g, '/');
      }
      const dateStr = window.prompt("輸入日期 (YYYY/MM/DD):", defaultDate);
      if (!dateStr) return;
      onUpdateTrip({ ...trip, days: [...currentDays, { date: formatDate(dateStr), weekday: getWeekday(dateStr), schedule: [] }] });
      setActiveDayIdx(currentDays.length);
    };

    const handleDeleteDay = (e, index) => {
        e.stopPropagation();
        if(!window.confirm(`確定刪除 ${currentDays[index].date}？`)) return;
        const newDays = currentDays.filter((_, i) => i !== index);
        onUpdateTrip({ ...trip, days: newDays });
        setActiveDayIdx(Math.max(0, index - 1));
    };

    const handleEditDate = (index) => {
        const oldDate = currentDays[index].date;
        const newDate = window.prompt("修改日期 (YYYY/MM/DD):", oldDate);
        if (!newDate || newDate === oldDate) return;
        const newDays = [...currentDays];
        newDays[index] = { ...newDays[index], date: formatDate(newDate), weekday: getWeekday(newDate) };
        onUpdateTrip({ ...trip, days: newDays });
    };

    const handleDayDragEnd = (result) => {
        if (!result.destination) return;
        const newDays = Array.from(currentDays);
        const [reorderedItem] = newDays.splice(result.source.index, 1);
        newDays.splice(result.destination.index, 0, reorderedItem);
        onUpdateTrip({ ...trip, days: newDays });
        if (activeDayIdx === result.source.index) {
            setActiveDayIdx(result.destination.index);
        }
    };
  
    return (
      <div className="min-h-screen bg-hero-sand-50 font-sans pb-28">
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-4 py-3 flex items-center gap-4 border-b border-hero-sand-200">
          <button onClick={onBack} className="p-2 bg-hero-sand-50 rounded-full text-hero-dark-muted hover:bg-hero-sand-200"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-hero-dark text-lg truncate">{trip.title}</h1>
            <div className="text-[10px] text-hero-dark-muted flex items-center gap-2 font-medium">
                {isOffline ? <span className="text-orange-500 flex items-center gap-1"><WifiOff size={10}/> 離線</span> : <span className="text-hero-deku-500 flex items-center gap-1"><Wifi size={10}/> 連線</span>}
                <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(trip.dates)}</span>
            </div>
          </div>
          <button onClick={() => setShowTransport(true)} className="w-9 h-9 bg-hero-sky-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Ticket size={16}/></button>
        </div>
  
        {/* Day Selector with Drag & Drop */}
        {(activeTab === 'plan' || activeTab === 'map') && (
          <div className="border-b border-hero-sand-200 bg-white z-30 sticky top-[65px]">
             <DragDropContext onDragEnd={handleDayDragEnd}>
               <Droppable droppableId="days-tabs" direction="horizontal">
                 {(provided) => (
                   <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className="px-4 py-3 overflow-x-auto no-scrollbar flex gap-2 items-center"
                   >
                     {currentDays.map((d, i) => (
                       <Draggable key={`${d.date}-${i}`} draggableId={`day-${i}`} index={i}>
                         {(provided, snapshot) => (
                           <div 
                             ref={provided.innerRef}
                             {...provided.draggableProps}
                             {...provided.dragHandleProps}
                             onClick={() => setActiveDayIdx(i)} 
                             onDoubleClick={() => handleEditDate(i)}
                             className={`relative group flex-shrink-0 px-5 py-2.5 rounded-2xl transition-all cursor-pointer border select-none 
                               ${i === activeDayIdx ? 'bg-hero-sky-500 text-white shadow-lg scale-105 border-transparent' : 'bg-white text-hero-dark-muted border-hero-sand-200 hover:border-hero-sand-300'}
                               ${snapshot.isDragging ? 'shadow-2xl rotate-2 z-50' : ''}
                             `}
                           >
                             <span className={`block text-[10px] uppercase font-extrabold mb-0.5 ${i === activeDayIdx ? 'text-white/70' : 'text-hero-dark-muted/60'}`}>
                                {d.weekday || getWeekday(d.date) || 'Day'}
                             </span>
                             <span className="text-sm font-bold">{d.date.slice(5) || d.date}</span>
                             {i === activeDayIdx && <button onClick={(e) => handleDeleteDay(e, i)} className="absolute -top-1 -right-1 bg-hero-smash-500 text-white rounded-full p-0.5"><X size={10} /></button>}
                           </div>
                         )}
                       </Draggable>
                     ))}
                     {provided.placeholder}
                     <button onClick={handleAddDay} className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white border border-dashed border-hero-sand-200 flex items-center justify-center text-hero-dark-muted hover:bg-hero-sand-50"><Plus size={18} /></button>
                   </div>
                 )}
               </Droppable>
             </DragDropContext>
          </div>
        )}
  
        <div className="animate-fade-in">
          {activeTab === 'plan' && <PlanView trip={trip} activeDayIdx={activeDayIdx} onUpdate={onUpdateTrip} />}
          {activeTab === 'map' && activeDay && <MapView currentDay={activeDay} location={trip.title} />}
          {activeTab === 'map' && !activeDay && <div className="text-center py-20 text-hero-dark-muted">請先新增行程天數</div>}
          
          {activeTab === 'budget' && (
            <BudgetView trip={trip} expenses={expenses} categories={categories} members={members} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onUpdateTrip={onUpdateTrip} onUpdateExpense={onUpdateExpense} />
          )}

          {activeTab === 'tools' && <ToolboxView />}
        </div>
        
        <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-hero-sand-200 flex justify-around items-center pb-8 pt-4 z-50">
          <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
          <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>

        {showTransport && <TransportModal trip={trip} onClose={() => setShowTransport(false)} onUpdate={onUpdateTrip} />}
      </div>
    );
}