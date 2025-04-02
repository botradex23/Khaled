import React from 'react';
import Layout from '@/components/layout';
import TradeLogsTest from '@/components/test/TradeLogsTest';

export default function TradeLogsTestPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Trade Logs API Test</h1>
        <p className="text-gray-500 mb-8">Test the Trade Logs API functionality</p>
        <TradeLogsTest />
      </div>
    </Layout>
  );
}