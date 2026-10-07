import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { FitkonicLogo } from '@/components/ui/FitkonicComponents';
import { loginOrRegisterUser } from '@/lib/neon/repository';
import { useAppStore } from '@/app/store';
import { SEED_PROFILES } from '@/db/seed';

export function LoginScreen() {
  const { setCurrentUser, navigate, showToast } = useAppStore();
  const [mode, setMode] = useState<'splash' | 'email'>('splash');
  const [email, setEmail] = useState('harsh@fitkonic.app');
  const [password, setPassword] = useState('winterarc2026');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (memberEmail: string, memberName: string) => {
    setLoading(true);
    try {
      const user = await loginOrRegisterUser({ email: memberEmail, displayName: memberName });
      setCurrentUser(user.id);
      navigate('home');
      showToast({
        title: `Logged in as ${user.display_name}`,
        subtitle: 'Winter Arc active',
        type: 'success',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setLoading(true);
    try {
      const user = await loginOrRegisterUser({ email });
      setCurrentUser(user.id);
      navigate('home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="login-screen"
      className="relative min-h-screen w-full bg-[#07090C] text-[#F5F7FA] flex flex-col justify-between overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url(/themes/winter-arc.svg)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07090C]/70 via-[#07090C]/60 to-[#07090C] pointer-events-none" />

      <header className="relative z-10 pt-10 px-6 flex flex-col items-center text-center">
        <FitkonicLogo size="lg" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/30 text-[#7DD3FC] text-xs font-display font-bold uppercase tracking-widest mb-3">
            Harsh • Pranav • Kavi
          </div>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl tracking-tighter uppercase text-[#F5F7FA]">
            WINTER ARC
          </h1>
          <p className="mt-3 font-display font-semibold text-xs tracking-[0.2em] uppercase text-[#8B98A8]">
            DISCIPLINE TODAY. <span className="text-[#7DD3FC]">A STRONGER TOMORROW.</span>
          </p>
        </div>

        {/* 3 Athlete Logins: Harsh, Pranav, Kavi */}
        <div className="w-full bg-[#0D1117]/90 border border-[#202A35] rounded-2xl p-5 space-y-4 shadow-card">
          <p className="text-xs text-center uppercase tracking-wider text-[#8B98A8] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7DD3FC]" />
            <span>Select Your Login</span>
          </p>

          <div className="grid grid-cols-3 gap-3">
            {SEED_PROFILES.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(member.email, member.display_name)}
                data-testid={`demo-login-${member.username}`}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#121821] border border-[#202A35] hover:border-[#5EC8FF] hover:bg-[#5EC8FF]/10 transition-all group"
              >
                <img
                  src={member.avatar_url}
                  alt={member.display_name}
                  className="w-14 h-14 rounded-full mb-2 ring-2 ring-[#202A35] group-hover:ring-[#5EC8FF]"
                />
                <span className="font-display font-bold text-base text-[#F5F7FA]">
                  {member.display_name}
                </span>
                <span className="text-xs text-[#5EC8FF] mt-0.5">Tap to Enter</span>
              </button>
            ))}
          </div>

          {mode === 'splash' ? (
            <button
              type="button"
              onClick={() => setMode('email')}
              data-testid="email-login-trigger"
              className="w-full py-3 rounded-xl bg-[#121821] border border-[#202A35] hover:border-[#7DD3FC] text-xs font-semibold text-[#8B98A8] hover:text-[#F5F7FA] flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#7DD3FC]" />
              <span>Or sign in with Email</span>
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 border-t border-[#202A35]">
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B98A8] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8B98A8] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#121821] border border-[#202A35] text-sm text-[#F5F7FA]"
                  required
                />
              </div>
              <button
                type="submit"
                data-testid="auth-submit-button"
                className="w-full py-2.5 rounded-xl bg-[#5EC8FF] text-[#07090C] font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 pb-8 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-[#8B98A8]">
          Train. Fuel. Compete. Grow.
        </p>
      </footer>
    </div>
  );
}
