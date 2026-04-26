import jsPDF from "jspdf";

export function exportAuditPDF(results: any, narrative: string, mitigationResults?: any) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  
  // Header
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LUMIS.AI — Bias Audit Report", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { 
    year: "numeric", month: "long", day: "numeric" 
  })}`, 20, 34);

  // SDG badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageW - 70, 12, 55, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("SDG 10 Aligned", pageW - 62, 23);

  // Reset colors
  doc.setTextColor(20, 20, 20);
  let y = 55;

  // Fairness Score
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Fairness Score", 20, y);
  const score = results.summary?.bias_score || results.bias_score || 0;
  const scoreColor: [number, number, number] = score >= 75 ? [16, 185, 129] : score >= 50 ? [251, 191, 36] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.circle(pageW - 35, y - 5, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${score}`, pageW - 39, y);
  doc.setTextColor(20, 20, 20);
  y += 15;

  // Compliance status
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const compliant = score >= 75;
  doc.setFillColor(compliant ? 220 : 254, compliant ? 252 : 226, compliant ? 231 : 226);
  doc.roundedRect(20, y, 80, 12, 2, 2, "F");
  doc.setTextColor(compliant ? 5 : 153, compliant ? 150 : 27, compliant ? 105 : 27);
  doc.text(compliant ? "✓ EU AI Act Compliant" : "⚠ Non-Compliant — Action Required", 24, y + 8);
  doc.setTextColor(20, 20, 20);
  y += 25;

  // Compliance Summary Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Compliance Summary", 20, y);
  y += 8;

  const disparateImpact = results.metrics?.disparate_impact || results.disparateImpact || 0;
  const primaryBiasDriver = results.top_features?.[0]?.feature || results.topFeatures?.[0]?.name || "N/A";
  const datasetName = results.dataset_name || "Dataset";

  const complianceData = [
    ["Dataset Name", datasetName],
    ["Final Fairness Score", `${score.toFixed(2)}/100`],
    ["Disparate Impact Ratio", disparateImpact.toFixed(3), disparateImpact >= 0.8],
    ["Primary Bias Driver", primaryBiasDriver],
  ];

  complianceData.forEach(([label, value, isPass]) => {
    doc.setFillColor(248, 248, 248);
    doc.rect(20, y, pageW - 40, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(label, 24, y + 7);
    if (isPass !== undefined) {
      doc.setTextColor(isPass ? 5 : 220, isPass ? 150 : 38, isPass ? 105 : 38);
      doc.setFont("helvetica", "bold");
    }
    doc.text(String(value), pageW - 80, y + 7);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    y += 12;
  });

  y += 10;

  // Key Metrics table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Fairness Metrics", 20, y);
  y += 8;

  const metrics = [
    ["Disparate Impact Ratio", String(results.metrics?.disparate_impact?.toFixed(3) || results.disparateImpact?.toFixed(3) || "N/A"), (results.metrics?.disparate_impact || results.disparateImpact || 0) >= 0.8 ? "PASS" : "FAIL"],
    ["Statistical Parity Difference", String(results.metrics?.statistical_parity?.toFixed(3) || results.statisticalParity?.toFixed(3) || "N/A"), Math.abs(results.metrics?.statistical_parity || results.statisticalParity || 0) <= 0.1 ? "PASS" : "FAIL"],
    ["Equal Opportunity Difference", String(results.metrics?.equal_opportunity?.toFixed(3) || results.equalOpportunity?.toFixed(3) || "N/A"), Math.abs(results.metrics?.equal_opportunity || results.equalOpportunity || 0) <= 0.1 ? "PASS" : "FAIL"],
  ];

  metrics.forEach(([label, value, status]) => {
    doc.setFillColor(248, 248, 248);
    doc.rect(20, y, pageW - 40, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(label, 24, y + 8);
    doc.text(value, pageW - 80, y + 8);
    doc.setTextColor(status === "PASS" ? 5 : 200, status === "PASS" ? 150 : 30, status === "PASS" ? 105 : 30);
    doc.setFont("helvetica", "bold");
    doc.text(status, pageW - 40, y + 8);
    doc.setTextColor(20, 20, 20);
    y += 14;
  });

  y += 10;

  // Top bias features
  const topFeatures = results.top_features || results.topFeatures || [];
  if (topFeatures.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top Bias-Contributing Features", 20, y);
    y += 8;
    topFeatures.slice(0, 5).forEach((f: any, i: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const featureName = f.feature || f.name || "Unknown";
      const impact = (f.impact || f.impactPercent || 0) * 100;
      doc.text(`${i + 1}. ${featureName} — ${impact.toFixed(1)}% impact`, 24, y);
      y += 8;
    });
  }

  y += 10;

  // Add new page for Gemini Narrative
  doc.addPage();
  
  // Header for new page
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AI Expert Analysis", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gemini-Powered Narrative", 20, 34);

  doc.setTextColor(20, 20, 20);
  y = 55;

  // Gemini narrative
  if (narrative) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Mitigation Explanation", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(narrative, pageW - 40);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 20;
  }

  // If mitigation results exist, add before/after comparison
  if (mitigationResults) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Before vs After Mitigation", 20, y);
    y += 10;

    const comparisonData = [
      ["Fairness Score", `${mitigationResults.before.fairnessScore.toFixed(1)}`, `${mitigationResults.after.fairnessScore.toFixed(1)}`, `+${mitigationResults.improvement.toFixed(1)}`],
      ["Disparate Impact", mitigationResults.before.disparateImpact.toFixed(3), mitigationResults.after.disparateImpact.toFixed(3), mitigationResults.after.disparateImpact >= 0.8 ? "✓" : "✗"],
      ["Statistical Parity", Math.abs(mitigationResults.before.statisticalParity).toFixed(3), Math.abs(mitigationResults.after.statisticalParity).toFixed(3), Math.abs(mitigationResults.after.statisticalParity) <= 0.1 ? "✓" : "✗"],
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Metric", 20, y);
    doc.text("Before", 80, y);
    doc.text("After", 130, y);
    doc.text("Change", 180, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    comparisonData.forEach(([metric, before, after, change]) => {
      doc.text(metric, 20, y);
      doc.text(before, 80, y);
      doc.text(after, 130, y);
      doc.setTextColor(change.includes("+") || change === "✓" ? 5 : 220, change.includes("+") || change === "✓" ? 150 : 38, change.includes("+") || change === "✓" ? 105 : 38);
      doc.text(change, 180, y);
      doc.setTextColor(20, 20, 20);
      y += 8;
    });
  }

  // Footer
  doc.setFillColor(10, 10, 20);
  doc.rect(0, pageH - 20, pageW, 20, "F");
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("Generated by LUMIS.AI — AI Fairness Auditing Platform | SDG 10: Reduced Inequalities", 20, pageH - 8);
  doc.text("lumis.ai", pageW - 35, pageH - 8);

  doc.save(`LUMIS_AI_Audit_Report_${new Date().toISOString().split("T")[0]}.pdf`);
}
