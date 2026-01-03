
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit, 
  GraduationCap,
  ArrowLeft,
  PieChart as PieChartIcon,
  Loader2,
  FileCheck,
  BookOpen,
  MessageCircle,
  X,
  Send,
  User,
  Bot
} from 'lucide-react';
import { AppState, BookAnalysis, QuestionType, DOKLevel, ProcessingProgress, Question, ChatMessage } from './types';
import { analyzePage, synthesizeAnalysis, createStudyChat } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

// Component: Question Card
const QuestionCard: React.FC<{ question: Question; index: number }> = ({ question, index }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  const getDOKColor = (level: DOKLevel) => {
    switch (level) {
      case DOKLevel.LEVEL_1: return 'bg-blue-100 text-blue-700 border-blue-200';
      case DOKLevel.LEVEL_2: return 'bg-green-100 text-green-700 border-green-200';
      case DOKLevel.LEVEL_3: return 'bg-orange-100 text-orange-700 border-orange-200';
      case DOKLevel.LEVEL_4: return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md mb-4">
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {index + 1}</span>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDOKColor(question.dokLevel)}`}>
            {question.dokLevel.split(':')[0]}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {question.type}
          </span>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{question.question}</h3>
      
      {question.type === QuestionType.OBJECTIVE && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {question.options.map((option: string, i: number) => (
            <div key={i} className="flex items-center p-3 rounded-lg border border-slate-100 bg-slate-50 text-slate-700 text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold mr-3">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setShowAnswer(!showAnswer)}
        className="w-full py-2 px-4 rounded-lg bg-indigo-50 text-indigo-600 font-medium text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
      >
        {showAnswer ? 'Hide Answer & Explanation' : 'Reveal Answer & Explanation'}
      </button>

      {showAnswer && (
        <div className="mt-4 p-4 rounded-lg bg-indigo-600/5 border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="mb-2">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-tighter">Correct Answer:</span>
            <p className="text-slate-800 font-semibold">{question.correctAnswer}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-tighter">Explanation:</span>
            <p className="text-slate-600 text-sm leading-relaxed">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Component: Loading State with Page Tracker
const AnalysisLoader: React.FC<{ progress: ProcessingProgress }> = ({ progress }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto">
    <div className="relative mb-10">
      <div className="w-32 h-32 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <BrainCircuit className="w-12 h-12 text-indigo-600" />
      </div>
      <div className="absolute -bottom-2 -right-2 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
        <span className="text-sm font-bold text-indigo-600">
          {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
        </span>
      </div>
    </div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">Processing Your Book</h2>
    <p className="text-slate-500 mb-8">{progress.status}</p>

    <div className="w-full space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
      {progress.completedPages.map((page, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-100 animate-in slide-in-from-left-2">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">{page}</span>
          </div>
          <span className="text-xs font-bold text-emerald-600 uppercase">Analyzed</span>
        </div>
      ))}
      {progress.current < progress.total && progress.total > 0 && (
        <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 border-dashed animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-sm font-medium text-slate-500">Processing next segment...</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Component: ChatBot
const ChatBot: React.FC<{ analysis?: BookAnalysis | null }> = ({ analysis }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatInstance = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !chatInstance.current) {
      chatInstance.current = createStudyChat(analysis?.summary);
      setMessages([{ role: 'model', text: `Hi! I'm your DOK Study Assistant. ${analysis ? `I've reviewed "${analysis.title}". ` : ''}How can I help you with your studies today?` }]);
    }
  }, [isOpen, analysis]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const result = await chatInstance.current.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "I'm sorry, I couldn't generate a response." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Study Assistant</h4>
                <p className="text-[10px] text-indigo-100">Powered by Gemini Pro</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-200 rounded-tl-none'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-60">
                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                  </div>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 rounded-tl-none flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all active:scale-95 ${
          isOpen ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

// Helper for PDF page extraction
const extractPagesFromPDF = async (file: File): Promise<{ content: string; name: string; isImage: boolean }[]> => {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore - pdfjsLib is loaded from CDN
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: { content: string; name: string; isImage: boolean }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      pages.push({
        content: base64,
        name: `${file.name} (Page ${i})`,
        isImage: true
      });
    }
  }
  return pages;
};

export default function App() {
  const [state, setState] = useState<AppState>('IDLE');
  const [analysis, setAnalysis] = useState<BookAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    total: 0,
    current: 0,
    status: 'Initializing...',
    completedPages: []
  });

  const processFiles = async (files: File[]) => {
    setState('LOADING');
    setError(null);
    setProgress({ total: 0, current: 0, status: 'Preparing documents...', completedPages: [] });

    let accumulatedQuestions: Question[] = [];
    let accumulatedTopics: string[] = [];
    const allProcessingUnits: { content: string; name: string; isImage: boolean }[] = [];

    try {
      // Step 1: Pre-process files (unfold PDFs)
      setProgress(prev => ({ ...prev, status: 'Scanning and unfolding documents...' }));
      for (const file of files) {
        if (file.type === 'application/pdf') {
          setProgress(prev => ({ ...prev, status: `Extracting pages from ${file.name}...` }));
          const pdfPages = await extractPagesFromPDF(file);
          allProcessingUnits.push(...pdfPages);
        } else {
          const isImage = file.type.startsWith('image/');
          const content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const res = e.target?.result?.toString() || '';
              resolve(isImage ? res.split(',')[1] : res);
            };
            if (isImage) reader.readAsDataURL(file);
            else reader.readAsText(file);
          });
          allProcessingUnits.push({ content, name: file.name, isImage });
        }
      }

      // Update total units for progress bar
      setProgress(prev => ({ ...prev, total: allProcessingUnits.length }));

      // Step 2: Individual unit analysis
      for (let i = 0; i < allProcessingUnits.length; i++) {
        const unit = allProcessingUnits[i];
        
        setProgress(prev => ({ ...prev, status: `Analyzing ${unit.name} with AI...` }));
        
        const pageResult = await analyzePage(unit.content, unit.isImage, i + 1);
        accumulatedQuestions = [...accumulatedQuestions, ...pageResult.questions];
        accumulatedTopics = [...accumulatedTopics, ...pageResult.topics];

        setProgress(prev => ({ 
          ...prev, 
          current: i + 1,
          completedPages: [...prev.completedPages, unit.name]
        }));
      }

      // Step 3: Synthesis
      setProgress(prev => ({ ...prev, status: 'Synthesizing comprehensive study guide...' }));
      const synthesis = await synthesizeAnalysis(accumulatedTopics, accumulatedQuestions.length);

      setAnalysis({
        title: synthesis.title,
        summary: synthesis.summary,
        keyTopics: synthesis.finalTopics,
        questions: accumulatedQuestions
      });
      setState('RESULTS');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process the book. Please try again.');
      setState('ERROR');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    processFiles(files);
  };

  const getDOKStats = () => {
    if (!analysis) return [];
    const counts = analysis.questions.reduce((acc, q) => {
      acc[q.dokLevel] = (acc[q.dokLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(DOKLevel).map(level => ({
      name: level.split(':')[0],
      full: level,
      value: counts[level] || 0
    }));
  };

  const dokColors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setState('IDLE')}>
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              DOK Study Master
            </h1>
          </div>
          {state === 'RESULTS' && (
             <button 
                onClick={() => setState('IDLE')}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100 px-4 py-2 rounded-lg"
             >
               <ArrowLeft className="w-4 h-4" /> New Session
             </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {state === 'IDLE' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 border border-indigo-100">
              <BrainCircuit className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              Page-by-Page <span className="text-indigo-600">Academic Insights</span>
            </h2>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              Upload documents, images, or **full PDF books**. Watch as we analyze every single page to generate a professional DOK-mapped assessment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-12">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Full PDF Support</p>
                  <p className="text-xs text-slate-500">Processes multi-page books automatically.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-200 transition-all">
                <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">DOK Mapping</p>
                  <p className="text-xs text-slate-500">Levels 1-4 Depth of Knowledge questions.</p>
                </div>
              </div>
            </div>

            <div className="relative group w-full max-w-md">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 hover:border-indigo-400 cursor-pointer transition-all shadow-sm">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="bg-slate-50 p-4 rounded-full mb-4 group-hover:bg-indigo-50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="mb-2 text-sm text-slate-700">
                    <span className="font-semibold text-indigo-600">Upload PDF, Text, or Images</span>
                  </p>
                  <p className="text-xs text-slate-400">Drag and drop files here</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple
                  accept=".txt,.jpg,.jpeg,.png,.pdf" 
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        )}

        {state === 'LOADING' && <AnalysisLoader progress={progress} />}

        {state === 'ERROR' && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="bg-red-50 p-4 rounded-full mb-6 border border-red-100">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Interrupted</h2>
            <p className="text-slate-600 mb-8">{error}</p>
            <button 
              onClick={() => setState('IDLE')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Start Over
            </button>
          </div>
        )}

        {state === 'RESULTS' && analysis && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/3 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-emerald-50 p-1.5 rounded-md">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Complete Analysis</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{analysis.title}</h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                    "{analysis.summary}"
                  </p>
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> Core Concepts
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keyTopics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-slate-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-500" /> Assessment Profile
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDOKStats()} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                          width={45}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                          {getDOKStats().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={dokColors[index % dokColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    {getDOKStats().map((stat, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: dokColors[i] }}></div>
                            {stat.full.split(':')[0]}
                         </div>
                         <span className="text-[11px] font-black text-slate-700">{stat.value} Qs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:w-2/3">
                <div className="bg-indigo-600 rounded-2xl p-6 mb-8 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Generated Assessment</h3>
                    <p className="text-indigo-100 text-sm">Comprehensive set of {analysis.questions.length} questions mapped to Depth of Knowledge levels.</p>
                  </div>
                  <GraduationCap className="w-12 h-12 text-indigo-400/40" />
                </div>

                <div className="space-y-4">
                  {analysis.questions.map((q, idx) => (
                    <QuestionCard key={q.id || idx} question={q} index={idx} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Chat Bot */}
      <ChatBot analysis={analysis} />
    </div>
  );
}
