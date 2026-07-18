"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState('form'); // 'form' or 'chat'
  
  // Lead Form
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', course: '' });
  const [currentLead, setCurrentLead] = useState(null);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPromptBadge, setShowPromptBadge] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchCollegeData();
    // Auto-hide the chat prompt badge after 8 seconds
    const timer = setTimeout(() => setShowPromptBadge(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen, isTyping]);

  const fetchCollegeData = async () => {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
        if (data.collegeInfo.courses.length > 0) {
          setLeadForm(prev => ({ ...prev, course: data.collegeInfo.courses[0].name }));
        }
      }
    } catch (err) {
      console.error("Error loading college info:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Lead Form and Start Chat
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email || !leadForm.phone || !leadForm.course) return;

    setIsTyping(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lead',
          payload: {
            name: leadForm.name,
            email: leadForm.email,
            phone: leadForm.phone,
            course: leadForm.course,
            status: 'New',
            notes: `Enquiry generated online. Interested in: ${leadForm.course}`,
            chatHistory: []
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        // The last added lead will have the newest timestamp, let's find it or get from database response
        const newLead = data.db.leads[data.db.leads.length - 1];
        setCurrentLead(newLead);
        
        // Initialize chat history with greeting
        const greeting = `Hi ${leadForm.name}! Welcome to the ${db?.collegeInfo?.name || 'Apex Institute'} admission helpline. I see you are interested in the **${leadForm.course}** program. 
        
How can I assist you with your admissions today? You can ask about fees, hostel facilities, scholarships, eligibility, or placement details!`;
        
        setMessages([{ sender: 'bot', text: greeting }]);
        setChatStep('chat');
        
        // Update greeting in the database for this lead
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_lead',
            payload: {
              ...newLead,
              chatHistory: [{ sender: 'bot', text: greeting }]
            }
          })
        });
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
    } finally {
      setIsTyping(false);
    }
  };

  // Send Chat message
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text || text.trim() === '' || !currentLead) return;

    if (!textToSend) setInputValue('');
    
    // Add user message to state
    const updatedMessages = [...messages, { sender: 'user', text }];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      // API call to Chat Bot Router
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          leadId: currentLead.id,
          history: messages
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: "I'm sorry, I encountered a temporary connection issue. Please feel free to email our admission office directly, or try asking me again." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Oops, something went wrong. Please check your network connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Suggestion click
  const handleSuggestionClick = (keyword) => {
    let question = "";
    switch (keyword) {
      case 'fees': question = `What are the fees for ${currentLead?.course || 'my course'}?`; break;
      case 'hostel': question = "What are the hostel options and hostel fees?"; break;
      case 'scholarship': question = "Do you offer scholarships or financial aid?"; break;
      case 'placements': question = "What is the placement record for the college?"; break;
      case 'admission': question = "What is the application deadline and admission process?"; break;
      default: question = `Tell me more about ${keyword}`;
    }
    handleSendMessage(question);
  };

  if (loading || !db) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Loading College Portal...</p>
        </div>
      </div>
    );
  }

  const { collegeInfo } = db;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col justify-between selection:bg-violet-600 selection:text-white">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 lg:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">A</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">{collegeInfo.name.toUpperCase()}</h1>
            <p className="text-[10px] text-violet-400 font-semibold tracking-wide uppercase">Admissions 2026-27</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
          <a href="#about" className="hover:text-white transition">About</a>
          <a href="#courses" className="hover:text-white transition">Programs</a>
          <a href="#facilities" className="hover:text-white transition">Facilities</a>
          <a href="#process" className="hover:text-white transition">Admissions</a>
        </nav>
        <div>
          <Link
            href="/admin"
            className="flex items-center gap-2 border border-violet-500/20 hover:border-violet-500/40 rounded-lg px-4 py-2 text-xs font-bold text-violet-400 hover:text-violet-300 transition bg-violet-950/20"
          >
            Admin Panel
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1">

        {/* Hero Section */}
        <section className="px-6 lg:px-16 py-20 lg:py-32 relative overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider">
              Accredited Grade A+ Premier Campus
            </span>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none">
              Your Gateway to Future-Ready <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-purple-400 to-indigo-400">Innovation & Excellence</span>
            </h2>
            <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
              {collegeInfo.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => { setIsChatOpen(true); setChatStep('form'); }}
                className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition transform active:scale-98"
              >
                Apply / Enquire Now
              </button>
              <a 
                href="#courses"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 transition"
              >
                Explore Courses
              </a>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-2xl font-bold text-white tracking-tight">Academic Excellence & Legacy</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                At {collegeInfo.name}, we believe in creating an environment that sparks curiosity and breeds problem-solvers. Located at {collegeInfo.location}, we bring industry and academia together to deliver a workspace that is intellectually enriching and physically inspiring.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border border-slate-800/80 bg-slate-900/10 p-5 rounded-xl">
                  <p className="text-2xl font-black text-violet-400">15+</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Years of Legacy</p>
                </div>
                <div className="border border-slate-800/80 bg-slate-900/10 p-5 rounded-xl">
                  <p className="text-2xl font-black text-violet-400">98%</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Placement Record</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-bold text-white text-base">Admission Office Contact</h4>
                <div className="space-y-3 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{collegeInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{collegeInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{collegeInfo.location}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-800/60 pt-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Have quick queries?</p>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="text-xs font-bold text-violet-400 hover:text-violet-300 mt-1 transition"
                >
                  Chat with Admission Assistant →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Programs / Courses Section */}
        <section id="courses" className="bg-slate-900/10 border-t border-slate-900 py-20 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-400 tracking-wider uppercase">Our Programs</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">Undergraduate & Postgraduate Offerings</h3>
              <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">Explore professional, accredited degrees designed to elevate your professional trajectory.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collegeInfo.courses.map(course => (
                <div key={course.id} className="rounded-xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between hover:border-violet-500/30 transition">
                  <div className="space-y-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-600/10 text-violet-400 border border-violet-500/10">{course.duration}</span>
                    <h4 className="font-bold text-base text-white">{course.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      <span className="font-bold text-slate-300">Eligibility:</span> {course.eligibility}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tution Fees</p>
                      <p className="text-sm font-bold text-white">{course.fees}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setLeadForm(prev => ({ ...prev, course: course.name }));
                        setIsChatOpen(true);
                        setChatStep('form');
                      }}
                      className="text-xs font-bold text-violet-400 hover:text-white hover:underline transition"
                    >
                      Enquire Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section id="facilities" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-400 tracking-wider uppercase">Vibrant Campus Life</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">World-Class Campus Facilities</h3>
              <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">Everything you need to thrive academically, physically, and socially.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collegeInfo.facilities.map((fac, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-900/10 p-6 flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-violet-600/10 text-violet-400 flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">{fac.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{fac.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Admission Process Section */}
        <section id="process" className="bg-slate-900/10 border-t border-slate-900 py-20 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-400 tracking-wider uppercase">Admissions Workflow</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">How To Secure Your Admission</h3>
              <p className="text-sm text-slate-400 max-w-xl mx-auto font-medium">Follow our quick, simple 4-step admission process to secure your seat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {collegeInfo.admissionProcess.map((step, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-3 relative">
                  <span className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-violet-600 text-white font-extrabold text-xs flex items-center justify-center shadow-lg shadow-violet-500/20">{idx + 1}</span>
                  <h4 className="font-bold text-sm text-white pt-2">Step {idx + 1}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {step.replace(/^Step \d+: /, '')}
                  </p>
                </div>
              ))}
            </div>

            {/* Timetable/Deadlines */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 md:p-8 max-w-2xl mx-auto">
              <h4 className="font-bold text-white text-base text-center mb-6">Key Application Dates (Cycle 2026)</h4>
              <div className="space-y-4">
                {collegeInfo.dates.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                    <span className="text-slate-300">{item.event}</span>
                    <span className="text-violet-400">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {collegeInfo.name}. All rights reserved.</p>
        <p className="mt-1 text-[10px]">Accredited Grade A+ Higher Institution | Built with Next.js & Gemini AI</p>
      </footer>

      {/* FLOATING CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50">
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative h-14 w-14 rounded-full bg-linear-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition cursor-pointer group"
          aria-label="Toggle admission chat bot"
        >
          {isChatOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}

          {/* Micro-animation hover notification badge */}
          {showPromptBadge && !isChatOpen && (
            <span className="absolute -left-44 top-2 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-bold rounded-lg px-3 py-2 shadow-2xl animate-bounce shrink-0 pointer-events-none tracking-tight">
              💬 Enquire Admissions Live!
            </span>
          )}
        </button>

        {/* Chat Drawer */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-[350px] sm:w-[380px] h-[520px] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-fadeIn select-text">
            
            {/* Chat Drawer Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">AI</div>
                <div>
                  <h4 className="font-bold text-xs text-white">Apex Admission Assistant</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Online counselor</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Chat Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50 flex flex-col">
              
              {/* STEP 1: PRE-CHAT LEAD FORM */}
              {chatStep === 'form' ? (
                <div className="flex-1 flex flex-col justify-center py-2 space-y-4">
                  <div className="text-center space-y-1">
                    <h5 className="font-bold text-sm text-white">Let's Get Started!</h5>
                    <p className="text-[10px] text-slate-400">Introduce yourself to start a live admission chat.</p>
                  </div>
                  
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email ID</label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+1 555-0199"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course of Interest</label>
                      <select
                        value={leadForm.course}
                        onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      >
                        {collegeInfo.courses.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-lg transition mt-4"
                    >
                      Connect & Chat Live
                    </button>
                  </form>
                  <p className="text-[8px] text-center text-slate-500">By starting, you agree to allow admissions representative to follow-up.</p>
                </div>
              ) : (
                /* STEP 2: LIVE CHAT WINDOW */
                <div className="flex-1 flex flex-col justify-between">
                  
                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-violet-600 text-white font-medium border border-violet-500/20 rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Bot Typing Indicator */}
                    {isTyping && (
                      <div className="flex items-center gap-1.5 pl-1 py-1">
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="border-t border-slate-800/80 pt-3 mt-2">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2">Quick Enquiry Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'fees', label: '💰 Course Fees' },
                        { id: 'hostel', label: '🏠 Hostels' },
                        { id: 'scholarship', label: '🎓 Scholarships' },
                        { id: 'placements', label: '💼 Placements' },
                        { id: 'admission', label: '📝 Apply Process' }
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => handleSuggestionClick(chip.id)}
                          className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-violet-500/40 text-[9px] font-semibold transition"
                          disabled={isTyping}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Chat Drawer Input Footer */}
            {chatStep === 'chat' && (
              <div className="bg-slate-950 border-t border-slate-800 p-3 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                  disabled={isTyping}
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shrink-0 transition"
                  disabled={isTyping}
                >
                  <svg className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
