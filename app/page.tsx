'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'teacher' | 'principal'>('teacher');

  // Application state
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [remarks, setRemarks] = useState('');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchStudents();
    }
  }, [session]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchEvaluations(selectedStudentId);
      setAiSummary('');
    }
  }, [selectedStudentId]);

 async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (data && data.role) {
      setUserProfile(data);
    } else {
      // Fallback to user metadata stored during signup
      const { data: { user } } = await supabase.auth.getUser();
      const fallbackRole = user?.user_metadata?.role || 'teacher';
      const fallbackName = user?.user_metadata?.full_name || user?.email || 'User';

      const profileData = { id: userId, full_name: fallbackName, role: fallbackRole };
      setUserProfile(profileData);

      // Save missing profile to database
      await supabase.from('profiles').upsert([profileData]);
    }
    setLoading(false);
  }

  async function fetchStudents() {
    const { data } = await supabase.from('students').select('*');
    if (data) setStudents(data);
  }

  async function fetchEvaluations(studentId: string) {
    const { data } = await supabase.from('evaluations').select('*').eq('student_id', studentId);
    if (data) setEvaluations(data);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } }
      });
      if (error) alert(error.message);
      else alert('Account created! You are now logged in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    const [firstName, ...lastName] = studentName.split(' ');
    const { data, error } = await supabase.from('students').insert([{
      student_number: studentNum,
      first_name: firstName || 'Student',
      last_name: lastName.join(' ') || 'User',
      grade_level: 'Grade 10'
    }]).select();

    if (error) alert(error.message);
    else if (data) {
      setStudents([...students, data[0]]);
      setSelectedStudentId(data[0].id);
      setStudentName('');
      setStudentNum('');
    }
  }

  async function handleAddEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId) return alert('Select or create a student first!');

    const { error } = await supabase.from('evaluations').insert([{
      student_id: selectedStudentId,
      teacher_id: userProfile?.id,
      subject,
      numeric_grade: parseFloat(grade),
      remarks,
      academic_term: 'Q1 2026'
    }]);

    if (error) alert(error.message);
    else {
      setSubject('');
      setGrade('');
      setRemarks('');
      fetchEvaluations(selectedStudentId);
    }
  }

  async function generateAiSummary() {
    if (evaluations.length === 0) return alert('No evaluations found for this student.');
    setLoadingSummary(true);

    const currentStudent = students.find((s) => s.id === selectedStudentId);
    const fullName = `${currentStudent?.first_name} ${currentStudent?.last_name}`;

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: fullName, evaluations })
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Error generating summary.');
    } catch {
      setAiSummary('Failed to contact AI service.');
    } finally {
      setLoadingSummary(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-600">Loading Portal...</div>;

  // LOGIN / SIGNUP SCREEN
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 max-w-md w-full space-y-6">
          <h1 className="text-2xl font-bold text-center text-slate-800">Student Evaluation Portal</h1>
          
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 pb-2 text-center font-medium ${authMode === 'login' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 pb-2 text-center font-medium ${authMode === 'signup' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">REGISTER AS</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
              </>
            )}

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-md"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-md"
            />

            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700">
              {authMode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // MAIN ROLE-BASED PORTAL
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* User Info Header */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-slate-900">{userProfile?.full_name}</h1>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-800 rounded-full">
              Role: {userProfile?.role}
            </span>
          </div>
          <button onClick={handleSignOut} className="text-sm font-medium text-slate-600 hover:text-red-600">
            Sign Out
          </button>
        </div>

        {/* Student Selector */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex gap-4 items-center">
          <label className="font-semibold text-slate-700">Active Student:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1 p-2 border border-slate-300 rounded-md bg-white"
          >
            <option value="">-- Select a Student --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name} ({s.student_number})
              </option>
            ))}
          </select>
        </div>

        {/* TEACHER-ONLY VIEW */}
        {userProfile?.role === 'teacher' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleAddStudent} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">1. Register New Student</h2>
              <input
                type="text"
                placeholder="Full Name (e.g., Jane Doe)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Student ID (e.g., STU-001)"
                value={studentNum}
                onChange={(e) => setStudentNum(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
              <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-md font-medium hover:bg-slate-900">
                Add Student
              </button>
            </form>

            <form onSubmit={handleAddEvaluation} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">2. Input Subject Remarks</h2>
              <input
                type="text"
                placeholder="Subject (e.g., Mathematics)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Grade (e.g., 88)"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              />
              <textarea
                placeholder="Teacher Remarks & Behavioral Notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
                rows={3}
                className="w-full p-2 border rounded-md"
              />
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700">
                Save Grade & Remarks
              </button>
            </form>
          </div>
        )}

        {/* PRINCIPAL-ONLY VIEW */}
        {userProfile?.role === 'principal' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900">Logged Teacher Evaluations</h2>
                <button
                  onClick={generateAiSummary}
                  disabled={loadingSummary || !selectedStudentId}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loadingSummary ? 'Generating AI Summary...' : 'Generate AI Summary'}
                </button>
              </div>

              {evaluations.length === 0 ? (
                <p className="text-slate-500 text-sm">No teacher records found for this student yet.</p>
              ) : (
                <div className="space-y-3">
                  {evaluations.map((ev) => (
                    <div key={ev.id} className="p-3 bg-slate-50 border rounded-md">
                      <div className="flex justify-between font-semibold">
                        <span>{ev.subject}</span>
                        <span className="text-indigo-600">{ev.numeric_grade}%</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{ev.remarks}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {aiSummary && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200 shadow-sm">
                <h3 className="font-bold text-indigo-900 text-lg mb-2">🤖 Executive AI Summary</h3>
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed text-sm">
                  {aiSummary}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}