import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Edit2, PieChart, Trash2, Plus, X, Camera 
} from 'lucide-react';
import { CURRENCIES, PAYMENT_METHODS } from '../utils/constants';

// ... (SettlementModal & AddExpenseModal 保持不變，省略) ...
// (為確保您能直接複製，下方我還是保留完整代碼)

// --- Sub-component: SettlementModal ---
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
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-extrabold text-hero-dark flex items-center gap-2"><DollarSign size={24} className="text-hero-deku-500"/> 結算報表</h3><button onClick={onClose}><X size={24} className="text-hero-dark-muted"/></button></div>
                <div className="space-y-4">
                    {members.map(member => {
                        const bal = Math.round(balances[member] || 0);
                        return (<div key={member} className="flex justify-between items-center p-4 bg-hero-sand-50 rounded-2xl"><span className="font-bold text-hero-dark">{member}</span><span className={`font-mono font-bold text-lg ${bal >= 0 ? 'text-hero-deku-500' : 'text-hero-smash-500'}`}>{bal >= 0 ? `收 $${bal.toLocaleString()}` : `付 $${Math.abs(bal).toLocaleString()}`}</span></div>)
                    })}
                </div>
                <div className="mt-6 text-xs text-hero-dark-muted text-center">**公費** 不參與均分計算。<br/>正數代表應收，負數代表應付。</div>
            </div>
        </div>
    )
}

// --- Sub-component: AddExpenseModal ---
function AddExpenseModal({ tripId, categories, members, initialData, onClose, onSave }) {
    const [formData, setFormData] = useState(initialData || { amount: '', currency: 'JPY', rate: '0.22', twdAmount: 0, title: '', category: '餐飲', paymentMethod: '現金', location: '', notes: '', payer: members[0] || '我', forWho: '全體', date: new Date().toISOString().split('T')[0].replace(/-/g, '/'), image: '' });
    useEffect(() => { const amt = parseFloat(formData.amount) || 0; const rt = parseFloat(formData.rate) || 1; setFormData(prev => ({...prev, twdAmount: Math.round(amt * rt)})); }, [formData.amount, formData.rate]);
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
            };
        };
        reader.readAsDataURL(file);
    };
    const handleSubmit = (e) => { e.preventDefault(); if(!formData.amount || !formData.title) return; const dataToSave = initialData ? { ...formData, id: initialData.id } : { ...formData, id: Date.now().toString(), tripId, location: formData.location || '', notes: formData.notes || '' }; onSave(dataToSave); onClose(); };
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-hero-sand-100 rounded-full mx-auto mb-8 sm:hidden"></div>
          <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-extrabold text-hero-dark">{initialData ? '調整支出' : '新增支出'}</h3><button onClick={onClose}><X size={24} className="text-hero-dark-muted"/></button></div>
          <form onSubmit={handleSubmit} className="space-y-5">
             <div className="bg-hero-sand-50 p-5 rounded-2xl flex items-end gap-3 border border-hero-sand-200">
                 <div className="flex-1"><label className="text-[10px] font-bold text-hero-dark-muted mb-1 block">金額</label><input type="number" name="amount" placeholder="0" className="w-full bg-transparent text-4xl font-bold outline-none text-hero-dark" value={formData.amount} onChange={handleChange} autoFocus /></div>
                 <select name="currency" value={formData.currency} onChange={handleChange} className="bg-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm outline-none border border-hero-sand-200 text-hero-dark">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
             </div>
             <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2 text-xs text-hero-dark-muted">匯率 <input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-14 bg-hero-sand-50 rounded px-1 py-0.5 text-center text-hero-dark font-mono"/></div>
                 <div className="text-sm font-bold text-hero-dark">≈ TWD {formData.twdAmount.toLocaleString()}</div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">項目名稱</label><input type="text" name="title" placeholder="例: 一蘭拉麵" className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" value={formData.title} onChange={handleChange}/></div>
                 <div>
                    <label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">分類 (可自訂)</label>
                    <input type="text" name="category" placeholder="輸入或選擇..." className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark mb-2" value={formData.category} onChange={handleChange} />
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(c => (<button key={c} type="button" onClick={() => setFormData({...formData, category: c})} className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${formData.category === c ? 'bg-hero-sky-500 text-white border-hero-sky-500' : 'bg-white text-hero-dark-muted border-hero-sand-200 hover:border-hero-sky-300'}`}>{c}</button>))}
                    </div>
                 </div>
             </div>
             <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">收據 / 照片</label><div className="flex gap-4 items-center">{formData.image && (<div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-hero-sand-200 group"><img src={formData.image} alt="Receipt" className="w-full h-full object-cover" /><button type="button" onClick={() => setFormData(prev => ({...prev, image: ''}))} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>)}<label className="flex-1 cursor-pointer"><div className="flex items-center justify-center gap-2 w-full p-4 bg-hero-sand-50 border-2 border-dashed border-hero-sand-200 rounded-xl text-hero-dark-muted hover:border-hero-dark-muted hover:text-hero-dark transition-all"><Camera size={20} /><span className="text-xs font-bold">上傳收據</span></div><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></label></div></div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">誰付 (Payer)</label><select name="payer" value={formData.payer} onChange={handleChange} className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark">{members.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                 <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">算誰的 (For Who)</label><select name="forWho" value={formData.forWho} onChange={handleChange} className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark"><option value="全體">全體 (均分)</option>{members.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">付款方式</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                 <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">日期</label><input type="text" name="date" placeholder="YYYY/MM/DD" className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" value={formData.date} onChange={handleChange} /></div>
             </div>
             <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">地點</label><input type="text" name="location" placeholder="例: 澀谷百貨" className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" value={formData.location} onChange={handleChange}/></div>
             <div><label className="text-[10px] text-hero-dark-muted font-bold mb-1 block">備註</label><textarea name="notes" rows="2" placeholder="其他細節..." className="w-full p-4 bg-hero-sand-50 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" value={formData.notes} onChange={handleChange}></textarea></div>
             <button type="submit" className="w-full bg-hero-sky-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-hero-sky-600 active:scale-95 transition-all mt-4">{initialData ? '儲存變更' : '儲存支出'}</button>
          </form>
        </div>
      </div>
    )
}

// --- Main BudgetView Component ---
export default function BudgetView({ trip, expenses, categories, members, onAddExpense, onDeleteExpense, onUpdateTrip, onUpdateExpense, searchTerm }) { // ✨ 接收 searchTerm
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
  
    // ✨ 搜尋過濾邏輯
    const filteredExpenses = expenses.filter(item => 
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.includes(searchTerm) ||
        (item.notes && item.notes.includes(searchTerm))
    );

    return (
      <div className="p-4 pb-20 space-y-6">
        {/* 只在無搜尋時顯示儀表板，避免搜尋結果被擋住 */}
        {!searchTerm && (
            <div className="bg-hero-dark text-white p-6 rounded-[2rem] shadow-xl shadow-hero-dark/20 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4"><span className="text-hero-dark-muted text-xs font-bold tracking-wider">總支出 (TWD)</span><div className="flex gap-2"><button onClick={() => setShowSettlement(true)} className="bg-hero-deku-500/20 text-hero-deku-500 backdrop-blur px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 hover:bg-hero-deku-500/30 transition-colors font-bold"><DollarSign size={10} /> 結算</button><button onClick={handleEditBudget} className="bg-white/10 backdrop-blur px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 hover:bg-white/20 transition-colors"><Edit2 size={10} /> 預算</button></div></div>
                <div className="text-4xl font-mono font-bold mb-6 tracking-tighter">${Math.round(totalSpentTWD).toLocaleString()}</div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2"><div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-hero-smash-500' : 'bg-hero-deku-500'}`} style={{ width: `${progress}%` }}></div></div>
                <div className="flex justify-between text-[10px] text-hero-dark-muted"><span>{Math.round(progress)}%</span><span>剩餘 ${Math.max(0, budget - Math.round(totalSpentTWD)).toLocaleString()}</span></div>
            </div>
            <PieChart className="absolute -bottom-6 -right-6 text-white/5 w-48 h-48" />
            </div>
        )}

        <div className="space-y-3">
            {filteredExpenses.map((item) => (
                <div key={item.id} onClick={() => handleOpenEdit(item)} className="bg-white p-4 rounded-2xl border border-hero-sand-200 flex justify-between items-center group cursor-pointer hover:border-hero-sky-300 transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-hero-sand-50 flex items-center justify-center text-lg">{item.category?.[0]}</div>
                        <div>
                            <div className="font-bold text-hero-dark text-sm">{item.title}</div>
                            <div className="text-[10px] text-hero-dark-muted font-medium flex gap-2 items-center">{item.category} <span className="w-1 h-1 bg-hero-sand-300 rounded-full"></span> {item.date.slice(5)} {(item.payer || item.forWho) && <span className="text-hero-dark-muted bg-hero-sand-100 px-1.5 rounded">付:{item.payer} / 算:{item.forWho === '全體' ? 'All' : item.forWho}</span>}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {item.image && (
                            <img src={item.image} alt="Receipt" className="w-16 h-16 rounded-xl object-cover border border-hero-sand-200 shadow-sm" />
                        )}
                        <div className="text-right"><div className="font-bold font-mono text-hero-dark">${parseInt(item.twdAmount).toLocaleString()}</div><div className="text-[10px] text-hero-dark-muted">{item.currency} {item.amount}</div></div>
                        <button onClick={(e) => {e.stopPropagation(); onDeleteExpense(item.id)}} className="text-hero-dark-muted hover:text-hero-smash-500 p-2"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {filteredExpenses.length === 0 && <div className="text-center text-hero-dark-muted text-xs py-10">
                {searchTerm ? `找不到符合「${searchTerm}」的支出` : '暫無支出紀錄'}
            </div>}
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full bg-hero-sky-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-hero-sky-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-hero-sky-600"><Plus size={20} /> 記一筆</button>
        {showAddModal && <AddExpenseModal tripId={trip.id} categories={categories} members={members} initialData={editingExpense} onClose={handleCloseModal} onSave={editingExpense ? onUpdateExpense : onAddExpense} />}
        {showSettlement && <SettlementModal expenses={expenses} members={members} onClose={() => setShowSettlement(false)} />}
      </div>
    );
}