import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Login = () => {
  const { signIn } = useAuth();
  return (
    <div className="min-h-screen flex bg-memento-cream" data-testid="login-page">
      {/* Left: image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80"
          alt="Travel"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-memento-espresso/70 via-memento-espresso/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <p className="text-xs tracking-[0.3em] uppercase text-memento-apricot font-semibold mb-4">
            Memento
          </p>
          <h2 className="font-serif text-4xl text-memento-cream leading-tight tracking-tight max-w-md">
            "The trips I've taken with Memento are the only ones I still
            remember in detail."
          </h2>
          <p className="text-memento-cream/70 mt-4 italic">
            — Anna, planned 7 trips
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-12" data-testid="auth-home-link">
            <div className="w-9 h-9 rounded-full bg-memento-espresso text-memento-cream flex items-center justify-center font-serif">
              M
            </div>
            <span className="font-serif text-xl text-memento-espresso">
              Memento
            </span>
          </Link>

          <h1 className="font-serif text-4xl text-memento-espresso tracking-tight mb-2">
            Welcome back.
          </h1>
          <p className="text-memento-coffee mb-8">
            Sign in to find your saved trips.
          </p>

          {/* SSO */}
          <div className="space-y-3 mb-6">
            <button
              data-testid="login-google"
              onClick={signIn}
              className="w-full h-12 rounded-full border border-memento-parchment bg-white hover:bg-memento-sand flex items-center justify-center gap-3 text-sm font-medium text-memento-espresso transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-memento-parchment" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-memento-cream text-memento-coffee uppercase tracking-wider">
                Or with email
              </span>
            </div>
          </div>

          {/* Email/password sign-in — coming soon; disabled to prevent user confusion */}
          <div className="space-y-4 opacity-50 pointer-events-none select-none" aria-hidden="true">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-memento-coffee font-semibold">
                Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-memento-coffee" />
                <Input
                  id="email"
                  type="email"
                  data-testid="login-email"
                  placeholder="you@email.com"
                  tabIndex={-1}
                  className="pl-11 h-12 rounded-xl border-memento-parchment bg-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-memento-coffee font-semibold">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-memento-coffee" />
                <Input
                  id="password"
                  type="password"
                  data-testid="login-password"
                  placeholder="••••••••"
                  tabIndex={-1}
                  className="pl-11 h-12 rounded-xl border-memento-parchment bg-white"
                />
              </div>
            </div>
            <Button
              disabled
              data-testid="login-submit"
              className="w-full h-12 rounded-full bg-memento-terracotta text-white font-medium"
            >
              Sign in
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-center text-memento-coffee mt-2">
            Email sign-in coming soon — use Google above.
          </p>

          <p className="text-sm text-memento-coffee text-center mt-8">
            New here?{" "}
            <Link
              to="/auth/signup"
              className="text-memento-terracotta hover:text-memento-terracotta-dark font-medium"
              data-testid="login-to-signup"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
