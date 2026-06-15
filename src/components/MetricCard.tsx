import React from 'react';
import { motion } from 'motion/react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive,
  icon
}) => {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800/80 p-6 shadow-lg shadow-slate-950/40 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest font-display mb-2">{title}</p>
          <h3 className="text-3xl font-bold font-display tracking-tight text-white">
            {value}
          </h3>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-amber-500 shadow-inner">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center gap-1 font-semibold ${
            isPositive ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {isPositive ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 13a1 1 0 100-2h-5a1 1 0 100 2h5z" clipRule="evenodd"></path>
            </svg>
          )}
          <span>{change}</span>
        </span>
      </div>

      {/* Decorative premium trace */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </motion.div>
  );
};
