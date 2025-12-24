import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Edit2, PieChart, Trash2, Plus, X 
} from 'lucide-react';
import { CURRENCIES, PAYMENT_METHODS } from '../utils/constants';

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

// --- Sub-component: AddExpenseModal ---
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

// --- Main BudgetView Component ---
export default function BudgetView({ trip, expenses, categories, members, onAddExpense, onDeleteExpense, onUpdateTrip, onUpdateExpense }) {
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