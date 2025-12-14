import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  MapPin, Calendar, ArrowLeft, Plus, X, Save, 
  Trash2, Edit2, Utensils, Car, Camera, Coffee, Bed, Briefcase, Clock,
  Map, List, Calculator, CheckSquare, Wallet, PieChart, 
  Globe, ChevronDown, LogIn, LogOut, CloudUpload, GripVertical, Search
} from 'lucide-react';

// --- Firebase 相關引入 ---
import { auth, googleProvider, db } from './firebase';
import { signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

// --- 設定與常數 ---
const TYPE_ICONS = {
  transport: <Car size={14} />,
  food: <Utensils size={14} />,
  spot: <Camera size={14} />,
  relax: <Coffee size={14} />,
  stay: <Bed size={14} />,
  work: <Briefcase size={14} />,
  other: <MapPin size={14} />
};

const TYPE_COLORS = {
  transport: 'bg-blue-50 text-blue-600 border-blue-100',
  food: 'bg-orange-50 text-orange-600 border-orange-100',
  spot: 'bg-green-50 text-green-600 border-green-100',
  relax: 'bg-purple-50 text-purple-600 border-purple-100',
  stay: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  work: 'bg-gray-50 text-gray-600 border-gray-100',
  other: 'bg-gray-50 text-gray-500 border-gray-100'
};

const DEFAULT_CATEGORIES = ['餐飲', '交通', '購物', '住宿', '娛樂', '伴手禮', '機票', '其他'];

const CURRENCIES = [
  { code: 'TWD', label: '台幣' }, { code: 'JPY', label: '日圓' }, { code: 'USD', label: '美金' },
  { code: 'EUR', label: '歐元' }, { code: 'KRW', label: '韓元' },
];

const PAYMENT_METHODS = ['現金', '信用卡', 'Apple Pay', 'Line Pay', 'Suica'];

export default function App() {
  const [user, setUser] = useState(null); 
  const [allTrips, setAllTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  const [currentTripId, setCurrentTripId] = useState(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- 1. 監聽登入狀態與資料庫 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const tripsQuery = query(collection(db, "trips"), where("uid", "==", currentUser.uid));
        const expensesQuery = query(collection(db, "expenses"), where("uid", "==", currentUser.uid));

        const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
          const tripsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          const safeTrips = tripsData.map(t => ({...t, days: t.days || []}));
          setAllTrips(safeTrips);
        });

        const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
          const expData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          setExpenses(expData);
        });

        return () => { unsubTrips(); unsubExpenses(); };
      } else {
        setAllTrips([]);
        setExpenses([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithRedirect(auth, googleProvider);
  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Logout failed", error); } };

  const handleMigrateData = async () => {
    if (!user) return alert("請先登入！");
    if (!window.confirm("將本機資料上傳到雲端？")) return;
    const localTrips = JSON.parse(localStorage.getItem('my-travel-os-data') || '[]');
    const localExpenses = JSON.parse(localStorage.getItem('my-travel-os-expenses') || '[]');
    if (localTrips.length === 0 && localExpenses.length === 0) return alert("本機無資料！");
    setLoading(true);
    try {
      const batch = writeBatch(db);
      localTrips.forEach(trip => {
        const docRef = doc(collection(db, "trips"));
        batch.set(docRef, { ...trip, uid: user.uid, legacyId: trip.id });
      });
      localExpenses.forEach(exp => {
        const docRef = doc(collection(db, "expenses"));
        batch.set(docRef, { ...exp, uid: user.uid });
      });
      await batch.commit();
      alert("移轉成功！");
    } catch (e) { console.error(e); alert("移轉失敗"); }
    setLoading(false);
  };

  // --- CRUD Operations ---
  const handleAddTrip = async (newTrip) => {
    if (!user) return;
    const { id, ...tripData } = newTrip; 
    await addDoc(collection(db, "trips"), { ...tripData, uid: user.uid });
    setShowAddTripModal(false);
  };
  const handleUpdateTrip = async (updatedTrip) => {
    if (!user) return;
    await updateDoc(doc(db, "trips", updatedTrip.id), updatedTrip);
  };
  const handleDeleteTrip = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('刪除整個旅程？')) await deleteDoc(doc(db, "trips", id));
  };
  const handleAddExpense = async (newExpense) => {
    if (!user) return;
    const { id, ...expData } = newExpense;
    await addDoc(collection(db, "expenses"), { ...expData, uid: user.uid });
  };
  const handleDeleteExpense = async (id) => {
    if(window.confirm('刪除此帳目？')) await deleteDoc(doc(db, "expenses", id));
  };

  // --- 登入頁面 ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-black/10">
            <Plane className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight mb-2">Travel OS</h1>
        <p className="text-gray-400 mb-10 text-sm">你的極簡旅行與記帳助手</p>
        <button onClick={handleLogin} className="bg-black text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-black/20 flex items-center gap-3 active:scale-95 transition-transform">
          <LogIn size={20} /> 使用 Google 登入
        </button>
      </div>
    );
  }

  // --- 首頁 ---
  if (!currentTripId) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-6 pb-20 relative">
        <header className="mb-8 mt-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">我的旅程</h1>
            <p className="text-xs text-gray-400 mt-1">Hello, {user.displayName}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm"><LogOut size={16} /></button>
        </header>

        {loading ? <div className="text-center text-gray-400 mt-20">載入中...</div> : (
          <div className="grid gap-6">
            {allTrips.map(trip => (
              <div key={trip.id} onClick={() => setCurrentTripId(trip.id)} className="cursor-pointer group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 relative">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-5">
                    <h2 className="text-xl font-bold text-white mb-1">{trip.title}</h2>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 text-white/80 text-xs font-medium">
                         <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1"><Calendar size={10} /> {trip.dates}</span>
                         {trip.timezone && <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1"><Globe size={10} /> {trip.timezone}</span>}
                      </div>
                      <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="text-white/50 hover:text-red-400 p-2"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {allTrips.length === 0 && (
                <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">還沒有旅程，開始規劃吧！</p>
                </div>
            )}
          </div>
        )}
        <button onClick={() => setShowAddTripModal(true)} className="fixed bottom-8 right-6 bg-black text-white w-14 h-14 rounded-full shadow-2xl shadow-black/30 hover:scale-105 transition-transform flex items-center justify-center z-50"><Plus size={24} /></button>
        {showAddTripModal && <AddTripModal onClose={() => setShowAddTripModal(false)} onSave={handleAddTrip} />}
        
        <div className="text-center mt-12 pb-8">
             <button onClick={handleMigrateData} className="text-[10px] text-gray-400 hover:text-blue-500 underline flex items-center justify-center gap-1 mx-auto">
                <CloudUpload size={10}/> 同步本機資料
             </button>
        </div>
      </div>
    );
  }

  const trip = allTrips.find(t => t.id === currentTripId);
  const currentTripExpenses = expenses.filter(ex => ex.tripId === trip.id || (trip.legacyId && ex.tripId === trip.legacyId));

  return (
    <TripDetail 
      trip={trip} 
      expenses={currentTripExpenses}
      categories={categories}
      onBack={() => setCurrentTripId(null)} 
      onUpdate={handleUpdateTrip} 
      onAddExpense={handleAddExpense}
      onDeleteExpense={handleDeleteExpense}
    />
  );
}

// --- 詳細頁面 ---
function TripDetail({ trip, expenses, categories, onBack, onUpdate, onAddExpense, onDeleteExpense }) {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); 
    
    const handleAddDay = () => {
      const dateStr = window.prompt("輸入日期 (例: 10/16)", "");
      if (!dateStr) return;
      const newDays = trip.days || [];
      onUpdate({ ...trip, days: [...newDays, { date: dateStr, weekday: "Day " + (newDays.length + 1), schedule: [] }] });
      setActiveDayIdx(newDays.length);
    };

    const handleDeleteDay = (e, index) => {
        e.stopPropagation();
        if(!window.confirm(`確定刪除 ${trip.days[index].date}？`)) return;
        const newDays = trip.days.filter((_, i) => i !== index);
        onUpdate({ ...trip, days: newDays });
        setActiveDayIdx(Math.max(0, index - 1));
    };
  
    return (
      <div className="min-h-screen bg-[#F5F5F7] font-sans pb-28">
        {/* 頂部導航 */}
        <div className="sticky top-0 z-40 bg-[#F5F5F7]/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-gray-200/50">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-gray-600 active:scale-95"><ArrowLeft size={18} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-lg truncate">{trip.title}</h1>
            <div className="text-[10px] text-gray-500 flex items-center gap-2">
                <span className="flex items-center gap-1"><Calendar size={10}/> {trip.dates}</span>
                {trip.timezone && <span className="flex items-center gap-1"><Globe size={10}/> {trip.timezone}</span>}
            </div>
          </div>
        </div>
  
        {(activeTab === 'plan' || activeTab === 'map') && (
          <div className="px-4 py-3 overflow-x-auto no-scrollbar flex gap-2 items-center">
            {trip.days && trip.days.map((d, i) => (
              <div key={i} onClick={() => setActiveDayIdx(i)}
                className={`relative group flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  i === activeDayIdx ? 'bg-black text-white shadow-md border-transparent' : 'bg-white text-gray-400 border-gray-100'
                }`}>
                <span className="block text-[10px] opacity-60 font-medium mb-0.5">{d.weekday}</span>
                {d.date}
                {i === activeDayIdx && <button onClick={(e) => handleDeleteDay(e, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={8} /></button>}
              </div>
            ))}
            <button onClick={handleAddDay} className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><Plus size={16} /></button>
          </div>
        )}
  
        <div className="animate-fade-in">
          {activeTab === 'plan' && <PlanView trip={trip} activeDayIdx={activeDayIdx} onUpdate={onUpdate} />}
          {activeTab === 'map' && <MapView currentDay={trip.days?.[activeDayIdx] || {schedule:[]}} location={trip.location || 'Japan'} />}
          {activeTab === 'budget' && <BudgetView trip={trip} expenses={expenses} categories={categories} onAddExpense={onAddExpense} onDeleteExpense={onDeleteExpense} onUpdateTrip={onUpdate} />}
          {activeTab === 'tools' && <ToolboxView />}
        </div>
  
        {/* 底部導航 (iOS Style) */}
        <div className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center pb-8 pt-3 z-50">
          <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
          <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>
      </div>
    );
}

// --- 行程列表 (Draggable) ---
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

  const openAddModal = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  return (
    <div className="px-4 pb-10">
      {!currentDay ? <div className="text-center py-20 text-gray-400 text-xs">請先選擇日期</div> : (
        <>
          {schedule.length === 0 && <div className="text-center py-12 text-gray-400 text-xs">尚無行程</div>}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {schedule.map((item, idx) => (
                    <Draggable key={idx} draggableId={`item-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="relative group">
                           {/* 左側時間軸線 */}
                           <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200/50 -z-10"></div>
                           
                           <div className={`relative bg-white p-4 rounded-2xl border transition-all ${
                                snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-black/10' : 'shadow-sm border-gray-100 hover:border-gray-300'
                             }`}>
                             <div className="flex justify-between items-start">
                                 <div className="flex gap-3">
                                     <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                        <span className="text-sm font-bold font-mono text-gray-700">{item.time}</span>
                                        {item.duration && <span className="text-[9px] text-gray-400 bg-gray-50 px-1 rounded">{item.duration}h</span>}
                                     </div>
                                     <div>
                                        <h3 className={`font-bold text-gray-800 ${item.highlight ? 'text-red-500' : ''}`}>{item.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                                                {TYPE_ICONS[item.type] || TYPE_ICONS.other}
                                            </span>
                                            {item.timezone && item.timezone !== trip.timezone && (
                                                <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <Globe size={8}/> {item.timezone.split('/')[1] || 'Zone'}
                                                </span>
                                            )}
                                        </div>
                                        {item.address && <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 truncate max-w-[150px]"><MapPin size={8}/> {item.address}</div>}
                                     </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                     <div {...provided.dragHandleProps} className="p-1.5 text-gray-300 active:text-gray-600"><GripVertical size={14}/></div>
                                     <button onClick={() => {setEditingItem(item); setShowItemModal(true)}} className="p-1.5 text-gray-300 hover:text-blue-500"><Edit2 size={12}/></button>
                                 </div>
                             </div>
                             {item.tips && <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg">💡 {item.tips}</div>}
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
          <button onClick={openAddModal} className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold hover:border-black hover:text-black transition-colors flex items-center justify-center gap-2 text-sm"><Plus size={16} /> 新增行程</button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}

// --- 優化版彈窗 (ItemModal) - 重點修正 ---
function ItemModal({ initialData, tripTimezone, onClose, onSave }) {
  const defaultTz = initialData?.timezone || tripTimezone || 'Asia/Taipei';
  const [formData, setFormData] = useState(initialData || { 
      time: '09:00', duration: '1', title: '', type: 'spot', address: '', tips: '', highlight: false, timezone: defaultTz 
  });
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden"></div>
        
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-bold text-gray-800">{initialData ? '編輯行程' : '新增行程'}</h3>
           <button onClick={onClose} className="bg-gray-100 p-2 rounded-full"><X size={18} className="text-gray-500"/></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
           {/* 時間與時區 - 並排緊湊版 */}
           <div className="flex gap-3">
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">時間</label>
                 <div className="relative">
                    <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
                    <Clock size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                 </div>
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">時區</label>
                 <div className="relative">
                    <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-black">
                        <option value="Asia/Taipei">台北</option>
                        <option value="Asia/Tokyo">東京</option>
                        <option value="Asia/Seoul">首爾</option>
                        <option value="Asia/Bangkok">曼谷</option>
                        <option value="Europe/London">倫敦</option>
                        <option value="America/New_York">紐約</option>
                    </select>
                    <Globe size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                 </div>
              </div>
           </div>

           {/* 標題 */}
           <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">標題</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
           </div>

           {/* 類型與時長 */}
           <div className="flex gap-3">
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">類型</label>
                 <div className="relative">
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black">
                        <option value="spot">景點</option>
                        <option value="food">餐廳</option>
                        <option value="transport">交通</option>
                        <option value="stay">住宿</option>
                        <option value="relax">放鬆</option>
                        <option value="work">工作</option>
                    </select>
                    <div className="absolute left-3 top-3.5 text-gray-400">{TYPE_ICONS[formData.type] || <MapPin size={14}/>}</div>
                 </div>
              </div>
              <div className="w-1/3">
                 <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">時長 (hr)</label>
                 <input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm font-bold outline-none text-center focus:ring-2 focus:ring-black" />
              </div>
           </div>

           {/* 地址與筆記 */}
           <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">地點</label>
               <div className="relative">
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址..." className="w-full pl-9 pr-3 py-3 bg-gray-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black" />
                  <MapPin size={14} className="absolute left-3 top-3.5 text-gray-400"/>
               </div>
           </div>
           
           <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">筆記</label>
               <textarea name="tips" rows="2" value={formData.tips} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black resize-none" placeholder="備註..."></textarea>
           </div>

           {/* 重點行程開關 */}
           <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input type="checkbox" name="highlight" checked={formData.highlight} onChange={handleChange} className="w-5 h-5 accent-red-500 rounded" />
              <span className="text-xs font-bold text-gray-600">標記為重點行程 🔥</span>
           </label>

           <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform mt-2">
             {initialData ? '儲存變更' : '新增行程'}
           </button>
        </form>
      </div>
    </div>
  );
}

// --- 記帳視圖 (BudgetView) ---
function BudgetView({ trip, expenses, categories, onAddExpense, onDeleteExpense, onUpdateTrip }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const totalSpentTWD = expenses.reduce((acc, curr) => acc + (parseFloat(curr.twdAmount) || 0), 0);
    const budget = trip.budget || 50000; 
    const progress = Math.min((totalSpentTWD / budget) * 100, 100);
  
    const handleEditBudget = () => {
      const newBudget = window.prompt("輸入總預算 (TWD)", budget);
      if(newBudget && !isNaN(newBudget)) onUpdateTrip({...trip, budget: parseFloat(newBudget)});
    };
  
    return (
      <div className="p-4 pb-20 space-y-6">
        {/* 預算卡片 */}
        <div className="bg-black text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
               <span className="text-white/60 text-xs font-bold tracking-wider">總支出 (TWD)</span>
               <button onClick={handleEditBudget} className="bg-white/20 backdrop-blur px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 hover:bg-white/30"><Edit2 size={8} /> 預算 ${budget.toLocaleString()}</button>
            </div>
            <div className="text-3xl font-bold mb-6 font-mono">${Math.round(totalSpentTWD).toLocaleString()}</div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
               <div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-white/40">
               <span>{Math.round(progress)}%</span>
               <span>剩餘 ${Math.max(0, budget - Math.round(totalSpentTWD)).toLocaleString()}</span>
            </div>
          </div>
          <PieChart className="absolute -bottom-6 -right-6 text-white/5 w-40 h-40" />
        </div>
  
        {/* 支出列表 */}
        <div className="space-y-3">
            {expenses.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg">{item.category?.[0]}</div>
                        <div>
                            <div className="font-bold text-gray-800 text-sm">{item.title}</div>
                            <div className="text-[10px] text-gray-400">{item.category} • {item.date.slice(5)}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold font-mono text-gray-800">${parseInt(item.twdAmount).toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400">{item.currency} {item.amount}</div>
                    </div>
                    <button onClick={() => onDeleteExpense(item.id)} className="ml-2 text-gray-300 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
            ))}
            {expenses.length === 0 && <div className="text-center text-gray-400 text-xs py-10">暫無支出紀錄</div>}
        </div>
  
        <button onClick={() => setShowAddModal(true)} className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><Plus size={18} /> 記一筆</button>
        {showAddModal && <AddExpenseModal tripId={trip.id} categories={categories} onClose={() => setShowAddModal(false)} onSave={onAddExpense} />}
      </div>
    );
}

// --- 記帳彈窗 (AddExpenseModal) ---
function AddExpenseModal({ tripId, categories, onClose, onSave }) {
    const [formData, setFormData] = useState({
      amount: '', currency: 'JPY', rate: '0.22', twdAmount: 0,
      title: '', category: '餐飲', subCategory: '', paymentMethod: '現金',
      location: '', note: '', date: new Date().toISOString().split('T')[0]
    });
    useEffect(() => {
      const amt = parseFloat(formData.amount) || 0;
      const rt = parseFloat(formData.rate) || 1;
      setFormData(prev => ({...prev, twdAmount: Math.round(amt * rt)}));
    }, [formData.amount, formData.rate]);
  
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); if(!formData.amount) return; onSave({ id: Date.now().toString(), tripId, ...formData }); onClose(); };
  
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-[2rem] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold">記一筆</h3><button onClick={onClose}><X size={20} className="text-gray-400"/></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
             {/* 金額輸入 */}
             <div className="bg-gray-50 p-4 rounded-2xl flex items-end gap-3">
                 <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400">金額</label>
                    <input type="number" name="amount" placeholder="0" className="w-full bg-transparent text-3xl font-bold outline-none" value={formData.amount} onChange={handleChange} autoFocus />
                 </div>
                 <select name="currency" value={formData.currency} onChange={handleChange} className="bg-white px-2 py-1 rounded-lg text-sm font-bold shadow-sm outline-none">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
             </div>
             {/* 匯率顯示 */}
             <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2 text-xs text-gray-400">匯率 <input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-12 bg-gray-100 rounded px-1 text-center text-gray-600"/></div>
                 <div className="text-sm font-bold text-gray-800">≈ TWD {formData.twdAmount.toLocaleString()}</div>
             </div>
             {/* 分類與項目 */}
             <div className="grid grid-cols-2 gap-3">
                 <div><label className="text-[10px] text-gray-400 font-bold">分類</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                 <div><label className="text-[10px] text-gray-400 font-bold">項目</label><input type="text" name="title" placeholder="例: 拉麵" className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none" value={formData.title} onChange={handleChange}/></div>
             </div>
             <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg mt-2">儲存</button>
          </form>
        </div>
      </div>
    )
}

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ title: '', dates: '', timezone: 'Asia/Taipei', coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80' });
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-bold mb-6">新增旅程</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-4">
          <input required type="text" placeholder="旅程名稱" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none" onChange={e => setFormData({...formData, title: e.target.value})} />
          <input required type="text" placeholder="日期 (例: 2025.10.10)" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none" onChange={e => setFormData({...formData, dates: e.target.value})} />
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg">建立</button>
        </form>
        <button onClick={onClose} className="w-full mt-4 text-gray-400 text-sm">取消</button>
      </div>
    </div>
  )
}

function MapView({ currentDay, location }) {
    const addresses = currentDay?.schedule?.filter(item => item.address && item.address.length > 2).map(item => encodeURIComponent(item.address)) || [];
    const routeUrl = addresses.length > 0 ? `http://googleusercontent.com/maps.google.com/dir/${addresses.join('/')}` : `http://googleusercontent.com/maps.google.com/?q=${location}`;
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500"><Map size={24} /></div>
          <h3 className="font-bold text-gray-800 mb-2">今日路線</h3>
          <p className="text-xs text-gray-400 mb-4">共 {addresses.length} 個地點</p>
          <a href={routeUrl} target="_blank" rel="noreferrer" className="block w-full bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200">開啟 Google Maps</a>
        </div>
      </div>
    )
}

function ToolboxView() {
    return (
      <div className="p-4"><div className="bg-white p-6 rounded-[2rem] text-center text-gray-400">工具箱開發中...</div></div>
    )
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 transition-colors ${isActive ? 'text-black' : 'text-gray-300'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    )
}