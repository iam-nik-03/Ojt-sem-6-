import React from 'react';
import { motion } from 'motion/react';

export const AdvertisementCard: React.FC = () => {
  return (
    <div className="w-full px-4 py-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2c2c2c]/40">
            Sponsored
          </span>
        </div>
        
        <a 
          href="https://www.instagram.com/harshuopticals/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block group"
        >
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative overflow-hidden rounded-[10px] shadow-[0_6px_20px_rgba(0,0,0,0.4)] bg-white"
          >
            <img
              src="/ads/harshu-opticals-ad.jpg"
              alt="Harshu Opticals Blue Light Protection Glasses"
              className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
          </motion.div>
        </a>
        
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-bold text-[#2c2c2c]">Harshu Opticals</h4>
          <p className="text-[10px] text-[#2c2c2c]/60 leading-tight">
            Premium Blue Light Protection Glasses. Shop the latest collection on Instagram.
          </p>
        </div>
      </div>
    </div>
  );
};
