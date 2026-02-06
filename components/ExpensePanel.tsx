
import React, { useState, useEffect } from 'react';
import { User, Role, Expense, Vehicle } from '../types';
import { supabase } from '../lib/supabase';

interface ExpensePanelProps {
  currentUser: User;
  allUsers: User[];
}

const ExpensePanel: React.FC<ExpensePanelProps> = ({ currentUser, allUsers }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'entry' | 'report'>('entry');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Manage Vehicles State
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState<{ name: string; type: 'car' | 'motorcycle' }>({ name: '', type: 'car' });

  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState('fuel');
  const [fuelType, setFuelType] = useState('lpg');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState(''); // Parimap
  const [odometer, setOdometer] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isDriver = currentUser.role === Role.DRIVER;
  const isAdmin = currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.BRANCH_ADMIN;

  useEffect(() => {
    fetchExpenses();
    fetchVehicles();
  }, [currentUser]);

  const fetchExpenses = async () => {
    setLoading(true);
    let query = supabase.from('expenses').select('*').order('created_at', { ascending: false });
    // Drivers only see their own, Admins see all
    if (isDriver) {
      query = query.eq('user_id', currentUser.id);
    }
    const { data, error } = await query;
    if (data) setExpenses(data as any);
    setLoading(false);
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) console.error("Error fetching vehicles:", error);
    if (data) setVehicles(data as any);
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.name) return alert("গাড়ির নাম দিন।");
    
    // Use crypto.randomUUID if available for better database compatibility (UUID vs Text)
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `v-${Math.random().toString(36).substr(2, 9)}`;

    setLoading(true);
    const { error } = await supabase.from('vehicles').insert({
      id: newId,
      name: newVehicle.name,
      type: newVehicle.type
    });

    if (!error) {
      await fetchVehicles();
      setNewVehicle({ name: '', type: 'car' });
      setShowVehicleForm(false);
      alert("গাড়ি সফলভাবে তালিকায় যুক্ত হয়েছে।");
    } else {
      console.error("Vehicle Add Error:", error);
      alert(`গাড়ি যোগ করতে সমস্যা হয়েছে: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('গাড়িটি মুছে ফেলতে চান?')) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      alert("মুছতে সমস্যা হয়েছে: " + error.message);
    } else {
      fetchVehicles();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${currentUser.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('expense-vouchers')
      .upload(filePath, file);

    if (uploadError) return null; // Handle silently for now or throw

    const { data } = supabase.storage.from('expense-vouchers').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return alert("টাকার পরিমাণ আবশ্যক।");
    
    // Validation: Check if vehicle is needed
    const needsVehicle = ['fuel', 'maintenance', 'toll', 'motorcycle_bill'].includes(expenseType);
    if (needsVehicle && !selectedVehicleId && vehicles.length > 0) {
      return alert("দয়া করে গাড়ি অথবা বাইক সিলেক্ট করুন।");
    }
    
    setLoading(true);
    try {
      let voucherUrl = null;
      if (file) {
        voucherUrl = await handleUpload(file);
      }
      
      const { error } = await supabase.from('expenses').insert({
        user_id: currentUser.id,
        vehicle_id: selectedVehicleId || null,
        type: expenseType,
        fuel_type: expenseType === 'fuel' ? fuelType : null,
        amount: parseFloat(amount),
        quantity: quantity ? parseFloat(quantity) : null,
        odometer: odometer ? parseFloat(odometer) : null,
        description,
        voucher_url: voucherUrl,
        date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      
      alert("খরচ এন্ট্রি সফল হয়েছে!");
      setAmount('');
      setQuantity('');
      setOdometer('');
      setDescription('');
      setFile(null);
      setPreviewUrl(null);
      fetchExpenses();
    } catch (e: any) {
      alert("সমস্যা হয়েছে: " + e.message);
    }
    setLoading(false);
  };

  // --- REPORT GENERATION LOGIC ---
  const generateReportData = () => {
    const filtered = expenses.filter(ex => ex.date.startsWith(selectedMonth));
    
    // Get unique dates
    const dates = Array.from(new Set(filtered.map(ex => ex.date))).sort();
    
    // Organize by Date -> Vehicle/Type
    return dates.map((date, index) => {
      const daysExpenses = filtered.filter(ex => ex.date === date);
      
      const rowData: any = {
        serial: index + 1,
        date: date,
        vehicles: {},
        motorcycle_bill: 0,
        toll: 0,
        maintenance: 0,
        cooking_gas: 0,
        total: 0,
        sign: ''
      };

      // Process Vehicles (Cars/Bikes)
      vehicles.forEach(v => {
        const vExp = daysExpenses.filter(ex => ex.vehicle_id === v.id && ex.type === 'fuel');
        rowData.vehicles[v.id] = {
          lpg: vExp.filter(x => x.fuel_type === 'lpg').reduce((sum, x) => sum + x.amount, 0),
          petrol: vExp.filter(x => x.fuel_type === 'petrol' || x.fuel_type === 'octane').reduce((sum, x) => sum + x.amount, 0),
          bill99: vExp.filter(x => x.fuel_type === '99').reduce((sum, x) => sum + x.amount, 0),
        };
        rowData.total += (rowData.vehicles[v.id].lpg + rowData.vehicles[v.id].petrol + rowData.vehicles[v.id].bill99);
      });

      // Process Others
      rowData.motorcycle_bill = daysExpenses.filter(ex => ex.type === 'motorcycle_bill').reduce((sum, x) => sum + x.amount, 0);
      rowData.toll = daysExpenses.filter(ex => ex.type === 'toll').reduce((sum, x) => sum + x.amount, 0);
      rowData.maintenance = daysExpenses.filter(ex => ex.type === 'maintenance').reduce((sum, x) => sum + x.amount, 0);
      rowData.cooking_gas = daysExpenses.filter(ex => ex.type === 'cooking_gas').reduce((sum, x) => sum + x.amount, 0);
      
      rowData.total += (rowData.motorcycle_bill + rowData.toll + rowData.maintenance + rowData.cooking_gas);

      return rowData;
    });
  };

  const reportData = generateReportData();

  const exportToCSV = () => {
    // Header Row 1: Vehicles
    let header1 = ["SL", "Date"];
    vehicles.forEach(v => {
      header1.push(`${v.name} (LPG)`);
      header1.push(`${v.name} (Petrol/Oct)`);
      header1.push(`${v.name} (99 Bill)`);
    });
    header1.push("Motorcycle");
    header1.push("Toll/Pass");
    header1.push("Repair");
    header1.push("Cooking Gas");
    header1.push("Total Price");

    // Rows
    const rows = reportData.map(r => {
      let row = [r.serial, r.date];
      vehicles.forEach(v => {
        row.push(r.vehicles[v.id].lpg || 0);
        row.push(r.vehicles[v.id].petrol || 0);
        row.push(r.vehicles[v.id].bill99 || 0);
      });
      row.push(r.motorcycle_bill);
      row.push(r.toll);
      row.push(r.maintenance);
      row.push(r.cooking_gas);
      row.push(r.total);
      return row.join(",");
    });

    const csvContent = [header1.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `monthly_expense_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800">গাড়ির খরচ ব্যবস্থাপনা</h2>
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={() => setViewMode('entry')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'entry' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              Data Entry
            </button>
            <button 
              onClick={() => setViewMode('report')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'report' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              Monthly Report
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all bg-slate-50"
          />
          {viewMode === 'report' && (
            <button onClick={exportToCSV} className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Excel
            </button>
          )}
        </div>
      </div>

      {viewMode === 'entry' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* VEHICLE MANAGER (Admins Only) */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800 text-sm">গাড়ির তালিকা</h4>
                <button onClick={() => setShowVehicleForm(!showVehicleForm)} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">
                  {showVehicleForm ? 'Cancel' : '+ Add Car / Bike'}
                </button>
              </div>
              
              {showVehicleForm && (
                <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex gap-4">
                     <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                       <input type="radio" name="vType" checked={newVehicle.type === 'car'} onChange={() => setNewVehicle({...newVehicle, type: 'car'})} className="text-blue-600 focus:ring-blue-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Car / Micro</span>
                     </label>
                     <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                       <input type="radio" name="vType" checked={newVehicle.type === 'motorcycle'} onChange={() => setNewVehicle({...newVehicle, type: 'motorcycle'})} className="text-blue-600 focus:ring-blue-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Motorcycle</span>
                     </label>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} placeholder="নাম ও নম্বর (e.g., SUV 49-0412)" className="flex-1 p-3 bg-white rounded-xl border border-slate-100 font-bold text-sm" />
                    <button onClick={handleAddVehicle} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50">
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className={`w-2 h-2 rounded-full mr-2 ${v.type === 'motorcycle' ? 'bg-orange-400' : 'bg-blue-400'}`}></span>
                    <span className="text-xs font-bold text-slate-700 mr-2">{v.name}</span>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-400 hover:text-red-600 font-bold ml-1">×</button>
                  </div>
                ))}
                {vehicles.length === 0 && <span className="text-xs text-slate-400">কোনো গাড়ি নেই।</span>}
              </div>
            </div>
          )}

          {/* ENTRY FORM */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest border-b border-slate-50 pb-4">নতুন খরচ যোগ করুন</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Type Selection */}
              <div className="md:col-span-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { id: 'fuel', label: 'Fuel' },
                  { id: 'maintenance', label: 'Repair' },
                  { id: 'toll', label: 'Toll/Pass' },
                  { id: 'motorcycle_bill', label: 'Moto Bill' },
                  { id: 'cooking_gas', label: 'Cook Gas' },
                  { id: 'other', label: 'Other' }
                ].map(type => (
                  <button 
                    key={type.id}
                    type="button"
                    onClick={() => setExpenseType(type.id)}
                    className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${expenseType === type.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Fields */}
              {['fuel', 'maintenance', 'toll', 'motorcycle_bill'].includes(expenseType) && (
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">গাড়ি / বাইক নির্বাচন করুন</label>
                  <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold">
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
                  </select>
                </div>
              )}

              {expenseType === 'fuel' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ফুয়েল টাইপ</label>
                    <select value={fuelType} onChange={e => setFuelType(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold">
                      <option value="lpg">LPG (Gas)</option>
                      <option value="petrol">Petrol</option>
                      <option value="octane">Octane</option>
                      <option value="diesel">Diesel</option>
                      <option value="99">99 Bill</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">পরিমাপ (লিটার/কেজি)</label>
                    <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" placeholder="Qty" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">টাকার পরিমাণ</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" placeholder="0.00" />
              </div>

              {expenseType !== 'cooking_gas' && (
                 <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">মাইলেজ (Odometer)</label>
                  <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" placeholder="Km" />
                </div>
              )}

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ভাউচার (ছবি)</label>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-sm" />
                {previewUrl && (
                  <div className="mt-2 h-32 w-32 rounded-xl overflow-hidden border border-slate-200">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                 <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                  {loading ? 'সাবমিট হচ্ছে...' : 'জমা দিন'}
                </button>
              </div>
            </form>
          </div>
          
          {/* RECENT LIST */}
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
             <div className="p-6 border-b border-slate-50"><h4 className="font-black text-slate-800">সাম্প্রতিক এন্ট্রি</h4></div>
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Details</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.slice(0, 5).map(ex => (
                    <tr key={ex.id}>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{ex.date}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-slate-800">{ex.type} {ex.fuel_type && `(${ex.fuel_type})`}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">৳{ex.amount}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{vehicles.find(v => v.id === ex.vehicle_id)?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>

        </div>
      )}

      {/* MATRIX REPORT VIEW */}
      {viewMode === 'report' && (
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider text-center">
                   <th className="p-3 border border-slate-700" rowSpan={2}>SL</th>
                   <th className="p-3 border border-slate-700" rowSpan={2} style={{minWidth: '100px'}}>Date</th>
                   {vehicles.map(v => (
                     <th key={v.id} colSpan={3} className="p-3 border border-slate-700">{v.name}</th>
                   ))}
                   <th className="p-3 border border-slate-700" rowSpan={2}>Moto Bill</th>
                   <th className="p-3 border border-slate-700" rowSpan={2}>Toll</th>
                   <th className="p-3 border border-slate-700" rowSpan={2}>Repair</th>
                   <th className="p-3 border border-slate-700" rowSpan={2}>Gas (Cook)</th>
                   <th className="p-3 border border-slate-700" rowSpan={2}>Total</th>
                 </tr>
                 <tr className="bg-slate-700 text-white text-[9px] font-bold text-center">
                   {vehicles.map(v => (
                     <React.Fragment key={v.id}>
                        <th className="p-2 border border-slate-600">LPG</th>
                        <th className="p-2 border border-slate-600">Petrol</th>
                        <th className="p-2 border border-slate-600">99 Bill</th>
                     </React.Fragment>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {reportData.map((row) => (
                   <tr key={row.date} className="text-center hover:bg-blue-50/50 text-xs font-bold text-slate-700">
                     <td className="p-3 border border-slate-100">{row.serial}</td>
                     <td className="p-3 border border-slate-100 whitespace-nowrap">{row.date}</td>
                     {vehicles.map(v => (
                        <React.Fragment key={v.id}>
                          <td className="p-3 border border-slate-100 text-slate-500">{row.vehicles[v.id].lpg || '-'}</td>
                          <td className="p-3 border border-slate-100 text-slate-500">{row.vehicles[v.id].petrol || '-'}</td>
                          <td className="p-3 border border-slate-100 text-slate-500">{row.vehicles[v.id].bill99 || '-'}</td>
                        </React.Fragment>
                     ))}
                     <td className="p-3 border border-slate-100">{row.motorcycle_bill || '-'}</td>
                     <td className="p-3 border border-slate-100">{row.toll || '-'}</td>
                     <td className="p-3 border border-slate-100">{row.maintenance || '-'}</td>
                     <td className="p-3 border border-slate-100">{row.cooking_gas || '-'}</td>
                     <td className="p-3 border border-slate-100 bg-slate-50 font-black">৳{row.total}</td>
                   </tr>
                 ))}
                 {reportData.length === 0 && (
                   <tr><td colSpan={100} className="p-10 text-center text-slate-400">এই মাসে কোনো ডাটা নেই।</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

    </div>
  );
};

export default ExpensePanel;
