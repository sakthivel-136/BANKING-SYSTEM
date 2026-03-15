"use client"

import React from 'react'

export function Logo({ className = "w-8 h-8", textClassName = "font-bold text-xl tracking-tight" }: { className?: string, textClassName?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${className} relative flex items-center justify-center`}>
        {/* Stylized S/B Logo with Shield/Bank integration */}
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" className="text-primary/20" />
          <path 
            d="M30 35C30 35 45 25 70 35C70 35 75 60 50 85C25 60 30 35 30 35Z" 
            fill="currentColor" 
            className="text-primary"
          />
          <path 
            d="M45 45L55 55M55 45L45 55" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
      <span className={`${textClassName} text-gray-900`}>Smart<span className="text-primary">Bank</span></span>
    </div>
  )
}
