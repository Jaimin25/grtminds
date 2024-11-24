import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import winston from 'winston';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()],
});
