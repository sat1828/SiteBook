import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const FONT_PATH = undefined;

export const generateBOCWMusterRoll = async (site, workers, month, year, contractorName, contractorBOCWRegNo) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('BOCW Muster Roll', { align: 'center' });
      doc.fontSize(10).text(`(Form prescribed under BOCW (RECS) Central Rules, 1998)`, { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(11);
      doc.text(`Name of Establishment: ${site.name}`);
      doc.text(`Address of Establishment: ${site.address || site.location?.address || 'N/A'}`);
      doc.text(`Name of Contractor: ${contractorName || 'N/A'}`);
      doc.text(`BOCW Registration No: ${contractorBOCWRegNo || 'N/A'}`);
      doc.text(`Month/Year: ${month}/${year}`);
      doc.text(`Date of Generation: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);

      doc.fontSize(8);
      const headers = [
        'Sl No', 'Worker Name', "Father's Name", 'Designation',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
        '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31',
        'Total Days', 'Rate', 'Total Wages', 'Signature',
      ];

      const colWidths = {
        'Sl No': 12, 'Worker Name': 45, "Father's Name": 40, 'Designation': 30,
      };

      const dateColW = 8;
      const totalDaysW = 12;
      const rateW = 14;
      const totalWagesW = 18;
      const signW = 20;

      const availableWidth = doc.page.width - 60;
      const fixedCols = Object.values(colWidths).reduce((a, b) => a + b, 0);
      const dateColsTotal = 31 * dateColW;
      const summaryCols = totalDaysW + rateW + totalWagesW + signW;
      const totalWidth = fixedCols + dateColsTotal + summaryCols;

      const startX = 30;
      let y = doc.y;

      const drawRow = (cells, isHeader = false) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 30;
        }

        let x = startX;
        const rowH = isHeader ? 14 : 10;

        cells.forEach((cell, i) => {
          let w;
          if (i === 0) w = colWidths['Sl No'];
          else if (i === 1) w = colWidths['Worker Name'];
          else if (i === 2) w = colWidths["Father's Name"];
          else if (i === 3) w = colWidths['Designation'];
          else if (i < 35) w = dateColW;
          else if (i === 35) w = totalDaysW;
          else if (i === 36) w = rateW;
          else if (i === 37) w = totalWagesW;
          else w = signW;

          doc.rect(x, y, w, rowH).stroke();
          doc.text(String(cell || ''), x + 1, y + 1, {
            width: w - 2,
            height: rowH - 2,
            align: 'center',
            lineBreak: false,
          });
          x += w;
        });
        y += rowH;
      };

      drawRow(headers, true);

      workers.forEach((w, idx) => {
        const days = [];
        for (let d = 1; d <= 31; d++) {
          const rec = (w.attendanceRecords || []).find(r => {
            const rd = new Date(r.date).getDate();
            return rd === d;
          });
          if (rec) {
            if (rec.status === 'full') days.push('P');
            else if (rec.status === 'half') days.push('H');
            else if (rec.status === 'overtime') days.push('OT');
            else days.push('A');
          } else {
            days.push('');
          }
        }
        drawRow([
          String(idx + 1),
          w.workerName || 'N/A',
          w.fatherName || '',
          w.skill || '',
          ...days,
          String(w.totalDays || 0),
          String(w.dailyRate || 0),
          String(w.grossPay || 0),
          '',
        ]);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const generateWageSlip = async (worker, wageEntry, siteName, month, year) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A5' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(14).text('Wage Slip', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(9).text(`SiteBook - ${siteName}`, { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(9);
      doc.text(`Worker: ${worker.name}`);
      doc.text(`Period: ${month}/${year}`);
      doc.text(`Skill: ${worker.skill}`);
      doc.moveDown(0.3);

      const lineY = doc.y;
      doc.rect(30, lineY, doc.page.width - 60, 0.5).fill('#000');
      doc.moveDown(0.5);

      const leftX = 30;
      const rightX = doc.page.width / 2 + 10;
      const lineH = 13;

      const addRow = (label, value, x) => {
        doc.text(label, x, doc.y, { width: 80, continued: true });
        doc.text(`: ${value}`, { width: 120 });
        doc.moveDown(0.2);
      };

      const curY = doc.y;
      addRow('Full Days', wageEntry.fullDays || 0, leftX);
      addRow('Half Days', wageEntry.halfDays || 0, leftX);
      addRow('Overtime Hours', wageEntry.totalOvertimeHours || 0, leftX);
      addRow('Absent Days', wageEntry.absentDays || 0, leftX);

      doc.y = curY;
      addRow('Daily Rate', `₹${wageEntry.dailyRate || 0}`, rightX);
      addRow('Base Pay', `₹${Math.round(wageEntry.basePay || 0)}`, rightX);
      addRow('Overtime Pay', `₹${Math.round(wageEntry.overtimePay || 0)}`, rightX);
      addRow('Gross Pay', `₹${Math.round(wageEntry.grossPay || 0)}`, rightX);

      doc.moveDown(0.5);
      doc.rect(30, doc.y, doc.page.width - 60, 0.5).fill('#000');
      doc.moveDown(0.3);

      doc.fontSize(10);
      doc.text(`Net Payable: ₹${Math.round(wageEntry.netPayable || 0)}`, { align: 'right' });

      doc.moveDown(1);
      doc.fontSize(7).text('This is a computer-generated wage slip from SiteBook.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const generateAppointmentLetter = async (worker, site, contractorName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Appointment Letter', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9);
      doc.text(`(Under Code on Wages 2019 - Section 3 read with Rules)`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);
      doc.text('To,');
      doc.text(worker.name);
      if (worker.fatherName) doc.text(`S/o ${worker.fatherName}`);
      if (worker.phone) doc.text(`Phone: ${worker.phone}`);
      doc.moveDown(0.5);

      doc.text(`Sub: Appointment as ${worker.skill.replace('_', ' ').toUpperCase()} Worker at ${site.name}`);
      doc.moveDown(0.5);

      doc.text('Dear Sir/Madam,');
      doc.moveDown(0.3);
      doc.text([
        `We are pleased to appoint you as a ${worker.skill.replace('_', ' ')} worker at our project site "${site.name}".`,
        '',
        `Your agreed daily wage rate is ₹${worker.agreedRate}/- per day. You will be paid on a daily-wage basis at the end of each month for the actual days worked.`,
        '',
        'Terms of engagement:',
        '1. Working hours: 8 hours per day (including rest breaks).',
        '2. Overtime: Paid at 1.5x the daily rate for work beyond 8 hours.',
        '3. Weekly rest: One day off every week as mandated by law.',
        '4. EPF/ESIC: Applicable as per statutory requirements.',
        '5. Safety: PPE will be provided. You must follow all safety instructions.',
        '',
        'Please report to the site supervisor for duty assignment.',
      ].join('\n'));
      doc.moveDown(1);

      doc.text('For SiteBook Technologies');
      doc.moveDown(0.5);
      doc.text('Authorised Signatory');
      doc.moveDown(0.3);
      doc.text(`(${contractorName || 'Contractor'})`);
      doc.moveDown(0.5);

      doc.fontSize(7).text('This is a computer-generated appointment letter from SiteBook.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const generateEPFECR = async (wageRun, site) => {
  const rows = wageRun.workers.map(w => ({
    uan: null,
    name: w.workerName,
    grossWages: w.grossPay,
    epfWages: Math.min(w.grossPay, 15000),
    epsWages: Math.min(w.grossPay, 15000),
    epfEmployee: w.epfEmployee,
    epfEmployer: w.epfEmployer,
    eps: Math.round(Math.min(w.grossPay, 15000) * 0.0833),
    ncpDays: 0,
    refund: 0,
  }));

  return { siteName: site.name, month: wageRun.month, year: wageRun.year, rows };
};
