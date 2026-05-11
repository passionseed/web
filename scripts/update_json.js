const fs = require('fs');

const tangibles = {
  p1: {
    en: "Like leaving your grandparents' check engine light on until the car breaks down.",
    th: "เหมือนปล่อยให้ไฟเตือนเครื่องยนต์ของปู่ย่าตายายสว่างค้างไว้ จนกว่ารถจะพัง"
  },
  p2: {
    en: "Like burning a library of 30,000 medical books every generation.",
    th: "เหมือนการเผาห้องสมุดตำราแพทย์ 30,000 เล่มทิ้งในทุกๆ รุ่น"
  },
  p3: {
    en: "Like ignoring a leaky roof until the house floods. 400,000 lives lost yearly.",
    th: "เหมือนเพิกเฉยต่อหลังคารั่วจนน้ำท่วมบ้าน 400,000 ชีวิตสูญเสียทุกปี"
  },
  p4: {
    en: "Like having a broken leg, but society tells you it's 'just in your head'.",
    th: "เหมือนขาหัก แต่สังคมบอกคุณว่า 'คุณแค่คิดไปเอง'"
  },
  p5: {
    en: "The mortality impact is equivalent to smoking 15 cigarettes a day.",
    th: "ผลกระทบต่ออัตราการตายเทียบเท่ากับการสูบบุหรี่ 15 มวนต่อวัน"
  },
  p6: {
    en: "Imagine 1 doctor trying to treat a packed stadium of 200,000 people.",
    th: "ลองจินตนาการถึงหมอ 1 คนที่พยายามรักษาคน 200,000 คนในสเตเดียมที่อัดแน่น"
  },
  p7: {
    en: "Like having a fire alarm that rings, but gives you no water to put out the fire.",
    th: "เหมือนมีสัญญาณเตือนไฟไหม้ดังขึ้น แต่ไม่มีน้ำให้คุณดับไฟ"
  },
  p8: {
    en: "Like playing Russian Roulette with your lunch every day.",
    th: "เหมือนเล่นรัสเซียนรูเล็ตต์กับอาหารกลางวันของคุณทุกวัน"
  },
  p9: {
    en: "Like forcing 13.6 million kids to smoke cigarettes before recess.",
    th: "เหมือนบังคับให้เด็ก 13.6 ล้านคนสูบบุหรี่ก่อนพักเบรก"
  }
};

for (let i = 1; i <= 9; i++) {
  const pId = `p${i}`;
  const path = `public/data/hackathon/problems/${pId}.json`;
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    data.tangibleEquivalent = tangibles[pId];
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`Updated ${pId}.json with bilingual equivalents`);
  }
}
