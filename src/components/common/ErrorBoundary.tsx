import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DBS Bank ErrorBoundary] Caught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 animate-fade-in">
          <div className="max-w-md w-full bg-white dark:bg-[#121520] rounded-2xl border border-gray-200 dark:border-white/10 p-8 shadow-xl text-center space-y-5">
            {/* Alert Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">
                Account Integrity Preserved
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {this.props.fallbackTitle || 'Display Interrupted'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                {this.props.fallbackSubtitle ||
                  'A temporary interface condition prevented this view from rendering. Your account assets and balances remain fully secure.'}
              </p>
            </div>

            {/* Error Message Snippet */}
            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-left font-mono text-[11px] text-gray-600 dark:text-slate-400 overflow-x-auto max-h-24 no-scrollbar">
                <span className="text-red-600 font-semibold block mb-0.5">Details:</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="bg-[#E60000] hover:bg-[#cc0000] text-white"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={this.handleReload}
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
              >
                Reload Banking
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
