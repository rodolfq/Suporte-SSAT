import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, options?: { style?: 'decimal' | 'percent' | 'currency'; minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  if (options?.style === 'percent') {
    return value.toLocaleString('pt-BR', { 
      style: 'percent', 
      minimumFractionDigits: options.minimumFractionDigits ?? 1,
      maximumFractionDigits: options.maximumFractionDigits ?? 1 
    });
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? (options?.style === 'currency' ? 2 : 0)
  });
}