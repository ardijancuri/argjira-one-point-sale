import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import { reportsAPI } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/format';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Users,
  AlertTriangle,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const periodOptions = [
  { value: 'today', label: 'Sot' },
  { value: 'week', label: 'Javën' },
  { value: 'month', label: 'Muajin' },
  { value: 'year', label: 'Vitin' },
  { value: 'all', label: 'Të Gjitha' },
];

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className = '' }) {
  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-base font-semibold">{value}</p>
          {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-2 text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trend}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {periodOptions.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            value === option.value
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Sales Report Section
function SalesReport({ period }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'sales', period],
    queryFn: () => reportsAPI.getSales({ period }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">Gabim në ngarkimin e raportit</div>;

  const report = data?.data;
  if (!report) return null;

  const { summary, byPaymentMethod, byClientType, topProducts, dailyTrend } = report;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Transaksione"
          value={formatNumber(summary?.total_transactions || 0)}
          icon={ShoppingCart}
        />
        <StatCard
          title="Të Ardhura"
          value={formatCurrency(summary?.total_revenue || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Mesatarja"
          value={formatCurrency(summary?.average_sale || 0)}
          icon={BarChart3}
        />
        <StatCard
          title="Storno"
          value={formatNumber(summary?.storno_count || 0)}
          subtitle={formatCurrency(summary?.storno_amount || 0)}
          icon={AlertTriangle}
          className={summary?.storno_count > 0 ? 'border-l-4 border-red-400' : ''}
        />
      </div>

      {/* Payment Methods & Client Types */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* By Payment Method */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Sipas Mënyrës së Pagesës
          </h3>
          {byPaymentMethod?.length > 0 ? (
            <div className="space-y-2">
              {byPaymentMethod.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm capitalize">
                    {item.payment_method === 'cash' ? 'Para në Dorë' :
                     item.payment_method === 'card' ? 'Kartë' : item.payment_method}
                  </span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                    <span className="text-xs text-text-secondary ml-2">({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Nuk ka të dhëna</p>
          )}
        </div>

        {/* By Client Type */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sipas Llojit të Klientit
          </h3>
          {byClientType?.length > 0 ? (
            <div className="space-y-2">
              {byClientType.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm capitalize">
                    {item.client_type === 'retail' ? 'Retail' :
                     item.client_type === 'business' ? 'Biznes' :
                     item.client_type === 'wholesale' ? 'Shumicë' : item.client_type}
                  </span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                    <span className="text-xs text-text-secondary ml-2">({item.count})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Nuk ka të dhëna</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Produktet më të Shitura
        </h3>
        {topProducts?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Produkti</th>
                  <th className="text-left py-2 font-medium">Kategoria</th>
                  <th className="text-right py-2 font-medium">Sasia</th>
                  <th className="text-right py-2 font-medium">Të Ardhura</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">{product.product_name}</td>
                    <td className="py-2 text-text-secondary capitalize">{product.category}</td>
                    <td className="py-2 text-right">{formatNumber(product.total_quantity)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(product.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-sm">Nuk ka të dhëna</p>
        )}
      </div>

      {/* Daily Trend */}
      {dailyTrend?.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Trendi Ditor
          </h3>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {dailyTrend.slice(-14).map((day, index) => (
                <div key={index} className="text-center p-2 bg-gray-50 rounded min-w-[80px]">
                  <div className="text-xs text-text-secondary">
                    {new Date(day.sale_date).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div className="font-medium text-sm mt-1">{formatCurrency(day.total)}</div>
                  <div className="text-xs text-text-secondary">{day.count} shitje</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stock Report Section
function StockReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: () => reportsAPI.getStock(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">Gabim në ngarkimin e raportit</div>;

  const report = data?.data;
  if (!report) return null;

  const { summary, byCategory, byKarat, lowStock, outOfStock } = report;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Vlera Totale"
          value={formatCurrency(summary?.total_stock_value || 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Artikuj"
          value={formatNumber(summary?.total_items || 0)}
          icon={Package}
        />
        <StatCard
          title="Gram"
          value={`${formatNumber(summary?.total_grams || 0)} g`}
          icon={BarChart3}
        />
        <StatCard
          title="Copë"
          value={formatNumber(summary?.total_pieces || 0)}
          icon={ShoppingCart}
        />
      </div>

      {/* By Category & By Karat */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* By Category */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">Sipas Kategorisë</h3>
          {byCategory?.length > 0 ? (
            <div className="space-y-2">
              {byCategory.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm capitalize">
                    {item.category === 'stoli' ? 'Stoli Ari' :
                     item.category === 'investues' ? 'Ar Investues' :
                     item.category === 'dijamant' ? 'Dijamant' :
                     item.category === 'blerje' ? 'Blerje Ari' : item.category}
                  </span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(item.total_value)}</span>
                    <span className="text-xs text-text-secondary ml-2">({item.item_count})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Nuk ka të dhëna</p>
          )}
        </div>

        {/* By Karat */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3">Sipas Karatit</h3>
          {byKarat?.length > 0 ? (
            <div className="space-y-2">
              {byKarat.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{item.karat}</span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(item.total_value)}</span>
                    <span className="text-xs text-text-secondary ml-2">({item.item_count})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Nuk ka të dhëna</p>
          )}
        </div>
      </div>

      {/* Low Stock & Out of Stock */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Low Stock */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-400">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Stok i Ulët ({lowStock?.length || 0})
          </h3>
          {lowStock?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">
                    {formatNumber(item.quantity)} {item.unit === 'gram' ? 'g' : 'copë'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Asnjë artikull me stok të ulët</p>
          )}
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-red-400">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Pa Stok ({outOfStock?.length || 0})
          </h3>
          {outOfStock?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {outOfStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded text-sm">
                  <span>{item.name}</span>
                  <span className="text-text-secondary capitalize">{item.category}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Të gjithë artikujt kanë stok</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Financial Report Section
function FinancialReport({ period }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'financial', period],
    queryFn: () => reportsAPI.getFinancial({ period }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">Gabim në ngarkimin e raportit</div>;

  const report = data?.data;
  if (!report) return null;

  const { revenue, expenses, profit, monthlyBreakdown, outstandingDebts } = report;

  const profitIsPositive = profit?.gross >= 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Të Ardhura"
          value={formatCurrency(revenue?.total || 0)}
          icon={TrendingUp}
          className="border-l-4 border-green-400"
        />
        <StatCard
          title="Shpenzime"
          value={formatCurrency(expenses?.total || 0)}
          icon={ArrowDownRight}
          className="border-l-4 border-red-400"
        />
        <StatCard
          title="Fitimi Bruto"
          value={formatCurrency(profit?.gross || 0)}
          icon={DollarSign}
          className={`border-l-4 ${profitIsPositive ? 'border-green-400' : 'border-red-400'}`}
        />
        <StatCard
          title="Marzha"
          value={`${profit?.margin || 0}%`}
          icon={BarChart3}
        />
      </div>

      {/* Revenue & Expenses Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 text-green-600">Të Ardhura</h3>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">Fatura Dalëse</span>
              <span className="font-medium">{formatCurrency(revenue?.invoices?.total_revenue || 0)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">POS - Para në Dorë</span>
              <span className="font-medium">{formatCurrency(revenue?.posCash || 0)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">POS - Kartë</span>
              <span className="font-medium">{formatCurrency(revenue?.posCard || 0)}</span>
            </div>
            <div className="flex justify-between p-2 bg-green-50 rounded border-t-2 border-green-400">
              <span className="font-medium">TOTALI</span>
              <span className="font-semibold text-green-600">{formatCurrency(revenue?.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 text-red-600">Shpenzime</h3>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">Fatura Hyrëse</span>
              <span className="font-medium">{formatCurrency(expenses?.invoices?.total_expenses || 0)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">Blerje</span>
              <span className="font-medium">{formatCurrency(expenses?.purchases?.total_purchases || 0)}</span>
            </div>
            <div className="flex justify-between p-2 bg-red-50 rounded border-t-2 border-red-400">
              <span className="font-medium">TOTALI</span>
              <span className="font-semibold text-red-600">{formatCurrency(expenses?.total || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Debts */}
      {outstandingDebts?.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Borxhet e Papaguara (Top 10)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Klienti</th>
                  <th className="text-left py-2 font-medium">Lloji</th>
                  <th className="text-right py-2 font-medium">Fatura</th>
                  <th className="text-right py-2 font-medium">Borxhi</th>
                </tr>
              </thead>
              <tbody>
                {outstandingDebts.map((debt, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">{debt.client_name}</td>
                    <td className="py-2 text-text-secondary capitalize">
                      {debt.client_type === 'business' ? 'Biznes' :
                       debt.client_type === 'wholesale' ? 'Shumicë' : 'Retail'}
                    </td>
                    <td className="py-2 text-right">{debt.invoice_count}</td>
                    <td className="py-2 text-right font-medium text-red-600">{formatCurrency(debt.total_debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {monthlyBreakdown?.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Pasqyra Mujore
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Muaji</th>
                  <th className="text-right py-2 font-medium">Të Ardhura</th>
                  <th className="text-right py-2 font-medium">Shpenzime</th>
                  <th className="text-right py-2 font-medium">Fitimi</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((month, index) => {
                  const monthProfit = parseFloat(month.revenue || 0) - parseFloat(month.expenses || 0);
                  return (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2">{month.month}</td>
                      <td className="py-2 text-right text-green-600">{formatCurrency(month.revenue)}</td>
                      <td className="py-2 text-right text-red-600">{formatCurrency(month.expenses)}</td>
                      <td className={`py-2 text-right font-medium ${monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(monthProfit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('month');

  const tabs = [
    { id: 'sales', label: 'Shitjet', icon: ShoppingCart },
    { id: 'stock', label: 'Stoku', icon: Package },
    { id: 'financial', label: 'Financat', icon: DollarSign },
  ];

  return (
    <>
      <TopBar title="Raportet" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg p-2 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period Selector (for sales and financial) */}
        {(activeTab === 'sales' || activeTab === 'financial') && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-text-secondary">Periudha:</span>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
          </div>
        )}

        {/* Report Content */}
        <div>
          {activeTab === 'sales' && (
            <>
              <SectionHeader title="Raporti i Shitjeve" icon={ShoppingCart} />
              <SalesReport period={period} />
            </>
          )}
          {activeTab === 'stock' && (
            <>
              <SectionHeader title="Raporti i Stokut" icon={Package} />
              <StockReport />
            </>
          )}
          {activeTab === 'financial' && (
            <>
              <SectionHeader title="Raporti Financiar" icon={DollarSign} />
              <FinancialReport period={period} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
