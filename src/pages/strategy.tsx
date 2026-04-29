import React from "react";
import Layout from "@/components/Layout";

export default function StrategyPage() {
  return (
    <Layout hideSidebar={false} isDarkMode={true}>
      <div className="h-screen w-full bg-black">
        <iframe
          src="/tfsa-dashboard.html"
          title="TFSA Advisor Dashboard"
          className="h-full w-full border-0"
        />
      </div>
    </Layout>
  );
}
