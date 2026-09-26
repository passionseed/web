/**
 * Post-program quotes from TechSeed #3 and #5 feedback forms and PassionSeed
 * portfolio reviews. Shared by /shift and the home page so a quote is only
 * ever edited in one place.
 */

export interface ShiftTestimonial {
  name: string;
  meta: string;
  quote: string;
  /** The before/after line in the student's own terms. */
  shift: string;
}

export interface ShiftTestimonialGroup {
  label: string;
  cards: ShiftTestimonial[];
}

export const SHIFT_TESTIMONIAL_GROUPS: ShiftTestimonialGroup[] = [
  {
    label: "TECH",
    cards: [
      {
        name: "Nutcha S.***",
        meta: "ม.ปลาย สาย Game Dev · TechSeed #5",
        quote:
          "จากตอนแรกสนใจทางการทำเกมอยู่แล้ว แต่ไม่เคยเริ่มทำโปรเจกต์จริงจังซักที พอได้มาเข้าร่วมกิจกรรมนี้ก็รู้สึกว่ามีไฟเพิ่มขึ้นมากๆ มีแรงบันดาลใจในการทำโปรเจกต์ของตัวเองขึ้นมามากๆ",
        shift: "จากคนที่ไม่เคยเริ่ม สู่การปั้นเกมที่เล่นได้จริงบน Unity",
      },
      {
        name: "Sitthinon S.***",
        meta: "ม.ปลาย สาย AI · TechSeed #3",
        quote:
          "เปิดโลกมากครับ ได้เห็นรุ่นพี่เปิดพอร์ต แล้วทำให้รู้แล้วว่าจะกลับไปทำโปรเจกต์อะไรใส่พอร์ตตัวเอง",
        shift: "จากคนที่งงทิศทางพอร์ต สู่ Blueprint โปรเจกต์ AI ยื่นมหาลัย",
      },
      {
        name: "Ananya H.***",
        meta: "ม.ปลาย สาย Web Dev · TechSeed #5",
        quote:
          "พอได้มาลงมือทำสายนี้ มันทำให้รู้เลยว่าเราโอเคกับการทำเว็บมากๆ และมีความมั่นใจมากขึ้นที่จะไปต่อสายนี้",
        shift: "จากความลังเล สู่ความมั่นใจ 100% ในสายอาชีพ",
      },
    ],
  },
  {
    label: "BUSINESS & FINANCE",
    cards: [
      {
        name: "Fifa F.***",
        meta: "ม.4 สาย Finance / BBA Candidate",
        quote:
          "เล่นเทรดจำลอง IQ Option มา 2-3 ปี มั่นใจแค่ 3-4/10 พอมาคุยถึงรู้ว่าอาจารย์มหาวิทยาลัยมองว่านั่นคือการเก็งกำไร พอเปลี่ยนมาทำ 1-Page Equity Research Note & Valuation Model ทำให้เห็นภาพพอร์ต BBA ที่ตึงขึ้นเยอะ",
        shift: "จาก Red-Flag Gambling App สู่ Institutional Equity Research Memo",
      },
      {
        name: "Pipat P.***",
        meta: "ม.4 สายผู้ประกอบการ / Business",
        quote:
          "อยากเป็นเจ้าของธุรกิจ ไม่อยากเป็นพนักงานเงินเดือน ได้รู้ว่าการไปเข้าค่ายเอาใบเซอร์ทั่วไปไม่ได้แสดงศักยภาพจริง สู้ทำ Capstone Project สร้างแบรนด์จริงแล้วดู Real Feedback ดีกว่าเยอะ",
        shift: "จาก Certificate Hoarder สู่ Real-World Capstone Builder",
      },
    ],
  },
  {
    label: "ENGINEERING & INNOVATION",
    cards: [
      {
        name: "Namtarn N.***",
        meta: "ม.6 KMITL Chem Eng Candidate",
        quote:
          "ตอน ม.5 ทำโครงงานโคมไฟน้ำทะเลแค่ส่งครูที่โรงเรียน มั่นใจพอร์ตแค่ 30% เพราะคิดว่าขาดค่าย พอมาวางแผนอัปเกรดเป็น Engineering Optimization Case Study สรุปค่า Voltage & Anode Degradation รู้สึกมั่นใจขึ้นทันทีโดยไม่ต้องไปไล่เก็บค่าย",
        shift: "จาก School Science Craft สู่ KMITL Chem Eng Spike Project",
      },
      {
        name: "Dockid D.***",
        meta: "ม.5 สายวิศวะนวัตกรรม / CPIRD Med",
        quote:
          "ค่ายที่จ่ายตังค์เข้าไป ผมมองว่าน้ำหนักมันเบาหวิว ค่ายหลอกเอาตังค์ สู้เอาเวลามาปั้นนวัตกรรมบอร์ดวัดควันบุหรี่ (Smart Smoking Detector) ของจริงดีกว่า",
        shift: "จากค่ายพาณิชย์ไร้น้ำหนัก สู่ Hardware Prototype + Process Log",
      },
    ],
  },
];
