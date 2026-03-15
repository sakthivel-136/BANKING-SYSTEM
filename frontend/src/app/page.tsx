"use client"

import { Button } from "@/components/ui/button"
import { ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans text-gray-900">
      
      {/* Navbar */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Globe className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-primary">SmartBank</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#" className="hover:text-primary transition">Features</a>
          <a href="#" className="hover:text-primary transition">Security</a>
          <a href="#" className="hover:text-primary transition">Workflows</a>
          <Link href="/login" className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-full transition shadow-sm">
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Next-Gen Banking Engine Live
          </div>
          <h1 className="text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-gray-900">
            Banking built for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              automated scale.
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed">
            Experience the future of financial operations with intelligent workflows, multi-tier approvals, and real-time transaction monitoring.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-base rounded-full gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full bg-white border-gray-200">
              View Architecture
            </Button>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-[2rem] blur-3xl transform -rotate-6"></div>
          <div className="relative bg-white border border-gray-100 rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col gap-6 transform rotate-2 hover:rotate-0 transition-all duration-500">
             
             {/* Mock Dashboard Element */}
             <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
                   <div>
                     <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
                     <div className="h-2 w-16 bg-gray-100 rounded"></div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <div className="w-6 h-6 bg-red-100 rounded-lg"></div>
                   <div className="w-6 h-6 bg-green-100 rounded-lg"></div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="h-24 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-100 flex items-center p-6 justify-between">
                   <div>
                      <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-1">Total Balance</p>
                      <p className="text-2xl font-bold text-gray-800">₹24,592.50</p>
                   </div>
                   <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                     <span className="text-green-500 font-bold">+</span>
                   </div>
                </div>

                <div className="flex gap-4">
                   <div className="flex-1 h-32 bg-primary/5 rounded-xl border border-primary/10 p-5">
                      <Zap className="w-6 h-6 text-primary mb-4" />
                      <p className="font-semibold text-gray-800 text-sm">Lightning Fast</p>
                      <p className="text-xs text-gray-500 mt-1">Rule Engine Evaluator</p>
                   </div>
                   <div className="flex-1 h-32 bg-secondary/5 rounded-xl border border-secondary/10 p-5">
                      <ShieldCheck className="w-6 h-6 text-secondary mb-4" />
                      <p className="font-semibold text-gray-800 text-sm">Military Grade</p>
                      <p className="text-xs text-gray-500 mt-1">UUID & RLS Protected</p>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </main>
      
    </div>
  )
}
