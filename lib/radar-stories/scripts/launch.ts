/**
 * Launch story reels (2026-11-20): written by Gemini 4 Neon, reviewed for facts
 * and house rules (Claude, every source opened), logic (Codex) and Thai
 * (Cursor), then revised after a frame-by-frame QA of the filmed reels: Thai
 * lines spaced into short phrases (the renderer breaks only between phrases),
 * no three P'Seed lines in a row, 20 to 35 s, one-line share lines, the lost
 * and round1 reels link the Radar hub, and each round1 reel carries its own
 * TCAS fact. Three "lost", two "round1", one per new career.
 */
import type { StoryScript } from "../types";

const launch: readonly StoryScript[] = [
  {
    "id": "lost-01-dinner",
    "series": "lost",
    "titleTh": "โต๊ะกินข้าวกับคำถามยอดฮิต",
    "hookTh": "คำถามเดียว ที่ทำข้าวติดคอ",
    "hookVariantsTh": [
      "กินข้าวอยู่ดีๆ โดนถามคำนี้",
      "ม.ปลายแล้ว ยังตอบแม่ไม่ได้"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "ขึ้น ม.ปลายแล้ว สรุปลูก จะเข้าคณะอะไร?",
        "stressTh": "จะเข้าคณะอะไร?",
        "scene": "dinner-table",
        "ms": 2900
      },
      {
        "who": "student",
        "lineTh": "เอ่อ... ก็กำลังดูๆ อยู่อะแม่",
        "stressTh": "ดูๆ",
        "scene": "dinner-table",
        "ms": 2100
      },
      {
        "who": "text",
        "lineTh": "ในใจ: ยังไม่รู้เลย ว่าชอบอะไร",
        "stressTh": "ยังไม่รู้เลย",
        "scene": "dinner-table",
        "ms": 2400,
        "big": true
      },
      {
        "who": "student",
        "lineTh": "ทำไมทุกคน รู้ทางกันหมด เหลือแค่เรา ที่ยังงงอยู่",
        "stressTh": "เหลือแค่เรา",
        "scene": "bedroom-night",
        "ms": 3100
      },
      {
        "who": "host",
        "lineTh": "ไม่ใช่เธอไม่ตั้งใจนะ แค่ยังไม่เคยเห็น งานจริง ของแต่ละอาชีพ",
        "stressTh": "งานจริง",
        "mood": "serious",
        "scene": "bedroom-night",
        "ms": 4000
      },
      {
        "who": "host",
        "lineTh": "Radar มีอาชีพให้ส่อง ว่าวันๆ เขาทำงานอะไรกัน",
        "stressTh": "งานอะไร",
        "mood": "wink",
        "scene": "radar",
        "ms": 3200
      },
      {
        "who": "student",
        "lineTh": "เออ แบบนี้ค่อยมีเรื่อง ไปคุยกับที่บ้านหน่อย",
        "stressTh": "มีเรื่อง",
        "scene": "radar",
        "ms": 2900
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่โดนถามทุกมื้อเย็น",
    "captionIgTh": "คำถามเดียว ที่ทำข้าวติดคอ\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่โดนถามทุกมื้อเย็น\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    "captionTtTh": "คำถามเดียว ที่ทำข้าวติดคอ\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
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
        "lineTh": "ฉันเล็งวิศวะไว้แล้ว แกอะ จะเข้าคณะไหน?",
        "stressTh": "จะเข้าคณะไหน?",
        "scene": "classroom",
        "ms": 2900
      },
      {
        "who": "text",
        "lineTh": "เดินออกจาก โรงเรียน แบบใจโหวงสุดๆ",
        "stressTh": "ใจโหวง",
        "scene": "school-gate",
        "ms": 2800,
        "big": true
      },
      {
        "who": "student",
        "lineTh": "หรือเราช้ากว่าเพื่อน ไปแล้วจริงๆอะ",
        "stressTh": "ช้ากว่าเพื่อน",
        "scene": "school-gate",
        "ms": 2600
      },
      {
        "who": "host",
        "lineTh": "คนที่ตอบเร็ว ไม่ได้แปลว่า เคยเห็นงานจริงนะ",
        "stressTh": "เคยเห็นงานจริง",
        "mood": "wink",
        "scene": "school-gate",
        "ms": 3100
      },
      {
        "who": "host",
        "lineTh": "นักวิจัยไทยชี้ว่า คนทำงาน ราว 2.2 ล้านคน อยู่ในอาชีพที่ AI ทำแทนได้บางส่วน",
        "stressTh": "2.2 ล้านคน",
        "mood": "serious",
        "scene": "radar",
        "ms": 4800
      },
      {
        "who": "student",
        "lineTh": "งั้นต้องรู้ก่อน ว่างานจริงเป็นไง",
        "stressTh": "งานจริง",
        "scene": "radar",
        "ms": 2300
      },
      {
        "who": "host",
        "lineTh": "Radar ให้ส่องงานจริงก่อน ไม่ต้องแข่งกับใคร",
        "stressTh": "ไม่ต้องแข่งกับใคร",
        "mood": "wow",
        "scene": "radar",
        "ms": 3100
      },
      {
        "who": "student",
        "lineTh": "โอเค ขอไปส่องก่อน เดี๋ยวค่อยตอบเพื่อน",
        "stressTh": "ขอไปส่องก่อน",
        "scene": "radar",
        "ms": 2800
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่ยังตอบไม่ได้",
    "captionIgTh": "เพื่อนรู้คณะหมด เหลือแค่เรา\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ยังตอบไม่ได้\n\n#CareerRadar #เลือกคณะ #TCAS #เลือกอาชีพ",
    "captionTtTh": "เพื่อนรู้คณะหมด เหลือแค่เรา\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    "factRefs": [
      {
        "claim": "TDRI (สถาบันวิจัยเพื่อการพัฒนาประเทศไทย) ประเมินตามดัชนีของ ILO ว่ากลุ่มอาชีพที่ AI ทำงานย่อย (sub-tasks) แทนมนุษย์ได้ ทั้งกลุ่มเสี่ยงสูงมากและกลุ่มเสี่ยงสูง ครอบคลุมแรงงานไทยประมาณ 2.2 ล้านคน หรือ 5.6% ของแรงงานทั้งหมด และระบุว่าคนจบใหม่เริ่มหางานระดับเริ่มต้น (Entry-level) ได้ยากขึ้น ในคลิปเรียก TDRI ว่า \"นักวิจัยไทย\" และพูดว่า \"AI ทำงานบางส่วนแทนได้\" ตามคำของแหล่งข่าว ไม่ได้บอกว่างานจะหายไปทั้งหมด",
        "source": "กรุงเทพธุรกิจ (Bangkokbiznews), งานสัมมนาวิชาการประจำปี TDRI",
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
    "titleTh": "ทำแบบทดสอบอาชีพกี่รอบก็ยังงง",
    "hookTh": "ทำแบบทดสอบอาชีพ กี่รอบก็งง",
    "hookVariantsTh": [
      "ผลบอกอาชีพแล้ว แต่นึกภาพไม่ออก",
      "แบบทดสอบ ไม่บอก ว่างานจริงเป็นไง"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "ทำเทสต์อาชีพ ห้ารอบแล้ว รอบนี้ได้อะไรอะ?",
        "stressTh": "ห้ารอบแล้ว",
        "scene": "phone-feed",
        "ms": 2600
      },
      {
        "who": "student",
        "lineTh": "ได้สายวิเคราะห์ แต่มัน ทำงานอะไรได้บ้างอะ?",
        "stressTh": "ทำงานอะไร",
        "scene": "bedroom-night"
      },
      {
        "who": "text",
        "lineTh": "รู้ชื่ออาชีพแล้ว แต่ไม่รู้ว่า วันๆ เขาทำอะไร",
        "stressTh": "เขาทำอะไร",
        "scene": "bedroom-night",
        "ms": 2900,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "นึกภาพไม่ออก ไม่แปลกหรอก แค่คิดในหัว มันยากจริง",
        "stressTh": "ไม่แปลก",
        "mood": "serious",
        "scene": "bedroom-night",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "แล้วจะรู้ได้ไง ว่าชอบงานไหน",
        "stressTh": "ชอบงานไหน",
        "scene": "bedroom-night",
        "ms": 2200
      },
      {
        "who": "host",
        "lineTh": "ลองทำโจทย์งานจริง ด้วยมือตัวเองสิ Radar มีให้ลองทีละด่าน",
        "stressTh": "งานจริง",
        "mood": "wow",
        "scene": "radar",
        "ms": 3900
      },
      {
        "who": "host",
        "lineTh": "แต่ดึกแล้ว นอนก่อนนะ พรุ่งนี้หัวโล่งๆ ค่อยลองด่านแรก",
        "stressTh": "นอนก่อนนะ",
        "mood": "wink",
        "scene": "radar",
        "ms": 3500
      },
      {
        "who": "student",
        "lineTh": "โอเค ปิดแบบทดสอบ นอนก่อน พรุ่งนี้ค่อยลอง",
        "stressTh": "พรุ่งนี้ค่อยลอง",
        "scene": "radar",
        "ms": 3000
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่ทำแบบทดสอบจนเบื่อ",
    "captionIgTh": "ทำแบบทดสอบอาชีพ กี่รอบก็งง\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ทำแบบทดสอบจนเบื่อ\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    "captionTtTh": "ทำแบบทดสอบอาชีพ กี่รอบก็งง\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
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
    "hookTh": "รอบ 1 มีไว้ แค่เด็กเทพเหรอ?",
    "hookVariantsTh": [
      "รอบพอร์ต ต้องมีแต่ถ้วยเหรอ?",
      "ไม่มีถ้วยสักใบ ยื่นรอบ 1 ได้ไหม"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "รอบ 1 มีแต่ เด็กกวาดรางวัล เรารอสอบเถอะ",
        "stressTh": "เด็กกวาดรางวัล",
        "scene": "classroom",
        "ms": 3100
      },
      {
        "who": "student",
        "lineTh": "เออ ไม่มีถ้วยสักใบ คงยื่นพอร์ตไม่ได้หรอก",
        "stressTh": "ไม่มีถ้วย",
        "scene": "classroom",
        "ms": 2900
      },
      {
        "who": "host",
        "lineTh": "เดี๋ยวก่อน ใครบอกว่า รอบ 1 ดูแค่ถ้วยล่ะ",
        "stressTh": "แค่ถ้วย",
        "mood": "wow",
        "scene": "classroom",
        "ms": 2900
      },
      {
        "who": "text",
        "lineTh": "รางวัล เป็นแค่หนึ่งหมวด ในแฟ้ม TCASfolio",
        "stressTh": "แค่หนึ่งหมวด",
        "scene": "classroom",
        "ms": 3100,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "ยังมีหมวดโครงงาน กับกิจกรรม ที่เธอลงมือทำเองได้",
        "stressTh": "ลงมือทำเอง",
        "mood": "talk",
        "scene": "classroom",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "งานที่ทำเองเล่นๆ ไม่ได้ชนะอะไร ก็ใส่ได้เหรอ",
        "stressTh": "ไม่ได้ชนะอะไร",
        "scene": "classroom",
        "ms": 3100
      },
      {
        "who": "host",
        "lineTh": "ใส่ได้ แต่แต่ละสาขา มีเกณฑ์ของตัวเอง เช็กประกาศก่อนนะ",
        "stressTh": "เกณฑ์ของตัวเอง",
        "mood": "serious",
        "scene": "radar",
        "ms": 3800
      },
      {
        "who": "student",
        "lineTh": "เพิ่งรู้เลย งั้นเราก็เริ่ม สร้างผลงานเอง ได้เหมือนกัน",
        "stressTh": "สร้างผลงานเอง",
        "scene": "radar",
        "ms": 3500
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่ไม่มีถ้วยสักใบ",
    "captionIgTh": "รอบ 1 มีไว้ แค่เด็กเทพเหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ไม่มีถ้วยสักใบ\n\n#CareerRadar #เลือกคณะ #TCAS #รอบพอร์ต",
    "captionTtTh": "รอบ 1 มีไว้ แค่เด็กเทพเหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    "factRefs": [
      {
        "claim": "PPTV (8 ก.ค. 2569): ทปอ. เปิดใช้ระบบ TCASfolio ครั้งแรกใน TCAS70 ตอนสร้างแฟ้ม ผู้สมัครกรอกหลายหมวด ได้แก่ เรียงความ/คำนำ/เหตุผลในการสมัคร หนังสือรับรอง โครงการ/โครงงาน กิจกรรม ใบรับรอง/เกียรติบัตร/รางวัล และคำถามเพิ่มเติมจากมหาวิทยาลัย รางวัลจึงเป็นแค่หมวดหนึ่ง (repo fact f.tcasfolio)",
        "source": "PPTV",
        "url": "https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/279213"
      },
      {
        "claim": "TCAS70 มี 4 รอบ (รอบ 1 Portfolio, รอบ 2 Quota, รอบ 3 Admission, รอบ 4 Direct Admission) มหาวิทยาลัยกำหนดวันรับสมัครรอบ 1 Portfolio เองตั้งแต่ 15 ส.ค. 69 และประกาศผลในระบบ 10 มี.ค. 70 วันปิดรับสมัครต่างกันไปตามมหาวิทยาลัยและหลักสูตร และแต่ละโครงการประกาศเกณฑ์ของตัวเอง (repo fact f.tcas70-rounds)",
        "source": "mytcas (ทปอ.)",
        "url": "https://www.mytcas.com/"
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
        "who": "friend",
        "lineTh": "ยื่นรอบ 1 ปะ? มีผลงาน อะไรใส่พอร์ตแล้วบ้าง",
        "stressTh": "ผลงาน",
        "scene": "classroom"
      },
      {
        "who": "student",
        "lineTh": "เพื่อนไปค่าย กันเต็มฟีด แต่แฟ้มเรา ยังว่างเปล่า",
        "stressTh": "ยังว่างเปล่า",
        "scene": "phone-feed"
      },
      {
        "who": "student",
        "lineTh": "ไม่มีเกียรติบัตรสักใบ จะเอาอะไร ไปยื่น รอบ 1",
        "stressTh": "ไม่มีเกียรติบัตร",
        "scene": "bedroom-night",
        "ms": 3200
      },
      {
        "who": "text",
        "lineTh": "ผลงานที่เธอทำเอง ใส่พอร์ตได้นะ ถ้าตรงเกณฑ์คณะ",
        "stressTh": "ผลงานที่เธอทำเอง",
        "scene": "bedroom-night",
        "ms": 3300,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "แฟ้ม TCASfolio มีช่องเรียงความ บอกเหตุผลที่สมัครด้วย",
        "stressTh": "เหตุผลที่สมัคร",
        "mood": "talk",
        "scene": "bedroom-night",
        "ms": 3700
      },
      {
        "who": "student",
        "lineTh": "แต่ยังไม่รู้เลย ว่าอยากเรียนอะไร",
        "stressTh": "อยากเรียนอะไร",
        "scene": "bedroom-night",
        "ms": 2400
      },
      {
        "who": "host",
        "lineTh": "งั้นลองงานจริง สักชิ้นก่อน เหตุผลจะชัดขึ้นเอง",
        "stressTh": "งานจริง",
        "mood": "wow",
        "scene": "radar",
        "ms": 3100
      },
      {
        "who": "host",
        "lineTh": "แต่ละมหาลัย เปิดปิดรับ รอบ 1 ไม่พร้อมกัน เช็กวันได้ที่ mytcas",
        "stressTh": "ไม่พร้อมกัน",
        "mood": "serious",
        "scene": "radar",
        "ms": 4100
      },
      {
        "who": "student",
        "lineTh": "โอเค ไม่รอค่ายแล้ว เริ่มชิ้นแรก คืนนี้เลย",
        "stressTh": "คืนนี้เลย",
        "scene": "radar",
        "ms": 2900
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ ลองเล่นฟรี",
    "sendToFriendTh": "ส่งให้เพื่อนที่พอร์ตยังว่างอยู่",
    "captionIgTh": "พอร์ตยังว่าง เริ่มยังไงดี?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่พอร์ตยังว่างอยู่\n\n#CareerRadar #เลือกคณะ #TCAS #รอบพอร์ต",
    "captionTtTh": "พอร์ตยังว่าง เริ่มยังไงดี?\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    "factRefs": [
      {
        "claim": "TCAS70 มี 4 รอบ (รอบ 1 Portfolio, รอบ 2 Quota, รอบ 3 Admission, รอบ 4 Direct Admission) มหาวิทยาลัยกำหนดวันรับสมัครรอบ 1 Portfolio เองตั้งแต่ 15 ส.ค. 69 และประกาศผลในระบบ 10 มี.ค. 70 วันปิดรับสมัครต่างกันไปตามมหาวิทยาลัยและหลักสูตร และแต่ละโครงการประกาศเกณฑ์ของตัวเอง (repo fact f.tcas70-rounds)",
        "source": "mytcas (ทปอ.)",
        "url": "https://www.mytcas.com/"
      },
      {
        "claim": "PPTV (8 ก.ค. 2569): ระบบ TCASfolio ใน TCAS70 มีหมวด เรียงความ/คำนำ/เหตุผลในการสมัคร และหมวดโครงการ/โครงงาน กับกิจกรรม ให้ผู้สมัครกรอกเอง (repo fact f.tcasfolio)",
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
    "hookTh": "เคยหาปุ่มยกเลิก ไม่เจอไหม?",
    "hookVariantsTh": [
      "นึกว่า UX/UI แค่วาดแอปสวยๆ",
      "วาดไม่เก่ง ทำ UX/UI ได้ไหม"
    ],
    "beats": [
      {
        "who": "student",
        "lineTh": "ปุ่มยกเลิกอยู่ไหนเนี่ย โดนตัดเงิน อีกเดือนแล้ว!",
        "stressTh": "โดนตัดเงิน",
        "scene": "bedroom-night"
      },
      {
        "who": "friend",
        "lineTh": "ไปสาย UX/UI สิ นั่งวาดหน้าจอสวยๆ ในคาเฟ่ชิลๆ",
        "stressTh": "วาดหน้าจอสวยๆ",
        "scene": "career:ux-design/dream",
        "ms": 3400
      },
      {
        "who": "text",
        "lineTh": "หน้าแอปพื้นฐาน AI ช่วยทำได้แล้ว",
        "stressTh": "AI",
        "scene": "career:ux-design/work",
        "ms": 2400,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "งานจริงคือ แกะนิสัยผู้ใช้ คุยกับทีมพัฒนา ค้านดีไซน์ ที่หลอกให้กด",
        "stressTh": "ค้านดีไซน์",
        "mood": "serious",
        "scene": "career:ux-design/work",
        "ms": 4000
      },
      {
        "who": "student",
        "lineTh": "แบบปุ่มยกเลิก เมื่อกี้เลยปะ",
        "stressTh": "ปุ่มยกเลิก",
        "scene": "career:ux-design/work",
        "ms": 2100
      },
      {
        "who": "host",
        "lineTh": "ใช่ หางานแรก แข่งกันดุ บริษัทอยากเห็น วิธีแก้ปัญหา ไม่ใช่แค่รูปสวย",
        "stressTh": "วิธีแก้ปัญหา",
        "mood": "talk",
        "scene": "career:ux-design/work",
        "ms": 4300
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองแก้หน้าแอป ที่ทำเธอหงุดหงิด แล้วให้เพื่อนลองกดดู",
        "stressTh": "หงุดหงิด",
        "mood": "wow",
        "scene": "career:ux-design/tonight",
        "ms": 3600
      },
      {
        "who": "student",
        "lineTh": "วาดไม่เก่ง แต่จับผิดแอปเก่ง แบบนี้มีลุ้นแฮะ",
        "stressTh": "จับผิดแอปเก่ง",
        "scene": "radar",
        "ms": 2900
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่าน UX/UI ให้",
    "sendToFriendTh": "ส่งให้เพื่อนสายจับผิดแอป",
    "captionIgTh": "เคยหาปุ่มยกเลิก ไม่เจอไหม?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนสายจับผิดแอป\n\n#CareerRadar #เลือกคณะ #TCAS #UXUI",
    "captionTtTh": "เคยหาปุ่มยกเลิก ไม่เจอไหม?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/ux",
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
    "hookTh": "แม่: ตัดคลิปทั้งวัน เป็นอาชีพได้ไง",
    "hookVariantsTh": [
      "ทำคอนเทนต์ ต้องดังก่อนไหม?",
      "เบื้องหลังคลิปไวรัล ไม่ง่ายนะ"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "ถามจริง ใครเขาจ้าง คนตัดคลิปกัน?",
        "stressTh": "ใครเขาจ้าง",
        "scene": "dinner-table",
        "ms": 2600
      },
      {
        "who": "student",
        "lineTh": "ก็นึกว่าต้องดังก่อน ถึงจะมีคนจ้าง",
        "stressTh": "ต้องดังก่อน",
        "scene": "dinner-table",
        "ms": 2400
      },
      {
        "who": "host",
        "lineTh": "ไม่ต้องดังเลย หลายคนทำให้แบรนด์ ดูแลเพจ ตัดคลิป ยันไลฟ์ขายของ",
        "stressTh": "ไม่ต้องดังเลย",
        "mood": "wow",
        "scene": "career:content-creator/dream",
        "ms": 4200
      },
      {
        "who": "text",
        "lineTh": "ครีเอเตอร์ ถึง 86% ใช้ AI ช่วยแล้ว",
        "stressTh": "86%",
        "scene": "career:content-creator/work",
        "ms": 2600,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "AI ช่วยได้ แต่จะเล่าอะไร ให้ต่าง เธอยังต้องคิดเอง",
        "stressTh": "เธอยังต้องคิดเอง",
        "mood": "serious",
        "scene": "career:content-creator/work",
        "ms": 3500
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองถ่ายคลิปสั้น เปิดด้วยช็อตเด็ด แล้วดูว่าคนดู หลุดตรงไหน",
        "stressTh": "หลุดตรงไหน",
        "mood": "wink",
        "scene": "career:content-creator/tonight",
        "ms": 4000
      },
      {
        "who": "student",
        "lineTh": "ไม่ต้องรอดังก่อน งั้นคืนนี้ ลองถ่ายคลิปแรกเลย",
        "stressTh": "คลิปแรก",
        "scene": "radar",
        "ms": 3100
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่านครีเอเตอร์ให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ตัดคลิปทั้งวัน",
    "captionIgTh": "แม่: ตัดคลิปทั้งวัน เป็นอาชีพได้ไง\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ตัดคลิปทั้งวัน\n\n#CareerRadar #เลือกคณะ #TCAS #ContentCreator",
    "captionTtTh": "แม่: ตัดคลิปทั้งวัน เป็นอาชีพได้ไง\nข้อมูลเต็ม พิมพ์ passionseed.org/r/creator",
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
    "titleTh": "คนเบื้องหลังที่หมอต้องรอผลตรวจ",
    "hookTh": "ก่อนหมอรักษา ใครตรวจเลือด?",
    "hookVariantsTh": [
      "สายแพทย์ แต่ไม่อยากเป็นหมอ",
      "ผลเลือดเพี้ยน ใครจับได้?"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "ไม่อยากเป็นหมอ แล้วจะเรียนชีวะ ไปทำไม?",
        "stressTh": "เรียนชีวะ",
        "scene": "dinner-table",
        "ms": 2600
      },
      {
        "who": "student",
        "lineTh": "ก็อยากช่วยคนไข้ไง แม่",
        "stressTh": "ช่วยคนไข้",
        "scene": "dinner-table",
        "ms": 2000
      },
      {
        "who": "friend",
        "lineTh": "เทคนิคการแพทย์ไง ใส่กาวน์ กดเครื่องตรวจชิลๆ",
        "stressTh": "ชิลๆ",
        "scene": "career:medical-technologist/dream",
        "ms": 3200
      },
      {
        "who": "text",
        "lineTh": "เครื่องอ่านค่า นักเทคนิคการแพทย์ เช็กก่อนถึงมือหมอ",
        "stressTh": "ก่อนถึงมือหมอ",
        "scene": "career:medical-technologist/work",
        "ms": 3400,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "บางค่าต้อง ส่องกล้องเอง เจอค่าวิกฤต ต้องรีบแจ้งหมอ",
        "stressTh": "ค่าวิกฤต",
        "mood": "talk",
        "scene": "career:medical-technologist/work",
        "ms": 3600
      },
      {
        "who": "student",
        "lineTh": "ถ้าพลาดขึ้นมา คนไข้ก็แย่เลยดิ",
        "stressTh": "คนไข้ก็แย่",
        "scene": "career:medical-technologist/work",
        "ms": 2200
      },
      {
        "who": "host",
        "lineTh": "ใช่ เลยต้องสอบ ใบประกอบวิชาชีพ ก่อนเข้า แล็บโรงพยาบาล",
        "stressTh": "ใบประกอบวิชาชีพ",
        "mood": "serious",
        "scene": "career:medical-technologist/work",
        "ms": 3900
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองหยดน้ำเล็กๆ บนเลนส์มือถือ ส่องเกลือ แล้วจดผลแบบคนทำแล็บ",
        "stressTh": "ส่องเกลือ",
        "mood": "wink",
        "scene": "career:medical-technologist/tonight",
        "ms": 4200
      },
      {
        "who": "student",
        "lineTh": "โห คนเบื้องหลัง สำคัญสุดๆ เพิ่งเห็นภาพชัดเลย",
        "stressTh": "สำคัญสุดๆ",
        "scene": "radar",
        "ms": 3100
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งด่าน เทคนิคการแพทย์ให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ไม่อยากเป็นหมอ",
    "captionIgTh": "ก่อนหมอรักษา ใครตรวจเลือด?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ไม่อยากเป็นหมอ\n\n#CareerRadar #เลือกคณะ #TCAS #เทคนิคการแพทย์",
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
    "hookTh": "เครื่องกล ทำแค่หุ่นยนต์เหรอ?",
    "hookVariantsTh": [
      "วิศวะเครื่องกล วันๆ ทำอะไร?",
      "ไทยส่งออกแอร์ ถึง 21 ล้านเครื่อง"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "วิศวะเครื่องกล? จบไปซ่อมแอร์เหรอ",
        "stressTh": "ซ่อมแอร์",
        "scene": "classroom",
        "ms": 2400
      },
      {
        "who": "student",
        "lineTh": "ไม่ใช่ดิ ออกแบบหุ่นยนต์ ในห้องแอร์ทั้งวันต่างหาก",
        "stressTh": "ออกแบบหุ่นยนต์",
        "scene": "career:mechanical-engineer/dream"
      },
      {
        "who": "text",
        "lineTh": "ใส่รองเท้าเซฟตี้ ลงโรงงาน สืบหาจุดพัง",
        "stressTh": "สืบหาจุดพัง",
        "scene": "career:mechanical-engineer/work",
        "ms": 2800,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "จำลองแรงกด ตรวจแบบให้เป๊ะ ผ่าดูว่า ทำไมชิ้นส่วนแตก",
        "stressTh": "ทำไมชิ้นส่วนแตก",
        "mood": "talk",
        "scene": "career:mechanical-engineer/work",
        "ms": 3500
      },
      {
        "who": "host",
        "lineTh": "AI ช่วยร่างแบบได้ แต่คนรับผิดชอบ ยังเป็นวิศวกร",
        "stressTh": "ยังเป็นวิศวกร",
        "mood": "serious",
        "scene": "career:mechanical-engineer/work",
        "ms": 3300
      },
      {
        "who": "text",
        "lineTh": "แอร์ก็งานเครื่องกล ปีเดียวไทยส่งออก ถึง 21 ล้านเครื่อง",
        "stressTh": "21 ล้านเครื่อง",
        "scene": "career:mechanical-engineer/work",
        "ms": 3700,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองแกะ ปากกากดสักด้าม วาดดูว่ามันทำงานยังไง",
        "stressTh": "ปากกากด",
        "mood": "wink",
        "scene": "career:mechanical-engineer/tonight",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "ไม่ได้แค่นั่งห้องแอร์ แต่ออกแบบแอร์ ได้ด้วย น่าลองแฮะ",
        "stressTh": "ออกแบบแอร์",
        "scene": "radar",
        "ms": 3600
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่านเครื่องกลให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่เล็งวิศวะเครื่องกล",
    "captionIgTh": "เครื่องกล ทำแค่หุ่นยนต์เหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่เล็งวิศวะเครื่องกล\n\n#CareerRadar #เลือกคณะ #TCAS #วิศวะเครื่องกล",
    "captionTtTh": "เครื่องกล ทำแค่หุ่นยนต์เหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/mech",
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
      "นักบัญชี ไม่ใช่คนนั่งบวกเลข"
    ],
    "beats": [
      {
        "who": "parent",
        "lineTh": "เรียนบัญชีสิ มั่นคง ทุกบริษัท ต้องมีคนทำบัญชี",
        "stressTh": "มั่นคง",
        "scene": "dinner-table",
        "ms": 2900
      },
      {
        "who": "student",
        "lineTh": "แต่เดี๋ยวนี้ AI ลงบัญชีแทนคน ได้หมดแล้ว ไม่ใช่เหรอ?",
        "stressTh": "ลงบัญชีแทนคน",
        "scene": "dinner-table",
        "ms": 3500
      },
      {
        "who": "text",
        "lineTh": "งานลงบิลซ้ำๆ กำลังโดน AI แทนที่จริง",
        "stressTh": "แทนที่จริง",
        "scene": "dinner-table",
        "ms": 2600,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "นายจ้างทั่วโลกคาดว่า งานนักบัญชี กับผู้สอบบัญชี จะลดลงเร็ว",
        "stressTh": "จะลดลงเร็ว",
        "mood": "serious",
        "scene": "career:accountant/work",
        "ms": 3900
      },
      {
        "who": "student",
        "lineTh": "งั้นเรียนบัญชี ยังไปต่อได้ไหมเนี่ย",
        "stressTh": "ยังไปต่อได้ไหม",
        "scene": "career:accountant/work",
        "ms": 2400
      },
      {
        "who": "host",
        "lineTh": "งานที่ต้องคิด อย่างจับพิรุธในงบ วางแผนภาษี ยังต้องใช้คน",
        "stressTh": "ยังต้องใช้คน",
        "mood": "talk",
        "scene": "career:accountant/work",
        "ms": 3700
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองจด รายจ่ายตัวเอง แล้วดูว่า เงินรั่วตรงไหน",
        "stressTh": "เงินรั่ว",
        "mood": "wink",
        "scene": "career:accountant/tonight",
        "ms": 3400
      },
      {
        "who": "student",
        "lineTh": "อ๋อ ไม่ใช่แค่บวกเลข แต่คืองาน นักสืบตัวเลขชัดๆ",
        "stressTh": "นักสืบตัวเลข",
        "scene": "radar",
        "ms": 3200
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่านบัญชีให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่แม่เชียร์ให้เรียนบัญชี",
    "captionIgTh": "เรียนบัญชี AI แย่งงานไหม?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่แม่เชียร์ให้เรียนบัญชี\n\n#CareerRadar #เลือกคณะ #TCAS #บัญชี",
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
    "hookTh": "การตลาด คือปั่นไวรัลเหรอ?",
    "hookVariantsTh": [
      "AI ทำแอดแล้ว การตลาดรอดไหม?",
      "ทำไมคนถึงยอม ควักเงินซื้อ?"
    ],
    "beats": [
      {
        "who": "friend",
        "lineTh": "AI เขียนแคปชันให้แล้ว จะเรียนการตลาด ไปทำไม?",
        "stressTh": "เขียนแคปชัน",
        "scene": "classroom"
      },
      {
        "who": "student",
        "lineTh": "ไวรัลจัด อยากทำการตลาด คิดมุกปังๆ ทั้งวัน",
        "stressTh": "คิดมุกปังๆ",
        "scene": "phone-feed",
        "ms": 2600
      },
      {
        "who": "text",
        "lineTh": "นักการตลาด ถึง 80% ใช้ AI ทำคอนเทนต์แล้ว",
        "stressTh": "80%",
        "scene": "career:marketing-strategist/dream",
        "ms": 3100,
        "big": true
      },
      {
        "who": "host",
        "lineTh": "แต่ทำคอนเทนต์ กับวางกลยุทธ์ เป็นคนละงานกันนะ",
        "stressTh": "คนละงาน",
        "mood": "serious",
        "scene": "career:marketing-strategist/work",
        "ms": 3200
      },
      {
        "who": "host",
        "lineTh": "อ่านข้อมูล อ่านใจคนซื้อ วางงบ วัดผล เลือกว่าจะพูดกับใคร",
        "stressTh": "อ่านใจคนซื้อ",
        "mood": "talk",
        "scene": "career:marketing-strategist/work",
        "ms": 3800
      },
      {
        "who": "student",
        "lineTh": "แล้วจะรู้ได้ไง ว่าใครจะซื้อ",
        "stressTh": "ใครจะซื้อ",
        "scene": "career:marketing-strategist/work",
        "ms": 2100
      },
      {
        "who": "host",
        "lineTh": "คืนนี้ลองเขียน แผนหน้าเดียว ชวนเพื่อนแวะ ร้านหน้าโรงเรียน",
        "stressTh": "แผนหน้าเดียว",
        "mood": "wink",
        "scene": "career:marketing-strategist/tonight",
        "ms": 3900
      },
      {
        "who": "student",
        "lineTh": "นึกว่ามีแค่คิดคำเก๋ๆ ที่แท้คือ เกมอ่านใจคนนี่เอง",
        "stressTh": "เกมอ่านใจคน",
        "scene": "radar",
        "ms": 3100
      }
    ],
    "endCardTh": "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ ด่านการตลาดให้",
    "sendToFriendTh": "ส่งให้เพื่อนที่ชอบแกะแคมเปญ",
    "captionIgTh": "การตลาด คือปั่นไวรัลเหรอ?\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ชอบแกะแคมเปญ\n\n#CareerRadar #เลือกคณะ #TCAS #การตลาด",
    "captionTtTh": "การตลาด คือปั่นไวรัลเหรอ?\nข้อมูลเต็ม พิมพ์ passionseed.org/r/mkt",
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
