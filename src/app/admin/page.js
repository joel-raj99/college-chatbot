"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, crm, college, keywords, aiconfig
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Leads CRM Board search & filter
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadForView, setSelectedLeadForView] = useState(null);

  // Forms states
  const [collegeDetailsForm, setCollegeDetailsForm] = useState({
    name: '', tagline: '', description: '', location: '', email: '', phone: ''
  });
  const [newCourse, setNewCourse] = useState({ name: '', duration: '4 Years', fees: '', eligibility: '' });
  const [newFacility, setNewFacility] = useState({ name: '', description: '' });
  const [newDate, setNewDate] = useState({ event: '', date: '' });
  
  // Keywords states
  const [keywordSearch, setKeywordSearch] = useState('');
  const [keywordForm, setKeywordForm] = useState({ id: null, keyword: '', reply: '' });
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);

  // AI settings state
  const [aiSettingsForm, setAiSettingsForm] = useState({
    mode: 'ai', apiKey: '', provider: 'gemini', systemPrompt: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Status notification
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error("Failed to fetch data from database");
      const data = await res.json();
      setDb(data);
      setCollegeDetailsForm(data.collegeInfo);
      setAiSettingsForm(data.settings);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action, payload) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update database");
      
      setDb(resData.db);
      if (action === 'update_settings') setAiSettingsForm(resData.db.settings);
      if (action === 'update_college_info') setCollegeDetailsForm(resData.db.collegeInfo);
      
      showToast(`${action.replace('_', ' ').toUpperCase()} successful!`);
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Leads columns
  const PIPELINES = ["New", "Contacted", "Follow-up", "Interested", "Admitted", "Closed"];
  const getPipelineColor = (status) => {
    switch (status) {
      case 'New': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Contacted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Follow-up': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Interested': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'Admitted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Closed': return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
      default: return 'bg-slate-800/40 text-slate-400 border-slate-800/60';
    }
  };

  const getPipelineBorderLeft = (status) => {
    switch (status) {
      case 'New': return 'border-l-sky-500';
      case 'Contacted': return 'border-l-amber-500';
      case 'Follow-up': return 'border-l-indigo-500';
      case 'Interested': return 'border-l-fuchsia-500';
      case 'Admitted': return 'border-l-emerald-500';
      case 'Closed': return 'border-l-slate-600';
      default: return 'border-l-slate-700';
    }
  };

  // College Info Actions
  const handleSaveCollegeDetails = async (e) => {
    e.preventDefault();
    await handleAction('update_college_info', collegeDetailsForm);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.fees) {
      showToast("Course name and fees are required", "error");
      return;
    }
    const updatedCourses = [...db.collegeInfo.courses, { ...newCourse, id: `c-${Date.now()}` }];
    const success = await handleAction('update_college_info', { courses: updatedCourses });
    if (success) setNewCourse({ name: '', duration: '4 Years', fees: '', eligibility: '' });
  };

  const handleDeleteCourse = async (courseId) => {
    const updatedCourses = db.collegeInfo.courses.filter(c => c.id !== courseId);
    await handleAction('update_college_info', { courses: updatedCourses });
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.description) {
      showToast("Facility name and description are required", "error");
      return;
    }
    const updatedFacilities = [...db.collegeInfo.facilities, { ...newFacility }];
    const success = await handleAction('update_college_info', { facilities: updatedFacilities });
    if (success) setNewFacility({ name: '', description: '' });
  };

  const handleDeleteFacility = async (facilityName) => {
    const updatedFacilities = db.collegeInfo.facilities.filter(f => f.name !== facilityName);
    await handleAction('update_college_info', { facilities: updatedFacilities });
  };

  const handleAddDate = async (e) => {
    e.preventDefault();
    if (!newDate.event || !newDate.date) {
      showToast("Event name and date are required", "error");
      return;
    }
    const updatedDates = [...db.collegeInfo.dates, { ...newDate }];
    const success = await handleAction('update_college_info', { dates: updatedDates });
    if (success) setNewDate({ event: '', date: '' });
  };

  const handleDeleteDate = async (eventIndex) => {
    const updatedDates = db.collegeInfo.dates.filter((_, idx) => idx !== eventIndex);
    await handleAction('update_college_info', { dates: updatedDates });
  };

  // Keyword Actions
  const handleSaveKeyword = async (e) => {
    e.preventDefault();
    if (!keywordForm.keyword || !keywordForm.reply) {
      showToast("Keyword and reply are required", "error");
      return;
    }
    const success = await handleAction('save_keyword', keywordForm);
    if (success) {
      setKeywordForm({ id: null, keyword: '', reply: '' });
      setIsEditingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id) => {
    if (confirm("Are you sure you want to delete this keyword?")) {
      await handleAction('delete_keyword', { id });
    }
  };

  // AI settings
  const handleSaveAiSettings = async (e) => {
    e.preventDefault();
    await handleAction('update_settings', aiSettingsForm);
  };

  // Leads calculations for dashboard
  const getDashboardStats = () => {
    if (!db || !db.leads) return { total: 0, new: 0, admitted: 0, rate: 0 };
    const total = db.leads.length;
    const newLeads = db.leads.filter(l => l.status === 'New').length;
    const admittedLeads = db.leads.filter(l => l.status === 'Admitted').length;
    const interestedOrAdmitted = db.leads.filter(l => ['Interested', 'Admitted'].includes(l.status)).length;
    const rate = total > 0 ? Math.round((interestedOrAdmitted / total) * 100) : 0;
    return { total, new: newLeads, admitted: admittedLeads, rate };
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-lg font-medium text-slate-300">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button onClick={fetchData} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition">Retry Loading</button>
        </div>
      </div>
    );
  }

  const stats = getDashboardStats();
  const filteredLeads = db.leads.filter(lead => {
    const searchString = `${lead.name} ${lead.course} ${lead.email} ${lead.phone}`.toLowerCase();
    return searchString.includes(leadSearch.toLowerCase());
  });

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-2xl backdrop-blur-md transition duration-300 animate-fadeIn ${
          toast.type === 'error' 
            ? 'border-red-500/20 bg-red-950/80 text-red-200 shadow-red-500/5' 
            : 'border-emerald-500/20 bg-emerald-950/80 text-emerald-200 shadow-emerald-500/5'
        }`}>
          {toast.type === 'error' ? (
            <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">A</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white line-clamp-1">APEX ADMIN</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Admission CRM</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
              { id: 'crm', name: 'Leads CRM Pipeline', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
              { id: 'college', name: 'College Details', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'keywords', name: 'Keywords & FAQs', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
              { id: 'aiconfig', name: 'AI Settings', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedLeadForView(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-lg shadow-violet-500/15 border border-violet-500/20'
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="rounded-lg bg-slate-950/80 p-3 border border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Chatbot Mode</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`h-2 w-2 rounded-full ${db.settings.mode === 'ai' && db.settings.apiKey ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 shadow-sm shadow-amber-500/50'}`}></span>
              <p className="text-xs font-semibold text-slate-300">
                {db.settings.mode === 'ai' && db.settings.apiKey ? 'AI Agent Enabled' : 'Rule-Based Active'}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-center text-xs font-bold text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded-lg py-2.5 transition bg-violet-950/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Go to College Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'crm' && 'Leads CRM Pipeline'}
              {activeTab === 'college' && 'College Details Manager'}
              {activeTab === 'keywords' && 'Keywords & Fallback Replies'}
              {activeTab === 'aiconfig' && 'AI Settings & Integrations'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-300">Logged in as Admin</p>
              <p className="text-[10px] text-slate-500 font-bold">{db.collegeInfo.name}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-violet-400">
              AD
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Quick statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex items-center justify-between hover:border-violet-500/20 hover:bg-slate-900/30 transition-all duration-300 shadow-xs hover:shadow-violet-500/5 hover:-translate-y-0.5 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
                    <p className="text-3xl font-extrabold text-white mt-1.5">{stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex items-center justify-between hover:border-sky-500/20 hover:bg-slate-900/30 transition-all duration-300 shadow-xs hover:shadow-sky-500/5 hover:-translate-y-0.5 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Enquiries</p>
                    <p className="text-3xl font-extrabold text-white mt-1.5">{stats.new}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex items-center justify-between hover:border-emerald-500/20 hover:bg-slate-900/30 transition-all duration-300 shadow-xs hover:shadow-emerald-500/5 hover:-translate-y-0.5 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admitted Students</p>
                    <p className="text-3xl font-extrabold text-white mt-1.5">{stats.admitted}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex items-center justify-between hover:border-fuchsia-500/20 hover:bg-slate-900/30 transition-all duration-300 shadow-xs hover:shadow-fuchsia-500/5 hover:-translate-y-0.5 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interested/Admit Rate</p>
                    <p className="text-3xl font-extrabold text-white mt-1.5">{stats.rate}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* CRM Pipeline Conversion & Popular Courses */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 lg:col-span-2">
                  <h3 className="font-bold text-white text-base mb-4">Leads by Status Pipeline</h3>
                  <div className="space-y-4">
                    {PIPELINES.map(status => {
                      const count = db.leads.filter(l => l.status === status).length;
                      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-300">{status}</span>
                            <span className="text-slate-400">{count} lead{count !== 1 ? 's' : ''} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                status === 'New' ? 'bg-linear-to-r from-sky-500 to-sky-400' :
                                status === 'Contacted' ? 'bg-linear-to-r from-amber-500 to-amber-400' :
                                status === 'Follow-up' ? 'bg-linear-to-r from-indigo-500 to-indigo-400' :
                                status === 'Interested' ? 'bg-linear-to-r from-fuchsia-500 to-fuchsia-400' :
                                status === 'Admitted' ? 'bg-linear-to-r from-emerald-500 to-emerald-400' :
                                'bg-linear-to-r from-slate-500 to-slate-400'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
                  <h3 className="font-bold text-white text-base mb-4">Popular Courses Interested</h3>
                  <div className="space-y-4">
                    {db.collegeInfo.courses.map(course => {
                      const count = db.leads.filter(l => l.course === course.name).length;
                      const maxCount = Math.max(...db.collegeInfo.courses.map(c => db.leads.filter(l => l.course === c.name).length), 1);
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={course.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium truncate max-w-[200px]">{course.name}</span>
                            <span className="text-slate-400 font-bold shrink-0">{count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Recent leads table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-base">Recent Enquiries</h3>
                  <button onClick={() => setActiveTab('crm')} className="text-xs font-bold text-violet-400 hover:text-violet-300 transition">View CRM Pipeline →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email / Phone</th>
                        <th className="py-3 px-4">Interested Course</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {db.leads.slice(0, 5).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="py-3.5 px-4 font-semibold text-white">{lead.name}</td>
                          <td className="py-3.5 px-4">
                            <div>{lead.email}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{lead.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-200">{lead.course}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPipelineColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CRM LEADS PIPELINE TAB */}
          {activeTab === 'crm' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Search and view options */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/20 border border-slate-800 p-4 rounded-xl">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads by name, email, phone, or course..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                  />
                </div>
                <div className="text-xs text-slate-400 font-semibold shrink-0">
                  Showing {filteredLeads.length} of {db.leads.length} leads
                </div>
              </div>

              {/* Kanban Pipelines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {PIPELINES.map(status => {
                  const statusLeads = filteredLeads.filter(l => l.status === status);
                  return (
                    <div key={status} className="flex flex-col min-w-[220px] rounded-xl bg-slate-900/10 border border-slate-800/80 p-3 h-[600px]">
                      
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            status === 'New' ? 'bg-sky-500 shadow-xs shadow-sky-500/50' :
                            status === 'Contacted' ? 'bg-amber-500 shadow-xs shadow-amber-500/50' :
                            status === 'Follow-up' ? 'bg-indigo-500 shadow-xs shadow-indigo-500/50' :
                            status === 'Interested' ? 'bg-fuchsia-500 shadow-xs shadow-fuchsia-500/50' :
                            status === 'Admitted' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' :
                            'bg-slate-500'
                          }`}></span>
                          <h4 className="font-bold text-xs text-white uppercase tracking-wider">{status}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{statusLeads.length}</span>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {statusLeads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-24 border border-dashed border-slate-800/60 rounded-lg text-slate-600 text-[10px] font-semibold tracking-wide">
                            No Leads
                          </div>
                        ) : (
                          statusLeads.map(lead => (
                            <div 
                              key={lead.id} 
                              onClick={() => setSelectedLeadForView(lead)}
                              className={`group border border-slate-800 bg-slate-900/30 hover:bg-slate-900/80 p-3.5 rounded-xl cursor-pointer transition-all duration-200 border-l-2 ${getPipelineBorderLeft(lead.status)} hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 flex flex-col justify-between`}
                            >
                              <div>
                                <h5 className="font-semibold text-xs text-white group-hover:text-violet-400 transition truncate">{lead.name}</h5>
                                <p className="text-[10px] text-slate-400 mt-1 truncate">{lead.course}</p>
                                {lead.notes && (
                                  <p className="text-[9px] text-slate-500 italic mt-2 line-clamp-2 leading-relaxed">
                                    "{lead.notes}"
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-3.5 border-t border-slate-800/60 pt-2 text-[8px] text-slate-500 font-bold">
                                <span>{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                <span className="group-hover:text-slate-300 transition uppercase tracking-wider">Details →</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lead Details Modal / Slide-out */}
              {selectedLeadForView && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-fadeIn">
                  <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full p-8 overflow-y-auto flex flex-col justify-between shadow-2xl">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-white leading-tight">{selectedLeadForView.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPipelineColor(selectedLeadForView.status)}`}>
                              {selectedLeadForView.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Lead ID: {selectedLeadForView.id}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedLeadForView(null)} 
                          className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Content Form */}
                      <div className="space-y-6">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <a href={`mailto:${selectedLeadForView.email}`} className="text-sm font-medium text-violet-400 hover:underline block mt-1">{selectedLeadForView.email}</a>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <a href={`tel:${selectedLeadForView.phone}`} className="text-sm font-medium text-violet-400 hover:underline block mt-1">{selectedLeadForView.phone}</a>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interested Course</label>
                          <p className="text-sm font-medium text-slate-200 mt-1">{selectedLeadForView.course}</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Change Pipeline Status</label>
                          <div className="flex flex-wrap gap-2">
                            {PIPELINES.map(status => (
                              <button
                                key={status}
                                onClick={async () => {
                                  const updatedLead = { ...selectedLeadForView, status };
                                  setSelectedLeadForView(updatedLead);
                                  await handleAction('update_lead_status', { id: selectedLeadForView.id, status });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                  selectedLeadForView.status === status
                                    ? status === 'New' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-bold shadow-xs shadow-sky-500/10' :
                                      status === 'Contacted' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold shadow-xs shadow-amber-500/10' :
                                      status === 'Follow-up' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold shadow-xs shadow-indigo-500/10' :
                                      status === 'Interested' ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400 font-bold shadow-xs shadow-fuchsia-500/10' :
                                      status === 'Admitted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-xs shadow-emerald-500/10' :
                                      'bg-slate-800 border-slate-700 text-slate-200 font-bold'
                                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internal Follow-up Notes</label>
                          <textarea
                            value={selectedLeadForView.notes || ''}
                            onChange={async (e) => {
                              const updatedNotes = e.target.value;
                              const updatedLead = { ...selectedLeadForView, notes: updatedNotes };
                              setSelectedLeadForView(updatedLead);
                              await handleAction('update_lead_notes', { id: selectedLeadForView.id, notes: updatedNotes });
                            }}
                            placeholder="Add notes about student eligibility, documents submitted, callbacks scheduled, etc."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          />
                        </div>

                        {/* Conversational transcript */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Student Chatbot Transcript</label>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
                            {(!selectedLeadForView.chatHistory || selectedLeadForView.chatHistory.length === 0) ? (
                              <p className="text-xs text-slate-500 text-center py-4 italic">No conversation log available.</p>
                            ) : (
                              selectedLeadForView.chatHistory.map((chat, idx) => (
                                <div key={idx} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                    chat.sender === 'user'
                                      ? 'bg-violet-600/20 text-violet-200 border border-violet-500/10'
                                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                                  }`}>
                                    <p className="whitespace-pre-line">{chat.text}</p>
                                  </div>
                                  <span className="text-[8px] text-slate-500 font-semibold mt-1 px-1">
                                    {chat.sender === 'user' ? 'Student' : 'Bot'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6 mt-8 flex items-center justify-between">
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to permanently delete lead ${selectedLeadForView.name}?`)) {
                            const success = await handleAction('delete_lead', { id: selectedLeadForView.id });
                            if (success) setSelectedLeadForView(null);
                          }
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-400 transition"
                      >
                        Delete Lead Account
                      </button>
                      <button
                        onClick={() => setSelectedLeadForView(null)}
                        className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-white transition"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* COLLEGE INFORMATION TAB */}
          {activeTab === 'college' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* College Details Form */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
                <h3 className="font-bold text-white text-base mb-4">College Profile Details</h3>
                <form onSubmit={handleSaveCollegeDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">College Name</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.name}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tagline / Motto</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.tagline}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, tagline: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">General Description</label>
                    <textarea
                      value={collegeDetailsForm.description}
                      onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Campus Location</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.location}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={collegeDetailsForm.email}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.phone}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-lg transition">Save Profile Changes</button>
                  </div>
                </form>
              </div>

              {/* Courses offered */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Courses List */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-white text-base">Offered Programs / Courses</h3>
                  <div className="divide-y divide-slate-800 space-y-3">
                    {db.collegeInfo.courses.map(course => (
                      <div key={course.id} className="pt-3 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-sm text-white">{course.name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1 font-semibold">
                            <span>Duration: {course.duration}</span>
                            <span>Fees: {course.fees}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            <span className="font-bold text-slate-400 text-[10px] uppercase">Eligibility:</span> {course.eligibility}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-400 p-1 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Course Form */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 h-fit">
                  <h3 className="font-bold text-white text-base mb-4">Add New Course</h3>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course Name</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Computer Science"
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</label>
                        <select
                          value={newCourse.duration}
                          onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        >
                          <option>1 Year</option>
                          <option>2 Years</option>
                          <option>3 Years</option>
                          <option>4 Years</option>
                          <option>5 Years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fees ($ / year)</label>
                        <input
                          type="text"
                          placeholder="e.g. $12,000 / year"
                          value={newCourse.fees}
                          onChange={(e) => setNewCourse({ ...newCourse, fees: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Eligibility Criteria</label>
                      <textarea
                        placeholder="e.g. High school graduate with science background, minimum 70% GPA"
                        value={newCourse.eligibility}
                        onChange={(e) => setNewCourse({ ...newCourse, eligibility: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      />
                    </div>

                    <button type="submit" className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-lg transition">Create Course</button>
                  </form>
                </div>

              </div>

              {/* Campus Facilities & Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Facilities */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
                  <h3 className="font-bold text-white text-base">Campus Facilities</h3>
                  <div className="divide-y divide-slate-800 space-y-3">
                    {db.collegeInfo.facilities.map((fac, idx) => (
                      <div key={idx} className="pt-3 flex justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-xs text-white">{fac.name}</h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{fac.description}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteFacility(fac.name)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-400 shrink-0 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddFacility} className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                    <h4 className="font-bold text-xs text-white">Add Campus Facility</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Facility Name"
                        value={newFacility.name}
                        onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Short description"
                        value={newFacility.description}
                        onChange={(e) => setNewFacility({ ...newFacility, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition">Add Facility</button>
                  </form>
                </div>

                {/* Deadlines */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
                  <h3 className="font-bold text-white text-base">Key Dates & Deadlines</h3>
                  <div className="divide-y divide-slate-800 space-y-3">
                    {db.collegeInfo.dates.map((item, idx) => (
                      <div key={idx} className="pt-3 flex justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-xs text-white">{item.event}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteDate(idx)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-400 shrink-0 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddDate} className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                    <h4 className="font-bold text-xs text-white">Add Important Date</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Event (e.g. Merit Test)"
                        value={newDate.event}
                        onChange={(e) => setNewDate({ ...newDate, event: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Date (e.g. October 15, 2026)"
                        value={newDate.date}
                        onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition">Add Deadline</button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* KEYWORDS & RULES TAB */}
          {activeTab === 'keywords' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Keywords List */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base">Configured Keywords & Replies</h3>
                    <input
                      type="text"
                      placeholder="Filter keywords..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {db.keywords
                      .filter(kw => kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase()))
                      .map(kw => (
                        <div key={kw.id} className="border border-slate-800 bg-slate-900/10 p-4 rounded-lg flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="inline-block px-2.5 py-1 rounded bg-violet-600/10 text-violet-400 font-mono text-xs font-bold uppercase tracking-wider">
                              {kw.keyword}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setKeywordForm(kw);
                                  setIsEditingKeyword(true);
                                }}
                                className="text-xs font-bold text-violet-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteKeyword(kw.id)}
                                className="text-xs font-bold text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{kw.reply}</p>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Edit / Add Keyword Form */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 h-fit space-y-4">
                  <h3 className="font-bold text-white text-base">
                    {isEditingKeyword ? 'Edit Keyword Rule' : 'Create Keyword Rule'}
                  </h3>
                  <form onSubmit={handleSaveKeyword} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trigger Keyword</label>
                      <input
                        type="text"
                        placeholder="e.g. hostel"
                        value={keywordForm.keyword}
                        onChange={(e) => setKeywordForm({ ...keywordForm, keyword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono transition"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-1">If user query contains this word, bot replies with the text below.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bot Reply</label>
                      <textarea
                        placeholder="Enter the response for this keyword..."
                        value={keywordForm.reply}
                        onChange={(e) => setKeywordForm({ ...keywordForm, reply: e.target.value })}
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed transition"
                        required
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-lg transition">
                        {isEditingKeyword ? 'Update Rule' : 'Save Rule'}
                      </button>
                      {isEditingKeyword && (
                        <button
                          type="button"
                          onClick={() => {
                            setKeywordForm({ id: null, keyword: '', reply: '' });
                            setIsEditingKeyword(false);
                          }}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* AI SETTINGS & INTEGRATIONS TAB */}
          {activeTab === 'aiconfig' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
                <h3 className="font-bold text-white text-base mb-4">AI Agent Engine Configuration</h3>
                
                <form onSubmit={handleSaveAiSettings} className="space-y-6">
                  
                  {/* Mode Selector */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <label className="text-sm font-bold text-white">Chatbot Engine Mode</label>
                      <p className="text-xs text-slate-400 mt-0.5">Toggle between AI Agent and static rule-based system.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAiSettingsForm({ ...aiSettingsForm, mode: 'keyword' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          aiSettingsForm.mode === 'keyword'
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Rule-Based Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSettingsForm({ ...aiSettingsForm, mode: 'ai' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          aiSettingsForm.mode === 'ai'
                            ? 'bg-violet-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        AI Agent
                      </button>
                    </div>
                  </div>

                  {/* AI Provider */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Provider</label>
                    <select
                      value={aiSettingsForm.provider}
                      onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, provider: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="gemini">Google Gemini API (gemini-1.5-flash)</option>
                    </select>
                  </div>

                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[10px] font-bold text-violet-400 hover:underline"
                      >
                        {showApiKey ? 'Hide Key' : 'Reveal Key'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        placeholder="AIzaSy..."
                        value={aiSettingsForm.apiKey || ''}
                        onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, apiKey: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono tracking-wider transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">If the key is left empty, the bot will automatically fall back to Keyword/Rule-Based mode.</p>
                  </div>

                  {/* System Prompt / Persona */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Agent System Instruction Persona</label>
                    <textarea
                      value={aiSettingsForm.systemPrompt}
                      onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, systemPrompt: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed transition"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                      The core profile instructions given to the LLM. The AI Agent will read this prompt AND the college database before replying to students.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-lg transition">Save AI Configurations</button>
                  </div>

                </form>

              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
