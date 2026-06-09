import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import logo from "@assets/Salelooterz_logo_1780831157664.jpg";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <img src={logo} alt="SaleLooterz" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-8 opacity-60" />
        <p className="text-[6rem] font-black leading-none text-white/5 mb-0">404</p>
        <h1 className="text-2xl font-black tracking-tight -mt-4 mb-3">Page Not Found</h1>
        <p className="text-sm text-white/30 mb-8 leading-relaxed">
          This page doesn't exist. Head back to the dashboard and keep automating.
        </p>
        <Link href="/">
          <button className="btn-primary rounded-xl px-7 h-10 text-sm font-bold inline-flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
