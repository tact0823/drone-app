import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReportType } from '../../types/report.js';
import { REPORT_TYPE_LABELS } from '../../types/report.js';
import type { Anomaly } from '../../types/anomaly.js';
import type { ImageRecord } from '../../types/image.js';
import {
  formatFindingNumber,
  getAnomalyLabel,
  getInspectionLabel,
  gradeToJudgment,
  SCORE_LABELS,
  TIMING_LABELS,
  type ReportBuildData,
} from './reportDataLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let cachedCss: string | null = null;

async function getCss(): Promise<string> {
  if (!cachedCss) {
    cachedCss = await readFile(path.join(__dirname, '../../templates/report/report.css'), 'utf8');
  }
  return cachedCss;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imgTag(data: ReportBuildData, imageId: string | null | undefined, alt: string): string {
  if (!imageId) return `<div class="image-box"><div class="image-label">${alt}</div><p style="padding:20px;color:#999">画像なし</p></div>`;
  const src = data.imageDataUrls.get(imageId);
  if (!src) return `<div class="image-box"><div class="image-label">${alt}</div><p style="padding:20px;color:#999">画像なし</p></div>`;
  return `<img src="${src}" alt="${escapeHtml(alt)}" />`;
}

function compassHtml(direction: string | null): string {
  const active = direction ?? '';
  return `<div class="compass">
    <span class="n" style="${active === 'N' ? 'color:red' : ''}">N</span>
    <span class="s" style="${active === 'S' ? 'color:red' : ''}">S</span>
    <span class="e" style="${active === 'E' ? 'color:red' : ''}">E</span>
    <span class="w" style="${active === 'W' ? 'color:red' : ''}">W</span>
  </div>`;
}

function markerOverlay(anomaly: Anomaly): string {
  return `<div class="marker" style="left:${anomaly.markerX * 100}%;top:${anomaly.markerY * 100}%;width:${anomaly.markerW * 100}%;height:${anomaly.markerH * 100}%">${formatFindingNumber(anomaly.findingNumber)}</div>`;
}

function buildCover(data: ReportBuildData, reportType: ReportType): string {
  const { project, inspector, company } = data;
  const client = project.clientName ?? project.siteName;
  const overview = data.images.find((i) => i.imageType === 'OVERVIEW') ?? data.images[0];
  const inspectionLabel = getInspectionLabel(project.inspectionType);
  const title = `${escapeHtml(client)}様邸\n${escapeHtml(inspectionLabel)}劣化診断調査報告書`;

  return `<section class="page">
    <div class="report-type-badge">${REPORT_TYPE_LABELS[reportType]}</div>
    <div class="cover-title">
      <div class="client">${escapeHtml(client)}様邸</div>
      <div class="report-name">${escapeHtml(inspectionLabel)}劣化診断調査報告書</div>
    </div>
    ${overview ? `<img class="cover-image" src="${data.imageDataUrls.get(overview.id) ?? ''}" alt="全景" />` : ''}
    <div class="cover-meta">
      <p>施工：${escapeHtml(company.name)}</p>
      <p>調査年月日：${escapeHtml(project.inspectionDate)}</p>
      <p>物件所在地：${escapeHtml(project.location ?? '—')}</p>
      <p>調査担当者：${escapeHtml(inspector.name)}</p>
    </div>
    <div class="cover-company">
      <p>${escapeHtml(company.name)}</p>
      <p>${escapeHtml(company.address)}</p>
      <p>TEL ${escapeHtml(company.phone)}</p>
      <p>${escapeHtml(company.website)}</p>
    </div>
  </section>`;
}

function buildOverview(data: ReportBuildData): string {
  const { project, assessment } = data;
  const overview = data.images.find((i) => i.imageType === 'OVERVIEW') ?? data.images[0];
  const markers = data.anomalies
    .slice(0, 6)
    .map((a) => markerOverlay(a))
    .join('');

  return `<section class="page">
    <h2>物件概要</h2>
    <div class="overview-grid">
      <div>
        <table>
          <tr><th>物件名</th><td>${escapeHtml(project.siteName)}</td></tr>
          <tr><th>所在地</th><td>${escapeHtml(project.location ?? '—')}</td></tr>
          <tr><th>構造</th><td>${escapeHtml(project.structure ?? '—')}</td></tr>
          <tr><th>階数</th><td>${escapeHtml(project.floors ?? '—')}</td></tr>
          <tr><th>築年数</th><td>${escapeHtml(project.buildingAge ?? '—')}</td></tr>
          <tr><th>点検種別</th><td>${escapeHtml(getInspectionLabel(project.inspectionType))}</td></tr>
          <tr><th>総合判定</th><td>${escapeHtml(assessment.overallScore ?? '—')} ${escapeHtml(SCORE_LABELS[assessment.overallScore ?? 'A'])}</td></tr>
        </table>
        <p style="margin-top:10px"><strong>備考</strong><br/>${escapeHtml(project.notes ?? '—')}</p>
      </div>
      <div class="overview-map">
        ${overview ? `<img src="${data.imageDataUrls.get(overview.id) ?? ''}" alt="全景" />` : '<p>全景画像なし</p>'}
        ${markers}
      </div>
    </div>
  </section>`;
}

function buildSolarAnnex(data: ReportBuildData): string {
  const solarAnomalies = data.anomalies.filter((a) =>
    ['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION'].includes(a.type),
  );
  const rows = (solarAnomalies.length > 0 ? solarAnomalies : data.anomalies)
    .map(
      (a) => `<tr>
        <td>太陽光</td>
        <td>${formatFindingNumber(a.findingNumber)}</td>
        <td>${escapeHtml(a.comment ?? a.aiComment ?? '—')}</td>
        <td>${gradeToJudgment(a.overallGrade ?? a.autoOverallGrade)}</td>
      </tr>`,
    )
    .join('');

  const sample = data.anomalies[0];
  const visibleId = sample ? findPairedImage(data.images, sample.imageId, 'VISIBLE') : null;
  const infraredId = sample?.imageId ?? null;

  return `<section class="page">
    <h2>&lt;別紙&gt; 太陽光パネル熱赤外線診断報告書</h2>
    <table>
      <thead><tr><th>部位</th><th>番号</th><th>コメント</th><th>判定ランク</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">異常なし</td></tr>'}</tbody>
    </table>
    <div class="image-pair" style="margin-top:16px">
      <div class="image-box"><div class="image-label">可視画像</div>${imgTag(data, visibleId, '可視')}</div>
      <div class="image-box"><div class="image-label">赤外線画像</div><div style="position:relative">${sample ? `${imgTag(data, infraredId, '赤外線')}${markerOverlay(sample)}` : '<p style="padding:20px;color:#999">画像なし</p>'}</div></div>
    </div>
  </section>`;
}

function findPairedImage(images: ImageRecord[], imageId: string, type: string): string | null {
  const current = images.find((i) => i.id === imageId);
  if (!current) return null;
  if (current.imageType === type) return current.id;
  if (current.pairId) {
    const paired = images.find((i) => i.pairId === current.pairId && i.imageType === type);
    if (paired) return paired.id;
  }
  return images.find((i) => i.imageType === type)?.id ?? null;
}

function buildDetailPage(data: ReportBuildData, anomaly: Anomaly, page: number, total: number): string {
  const { project, inspector } = data;
  const grade = anomaly.overallGrade ?? anomaly.autoOverallGrade ?? 'B';
  const visibleId = findPairedImage(data.images, anomaly.imageId, 'VISIBLE') ?? anomaly.imageId;
  const infraredId = anomaly.imageId;
  const comment = anomaly.comment ?? anomaly.aiComment ?? '—';
  const lines = comment.split(/[。\n]/).filter(Boolean).map((l) => `・${l}`).join('<br/>');

  return `<section class="page">
    <div class="page-header"><span>&lt;報告&gt;</span><span>${page}/${total}</span></div>
    <table>
      <tr><th>調査年月日</th><td>${escapeHtml(project.inspectionDate)}</td><th>調査者</th><td>${escapeHtml(inspector.name)}</td></tr>
      <tr><th>調査場所</th><td colspan="3">${escapeHtml(project.location ?? project.siteName)}</td></tr>
    </table>
    <table style="margin-top:10px">
      <tr><th>調査部位</th><td>${escapeHtml(anomaly.partName ?? getAnomalyLabel(project.inspectionType, anomaly.type))}</td></tr>
      <tr><th>診断</th><td>${escapeHtml(grade)} — ${escapeHtml(SCORE_LABELS[grade])}</td></tr>
    </table>
    <h3>状況</h3>
    <p>${lines}</p>
    <div class="detail-grid">
      <div>${compassHtml(anomaly.direction)}<p style="font-size:8pt;margin-top:4px">方位: ${escapeHtml(anomaly.direction ?? '—')}</p></div>
      <div>
        <div class="image-pair">
          <div class="image-box"><div class="image-label">可視画像</div><div style="position:relative">${imgTag(data, visibleId, '可視')}</div></div>
          <div class="image-box"><div class="image-label">赤外線画像</div><div style="position:relative">${imgTag(data, infraredId, '赤外線')}${markerOverlay(anomaly)}</div></div>
        </div>
      </div>
    </div>
  </section>`;
}

function buildSummary(data: ReportBuildData): string {
  const { project, assessment } = data;
  const solarComments = data.anomalies
    .filter((a) => ['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION'].includes(a.type))
    .map((a) => a.comment ?? a.aiComment)
    .filter(Boolean)
    .join(' ');
  const roofComments = data.anomalies
    .map((a) => a.comment ?? a.aiComment)
    .filter(Boolean)
    .join(' ');

  return `<section class="page">
    <h2>総括</h2>
    <div class="summary-section">
      <h3>■ 調査概要</h3>
      <p>${escapeHtml(project.siteName)} において ${escapeHtml(project.inspectionDate)} に実施した${escapeHtml(getInspectionLabel(project.inspectionType))}の赤外線診断調査結果を報告します。天候: ${escapeHtml(project.weather ?? '—')}、使用機材: ${escapeHtml(project.equipment ?? '—')}。</p>
    </div>
    ${project.inspectionType === 'SOLAR_PANEL' ? `<div class="summary-section"><h3>■ 太陽光パネル点検結果</h3><p>${escapeHtml(solarComments || '特記事項なし')}</p></div>` : ''}
    ${project.inspectionType === 'ROOF' ? `<div class="summary-section"><h3>■ 屋根点検結果</h3><p>${escapeHtml(roofComments || '特記事項なし')}</p></div>` : ''}
    ${project.inspectionType === 'EXTERIOR_WALL' ? `<div class="summary-section"><h3>■ 外壁点検結果</h3><p>${escapeHtml(roofComments || '特記事項なし')}</p></div>` : ''}
    <div class="summary-section">
      <h3>■ 総合判定</h3>
      <p>総合評価: ${escapeHtml(assessment.overallScore ?? '—')}（${escapeHtml(SCORE_LABELS[assessment.overallScore ?? 'A'])}）。${escapeHtml(project.notes ?? '')}</p>
    </div>
  </section>`;
}

function buildAssessment(data: ReportBuildData, reportType: ReportType): string {
  const { assessment, project } = data;
  const scoreClass = reportType === 'SALES' ? 'score-badge sales' : 'score-badge';
  const rows = data.anomalies
    .map(
      (a) => `<tr>
        <td>${formatFindingNumber(a.findingNumber)}</td>
        <td>${escapeHtml(a.partName ?? getAnomalyLabel(project.inspectionType, a.type))}</td>
        <td>${escapeHtml(a.overallGrade ?? a.autoOverallGrade ?? '—')}</td>
        <td>${'★'.repeat(a.urgencyStars ?? 1)}${'☆'.repeat(5 - (a.urgencyStars ?? 1))}</td>
        <td>${escapeHtml(a.recommendedTiming ? TIMING_LABELS[a.recommendedTiming] : '—')}</td>
      </tr>`,
    )
    .join('');

  return `<section class="page">
    <h2>評価サマリー</h2>
    <p>総合評価</p>
    <div class="${scoreClass}">${escapeHtml(assessment.overallScore ?? 'A')}</div>
    <p style="margin-top:8px">${escapeHtml(SCORE_LABELS[assessment.overallScore ?? 'A'])}</p>
    ${assessment.roofLife ? `<p style="margin-top:12px">屋根残寿命: 推定 ${assessment.roofLife.min}〜${assessment.roofLife.max} 年</p>` : ''}
    ${assessment.solarRisk ? `<p>発電リスク: ${assessment.solarRisk === 'LOW' ? '低' : assessment.solarRisk === 'MEDIUM' ? '中' : '高'}</p>` : ''}
    <table style="margin-top:16px">
      <thead><tr><th>No</th><th>部位</th><th>評価</th><th>緊急度</th><th>対応時期</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">異常なし</td></tr>'}</tbody>
    </table>
  </section>`;
}

function buildPlans(data: ReportBuildData): string {
  const cards = data.assessment.recommendedPlans
    .map(
      (plan) => `<div class="plan-card ${plan.isRecommended ? 'recommended' : ''}">
        ${plan.isRecommended ? '<div class="badge">★ 推奨</div>' : ''}
        <h3>${escapeHtml(plan.title)}</h3>
        <p>${escapeHtml(plan.summary)}</p>
      </div>`,
    )
    .join('');

  return `<section class="page">
    <h2>推奨工事プラン</h2>
    <div class="plans-grid">${cards}</div>
  </section>`;
}

export async function buildReportHtml(data: ReportBuildData, reportType: ReportType): Promise<string> {
  const css = await getCss();
  const sections: string[] = [];

  sections.push(buildCover(data, reportType));
  sections.push(buildOverview(data));

  if (data.project.inspectionType === 'SOLAR_PANEL') {
    sections.push(buildSolarAnnex(data));
  }

  const detailTotal = data.anomalies.length || 1;
  if (data.anomalies.length === 0) {
    sections.push(`<section class="page"><h2>詳細報告</h2><p>異常箇所は検出されませんでした。</p></section>`);
  } else {
    data.anomalies.forEach((anomaly, index) => {
      sections.push(buildDetailPage(data, anomaly, index + 1, detailTotal));
    });
  }

  sections.push(buildSummary(data));

  if (reportType === 'SURVEY' || reportType === 'SALES') {
    sections.push(buildAssessment(data, reportType));
  }

  if (reportType === 'SALES') {
    sections.push(buildPlans(data));
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>${sections.join('\n')}</body>
</html>`;
}

export function estimatePageCount(data: ReportBuildData, reportType: ReportType): number {
  let count = 3; // cover + overview + summary
  if (data.project.inspectionType === 'SOLAR_PANEL') count += 1;
  count += Math.max(data.anomalies.length, 1);
  if (reportType === 'SURVEY' || reportType === 'SALES') count += 1;
  if (reportType === 'SALES') count += 1;
  return count;
}
