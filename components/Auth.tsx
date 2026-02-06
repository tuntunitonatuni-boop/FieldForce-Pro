
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Role, Branch } from '../types';

interface AuthProps {
  onAuthComplete: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(Role.OFFICER);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newBranchName, setNewBranchName] = useState('Head Office'); // For first run
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase.from('branches').select('*');
      
      if (error) {
        console.error("Supabase Error:", error);
        if (error.message.includes("Invalid API key")) {
          setError("ডাটাবেস কানেকশন এরর: Invalid API Key. দয়া করে lib/supabase.ts ফাইলে আপনার নিজের সঠিক Supabase URL এবং Key দিন।");
        } else {
          setError("ডাটা লোড করতে সমস্যা: " + error.message);
        }
        return;
      }

      if (data) {
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranch(data[0].id);
        } else {
          // No branches found, enable First Run Setup
          setIsFirstRun(true);
          setIsCreatingBranch(true);
          setRole(Role.SUPER_ADMIN);
          setIsLogin(false); // Force signup
        }
      }
    };
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const input = identifier.trim();

    try {
      if (isLogin) {
        let targetEmail = input;

        if (!input.includes('@')) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .ilike('username', input)
            .maybeSingle();
          
          if (profileError) throw new Error('সার্ভার এরর: প্রোফাইল তথ্য পাওয়া যায়নি। ' + profileError.message);

          if (!profile || !profile.email) {
            throw new Error('এই ইউজারনেমে কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
          }
          targetEmail = profile.email;
        }

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });
        
        if (loginError) throw loginError;
        if (data?.user) onAuthComplete();

      } else {
        // SIGN UP LOGIC
        const cleanUsername = username.trim().toLowerCase();
        
        if (!cleanUsername || cleanUsername.includes(' ')) {
          throw new Error('ইউজারনেম-এ স্পেস থাকা যাবে না।');
        }

        let finalBranchId = selectedBranch;

        // Handle First Run OR Manual Create
        if (isFirstRun || isCreatingBranch) {
          if (!newBranchName.trim()) throw new Error('ব্রাঞ্চের নাম দিন।');
          
          const newId = 'b-' + Math.random().toString(36).substr(2, 6);
          const { error: branchError } = await supabase.from('branches').insert({
            id: newId,
            name: newBranchName,
            lat: 23.8103, // Default Dhaka
            lng: 90.4125,
            radius: 500
          });

          if (branchError) throw new Error('ব্রাঞ্চ তৈরিতে সমস্যা হয়েছে: ' + branchError.message);
          finalBranchId = newId;
        } else if (!finalBranchId) {
          throw new Error('দয়া করে একটি ব্রাঞ্চ সিলেক্ট করুন।');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: name.trim(),
              username: cleanUsername,
              role: role,
              branch_id: finalBranchId,
            },
          },
        });
        
        if (signUpError) throw signUpError;

        if (data.session) {
          onAuthComplete();
        } else {
          setError('রেজিস্ট্রেশন হয়েছে! ইমেইল কনফার্ম করুন অথবা সরাসরি লগইন করার চেষ্টা করুন।');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message;
      if (msg.includes('Invalid login credentials')) msg = 'ইউজারনেম বা পাসওয়ার্ড ভুল।';
      if (msg.includes('Invalid API key')) msg = 'Supabase API Key ভুল। lib/supabase.ts ফাইলটি চেক করুন।';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-3xl mb-6 shadow-inner">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            FieldForce <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-[0.2em]">
            {isFirstRun ? 'প্রথম সেটআপ ও রেজিস্ট্রেশন' : (isLogin ? 'সিকিউর লগইন' : 'নতুন আইডি তৈরি করুন')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center animate-in fade-in zoom-in duration-300">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>{error}</span>
          </div>
        )}

        {isFirstRun && !error && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100 text-center">
            স্বাগতম! আপনার সিস্টেমে কোনো ব্রাঞ্চ নেই। নিচে আপনার প্রথম ব্রাঞ্চ এবং সুপার এডমিন একাউন্ট তৈরি করুন।
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isLogin ? (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ইউজারনেম অথবা ইমেইল</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or Email"
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!isFirstRun && (
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button type="button" onClick={() => setRole(Role.OFFICER)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.OFFICER ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Officer</button>
                  <button type="button" onClick={() => setRole(Role.BRANCH_ADMIN)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.BRANCH_ADMIN ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Admin</button>
                  <button type="button" onClick={() => setRole(Role.SUPER_ADMIN)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.SUPER_ADMIN ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Super</button>
                </div>
              )}
              
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="পুরো নাম" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ইউজারনেম (স্পেস ছাড়া)" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ইমেইল এড্রেস" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold" />
              
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isFirstRun || isCreatingBranch ? 'নতুন ব্রাঞ্চের নাম' : 'ব্রাঞ্চ নির্বাচন করুন'}
                  </label>
                  
                  {/* Allow Admins to toggle between Select and Create */}
                  {!isFirstRun && (role === Role.SUPER_ADMIN || role === Role.BRANCH_ADMIN) && (
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingBranch(!isCreatingBranch)} 
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest hover:underline"
                    >
                      {isCreatingBranch ? 'তালিকায় ফিরে যান' : '+ নতুন ব্রাঞ্চ'}
                    </button>
                  )}
                </div>

                {isFirstRun || isCreatingBranch ? (
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="ব্রাঞ্চের নাম (যেমন: Head Office)"
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-blue-200 bg-blue-50 focus:border-blue-500 transition-all outline-none font-bold text-blue-800"
                  />
                ) : (
                  <select 
                    value={selectedBranch} 
                    onChange={(e) => setSelectedBranch(e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold bg-white"
                    required
                  >
                    <option value="">ব্রাঞ্চ নির্বাচন করুন</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                
                {branches.length === 0 && !isFirstRun && !isCreatingBranch && (
                   <p className="text-[10px] text-red-500 font-bold mt-2 px-1">
                     কোনো ব্রাঞ্চ পাওয়া যায়নি। দয়া করে "সুপার" রোল সিলেক্ট করে নতুন ব্রাঞ্চ তৈরি করুন।
                   </p>
                )}
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড (কমপক্ষে ৬ ডিজিট)"
                required
                minLength={6}
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 transition-all outline-none font-bold"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-200 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? 'লগইন' : 'অ্যাকাউন্ট তৈরি করুন'}
          </button>
        </form>

        {!isFirstRun && (
          <div className="mt-10 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                // Reset role to officer when switching back to sign up for standard flow
                if (isLogin) setRole(Role.OFFICER); 
              }}
              className="text-xs font-black text-blue-600 hover:text-blue-800 transition-all uppercase tracking-widest"
            >
              {isLogin ? "নতুন একাউন্ট? এখানে ক্লিক করুন" : 'লগইন পেইজে ফিরে যান'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
