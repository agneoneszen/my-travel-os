import React, { useState, useEffect, useRef } from 'react';
import { initialTrips } from './data/trips';
import { 
  MapPin, Calendar, ArrowLeft, Navigation, Plus, X, Save, 
  Trash2, Edit2, Utensils, Car, Camera, Coffee, Bed, Briefcase, Clock,
  Map, List, Calculator, CheckSquare, CloudSun, Plane, Wallet, PieChart, 
  ShoppingBag, Ticket, Globe, ChevronDown, Search
} from 'lucide-react';

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

// 記帳 - 預設分類 (第一次使用時的清單)
const DEFAULT_CATEGORIES = ['餐飲', '交通', '購物', '住宿', '娛樂', '伴手禮', '機票', '其他'];

// 記帳 - 幣別清單
const CURRENCIES = [
  { code: 'TWD', label: '新台幣' },
  { code: 'JPY', label: '日圓' },
  { code: 'USD', label: '美金' },
  { code: 'EUR', label: '歐元' },
  { code: 'KRW', label: '韓元' },
  { code: 'CNY', label: '人民幣' },
  { code: 'SGD', label: '新幣' },
  { code: 'THB', label: '泰銖' },
];

const PAYMENT_METHODS = ['現金', '信用卡', 'Apple Pay', 'Line Pay', 'Suica/IC卡'];

export default function App() {
  // 1. 旅程資料
  const [allTrips, setAllTrips] = useState(() => {
    const saved = localStorage.getItem('my-travel-os-data');
    return saved ? JSON.parse(saved) : initialTrips;
  });

  // 2. 記帳資料
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('my-travel-os-expenses');
    return saved ? JSON.parse(saved) : [];
  });

  // 3. 記帳分類 (具備自動記憶功能)
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('my-travel-os-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [currentTripId, setCurrentTripId] = useState(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);

  // 自動存檔
  useEffect(() => { localStorage.setItem('my-travel-os-data', JSON.stringify(allTrips)); }, [allTrips]);
  useEffect(() => { localStorage.setItem('my-travel-os-expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('my-travel-os-categories', JSON.stringify(categories)); }, [categories]);

  // CRUD
  const handleAddTrip = (newTrip) => {
    setAllTrips([newTrip, ...allTrips]);
    setShowAddTripModal(false);
  };

  const handleUpdateTrip = (updatedTrip) => {
    setAllTrips(allTrips.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };

  const handleDeleteTrip = (e, id) => {
    e.stopPropagation();
    if(window.confirm('確定要刪除整個旅程嗎？此動作無法復原。')) {
      setAllTrips(allTrips.filter(t => t.id !== id));
      setExpenses(expenses.filter(ex => ex.tripId !== id));
    }
  };

  const handleAddExpense = (newExpense) => {
    setExpenses([newExpense, ...expenses]);
    // 自動記憶新分類
    if (newExpense.category && !categories.includes(newExpense.category)) {
      setCategories([...categories, newExpense.category]);
    }
  };

  const handleDeleteExpense = (id) => {
    if(window.confirm('確定刪除這筆帳目？')) {
      setExpenses(expenses.filter(ex => ex.id !== id));
    }
  };

  // --- 首頁 ---
  if (!currentTripId) {
    return (
      <div className="min-h-screen bg-hero-sand-50 p-6 pb-20 font-sans relative">
        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-sans font-bold text-hero-dark tracking-widest">TRAVEL OS</h1>
          <p className="text-sm text-gray-400 mt-2">Personal Travel Database</p>
        </header>

        <div className="space-y-6">
          {allTrips.map(trip => (
            <div key={trip.id} onClick={() => setCurrentTripId(trip.id)} className="cursor-pointer group relative">
              <div className="relative h-56 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                  <h2 className="text-2xl font-sans font-bold text-white mb-1">{trip.title}</h2>
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
        </div>

        <button onClick={() => setShowAddTripModal(true)} className="fixed bottom-8 right-6 bg-zen-text text-white p-4 rounded-full shadow-2xl hover:bg-hero-sky-500 hover:bg-hero-sky-600 transition-transform active:scale-95 z-50"><Plus size={24} /></button>
        {showAddTripModal && <AddTripModal onClose={() => setShowAddTripModal(false)} onSave={handleAddTrip} />}
      </div>
    );
  }

  const trip = allTrips.find(t => t.id === currentTripId);
  const currentTripExpenses = expenses.filter(ex => ex.tripId === currentTripId);

  return (
    <TripDetail 
      trip={trip} 
      expenses={currentTripExpenses}
      categories={categories} // 傳入分類列表
      onBack={() => setCurrentTripId(null)} 
      onUpdate={handleUpdateTrip} 
      onAddExpense={handleAddExpense}
      onDeleteExpense={handleDeleteExpense}
    />
  );
}

// --- 旅程詳細頁 ---
function TripDetail({ trip, expenses, categories, onBack, onUpdate, onAddExpense, onDeleteExpense }) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('plan'); 
  
  const handleAddDay = () => {
    let defaultDate = "";
    if (trip.days.length > 0) {
      const lastDateStr = trip.days[trip.days.length - 1].date;
      try {
        const parts = lastDateStr.split('/');
        if (parts.length === 2) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          const dateObj = new Date(new Date().getFullYear(), month - 1, day);
          dateObj.setDate(dateObj.getDate() + 1);
          defaultDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
        }
      } catch (e) { console.error(e); }
    }
    const dateStr = window.prompt("請輸入日期", defaultDate || "10/15");
    if (!dateStr) return;
    const newDay = { date: dateStr, weekday: "Day " + (trip.days.length + 1), schedule: [] };
    onUpdate({ ...trip, days: [...trip.days, newDay] });
    setActiveDayIdx(trip.days.length);
  };

  return (
    <div className="min-h-screen bg-hero-sand-50 text-hero-dark font-sans pb-24">
      <div className="sticky top-0 z-40 bg-hero-sand-50/95 backdrop-blur px-4 py-4 flex items-center gap-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-sans font-bold text-lg truncate">{trip.title}</h1>
          {trip.timezone && <div className="text-[10px] text-gray-500 flex items-center gap-1"><Globe size={10} /> {trip.timezone}</div>}
        </div>
      </div>

      {(activeTab === 'plan' || activeTab === 'map') && (
        <div className="px-4 py-4 overflow-x-auto no-scrollbar flex gap-3 items-center border-b border-gray-50">
          {trip.days.map((d, i) => (
            <button key={i} onClick={() => setActiveDayIdx(i)}
              className={`flex-shrink-0 px-5 py-2 rounded-2xl text-sm font-medium transition-all ${
                i === activeDayIdx ? 'bg-zen-text text-white shadow-lg transform scale-105' : 'bg-hero-sand-50 text-gray-400 border border-gray-100'
              }`}>
              <span className="block text-xs opacity-60">{d.weekday}</span>
              {d.date}
            </button>
          ))}
          <button onClick={handleAddDay} className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
            <Plus size={16} />
          </button>
        </div>
      )}

      <div className="animate-fade-in">
        {activeTab === 'plan' && <PlanView trip={trip} activeDayIdx={activeDayIdx} onUpdate={onUpdate} />}
        {activeTab === 'map' && <MapView currentDay={trip.days[activeDayIdx] || {schedule:[]}} location={trip.location || 'Japan'} />}
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

      <div className="fixed bottom-0 w-full bg-hero-sand-50 border-t border-gray-200 flex justify-around items-center p-2 pb-6 z-50">
        <TabButton icon={List} label="行程" isActive={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
        <TabButton icon={Map} label="地圖" isActive={activeTab === 'map'} onClick={() => setActiveTab('map')} />
        <TabButton icon={Wallet} label="記帳" isActive={activeTab === 'budget'} onClick={() => setActiveTab('budget')} />
        <TabButton icon={Briefcase} label="工具" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
      </div>
    </div>
  );
}

// --- Tab 3: 記帳模組 (BudgetView) ---
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
      {/* 儀表板 */}
      <div className="bg-zen-text text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
             <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Spent (TWD)</span>
             <button onClick={handleEditBudget} className="bg-hero-sand-50/10 p-1.5 rounded-full hover:bg-hero-sand-50/20 text-xs flex items-center gap-1">
               <Edit2 size={10} /> 預算 ${budget.toLocaleString()}
             </button>
          </div>
          <div className="text-4xl font-sans font-bold mb-4">
            <span className="text-lg mr-1">$</span>{Math.round(totalSpentTWD).toLocaleString()}
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-hero-deku-500'}`} style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
             <span>{Math.round(progress)}%</span>
             <span>剩餘 ${Math.max(0, budget - Math.round(totalSpentTWD)).toLocaleString()}</span>
          </div>
        </div>
        <PieChart className="absolute -bottom-4 -right-4 text-white/5 w-32 h-32" />
      </div>

      {/* 支出列表 */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
           <h3 className="font-bold text-hero-dark text-lg">近期支出</h3>
           <div className="text-xs text-gray-400">共 {expenses.length} 筆</div>
        </div>

        {expenses.length === 0 ? (
           <div className="text-center py-10 text-gray-400 text-sm bg-hero-sand-50 rounded-3xl border border-dashed border-gray-200">尚無紀錄</div>
        ) : (
          <div className="space-y-3">
            {expenses.map((item) => (
                <div key={item.id} className="bg-hero-sand-50 p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col gap-2 group">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 font-bold text-xs`}>
                            {item.category ? item.category[0] : '無'}
                          </div>
                          <div>
                            <div className="font-bold text-hero-dark">{item.title}</div>
                            <div className="text-[10px] text-gray-400 flex gap-2">
                               <span className="bg-gray-100 px-1 rounded">{item.category}</span>
                               {item.subCategory && <span className="bg-gray-50 px-1 rounded">{item.subCategory}</span>}
                               {item.location && <span className="flex items-center gap-0.5"><MapPin size={8}/>{item.location}</span>}
                            </div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="font-bold font-mono text-lg">${parseInt(item.twdAmount).toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">
                             {item.currency} {item.amount} {item.paymentMethod && `• ${item.paymentMethod}`}
                          </div>
                      </div>
                   </div>
                   {(item.payer || item.splitFor || item.note) && (
                     <div className="border-t border-gray-50 pt-2 flex justify-between text-[10px] text-gray-500">
                        <div className="flex gap-3">
                           {item.payer && <span>付款: {item.payer}</span>}
                           {item.splitFor && <span>分攤: {item.splitFor}</span>}
                        </div>
                        {item.note && <div className="italic text-gray-400 max-w-[150px] truncate">{item.note}</div>}
                     </div>
                   )}
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

// --- 進階記帳 Modal (含分類自動記憶 + 輸入與下拉整合) ---
function AddExpenseModal({ tripId, categories, onClose, onSave }) {
  const [formData, setFormData] = useState({
    amount: '', currency: 'JPY', rate: '0.22', twdAmount: 0,
    title: '', category: '餐飲', subCategory: '', paymentMethod: '現金',
    payer: '我', splitFor: '全部人', location: '', note: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [showCategoryList, setShowCategoryList] = useState(false);
  const categoryInputRef = useRef(null);

  useEffect(() => {
    const amt = parseFloat(formData.amount) || 0;
    const rt = parseFloat(formData.rate) || 1;
    setFormData(prev => ({...prev, twdAmount: Math.round(amt * rt)}));
  }, [formData.amount, formData.rate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (cat) => {
    setFormData(prev => ({ ...prev, category: cat }));
    setShowCategoryList(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.amount || !formData.title) return;
    onSave({ id: Date.now().toString(), tripId, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-hero-sky-500 hover:bg-hero-sky-600/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-hero-sand-50 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-sans font-bold text-hero-dark">新增支出</h3>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 金額區塊 */}
          <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
             <div className="flex items-end gap-2">
                <div className="flex-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">金額</label>
                   <input type="number" name="amount" placeholder="0" className="w-full text-3xl font-bold bg-transparent border-b border-gray-300 outline-none focus:border-zen-text"
                     value={formData.amount} onChange={handleChange} autoFocus />
                </div>
                <div className="w-24">
                   <select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-hero-sand-50 p-2 rounded-lg text-sm font-bold outline-none border border-gray-200">
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                   </select>
                </div>
             </div>
             <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2 flex-1">
                   <span className="text-xs text-gray-400">匯率</span>
                   <input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-full bg-transparent text-sm border-b border-gray-300 outline-none" />
                </div>
                <div className="text-sm font-bold text-hero-dark bg-zen-text/10 px-3 py-1 rounded-full">
                   ≈ TWD {formData.twdAmount.toLocaleString()}
                </div>
             </div>
          </div>

          {/* 分類區塊 (Input + Dropdown) */}
          <div className="relative">
             <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">主分類</label>
             <div className="flex gap-2">
                <input 
                  ref={categoryInputRef}
                  type="text" 
                  name="category"
                  value={formData.category} 
                  onChange={handleChange}
                  onFocus={() => setShowCategoryList(true)}
                  placeholder="輸入或選擇分類" 
                  className="flex-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text"
                />
                <button type="button" onClick={() => setShowCategoryList(!showCategoryList)} className="p-3 bg-gray-100 rounded-xl">
                   <ChevronDown size={20} className="text-gray-500"/>
                </button>
             </div>
             
             {/* 下拉選單 (自動過濾 + 常用) */}
             {showCategoryList && (
               <div className="absolute z-10 w-full mt-2 bg-hero-sand-50 rounded-xl shadow-xl border border-gray-100 max-h-40 overflow-y-auto p-2 grid grid-cols-3 gap-2">
                 {categories.filter(c => c.includes(formData.category)).map(cat => (
                   <button 
                     key={cat} 
                     type="button" 
                     onClick={() => handleCategorySelect(cat)}
                     className="p-2 text-sm bg-gray-50 hover:bg-zen-text hover:text-white rounded-lg transition-colors text-center"
                   >
                     {cat}
                   </button>
                 ))}
                 {categories.length === 0 && <div className="col-span-3 text-center text-xs text-gray-400 p-2">輸入新分類將自動儲存</div>}
               </div>
             )}
          </div>

          {/* 詳細資訊 Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">項目名稱</label>
                <input type="text" name="title" placeholder="例: 一蘭拉麵" className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.title} onChange={handleChange} />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">副分類</label>
                <input type="text" name="subCategory" placeholder="例: 晚餐" className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.subCategory} onChange={handleChange} />
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">付款方式</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none">
                   {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">日期</label>
                <input type="date" name="date" className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.date} onChange={handleChange} />
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">誰付的 (Payer)</label>
                <input type="text" name="payer" className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.payer} onChange={handleChange} />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">算誰的 (Split)</label>
                <input type="text" name="splitFor" className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.splitFor} onChange={handleChange} />
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">地點</label>
                <input type="text" name="location" placeholder="輸入地點..." className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.location} onChange={handleChange} />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">備註</label>
                <textarea name="note" rows="2" placeholder="備註..." className="w-full mt-1 p-2 bg-gray-50 rounded-xl outline-none border-none"
                  value={formData.note} onChange={handleChange} />
             </div>
          </div>

          <button type="submit" className="w-full bg-zen-text text-white py-3 rounded-xl font-bold mt-2">儲存支出</button>
        </form>
      </div>
    </div>
  )
}

function AddTripModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ 
    title: '', dates: '', timezone: 'Asia/Taipei', coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80' 
  });
  return (
    <div className="fixed inset-0 bg-hero-sky-500 hover:bg-hero-sky-600/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-hero-sand-50 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-sans font-bold text-hero-dark">新增旅程</h3>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: Date.now().toString(), ...formData, days: [] }); }} className="space-y-4">
          <input required type="text" placeholder="旅程名稱" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" onChange={e => setFormData({...formData, title: e.target.value})} />
          <input required type="text" placeholder="日期" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" onChange={e => setFormData({...formData, dates: e.target.value})} />
          <input type="text" placeholder="時區 (例: GMT+9)" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" onChange={e => setFormData({...formData, timezone: e.target.value})} />
          <input type="text" placeholder="圖片 URL" className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" onChange={e => setFormData({...formData, coverImage: e.target.value || formData.coverImage})} />
          <button type="submit" className="w-full bg-zen-text text-white py-3 rounded-xl font-bold"><Save size={18} className="inline mr-2"/> 建立</button>
        </form>
      </div>
    </div>
  )
}

// --- 重複使用組件 (PlanView, MapView, ToolboxView, TabButton, ItemModal) ---
// 為確保完整性，請將之前提供的這些組件代碼接在下方 (這些組件本次無修改需求，沿用即可)
// 為了避免過長，這裡省略。請務必保留 PlanView, MapView, ToolboxView, TabButton, ItemModal 這幾個 function。
// -------------------------------------------------------------------------------------

function PlanView({ trip, activeDayIdx, onUpdate }) {
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [defaultTime, setDefaultTime] = useState('09:00');
  const currentDay = trip.days[activeDayIdx] || { schedule: [] };
  const handleSaveItem = (itemData) => {
    const newDays = [...trip.days];
    const daySchedule = [...newDays[activeDayIdx].schedule];
    if (editingItem) {
      const index = daySchedule.findIndex(i => i === editingItem);
      daySchedule[index] = itemData;
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
    if(!window.confirm("確定刪除此行程？")) return;
    const newDays = [...trip.days];
    const daySchedule = newDays[activeDayIdx].schedule.filter((_, i) => i !== itemIdx);
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
  };
  const openAddModal = () => {
    let nextTime = '09:00';
    if (currentDay.schedule && currentDay.schedule.length > 0) {
      const lastItem = currentDay.schedule[currentDay.schedule.length - 1];
      if (lastItem.time) {
        const [hours, minutes] = lastItem.time.split(':').map(Number);
        const duration = parseFloat(lastItem.duration) || 1;
        const totalMinutes = hours * 60 + minutes + (duration * 60);
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        nextTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      }
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
          {currentDay.schedule?.length === 0 && <div className="text-center py-10 text-gray-400 text-sm pl-8">此日尚無行程</div>}
          {currentDay.schedule?.map((item, idx) => (
            <div key={idx} className="relative pl-8 group">
              <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-white z-10 ${item.highlight ? 'bg-hero-smash-500 ring-4 ring-red-100' : 'bg-gray-400'}`}></div>
              <div className="bg-hero-sand-50 p-5 rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition-shadow relative">
                <div className="absolute top-3 right-3 flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setEditingItem(item); setShowItemModal(true)}} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-blue-600"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteItem(idx)} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-400">{item.time}</span>
                        <span className={`p-1 rounded text-[10px] ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>{TYPE_ICONS[item.type] || TYPE_ICONS.other}</span>
                    </div>
                    {item.duration && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {item.duration} hr</span>}
                </div>
                <h3 className={`text-lg font-bold mb-1 ${item.highlight ? 'text-hero-smash-500' : 'text-hero-dark'}`}>{item.title}</h3>
                <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <MapPin size={10}/> 
                  {item.address ? <a href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(item.address)}`} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-blue-600">{item.address}</a> : '未設定地點'}
                </div>
                {item.tips && <div className="mt-2 p-3 bg-hero-sand-50 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed">💡 {item.tips}</div>}
              </div>
            </div>
          ))}
          <button onClick={openAddModal} className="w-full ml-8 mt-4 py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl hover:border-zen-text hover:text-hero-dark transition-colors text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> 新增行程</button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} defaultTime={defaultTime} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}

function MapView({ currentDay, location }) {
  const addresses = currentDay.schedule?.filter(item => item.address && item.address.length > 2).map(item => encodeURIComponent(item.address)) || [];
  const routeUrl = addresses.length > 0 ? `http://googleusercontent.com/maps.google.com/dir/${addresses.join('/')}` : `http://googleusercontent.com/maps.google.com/?q=${location}`;
  return (
    <div className="p-4 space-y-4">
      <div className="bg-hero-sand-50 p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><Map size={32} /></div>
        <h3 className="text-xl font-sans font-bold text-hero-dark mb-2">路線檢視</h3>
        <p className="text-xs text-gray-500 mb-6">系統已自動抓取今日 {addresses.length} 個地點。<br/>點擊下方按鈕，在 Google Maps 查看完整順路導航。</p>
        {addresses.length > 0 ? (
          <a href={routeUrl} target="_blank" rel="noreferrer" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">開啟導航路線圖 🗺️</a>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-400">今日行程尚未設定地址，無法產生路線。</div>
        )}
      </div>
      <div className="rounded-3xl overflow-hidden shadow-sm border border-gray-200 h-64 relative bg-gray-100">
        {addresses.length > 0 ? (
             <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${addresses[0]}&output=embed`} allowFullScreen></iframe>
        ) : (
           <div className="flex items-center justify-center h-full text-gray-400 text-xs">無地圖資料</div>
        )}
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
      { id: 1, text: '護照 & 簽證', checked: false },
      { id: 2, text: '網卡 / Roaming 開通', checked: false },
      { id: 3, text: '行動電源 & 充電線', checked: false },
      { id: 4, text: '日幣現金 / 信用卡', checked: false },
      { id: 5, text: '個人藥品', checked: false },
    ];
  });
  useEffect(() => { localStorage.setItem('my-travel-checklist', JSON.stringify(checklist)); }, [checklist]);
  const toggleCheck = (id) => { setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };
  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="bg-hero-sand-50 p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-hero-dark mb-4 flex items-center gap-2"><Calculator size={18}/> 匯率試算</h3>
        <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-xl">
           <span className="text-xs text-gray-400 pl-2">匯率:</span>
           <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="bg-transparent w-20 font-mono text-sm outline-none border-b border-gray-300 focus:border-zen-text text-center" />
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase">JPY (日幣)</label>
             <input type="number" value={jpy} onChange={e => setJpy(e.target.value)} placeholder="1000" className="w-full text-2xl font-sans font-bold p-2 border-b border-gray-200 outline-none focus:border-zen-text bg-transparent" />
          </div>
          <div className="text-gray-300">=</div>
          <div className="flex-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase">TWD (台幣)</label>
             <div className="w-full text-2xl font-sans font-bold p-2 text-hero-deku-700">{jpy ? Math.round(jpy * rate).toLocaleString() : 0}</div>
          </div>
        </div>
      </div>
      <div className="bg-hero-sand-50 p-5 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-hero-dark mb-4 flex items-center gap-2"><CheckSquare size={18}/> 行前確認</h3>
        <div className="space-y-3">
          {checklist.map(item => (
            <div key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-zen-text border-zen-text' : 'border-gray-300 bg-hero-sand-50'}`}>
                {item.checked && <CheckSquare size={12} className="text-white" />}
              </div>
              <span className={`text-sm transition-colors ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
         <a href="https://weather.com/" target="_blank" rel="noreferrer" className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-100 transition-colors text-blue-700"><CloudSun size={24} /><span className="text-xs font-bold">天氣預報</span></a>
         <a href="https://www.flightradar24.com/" target="_blank" rel="noreferrer" className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-orange-100 transition-colors text-orange-700"><Plane size={24} /><span className="text-xs font-bold">航班動態</span></a>
      </div>
    </div>
  )
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 transition-colors ${isActive ? 'text-hero-dark' : 'text-gray-300'}`}>
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  )
}

function ItemModal({ initialData, defaultTime, onClose, onSave }) {
  const [formData, setFormData] = useState(initialData || { time: defaultTime, duration: '1', title: '', type: 'spot', address: '', tips: '', highlight: false });
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
  return (
    <div className="fixed inset-0 bg-hero-sky-500 hover:bg-hero-sky-600/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-hero-sand-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-sans font-bold text-hero-dark">{initialData ? '編輯行程' : '新增行程'}</h3>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-500 uppercase">時間</label><input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">停留時長 (小時)</label><input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} placeholder="預設 1 hr" className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          </div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">類型</label><select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text appearance-none"><option value="spot">📸 景點</option><option value="food">🍴 餐廳</option><option value="transport">🚗 交通</option><option value="stay">🏠 住宿</option><option value="relax">💆 放鬆</option><option value="work">💼 工作</option></select></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">標題</label><input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">地點 / 地址</label><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址，點擊可導航" className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">筆記 (Tips)</label><textarea name="tips" rows="3" value={formData.tips} onChange={handleChange} placeholder="必吃菜單、預約號碼..." className="w-full mt-1 p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-zen-text" /></div>
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-800"><input type="checkbox" name="highlight" id="highlight" checked={formData.highlight} onChange={handleChange} className="w-4 h-4 accent-red-600"/><label htmlFor="highlight" className="text-sm font-bold">設為重點行程 (Highlight)</label></div>
          <button type="submit" className="w-full bg-zen-text text-white py-3 rounded-xl font-bold mt-2">儲存</button>
        </form>
      </div>
    </div>
  );
}