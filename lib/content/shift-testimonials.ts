/**
 * Quotes from TechSeed feedback, portfolio reviews, and KK's SHIFT account
 * supplied by the site owner. Shared by /shift and the home page so a quote is only
 * ever edited in one place.
 */

export interface ShiftTestimonial {
  name: string;
  meta: string;
  quote: string;
  /** The before/after line in the student's own terms. */
  shift?: string;
  excerpt?: string;
  project?: { title: string; url: string };
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
  {
    label: "SHIFT",
    cards: [
      {
        name: "KK",
        meta: "สวนกุหลาบ · SHIFT",
        quote:
          "ก็ตอนแรกผมคิดว่าแบบ เข้ามาแล้วพวกพี่ๆน่าจะสอนทําโครงงานทําportอะไรงี้ครับ แบบ อารมณ์ประมาณพาทําแบบบอกขั้นตอนวิธีทําอะไรงี้ครับ แต่พอเข้ามาจิงจิงแล้ว เลยรู้ว่ามันคนละอย่างเลยครับ แบบพวกพี่ๆเขาไม่ได้พาทําขนาดนั้นเหมือนเน้นเป็นให้ทําเองมากกว่าแล้ว พี่ค่อยคอยดูอยู่ห่างๆให้น้องคิดเองแก้ปัญหาเอง ยกเว้นบางอย่างที่ต้องสําคัญจิงจิงเท่านั้นพี่เขาถึงจะสอนครับ ซึ่งผมว่ามันดีมากๆเลยครับ มันแบบเหมือนได้ลงมือทําเองมีอะไรที่ไม่เคยทําก็ได้ลองทําแบบทําเองจิงจิงมีพี่ช่วยนิดหน่อย ซึ่งพอผลงานออกมาสุดท้ายแล้วก็รู้สึกภูมิใจในตัวเองมากครับแบบ อันนี้คืองานที่เราได้ทําเองคิดเองจิงจิงแบบไม่คิดว่าตัวเองจะทําได้ขนาดนี้ครับ ถึงแม้จะมีบางช่วงที่แบบเจอปัญหาไปต่อไม่ได้บ้างก็ตามแต่สุดท้ายก็ถ้าลองทําไรเองมันก็แก้ปัญหาได้จิงจิงครับ ถึงแม้บางอันจะต้องถามพี่ๆก็ตาม แต่ก็เป็นคอร์ส 7วันที่เจ๋งดีครับ",
        excerpt:
          "ซึ่งพอผลงานออกมาสุดท้ายแล้วก็รู้สึกภูมิใจในตัวเองมากครับแบบ อันนี้คืองานที่เราได้ทําเองคิดเองจิงจิงแบบไม่คิดว่าตัวเองจะทําได้ขนาดนี้ครับ",
        project: {
          title: "Magnified Lens",
          url: "https://magnified-lens-2uoi.vercel.app/",
        },
      },
    ],
  },
];
