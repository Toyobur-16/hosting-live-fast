import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  private handleHardReset = () => {
    try {
      localStorage.removeItem('bot_auth_user');
      localStorage.removeItem('bot_auth_token');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0c1424] border border-[#1e293b] shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-black text-white">
              কিছু একটা সমস্যা হয়েছে
            </h2>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              অ্যাপ্লিকেশনে সাময়িক ত্রুটি হয়েছিল। আপনার কোনো ডাটা হারায়নি। নিচের বাটনে ক্লিক করে সহজেই আগের অবস্থায় ফিরে যান।
            </p>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] text-slate-400 font-mono break-all text-left">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00d293]/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>রিলোড করুন (Reload)</span>
              </button>

              <button
                onClick={this.handleHardReset}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>হোমপেজে যান</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
