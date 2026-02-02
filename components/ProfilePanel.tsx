
import React, { useState } from 'react';
import { User, Role, Branch } from '../types';
import { supabase } from '../lib/supabase';

interface ProfilePanelProps {
  user: User;
  branches: Branch[];
  onUpdate: (updatedUser: User) => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, branches, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    phone_number: user.phone_number || '',
    bio: user.bio || '',
    staff_pin: user.staff_pin || ''
  });
  const [saving, setSaving] = useState(false);

  const assignedBranch = branches.find(b => b.id === user.branch_id) || branches[0] || { name: 'Not Found' };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: formData.name,
        phone_number: formData.phone_number,
        bio: formData.bio,
        staff_pin: formData.staff_pin
      }).eq('id', user.id);
      if (error) throw error;
      onUpdate({ ...user, name: formData.name, phone_number: formData.phone_number, bio: formData.bio, staff_pin: formData.staff_pin });
      setIsEditing(false);
      alert('প্রোফাইল আপডেট হয়েছে!');
    } catch (err) { alert('সমস্যা হয়েছে।'); }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-800"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-blue-50 flex items-center justify-center text-3xl font-black text-blue-300 uppercase">
                {user.name.charAt(0)}
              </div>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">
              {isEditing ? 'বাতিল' : 'এডিট'}
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{user.role.replace('_', ' ')} • Branch: {assignedBranch.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        {isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" placeholder="Name" />
              <input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" placeholder="Phone" />
              <input type="text" value={formData.staff_pin} onChange={e => setFormData({...formData, staff_pin: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold" placeholder="Staff PIN" />
            </div>
            <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border outline-none font-bold min-h-[100px]" placeholder="Bio"></textarea>
            <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl disabled:bg-slate-300">
              {saving ? 'সেভ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InfoItem label="ইমেইল" value={user.email} />
            <InfoItem label="ফোন" value={user.phone_number || 'নেই'} />
            <InfoItem label="স্টাফ পিন" value={user.staff_pin || 'নেই'} />
            <InfoItem label="ব্রাঞ্চ" value={assignedBranch.name} />
          </div>
        )}
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p><p className="font-bold text-slate-800">{value}</p></div>
);

export default ProfilePanel;
