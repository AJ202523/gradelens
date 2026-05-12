import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function App() {
  const [view, setView] = useState('auth');
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const checkPasswordStrength = (pwd) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);
  };

  // Dashboard state
  const [answerKey, setAnswerKey] = useState('');
  const [critKeysArr, setCritKeysArr] = useState([]);
  const [critInput, setCritInput] = useState('');
  const [regKeysArr, setRegKeysArr] = useState([]);
  const [regInput, setRegInput] = useState('');
  const [studentText, setStudentText] = useState('');
  const [file, setFile] = useState(null);

  // Result state
  const [result, setResult] = useState(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);

  // File upload refs
  const answerKeyFileRef = useRef(null);
  const critKeyFileRef = useRef(null);
  const regKeyFileRef = useRef(null);

  const handleLogin = async () => {
    setAuthError('');
    try {
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setUsername(data.user?.username || username);
        setEmail(data.user?.email || '');
        setView('dashboard');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const handleRegister = async () => {
    setAuthError('');
    if (!checkPasswordStrength(password)) {
      setAuthError('Please use a stronger password to continue.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });
      const data = await response.json();
      if (response.ok) {
        setUsername(data.user?.username || '');
        setView('dashboard');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const handleResetPassword = async () => {
    setAuthError('');
    if (!checkPasswordStrength(newPassword)) {
      setAuthError('New password does not meet security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setView('auth');
        setIsRegistering(false);
        setNewPassword('');
        setConfirmPassword('');
        setAuthError('Password reset successful. Please sign in.');
      } else {
        setAuthError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const handleUpdateAccount = async () => {
    setAuthError('');
    if (newPassword && !checkPasswordStrength(newPassword)) {
      setAuthError('New password does not meet security requirements.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setAuthError('New passwords do not match.');
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword, newPassword, newUsername: username })
      });
      const data = await response.json();
      if (response.ok) {
        setAuthError('Account updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setUsername(data.user?.username || username);
      } else {
        setAuthError(data.error || 'Account update failed');
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const CHART_COLORS = ['#DA4933', '#726861', '#0086AB', '#87726F'];

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:3001/analytics-data');
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) { console.error('Analytics fetch error', err); }
  };

  useEffect(() => {
    if (view === 'analytics') fetchAnalytics();
  }, [view]);

  const handleReferenceUpload = async (file, type) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:3001/extract-text', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Upload failed'); return; }
      const text = data.text || '';
      if (type === 'answerKey') {
        setAnswerKey(text);
      } else if (type === 'critKeys') {
        const keys = text.split(',').map(s => s.trim()).filter(s => s);
        setCritKeysArr(prev => [...prev, ...keys]);
      } else if (type === 'regKeys') {
        const keys = text.split(',').map(s => s.trim()).filter(s => s);
        setRegKeysArr(prev => [...prev, ...keys]);
      }
    } catch (err) { alert('File upload connection error'); }
  };

  const handleClearAll = () => {
    setAnswerKey(''); setCritKeysArr([]); setCritInput(''); setRegKeysArr([]); setRegInput(''); setStudentText(''); setFile(null);
    const fileInput = document.getElementById('submission-file');
    if (fileInput) fileInput.value = '';
  };

  const handleGrade = async () => {
    if (!answerKey.trim()) {
      alert("Please provide an Ideal Response (Answer Key).");
      return;
    }
    if (critKeysArr.length === 0) {
      alert("Please provide at least one Critical Keyword.");
      return;
    }
    if (regKeysArr.length === 0) {
      alert("Please provide at least one Regular Keyword.");
      return;
    }
    if (!studentText.trim() && !file) {
      alert("Please provide a Student Submission (Text or File).");
      return;
    }

    setView('loading');
    try {
      const formData = new FormData();
      formData.append('answerKey', answerKey);
      formData.append('criticalKeywords', critKeysArr.join(','));
      formData.append('regularKeywords', regKeysArr.join(','));
      formData.append('studentText', studentText);
      if (file) {
        formData.append('submissionFile', file);
      }
      formData.append('userEmail', email);

      const response = await fetch('http://localhost:3001/grade', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Grading failed');
        setView('dashboard');
        return;
      }
      if (data.historySaved === false) {
        console.warn('Grade calculated but history save failed');
      }
      setResult(data);
      setView('results');
    } catch (err) {
      alert('Grading error');
      setView('dashboard');
    }
  };

  return (
    <div className="bg-vellum text-warm-onyx font-body-md min-h-screen w-full flex flex-col antialiased selection:bg-vermilion selection:text-white">
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-margin-page pt-8 pb-12 flex flex-col">

        {/* STATE 1: Authentication */}
        {view === 'auth' && (
          <section className="flex flex-col items-center justify-center w-full flex-grow min-h-[60vh]">
            <div className="backdrop-blur-xl bg-neutral/10 border border-neutral/20 rounded-2xl p-10 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-headline-md text-warm-onyx">{isRegistering ? 'Create Account' : 'Sign In'}</h2>
              </div>
              <form className="flex flex-col gap-5">
                {isRegistering && (
                  <div className="flex flex-col gap-2">
                    <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="reg-email">Email</label>
                    <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="reg-email" placeholder="scholar@university.edu" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="username-field">Username</label>
                  <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="username-field" placeholder="Enter your username" type="text" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="password">Password</label>
                  <div className="relative">
                    <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 pr-12 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="password" placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-taupe hover:text-vermilion transition-colors"><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                  </div>
                  {isRegistering && password.length > 0 && (
                    <span className={`text-xs font-label-md ${checkPasswordStrength(password) ? 'text-[#285943]' : 'text-muted-taupe'}`}>
                      {checkPasswordStrength(password) ? 'Strong Password' : 'Weak: Requires 8+ chars, uppercase, number, & symbol'}
                    </span>
                  )}
                  {!isRegistering && (
                    <div className="flex justify-end mt-1">
                      <button type="button" onClick={() => { setView('reset'); setAuthError(''); }} className="text-[10px] text-muted-taupe hover:text-vermilion transition-colors font-label-md uppercase tracking-widest">Forgot Password?</button>
                    </div>
                  )}
                </div>
                <button className="mt-4 w-full bg-vermilion text-white font-label-lg py-4 rounded-xl hover:bg-vermilion/90 transition-colors active:scale-[0.99]" type="button" onClick={isRegistering ? handleRegister : handleLogin}>{isRegistering ? 'Create Account' : 'Sign In'}</button>
                {authError && (
                  <p className="mt-2 text-center text-sm font-label-md text-vermilion">
                    {authError}
                  </p>
                )}
                <button 
                  type="button" 
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError('');
                  }}
                  className="mt-2 text-xs text-neutral underline font-label-md uppercase tracking-widest text-center w-full hover:text-warm-onyx transition-colors"
                >
                  {isRegistering ? "Already have an account? Sign In here" : "Don't have an account? Register here"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* STATE: Reset Password */}
        {view === 'reset' && (
          <section className="flex flex-col items-center justify-center w-full flex-grow min-h-[60vh]">
            <div className="backdrop-blur-xl bg-neutral/10 border border-neutral/20 rounded-2xl p-10 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-headline-md text-warm-onyx">Reset Password</h2>
                <p className="text-xs text-muted-taupe mt-4 font-body-md">In a production environment, a reset link would be sent to your email. For now, please enter your new password below to reset immediately.</p>
              </div>
              <form className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="reset-email">Email</label>
                  <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="reset-email" placeholder="scholar@university.edu" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="new-password">New Password</label>
                  <div className="relative">
                    <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 pr-12 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="new-password" placeholder="••••••••" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-taupe hover:text-vermilion transition-colors"><span className="material-symbols-outlined text-[20px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span></button>
                  </div>
                  {newPassword.length > 0 && (
                    <span className={`text-xs font-label-md ${checkPasswordStrength(newPassword) ? 'text-[#285943]' : 'text-muted-taupe'}`}>
                      {checkPasswordStrength(newPassword) ? 'Strong Password' : 'Weak: Requires 8+ chars, uppercase, number, & symbol'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md" htmlFor="confirm-password">Confirm Password</label>
                  <div className="relative">
                    <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 pr-12 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" id="confirm-password" placeholder="••••••••" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-taupe hover:text-vermilion transition-colors"><span className="material-symbols-outlined text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span></button>
                  </div>
                </div>
                <button className="mt-4 w-full bg-vermilion text-white font-label-lg py-4 rounded-xl hover:bg-vermilion/90 transition-colors active:scale-[0.99]" type="button" onClick={handleResetPassword}>Reset Password</button>
                {authError && (
                  <p className="mt-2 text-center text-sm font-label-md text-vermilion">
                    {authError}
                  </p>
                )}
                <button 
                  type="button" 
                  onClick={() => {
                    setView('auth');
                    setAuthError('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="mt-2 text-xs text-neutral underline font-label-md uppercase tracking-widest text-center w-full hover:text-warm-onyx transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            </div>
          </section>
        )}

        {/* STATE 2: Dashboard */}
        {view === 'dashboard' && (
          <section className="flex flex-col w-full">
            <nav className="bg-fresh-paper w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center mb-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4">
                <span className="font-headline-md text-headline-md text-vermilion">Gradelens</span>
                <div className="w-[1px] h-6 bg-muted-taupe/20"></div>
                <span className="font-label-lg text-label-lg text-warm-onyx uppercase tracking-widest">Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-muted-taupe/30 rounded-lg text-sm text-warm-onyx font-label-md hover:border-vermilion hover:text-vermilion transition-all active:scale-[0.98]" onClick={() => setView('analytics')}>
                  Analytics
                  <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-muted-taupe/30 rounded-lg text-sm text-warm-onyx font-label-md hover:border-vermilion hover:text-vermilion transition-all active:scale-[0.98]" onClick={() => setView('account')}>
                  Account
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-muted-taupe/30 rounded-lg text-sm text-warm-onyx font-label-md hover:border-vermilion hover:text-vermilion transition-all active:scale-[0.98]" onClick={() => setView('auth')}>
                  Logout
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </nav>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter w-full">
              {/* Card A: Professor's Answer Key */}
              <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-stack-md">
                <h3 className="font-headline-md text-headline-md text-warm-onyx mb-stack-sm border-b border-muted-taupe/10 pb-unit">Professor's Answer Key</h3>
                <div className="flex flex-col gap-stack-sm">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-muted-taupe uppercase" htmlFor="answer-key">Ideal Response</label>
                    <button type="button" onClick={() => answerKeyFileRef.current?.click()} className="text-muted-taupe hover:text-vermilion transition-colors flex items-center gap-1 text-xs font-label-md"><span className="material-symbols-outlined text-[16px]">upload_file</span>Upload</button>
                    <input type="file" ref={answerKeyFileRef} accept=".txt,.pdf,.docx" className="hidden" onChange={e => { handleReferenceUpload(e.target.files[0], 'answerKey'); e.target.value = ''; }} />
                  </div>
                  <textarea className="w-full box-border bg-vellum border border-muted-taupe/20 rounded-xl p-4 font-body-md text-body-md min-h-[250px] focus:border-vermilion focus:ring-2 focus:ring-vermilion/30 focus:outline-none resize-y transition-all" id="answer-key" placeholder="Enter the definitive academic response here..." value={answerKey} onChange={e => setAnswerKey(e.target.value)}></textarea>
                </div>
                <div className="grid grid-cols-1 gap-stack-md">
                  <div className="flex flex-col gap-stack-sm">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-muted-taupe uppercase" htmlFor="crit-keywords">Critical Keywords</label>
                      <button type="button" onClick={() => critKeyFileRef.current?.click()} className="text-muted-taupe hover:text-vermilion transition-colors flex items-center gap-1 text-xs font-label-md"><span className="material-symbols-outlined text-[16px]">upload_file</span>.csv/.txt</button>
                      <input type="file" ref={critKeyFileRef} accept=".txt,.csv" className="hidden" onChange={e => { handleReferenceUpload(e.target.files[0], 'critKeys'); e.target.value = ''; }} />
                    </div>
                    <div className="bg-vellum border border-muted-taupe/20 rounded-xl p-2 min-h-[50px] focus-within:border-vermilion focus-within:ring-2 focus-within:ring-vermilion/30 flex flex-wrap gap-2 items-center transition-all">
                      {critKeysArr.map((key, i) => (
                        <span key={i} className="bg-white border border-muted-taupe/20 rounded-md px-2 py-1 text-xs text-warm-onyx flex items-center gap-1 shadow-sm">
                          {key}
                          <button type="button" onClick={() => setCritKeysArr(critKeysArr.filter((_, idx) => idx !== i))} className="text-muted-taupe hover:text-vermilion material-symbols-outlined text-[14px]">close</button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none font-mono text-sm min-w-[100px]" 
                        placeholder="Type and press Enter..." 
                        value={critInput}
                        onChange={e => setCritInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            if (critInput.trim()) {
                              setCritKeysArr([...critKeysArr, critInput.trim()]);
                              setCritInput('');
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-stack-sm">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-muted-taupe uppercase" htmlFor="reg-keywords">Regular Keywords</label>
                      <button type="button" onClick={() => regKeyFileRef.current?.click()} className="text-muted-taupe hover:text-vermilion transition-colors flex items-center gap-1 text-xs font-label-md"><span className="material-symbols-outlined text-[16px]">upload_file</span>.csv/.txt</button>
                      <input type="file" ref={regKeyFileRef} accept=".txt,.csv" className="hidden" onChange={e => { handleReferenceUpload(e.target.files[0], 'regKeys'); e.target.value = ''; }} />
                    </div>
                    <div className="bg-vellum border border-muted-taupe/20 rounded-xl p-2 min-h-[50px] focus-within:border-vermilion focus-within:ring-2 focus-within:ring-vermilion/30 flex flex-wrap gap-2 items-center transition-all">
                      {regKeysArr.map((key, i) => (
                        <span key={i} className="bg-white border border-muted-taupe/20 rounded-md px-2 py-1 text-xs text-warm-onyx flex items-center gap-1 shadow-sm">
                          {key}
                          <button type="button" onClick={() => setRegKeysArr(regKeysArr.filter((_, idx) => idx !== i))} className="text-muted-taupe hover:text-vermilion material-symbols-outlined text-[14px]">close</button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none font-mono text-sm min-w-[100px]" 
                        placeholder="Type and press Enter..." 
                        value={regInput}
                        onChange={e => setRegInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            if (regInput.trim()) {
                              setRegKeysArr([...regKeysArr, regInput.trim()]);
                              setRegInput('');
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Card B: Student Submission */}
              <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-stack-md h-full">
                <h3 className="font-headline-md text-headline-md text-warm-onyx mb-stack-sm border-b border-muted-taupe/10 pb-unit">Student Submission</h3>
                <div className="flex flex-col gap-stack-sm flex-grow">
                  <label className="font-label-md text-label-md text-muted-taupe uppercase" htmlFor="student-sub">Submission Text</label>
                  <textarea className="w-full box-border bg-vellum border border-muted-taupe/20 rounded-xl p-4 font-body-md text-body-md h-full min-h-[400px] focus:border-vermilion focus:ring-2 focus:ring-vermilion/30 focus:outline-none resize-none transition-all" id="student-sub" placeholder="Paste student text here..." value={studentText} onChange={e => setStudentText(e.target.value)}></textarea>
                <label className="font-label-md text-label-md text-muted-taupe uppercase mt-stack-md" htmlFor="submission-file">Or Upload File (.txt, .pdf, .docx)</label>
                <input 
                  type="file" 
                  id="submission-file"
                  accept=".txt,.pdf,.docx"
                  className="w-full bg-vellum border-2 border-dashed border-muted-taupe/40 rounded-xl p-4 font-body-md text-body-md text-muted-taupe file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-vermilion file:text-white hover:file:bg-vermilion/90 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-vermilion/30 focus:border-vermilion" 
                  onChange={e => setFile(e.target.files[0])} 
                />
                </div>
              </div>
            </div>
            <div className="mt-stack-lg w-full flex gap-4">
              <button className="flex-grow bg-vermilion text-white font-headline-md text-headline-md py-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.99] flex justify-center items-center gap-2" type="button" onClick={handleGrade}>
                Grade Submission
                <span className="material-symbols-outlined">analytics</span>
              </button>
              <button className="px-6 py-6 border border-muted-taupe/30 rounded-xl text-warm-onyx font-label-md hover:border-vermilion hover:text-vermilion transition-all active:scale-[0.98] flex items-center gap-2" type="button" onClick={handleClearAll}>
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Clear All
              </button>
            </div>
          </section>
        )}

        {/* STATE 3: Loading */}
        {view === 'loading' && (
          <section className="flex flex-col items-center justify-center w-full min-h-[409px] bg-fresh-paper border border-muted-taupe/20 rounded-sm shadow-sm">
            <div className="flex flex-col items-center gap-stack-md animate-pulse">
              <span className="material-symbols-outlined text-[64px] text-vermilion">settings_b_roll</span>
              <p className="font-headline-md text-headline-md text-warm-onyx text-center max-w-2xl">
                Applying deterministic grading rules and checking keywords...
              </p>
              <div className="w-64 h-1 bg-muted-taupe/20 mt-stack-sm overflow-hidden rounded-full">
                <div className="w-1/3 h-full bg-vermilion rounded-full"></div>
              </div>
            </div>
            <p className="mt-margin-page font-label-md text-label-md text-muted-taupe uppercase tracking-widest text-center">State 3: Loading Engine</p>
          </section>
        )}

        {/* STATE 4: Results */}
        {view === 'results' && result && (() => {
          const getFeedback = (score, manualReview) => {
            let feedbackKey = '';
            if (manualReview === true) {
                feedbackKey = 'review'; // Force the review text if the flag is true, regardless of score
            } else if (score === 100) {
                feedbackKey = 'perfect';
            } else if (score >= 75) {
                feedbackKey = 'high';
            } else if (score >= 40) {
                feedbackKey = 'solid';
            } else {
                feedbackKey = 'low'; // < 40% but NOT flagged for manual review
            }

            const texts = {
              perfect: {
                title: 'Academic Excellence Achieved', 
                desc: "Your work stands as a testament to absolute technical precision. You have not merely answered the question; you have mirrored the core academic framework with a level of fidelity that is rare. Every critical marker was placed with intentionality, demonstrating that you have transitioned from learning the material to mastering its very language. This submission represents the 'Gold Standard'—a seamless synchronization between your internal knowledge and the expected academic output. There is a profound clarity in your logic that suggests a deep, intuitive grasp of the subject's nuances. As you move forward, consider how this foundation can be applied to even more complex, interdisciplinary challenges. You have reached the summit of this particular assessment, leaving no room for ambiguity or doubt. Continue to uphold this standard of excellence in all your scholarly pursuits."
              },
              high: {
                title: 'Impressive Conceptual Clarity', 
                desc: "This is a sophisticated and highly proficient submission that narrowly misses the mark of absolute perfection only by the smallest of margins. You have successfully identified the primary pillars of the topic and articulated them with significant skill. Your use of technical terminology is strong, though there is a slight opportunity to tighten the alignment between your phrasing and the definitive answer key. You are clearly operating at an advanced level, demonstrating a conceptual grasp that far exceeds the baseline. To bridge the final gap to 100%, focus on the most minute technical markers—the 'connective tissue' of the argument. Your logic is sound, your evidence is present, and your communication is professional. You are well on your way to becoming a true authority in this specific domain of study. Maintain this momentum, as your foundational knowledge is remarkably secure."
              },
              solid: {
                title: 'Solid Foundation', 
                desc: "Your submission reveals a solid foundational understanding of the core concepts, though the transition from general knowledge to specific academic precision is still in progress. You have captured several of the essential markers, but the overall depth of the response suggests there are gaps in the technical framework that require your attention. To elevate this score, I recommend revisiting the 'Critical Keywords' and ensuring they are integrated more naturally into your explanations. Think of this result not as a finality, but as a roadmap for your next iteration of study. You have the 'big picture' down; now, you must focus on the fine details that distinguish an enthusiast from a specialist. Analyze the areas where the engine sought more evidence and use those as your primary study targets. With a more focused application of technical vocabulary, your proficiency will undoubtedly rise to the next level."
              },
              review: {
                title: 'A Deeper Review is Recommended', 
                desc: "The engine has highlighted this submission as requiring a deeper level of engagement with the source material. While there is a significant volume of text, the specific academic evidence and critical markers required for a passing grade were not sufficiently present in this draft. This often happens when a student understands the 'vibe' of a topic but has not yet locked in the formal terminology needed for professional-grade assessment. I encourage you to treat this as a diagnostic moment. Re-read the Ideal Response and compare it against your own to see where the conceptual disconnect occurred. Was it a lack of specific keywords, or a misunderstanding of the core logic? Use the 'Manual Review' flag as a supportive prompt to seek further clarification from your instructor. Success in this field is built on iterative learning, and this is simply the first step in refining your academic voice."
              },
              low: {
                title: 'A Deeper Review is Recommended',
                desc: "While you have submitted a response, it appears to miss the majority of the critical academic markers required for this topic. I recommend reviewing the source material closely and focusing on integrating the specific terminology requested in the prompt."
              }
            };
            return texts[feedbackKey];
          };
          const feedback = getFeedback(result.score, result.manualReview);
          return (
          <section className="flex flex-col items-center w-full max-w-4xl mx-auto">
            <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-margin-page shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full flex flex-col items-center gap-stack-lg">
              {/* Score Display */}
              <div className="text-center flex flex-col items-center gap-stack-sm">
                <span className="font-label-lg text-label-lg text-muted-taupe uppercase tracking-widest">Final Assessment</span>
                <h2 className="font-display-lg text-display-lg text-vermilion">{result.score}%</h2>
                <div className="flex items-center gap-2 text-sm font-label-md mt-2 bg-vellum border border-muted-taupe/20 px-4 py-1 rounded-full">
                  <span className="text-muted-taupe uppercase tracking-widest text-[10px]">Manual Review:</span>
                  <span className={result.manualReview ? 'text-vermilion font-bold text-xs' : 'text-muted-taupe text-xs'}> {result.manualReview ? 'Yes (Flagged)' : 'No'} </span>
                </div>
              </div>
              {/* Human Feedback Note */}
              <div className="w-full bg-vellum border-l-4 border-vermilion rounded-r-xl p-8 flex flex-col gap-4">
                <h3 className="font-headline-md text-headline-md text-vermilion">{feedback.title}</h3>
                <p className="font-body-md text-body-md text-warm-onyx leading-relaxed">{feedback.desc}</p>
              </div>

              {/* Manual Review Flag */}
              {result.manualReview && (
                <div className="w-full bg-[#F5D547]/20 border border-[#F5D547]/50 rounded-xl p-4 flex items-start gap-4">
                  <span className="material-symbols-outlined text-warm-onyx mt-1">warning</span>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-warm-onyx uppercase tracking-wide">Manual Review Recommended: Engine flagged conceptual disconnect.</span>
                  </div>
                </div>
              )}

              {/* Action */}
              <button className="mt-stack-md px-8 py-4 border border-muted-taupe/40 text-warm-onyx font-label-lg text-label-lg rounded-xl hover:bg-muted-taupe/5 transition-colors active:scale-[0.99] flex items-center gap-2" type="button" onClick={() => setView('dashboard')}>
                Grade Next Student
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </section>
          );
        })()}

        {/* STATE 5: Account Management */}
        {view === 'account' && (
          <section className="flex flex-col items-center w-full max-w-4xl mx-auto">
            <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full flex flex-col gap-8">
              <div className="flex justify-between items-center border-b border-muted-taupe/10 pb-4">
                <h2 className="font-headline-lg text-2xl text-warm-onyx">Account Settings</h2>
                <button className="text-sm font-label-md text-muted-taupe hover:text-vermilion transition-colors flex items-center gap-1 underline" onClick={() => setView('dashboard')}>
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Dashboard
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Section */}
                <div className="flex flex-col gap-6">
                  <h3 className="font-label-lg text-label-lg text-muted-taupe uppercase tracking-widest">Profile</h3>
                  <div className="flex flex-col gap-2">
                    <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md">Email</label>
                    <input className="w-full bg-white/50 border border-neutral/20 rounded-xl px-4 py-3 text-sm text-muted-taupe font-body-md" type="email" value={email} disabled />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md">Username</label>
                    <input className="w-full bg-vellum border border-muted-taupe/20 rounded-xl px-4 py-3 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Display Name" />
                  </div>
                </div>

                {/* Security Section */}
                <div className="flex flex-col gap-6">
                  <h3 className="font-label-lg text-label-lg text-muted-taupe uppercase tracking-widest">Security</h3>
                  <div className="flex flex-col gap-2">
                    <label className="uppercase text-[10px] tracking-widest text-neutral font-label-md">Current Password</label>
                    <div className="relative">
                      <input className="w-full bg-vellum border border-muted-taupe/20 rounded-xl px-4 py-3 pr-12 text-sm text-warm-onyx font-body-md focus:bg-white focus:ring-2 focus:ring-tertiary focus:outline-none transition-all" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Required to save changes" />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-taupe hover:text-vermilion transition-colors"><span className="material-symbols-outlined text-[20px]">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span></button>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setView('reset'); setAuthError(''); }} className="text-xs text-muted-taupe hover:text-vermilion transition-colors font-label-md flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">lock_reset</span>Change Password</button>
                </div>
              </div>

              <div className="flex flex-col items-end border-t border-muted-taupe/10 pt-6 mt-2">
                {authError && (
                  <p className={`mb-4 text-sm font-label-md ${authError.includes('successfully') ? 'text-[#285943]' : 'text-vermilion'}`}>
                    {authError}
                  </p>
                )}
                <button className="px-8 bg-vermilion text-white font-label-lg py-4 rounded-xl hover:bg-vermilion/90 transition-all hover:shadow-lg active:scale-[0.99]" type="button" onClick={handleUpdateAccount}>
                  Save Changes
                </button>
              </div>
            </div>
          </section>
        )}
        {/* STATE 6: Analytics */}
        {view === 'analytics' && (
          <section className="flex flex-col w-full">
            <nav className="bg-fresh-paper w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center mb-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4">
                <span className="font-headline-md text-headline-md text-vermilion">Gradelens</span>
                <div className="w-[1px] h-6 bg-muted-taupe/20"></div>
                <span className="font-label-lg text-label-lg text-warm-onyx uppercase tracking-widest">Analytics</span>
              </div>
              <button className="text-sm font-label-md text-muted-taupe hover:text-vermilion transition-colors flex items-center gap-1 underline" onClick={() => setView('dashboard')}>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Dashboard
              </button>
            </nav>

            {!analyticsData ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <span className="material-symbols-outlined text-[48px] text-vermilion">hourglass_top</span>
                  <p className="font-label-md text-muted-taupe uppercase tracking-widest">Loading Analytics...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[32px] text-vermilion">trending_up</span>
                    <span className="font-label-md text-label-md text-muted-taupe uppercase tracking-widest">Highest Score</span>
                    <span className="text-4xl font-headline-md text-warm-onyx">{analyticsData.stats.highestScore}%</span>
                  </div>
                  <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[32px] text-vermilion">trending_down</span>
                    <span className="font-label-md text-label-md text-muted-taupe uppercase tracking-widest">Lowest Score</span>
                    <span className="text-4xl font-headline-md text-warm-onyx">{analyticsData.stats.lowestScore}%</span>
                  </div>
                  <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[32px] text-vermilion">key_off</span>
                    <span className="font-label-md text-label-md text-muted-taupe uppercase tracking-widest">Most Missed Keyword</span>
                    <span className="text-2xl font-headline-md text-warm-onyx text-center">{analyticsData.stats.mostMissedKeyword}</span>
                  </div>
                </div>

                {/* Line Chart - Performance Trend */}
                <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  <h3 className="font-headline-md text-headline-md text-warm-onyx mb-4 border-b border-muted-taupe/10 pb-3">Performance Trend (Last 30 Days)</h3>
                  {analyticsData.performanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.performanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#87726F33" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#87726F' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#87726F' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFDF5', border: '1px solid #87726F33', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="avgScore" stroke="#DA4933" strokeWidth={3} dot={{ fill: '#DA4933', r: 5 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-taupe py-12 font-label-md">No grading data yet. Grade some submissions to see trends.</p>
                  )}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                  {/* Bar Chart - Grade Distribution */}
                  <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    <h3 className="font-headline-md text-headline-md text-warm-onyx mb-4 border-b border-muted-taupe/10 pb-3">Grade Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analyticsData.gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#87726F33" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#87726F' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#87726F' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFDF5', border: '1px solid #87726F33', borderRadius: '8px' }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {analyticsData.gradeDistribution.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart - Review Ratio */}
                  <div className="bg-fresh-paper border border-muted-taupe/20 rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    <h3 className="font-headline-md text-headline-md text-warm-onyx mb-4 border-b border-muted-taupe/10 pb-3">Review Ratio</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={analyticsData.reviewRatio} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {analyticsData.reviewRatio.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#FFFDF5', border: '1px solid #87726F33', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto py-8 flex justify-center items-center opacity-30">
        <p className="text-xs font-medium tracking-wide">@2026 Gradelens</p>
      </footer>
    </div>
  );
}