/**
 * Launch story reels (2026-11-20): written by Gemini 4 Neon, reviewed for facts
 * and house rules (Claude, every source opened), logic (Codex) and Thai
 * (Cursor), then revised. Three "lost", two "round1", one per new career.
 */
import type { StoryScript } from "../types";

const launch: readonly StoryScript[] = [
  {
    "id": "lost-01-dinner",
    "series": "lost",
    "titleTh": "โต๊ะกินข้าวกับคำถามยอดฮิต",
    "hookTh": "คำถามเดียวที่ทำข้าวติดคอ",
    "hookVariantsTh": [
      "กินข้าวอยู่ดีๆ โดนถามคำนี้",
      "ม.ปลายแล้ว ยังตอบแม่ไม่ได้"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "ขึ้น ม.ปลายแล้ว สรุปลูกจะเข้าคณะอะไร?",
        "scene": "dinner-table",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "เอ่อ... ก็กำลังดูๆ อยู่อะแม่",
        "scene": "dinner-table",
        "ms": 2600
      },
      {
        "who": "text",
        "lineTh": "ในใจ: ยังไม่รู้ด้วยซ้ำว่าชอบอะไร",
        "scene": "dinner-table",
        "ms": 2800,
        "big": true
      },
      {
        "who": "student",
        "lineTh": "ทำไมทุกคนดูรู้ทางกันหมด เหลือเราคนเดียวที่ยังงงอยู่",
        "scene": "bedroom-night",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "ที่ยังไม่รู้ ไม่ใช่เพราะเธอไม่ตั้งใจนะ",
        "mood": "serious",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "บางทีก็แค่ยังนึกภาพไม่ออก ว่าแต่ละอาชีพวันๆ ทำอะไรบ้าง",
        "mood": "talk",
        "scene": "bedroom-night",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "อยากเห็นภาพงาน เธอลองไปส่องอาชีพใน Radar ดูก่อนสิ",
        "mood": "wink",
        "scene": "radar",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "เออ แบบนี้ค่อยคุยกับที่บ้านรู้เรื่องหน่อย",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่โดนถามคำนี้ทุกมื้อเย็น",
    "captionIgTh": "คำถามเดียวที่ทำข้าวติดคอ\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่โดนถามคำนี้ทุกมื้อเย็น\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    "captionTtTh": "คำถามเดียวที่ทำข้าวติดคอ\nข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber",
    "factRefs": [
      {
        "claim": "Career Radar เป็นหน้าสำรวจสายอาชีพบน passionseed.org แต่ละอาชีพมีหน้าบอกว่าทำงานอะไร (ตอนนี้มีไซเบอร์ซีเคียวริตี้ วิศวกร AI นักวิทยาศาสตร์ข้อมูล และนักพัฒนาซอฟต์แวร์)",
        "source": "Career Radar (passionseed.org) เปิดดู 20 พ.ย. 2569",
        "url": "https://www.passionseed.org/radar"
      }
    ]
  },
  {
    "id": "lost-02-friends",
    "series": "lost",
    "titleTh": "เพื่อนเลือกคณะแล้ว เหลือแค่เรา",
    "hookTh": "เพื่อนรู้คณะหมด เหลือแค่เรา",
    "hookVariantsTh": [
      "เพื่อนเล็งคณะแล้ว เราล่ะ?",
      "ยังไม่รู้จะเรียนไร ผิดไหม?"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "ฉันเล็งวิศวะไว้แล้ว แล้วแกอะ จะเข้าคณะไหน?",
        "scene": "classroom",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "ฮ่าๆ เดี๋ยวค่อยคิดละกัน ยังมีเวลา",
        "scene": "classroom",
        "ms": 2600
      },
      {
        "who": "text",
        "lineTh": "เดินออกจากโรงเรียนแบบใจโหวงสุดๆ",
        "scene": "school-gate",
        "ms": 2600,
        "big": true
      },
      {
        "who": "student",
        "lineTh": "หรือเราตามเพื่อนไม่ทันแล้วจริงๆ อะ",
        "scene": "school-gate",
        "ms": 2800
      },
      {
        "who": "host",
        "lineTh": "คนที่ตอบเร็ว ไม่ได้แปลว่าเคยเห็นงานจริงนะ",
        "mood": "wink",
        "scene": "school-gate",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "TDRI ชี้คนทำงานไทยราว 2.2 ล้านคน เสี่ยงสูงที่ AI จะทำงานแทน",
        "mood": "serious",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "แถมเด็กจบใหม่หางานระดับเริ่มต้นยากขึ้น ดูแค่ชื่อคณะไม่พอนะ",
        "mood": "talk",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "ไม่ต้องแข่งกับเพื่อน ลองส่องใน Radar ก่อนว่างานที่สนใจทำอะไร",
        "mood": "wow",
        "scene": "radar",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "เออจริง ขอไปส่องก่อน เดี๋ยวค่อยตอบเพื่อน",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่ยังตอบไม่ได้เหมือนกัน",
    "captionIgTh": "เพื่อนรู้คณะหมด เหลือแค่เรา\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ยังตอบไม่ได้เหมือนกัน\n\n#CareerRadar #เลือกคณะ #TCAS #เลือกอาชีพ",
    "captionTtTh": "เพื่อนรู้คณะหมด เหลือแค่เรา\nข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber",
    "factRefs": [
      {
        "claim": "TDRI ประเมินว่าแรงงานไทยราว 2.2 ล้านคน (5.6%) อยู่ในกลุ่มอาชีพที่ AI ทำงานย่อยแทนได้ ทั้งกลุ่มเสี่ยงสูงมากและกลุ่มเสี่ยงสูง และระบุว่าคนจบใหม่หางานระดับเริ่มต้น (Entry-level) ได้ยากขึ้น",
        "source": "กรุงเทพธุรกิจ (Bangkokbiznews)",
        "url": "https://www.bangkokbiznews.com/economics/1258451"
      },
      {
        "claim": "Career Radar เป็นหน้าสำรวจสายอาชีพบน passionseed.org แต่ละอาชีพมีหน้าบอกว่าทำงานอะไร (ตอนนี้มีไซเบอร์ซีเคียวริตี้ วิศวกร AI นักวิทยาศาสตร์ข้อมูล และนักพัฒนาซอฟต์แวร์)",
        "source": "Career Radar (passionseed.org) เปิดดู 20 พ.ย. 2569",
        "url": "https://www.passionseed.org/radar"
      }
    ]
  },
  {
    "id": "lost-03-2am",
    "series": "lost",
    "titleTh": "ไถฟีดตอนตีสองกับแบบทดสอบอาชีพ",
    "hookTh": "ตีสองแล้ว ยังหาคณะไม่เจอ",
    "hookVariantsTh": [
      "ทำแบบทดสอบอาชีพกี่รอบก็งง",
      "ไถฟีดจนดึก แต่ใจยังเคว้ง"
    ],
    "beats": [
      {
        "who": "text",
        "lineTh": "ทำแบบทดสอบอาชีพ รอบที่เท่าไหร่แล้วไม่รู้",
        "scene": "phone-feed",
        "ms": 3000,
        "big": true
      },
      {
        "who": "student",
        "lineTh": "ผลออกมาก็ยังนึกไม่ออกอยู่ดีว่าทำงานจริงเป็นไง",
        "scene": "bedroom-night",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "ยิ่งนอนคิดวนตอนดึก ก็ยิ่งเครียด",
        "scene": "bedroom-night",
        "ms": 2800
      },
      {
        "who": "host",
        "lineTh": "นึกภาพไม่ออกก็ไม่แปลกหรอก วนคิดในหัวอย่างเดียวมันยาก",
        "mood": "serious",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ลองแก้โจทย์เล็กๆ ของงานนั้นด้วยมือตัวเองดูสิ",
        "mood": "wink",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "เหมือนเกมเลย ใน Radar เธอลองเล่นโจทย์งานได้ทีละด่าน",
        "mood": "wow",
        "scene": "radar",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ดึกแล้วพักผ่อนก่อนนะ พรุ่งนี้หัวโล่งๆ ค่อยลองด่านแรก",
        "mood": "talk",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "โอเค ปิดแบบทดสอบ นอนก่อน พรุ่งนี้ค่อยลอง",
        "scene": "bedroom-night",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่นอนไม่หลับเพราะคิดเรื่องอนาคต",
    "captionIgTh": "ตีสองแล้ว ยังหาคณะไม่เจอ\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่นอนไม่หลับเพราะคิดเรื่องอนาคต\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    "captionTtTh": "ตีสองแล้ว ยังหาคณะไม่เจอ\nข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber",
    "factRefs": [
      {
        "claim": "หน้าไซเบอร์ซีเคียวริตี้ใน Career Radar ให้ลองเล่นทีละด่าน (11 ด่าน) มีด่านลองเป็นนักป้องกันในเครื่องจำลอง และด่านภารกิจคืนนี้",
        "source": "Career Radar (passionseed.org) เปิดดู 20 พ.ย. 2569",
        "url": "https://www.passionseed.org/radar/cybersecurity"
      }
    ]
  },
  {
    "id": "round1-01-not-only-top",
    "series": "round1",
    "titleTh": "รอบ 1 ไม่ได้มีไว้แค่เด็กเทพ",
    "hookTh": "รอบ 1 มีไว้แค่เด็กเทพเหรอ?",
    "hookVariantsTh": [
      "รอบพอร์ตต้องมีแต่ถ้วยเหรอ?",
      "เข้ามหาลัยไม่ได้มีแค่ทางสอบ"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "รอบ 1 มีแต่เด็กกวาดรางวัล เราคงรอสอบอย่างเดียว",
        "scene": "school-gate",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "เออ ไม่มีถ้วยสักใบ คงหมดสิทธิ์ยื่นพอร์ตแล้วมั้ง",
        "scene": "school-gate",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "เดี๋ยวก่อน ใครบอกว่ารอบ 1 ดูแค่ถ้วยรางวัลล่ะ",
        "mood": "wow",
        "scene": "school-gate",
        "ms": 2800
      },
      {
        "who": "text",
        "lineTh": "TCAS70 มี 4 รอบ รอบแรกคือ Portfolio",
        "scene": "radar",
        "ms": 2800,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "ระบบ TCASfolio ของ TCAS70 ทำแฟ้มผลงานได้สูงสุด 40 รายการ",
        "mood": "talk",
        "scene": "radar",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ไม่ได้มีแค่รางวัล แต่มีช่องโครงงานกับกิจกรรมด้วย",
        "mood": "wink",
        "scene": "radar",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "สอบก็ดี รอบ 1 ก็อีกทางที่ผลงานเธอพูดแทนได้ ถ้าตรงเกณฑ์สาขา",
        "mood": "serious",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "เช็กประกาศของสาขาที่เล็งไว้ แล้วลองเริ่มชิ้นแรกใน Radar",
        "mood": "talk",
        "scene": "radar",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "เพิ่งรู้เลย งั้นเราก็เริ่มสร้างผลงานเองได้เหมือนกัน",
        "scene": "radar",
        "ms": 3000
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่คิดว่าตัวเองยื่นรอบ 1 ไม่ได้",
    "captionIgTh": "รอบ 1 มีไว้แค่เด็กเทพเหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่คิดว่าตัวเองยื่นรอบ 1 ไม่ได้\n\n#CareerRadar #เลือกคณะ #TCAS #รอบพอร์ต",
    "captionTtTh": "รอบ 1 มีไว้แค่เด็กเทพเหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber-round1",
    "factRefs": [
      {
        "claim": "TCAS70 มี 4 รอบ (รอบ 1 Portfolio, รอบ 2 Quota, รอบ 3 Admission, รอบ 4 Direct Admission) มหาวิทยาลัยกำหนดวันรับสมัครรอบ 1 เองตั้งแต่ 15 ส.ค. 69",
        "source": "mytcas (ทปอ.)",
        "url": "https://www.mytcas.com/"
      },
      {
        "claim": "ทปอ. เปิดใช้ระบบ TCASfolio ครั้งแรกใน TCAS70 ทำแฟ้มผลงานได้สูงสุด 40 รายการ รวมเรียงความ โครงการหรือโครงงาน กิจกรรม เกียรติบัตรหรือรางวัล และคำถามเพิ่มเติม",
        "source": "PPTV",
        "url": "https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/279213"
      },
      {
        "claim": "หน้าไซเบอร์ซีเคียวริตี้ใน Career Radar มีด่านภารกิจคืนนี้ ชื่อ \"คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก\"",
        "source": "Career Radar (passionseed.org) เปิดดู 20 พ.ย. 2569",
        "url": "https://www.passionseed.org/radar/cybersecurity"
      }
    ]
  },
  {
    "id": "round1-02-what-you-made",
    "series": "round1",
    "titleTh": "พอร์ตว่างเปล่าไม่ต้องรอค่ายแจกใบเซอร์",
    "hookTh": "พอร์ตยังว่าง เริ่มยังไงดี?",
    "hookVariantsTh": [
      "ไม่มีใบเซอร์ ยื่นพอร์ตได้ปะ",
      "หยุดรอค่าย มาทำชิ้นแรกเอง"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "เพื่อนไปค่ายกันเต็มเลย แต่แฟ้มเรายังว่างเปล่า",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "ไม่มีใบเกียรติบัตรเลย จะเอาอะไรไปยื่นรอบ 1",
        "scene": "phone-feed",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ใจเย็นก่อน ไม่ต้องรอใครจัดค่ายให้ถึงจะเริ่มได้นะ",
        "mood": "serious",
        "scene": "bedroom-night",
        "ms": 3000
      },
      {
        "who": "text",
        "lineTh": "ผลงานที่เธอทำเอง ใส่พอร์ตได้นะ ถ้าตรงเกณฑ์คณะ",
        "scene": "bedroom-night",
        "ms": 3000,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "TCASfolio ใน TCAS70 ใส่ผลงานได้สูงสุด 40 รายการ",
        "mood": "talk",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "ใส่ได้ทั้งโครงงาน โครงการ และกิจกรรมที่ลงมือทำจริง",
        "mood": "wink",
        "scene": "radar",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "แต่ละคณะเกณฑ์กับวันปิดรับไม่เหมือนกัน เช็กได้ที่ mytcas",
        "mood": "serious",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "ถ้าอยากรู้ว่าจะเริ่มทำอะไรคืนนี้ ลองเล่นอาชีพใน Radar ดู",
        "mood": "wow",
        "scene": "radar",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "โอเค ไม่รอค่ายแล้ว เริ่มจากชิ้นเล็กๆ คืนนี้เลย",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่พอร์ตยังว่างเหมือนกัน",
    "captionIgTh": "พอร์ตยังว่าง เริ่มยังไงดี?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่พอร์ตยังว่างเหมือนกัน\n\n#CareerRadar #เลือกคณะ #TCAS #รอบพอร์ต",
    "captionTtTh": "พอร์ตยังว่าง เริ่มยังไงดี?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/cyber-round1",
    "factRefs": [
      {
        "claim": "TCAS70 มี 4 รอบ มหาวิทยาลัยกำหนดวันรับสมัครรอบ 1 Portfolio เองตั้งแต่ 15 ส.ค. 69 และประกาศผลในระบบ 10 มี.ค. 70 วันปิดรับสมัครต่างกันไปตามมหาวิทยาลัยและหลักสูตร และแต่ละโครงการประกาศเกณฑ์ของตัวเอง (repo fact f.tcas70-rounds)",
        "source": "mytcas (ทปอ.)",
        "url": "https://www.mytcas.com/"
      },
      {
        "claim": "ทปอ. เปิดใช้ระบบ TCASfolio ใน TCAS70 ทำแฟ้มผลงานได้สูงสุด 40 รายการ รวมถึงโครงการ โครงงาน และกิจกรรม (repo fact f.tcasfolio)",
        "source": "PPTV",
        "url": "https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/279213"
      }
    ]
  },
  {
    "id": "career-01-ux-design",
    "series": "career",
    "slug": "ux-design",
    "titleTh": "UX/UI ไม่ใช่แค่วาดหน้าจอแอปสวยๆ",
    "hookTh": "นึกว่า UX/UI แค่วาดแอปสวยๆ",
    "hookVariantsTh": [
      "วาดไม่เก่ง ทำ UX/UI ได้ไหม",
      "เคยหาปุ่มยกเลิกไม่เจอไหม?"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "โอ๊ย ปุ่มยกเลิกในแอปนี้ซ่อนไว้ไหนเนี่ย กดพลาดอีกแล้ว",
        "scene": "phone-feed",
        "ms": 3200
      },
      {
        "who": "friend",
        "lineTh": "ไปสาย UX/UI สิ นั่งวาดหน้าจอแอปสวยๆ ในคาเฟ่ชิลๆ",
        "scene": "career:ux-design/dream",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "เดี๋ยว นั่นมันแค่ภาพในหัวนะ",
        "mood": "wink",
        "scene": "career:ux-design/dream",
        "ms": 2400
      },
      {
        "who": "text",
        "lineTh": "งานซ้ำๆ อย่างหน้าจอพื้นฐาน AI ช่วยทำได้แล้ว",
        "scene": "career:ux-design/work",
        "ms": 3000,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "งานจริงคือแกะนิสัยคน คุยกับทีมพัฒนา ค้านดีไซน์ที่หลอกให้กด",
        "mood": "serious",
        "scene": "career:ux-design/work",
        "ms": 3600
      },
      {
        "who": "host",
        "lineTh": "ตำแหน่ง Junior แข่งดุ บริษัทดูวิธีแก้ปัญหา ไม่ใช่แค่รูปสวย",
        "mood": "talk",
        "scene": "career:ux-design/work",
        "ms": 3600
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองแก้หน้าแอปที่ทำให้เธอหงุดหงิด แล้วให้เพื่อนลองกดดู",
        "mood": "wow",
        "scene": "career:ux-design/tonight",
        "ms": 3600
      },
      {
        "who": "student",
        "lineTh": "วาดรูปไม่เก่ง แต่จับผิดแอปเก่ง แบบนี้มีลุ้นแฮะ",
        "scene": "radar",
        "ms": 3000
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่าน UX/UI ให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ชอบบ่นว่าแอปออกแบบมางง",
    "captionIgTh": "นึกว่า UX/UI แค่วาดแอปสวยๆ\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ชอบบ่นว่าแอปออกแบบมางง\n\n#CareerRadar #เลือกคณะ #TCAS #UXUI",
    "captionTtTh": "นึกว่า UX/UI แค่วาดแอปสวยๆ\nข้อมูลเต็ม พิมพ์ passionseed.org/r/ux",
    "factRefs": [
      {
        "claim": "ระบบอัตโนมัติและ AI ลดงานออกแบบซ้ำซาก ทำให้ UX/UI Designer ต้องเน้นงานกลยุทธ์และความคิดสร้างสรรค์มากขึ้น",
        "source": "Anblicks",
        "url": "https://www.anblicks.com/blog/how-ai-is-transforming-ux-design-in-2025-and-beyond/"
      },
      {
        "claim": "งานของนักออกแบบหน้าจอดิจิทัลรวมถึงการวิจัยผู้ใช้และวิเคราะห์ฟีดแบ็กเพื่อปรับดีไซน์ และการทำงานร่วมกับนักพัฒนาทั้ง front-end และ back-end",
        "source": "O*NET Online (Web and Digital Interface Designers)",
        "url": "https://www.onetonline.org/link/summary/15-1255.00"
      },
      {
        "claim": "Dark patterns คือการออกแบบที่ตั้งใจทำให้ผู้ใช้สับสนหรือเผลอตัดสินใจเพื่อประโยชน์ของบริษัทมากกว่าผู้ใช้",
        "source": "Think Design / Medium",
        "url": "https://medium.com/@marketingtd64/the-ethics-of-dark-patterns-in-ui-design-a-deep-dive-4c6ce5fbfb88"
      },
      {
        "claim": "NN/g (16 ม.ค. 2026): จำนวนคนที่อยากเข้าสาย UX ยังมากกว่าตำแหน่งที่เปิดรับ โดยเฉพาะระดับ Junior และตำแหน่งระดับเริ่มต้นยังหายากและแข่งขันสูง",
        "source": "Nielsen Norman Group",
        "url": "https://www.nngroup.com/articles/state-of-ux-2026/"
      },
      {
        "claim": "ผู้จ้างงาน UX อยากเห็นกระบวนการออกแบบและหลักฐานการทดสอบกับผู้ใช้จริง พอร์ตที่ดีต้องมากกว่าภาพสวย",
        "source": "Skillcrush",
        "url": "https://skillcrush.com/blog/ux-design-portfolio-advice/"
      }
    ]
  },
  {
    "id": "career-02-content-creator",
    "series": "career",
    "slug": "content-creator",
    "titleTh": "เป็นครีเอเตอร์ไม่ต้องดังก่อนก็ได้",
    "hookTh": "ทำคอนเทนต์ต้องดังก่อนไหม?",
    "hookVariantsTh": [
      "ยังไม่ดัง ทำคอนเทนต์ได้ไหม?",
      "เบื้องหลังคลิปไวรัลไม่ง่าย"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "วันๆ เอาแต่ตัดคลิป มันจะไปทำเป็นอาชีพได้จริงเหรอ?",
        "scene": "dinner-table",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "ตอนแรกก็คิดว่าต้องดังสุดๆ ถึงจะทำสายคอนเทนต์ได้",
        "scene": "career:content-creator/dream",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ไม่ต้องดังเลย หลายคนทำคอนเทนต์ให้แบรนด์ ไม่ได้ปั้นตัวเอง",
        "mood": "wow",
        "scene": "career:content-creator/dream",
        "ms": 3600
      },
      {
        "who": "host",
        "lineTh": "ทั้งดูแลเพจแบรนด์ ตัดต่อคลิป ทำพอดแคสต์ ยันไลฟ์ขายของ",
        "mood": "talk",
        "scene": "career:content-creator/work",
        "ms": 3400
      },
      {
        "who": "text",
        "lineTh": "ผลสำรวจ Adobe: ครีเอเตอร์ 86% ใช้ AI ช่วยทำงานแล้ว",
        "scene": "career:content-creator/work",
        "ms": 3000,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "AI ช่วยได้ แต่จะเล่าอะไรให้ต่าง เธอยังต้องคิดเอง",
        "mood": "serious",
        "scene": "career:content-creator/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "แล้วต้องอ่านสถิติว่าคนดูหลุดตรงไหน มาแก้คลิปถัดไป",
        "mood": "talk",
        "scene": "career:content-creator/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองถ่ายคลิปสั้นเรื่องที่เธอรู้ดี เปิดด้วยช็อตเด็ดสุด",
        "mood": "wink",
        "scene": "career:content-creator/tonight",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "ไม่ต้องรอให้ดังก่อน งั้นคืนนี้ลองถ่ายคลิปแรกเลย",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่านครีเอเตอร์ให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ชอบถ่ายคลิปเก็บไว้ในเครื่อง",
    "captionIgTh": "ทำคอนเทนต์ต้องดังก่อนไหม?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ชอบถ่ายคลิปเก็บไว้ในเครื่อง\n\n#CareerRadar #เลือกคณะ #TCAS #ContentCreator",
    "captionTtTh": "ทำคอนเทนต์ต้องดังก่อนไหม?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/creator",
    "factRefs": [
      {
        "claim": "งานสาย Content Creator รวมถึงการเขียนบทความ ทำวิดีโอ และทำพอดแคสต์ ส่วน Social Media Manager วางแผนและดูแลการโพสต์เนื้อหา ตอบกลับผู้ติดตาม และใช้เครื่องมือวิเคราะห์ข้อมูลเพื่อปรับแคมเปญ (guide fact f.cc-roles)",
        "source": "TruePlookpanya (3 ม.ค. 2568)",
        "url": "https://www.trueplookpanya.com/knowledge/content/95674-careeroverview-careerdevelopment-"
      },
      {
        "claim": "ตัวอย่างประกาศงานจริง: บริษัทรับพิธีกรไลฟ์ (Live Commerce Host) แนะนำและขายสินค้า ตอบคำถามผู้ชม และประสานงานกับแอดมินและทีมการตลาดระหว่างไลฟ์ (guide fact f.cc-live-host)",
        "source": "jobbkk.com (ประกาศ 17 พ.ย. 2026)",
        "url": "https://jobbkk.com/jobs/detail/247473/1397872"
      },
      {
        "claim": "ผลสำรวจ Adobe ร่วมกับ The Harris Poll (ก.ย. 2025) ในกลุ่มครีเอเตอร์กว่า 16,000 คนใน 8 ประเทศ ส่วนใหญ่เป็นครีเอเตอร์มือใหม่และกึ่งมืออาชีพ พบว่า 86% ใช้ creative generative AI",
        "source": "Adobe Newsroom (28 ต.ค. 2025)",
        "url": "https://news.adobe.com/news/2025/10/adobe-max-2025-creators-survey"
      },
      {
        "claim": "รายงานการคงผู้ชมไว้ของ YouTube แสดงช่วงที่ผู้ชมกดข้ามหรือออกจากวิดีโอ และเปอร์เซ็นต์ผู้ชมที่ยังดูต่อหลัง 30 วินาทีแรก (guide fact f.cc-yt-retention)",
        "source": "YouTube Help",
        "url": "https://support.google.com/youtube/answer/9314415?hl=th"
      }
    ]
  },
  {
    "id": "career-03-medical-technologist",
    "series": "career",
    "slug": "medical-technologist",
    "titleTh": "คนหลังฉากที่หมอต้องรอผลตรวจ",
    "hookTh": "ก่อนหมอรักษา ใครตรวจเลือด?",
    "hookVariantsTh": [
      "สายแพทย์ แต่ไม่อยากเป็นหมอ",
      "ผลเลือดเพี้ยน ใครจับได้?"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "ชอบชีวะกับเคมี อยากช่วยคนไข้ แต่ไม่ได้อยากเป็นหมอ",
        "scene": "classroom",
        "ms": 3200
      },
      {
        "who": "friend",
        "lineTh": "ลองเทคนิคการแพทย์ปะ ใส่กาวน์กดเครื่องตรวจเลือดชิลๆ",
        "scene": "career:medical-technologist/dream",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "เดี๋ยว ไม่ใช่แค่โยนหลอดเก็บเลือดเข้าเครื่องนะ",
        "mood": "serious",
        "scene": "career:medical-technologist/dream",
        "ms": 3000
      },
      {
        "who": "text",
        "lineTh": "เครื่องให้ตัวเลข แต่คนนี้เช็กก่อนผลถึงมือหมอ",
        "scene": "career:medical-technologist/work",
        "ms": 2800,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "เช็กหลอดก่อนตรวจ คุมคุณภาพผล บางค่าต้องส่องกล้องดูเอง",
        "mood": "talk",
        "scene": "career:medical-technologist/work",
        "ms": 3600
      },
      {
        "who": "host",
        "lineTh": "เจอค่าวิกฤตต้องรีบแจ้งหมอ พลาดนิดเดียวก็กระทบชีวิตคนได้",
        "mood": "serious",
        "scene": "career:medical-technologist/work",
        "ms": 3600
      },
      {
        "who": "host",
        "lineTh": "จบแล้วต้องสอบใบประกอบวิชาชีพ ก่อนทำงานแล็บโรงพยาบาล",
        "mood": "talk",
        "scene": "career:medical-technologist/work",
        "ms": 3500
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองใช้หยดน้ำเปลี่ยนมือถือเป็นกล้องส่อง แล้วจดแบบคนแล็บ",
        "mood": "wink",
        "scene": "career:medical-technologist/tonight",
        "ms": 3600
      },
      {
        "who": "student",
        "lineTh": "โห คนหลังฉากสำคัญสุดๆ เพิ่งเห็นภาพชัดเลย",
        "scene": "radar",
        "ms": 2600
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่านเทคนิคการแพทย์ให้",
    "sendToFriendTh": "ส่งให้เพื่อนสายวิทย์ที่ไม่ได้อยากเป็นหมอ",
    "captionIgTh": "ก่อนหมอรักษา ใครตรวจเลือด?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนสายวิทย์ที่ไม่ได้อยากเป็นหมอ\n\n#CareerRadar #เลือกคณะ #TCAS #เทคนิคการแพทย์",
    "captionTtTh": "ก่อนหมอรักษา ใครตรวจเลือด?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/medtech",
    "factRefs": [
      {
        "claim": "นักเทคนิคการแพทย์ทดสอบตัวอย่างทางการแพทย์ ใช้อุปกรณ์แล็บอย่างกล้องจุลทรรศน์และเครื่องนับเซลล์อัตโนมัติ บันทึกผล และคุยผลตรวจกับแพทย์",
        "source": "U.S. Bureau of Labor Statistics",
        "url": "https://www.bls.gov/ooh/healthcare/clinical-laboratory-technologists-and-technicians.htm"
      },
      {
        "claim": "งานหลักของสายนี้: วิเคราะห์ผลแล็บเพื่อตรวจความถูกต้องของผล ดูแลระบบประกันคุณภาพให้ผลแม่นยำ และสื่อสารผลตรวจกับบุคลากรทางการแพทย์",
        "source": "O*NET Online (Medical and Clinical Laboratory Technologists)",
        "url": "https://www.onetonline.org/link/summary/29-2011.00"
      },
      {
        "claim": "งานวิจัยในแล็บโรงพยาบาลแห่งหนึ่งที่อิตาลี: ความผิดพลาดส่วนใหญ่เกิดก่อนการตรวจวิเคราะห์ ที่พบบ่อยคือเติมเลือดในหลอดไม่ถูกต้องและระบุตัวผู้ป่วยผิด และความผิดพลาดในแล็บอาจส่งผลเสียต่อผู้ป่วย (guide fact f.mt-preanalytical)",
        "source": "Carraro & Plebani, Clinical Chemistry (via acutecaretesting.org)",
        "url": "https://acutecaretesting.org/en/journal-scans/a-study-of-error-rates-in-laboratory-medicine"
      },
      {
        "claim": "เกณฑ์ของ International Consensus Group for Hematology Review: ผลตรวจนับเม็ดเลือดอัตโนมัติบางค่าและสัญญาณเตือนบางแบบของเครื่อง ต้องตามด้วยการตรวจสไลด์ใต้กล้องจุลทรรศน์",
        "source": "International Society for Laboratory Hematology (ISLH)",
        "url": "https://www.islh.org/web/consensus_rules.php"
      },
      {
        "claim": "ค่าวิกฤตคือผลตรวจที่ผิดปกติจนอาจเป็นอันตรายถึงชีวิตถ้าไม่รีบแก้ไข เมื่อยืนยันค่าวิกฤตแล้วแล็บต้องแจ้งแพทย์ และการแจ้งทันทีถือเป็นข้อกำหนดพิเศษ",
        "source": "Arbiol-Roca et al., Biochemia Medica",
        "url": "https://www.biochemia-medica.com/en/journal/29/1/10.11613/BM.2019.010704"
      },
      {
        "claim": "จบเทคนิคการแพทย์แล้วต้องสอบใบอนุญาตประกอบวิชาชีพเทคนิคการแพทย์ ควบคุมโดยสภาเทคนิคการแพทย์ และนักเทคนิคการแพทย์ในโรงพยาบาลต้องมีใบประกอบวิชาชีพ (guide fact f.mt-licence)",
        "source": "Eduzones (17 เม.ย. 2026)",
        "url": "https://www.eduzones.com/2026/04/17/medical-technology-2/"
      },
      {
        "claim": "สภาเทคนิคการแพทย์ออกใบอนุญาตและกำกับวิชาชีพตาม พ.ร.บ. วิชาชีพเทคนิคการแพทย์ พ.ศ. 2547 (guide fact f.mt-licence)",
        "source": "Hfocus (17 พ.ย. 2026)",
        "url": "https://www.hfocus.org/content/2026/11/40287"
      },
      {
        "claim": "หยดน้ำบนเลนส์กล้องมือถือทำหน้าที่เป็นเลนส์ขยาย ส่องของเล็กๆ ได้แบบกล้องจุลทรรศน์ชั่วคราว (ระวังน้ำโดนตัวเครื่อง) (guide fact f.mt-water-drop)",
        "source": "Scientific American",
        "url": "https://www.scientificamerican.com/blog/compound-eye/transform-your-iphone-into-a-microscope-just-add-water/"
      }
    ]
  },
  {
    "id": "career-04-mechanical-engineer",
    "series": "career",
    "slug": "mechanical-engineer",
    "titleTh": "วิศวะเครื่องกลไม่ได้สร้างแค่หุ่นยนต์",
    "hookTh": "เครื่องกลทำแค่หุ่นยนต์เหรอ?",
    "hookVariantsTh": [
      "วิศวะเครื่องกล วันๆ ทำอะไร?",
      "สายชอบรื้อของ มาทางนี้เลย"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "ชอบรื้อของ ชอบรถยนต์ไฟฟ้า อยากเข้าวิศวะเครื่องกล",
        "scene": "classroom",
        "ms": 3000
      },
      {
        "who": "friend",
        "lineTh": "เท่เลย นั่งออกแบบหุ่นยนต์ล้ำๆ ในห้องแอร์ทั้งวันปะ",
        "scene": "career:mechanical-engineer/dream",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ภาพในหนังกับหน้างานจริง ต่างกันเยอะอยู่นะ",
        "mood": "wink",
        "scene": "career:mechanical-engineer/dream",
        "ms": 2800
      },
      {
        "who": "text",
        "lineTh": "ใส่รองเท้าเซฟตี้ ลงโรงงาน สืบหาจุดพัง",
        "scene": "career:mechanical-engineer/work",
        "ms": 2800,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "ต้องจำลองแรงกด ตรวจแบบให้เป๊ะ ผ่าดูว่าทำไมชิ้นส่วนแตก",
        "mood": "talk",
        "scene": "career:mechanical-engineer/work",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "AI ช่วยร่างแบบกับคำนวณซ้ำๆ ได้ แต่คนรับผิดชอบยังเป็นวิศวกร",
        "mood": "serious",
        "scene": "career:mechanical-engineer/work",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "แอร์ก็งานเครื่องกลนะ ปี 2567 ไทยส่งออกกว่า 21 ล้านเครื่อง",
        "mood": "wow",
        "scene": "career:mechanical-engineer/work",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองแกะปากกากดสักด้าม วาดดูว่ามันทำงานยังไง",
        "mood": "wink",
        "scene": "career:mechanical-engineer/tonight",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "ไม่ได้นั่งห้องแอร์อย่างเดียว แต่ยิ่งฟังยิ่งอยากลองแฮะ",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่านเครื่องกลให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่เล็งวิศวะเครื่องกลไว้",
    "captionIgTh": "เครื่องกลทำแค่หุ่นยนต์เหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่เล็งวิศวะเครื่องกลไว้\n\n#CareerRadar #เลือกคณะ #TCAS #วิศวะเครื่องกล",
    "captionTtTh": "เครื่องกลทำแค่หุ่นยนต์เหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/mech",
    "factRefs": [
      {
        "claim": "O*NET (Mechanical Engineers): งานของวิศวกรเครื่องกลรวมถึงสืบหาสาเหตุที่อุปกรณ์ขัดข้องแล้วเสนอวิธีแก้ ทดสอบและวิเคราะห์การทำงานของอุปกรณ์และชิ้นส่วน พัฒนาหรือทดสอบแบบจำลองของแบบทางเลือก อ่านแบบ ใช้ CAD และซอฟต์แวร์วิเคราะห์อย่าง MSC Nastran ดูแลการผลิตในโรงงาน (การผลิตเป็นหนึ่งในสองอุตสาหกรรมหลักของอาชีพนี้) และงานระบบปรับอากาศ HVAC กับระบบทำความเย็น บางงานต้องใส่อุปกรณ์ป้องกันอย่างรองเท้าเซฟตี้",
        "source": "O*NET OnLine (17-2141.00 Mechanical Engineers)",
        "url": "https://www.onetonline.org/link/summary/17-2141.00"
      },
      {
        "claim": "AI ไม่ได้มาแทนวิศวกร แต่ทำงานซ้ำๆ อย่างโมเดล CAD พื้นฐานและการจำลองตามปกติ เช่นวิเคราะห์แรงและความร้อน ระบบ AI ไม่ได้รับผิดชอบทางกฎหมายหรือทางวิชาชีพต่อผลงาน ความรับผิดชอบยังอยู่ที่วิศวกร",
        "source": "Neural Concept (vendor: บล็อกของบริษัทที่ขายซอฟต์แวร์ AI ด้านวิศวกรรม)",
        "url": "https://www.neuralconcept.com/post/will-ai-replace-engineers"
      },
      {
        "claim": "ASME, Engineers Learn to Work with AI (8 ก.พ. 2021): ฟีเจอร์ generative design ในโปรแกรม CAD สร้างแบบให้อัตโนมัติจากเงื่อนไขที่วิศวกรกำหนด แต่วิศวกรยังต้องเข้าใจโจทย์ ใช้ความรู้และประสบการณ์ตัดสินใจ และดูออกว่าแบบที่ได้ผิดเมื่อใส่เงื่อนไขผิด",
        "source": "ASME (American Society of Mechanical Engineers)",
        "url": "https://www.asme.org/topics-resources/content/engineers-learn-to-work-with-ai"
      },
      {
        "claim": "ฐานเศรษฐกิจ (19 ก.ค. 2568): ปี 2567 ไทยส่งออกเครื่องปรับอากาศแบบติดผนังมากกว่า 21 ล้านเครื่อง มูลค่า 7,044 ล้านดอลลาร์สหรัฐ เพิ่มขึ้นร้อยละ 9 จากปี 2566 ทำให้ไทยเป็นผู้ส่งออกเครื่องปรับอากาศรายใหญ่อันดับ 3 ของโลก รองจากจีนและเม็กซิโก",
        "source": "ฐานเศรษฐกิจ (Thansettakij)",
        "url": "https://www.thansettakij.com/business/marketing/633316"
      }
    ]
  },
  {
    "id": "career-05-accountant",
    "series": "career",
    "slug": "accountant",
    "titleTh": "บัญชีจะโดน AI แย่งงานจริงไหม",
    "hookTh": "เรียนบัญชี AI แย่งงานไหม?",
    "hookVariantsTh": [
      "แม่ให้เรียนบัญชี แต่กลัว AI",
      "นักบัญชีไม่ใช่คนนั่งบวกเลข"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "เรียนบัญชีสิ มั่นคง ทุกบริษัทก็ต้องมีคนทำบัญชี",
        "scene": "dinner-table",
        "ms": 3000
      },
      {
        "who": "student",
        "lineTh": "แต่เดี๋ยวนี้ AI ลงบัญชีแทนคนได้หมดแล้วไม่ใช่เหรอ?",
        "scene": "career:accountant/dream",
        "ms": 3000
      },
      {
        "who": "host",
        "lineTh": "ตอบตรงๆ นะ งานบัญชีกำลังเปลี่ยน มาดูว่าอะไรยังต้องใช้คน",
        "mood": "serious",
        "scene": "career:accountant/dream",
        "ms": 3000
      },
      {
        "who": "text",
        "lineTh": "งานลงบิลซ้ำๆ กำลังโดน AI แทนที่จริง",
        "scene": "career:accountant/work",
        "ms": 2800,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "นายจ้างทั่วโลกคาดว่า งานนักบัญชีกับผู้สอบบัญชีจะลดลงเร็ว",
        "mood": "serious",
        "scene": "career:accountant/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "แต่งานที่ต้องคิด เช่นจับพิรุธในงบ วางแผนภาษี ยังต้องใช้คน",
        "mood": "talk",
        "scene": "career:accountant/work",
        "ms": 3400
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองจดรับจ่ายของตัวเอง แล้วหาจุดเงินรั่วในตารางดู",
        "mood": "wink",
        "scene": "career:accountant/tonight",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "อ๋อ ไม่ใช่แค่บวกเลข แต่มันคืองานนักสืบตัวเลขชัดๆ",
        "scene": "radar",
        "ms": 3000
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่านบัญชีให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ทางบ้านเชียร์ให้เรียนบัญชี",
    "captionIgTh": "เรียนบัญชี AI แย่งงานไหม?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ทางบ้านเชียร์ให้เรียนบัญชี\n\n#CareerRadar #เลือกคณะ #TCAS #บัญชี",
    "captionTtTh": "เรียนบัญชี AI แย่งงานไหม?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/acc",
    "factRefs": [
      {
        "claim": "World Economic Forum, Future of Jobs Report 2025 (ม.ค. 2025): นายจ้างที่ตอบแบบสำรวจทั่วโลกคาดว่า งานที่ลดลงเร็วที่สุดช่วง 2025 ถึง 2030 มีงานเสมียนบัญชี ลงบัญชี และทำเงินเดือน (Accounting, Bookkeeping and Payroll Clerks) และเนื้อรายงานหน้า 20 ระบุนักบัญชีและผู้สอบบัญชี (Accountants and Auditors) อยู่ในกลุ่มที่ลดลงเร็วด้วย ตัวขับหลักคือการเข้าถึงดิจิทัลที่กว้างขึ้น AI และเทคโนโลยีประมวลผลข้อมูล และหุ่นยนต์ เป็นผลสำรวจนายจ้างทั่วโลก ไม่ใช่ตัวเลขเฉพาะไทย",
        "source": "World Economic Forum, Future of Jobs Report 2025",
        "url": "https://reports.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf"
      },
      {
        "claim": "FlowAccount (19 ส.ค. 2026): AI OCR อ่านข้อความจากใบเสร็จ ใบกำกับภาษี และเอกสารต่างๆ แล้วลงระบบให้ RPA ทำงานที่มีขั้นตอนซ้ำๆ เช่นบันทึกรายการบัญชีและกระทบยอดบัญชี แต่ AI ยังทดแทนการวิเคราะห์ การวางแผนภาษี การประเมินความเสี่ยง และการให้คำปรึกษาทางธุรกิจไม่ได้",
        "source": "FlowAccount (vendor: บริษัทขายโปรแกรมบัญชี)",
        "url": "https://flowaccount.com/blog/digital-accountant-skills/"
      },
      {
        "claim": "วารสารสภาวิชาชีพบัญชี (18 ส.ค. 2020): นักบัญชีนิติวิทยาทำงานสืบสวน รวบรวม และพิสูจน์พยานหลักฐานในคดีอาชญากรรมทางเศรษฐกิจ รวมทั้งเป็นพยานผู้เชี่ยวชาญในชั้นศาล",
        "source": "วารสารสภาวิชาชีพบัญชี (การบัญชีนิติวิทยา: การยกระดับสู่การเป็นวิชาชีพในประเทศไทย)",
        "url": "https://so02.tci-thaijo.org/index.php/JFAC/article/view/242719"
      }
    ]
  },
  {
    "id": "career-06-marketing-strategist",
    "series": "career",
    "slug": "marketing-strategist",
    "titleTh": "การตลาดไม่ได้มีแค่คิดแคปชันไวรัล",
    "hookTh": "การตลาดคือปั่นไวรัลเหรอ?",
    "hookVariantsTh": [
      "AI ทำแอดแล้ว การตลาดรอดไหม?",
      "ทำไมคนถึงยอมควักเงินซื้อ?"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "แคมเปญนี้ไวรัลจัด อยากทำการตลาด จะได้คิดมุกปังๆ ทั้งวัน",
        "scene": "phone-feed",
        "ms": 3200
      },
      {
        "who": "friend",
        "lineTh": "แต่เดี๋ยวนี้ AI ก็เขียนแคปชันกับยิงแอดแทนได้แล้วปะ",
        "scene": "career:marketing-strategist/dream",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "เรื่องคอนเทนต์จริงนะ ผลสำรวจพบนักการตลาด 80% ใช้ AI ช่วยแล้ว",
        "mood": "wow",
        "scene": "career:marketing-strategist/dream",
        "ms": 3200
      },
      {
        "who": "text",
        "lineTh": "แต่ทำคอนเทนต์ กับวางกลยุทธ์ เป็นคนละงานกันเลย",
        "scene": "career:marketing-strategist/work",
        "ms": 3000,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "งานจริงไม่ใช่แค่ปั่นไวรัล แต่คืออ่านข้อมูลกับใจคนซื้อ",
        "mood": "serious",
        "scene": "career:marketing-strategist/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "ต้องวางแผนงบ วัดความคุ้มค่า และเลือกว่าจะพูดกับใคร",
        "mood": "talk",
        "scene": "career:marketing-strategist/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองเขียนแผนหน้าเดียว ชวนเพื่อนแวะร้านหน้าโรงเรียนเพิ่ม",
        "mood": "wink",
        "scene": "career:marketing-strategist/tonight",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "นึกว่ามีแค่คิดคำเก๋ๆ ที่แท้คือเกมอ่านใจคนนี่เอง",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ด่านการตลาดให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ชอบแกะว่าแบรนด์ดังๆ ขายเก่งได้ไง",
    "captionIgTh": "การตลาดคือปั่นไวรัลเหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ชอบแกะว่าแบรนด์ดังๆ ขายเก่งได้ไง\n\n#CareerRadar #เลือกคณะ #TCAS #การตลาด",
    "captionTtTh": "การตลาดคือปั่นไวรัลเหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/mkt",
    "factRefs": [
      {
        "claim": "HubSpot 2026 State of Marketing Report: นักการตลาด 80% ใช้ AI สร้างคอนเทนต์ (ผลสำรวจของ HubSpot ซึ่งเป็นบริษัทขายซอฟต์แวร์การตลาด)",
        "source": "HubSpot, 2026 State of Marketing Report (vendor survey)",
        "url": "https://www.hubspot.com/stateofmarketing"
      },
      {
        "claim": "วิธีสำรวจของรายงาน HubSpot State of Marketing 2026: ข้อมูลจากนักการตลาด B2B และ B2C ทั่วโลกกว่า 1,500 คน ด้านสร้างคอนเทนต์ 42.5% ใช้ AI อย่างหนัก และ 38% ใช้เป็นบางครั้ง",
        "source": "HubSpot Blog, 2026 State of Marketing",
        "url": "https://blog.hubspot.com/marketing/inbound-marketing-data"
      },
      {
        "claim": "O*NET (Marketing Managers): งานรวมถึงประเมินงบประมาณ ค่าใช้จ่าย และผลตอบแทนการลงทุน (ROI) ริเริ่มและวิเคราะห์ผลวิจัยตลาด ติดตามเทรนด์ตลาด และทำแบบสำรวจเพื่อหากลุ่มตลาดที่มีโอกาส",
        "source": "O*NET OnLine (11-2021.00 Marketing Managers)",
        "url": "https://www.onetonline.org/link/summary/11-2021.00"
      },
      {
        "claim": "Marketeer Online (22 ส.ค. 2024, ดร.เกษม พิพัฒน์เสรีธรรม): แผนการตลาดมาจากกลยุทธ์การตลาด ระบุเป้าหมาย กลุ่มลูกค้าเป้าหมาย วิธีทำการตลาด งบประมาณ และผลที่คาดว่าจะได้ การวัดผลส่วนใหญ่คือเทียบผลจริงกับเป้าที่ตั้งไว้",
        "source": "Marketeer Online",
        "url": "https://marketeeronline.co/archives/371763"
      }
    ]
  }
];

export default launch;
