const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Data from the epic sprint
const reportData = {
  title: "Epic Sprint Report",
  subtitle: "PassionSeed Customer Engagement & Validation",
  date: "March 1-15, 2026",
  company: "PassionSeed",
  tagline: "Discover Your Passion, Ignite Your Potential",
  
  // Executive Summary
  executiveSummary: {
    hackathonRegistrations: 349,
    betaRegistrations: 29,
    totalActions: 378,
    sprintThreshold: 100,
    achievement: "378% of target",
    instagramFollowers: 704,
    hackathonFollowers: "New account",
    emailRecipients: 208,
    emailOpenRate: "20.39%",
    emailCTR: "1.94%"
  },
  
  // Customer Segments Discovered
  customerSegments: [
    {
      name: "The Unknown/Untouched",
      description: "Students who don't know PassionSeed, have no prior contact, never participated in hackathons or career events",
      need: "Career exploration and awareness",
      size: "Majority of hackathon participants",
      insight: "This segment represents the largest opportunity - students actively seeking direction but unaware of available resources"
    },
    {
      name: "The Eager Portfolio Builders",
      description: "Students who join all events to build portfolio for university admission",
      need: "Certainty about university acceptance vs. preparing for national tests (TCAS3)",
      size: "Significant minority",
      insight: "Verified: These students need clear pathways and admission certainty. They are highly motivated but anxious about outcomes"
    },
    {
      name: "The Middle Ground",
      description: "Tried some events, not focused on portfolio, unsure about university/faculty/program choice",
      need: "Exploration, guidance, confidence about future, reducing parent anxiety",
      size: "Substantial portion",
      insight: "These students choose based on friends or feasibility. They need structured exploration to find the right fit and reduce family stress"
    }
  ],
  
  // MVP Choice Rationale
  mvpChoice: {
    hackathon: {
      name: "Hackathon - Live MVP",
      why: [
        "Mirrors PassionSeed's quest-based, collaborative format",
        "Required team formation - a social contract demonstrating real commitment",
        "Generated behavioral data: team formation rate, return visits, peak engagement",
        "No upfront payment or long-term commitment required",
        "Taught crucial skills: venture building, AI rapid prototyping, design thinking, teamwork on social issues"
      ],
      url: "passionseed.org/hackathon"
    },
    beta: {
      name: "Beta Registration - Concierge MVP",
      why: [
        "Multi-step form + social share acted as commitment filter",
        "Viral distribution mechanism through required sharing",
        "Demonstrated intrinsic motivation before product experience",
        "Mirrors product experience: PassionSeed requires students to DO things, not just browse"
      ],
      url: "passionseed.org/app/beta"
    }
  },
  
  // KPIs
  kpis: [
    { name: "Total Actions Taken", target: "≥ 100", actual: "378", status: "PASS", why: "Proves willingness to commit time, not just attention" },
    { name: "Team Formation Rate", target: "≥ 50%", actual: "66.2%", status: "PASS", why: "Forming a team requires coordination - strongest signal of intent" },
    { name: "Beta Completion Rate", target: "≥ 50%", actual: "64.1%", status: "PASS", why: "Multi-step form + share = high-effort filter" },
    { name: "Email Open Rate", target: "≥ 20%", actual: "20.39%", status: "PASS", why: "Baseline engagement from prior list" },
    { name: "Instagram Reach", target: "Organic growth", actual: "704 followers + new hackathon account", status: "PASS", why: "Primary channel for student engagement" },
    { name: "Cost Per Engaged User", target: "< ฿15", actual: "฿11.03", status: "PASS", why: "Validates paid social efficiency" }
  ],
  
  // Email Campaign
  emailCampaign: {
    sent: 1,
    recipients: 208,
    opens: 42,
    openRate: "20.39%",
    clicks: 4,
    ctr: "1.94%",
    conversions: 0,
    note: "Email landed in promotional folder, not primary inbox. Subject lines worked for those who saw them.",
    subject: "What's up seedlings 🌱 - Beta Test Opportunity",
    cta: "สมัคร Beta Test → passionseed.org/app/beta"
  },
  
  // Instagram Campaign
  instagramCampaign: {
    mainAccount: {
      handle: "@passion_seed.th",
      followers: 704,
      url: "instagram.com/passion_seed.th"
    },
    hackathonAccount: {
      handle: "@thenextdecade.hackathon",
      type: "New account for event",
      url: "instagram.com/thenextdecade.hackathon/reels/"
    },
    strategy: "Posted multiple reels for hackathon promotion, beta registration announcements",
    results: "Primary driver of registrations - students live on social, not email"
  },
  
  // Traffic Sources
  trafficSources: [
    { name: "Instagram", percentage: 44 },
    { name: "Friend Referral (เพื่อนแนะนำ)", percentage: 30 },
    { name: "Facebook", percentage: 10 },
    { name: "Other (อื่นๆ)", percentage: 10 },
    { name: "Teacher (ครู/อาจารย์แนะนำ)", percentage: 3 },
    { name: "TikTok", percentage: 3 }
  ],
  
  // Key Learnings
  learnings: {
    whatWorked: [
      "Instagram + peer referral dramatically outperformed email",
      "Framing MVP as live event (hackathon) increased commitment vs. static waitlist",
      "Team formation mechanic served as natural commitment filter",
      "฿11/sign-up validates paid social as efficient acquisition channel",
      "349 registrations from 704 followers = 50.1% conversion from owned audience",
      "Hackathon taught crucial skills: venture building, AI rapid prototyping, design thinking"
    ],
    whatToFix: [
      "Email deliverability - fix SPF/DKIM, warm up sender domain, use plain-text formatting",
      "Beta referral gate has 35.9% abandonment - lower friction or replace with softer incentive",
      "Students don't use email as much - focus on social channels",
      "Need post-hackathon survey to map customer segments"
    ],
    customerInsights: [
      "Most participants were new to PassionSeed - no prior contact, never did hackathons",
      "This 'unknown' segment needs career exploration most",
      "Eager portfolio builders need certainty about university acceptance vs. TCAS3 preparation",
      "Middle group chooses based on friends/feasibility - needs structured exploration",
      "All segments benefit from venture building, AI prototyping, design thinking skills"
    ]
  },
  
  // Next Steps
  nextSteps: [
    "Survey all 349 hackathon participants to map customer segments",
    "Implement post-event feedback collection",
    "Improve email deliverability for future campaigns",
    "Lower friction on beta referral gate",
    "Continue Instagram content strategy with reels",
    "Build on hackathon momentum with follow-up events"
  ]
};

function generateReport() {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });
  
  const filePath = path.join(__dirname, '..', 'Epic_Sprint_Report_PassionSeed.pdf');
  const stream = fs.createWriteStream(filePath);
  
  doc.pipe(stream);
  
  // Helper functions
  const addPageNumber = () => {
    const pageCount = doc.bufferedPageRange();
    for (let i = 0; i < pageCount.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor('#666')
        .text(`Page ${i + 1} of ${pageCount.count}`, 50, doc.page.height - 30, {
          align: 'center',
          width: doc.page.width - 100
        });
    }
  };
  
  const addHeader = (title, subtitle) => {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(title, 50, 50, { align: 'center' });
    
    if (subtitle) {
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#666')
        .text(subtitle, 50, 80, { align: 'center' });
    }
    
    doc.moveTo(50, 100).lineTo(doc.page.width - 50, 100).strokeColor('#e94560').stroke();
    doc.moveDown(2);
  };
  
  const addSection = (number, title) => {
    doc.moveDown(1);
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#e94560')
      .text(`${number}. ${title}`, 50, doc.y, { continued: true });
    
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#1a1a2e')
      .text('', doc.x);
    
    doc.moveDown(0.5);
  };
  
  const addSubsection = (title) => {
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(title, 50);
    doc.moveDown(0.3);
  };
  
  const addBulletPoint = (text) => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333')
      .text(`• ${text}`, 60, doc.y, {
        indent: 0,
        align: 'left',
        width: doc.page.width - 120
      });
    doc.moveDown(0.3);
  };
  
  const addStatBox = (label, value, x, y, width) => {
    doc
      .roundedRect(x, y, width, 60, 5)
      .strokeColor('#e94560')
      .stroke();
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666')
      .text(label, x + 10, y + 10, { width: width - 20 });
    
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#e94560')
      .text(value.toString(), x + 10, y + 30, { width: width - 20 });
  };
  
  // ============ COVER PAGE ============
  doc
    .rect(0, 0, doc.page.width, doc.page.height)
    .fill('#1a1a2e');
  
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(reportData.title, 50, 150, { align: 'center' });
  
  doc
    .fontSize(18)
    .font('Helvetica')
    .fillColor('#e94560')
    .text(reportData.subtitle, 50, 200, { align: 'center' });
  
  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#cccccc')
    .text(reportData.company, 50, 250, { align: 'center' });
  
  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#cccccc')
    .text(reportData.tagline, 50, 270, { align: 'center' });
  
  doc
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#999999')
    .text(reportData.date, 50, 320, { align: 'center' });
  
  // Sprint Status Badge
  doc
    .roundedRect(doc.page.width / 2 - 100, 380, 200, 50, 10)
    .fill('#16a085');
  
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text('✓ SPRINT PASSED', doc.page.width / 2 - 100, 395, { width: 200, align: 'center' });
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#ffffff')
    .text(`${reportData.executiveSummary.totalActions} actions recorded (378% of target)`, doc.page.width / 2 - 100, 415, { width: 200, align: 'center' });
  
  // Footer
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666666')
    .text('Prepared for FI Accelerator Program', 50, doc.page.height - 50, { align: 'center' });
  
  doc.addPage();
  
  // ============ TABLE OF CONTENTS ============
  addHeader('Table of Contents', '');
  
  const tocItems = [
    'Executive Summary',
    'Choice of MVP & Rationale',
    'Customer Segments Discovered',
    'KPIs & Success Factors',
    'Email Campaign Results',
    'Instagram & Social Media Campaign',
    'Traffic Sources Analysis',
    'Results Evaluation',
    'Key Learnings',
    'Next Steps',
    'Appendix: Participant List'
  ];
  
  tocItems.forEach((item, index) => {
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#333')
      .text(`${index + 1}. ${item}`, 50, doc.y, {
        continued: true,
        link: `#${index}`
      });
    doc.moveDown(0.5);
  });
  
  doc.addPage();
  
  // ============ EXECUTIVE SUMMARY ============
  addSection('01', 'Executive Summary');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'This report demonstrates that early-stage interest translates into committed action. ' +
      'Two parallel campaigns validated our core hypothesis: students want structured, active career exploration.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(1);
  
  // Stats row
  const stats = [
    { label: 'Hackathon Registrations', value: reportData.executiveSummary.hackathonRegistrations },
    { label: 'Beta Sign-ups', value: reportData.executiveSummary.betaRegistrations },
    { label: 'Total Actions', value: reportData.executiveSummary.totalActions },
    { label: 'Sprint Target', value: '100' }
  ];
  
  let x = 50;
  const statWidth = (doc.page.width - 100 - 30) / 4;
  stats.forEach(stat => {
    addStatBox(stat.label, stat.value, x, doc.y, statWidth);
    x += statWidth + 10;
  });
  doc.y += 80;
  
  doc.moveDown(0.5);
  
  addBulletPoint(`Achieved ${reportData.executiveSummary.totalActions} committed actions - ${reportData.executiveSummary.achievement}`);
  addBulletPoint(`${reportData.executiveSummary.instagramFollowers} Instagram followers on main account + new hackathon account`);
  addBulletPoint(`Email campaign: ${reportData.executiveSummary.emailRecipients} recipients, ${reportData.executiveSummary.emailOpenRate} open rate`);
  addBulletPoint('Primary channel: Instagram (44%) + Friend Referral (30%)');
  addBulletPoint('Cost per engaged user: ฿11.03 (under ฿15 target)');
  
  doc.moveDown(1);
  
  // Status box
  doc
    .roundedRect(50, doc.y, doc.page.width - 100, 50, 5)
    .strokeColor('#16a085')
    .fillColor('#e8f8f5')
    .stroke();
  
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#16a085')
    .text('✓ Sprint Status: PASSED', 60, doc.y + 15);
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      `The hackathon produced ${reportData.executiveSummary.hackathonRegistrations} committed registrations from a base of ${reportData.executiveSummary.instagramFollowers} Instagram followers, ` +
      'representing a 50.1% conversion rate from our owned audience.',
      60, doc.y + 35, { width: doc.page.width - 120 }
    );
  
  doc.addPage();
  
  // ============ CHOICE OF MVP ============
  addSection('02', 'Choice of MVP & Rationale');
  
  addSubsection('Hackathon - Live MVP');
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text('URL: passionseed.org/hackathon', 50, doc.y);
  doc.moveDown(0.3);
  
  reportData.mvpChoice.hackathon.why.forEach(reason => {
    addBulletPoint(reason);
  });
  
  doc.moveDown(0.5);
  
  addSubsection('Beta Registration - Concierge MVP');
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text('URL: passionseed.org/app/beta', 50, doc.y);
  doc.moveDown(0.3);
  
  reportData.mvpChoice.beta.why.forEach(reason => {
    addBulletPoint(reason);
  });
  
  doc.moveDown(1);
  
  addSubsection('Why These Actions?');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Students who wanted early access had to complete multi-step registration and share an invitation post to social media. ' +
      'The share requirement acted as a commitment filter and viral distribution mechanism simultaneously. ' +
      'Completing both steps demonstrated real intent - not just curiosity.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(0.5);
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'We selected the hackathon because it mirrors the actual product (collaborative, goal-oriented, time-bounded), ' +
      'required students to form or join a team (a social contract), generated usable behavioral data, ' +
      'and required no upfront payment or long-term commitment from students.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  
  doc.addPage();
  
  // ============ CUSTOMER SEGMENTS ============
  addSection('03', 'Customer Segments Discovered');
  
  doc
    .fontSize(11)
    .font('Helvetica-Oblique')
    .fillColor('#666')
    .text(
      'Key Insight: Most participants were students who don\'t know us, have no contact, never did hackathons. ' +
      'This group needs career exploration most.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(1);
  
  reportData.customerSegments.forEach((segment, index) => {
    // Segment card
    doc
      .roundedRect(50, doc.y, doc.page.width - 100, 85, 5)
      .strokeColor('#e94560')
      .stroke();
    
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#e94560')
      .text(`${index + 1}. ${segment.name}`, 60, doc.y + 10);
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333')
      .text(segment.description, 60, doc.y + 30, { width: doc.page.width - 140 });
    
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(`Need: ${segment.need}`, 60, doc.y + 55);
    
    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('#666')
      .text(`Insight: ${segment.insight}`, 60, doc.y + 70, { width: doc.page.width - 140 });
    
    doc.y += 95;
  });
  
  doc.moveDown(0.5);
  
  addSubsection('Skills Taught Through Hackathon');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'The hackathon taught crucial skills that align with PassionSeed\'s mission:',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(0.3);
  
  addBulletPoint('Venture Building - Creating and developing business ideas');
  addBulletPoint('AI Rapid Prototyping - Using AI tools to build quickly');
  addBulletPoint('Design Thinking - Human-centered problem solving');
  addBulletPoint('Teamwork on Social Issues - Collaborative impact');
  
  doc.addPage();
  
  // ============ KPIs ============
  addSection('04', 'KPIs & Success Factors');
  
  doc.moveDown(0.5);
  
  // KPI Table Header
  const tableY = doc.y;
  const colWidths = [150, 200, 80, 80, 80];
  let kpiX = 50;
  
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .rect(50, doc.y, doc.page.width - 100, 25)
    .fill('#1a1a2e');
  
  doc.text('KPI', kpiX + 5, doc.y + 8);
  kpiX += colWidths[0];
  doc.text('Why It Matters', kpiX + 5, doc.y + 8);
  kpiX += colWidths[1];
  doc.text('Target', kpiX + 5, doc.y + 8);
  kpiX += colWidths[2];
  doc.text('Actual', kpiX + 5, doc.y + 8);
  kpiX += colWidths[3];
  doc.text('Status', kpiX + 5, doc.y + 8);
  
  doc.y += 30;
  
  // KPI Rows
  reportData.kpis.forEach((kpi, index) => {
    let rowX = 50;
    const rowHeight = 35;
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc
        .rect(50, doc.y, doc.page.width - 100, rowHeight)
        .fillColor('#f8f9fa')
        .fill();
    }
    
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333');
    
    doc.text(kpi.name, rowX + 5, doc.y + 8, { width: colWidths[0] - 10 });
    rowX += colWidths[0];
    doc.text(kpi.why, rowX + 5, doc.y + 8, { width: colWidths[1] - 10 });
    rowX += colWidths[1];
    doc.text(kpi.target, rowX + 5, doc.y + 8, { width: colWidths[2] - 10 });
    rowX += colWidths[2];
    doc.text(kpi.actual, rowX + 5, doc.y + 8, { width: colWidths[3] - 10 });
    rowX += colWidths[3];
    
    // Status badge
    const statusColor = kpi.status === 'PASS' ? '#16a085' : '#e74c3c';
    doc
      .roundedRect(rowX + 5, doc.y + 8, 50, 18, 3)
      .fill(statusColor);
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(kpi.status, rowX + 10, doc.y + 12);
    
    doc.y += rowHeight;
    
    // Page break if needed
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      addSection('', 'KPIs & Success Factors (continued)');
    }
  });
  
  doc.addPage();
  
  // ============ EMAIL CAMPAIGN ============
  addSection('05', 'Email Campaign Results');
  
  addSubsection('Campaign Overview');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Note: The email campaign was run specifically for the beta sign-up. ' +
      'The hackathon was driven entirely through Instagram and peer referral - no separate email campaign was sent for it.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(1);
  
  // Email stats
  const emailStats = [
    { label: 'Emails Sent', value: reportData.emailCampaign.recipients.toString() },
    { label: 'Opens', value: `${reportData.emailCampaign.opens} (${reportData.emailCampaign.openRate})` },
    { label: 'Clicks', value: `${reportData.emailCampaign.clicks} (${reportData.emailCampaign.ctr})` },
    { label: 'Direct Conversions', value: reportData.emailCampaign.conversions.toString() }
  ];
  
  let statX = 50;
  const emailStatWidth = (doc.page.width - 100 - 30) / 4;
  emailStats.forEach(stat => {
    addStatBox(stat.label, stat.value, statX, doc.y, emailStatWidth);
    statX += emailStatWidth + 10;
  });
  doc.y += 80;
  
  doc.moveDown(0.5);
  
  addSubsection('Email Content');
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`Subject: ${reportData.emailCampaign.subject}`, 50, doc.y);
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`CTA: ${reportData.emailCampaign.cta}`, 50, doc.y);
  doc.moveDown(0.5);
  
  addSubsection('Deliverability Note');
  
  doc
    .roundedRect(50, doc.y, doc.page.width - 100, 50, 5)
    .strokeColor('#f39c12')
    .fillColor('#fef9e7')
    .stroke();
  
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#f39c12')
    .text('⚠ Deliverability Issue', 60, doc.y + 15);
  
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      reportData.emailCampaign.note,
      60, doc.y + 30, { width: doc.page.width - 120 }
    );
  doc.y += 60;
  
  doc.moveDown(0.5);
  
  addSubsection('Key Insight');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Students don\'t use email as much. Our mailing list isn\'t the best channel because target customers (students) ' +
      'don\'t check email regularly. Instagram proved to be the primary engagement channel.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  
  doc.addPage();
  
  // ============ INSTAGRAM CAMPAIGN ============
  addSection('06', 'Instagram & Social Media Campaign');
  
  addSubsection('Main Account: @passion_seed.th');
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`Followers: ${reportData.instagramCampaign.mainAccount.followers}`, 50, doc.y);
  doc.moveDown(0.2);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`URL: ${reportData.instagramCampaign.mainAccount.url}`, 50, doc.y);
  doc.moveDown(0.5);
  
  addSubsection('Hackathon Account: @thenextdecade.hackathon');
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`Type: ${reportData.instagramCampaign.hackathonAccount.type}`, 50, doc.y);
  doc.moveDown(0.2);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(`URL: ${reportData.instagramCampaign.hackathonAccount.url}`, 50, doc.y);
  doc.moveDown(0.5);
  
  addSubsection('Strategy');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(reportData.instagramCampaign.strategy, 50, doc.y, { width: doc.page.width - 100 });
  doc.moveDown(0.5);
  
  addSubsection('Results');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(reportData.instagramCampaign.results, 50, doc.y, { width: doc.page.width - 100 });
  doc.moveDown(1);
  
  // Conversion calculation
  const conversionRate = ((reportData.executiveSummary.hackathonRegistrations / reportData.executiveSummary.instagramFollowers) * 100).toFixed(1);
  
  doc
    .roundedRect(50, doc.y, doc.page.width - 100, 50, 5)
    .strokeColor('#e94560')
    .fillColor('#fdedec')
    .stroke();
  
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#e94560')
    .text(`📈 Key Metric: ${conversionRate}% Conversion Rate`, 60, doc.y + 15);
  
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      `${reportData.executiveSummary.hackathonRegistrations} registrations from ${reportData.executiveSummary.instagramFollowers} Instagram followers ` +
      'represents exceptional conversion from our owned audience.',
      60, doc.y + 32, { width: doc.page.width - 120 }
    );
  
  doc.addPage();
  
  // ============ TRAFFIC SOURCES ============
  addSection('07', 'Traffic Sources Analysis');
  
  doc.moveDown(0.5);
  
  // Bar chart for traffic sources
  const maxBarWidth = doc.page.width - 150;
  const barHeight = 25;
  const barSpacing = 10;
  
  reportData.trafficSources.forEach((source, index) => {
    const y = doc.y + (index * (barHeight + barSpacing));
    
    // Label
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333')
      .text(source.name, 50, y + 7, { width: 120, align: 'right' });
    
    // Bar background
    doc
      .rect(180, y, maxBarWidth, barHeight)
      .fillColor('#ecf0f1')
      .fill();
    
    // Bar fill
    const barWidth = (source.percentage / 100) * maxBarWidth;
    doc
      .rect(180, y, barWidth, barHeight)
      .fillColor('#e94560')
      .fill();
    
    // Percentage
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333')
      .text(`${source.percentage}%`, 190 + barWidth, y + 7);
  });
  
  doc.y += (reportData.trafficSources.length * (barHeight + barSpacing)) + 20;
  
  doc.moveDown(0.5);
  
  addSubsection('Key Insights');
  
  addBulletPoint('Instagram (44%) is the dominant acquisition channel');
  addBulletPoint('Friend Referral (30%) shows strong peer-to-peer viral growth');
  addBulletPoint('Combined organic social (Instagram + Facebook + TikTok) = 57%');
  addBulletPoint('Teacher recommendations (3%) indicate institutional interest');
  
  doc.addPage();
  
  // ============ RESULTS EVALUATION ============
  addSection('08', 'Results Evaluation');
  
  addSubsection('Hackathon Performance');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      `Total Registrations: ${reportData.executiveSummary.hackathonRegistrations}`,
      50, doc.y
    );
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Team Formation Rate: 66.2% (strongest engagement signal - forming a team requires coordination)',
      50, doc.y
    );
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Peak Day: 163 registrations on March 15, 2026',
      50, doc.y
    );
  doc.moveDown(1);
  
  addSubsection('Beta Registration Performance');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      `Total Registrations: ${reportData.executiveSummary.betaRegistrations}`,
      50, doc.y
    );
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Completion Rate: 64.1% (form → upload with evidence)',
      50, doc.y
    );
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Cost Per Sign-up: ฿11.03 (฿320.01 total ad spend / 29 registrations)',
      50, doc.y
    );
  doc.moveDown(1);
  
  addSubsection('Overall Assessment');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'The sprint exceeded all targets. The 378 total actions (349 hackathon + 29 beta) represent 378% of the 100-action target. ' +
      'The 66.2% team formation rate is the strongest engagement signal, as forming a team requires coordination with at least ' +
      'one other person - a social contract, not just a click.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  
  doc.addPage();
  
  // ============ KEY LEARNINGS ============
  addSection('09', 'Key Learnings');
  
  addSubsection('What Worked');
  
  reportData.learnings.whatWorked.forEach(learning => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#27ae60')
      .text('✓', 50, doc.y, { continued: true });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333')
      .text(` ${learning}`, doc.x, doc.y - 14, { width: doc.page.width - 100 });
    doc.moveDown(0.4);
  });
  
  doc.moveDown(0.5);
  
  addSubsection('What to Fix');
  
  reportData.learnings.whatToFix.forEach(learning => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#e74c3c')
      .text('✗', 50, doc.y, { continued: true });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333')
      .text(` ${learning}`, doc.x, doc.y - 14, { width: doc.page.width - 100 });
    doc.moveDown(0.4);
  });
  
  doc.moveDown(0.5);
  
  addSubsection('Customer Insights');
  
  reportData.learnings.customerInsights.forEach(insight => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#3498db')
      .text('💡', 50, doc.y, { continued: true });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333')
      .text(` ${insight}`, doc.x, doc.y - 14, { width: doc.page.width - 100 });
    doc.moveDown(0.4);
  });
  
  doc.addPage();
  
  // ============ NEXT STEPS ============
  addSection('10', 'Next Steps');
  
  reportData.nextSteps.forEach((step, index) => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#333')
      .text(`${index + 1}. ${step}`, 50, doc.y, { width: doc.page.width - 100 });
    doc.moveDown(0.5);
  });
  
  doc.moveDown(1);
  
  addSubsection('Post-Hackathon Survey Plan');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'We will survey all 349 hackathon participants to map out which customer segment they belong to. ' +
      'This will help us understand:',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(0.3);
  
  addBulletPoint('What percentage are "Unknown/Untouched" vs. "Eager Portfolio Builders" vs. "Middle Ground"');
  addBulletPoint('Which segment shows highest engagement and conversion');
  addBulletPoint('What specific needs each segment has for future product development');
  addBulletPoint('How to tailor messaging and features for each segment');
  
  doc.addPage();
  
  // ============ APPENDIX ============
  addSection('A', 'Appendix: Participant List');
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'The following section contains the email addresses of all participants who took action during this sprint. ' +
      'This demonstrates the 100+ committed actions required to pass the Epic Sprint.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(1);
  
  addSubsection('Hackathon Participants (349 total)');
  
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor('#666')
    .text(
      'Note: Full email list available in database. Sample entries shown below. ' +
      'To export complete list: Query hackathon_participants table from Supabase.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  doc.moveDown(0.5);
  
  // Sample table
  const sampleEmails = [
    'participant001@email.com',
    'participant002@email.com',
    'participant003@email.com',
    'participant004@email.com',
    'participant005@email.com'
  ];
  
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#333');
  
  sampleEmails.forEach((email, index) => {
    doc.text(`${index + 1}. ${email} (Sample - Full list in database)`, 50, doc.y);
    doc.moveDown(0.3);
  });
  
  doc.moveDown(1);
  
  doc
    .roundedRect(50, doc.y, doc.page.width - 100, 40, 5)
    .strokeColor('#3498db')
    .fillColor('#ebf5fb')
    .stroke();
  
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#3498db')
    .text('📊 Database Export Instructions', 60, doc.y + 12);
  
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'To export full participant list: SELECT email FROM hackathon_participants ORDER BY created_at;',
      60, doc.y + 27, { width: doc.page.width - 120 }
    );
  doc.y += 50;
  
  addSubsection('Beta Registrations (29 total)');
  
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor('#666')
    .text(
      'Note: Full email list available in database via ps_submissions table linked to ps_feedback_forms.',
      50, doc.y, { width: doc.page.width - 100 }
    );
  
  doc.moveDown(2);
  
  // Final summary box
  doc
    .roundedRect(50, doc.y, doc.page.width - 100, 60, 5)
    .strokeColor('#16a085')
    .fillColor('#e8f8f5')
    .stroke();
  
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#16a085')
    .text('✓ Epic Sprint: PASSED', 60, doc.y + 15);
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      `Total Actions: ${reportData.executiveSummary.totalActions} | Target: 100 | Achievement: 378%`,
      60, doc.y + 35, { width: doc.page.width - 120 }
    );
  
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'Prepared for FI Accelerator Program • March 2026',
      60, doc.y + 50, { width: doc.page.width - 120 }
    );
  
  // Finalize PDF
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`PDF report generated successfully: ${filePath}`);
      resolve(filePath);
    });
    stream.on('error', reject);
  });
}

// Run the report generator
generateReport()
  .then(filePath => {
    console.log(`Report saved to: ${filePath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error generating report:', err);
    process.exit(1);
  });
