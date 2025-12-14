import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  MapPin, Calendar, ArrowLeft, Navigation, Plus, X, Save, 
  Trash2, Edit2, Utensils, Car, Camera, Coffee, Bed, Briefcase, Clock,
  Map, List, Calculator, CheckSquare, CloudSun, Plane, Wallet, PieChart, 
  ShoppingBag, Ticket, Globe, ChevronDown, LogIn, LogOut, CloudUpload, GripVertical
} from 'lucide-react';

// --- Firebase 相關引入 ---
import { auth, googleProvider, db } from './firebase';
import { signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth'; // 改用 Redirect 登入更穩定
import { 
  collection, addDoc, query, where, onSnapshot, 
  doc, updateDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

// --- 設定與常數 ---
const TYPE_ICONS = {
  transport: <Car size={16} />,
  food: <Utensils size={16} />,
  spot: <Camera size={16} />,
  relax: <Coffee size={16} />,
  stay: <Bed size={16} />,
  work: <Briefcase size={16} />,
  other: <MapPin size={16} />
};

const TYPE_COLORS = {
  transport: 'bg-blue-100 text-blue-600',
  food: 'bg-orange-100 text-orange-600',
  spot: 'bg-green-100 text-green-600',
  relax: 'bg-purple-100 text-purple-600',
  stay: 'bg-indigo-100 text-indigo-600',
  work: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-500'
};

const DEFAULT_CATEGORIES = ['餐飲', '交通', '購物', '住宿', '娛樂', '伴手禮', '機票', '其他'];

const CURRENCIES = [
  { code: 'TWD', label: '新台幣' }, { code: 'JPY', label: '日圓' }, { code: 'USD', label: '美金' },
  { code: 'EUR', label: '歐元' }, { code: 'KRW', label: '韓元' }, { code: 'CNY', label: '人民幣' },
  { code: 'SGD', label: '新幣' }, { code: 'THB', label: '泰銖' },
];

const PAYMENT_METHODS = ['現金', '信用卡', 'Apple Pay', 'Line Pay', 'Suica/IC卡'];

export default function App() {
  // --- 狀態管理 ---
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

  // --- 2. 登入/登出 (使用 Redirect 以適應手機環境) ---
  const handleLogin = () => {
    signInWithRedirect(auth, googleProvider);
  };
  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Logout failed", error); }
  };

  // --- 3. 資料移轉 ---
  const handleMigrateData = async () => {
    if (!user) return alert("請先登入！");
    if (!window.confirm("這將會把您「本機電腦」的資料上傳到雲端。確定要執行嗎？")) return;

    const localTrips = JSON.parse(localStorage.getItem('my-travel-os-data') || '[]');
    const localExpenses = JSON.parse(localStorage.getItem('my-travel-os-expenses') || '[]');

    if (localTrips.length === 0 && localExpenses.length === 0) return alert("本機沒有資料可以移轉！");

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
      alert("資料移轉成功！");
    } catch (e) {
      console.error(e);
      alert("移轉失敗，請檢查 Console");
    }
    setLoading(false);
  };

  // --- 4. CRUD ---
  const handleAddTrip = async (newTrip) => {
    if (!user) return;
    const { id, ...tripData } = newTrip; 
    await addDoc(collection(db, "trips"), { ...tripData, uid: user.uid });
    setShowAddTripModal(false);
  };

  const handleUpdateTrip = async (updatedTrip) => {
    if (!user) return;
    const tripRef = doc(db, "trips", updatedTrip.id);
    await updateDoc(tripRef, updatedTrip);
  };

  const handleDeleteTrip = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除整個旅程嗎？')) {
      await deleteDoc(doc(db, "trips", id));
    }
  };

  const handleAddExpense = async (newExpense) => {
    if (!user) return;
    const { id, ...expData } = newExpense;
    await addDoc(collection(db, "expenses"), { ...expData, uid: user.uid });
  };

  const handleDeleteExpense = async (id) => {
    if(window.confirm('確定刪除這筆帳目？')) {
      await deleteDoc(doc(db, "expenses", id));
    }
  };

  // --- 渲染 ---
  if (!user) {
    return (
      <div className="min-h-screen bg-zen-bg flex flex-col items-center justify-center p-6 relative">
        <h1 className="text-4xl font-serif font-bold text-zen-text tracking-widest mb-4">TRAVEL OS</h1>
        <button onClick={handleLogin} className="bg-zen-text text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 hover:scale-105 transition-transform">
          <LogIn size={20} /> 使用 Google 登入
        </button>
        <div className="mt-8 text-xs text-gray-400 text-center">
            <p>Phase 4 雲端同步版</p>
            <p className="mt-1 opacity-70">支援手機與電腦即時連線</p>
        </div>
      </div>
    );
  }

  if (!currentTripId) {
    return (
      <div className="min-h-screen bg-zen-bg p-6 pb-20 font-sans relative">
        <header className="mb-8 mt-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-zen-text tracking-widest">TRAVEL OS</h1>
            <p className="text-sm text-gray-400 mt-2">Welcome, {user.displayName}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500">
            <LogOut size={16} />
          </button>
        </header>

        {loading ? <div className="text-center text-gray-400 mt-20">載入雲端資料中...</div> : (
          <div className="space-y-6">
            {allTrips.map(trip => (
              <div key={trip.id} onClick={() => setCurrentTripId(trip.id)} className="cursor-pointer group relative">
                <div className="relative h-56 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                    <h2 className="text-2xl font-serif font-bold text-white mb-1">{trip.title}</h2>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1 text-white/80 text-xs">
                         <div className="flex items-center gap-2"><Calendar size={12} /> {trip.dates}</div>
                         {trip.timezone && <div className="flex items-center gap-2"><Globe size={12} /> {trip.timezone}</div>}
                      </div>
                      <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="text-white/50 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {allTrips.length === 0 && (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-300">
                    <p className="text-gray-400 mb-4">雲端尚無資料</p>
                </div>
            )}
          </div>
        )}
        <button onClick={() => setShowAddTripModal(true)} className="fixed bottom-8 right-6 bg-zen-text text-white p-4 rounded-full shadow-2xl hover:bg-black transition-transform active:scale-95 z-50"><Plus size={24} /></button>
        {showAddTripModal && <AddTripModal onClose={() => setShowAddTripModal(false)} onSave={handleAddTrip} />}
        
        <div className="text-center mt-10 pb-10">
             <button onClick={handleMigrateData} className="text-xs text-blue-500 underline flex items-center justify-center gap-1 mx-auto">
                <CloudUpload size={12}/> 從本機移轉舊資料到雲端
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

// --- 主要分頁組件 ---
function TripDetail({ trip, expenses, categories, onBack, onUpdate, onAddExpense, onDeleteExpense }) {
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('plan'); 
    
    const handleAddDay = () => {
      let defaultDate = "";
      if (trip.days && trip.days.length > 0) {
        try { defaultDate = "New Day"; } catch (e) {}
      }
      const dateStr = window.prompt("請輸入日期 (例: 10/16)", defaultDate || "");
      if (!dateStr) return;
      
      const newDays = trip.days || [];
      const newDay = { date: dateStr, weekday: "Day " + (newDays.length + 1), schedule: [] };
      onUpdate({ ...trip, days: [...newDays, newDay] });
      setActiveDayIdx(newDays.length);
    };

    const handleDeleteDay = (e, index) => {
        e.stopPropagation();
        if(!window.confirm(`確定要刪除 ${trip.days[index].date} 及其所有行程嗎？`)) return;
        
        const newDays = trip.days.filter((_, i) => i !== index);
        let newIdx = activeDayIdx;
        if (index === activeDayIdx && newDays.length > 0) newIdx = Math.max(0, index - 1);
        else if (newDays.length === 0) newIdx = 0;
        
        setActiveDayIdx(newIdx);
        onUpdate({ ...trip, days: newDays });
    };
  
    return (
      <div className="min-h-screen bg-zen-bg text-zen-text font-sans pb-24">
        <div className="sticky top-0 z-40 bg-zen-bg/95 backdrop-blur px-4 py-4 flex items-center gap-4 border-b border-gray-100">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-lg truncate">{trip.title}</h1>
            {trip.timezone && <div className="text-[10px] text-gray-500 flex items-center gap-1"><Globe size={10} /> {trip.timezone}</div>}
          </div>
        </div>
  
        {(activeTab === 'plan' || activeTab === 'map') && (
          <div className="px-4 py-4 overflow-x-auto no-scrollbar flex gap-3 items-center border-b border-gray-50">
            {trip.days && trip.days.map((d, i) => (
              <div key={i} onClick={() => setActiveDayIdx(i)}
                className={`relative group flex-shrink-0 px-5 py-2 rounded-2xl text-sm font-medium transition-all cursor-pointer border ${
                  i === activeDayIdx ? 'bg-zen-text text-white shadow-lg transform scale-105 border-transparent' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                }`}>
                <span className="block text-xs opacity-60">{d.weekday}</span>
                {d.date}
                
                <button onClick={(e) => handleDeleteDay(e, i)} 
                    className={`absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${i === activeDayIdx ? 'block' : ''}`}>
                    <X size={10} />
                </button>
              </div>
            ))}
            <button onClick={handleAddDay} className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-dashed border-gray-300 hover:bg-gray-200">
              <Plus size={16} />
            </button>
          </div>
        )}
  
        <div className="animate-fade-in">
          {activeTab === 'plan' && <PlanView trip={trip} activeDayIdx={activeDayIdx} onUpdate={onUpdate} />}
          {activeTab === 'map' && <MapView currentDay={trip.days?.[activeDayIdx] || {schedule:[]}} location={trip.location || 'Japan'} />}
          {activeTab === 'budget' && (
            <BudgetView 
              trip={trip} 
              expenses={expenses} 
              categories={categories}
              onAddExpense={onAddExpense} 
              onDeleteExpense={onDeleteExpense}
              onUpdateTrip={onUpdate} 
            />
          )}
          {activeTab === 'tools' && <ToolboxView />}
        </div>
  
        {/* UI優化：毛玻璃底部選單 */}
        <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-around items-center p-2 pb-6 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
          <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
        </div>
      </div>
    );
}

// --- 行程視圖 (整合拖拉 + 時區 + UI優化) ---
function PlanView({ trip, activeDayIdx, onUpdate }) {
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [defaultTime, setDefaultTime] = useState('09:00');
  
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
      // 初次新增自動排序，之後靠拖拉
      daySchedule.sort((a, b) => a.time.localeCompare(b.time)); 
    }
    
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
    setShowItemModal(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemIdx) => {
    if(!window.confirm("確定刪除此行程？")) return;
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
    let nextTime = '09:00';
    if (schedule.length > 0) {
      nextTime = schedule[schedule.length - 1].time || '09:00';
    }
    setDefaultTime(nextTime);
    setEditingItem(null);
    setShowItemModal(true);
  };

  return (
    <div className="px-5 mt-2 space-y-8 relative pb-20">
      {!currentDay ? (
        <div className="text-center py-20 text-gray-400 text-sm">請先選擇或新增日期</div>
      ) : (
        <>
          <div className="absolute left-9 top-4 bottom-0 w-0.5 bg-gray-200"></div>
          {schedule.length === 0 && <div className="text-center py-10 text-gray-400 text-sm pl-8">此日尚無行程</div>}
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                  {schedule.map((item, idx) => (
                    <Draggable key={idx} draggableId={`item-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          // UI優化：拖曳時增加反饋 (旋轉、縮放、層級)
                          className={`relative pl-8 group transition-all duration-200 ${
                            snapshot.isDragging ? 'z-50 scale-105 opacity-90 rotate-1' : ''
                          }`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className={`absolute left-0 top-4 w-3 h-3 rounded-full border-2 border-white z-10 shadow-sm ${item.highlight ? 'bg-zen-red ring-2 ring-red-100' : 'bg-gray-300'}`}></div>
                          
                          <div className={`bg-white p-4 rounded-2xl border transition-all relative ${
                              snapshot.isDragging ? 'shadow-2xl border-zen-text/20' : 'shadow-sm border-gray-50 hover:shadow-md hover:border-gray-200'
                          }`}>
                            
                            {/* 拖拉把手 (Grip) */}
                            <div {...provided.dragHandleProps} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none">
                                <GripVertical size={16} />
                            </div>

                            <div className="pl-5">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-gray-600">
                                            {item.time}
                                        </div>
                                        {/* 時區顯示優化 */}
                                        {item.timezone && item.timezone !== trip.timezone && (
                                            <span className="text-[9px] border border-gray-200 px-1 rounded text-gray-400 flex items-center gap-0.5">
                                                <Globe size={8}/> {item.timezone.split('/')[1] || item.timezone}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => {setEditingItem(item); setShowItemModal(true)}} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDeleteItem(idx)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                                        {TYPE_ICONS[item.type] || TYPE_ICONS.other}
                                    </span>
                                    <h3 className={`text-base font-bold ${item.highlight ? 'text-zen-red' : 'text-zen-text'}`}>{item.title}</h3>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 text-xs text-gray-400 items-center">
                                   {item.duration && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Clock size={10} /> {item.duration}h</span>}
                                   {item.address && (
                                     <a href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(item.address)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                       <MapPin size={10}/> {item.address.length > 8 ? item.address.slice(0,8) + '...' : item.address}
                                     </a>
                                   )}
                                </div>

                                {item.tips && <div className="mt-2 text-xs text-gray-500 bg-zen-bg p-2 rounded-lg border border-dashed border-gray-200">💡 {item.tips}</div>}
                            </div>
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

          <button onClick={openAddModal} className="w-full ml-8 mt-4 py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl hover:border-zen-text hover:text-zen-text transition-colors text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> 新增行程</button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} defaultTime={defaultTime} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}

// --- 記帳視圖 (整合UI優化 - Bottom Sheet) ---
function BudgetView({ trip, expenses, categories, onAddExpense, onDeleteExpense, onUpdateTrip }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const totalSpentTWD = expenses.reduce((acc, curr) => acc + (parseFloat(curr.twdAmount) || 0), 0);
    const budget = trip.budget || 50000; 
    const progress = Math.min((totalSpentTWD / budget) * 100, 100);
  
    const handleEditBudget = () => {
      const newBudget = window.prompt("請輸入此旅程總預算 (TWD)", budget);
      if(newBudget && !isNaN(newBudget)) {
        onUpdateTrip({...trip, budget: parseFloat(newBudget)});
      }
    };
  
    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="bg-zen-text text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
               <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Spent (TWD)</span>
               <button onClick={handleEditBudget} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20 text-xs flex items-center gap-1">
                 <Edit2 size={10} /> 預算 ${budget.toLocaleString()}
               </button>
            </div>
            <div className="text-4xl font-serif font-bold mb-4">
              <span className="text-lg mr-1">$</span>{Math.round(totalSpentTWD).toLocaleString()}
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-zen-green'}`} style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
               <span>{Math.round(progress)}%</span>
               <span>剩餘 ${Math.max(0, budget - Math.round(totalSpentTWD)).toLocaleString()}</span>
            </div>
          </div>
          <PieChart className="absolute -bottom-4 -right-4 text-white/5 w-32 h-32" />
        </div>
  
        <div className="space-y-4">
          <div className="flex justify-between items-end">
             <h3 className="font-bold text-zen-text text-lg">近期支出</h3>
             <div className="text-xs text-gray-400">共 {expenses.length} 筆</div>
          </div>
  
          {expenses.length === 0 ? (
             <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-3xl border border-dashed border-gray-200">尚無紀錄</div>
          ) : (
            <div className="space-y-3">
              {expenses.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col gap-2 group">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 font-bold text-xs`}>
                              {item.category ? item.category[0] : '無'}
                            </div>
                            <div>
                              <div className="font-bold text-zen-text">{item.title}</div>
                              <div className="text-[10px] text-gray-400 flex gap-2">
                                 <span className="bg-gray-100 px-1 rounded">{item.category}</span>
                                 {item.subCategory && <span className="bg-gray-50 px-1 rounded">{item.subCategory}</span>}
                              </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold font-mono text-lg">${parseInt(item.twdAmount).toLocaleString()}</div>
                            <div className="text-[10px] text-gray-400">
                               {item.currency} {item.amount}
                            </div>
                        </div>
                     </div>
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onDeleteExpense(item.id)} className="bg-red-50 text-red-400 p-1 rounded-full"><Trash2 size={12}/></button>
                     </div>
                  </div>
              ))}
            </div>
          )}
        </div>
  
        <button onClick={() => setShowAddModal(true)} className="w-full bg-zen-text text-white py-4 rounded-2xl font-bold shadow-lg shadow-gray-300 flex items-center justify-center gap-2 active:scale-95 transition-transform">
           <Plus size={20} /> 記一筆
        </button>
  
        {showAddModal && <AddExpenseModal tripId={trip.id} categories={categories} onClose={() => setShowAddModal(false)} onSave={onAddExpense} />}
      </div>
    );
}

// --- UI優化：ItemModal (Bottom Sheet) ---
function ItemModal({ initialData, defaultTime, tripTimezone, onClose, onSave }) {
  const defaultTz = initialData?.timezone || tripTimezone || 'Asia/Taipei';
  const [formData, setFormData] = useState(initialData || { 
      time: defaultTime, duration: '1', title: '', type: 'spot', address: '', tips: '', highlight: false, timezone: defaultTz 
  });
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60] flex items-end justify-center transition-opacity" onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()} 
        className="bg-white w-full sm:max-w-md rounded-t-[2rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-slide-up max-h-[85vh] overflow-y-auto pb-10"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif font-bold text-zen-text flex items-center gap-2">
            {initialData ? <Edit2 size={18}/> : <Plus size={18}/>} 
            {initialData ? '編輯行程' : '新增行程'}
          </h3>
          <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">時間</label>
                <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">時區</label>
                <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text text-sm appearance-none">
                    <option value="Asia/Taipei">台北 (GMT+8)</option>
                    <option value="Asia/Tokyo">東京 (GMT+9)</option>
                    <option value="Asia/Seoul">首爾 (GMT+9)</option>
                    <option value="Asia/Bangkok">曼谷 (GMT+7)</option>
                    <option value="Europe/London">倫敦 (GMT+0)</option>
                    <option value="Europe/Paris">巴黎 (GMT+1)</option>
                    <option value="America/New_York">紐約 (GMT-5)</option>
                </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-gray-500 uppercase">停留 (小時)</label><input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
             <div><label className="text-xs font-bold text-gray-500 uppercase">類型</label><select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text appearance-none"><option value="spot">📸 景點</option><option value="food">🍴 餐廳</option><option value="transport">🚗 交通</option><option value="stay">🏠 住宿</option><option value="relax">💆 放鬆</option><option value="work">💼 工作</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">標題</label><input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">地點 / 地址</label><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址，點擊可導航" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">筆記 (Tips)</label><textarea name="tips" rows="3" value={formData.tips} onChange={handleChange} placeholder="必吃菜單、預約號碼..." className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-800"><input type="checkbox" name="highlight" id="highlight" checked={formData.highlight} onChange={handleChange} className="w-4 h-4 accent-red-600"/><label htmlFor="highlight" className="text-sm font-bold">設為重點行程 (Highlight)</label></div>
          
          <button type="submit" className="w-full bg-zen-text text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-gray-200 active:scale-95 transition-transform mt-4">
             {initialData ? '儲存變更' : '新增行程'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ 
    title: '', dates: '', timezone: 'Asia/Taipei', coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80' 
  });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif font-bold text-zen-text">新增旅程</h3>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-4">
          <input required type="text" placeholder="旅程名稱" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-zen-text" onChange={e => setFormData({...formData, title: e.target.value})} />
          <input required type="text" placeholder="日期 (例: 2025.10.10)" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-zen-text" onChange={e => setFormData({...formData, dates: e.target.value})} />
          <div className="relative">
             <span className="absolute right-4 top-4 text-gray-400 text-xs pointer-events-none">預設時區</span>
             <input type="text" placeholder="Asia/Taipei" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-zen-text" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} />
          </div>
          <input type="text" placeholder="圖片 URL (Optional)" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-zen-text" onChange={e => setFormData({...formData, coverImage: e.target.value || formData.coverImage})} />
          <button type="submit" className="w-full bg-zen-text text-white py-4 rounded-2xl font-bold mt-2 shadow-lg hover:shadow-xl transition-shadow"><Save size={18} className="inline mr-2"/> 建立</button>
        </form>
      </div>
    </div>
  )
}

// --- UI優化：AddExpenseModal (Bottom Sheet) ---
function AddExpenseModal({ tripId, categories, onClose, onSave }) {
    const [formData, setFormData] = useState({
      amount: '', currency: 'JPY', rate: '0.22', twdAmount: 0,
      title: '', category: '餐飲', subCategory: '', paymentMethod: '現金',
      location: '', note: '', date: new Date().toISOString().split('T')[0]
    });
    const [showCategoryList, setShowCategoryList] = useState(false);
    useEffect(() => {
      const amt = parseFloat(formData.amount) || 0;
      const rt = parseFloat(formData.rate) || 1;
      setFormData(prev => ({...prev, twdAmount: Math.round(amt * rt)}));
    }, [formData.amount, formData.rate]);
  
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleCategorySelect = (cat) => { setFormData(prev => ({ ...prev, category: cat })); setShowCategoryList(false); };
    const handleSubmit = (e) => {
      e.preventDefault();
      if(!formData.amount || !formData.title) return;
      onSave({ id: Date.now().toString(), tripId, ...formData });
      onClose();
    };
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60] flex items-end justify-center transition-opacity" onClick={onClose}>
        <div 
          onClick={e => e.stopPropagation()} 
          className="bg-white w-full sm:max-w-lg rounded-t-[2rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-slide-up max-h-[85vh] overflow-y-auto pb-10"
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-zen-text">新增支出</h3>
            <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
               <div className="flex items-end gap-2">
                  <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">金額</label><input type="number" name="amount" placeholder="0" className="w-full text-3xl font-bold bg-transparent border-b border-gray-300 outline-none focus:border-zen-text" value={formData.amount} onChange={handleChange} autoFocus /></div>
                  <div className="w-24"><select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-white p-2 rounded-lg text-sm font-bold outline-none border border-gray-200">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
               </div>
               <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2 flex-1"><span className="text-xs text-gray-400">匯率</span><input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-full bg-transparent text-sm border-b border-gray-300 outline-none" /></div>
                  <div className="text-sm font-bold text-zen-text bg-zen-text/10 px-3 py-1 rounded-full">≈ TWD {formData.twdAmount.toLocaleString()}</div>
               </div>
            </div>
            <div className="relative">
               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">主分類</label>
               <div className="flex gap-2">
                  <input type="text" name="category" value={formData.category} onChange={handleChange} onFocus={() => setShowCategoryList(true)} placeholder="輸入或選擇分類" className="flex-1 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-zen-text" />
                  <button type="button" onClick={() => setShowCategoryList(!showCategoryList)} className="p-4 bg-gray-100 rounded-2xl"><ChevronDown size={20} className="text-gray-500"/></button>
               </div>
               {showCategoryList && (
                 <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-40 overflow-y-auto p-2 grid grid-cols-3 gap-2">
                   {categories.filter(c => c.includes(formData.category)).map(cat => (
                     <button key={cat} type="button" onClick={() => handleCategorySelect(cat)} className="p-2 text-sm bg-gray-50 hover:bg-zen-text hover:text-white rounded-lg transition-colors text-center">{cat}</button>
                   ))}
                 </div>
               )}
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-gray-500 uppercase">項目名稱</label><input type="text" name="title" placeholder="例: 一蘭拉麵" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none border-none" value={formData.title} onChange={handleChange} /></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">副分類</label><input type="text" name="subCategory" placeholder="例: 晚餐" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none border-none" value={formData.subCategory} onChange={handleChange} /></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">付款方式</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none border-none">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">日期</label><input type="date" name="date" className="w-full mt-1 p-4 bg-gray-50 rounded-2xl outline-none border-none" value={formData.date} onChange={handleChange} /></div>
            </div>
            <button type="submit" className="w-full bg-zen-text text-white py-4 rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-transform">儲存支出</button>
          </form>
        </div>
      </div>
    )
}

function MapView({ currentDay, location }) {
    const addresses = currentDay?.schedule?.filter(item => item.address && item.address.length > 2).map(item => encodeURIComponent(item.address)) || [];
    const routeUrl = addresses.length > 0 ? `http://googleusercontent.com/maps.google.com/dir/${addresses.join('/')}` : `http://googleusercontent.com/maps.google.com/?q=${location}`;
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><Map size={32} /></div>
          <h3 className="text-xl font-serif font-bold text-zen-text mb-2">路線檢視</h3>
          <p className="text-xs text-gray-500 mb-6">系統已自動抓取今日 {addresses.length} 個地點。<br/>點擊下方按鈕，在 Google Maps 查看完整順路導航。</p>
          <a href={routeUrl} target="_blank" rel="noreferrer" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">開啟導航路線圖 🗺️</a>
        </div>
        <div className="rounded-3xl overflow-hidden shadow-sm border border-gray-200 h-64 relative bg-gray-100">
          <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`http://googleusercontent.com/maps.google.com/?q=${addresses[0] || location}&output=embed`} allowFullScreen></iframe>
        </div>
      </div>
    )
}

function ToolboxView() {
    const [jpy, setJpy] = useState('');
    const [rate, setRate] = useState(0.215); 
    const [checklist, setChecklist] = useState(() => {
      const saved = localStorage.getItem('my-travel-checklist');
      return saved ? JSON.parse(saved) : [
        { id: 1, text: '護照 & 簽證', checked: false }, { id: 2, text: '網卡 / Roaming 開通', checked: false },
        { id: 3, text: '行動電源 & 充電線', checked: false }, { id: 4, text: '日幣現金 / 信用卡', checked: false },
        { id: 5, text: '個人藥品', checked: false },
      ];
    });
    useEffect(() => { localStorage.setItem('my-travel-checklist', JSON.stringify(checklist)); }, [checklist]);
    const toggleCheck = (id) => { setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };
    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-zen-text mb-4 flex items-center gap-2"><Calculator size={18}/> 匯率試算</h3>
          <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-xl"><span className="text-xs text-gray-400 pl-2">匯率:</span><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="bg-transparent w-20 font-mono text-sm outline-none border-b border-gray-300 focus:border-zen-text text-center" /></div>
          <div className="flex gap-4 items-center">
            <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">JPY</label><input type="number" value={jpy} onChange={e => setJpy(e.target.value)} placeholder="1000" className="w-full text-2xl font-serif font-bold p-2 border-b border-gray-200 outline-none focus:border-zen-text bg-transparent" /></div>
            <div className="text-gray-300">=</div>
            <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">TWD</label><div className="w-full text-2xl font-serif font-bold p-2 text-zen-green">{jpy ? Math.round(jpy * rate).toLocaleString() : 0}</div></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-zen-text mb-4 flex items-center gap-2"><CheckSquare size={18}/> 行前確認</h3>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-zen-text border-zen-text' : 'border-gray-300 bg-white'}`}>{item.checked && <CheckSquare size={12} className="text-white" />}</div>
                <span className={`text-sm transition-colors ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 transition-colors ${isActive ? 'text-zen-text' : 'text-gray-300'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    )
}