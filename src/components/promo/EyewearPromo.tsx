import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Instagram, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

const AD_IMAGE = "https://lh3.googleusercontent.com/d/1ASiM8F7U38PUfhdKBSjtos7ajA_P5-Bx";

export const EyewearPromo: React.FC<{ className?: string; isBanner?: boolean }> = ({ className, isBanner }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (isBanner) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group/card w-full",
          className
        )}
      >
        {/* Background Glow Effect */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Image Section */}
        <div className="relative group overflow-hidden rounded-2xl w-full md:w-64 shrink-0 aspect-square bg-muted border border-border">
          <motion.img
            src={AD_IMAGE}
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            alt="Harshu Opticals Blue Light Glasses"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] bg-blue-400/10 px-3 py-1 rounded-full">
                Sponsored Promotion
              </span>
              <h2 className="text-4xl font-bold text-foreground tracking-tight">
                Harshu Opticals
              </h2>
            </div>
            <div className="hidden sm:flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-lg font-semibold text-foreground/80 leading-snug">
                Working long hours on your laptop or PC?
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Protect your eyes with premium Blue Light Protection Glasses. Reduce eye strain, headaches, and screen fatigue with our stylish collection.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                "Blue Light Protection",
                "Stylish Frames",
                "Zero Power Glasses Available",
                "Free Shipping Across India"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Check size={10} className="text-blue-400" strokeWidth={3} />
                  </div>
                  <span className="text-xs font-medium text-foreground/70">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
            <motion.a
              href="https://www.instagram.com/harshuopticals/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-600 hover:bg-blue-500 text-primary-foreground py-4 px-8 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-xl shadow-blue-600/20 group/btn w-full sm:w-auto"
            >
              <Instagram size={20} className="group-hover/btn:rotate-12 transition-transform" />
              Shop on Instagram
            </motion.a>
            <p className="text-sm font-bold text-blue-400 animate-pulse">
              DM us now for the best prices!
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-card border border-border p-5 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-[320px] mx-auto relative overflow-hidden group/card",
        className
      )}
    >
      {/* Background Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Top Label */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] bg-blue-400/10 px-2 py-0.5 rounded-full">
          Sponsored
        </span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75" />
        </div>
      </div>

      {/* Image Section */}
      <div className="relative group overflow-hidden rounded-xl aspect-[4/5] bg-muted border border-border">
        <motion.img
          src={AD_IMAGE}
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          alt="Harshu Opticals Blue Light Glasses"
        />
        
        {/* Image Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
        
        {/* Attention Element */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute top-3 right-3 bg-blue-600 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1"
        >
          <Sparkles size={10} />
          BEST PRICE
        </motion.div>
      </div>

      {/* Brand & Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          Harshu Opticals
        </h2>
        
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground/80 leading-snug">
            Working long hours on your laptop or PC?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Protect your eyes with premium Blue Light Protection Glasses. Reduce eye strain, headaches, and screen fatigue.
          </p>
        </div>
      </div>

      {/* Trust Badges / Features */}
      <div className="grid grid-cols-1 gap-2 py-3 border-y border-border">
        {[
          "Blue Light Protection",
          "Stylish Frames",
          "Zero Power Glasses Available",
          "Free Shipping Across India"
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Check size={10} className="text-blue-400" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-medium text-foreground/70">{feature}</span>
          </div>
        ))}
      </div>

      {/* Attention Text */}
      <div className="text-center">
        <p className="text-[11px] font-bold text-blue-400 animate-bounce">
          DM us now for the best prices!
        </p>
      </div>

      {/* CTA Button */}
      <motion.a
        href="https://www.instagram.com/harshuopticals/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-blue-600 hover:bg-blue-500 text-primary-foreground py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20 group/btn"
      >
        <Instagram size={16} className="group-hover/btn:rotate-12 transition-transform" />
        Shop Now / Visit Us on Instagram
      </motion.a>
    </motion.div>
  );
};
