import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { WorkOrder } from '../entities/WorkOrder';
import { MaintenanceRecord } from '../entities/MaintenanceRecord';
import { FinancialReport } from '../entities/FinancialReport';
import dayjs from 'dayjs';

export interface PDFResult {
  buffer: Buffer;
  filename: string;
}

export class PDFGenerator {
  private static readonly PAGE_WIDTH = 595.28;
  private static readonly PAGE_HEIGHT = 841.89;
  private static readonly MARGIN = 50;

  private static async generateQRCode(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  private static addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('路灯管理系统', this.MARGIN, this.MARGIN, {
        align: 'center',
        width: this.PAGE_WIDTH - this.MARGIN * 2,
      });

    doc
      .fontSize(16)
      .text(title, this.MARGIN, this.MARGIN + 30, {
        align: 'center',
        width: this.PAGE_WIDTH - this.MARGIN * 2,
      });

    doc
      .moveTo(this.MARGIN, this.MARGIN + 60)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, this.MARGIN + 60)
      .stroke();
  }

  private static addFooter(doc: PDFKit.PDFDocument, page: number, totalPages: number): void {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `第 ${page} 页 / 共 ${totalPages} 页`,
        this.MARGIN,
        this.PAGE_HEIGHT - this.MARGIN,
        {
          align: 'center',
          width: this.PAGE_WIDTH - this.MARGIN * 2,
        }
      );

    doc
      .text(
        `打印时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
        this.MARGIN,
        this.PAGE_HEIGHT - this.MARGIN + 15,
        {
          align: 'center',
          width: this.PAGE_WIDTH - this.MARGIN * 2,
        }
      );
  }

  private static addSeal(doc: PDFKit.PDFDocument, x: number, y: number): void {
    doc
      .circle(x, y, 40)
      .lineWidth(2)
      .strokeColor('#ff0000')
      .stroke();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#ff0000')
      .text('公章', x - 15, y - 6);

    doc
      .fontSize(8)
      .text('此处盖章', x - 20, y + 50);

    doc.fillColor('#000000');
  }

  private static addField(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    labelWidth: number = 120
  ): number {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${label}:`, x, y);

    doc
      .font('Helvetica')
      .text(value || '-', x + labelWidth, y, {
        width: this.PAGE_WIDTH - this.MARGIN * 2 - labelWidth - x,
      });

    return y + 20;
  }

  private static addSectionTitle(
    doc: PDFKit.PDFDocument,
    title: string,
    y: number
  ): number {
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(title, this.MARGIN, y);

    doc
      .moveTo(this.MARGIN, y + 18)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, y + 18)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();

    doc.strokeColor('#000000');

    return y + 35;
  }

  static async generateWorkOrderVoucher(workOrder: WorkOrder): Promise<PDFResult> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: this.MARGIN,
      info: {
        Title: `工单凭证 - ${workOrder.orderNo}`,
        Author: '路灯管理系统',
        Subject: '工单凭证',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const qrData = JSON.stringify({
      type: 'work_order',
      id: workOrder.id,
      orderNo: workOrder.orderNo,
      createdAt: workOrder.createdAt,
    });
    const qrBuffer = await this.generateQRCode(qrData);

    this.addHeader(doc, '工单凭证');

    doc.image(qrBuffer, this.PAGE_WIDTH - this.MARGIN - 100, this.MARGIN + 80, {
      width: 100,
      height: 100,
    });

    let y = this.MARGIN + 80;

    y = this.addSectionTitle(doc, '基本信息', y);
    y = this.addField(doc, '工单编号', workOrder.orderNo, this.MARGIN, y);
    y = this.addField(doc, '工单状态', workOrder.status, this.MARGIN, y);
    y = this.addField(doc, '优先级', workOrder.priority.toString(), this.MARGIN, y);
    y = this.addField(doc, '故障类型', workOrder.faultType || '-', this.MARGIN, y);
    y = this.addField(doc, '故障等级', workOrder.faultLevel || '-', this.MARGIN, y);

    y = this.addSectionTitle(doc, '关联信息', y + 10);
    y = this.addField(doc, '路灯ID', workOrder.streetLightId, this.MARGIN, y);
    if (workOrder.inspectionId) {
      y = this.addField(doc, '关联巡检', workOrder.inspectionId, this.MARGIN, y);
    }
    if (workOrder.maintainer) {
      y = this.addField(doc, '维修人员', workOrder.maintainer.realName, this.MARGIN, y);
    }

    y = this.addSectionTitle(doc, '时间信息', y + 10);
    y = this.addField(doc, '创建时间', dayjs(workOrder.createdAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    if (workOrder.assignedAt) {
      y = this.addField(doc, '派单时间', dayjs(workOrder.assignedAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    }
    if (workOrder.acceptedAt) {
      y = this.addField(doc, '接单时间', dayjs(workOrder.acceptedAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    }
    if (workOrder.startedAt) {
      y = this.addField(doc, '开始时间', dayjs(workOrder.startedAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    }
    if (workOrder.completedAt) {
      y = this.addField(doc, '完成时间', dayjs(workOrder.completedAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    }
    if (workOrder.verifiedAt) {
      y = this.addField(doc, '验收时间', dayjs(workOrder.verifiedAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    }

    y = this.addSectionTitle(doc, '费用信息', y + 10);
    y = this.addField(doc, '配件费用', `¥${workOrder.partsCost.toFixed(2)}`, this.MARGIN, y);
    y = this.addField(doc, '人工费用', `¥${workOrder.laborCost.toFixed(2)}`, this.MARGIN, y);
    y = this.addField(doc, '总费用', `¥${workOrder.totalCost.toFixed(2)}`, this.MARGIN, y);

    this.addSeal(doc, this.PAGE_WIDTH - this.MARGIN - 60, y + 60);

    this.addFooter(doc, 1, 1);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          filename: `工单凭证_${workOrder.orderNo}_${dayjs().format('YYYYMMDDHHmmss')}.pdf`,
        });
      });
    });
  }

  static async generateMaintenanceVoucher(maintenance: MaintenanceRecord): Promise<PDFResult> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: this.MARGIN,
      info: {
        Title: `维修凭证 - ${maintenance.id}`,
        Author: '路灯管理系统',
        Subject: '维修凭证',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const qrData = JSON.stringify({
      type: 'maintenance',
      id: maintenance.id,
      workOrderId: maintenance.workOrderId,
      createdAt: maintenance.createdAt,
    });
    const qrBuffer = await this.generateQRCode(qrData);

    this.addHeader(doc, '维修凭证');

    doc.image(qrBuffer, this.PAGE_WIDTH - this.MARGIN - 100, this.MARGIN + 80, {
      width: 100,
      height: 100,
    });

    let y = this.MARGIN + 80;

    y = this.addSectionTitle(doc, '基本信息', y);
    y = this.addField(doc, '维修记录ID', maintenance.id, this.MARGIN, y);
    y = this.addField(doc, '关联工单', maintenance.workOrderId, this.MARGIN, y);

    y = this.addSectionTitle(doc, '维修人员', y + 10);
    if (maintenance.maintainer) {
      y = this.addField(doc, '姓名', maintenance.maintainer.realName, this.MARGIN, y);
      y = this.addField(doc, '角色', maintenance.maintainer.role, this.MARGIN, y);
      y = this.addField(doc, '电话', maintenance.maintainer.phone || '-', this.MARGIN, y);
    }

    y = this.addSectionTitle(doc, '维修时间', y + 10);
    y = this.addField(doc, '开始时间', dayjs(maintenance.startTime).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
    if (maintenance.endTime) {
      y = this.addField(doc, '结束时间', dayjs(maintenance.endTime).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);
      const duration = dayjs(maintenance.endTime).diff(dayjs(maintenance.startTime), 'minute');
      y = this.addField(doc, '维修时长', `${duration} 分钟`, this.MARGIN, y);
    }

    y = this.addSectionTitle(doc, '维修详情', y + 10);
    if (maintenance.description) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('维修描述:', this.MARGIN, y);
      doc
        .font('Helvetica')
        .text(maintenance.description, this.MARGIN + 80, y, {
          width: this.PAGE_WIDTH - this.MARGIN * 2 - 80,
        });
      y += 40;
    }

    if (maintenance.report) {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('维修报告:', this.MARGIN, y);
      doc
        .font('Helvetica')
        .text(maintenance.report, this.MARGIN + 80, y, {
          width: this.PAGE_WIDTH - this.MARGIN * 2 - 80,
        });
      y += 40;
    }

    if (maintenance.partsUsed && maintenance.partsUsed.length > 0) {
      y = this.addSectionTitle(doc, '使用配件', y + 10);
      
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('配件名称', this.MARGIN, y);
      doc.text('数量', this.MARGIN + 200, y);
      doc.text('单价', this.MARGIN + 280, y);
      doc.text('小计', this.MARGIN + 360, y);
      y += 20;

      let totalPartsCost = 0;
      for (const part of maintenance.partsUsed) {
        doc.font('Helvetica');
        doc.text(part.partName, this.MARGIN, y);
        doc.text(part.quantity.toString(), this.MARGIN + 200, y);
        doc.text(`¥${part.price.toFixed(2)}`, this.MARGIN + 280, y);
        const subtotal = part.quantity * part.price;
        doc.text(`¥${subtotal.toFixed(2)}`, this.MARGIN + 360, y);
        totalPartsCost += subtotal;
        y += 20;
      }

      doc
        .font('Helvetica-Bold')
        .text('配件合计:', this.MARGIN + 280, y);
      doc.text(`¥${totalPartsCost.toFixed(2)}`, this.MARGIN + 360, y);
    }

    y = this.addSectionTitle(doc, '创建信息', y + 20);
    y = this.addField(doc, '创建时间', dayjs(maintenance.createdAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);

    this.addSeal(doc, this.PAGE_WIDTH - this.MARGIN - 60, y + 40);

    this.addFooter(doc, 1, 1);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          filename: `维修凭证_${maintenance.id}_${dayjs().format('YYYYMMDDHHmmss')}.pdf`,
        });
      });
    });
  }

  static async generateReportVoucher(report: FinancialReport): Promise<PDFResult> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: this.MARGIN,
      info: {
        Title: `财务报表凭证 - ${report.reportMonth}`,
        Author: '路灯管理系统',
        Subject: '财务报表凭证',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const qrData = JSON.stringify({
      type: 'financial_report',
      id: report.id,
      reportMonth: report.reportMonth,
      createdAt: report.createdAt,
    });
    const qrBuffer = await this.generateQRCode(qrData);

    this.addHeader(doc, '财务报表凭证');

    doc.image(qrBuffer, this.PAGE_WIDTH - this.MARGIN - 100, this.MARGIN + 80, {
      width: 100,
      height: 100,
    });

    let y = this.MARGIN + 80;

    y = this.addSectionTitle(doc, '基本信息', y);
    y = this.addField(doc, '报表ID', report.id, this.MARGIN, y);
    y = this.addField(doc, '报表月份', report.reportMonth, this.MARGIN, y);
    y = this.addField(doc, '区域', report.area, this.MARGIN, y);

    y = this.addSectionTitle(doc, '统计数据', y + 10);
    y = this.addField(doc, '故障总数', report.totalFaults.toString(), this.MARGIN, y);
    y = this.addField(doc, '平均维修时间', `${report.averageRepairTime.toFixed(2)} 小时`, this.MARGIN, y);
    y = this.addField(doc, '绩效评分', `${report.performanceScore.toFixed(2)} 分`, this.MARGIN, y);

    y = this.addSectionTitle(doc, '费用明细', y + 10);
    
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('费用项目', this.MARGIN, y);
    doc.text('金额 (¥)', this.MARGIN + 300, y);
    y += 25;

    doc
      .moveTo(this.MARGIN, y - 5)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, y - 5)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();
    doc.strokeColor('#000000');

    const costItems = [
      { name: '能源费用', value: report.totalEnergyCost },
      { name: '配件费用', value: report.totalPartsCost },
      { name: '人工费用', value: report.totalLaborCost },
    ];

    for (const item of costItems) {
      doc.font('Helvetica');
      doc.text(item.name, this.MARGIN, y);
      doc.text(item.value.toFixed(2), this.MARGIN + 300, y);
      y += 22;
    }

    doc
      .moveTo(this.MARGIN, y - 5)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, y - 5)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();
    doc.strokeColor('#000000');

    doc
      .font('Helvetica-Bold')
      .text('总费用', this.MARGIN, y);
    doc.text(`¥${report.totalCost.toFixed(2)}`, this.MARGIN + 300, y);
    y += 25;

    y = this.addSectionTitle(doc, '生成信息', y + 10);
    y = this.addField(doc, '生成时间', dayjs(report.createdAt).format('YYYY-MM-DD HH:mm:ss'), this.MARGIN, y);

    this.addSeal(doc, this.PAGE_WIDTH - this.MARGIN - 60, y + 40);

    this.addFooter(doc, 1, 1);

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          filename: `财务报表凭证_${report.reportMonth}_${dayjs().format('YYYYMMDDHHmmss')}.pdf`,
        });
      });
    });
  }
}

export default PDFGenerator;
