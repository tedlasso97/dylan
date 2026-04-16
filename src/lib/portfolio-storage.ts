// Portfolio storage abstraction for localStorage
// Easy to swap to Supabase/database later

import { PortfolioAsset } from './coingecko';

const STORAGE_KEY = 'portfolio-assets';

export class PortfolioStorage {
  static getAll(): PortfolioAsset[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading portfolio from localStorage:', error);
      return [];
    }
  }

  static add(asset: PortfolioAsset): void {
    if (typeof window === 'undefined') return;
    
    const existing = this.getAll();
    // Check if asset already exists
    const index = existing.findIndex(a => a.id === asset.id);
    if (index >= 0) {
      // Update quantity if exists
      existing[index].quantity = asset.quantity;
      existing[index].priceUsd = asset.priceUsd;
    } else {
      existing.push(asset);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  static remove(assetId: string): void {
    if (typeof window === 'undefined') return;
    
    const existing = this.getAll();
    const filtered = existing.filter(a => a.id !== assetId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  static update(assetId: string, quantity: number): void {
    if (typeof window === 'undefined') return;
    
    const existing = this.getAll();
    const index = existing.findIndex(a => a.id === assetId);
    if (index >= 0) {
      existing[index].quantity = quantity;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }

  static updateAsset(assetId: string, updates: Partial<PortfolioAsset>): void {
    if (typeof window === 'undefined') return;

    const existing = this.getAll();
    const index = existing.findIndex(a => a.id === assetId);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
}









