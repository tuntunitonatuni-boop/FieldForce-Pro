
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 z-0"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 relative z-10 m-4 flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl mb-4 shadow-lg shadow-blue-500/30 transform hover:rotate-3 transition-transform">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            FieldForce <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1 mb-4">One Platform. Total Control.</p>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
            {isFirstRun ? 'Setup & Registration' : (isLogin ? 'Secure Access' : 'Create Account')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center animate-in fade-in zoom-in duration-300">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username / Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your ID"
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none font-bold text-slate-800 placeholder:text-slate-300"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none font-bold text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!isFirstRun && (
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
                  <button type="button" onClick={() => setRole(Role.OFFICER)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.OFFICER ? 'bg-white text-blue-600 shadow-sm scale-100' : 'text-slate-400 scale-95'}`}>Officer</button>
                  <button type="button" onClick={() => setRole(Role.BRANCH_ADMIN)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.BRANCH_ADMIN ? 'bg-white text-blue-600 shadow-sm scale-100' : 'text-slate-400 scale-95'}`}>Admin</button>
                  <button type="button" onClick={() => setRole(Role.SUPER_ADMIN)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === Role.SUPER_ADMIN ? 'bg-white text-blue-600 shadow-sm scale-100' : 'text-slate-400 scale-95'}`}>Super</button>
                </div>
              )}
              
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (No Spaces)" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold" />
              
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isFirstRun || isCreatingBranch ? 'Branch Name' : 'Select Branch'}
                  </label>
                  
                  {!isFirstRun && (role === Role.SUPER_ADMIN || role === Role.BRANCH_ADMIN) && (
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingBranch(!isCreatingBranch)} 
                      className="text-[9px] font-black text-blue-600 uppercase tracking-widest"
                    >
                      {isCreatingBranch ? 'Cancel' : '+ New'}
                    </button>
                  )}
                </div>

                {isFirstRun || isCreatingBranch ? (
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Head Office"
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-blue-200 bg-blue-50 focus:border-blue-500 outline-none font-bold text-blue-800"
                  />
                ) : (
                  <div className="relative">
                    <select 
                      value={selectedBranch} 
                      onChange={(e) => setSelectedBranch(e.target.value)} 
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold bg-slate-50 appearance-none"
                      required
                    >
                      <option value="">Select a Branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                )}
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (Min 6 chars)"
                required
                minLength={6}
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:scale-100"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        {!isFirstRun && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                if (isLogin) setRole(Role.OFFICER); 
              }}
              className="text-xs font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest p-2"
            >
              {isLogin ? "New User? Create Account" : 'Back to Login'}
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 text-slate-500/50 text-[10px] font-black uppercase tracking-[0.2em] z-20 pointer-events-none">
        Developed by Anik Das
      </div>
    </div>
  );
};

export default Auth;
