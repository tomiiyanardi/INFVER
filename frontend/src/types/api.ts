export type CategoryId = 'crypto' | 'fixed-income-ar' | 'liquidity' | 'cedears' | 'bonds';
export type ProfileId = 'conservative' | 'moderate' | 'aggressive';
export type Currency = 'ARS' | 'USD';
export interface Category { id: CategoryId; name: string; color: string; description: string }
export interface Asset { education: { whatIs: string; howItWorks: string; mainRisk: string }; id: string; symbol: string; name: string; categoryId: CategoryId; risk: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto'; liquidity: string; referenceCurrency: Currency; horizon: string; annualReturn: { value: number | null; label: string; basis: 'nominal' | 'real' | 'variable'; illustrative: true }; summary: string; pros: string[]; cons: string[]; macroFactors: string; sources: { label: string; url: string }[]; reviewedAt: string }
export interface Question { id: string; title: string; options: { id: string; label: string }[] }
export interface ProfileResult { profile: ProfileId; name: string; score: number; maxScore: number; description: string }
export interface RecommendationInput { amount: number; currency: Currency; profile: ProfileId }
export interface SuggestedAsset { explanation: string; assetId: string; name: string; symbol: string; percentageOfCategory: number; amount: number; referenceCurrency: Currency }
export interface Allocation extends Category { percentage: number; amount: number; assets: SuggestedAsset[] }
export interface Recommendation { amount: number; currency: Currency; profile: ProfileId; profileName: string; allocations: Allocation[]; riskScore: number; diversificationScore: number; warnings: string[]; createdAt: string }
export interface Portfolio extends Recommendation { id: string; name: string }
