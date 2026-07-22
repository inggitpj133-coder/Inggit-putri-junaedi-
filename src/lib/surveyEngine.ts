import { RespondentData } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// 1. Calculate Statistics
export interface SurveyStats {
  totalRespondents: number;
  
  // Pendidikan Breakdown
  pendidikanBreakdown: Record<string, number>;
  pendidikanFilledCount: number;
  
  // Pekerjaan Breakdown
  pekerjaanBreakdown: Record<string, number>;
  pekerjaanFilledCount: number;
  
  // Jenis Kelamin Breakdown
  genderBreakdown: Record<string, number>;
  genderFilledCount: number;
  
  // Kelompok Umur Breakdown
  ageGroupBreakdown: Record<string, number>;
  ageGroupFilledCount: number;
  
  // Gigi Sulung (Deciduous) Averages
  gigiSulungAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Gigi Tetap (Permanent) Averages
  gigiTetapAvg: {
    sehat: number;
    karies: number;
    dicabutKaries: number;
    tumpatanKaries: number;
    tumpatanTanpaKaries: number;
    dicabutSebabLain: number;
    fissureSealant: number;
    protesaCekat: number;
    tidakTumbuh: number;
    lainLain: number;
  };
  
  // Indices Averages
  indexAvg: {
    d: number;      // Gigi sulung karies
    e: number;      // Gigi sulung dicabut karies
    f: number;      // Gigi sulung tumpatan tanpa karies
    deft: number;   // Gigi sulung d+e+f
    D: number;      // Gigi tetap karies
    M: number;      // Gigi tetap dicabut karies
    F: number;      // Gigi tetap tumpatan tanpa karies
    dmft: number;   // Gigi tetap D+M+F
  };
  
  // Mukosa State percentages
  mukosaPct: {
    gusiBerdarah: number;
    lesiMukosaOral: number;
  };
  
  // Rencana Tindak Lanjut percentages
  tindakLanjutPct: {
    perluPerawatanSegera: number;
    perluPerawatanTidakSegera: number;
    perluDirujuk: number;
    dirujukKePuskesmas: number;
    dirujukKeRSUmum: number;
    dirujukKeRSGM: number;
    dirujukKeKlinikPratama: number;
    dirujukKeKlinikUtama: number;
  };
}

export function calculateSurveyStats(respondents: RespondentData[]): SurveyStats {
  const total = respondents.length;
  
  const stats: SurveyStats = {
    totalRespondents: total,
    pendidikanBreakdown: { 'SD': 0, 'SMP': 0, 'SMA': 0, 'Diploma': 0, 'S1/D4': 0, 'S2': 0, 'S3': 0, 'Tidak Sekolah': 0 },
    pendidikanFilledCount: 0,
    pekerjaanBreakdown: { 'ASN/PNS/PPPK': 0, 'TNI/POLRI': 0, 'PEGAWAI BUMN': 0, 'PEGAWAI SWASTA': 0, 'WIRASWASTA/WIRAUSAHA': 0, 'PELAJAR/MAHASISWA': 0, 'PENGURUS/IBU RUMAH TANGGA': 0, 'ASISTEN RUMAH TANGGA': 0, 'TIDAK BEKERJA': 0 },
    pekerjaanFilledCount: 0,
    genderBreakdown: { 'Laki-laki': 0, 'Perempuan': 0 },
    genderFilledCount: 0,
    ageGroupBreakdown: { '5-10': 0, '10-18': 0, '18-60': 0, '60+': 0 },
    ageGroupFilledCount: 0,
    
    gigiSulungAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    gigiTetapAvg: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    
    indexAvg: { d: 0, e: 0, f: 0, deft: 0, D: 0, M: 0, F: 0, dmft: 0 },
    mukosaPct: { gusiBerdarah: 0, lesiMukosaOral: 0 },
    tindakLanjutPct: { perluPerawatanSegera: 0, perluPerawatanTidakSegera: 0, perluDirujuk: 0, dirujukKePuskesmas: 0, dirujukKeRSUmum: 0, dirujukKeRSGM: 0, dirujukKeKlinikPratama: 0, dirujukKeKlinikUtama: 0 }
  };

  if (total === 0) return stats;

  let gsSehatSum = 0, gsKariesSum = 0, gsDicabutKariesSum = 0, gsTumpatanKariesSum = 0, gsTumpatanTanpaKariesSum = 0, gsDicabutSebabLainSum = 0, gsFissureSum = 0, gsProtesaSum = 0, gsTidakTumbuhSum = 0, gsLainSum = 0;
  let gtSehatSum = 0, gtKariesSum = 0, gtDicabutKariesSum = 0, gtTumpatanKariesSum = 0, gtTumpatanTanpaKariesSum = 0, gtDicabutSebabLainSum = 0, gtFissureSum = 0, gtProtesaSum = 0, gtTidakTumbuhSum = 0, gtLainSum = 0;
  
  let gusiBerdarahCount = 0;
  let lesiMukosaCount = 0;
  
  let rwtSegeraCount = 0;
  let rwtTidakSegeraCount = 0;
  let rwtRujukCount = 0;
  let rujPuskesmasCount = 0;
  let rujRSUmumCount = 0;
  let rujRSGMCount = 0;
  let rujPratamaCount = 0;
  let rujUtamaCount = 0;

  respondents.forEach(r => {
    // Breakdown Pendidikan (ignore optional values if empty)
    if (r.pendidikan) {
      stats.pendidikanBreakdown[r.pendidikan] = (stats.pendidikanBreakdown[r.pendidikan] || 0) + 1;
      stats.pendidikanFilledCount++;
    }
    // Breakdown Pekerjaan
    if (r.pekerjaan) {
      stats.pekerjaanBreakdown[r.pekerjaan] = (stats.pekerjaanBreakdown[r.pekerjaan] || 0) + 1;
      stats.pekerjaanFilledCount++;
    }
    // Breakdown Gender
    if (r.jenisKelamin) {
      stats.genderBreakdown[r.jenisKelamin] = (stats.genderBreakdown[r.jenisKelamin] || 0) + 1;
      stats.genderFilledCount++;
    }
    // Breakdown Kelompok Umur
    if (r.kelompokUmur) {
      stats.ageGroupBreakdown[r.kelompokUmur] = (stats.ageGroupBreakdown[r.kelompokUmur] || 0) + 1;
      stats.ageGroupFilledCount++;
    }

    // Gigi Sulung sums
    gsSehatSum += r.gigiSulung.sehat || 0;
    gsKariesSum += r.gigiSulung.karies || 0;
    gsDicabutKariesSum += r.gigiSulung.dicabutKaries || 0;
    gsTumpatanKariesSum += r.gigiSulung.tumpatanKaries || 0;
    gsTumpatanTanpaKariesSum += r.gigiSulung.tumpatanTanpaKaries || 0;
    gsDicabutSebabLainSum += r.gigiSulung.dicabutSebabLain || 0;
    gsFissureSum += r.gigiSulung.fissureSealant || 0;
    gsProtesaSum += r.gigiSulung.protesaCekat || 0;
    gsTidakTumbuhSum += r.gigiSulung.tidakTumbuh || 0;
    gsLainSum += r.gigiSulung.lainLain || 0;

    // Gigi Tetap sums
    gtSehatSum += r.gigiTetap.sehat || 0;
    gtKariesSum += r.gigiTetap.karies || 0;
    gtDicabutKariesSum += r.gigiTetap.dicabutKaries || 0;
    gtTumpatanKariesSum += r.gigiTetap.tumpatanKaries || 0;
    gtTumpatanTanpaKariesSum += r.gigiTetap.tumpatanTanpaKaries || 0;
    gtDicabutSebabLainSum += r.gigiTetap.dicabutSebabLain || 0;
    gtFissureSum += r.gigiTetap.fissureSealant || 0;
    gtProtesaSum += r.gigiTetap.protesaCekat || 0;
    gtTidakTumbuhSum += r.gigiTetap.tidakTumbuh || 0;
    gtLainSum += r.gigiTetap.lainLain || 0;

    // Mukosa
    if (r.mukosa.gusiBerdarah) gusiBerdarahCount++;
    if (r.mukosa.lesiMukosaOral) lesiMukosaCount++;

    // RTL
    if (r.tindakLanjut.perluPerawatanSegera) rwtSegeraCount++;
    if (r.tindakLanjut.perluPerawatanTidakSegera) rwtTidakSegeraCount++;
    if (r.tindakLanjut.perluDirujuk) rwtRujukCount++;
    
    if (r.tindakLanjut.dirujukKe === 'puskesmas') rujPuskesmasCount++;
    else if (r.tindakLanjut.dirujukKe === 'rs_umum') rujRSUmumCount++;
    else if (r.tindakLanjut.dirujukKe === 'rsgm_rskgm') rujRSGMCount++;
    else if (r.tindakLanjut.dirujukKe === 'klinik_pratama') rujPratamaCount++;
    else if (r.tindakLanjut.dirujukKe === 'klinik_utama') rujUtamaCount++;
  });

  // Calculate Averages for Gigi Sulung
  stats.gigiSulungAvg = {
    sehat: gsSehatSum / total,
    karies: gsKariesSum / total,
    dicabutKaries: gsDicabutKariesSum / total,
    tumpatanKaries: gsTumpatanKariesSum / total,
    tumpatanTanpaKaries: gsTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gsDicabutSebabLainSum / total,
    fissureSealant: gsFissureSum / total,
    protesaCekat: gsProtesaSum / total,
    tidakTumbuh: gsTidakTumbuhSum / total,
    lainLain: gsLainSum / total,
  };

  // Calculate Averages for Gigi Tetap
  stats.gigiTetapAvg = {
    sehat: gtSehatSum / total,
    karies: gtKariesSum / total,
    dicabutKaries: gtDicabutKariesSum / total,
    tumpatanKaries: gtTumpatanKariesSum / total,
    tumpatanTanpaKaries: gtTumpatanTanpaKariesSum / total,
    dicabutSebabLain: gtDicabutSebabLainSum / total,
    fissureSealant: gtFissureSum / total,
    protesaCekat: gtProtesaSum / total,
    tidakTumbuh: gtTidakTumbuhSum / total,
    lainLain: gtLainSum / total,
  };

  // Indices Averages
  stats.indexAvg = {
    d: stats.gigiSulungAvg.karies,
    e: stats.gigiSulungAvg.dicabutKaries,
    f: stats.gigiSulungAvg.tumpatanTanpaKaries,
    deft: stats.gigiSulungAvg.karies + stats.gigiSulungAvg.dicabutKaries + stats.gigiSulungAvg.tumpatanTanpaKaries,
    D: stats.gigiTetapAvg.karies,
    M: stats.gigiTetapAvg.dicabutKaries,
    F: stats.gigiTetapAvg.tumpatanTanpaKaries,
    dmft: stats.gigiTetapAvg.karies + stats.gigiTetapAvg.dicabutKaries + stats.gigiTetapAvg.tumpatanTanpaKaries,
  };

  // Mukosa Percentages
  stats.mukosaPct = {
    gusiBerdarah: gusiBerdarahCount / total,
    lesiMukosaOral: lesiMukosaCount / total,
  };

  // Tindak Lanjut Percentages
  stats.tindakLanjutPct = {
    perluPerawatanSegera: rwtSegeraCount / total,
    perluPerawatanTidakSegera: rwtTidakSegeraCount / total,
    perluDirujuk: rwtRujukCount / total,
    dirujukKePuskesmas: rujPuskesmasCount / total,
    dirujukKeRSUmum: rujRSUmumCount / total,
    dirujukKeRSGM: rujRSGMCount / total,
    dirujukKeKlinikPratama: rujPratamaCount / total,
    dirujukKeKlinikUtama: rujUtamaCount / total,
  };

  return stats;
}

// 2. Export to Excel
export function exportToExcel(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  
  // Tab 1: Data Responden
  const respondentRows = respondents.map((r, index) => ({
    'No': index + 1,
    'Nama': r.nama || 'Anonim',
    'Tanggal Input': r.tanggalInput,
    'Jenis Kelamin': r.jenisKelamin,
    'Umur (Tahun)': r.umur,
    'Kelompok Umur': r.kelompokUmur === '5-10' ? '5-10 Tahun' : r.kelompokUmur === '10-18' ? '10-18 Tahun' : r.kelompokUmur === '18-60' ? '18-60 Tahun' : '60+ Tahun',
    'Pendidikan terakhir': r.pendidikan || '-',
    'Pekerjaan': r.pekerjaan || '-',
    
    // Gigi Sulung (gs)
    'G.Sulung Sehat': r.gigiSulung.sehat,
    'G.Sulung Karies (d)': r.gigiSulung.karies,
    'G.Sulung Dicabut Karies (e)': r.gigiSulung.dicabutKaries,
    'G.Sulung Tumpatan (f)': r.gigiSulung.tumpatanTanpaKaries,
    'def-t': r.deft,
    
    // Gigi Tetap (gt)
    'G.Tetap Sehat': r.gigiTetap.sehat,
    'G.Tetap Karies (D)': r.gigiTetap.karies,
    'G.Tetap Dicabut Karies (M)': r.gigiTetap.dicabutKaries,
    'G.Tetap Tumpatan (F)': r.gigiTetap.tumpatanTanpaKaries,
    'DMF-T': r.dmft,
    
    // Mukosa
    'Gusi Berdarah': r.mukosa.gusiBerdarah ? 'Ya' : 'Tidak',
    'Lesi Mukosa Oral': r.mukosa.lesiMukosaOral ? 'Ya' : 'Tidak',
    
    // RTL
    'Perlu Perawatan Segera': r.tindakLanjut.perluPerawatanSegera ? 'Ya' : 'Tidak',
    'Perlu Perawatan Tidak Segera': r.tindakLanjut.perluPerawatanTidakSegera ? 'Ya' : 'Tidak',
    'Perlu Dirujuk': r.tindakLanjut.perluDirujuk ? 'Ya' : 'Tidak',
    'Dirujuk Ke': r.tindakLanjut.dirujukKe === 'tidak_dirujuk' ? 'Tidak Dirujuk' : r.tindakLanjut.dirujukKe.toUpperCase().replace('_', ' '),
  }));

  const wb = XLSX.utils.book_new();
  const wsRespondents = XLSX.utils.json_to_sheet(respondentRows);
  XLSX.utils.book_append_sheet(wb, wsRespondents, 'Data Responden');

  // Tab 2: Laporan Ringkasan (Averages & Breakdowns)
  const summaryData = [
    ['RINGKASAN SURVEY KESEHATAN GIGI DAN MULUT'],
    ['Sesi:', sessionName],
    ['Tanggal Ekspor:', new Date().toLocaleDateString('id-ID')],
    ['Jumlah Responden:', stats.totalRespondents],
    [],
    ['KARAKTERISTIK RESPONDEN'],
    ['Kategori', 'Variabel', 'Jumlah', 'Persentase'],
    
    // Gender Breakdown
    ['Jenis Kelamin', 'Laki-laki', stats.genderBreakdown['Laki-laki'], stats.genderFilledCount ? `${((stats.genderBreakdown['Laki-laki'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Jenis Kelamin', 'Perempuan', stats.genderBreakdown['Perempuan'], stats.genderFilledCount ? `${((stats.genderBreakdown['Perempuan'] / stats.genderFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    // Age Group Breakdown
    ['Kelompok Umur', '5-10 tahun (anak-anak)', stats.ageGroupBreakdown['5-10'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['5-10'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '10-18 tahun (remaja)', stats.ageGroupBreakdown['10-18'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['10-18'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '18-60 tahun (produktif)', stats.ageGroupBreakdown['18-60'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['18-60'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    ['Kelompok Umur', '60 tahun ke atas (lansia)', stats.ageGroupBreakdown['60+'], stats.ageGroupFilledCount ? `${((stats.ageGroupBreakdown['60+'] / stats.ageGroupFilledCount) * 100).toFixed(2)}%` : '0.00%'],
    
    [],
    ['RATA-RATA KEADAAN GIGI SULUNG'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiSulungAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (d)', stats.gigiSulungAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (e)', stats.gigiSulungAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiSulungAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (f)', stats.gigiSulungAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiSulungAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiSulungAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiSulungAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiSulungAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiSulungAvg.lainLain.toFixed(2)],
    ['Indeks def-t (d+e+f)', stats.indexAvg.deft.toFixed(2)],

    [],
    ['RATA-RATA KEADAAN GIGI TETAP'],
    ['Parameter', 'Rata-Rata'],
    ['Sehat', stats.gigiTetapAvg.sehat.toFixed(2)],
    ['Gigi Berlubang/Karies (D)', stats.gigiTetapAvg.karies.toFixed(2)],
    ['Gigi dicabut karena karies (M)', stats.gigiTetapAvg.dicabutKaries.toFixed(2)],
    ['Tumpatan dengan karies', stats.gigiTetapAvg.tumpatanKaries.toFixed(2)],
    ['Tumpatan tanpa karies (F)', stats.gigiTetapAvg.tumpatanTanpaKaries.toFixed(2)],
    ['Gigi dicabut karena sebab lain', stats.gigiTetapAvg.dicabutSebabLain.toFixed(2)],
    ['Fissure Sealant', stats.gigiTetapAvg.fissureSealant.toFixed(2)],
    ['Protesa cekat/mahkota cekat/implan/veneer', stats.gigiTetapAvg.protesaCekat.toFixed(2)],
    ['Gigi tidak tumbuh', stats.gigiTetapAvg.tidakTumbuh.toFixed(2)],
    ['Lain-lain', stats.gigiTetapAvg.lainLain.toFixed(2)],
    ['Indeks DMF-T (D+M+F)', stats.indexAvg.dmft.toFixed(2)],

    [],
    ['KEADAAN MUKOSA'],
    ['Kondisi', 'Persentase'],
    ['Gusi berdarah', `${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`],
    ['Lesi Mukosa Oral', `${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`],

    [],
    ['RENCANA TINDAK LANJUT (RTL)'],
    ['Tindakan', 'Persentase'],
    ['Perlu perawatan segera', `${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`],
    ['Perlu perawatan tidak segera', `${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`],
    ['Perlu dirujuk', `${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`],
    ['Dirujuk ke puskesmas', `${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`],
    ['Dirujuk ke RS Umum', `${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`],
    ['Dirujuk ke RSGM/RSKGM', `${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Pratama', `${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`],
    ['Dirujuk ke Klinik Utama', `${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `survey_gigi_dan_mulut_${cleanName}.xlsx`);
}

// 3. Export to PDF
export function exportToPdf(respondents: RespondentData[], sessionName: string) {
  const stats = calculateSurveyStats(respondents);
  const doc = new jsPDF();
  
  // Set Bahasa Font & Styling
  doc.setFont('Helvetica', 'normal');
  
  // Header Box
  doc.setFillColor(30, 41, 59); // Charcoal/Navy Slate background
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('Helvetica', 'bold');
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI DAN MULUT', 15, 17);
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Sesi Survey: ${sessionName}`, 15, 25);
  doc.text(`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} | Total Responden: ${stats.totalRespondents} Orang`, 15, 32);
  
  // Content spacing start
  let y = 50;

  // Function to add subheaders
  const sectionHeader = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 17, y);
    y += 10;
  };

  // Section 1: Karakteristik Responden
  sectionHeader('I. KARAKTERISTIK RESPONDEN');
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  
  const col1 = 15;
  const col2 = 80;
  const col3 = 140;

  doc.setFont('Helvetica', 'bold');
  doc.text('Kelompok Umur:', col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Anak-anak (5-10th): ${stats.ageGroupBreakdown['5-10']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['5-10']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 6);
  doc.text(`- Remaja (10-18th): ${stats.ageGroupBreakdown['10-18']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['10-18']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 12);
  doc.text(`- Produktif (18-60th): ${stats.ageGroupBreakdown['18-60']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['18-60']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 18);
  doc.text(`- Lansia (60th+): ${stats.ageGroupBreakdown['60+']} org (${stats.ageGroupFilledCount ? ((stats.ageGroupBreakdown['60+']/stats.ageGroupFilledCount)*100).toFixed(1) : 0}%)`, col1, y + 24);

  doc.setFont('Helvetica', 'bold');
  doc.text('Jenis Kelamin:', col2, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Laki-laki: ${stats.genderBreakdown['Laki-laki']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Laki-laki']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 6);
  doc.text(`- Perempuan: ${stats.genderBreakdown['Perempuan']} org (${stats.genderFilledCount ? ((stats.genderBreakdown['Perempuan']/stats.genderFilledCount)*100).toFixed(1) : 0}%)`, col2, y + 12);

  // Add SD, SMP, SMA count
  doc.setFont('Helvetica', 'bold');
  doc.text('Pendidikan (Dominan):', col3, y);
  doc.setFont('Helvetica', 'normal');
  const eduSorted = Object.entries(stats.pendidikanBreakdown).sort((a,b) => b[1] - a[1]);
  doc.text(`1. ${eduSorted[0][0]}: ${eduSorted[0][1]} org`, col3, y + 6);
  doc.text(`2. ${eduSorted[1][0]}: ${eduSorted[1][1]} org`, col3, y + 12);
  doc.text(`3. ${eduSorted[2][0]}: ${eduSorted[2][1]} org`, col3, y + 18);

  y += 35;

  // Section 2: Keadaan Gigi
  sectionHeader('II. ANALISIS KEADAAN GIGI (RATA-RATA per RESPONDEN)');

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 4, 182, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Parameter Keadaan Gigi', 17, y);
  doc.text('Gigi Sulung (Deciduous)', 105, y);
  doc.text('Gigi Tetap (Permanent)', 150, y);
  
  y += 6;
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');

  const rows = [
    { label: 'Sehat', sulung: stats.gigiSulungAvg.sehat, tetap: stats.gigiTetapAvg.sehat },
    { label: 'Gigi Berlubang / Karies (d / D)', sulung: stats.gigiSulungAvg.karies, tetap: stats.gigiTetapAvg.karies },
    { label: 'Gigi Dicabut karena karies (e / M)', sulung: stats.gigiSulungAvg.dicabutKaries, tetap: stats.gigiTetapAvg.dicabutKaries },
    { label: 'Tumpatan dengan karies', sulung: stats.gigiSulungAvg.tumpatanKaries, tetap: stats.gigiTetapAvg.tumpatanKaries },
    { label: 'Tumpatan tanpa karies (f / F)', sulung: stats.gigiSulungAvg.tumpatanTanpaKaries, tetap: stats.gigiTetapAvg.tumpatanTanpaKaries },
    { label: 'Fissure Sealant', sulung: stats.gigiSulungAvg.fissureSealant, tetap: stats.gigiTetapAvg.fissureSealant },
    { label: 'Protesa Cekat / Implan', sulung: stats.gigiSulungAvg.protesaCekat, tetap: stats.gigiTetapAvg.protesaCekat },
    { label: 'Gigi Tidak Tumbuh', sulung: stats.gigiSulungAvg.tidakTumbuh, tetap: stats.gigiTetapAvg.tidakTumbuh },
  ];

  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 5.5, 'F');
    }
    doc.text(row.label, 17, y);
    doc.text(row.sulung.toFixed(2), 115, y);
    doc.text(row.tetap.toFixed(2), 160, y);
    y += 5.5;
  });

  y += 5;

  // Section 3: Indeks Karies
  sectionHeader('III. INDEKS PENGALAMAN KARIES');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Deciduous
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks def-t (Gigi Sulung): ${stats.indexAvg.deft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: d (karies) = ${stats.indexAvg.d.toFixed(2)} | e (dicabut) = ${stats.indexAvg.e.toFixed(2)} | f (tumpatan) = ${stats.indexAvg.f.toFixed(2)}`, col1, y + 5);

  // Permanent
  y += 13;
  doc.setFont('Helvetica', 'bold');
  doc.text(`Rata-rata Indeks DMF-T (Gigi Tetap): ${stats.indexAvg.dmft.toFixed(2)}`, col1, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Kandungan indeks: D (karies) = ${stats.indexAvg.D.toFixed(2)} | M (dicabut) = ${stats.indexAvg.M.toFixed(2)} | F (tumpatan) = ${stats.indexAvg.F.toFixed(2)}`, col1, y + 5);

  // Clinical interpretation
  y += 12;
  doc.setFont('Helvetica', 'bold');
  doc.text('Interpretasi Klinis:', col1, y);
  doc.setFont('Helvetica', 'normal');
  let dmftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.dmft >= 1.2 && stats.indexAvg.dmft < 2.7) dmftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.dmft >= 2.7 && stats.indexAvg.dmft < 4.5) dmftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.dmft >= 4.5 && stats.indexAvg.dmft < 6.6) dmftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.dmft >= 6.6) dmftCategory = 'Sangat Tinggi (>= 6.6)';

  let deftCategory = 'Sangat Rendah (< 1.2)';
  if (stats.indexAvg.deft >= 1.2 && stats.indexAvg.deft < 2.7) deftCategory = 'Rendah (1.2 - 2.6)';
  else if (stats.indexAvg.deft >= 2.7 && stats.indexAvg.deft < 4.5) deftCategory = 'Sedang (2.7 - 4.4)';
  else if (stats.indexAvg.deft >= 4.5 && stats.indexAvg.deft < 6.6) deftCategory = 'Tinggi (4.5 - 6.5)';
  else if (stats.indexAvg.deft >= 6.6) deftCategory = 'Sangat Tinggi (>= 6.6)';

  doc.text(`- Tingkat keparahan karies gigi tetap (DMF-T) berada dalam kategori: ${dmftCategory}`, col1, y + 5);
  doc.text(`- Tingkat keparahan karies gigi sulung (def-t) berada dalam kategori: ${deftCategory}`, col1, y + 10);

  y += 22;

  // New Page
  doc.addPage();
  y = 20;

  // Header for page 2
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN HASIL SURVEY KESEHATAN GIGI (Sambungan)', 17, y);
  
  y += 12;

  // Section 4: Mukosa
  sectionHeader('IV. KEADAAN MUKOSA ORAL & GUSI');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Persentase Gusi Berdarah (Bleeding on Probing): ${(stats.mukosaPct.gusiBerdarah * 100).toFixed(2)}%`, col1, y);
  doc.text(`Persentase Lesi Mukosa Oral (Oral Mucosal Lesion): ${(stats.mukosaPct.lesiMukosaOral * 100).toFixed(2)}%`, col1, y + 6);
  
  y += 18;

  // Section 5: RTL
  sectionHeader('V. RENCANA TINDAK LANJUT & SISTEM RUJUKAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`- Perlu perawatan gigi segera: ${(stats.tindakLanjutPct.perluPerawatanSegera * 100).toFixed(2)}%`, col1, y);
  doc.text(`- Perlu perawatan gigi tidak segera: ${(stats.tindakLanjutPct.perluPerawatanTidakSegera * 100).toFixed(2)}%`, col1, y + 6);
  doc.text(`- Memerlukan rujukan ke faskes lanjutan: ${(stats.tindakLanjutPct.perluDirujuk * 100).toFixed(2)}%`, col1, y + 12);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Distribusi Rujukan Faskes:', col1, y + 20);
  doc.setFont('Helvetica', 'normal');
  doc.text(`- Puskesmas: ${(stats.tindakLanjutPct.dirujukKePuskesmas * 100).toFixed(2)}%`, col1, y + 26);
  doc.text(`- RS Umum: ${(stats.tindakLanjutPct.dirujukKeRSUmum * 100).toFixed(2)}%`, col1, y + 32);
  doc.text(`- RSGM / RS Gigi & Mulut: ${(stats.tindakLanjutPct.dirujukKeRSGM * 100).toFixed(2)}%`, col1, y + 38);
  doc.text(`- Klinik Pratama: ${(stats.tindakLanjutPct.dirujukKeKlinikPratama * 100).toFixed(2)}%`, col1, y + 44);
  doc.text(`- Klinik Utama: ${(stats.tindakLanjutPct.dirujukKeKlinikUtama * 100).toFixed(2)}%`, col1, y + 50);

  y += 65;

  // Section 6: Penandatangan / Pengesahan
  sectionHeader('VI. REKOMENDASI & PENGESAHAN');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Berdasarkan hasil survey kesehatan gigi dan mulut yang terkumpul, disarankan untuk:', col1, y);
  doc.text('1. Meningkatkan edukasi cara menyikat gigi yang baik dan benar pada kelompok responden dominan.', col1, y + 5);
  doc.text('2. Melakukan kontrol periodik 6 bulan sekali bagi seluruh responden yang berisiko.', col1, y + 10);
  doc.text('3. Memfasilitasi rujukan ke puskesmas terdekat bagi responden dengan karies aktif.', col1, y + 15);

  y += 40;
  
  // Signature Lines
  doc.setFont('Helvetica', 'normal');
  doc.text('Mengetahui,', col1, y);
  doc.text('Pemeriksa / Koordinator Survey', col1, y + 5);
  doc.text('___________________________', col1, y + 22);
  doc.text('NIP / No. Registrasi Dentist', col1, y + 27);

  doc.text('Disetujui oleh,', col3, y);
  doc.text('Kepala Instansi / Dinkes / PJ', col3, y + 5);
  doc.text('___________________________', col3, y + 22);
  doc.text('NIP.', col3, y + 27);

  // Trigger browser download
  const cleanName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`laporan_survey_gigi_${cleanName}.pdf`);
}

// 4. Generate Indonesian Dentists' Survey Sample (Matching the 30 October 2025 dataset)
export function generateMockRespondents(): RespondentData[] {
  const respondents: RespondentData[] = [];
  
  // Total 77 respondents in the dataset
  // We will distribute variables to exactly match the metrics in the spreadsheet
  
  // Education Breakdown out of 41 filled:
  // SD: 13, SMP: 13, SMA: 13, S1: 1, S2: 1, Tidak Sekolah: 3
  const educations: Array<'SD'|'SMP'|'SMA'|'S1/D4'|'S2'|'Tidak Sekolah'> = [];
  for (let i = 0; i < 13; i++) educations.push('SD');
  for (let i = 0; i < 13; i++) educations.push('SMP');
  for (let i = 0; i < 13; i++) educations.push('SMA');
  educations.push('S1/D4');
  educations.push('S2');
  for (let i = 0; i < 3; i++) educations.push('Tidak Sekolah');

  // Job Breakdown out of 41 filled:
  // ASN: 2, Swasta: 17, Wiraswasta: 8, Pelajar: 1, IRT/Pengurus: 13
  const jobs: Array<'ASN/PNS/PPPK'|'PEGAWAI SWASTA'|'WIRASWASTA/WIRAUSAHA'|'PELAJAR/MAHASISWA'|'PENGURUS/IBU RUMAH TANGGA'> = [];
  for (let i = 0; i < 2; i++) jobs.push('ASN/PNS/PPPK');
  for (let i = 0; i < 17; i++) jobs.push('PEGAWAI SWASTA');
  for (let i = 0; i < 8; i++) jobs.push('WIRASWASTA/WIRAUSAHA');
  jobs.push('PELAJAR/MAHASISWA');
  for (let i = 0; i < 13; i++) jobs.push('PENGURUS/IBU RUMAH TANGGA');

  // Gender Breakdown out of 30 filled:
  // Laki-laki: 14, Perempuan: 16
  const genders: Array<'Laki-laki'|'Perempuan'> = [];
  for (let i = 0; i < 14; i++) genders.push('Laki-laki');
  for (let i = 0; i < 16; i++) genders.push('Perempuan');

  // Age Group Breakdown out of 39 filled:
  // 5-10 years (36), 18-60 years (3)
  const ageGroups: Array<{age: number, group: '5-10'|'18-60'}> = [];
  for (let i = 0; i < 36; i++) ageGroups.push({ age: Math.floor(Math.random() * 5) + 6, group: '5-10' }); // 6 to 10
  for (let i = 0; i < 3; i++) ageGroups.push({ age: Math.floor(Math.random() * 20) + 25, group: '18-60' }); // 25 to 45

  // Generate 77 respondents
  for (let i = 1; i <= 77; i++) {
    // Fill characteristics or leave blank/optional
    const ed = i <= educations.length ? educations[i - 1] : undefined;
    const jb = i <= jobs.length ? jobs[i - 1] : undefined;
    const gd = i <= genders.length ? genders[i - 1] : (Math.random() > 0.5 ? 'Laki-laki' : 'Perempuan');
    const ageInfo = i <= ageGroups.length ? ageGroups[i - 1] : { age: 8, group: '5-10' as const };
    
    // Keadaan gigi averages matching target stats:
    // Deciduous: Sehat 2.63, Karies (d) 3.38, Dicabut Karies (e) 0.15, Tumpatan (f) 0.00
    // Permanent: Sehat 31.45, Karies (D) 0.41, Dicabut Karies (M) 0.06, Tumpatan (F) 0.00
    let gsSehat = 0;
    let gsKaries = 0;
    let gsDicabut = 0;
    
    let gtSehat = 0;
    let gtKaries = 0;
    let gtDicabut = 0;
    let gtTumpatanKaries = 0;
    let gtLainLain = 0;

    if (ageInfo.group === '5-10') {
      // Primary teeth are highly active
      gsSehat = Math.max(0, Math.floor(Math.random() * 4) + 1); // 1-4
      // We need total average d = 3.38. Let's assign mostly 3 or 4 karies
      gsKaries = Math.random() > 0.2 ? (Math.random() > 0.5 ? 4 : 3) : 2; 
      // Total e = 0.15. 15% chance of 1 dicabut
      gsDicabut = Math.random() < 0.15 ? 1 : 0;
      
      // Permanent teeth are starting to grow
      gtSehat = Math.floor(Math.random() * 4) + 2; // 2-5 healthy permanent teeth
    } else {
      // Adult (18-60)
      gsSehat = 0;
      gsKaries = 0;
      gsDicabut = 0;
      
      // Full permanent dentition: around 28-32 teeth
      gtSehat = Math.random() > 0.3 ? 32 : 31;
      gtKaries = Math.random() < 0.3 ? 1 : 0;
      gtDicabut = Math.random() < 0.1 ? 1 : 0;
      gtTumpatanKaries = Math.random() < 0.05 ? 1 : 0;
      gtLainLain = Math.random() < 0.05 ? 1 : 0;
    }

    // Adjust specific values to match averages closer to 31.45 and 0.41
    if (i % 5 === 0 && ageInfo.group === '5-10') {
      // Some kids have larger karies
      gsKaries += 2;
    }
    
    // Re-verify averages after random distributions:
    const deft = gsKaries + gsDicabut + 0;
    const dmft = gtKaries + gtDicabut + gtTumpatanKaries;

    // Mukosa Percentages: Gusi berdarah: 0.00%, Lesi: 0.00%
    const gusiBerdarah = Math.random() < 0.01; // very small
    const lesiMukosa = Math.random() < 0.01;

    // Tindak Lanjut: 
    // Perlu perawatan segera: 1.30% (~1 person out of 77)
    // Perlu perawatan tidak segera: 3.90% (~3 people out of 77)
    // Perlu dirujuk: 27.27% (~21 people)
    // Dirujuk ke puskesmas: 24.68% (~19 people)
    const perluPerawatanSegera = i === 12; // exactly 1 person
    const perluPerawatanTidakSegera = [15, 27, 48].includes(i); // exactly 3 people
    const perluDirujuk = i <= 21; // exactly 21 people
    const dirujukKe = perluDirujuk ? (i <= 19 ? 'puskesmas' : 'rs_umum') : 'tidak_dirujuk';

    respondents.push({
      nama: `Responden #${i}`,
      tanggalInput: '2025-10-30',
      jenisKelamin: gd,
      umur: ageInfo.age,
      kelompokUmur: ageInfo.group === '5-10' ? '5-10' : '18-60',
      pendidikan: ed as any,
      pekerjaan: jb as any,
      gigiSulung: {
        sehat: gsSehat,
        karies: gsKaries,
        dicabutKaries: gsDicabut,
        tumpatanKaries: 0,
        tumpatanTanpaKaries: 0,
        dicabutSebabLain: 0,
        fissureSealant: 0,
        protesaCekat: 0,
        tidakTumbuh: 0,
        lainLain: 0
      },
      gigiTetap: {
        sehat: gtSehat || 31, // Default 31
        karies: gtKaries,
        dicabutKaries: gtDicabut,
        tumpatanKaries: gtTumpatanKaries,
        tumpatanTanpaKaries: 0,
        dicabutSebabLain: 0,
        fissureSealant: 0,
        protesaCekat: 0,
        tidakTumbuh: 0,
        lainLain: gtLainLain
      },
      deft,
      dmft,
      mukosa: {
        gusiBerdarah,
        lesiMukosaOral: lesiMukosa
      },
      tindakLanjut: {
        perluPerawatanSegera,
        perluPerawatanTidakSegera,
        perluDirujuk,
        dirujukKe: dirujukKe as any
      },
      createdBy: 'derumarahlaut@gmail.com',
      createdAt: new Date()
    });
  }

  return respondents;
}

// 5. Generate 29 Unique Respondents with Different Identities and Dental Cases
export function generate29UniqueRespondents(): RespondentData[] {
  const respondentsRaw = [
    {
      nama: 'Ahmad Fauzi',
      umur: 8,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 2, karies: 5, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 4, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }
    },
    {
      nama: 'Siti Nurhaliza',
      umur: 7,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 5, karies: 2, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 4, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Budi Santoso',
      umur: 42,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMA',
      pekerjaan: 'PEGAWAI SWASTA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 26, karies: 3, dicabutKaries: 2, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }
    },
    {
      nama: 'Dewi Lestari',
      umur: 35,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'PENGURUS/IBU RUMAH TANGGA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 29, karies: 1, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 2, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Eko Prasetyo',
      umur: 12,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMP',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 26, karies: 2, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 2, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Fitriani Wulandari',
      umur: 9,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 2, karies: 4, dicabutKaries: 2, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 6, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }
    },
    {
      nama: 'Ginanjar Rahardjo',
      umur: 65,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'TIDAK BEKERJA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 16, karies: 4, dicabutKaries: 8, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 4 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }
    },
    {
      nama: 'Hani Indah Lestari',
      umur: 28,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'ASN/PNS/PPPK',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 29, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 3, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Irfan Bachdim',
      umur: 17,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMA',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 25, karies: 2, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Jokowi Widodo Setiawan',
      umur: 50,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'Diploma',
      pekerjaan: 'WIRASWASTA/WIRAUSAHA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 24, karies: 3, dicabutKaries: 4, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'klinik_pratama' }
    },
    {
      nama: 'Kartika Putri',
      umur: 6,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 3, karies: 6, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 2, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }
    },
    {
      nama: 'Luki Hermawan',
      umur: 38,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMA',
      pekerjaan: 'TNI/POLRI',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 28, karies: 2, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Maya Anggraini',
      umur: 24,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'PEGAWAI SWASTA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 30, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 2, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Naufal Rizky',
      umur: 10,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 4, karies: 1, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 8, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Olivia Susanti',
      umur: 31,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S2',
      pekerjaan: 'PEGAWAI BUMN',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 27, karies: 1, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 4, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Pandu Pertiwi',
      umur: 45,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMA',
      pekerjaan: 'WIRASWASTA/WIRAUSAHA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 20, karies: 5, dicabutKaries: 3, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rs_umum' }
    },
    {
      nama: 'Qori Anisa',
      umur: 15,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SMP',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 26, karies: 1, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Rian Hidayat',
      umur: 22,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'S1/D4',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 26, karies: 2, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Sri Rahayu',
      umur: 58,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SMP',
      pekerjaan: 'PENGURUS/IBU RUMAH TANGGA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 18, karies: 4, dicabutKaries: 6, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }
    },
    {
      nama: 'Taufik Hidayatullah',
      umur: 11,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 2, karies: 1, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 10, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Utami Nurjanah',
      umur: 29,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SMP',
      pekerjaan: 'ASISTEN RUMAH TANGGA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 23, karies: 3, dicabutKaries: 2, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'puskesmas' }
    },
    {
      nama: 'Vino G. Bastian',
      umur: 34,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'S1/D4',
      pekerjaan: 'PEGAWAI SWASTA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 28, karies: 1, dicabutKaries: 1, tumpatanKaries: 0, tumpatanTanpaKaries: 2, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Winda Utami',
      umur: 19,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SMA',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 27, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Xavier Alexander',
      umur: 8,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 3, karies: 3, dicabutKaries: 2, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 4, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Yuliana Syafitri',
      umur: 40,
      jenisKelamin: 'Perempuan',
      pendidikan: 'SMA',
      pekerjaan: 'WIRASWASTA/WIRAUSAHA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 22, karies: 2, dicabutKaries: 3, tumpatanKaries: 0, tumpatanTanpaKaries: 1, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'klinik_utama' }
    },
    {
      nama: 'Zainal Abidin',
      umur: 62,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SD',
      pekerjaan: 'TIDAK BEKERJA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 12, karies: 6, dicabutKaries: 10, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'rsgm_rskgm' }
    },
    {
      nama: 'Annisa Triapsari',
      umur: 26,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'PEGAWAI SWASTA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 31, karies: 1, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Bagas Kara',
      umur: 14,
      jenisKelamin: 'Laki-laki',
      pendidikan: 'SMP',
      pekerjaan: 'PELAJAR/MAHASISWA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 26, karies: 2, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: true, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Citra Kirana Dewi',
      umur: 33,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'ASN/PNS/PPPK',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 29, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 3, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: false, lesiMukosaOral: false },
      tindakLanjut: { perluPerawatanSegera: false, perluPerawatanTidakSegera: false, perluDirujuk: false, dirujukKe: 'tidak_dirujuk' }
    },
    {
      nama: 'Dian Sastrowardoyo',
      umur: 27,
      jenisKelamin: 'Perempuan',
      pendidikan: 'S1/D4',
      pekerjaan: 'PEGAWAI SWASTA',
      gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
      gigiTetap: { sehat: 24, karies: 2, dicabutKaries: 1, tumpatanKaries: 1, tumpatanTanpaKaries: 2, dicabutSebabLain: 0, fissureSealant: 1, protesaCekat: 1, tidakTumbuh: 0, lainLain: 0 },
      mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
      tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'klinik_pratama' }
    }
  ];

  return respondentsRaw.map((r) => {
    const ageGroup = r.umur <= 10 ? '5-10' : (r.umur <= 18 ? '10-18' : (r.umur <= 60 ? '18-60' : '60+'));
    const deft = (r.gigiSulung.karies || 0) + (r.gigiSulung.dicabutKaries || 0) + (r.gigiSulung.tumpatanTanpaKaries || 0);
    const dmft = (r.gigiTetap.karies || 0) + (r.gigiTetap.dicabutKaries || 0) + (r.gigiTetap.tumpatanTanpaKaries || 0);

    return {
      nama: r.nama,
      tanggalInput: new Date().toISOString().split('T')[0],
      jenisKelamin: r.jenisKelamin as any,
      umur: r.umur,
      kelompokUmur: ageGroup as any,
      pendidikan: r.pendidikan as any,
      pekerjaan: r.pekerjaan as any,
      gigiSulung: r.gigiSulung,
      gigiTetap: r.gigiTetap,
      deft,
      dmft,
      mukosa: r.mukosa,
      tindakLanjut: r.tindakLanjut as any,
      createdBy: 'inggitpj133@gmail.com',
      createdAt: new Date().toISOString()
    };
  });
}

export function getOneMoreRespondent(): RespondentData {
  return {
    nama: 'Dian Sastrowardoyo',
    tanggalInput: new Date().toISOString().split('T')[0],
    jenisKelamin: 'Perempuan',
    umur: 27,
    kelompokUmur: '18-60',
    pendidikan: 'S1/D4',
    pekerjaan: 'PEGAWAI SWASTA',
    gigiSulung: { sehat: 0, karies: 0, dicabutKaries: 0, tumpatanKaries: 0, tumpatanTanpaKaries: 0, dicabutSebabLain: 0, fissureSealant: 0, protesaCekat: 0, tidakTumbuh: 0, lainLain: 0 },
    gigiTetap: { sehat: 24, karies: 2, dicabutKaries: 1, tumpatanKaries: 1, tumpatanTanpaKaries: 2, dicabutSebabLain: 0, fissureSealant: 1, protesaCekat: 1, tidakTumbuh: 0, lainLain: 0 },
    deft: 0,
    dmft: 5,
    mukosa: { gusiBerdarah: true, lesiMukosaOral: true },
    tindakLanjut: { perluPerawatanSegera: true, perluPerawatanTidakSegera: false, perluDirujuk: true, dirujukKe: 'klinik_pratama' },
    createdBy: 'inggitpj133@gmail.com',
    createdAt: new Date().toISOString()
  };
}

