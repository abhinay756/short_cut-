
import React, { useState, useMemo, useEffect } from 'react';
import { AppType, Category, Shortcut, UserShortcut, ShortcutSet, User } from './types';
import { INITIAL_SHORTCUTS, APP_CONFIG } from './constants';
import { ShortcutCard } from './components/ShortcutCard';
import { SetCard } from './components/SetCard';
import { KbdCombination } from './components/Kbd';
import { LoginPage } from './components/LoginPage';
import { searchShortcutWithAI } from './geminiService';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedApp, setSelectedApp] = useState<AppType | string>(AppType.BLENDER);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyMode, setDifficultyMode] = useState<'Beginner' | 'All'>('All');
  const [savedShortcuts, setSavedShortcuts] = useState<UserShortcut[]>([]);
  const [savedSets, setSavedSets] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'saved' | 'community' | 'sets'>('browse');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'single' | 'set'>('single');
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  
  const [cloudShortcuts, setCloudShortcuts] = useState<Shortcut[]>([]);
  const [cloudSets, setCloudSets] = useState<ShortcutSet[]>([]);

  const [formData, setFormData] = useState({
    app: AppType.BLENDER as string,
    title: '',
    action: '',
    keys: '',
    description: '',
    category: Category.GENERAL,
    difficulty: 'Beginner' as 'Beginner' | 'Advanced',
    setShortcuts: [{ action: '', keys: '' }] as { action: string; keys: string }[]
  });

  // Handle Initial Auth State and Listeners
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            isGuest: false,
            avatar: session.user.user_metadata?.avatar_url || '🚀'
          });
        } else {
          const savedGuest = localStorage.getItem('kp_guest_user');
          if (savedGuest) setUser(JSON.parse(savedGuest));
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          email: session.user.email,
          isGuest: false,
          avatar: session.user.user_metadata?.avatar_url || '🚀'
        });
        localStorage.removeItem('kp_guest_user');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCloudShortcuts([]);
        setCloudSets([]);
        setSavedShortcuts([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Data with Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (isInitializing) return;
      setIsSyncing(true);
      try {
        // 1. Fetch Shortcuts (Community + My Private)
        const { data: shortcuts, error: sError } = await supabase
          .from('shortcuts')
          .select('*')
          .or(`is_community.eq.true${user && !user.isGuest ? `,author_id.eq.${user.id}` : ''}`);
        
        if (sError && sError.code !== 'PGRST116') console.warn("Shortcuts table might not exist yet:", sError.message);
        if (shortcuts) {
          setCloudShortcuts(shortcuts.map(s => ({
            id: s.id,
            app: s.app,
            action: s.action,
            keys: s.keys,
            description: s.description,
            category: s.category,
            difficulty: s.difficulty,
            author: s.author_name || 'Anonymous',
            isCommunity: s.is_community
          })));
        }

        // 2. Fetch Sets
        const { data: sets, error: setErr } = await supabase
          .from('sets')
          .select('*, shortcuts(*)')
          .or(`is_community.eq.true${user && !user.isGuest ? `,author_id.eq.${user.id}` : ''}`);
        
        if (setErr) console.warn("Sets table might not exist yet:", setErr.message);
        if (sets) {
          setCloudSets(sets.map(set => ({
            id: set.id,
            name: set.name,
            app: set.app,
            description: set.description,
            author: set.author_name || 'Anonymous',
            isCommunity: set.is_community,
            savedCount: set.saved_count || 0,
            shortcuts: (set.shortcuts || []).map((s: any) => ({
              id: s.id,
              app: s.app,
              action: s.action,
              keys: s.keys,
              description: s.description,
              category: s.category,
              difficulty: s.difficulty,
              author: s.author_name || 'Anonymous',
              isCommunity: s.is_community
            }))
          })));
        }

        // 3. Fetch My Saved References
        if (user && !user.isGuest) {
          const { data: saved, error: svError } = await supabase
            .from('user_shortcuts')
            .select('shortcut_id, created_at')
            .eq('user_id', user.id);
          
          if (svError) console.warn("user_shortcuts table might not exist yet:", svError.message);
          if (saved) {
            setSavedShortcuts(saved.map(s => ({ 
              shortcutId: s.shortcut_id, 
              savedAt: new Date(s.created_at).getTime() 
            })));
          }
        }
      } catch (err) {
        console.error("Cloud data sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchData();
  }, [user, isInitializing]);

  // Persistent Guest Data fallback
  useEffect(() => {
    if (user?.isGuest) {
      localStorage.setItem('kp_guest_user', JSON.stringify(user));
    }
  }, [user]);

  // AI state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const allShortcuts = useMemo(() => {
    return [...INITIAL_SHORTCUTS, ...cloudShortcuts];
  }, [cloudShortcuts]);

  const filteredShortcuts = useMemo(() => {
    let list = allShortcuts;
    
    if (activeTab === 'community') {
      list = list.filter(s => s.isCommunity);
    } else if (activeTab === 'saved') {
      const savedIds = savedShortcuts.map(s => s.shortcutId);
      list = list.filter(s => savedIds.includes(s.id));
    } else if (activeTab === 'browse') {
      list = list.filter(s => s.app === selectedApp);
    }

    if (difficultyMode === 'Beginner') {
      list = list.filter(s => s.difficulty === 'Beginner');
    }

    if (searchQuery.trim() && !aiResult) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.action.toLowerCase().includes(q) || 
        s.description.toLowerCase().includes(q) ||
        (s.keys && s.keys.some(k => k.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [allShortcuts, selectedApp, difficultyMode, searchQuery, aiResult, activeTab, savedShortcuts]);

  const handleToggleSave = async (id: string) => {
    if (!user) return;
    
    const exists = savedShortcuts.find(s => s.shortcutId === id);
    if (exists) {
      setSavedShortcuts(prev => prev.filter(s => s.shortcutId !== id));
      if (!user.isGuest) {
        await supabase.from('user_shortcuts').delete().eq('user_id', user.id).eq('shortcut_id', id);
      }
    } else {
      const newSaved = { shortcutId: id, savedAt: Date.now() };
      setSavedShortcuts(prev => [...prev, newSaved]);
      if (!user.isGuest) {
        await supabase.from('user_shortcuts').insert({ user_id: user.id, shortcut_id: id });
      }
    }
  };

  const handleSaveSet = async (set: ShortcutSet) => {
    setSavedSets(prev => prev.includes(set.id) ? prev.filter(id => id !== set.id) : [...prev, set.id]);
    for (const s of set.shortcuts) {
      if (!savedShortcuts.find(us => us.shortcutId === s.id)) {
        await handleToggleSave(s.id);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.isGuest && !confirm("Guest data won't persist after logout. Sign in to sync with the cloud!")) return;
    
    setIsSyncing(true);
    const authorName = user?.name || 'GuestUser';
    
    try {
      if (createType === 'single') {
        const payload = {
          app: formData.app,
          action: formData.action,
          keys: formData.keys.split('+').map(k => k.trim()),
          description: formData.description,
          category: formData.category,
          difficulty: formData.difficulty,
          author_id: user?.id,
          author_name: authorName,
          is_community: true
        };

        const { data, error } = await supabase.from('shortcuts').insert(payload).select().single();
        if (error) throw error;
        
        if (data) {
          setCloudShortcuts(prev => [{
            id: data.id,
            app: data.app,
            action: data.action,
            keys: data.keys,
            description: data.description,
            category: data.category,
            difficulty: data.difficulty,
            author: data.author_name,
            isCommunity: data.is_community
          }, ...prev]);
        }
      } else {
        const { data: setRes, error: setError } = await supabase.from('sets').insert({
          name: formData.title,
          app: formData.app,
          description: formData.description,
          author_id: user?.id,
          author_name: authorName,
          is_community: true
        }).select().single();

        if (setError) throw setError;

        if (setRes) {
          const setShortcuts = formData.setShortcuts
            .filter(s => s.action.trim() && s.keys.trim())
            .map(s => ({
              app: formData.app,
              action: s.action,
              keys: s.keys.split('+').map(k => k.trim()),
              description: `Part of ${formData.title}`,
              category: Category.GENERAL,
              difficulty: 'Beginner',
              author_id: user?.id,
              author_name: authorName,
              set_id: setRes.id,
              is_community: true
            }));

          const { data: scRes, error: scError } = await supabase.from('shortcuts').insert(setShortcuts).select();
          if (scError) throw scError;

          if (scRes) {
            setCloudSets(prev => [{
              id: setRes.id,
              name: setRes.name,
              app: setRes.app,
              description: setRes.description,
              author: setRes.author_name,
              isCommunity: setRes.is_community,
              savedCount: 0,
              shortcuts: scRes.map(s => ({
                id: s.id,
                app: s.app,
                action: s.action,
                keys: s.keys,
                description: s.description,
                category: s.category,
                difficulty: s.difficulty,
                author: s.author_name,
                isCommunity: s.is_community
              }))
            }, ...prev]);
          }
        }
      }
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      console.error("Submission error:", err);
      alert(`Cloud sync failed: ${err.message || 'Make sure you have created the tables in Supabase.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      app: AppType.BLENDER,
      title: '',
      action: '',
      keys: '',
      description: '',
      category: Category.GENERAL,
      difficulty: 'Beginner',
      setShortcuts: [{ action: '', keys: '' }]
    });
    setCreateStep(1);
  };

  const addSetShortcutField = () => {
    setFormData({
      ...formData,
      setShortcuts: [...formData.setShortcuts, { action: '', keys: '' }]
    });
  };

  const removeSetShortcutField = (index: number) => {
    if (formData.setShortcuts.length <= 1) return;
    const newList = [...formData.setShortcuts];
    newList.splice(index, 1);
    setFormData({ ...formData, setShortcuts: newList });
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiLoading(true);
    setAiResult(null);
    const result = await searchShortcutWithAI(searchQuery, selectedApp as AppType, allShortcuts);
    setAiResult(result);
    setIsAiLoading(false);
  };

  const handleLogout = async () => {
    if (user?.isGuest) {
      localStorage.removeItem('kp_guest_user');
      setUser(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Cloud Handshake...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">KP</div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">KeyPilot</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <button 
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-200 transition-all mb-4 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
              Share Guide
            </button>

            <nav className="space-y-1">
              <button onClick={() => setActiveTab('browse')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'browse' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                Library
              </button>
              <button onClick={() => setActiveTab('sets')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'sets' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Collections
              </button>
              <button onClick={() => setActiveTab('community')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'community' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Feed
              </button>
              <button onClick={() => setActiveTab('saved')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'saved' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Saved
              </button>
            </nav>

            <div className="space-y-1">
              <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Filter by App</h3>
              {Object.entries(AppType).map(([key, app]) => (
                <button
                  key={app}
                  onClick={() => { setSelectedApp(app); setActiveTab('browse'); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedApp === app && activeTab === 'browse' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{APP_CONFIG[app]?.icon || '✨'}</span>
                    <span className="truncate">{app}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm shadow-inner">
                {user.avatar || '👤'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-tight">{user.isGuest ? 'Cloud Connected' : user.email}</p>
              </div>
              <button onClick={handleLogout} title="Sign Out" className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-3">
              {activeTab === 'browse' ? (
                <>
                  <div className={`w-10 h-10 ${APP_CONFIG[selectedApp]?.color || 'bg-indigo-600'} rounded-xl flex items-center justify-center text-xl text-white shadow-lg shadow-slate-200`}>
                    {APP_CONFIG[selectedApp]?.icon || '✨'}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">{selectedApp}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{APP_CONFIG[selectedApp]?.description}</p>
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">{activeTab}</h2>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${isSyncing ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-[9px] font-black uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Synced'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
              <button onClick={() => setDifficultyMode('Beginner')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${difficultyMode === 'Beginner' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Beginner</button>
              <button onClick={() => setDifficultyMode('All')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${difficultyMode === 'All' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Pro</button>
            </div>
          </div>
        </header>

        {/* Search View */}
        <div className="bg-white px-6 py-4 border-b border-slate-100">
          <div className="relative group max-w-3xl">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'browse' ? selectedApp : activeTab}...`}
              className="w-full pl-12 pr-24 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-sm font-semibold text-slate-900 placeholder-slate-400 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
              <button
                onClick={handleAiSearch}
                disabled={isAiLoading || !searchQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isAiLoading ? '⌛' : 'Ask AI'}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
          {aiResult && (
            <div className="mb-10 p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
               <div className="flex items-center justify-between mb-5">
                 <div className="flex items-center gap-3">
                   <span className="bg-white/10 p-2 rounded-xl text-lg border border-white/5">🤖</span>
                   <div>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Recommendation</span>
                     <h4 className="text-xl font-black">Best Match</h4>
                   </div>
                 </div>
                 <button onClick={() => setAiResult(null)} className="text-white/40 hover:text-white transition-colors">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
               <div className="grid md:grid-cols-2 gap-6 bg-white/5 rounded-2xl p-6 border border-white/10">
                 <div>
                    <h5 className="text-2xl font-black mb-4 leading-tight">{aiResult.action}</h5>
                    <KbdCombination keys={aiResult.keys} />
                 </div>
                 <div className="flex items-center">
                    <p className="text-indigo-50 font-medium italic border-l-2 border-indigo-400/30 pl-4 py-1 leading-relaxed">
                      "{aiResult.explanation}"
                    </p>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'sets' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cloudSets.map(set => (
                <SetCard 
                  key={set.id} 
                  set={set} 
                  onView={(s) => { 
                    setAiResult(null); 
                    setSearchQuery(''); 
                    setSelectedApp(s.app); 
                    setActiveTab('browse'); 
                  }}
                  onSave={handleSaveSet}
                  isSaved={savedSets.includes(set.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShortcuts.map(shortcut => (
                <ShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  isSaved={!!savedShortcuts.find(s => s.shortcutId === shortcut.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          )}

          {((activeTab === 'sets' && cloudSets.length === 0) || filteredShortcuts.length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm">
                🛰️
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                {isSyncing ? 'Connecting to Cloud...' : 'Nothing found here'}
              </h4>
              <p className="text-sm font-medium text-slate-400 max-w-xs">
                {isSyncing ? 'Fetching the latest from the global database.' : 'Try adjusting your filters or search via AI.'}
              </p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Sync to Global Feed</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contribute to the cloud library</p>
                   </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-2xl transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {createType === 'set' && (
                <div className="px-8 pt-6 flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${createStep >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
                    <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${createStep >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
                  </div>
                </div>
              )}

              <div className="p-2 bg-slate-100 flex mx-8 my-4 rounded-2xl flex-shrink-0">
                 <button onClick={() => { setCreateType('single'); setCreateStep(1); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${createType === 'single' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>Shortcut</button>
                 <button onClick={() => setCreateType('set')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${createType === 'set' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>Full Set</button>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex-1 p-8 pt-0 space-y-8 overflow-y-auto custom-scrollbar">
                {createStep === 1 && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Application</label>
                      <select 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        value={formData.app}
                        onChange={e => setFormData({...formData, app: e.target.value})}
                      >
                        {Object.values(AppType).map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    {createType === 'single' ? (
                      <>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Action Name</label>
                          <input required placeholder="Save Project" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={formData.action} onChange={e => setFormData({...formData, action: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Combination (Ctrl+S)</label>
                          <input required placeholder="Ctrl+Shift+P" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black font-mono outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={formData.keys} onChange={e => setFormData({...formData, keys: e.target.value})} />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Collection Title</label>
                        <input required placeholder="Master Editing in Photoshop" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                          value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Context / Tip</label>
                      <textarea rows={3} placeholder="Provide brief usage context..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="col-span-2 pt-4">
                      {createType === 'set' ? (
                        <button type="button" onClick={() => setCreateStep(2)} disabled={!formData.title} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50">Next Step</button>
                      ) : (
                        <button type="submit" disabled={isSyncing} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                          {isSyncing ? 'Syncing...' : 'Upload to Cloud'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {createType === 'set' && createStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                         <label className="block text-xs font-black text-slate-800 uppercase tracking-widest">Entry List</label>
                         <span className="text-[10px] font-bold text-slate-400">{formData.setShortcuts.length} entries</span>
                      </div>
                      
                      <div className="space-y-4">
                         {formData.setShortcuts.map((sc, i) => (
                           <div key={i} className="flex gap-4 group items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                             <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                   <input placeholder="Action" className="flex-1 px-4 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all" value={sc.action} 
                                    onChange={e => {
                                      const newList = [...formData.setShortcuts];
                                      newList[i].action = e.target.value;
                                      setFormData({...formData, setShortcuts: newList});
                                    }} />
                                   <input placeholder="Keys" className="w-36 px-4 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-mono font-black outline-none focus:border-indigo-400 transition-all" value={sc.keys}
                                    onChange={e => {
                                      const newList = [...formData.setShortcuts];
                                      newList[i].keys = e.target.value;
                                      setFormData({...formData, setShortcuts: newList});
                                    }} />
                                </div>
                             </div>
                             <button type="button" onClick={() => removeSetShortcutField(i)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                           </div>
                         ))}
                         
                         <button type="button" onClick={addSetShortcutField} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-black uppercase text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all group flex items-center justify-center gap-2">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                           Add Another
                         </button>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setCreateStep(1)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black hover:bg-slate-200 transition-all">Back</button>
                      <button type="submit" disabled={isSyncing} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                        {isSyncing ? 'Syncing Collection...' : 'Publish Guide'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        <footer className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between text-slate-400 flex-shrink-0">
           <p className="text-[9px] font-black uppercase tracking-[0.3em]">KeyPilot Cloud v2.5</p>
           <p className="text-[10px] font-black text-indigo-500/70 tracking-tighter uppercase">
             {user.isGuest ? 'Cloud Connected (Guest)' : 'Cloud Synchronized'}
           </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
