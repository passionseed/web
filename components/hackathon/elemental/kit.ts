import type { ElementKey } from "./media";

/**
 * The Elemental problem kit at /hackathon/elemental/kit: one starter pack per
 * element, and the pieces of the "from blame to a question" tool.
 *
 * Source: company-brain `private/hackathon-december-2026-starter-packs.md`
 * (PR passionseed/company-brain#94), put into Thai for anyone, not only
 * students. Packs point to resources, not answers (Big, 2026-11-20). Mentor
 * notes from that page stay private and are not here.
 *
 * Links: every URL was opened on 2026-11-24 and loaded. Two from the brain
 * page were left out because they block automated checks (a research paper
 * and a Khaosod article), and the DIW hotline was left out because no
 * official page confirmed it. Hotlines here were checked on official pages:
 * 1650 and LINE @Traffyfondue in PCD's complaint service sheet, 1784 on
 * disaster.go.th, 199 on TruePlookpanya.
 *
 * Rule (Big, 2026-11-19): no company or venue is named.
 *
 * Thai copy is AI-drafted from the brain's English and needs a Thai read
 * before it ships. The chips are starting points, not facts: people can type
 * their own.
 */

export interface KitLink {
  nameTh: string;
  kindTh: string;
  findTh: string;
  url?: string;
}

export interface KitWord {
  th: string;
  en: string;
  meaningTh: string;
}

export interface KitAction {
  th: string;
  url?: string;
}

export interface ElementKit {
  /** Who has the problem, in one line. */
  whoTh: string;
  /** Step 1 chips: one person who has it. */
  people: readonly string[];
  /** Step 2 chips: the moment it goes wrong for them. */
  moments: readonly string[];
  /** Step 3 chips: what they need to be able to do. Each reads after "ช่วยให้เขา". */
  needs: readonly string[];
  look: readonly KitLink[];
  questions: readonly string[];
  toolsTh?: string;
  safeTh: string;
  words: readonly KitWord[];
  /** Things anyone can do today, before any hackathon. */
  today: readonly KitAction[];
}

export const PCD_REPORT: KitAction = {
  th: "เจอมลพิษใกล้บ้าน แจ้งกรมควบคุมมลพิษได้ที่สายด่วน 1650 หรือ LINE @Traffyfondue",
  url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
};

/** Questions that help with any element (the brain's "Questions for every team"). */
export const EVERY_QUESTION_TH = [
  "คนหนึ่งคนของคุณคือใคร วันนี้พอเรื่องนี้เกิดกับเขา เขาทำอะไร",
  "ตอนนี้มีอะไรช่วยเรื่องนี้อยู่แล้วบ้าง แล้วทำไมมันยังไม่พอสำหรับเขา",
  "เขาต้องเห็นอะไร ถึงจะเชื่อคำตอบของคุณ",
  "ใครมีหน้าที่ดูแลเรื่องนี้ และคนธรรมดาติดต่อเขาได้ทางไหน",
] as const;

/** The four moves from blame to a question, shown on the kit page. */
export const FRAME_MOVES = [
  { th: "พักความโกรธไว้ก่อน", detailTh: "โกรธได้ มันมีเหตุผล แต่ประโยคที่ชี้ว่าใครผิด ไม่ได้บอกว่าต้องซ่อมตรงไหน" },
  { th: "หาคนหนึ่งคน", detailTh: "ไม่ใช่ “ชาวบ้าน” หรือ “คนไทย” แต่เป็นคนหนึ่งคนที่เจอเรื่องนี้จริง" },
  { th: "หาช่วงที่มันพัง", detailTh: "นาทีไหนที่เขาต้องตัดสินใจ แต่ไม่มีข้อมูล หรือไม่มีใครช่วย" },
  { th: "ตั้งเป็นคำถาม", detailTh: "“เราจะช่วยให้เขา… ได้อย่างไร” คำถามที่ดีไม่มีคำตอบซ่อนอยู่ข้างใน" },
] as const;

export const ELEMENT_KITS: Record<ElementKey, ElementKit> = {
  water: {
    whoTh: "ครอบครัวริมแม่น้ำกก แม่น้ำสาย และแม่น้ำโขงในเชียงราย และคนรอบตัวที่ต้องตอบคำถามของพวกเขา",
    people: [
      "ครอบครัวริมแม่น้ำที่ใช้น้ำประปาหมู่บ้าน",
      "คนหาปลาริมแม่น้ำกก",
      "เกษตรกรที่สูบน้ำจากแม่น้ำไปรดผัก",
      "ลูกหลานที่ทำงานไกลบ้าน แล้วเป็นห่วงพ่อแม่",
    ],
    moments: [
      "ตอนจะเอาน้ำมาดื่มหรือทำกับข้าว",
      "ตอนอ่านข่าวผลตรวจแล้วไม่เข้าใจตัวเลข",
      "ช่วงหลายสัปดาห์ที่รอผลตรวจรอบใหม่",
      "ตอนจับปลาหรือเก็บหอยมากิน",
    ],
    needs: [
      "รู้ว่าน้ำที่ใช้อยู่มาจากไหน",
      "เข้าใจผลตรวจล่าสุดเป็นภาษาที่อ่านรู้เรื่อง",
      "รู้ว่าต้องทำอะไรต่อ และถามใครได้",
      "บอกต่อคนในหมู่บ้านได้ถูกต้อง",
    ],
    look: [
      {
        nameTh: "กรมควบคุมมลพิษ: งานแก้ปัญหาแม่น้ำกก",
        kindTh: "ผลทางการ",
        findTh: "ผลตรวจสารหนูแต่ละจุด แต่ละรอบ",
        url: "https://www.pcd.go.th/?p=35662",
      },
      {
        nameTh: "กรมควบคุมมลพิษ: เร่งแก้สารหนูในแม่น้ำกก",
        kindTh: "ผลทางการ",
        findTh: "สิ่งที่หน่วยงานรัฐกำลังทำ",
        url: "https://www.pcd.go.th/?p=36593",
      },
      {
        nameTh: "Nation: พบสารหนูใน 11 จุดของแม่น้ำกก",
        kindTh: "ข่าว",
        findTh: "ข่าวรายงานผลตรวจอย่างไร และเจ้าหน้าที่พูดว่าอะไร",
        url: "https://www.nationthailand.com/news/general/40050712",
      },
      {
        nameTh: "Nation: ผลตรวจล่าสุด แม่น้ำกก สาย และโขง",
        kindTh: "ข่าว",
        findTh: "ผลรอบหลังๆ ว่ายังเกินมาตรฐานไหม",
        url: "https://www.nationthailand.com/health-wellness/40064048",
      },
      {
        nameTh: "Thai PBS: ผลตรวจแม่น้ำสาละวิน",
        kindTh: "ข่าว",
        findTh: "ค่ามาตรฐานสารหนูในแม่น้ำ ตามที่กรมควบคุมมลพิษใช้",
        url: "https://www.thaipbs.or.th/news/content/508600",
      },
      {
        nameTh: "Nation: สารหนูในน้ำบาดาลภาคเหนือ",
        kindTh: "ข่าว",
        findTh: "สารหนูในบ่อน้ำ ที่เชียงใหม่และเชียงราย",
        url: "https://www.nationthailand.com/news/general/40073595",
      },
      {
        nameTh: "พอร์ทัลข้อมูลคณะกรรมาธิการแม่น้ำโขง",
        kindTh: "ข้อมูลเปิด (ต้องสมัครฟรี)",
        findTh: "คุณภาพน้ำทั่วลุ่มแม่น้ำโขง",
        url: "https://opendevelopmentmekong.net/announcements/mekong-river-commission-launches-interactive-and-easy-to-use-mekong-data-portal/",
      },
      {
        nameTh: "data.go.th: สถานีวัดคุณภาพน้ำอัตโนมัติ",
        kindTh: "ข้อมูลเปิด",
        findTh: "ตัวอย่างข้อมูลที่วัดทุก 30 นาที จากแม่น้ำบางปะกง ดูว่าสถานีแบบนี้วัดอะไรได้ และอะไรไม่ได้",
        url: "https://data.go.th/en/dataset/dataset_11_032",
      },
      {
        nameTh: "Asia News Network: ค่าน้ำที่บ้านในแม่สายต้องจ่ายเพิ่ม",
        kindTh: "ข่าว",
        findTh: "ปัญหานี้ทำให้ชุมชนหนึ่งเสียอะไรไปบ้าง",
        url: "https://asianews.network/?p=315519",
      },
    ],
    questions: [
      "แม่น้ำถูกตรวจบ่อยแค่ไหน ระหว่างรอผลรอบใหม่ คนของคุณต้องรู้อะไร",
      "น้ำที่คนของคุณใช้จริงๆ มาจากไหน แม่น้ำ บ่อ ประปา หรือน้ำขวด",
      "“เกินมาตรฐาน” แปลว่าอะไร สำหรับการดื่ม การทำนา และการหาปลา ใครเป็นคนบอก",
      "คนของคุณเชื่อข่าวเรื่องน้ำจากใคร",
    ],
    safeTh:
      "อย่าบอกใครว่าน้ำปลอดภัย ให้ชี้ไปที่ผลตรวจและคำแนะนำของหน่วยงานรัฐ และอย่าลงไปเก็บตัวอย่างน้ำจากแม่น้ำเอง",
    words: [
      { th: "สารหนู", en: "Arsenic", meaningTh: "สารพิษที่มาจากการทำเหมือง มองด้วยตาเปล่าในน้ำไม่เห็น" },
      { th: "ค่ามาตรฐาน, เกินมาตรฐาน", en: "Standard", meaningTh: "ค่าสูงสุดที่กฎทางการยอมให้มีได้ และการมีมากกว่านั้น" },
      { th: "มก./ล.", en: "mg/L", meaningTh: "มิลลิกรัมต่อลิตร คือในน้ำ 1 ลิตร มีสารนั้นอยู่เท่าไร" },
      { th: "น้ำผิวดิน, น้ำบาดาล", en: "Surface water, groundwater", meaningTh: "น้ำในแม่น้ำและบ่อ กับน้ำที่สูบขึ้นมาจากใต้ดิน" },
      { th: "ตะกอนดิน", en: "Sediment", meaningTh: "โคลนที่ก้นแม่น้ำ ยังเก็บสารพิษไว้ได้แม้น้ำจะใสแล้ว" },
    ],
    today: [
      { th: "ส่งหน้านี้ให้คนที่มีบ้านหรือครอบครัวอยู่ริมแม่น้ำกก สาย หรือโขง" },
      { th: "ก่อนแชร์ตัวเลขเรื่องน้ำ อ่านผลล่าสุดจากกรมควบคุมมลพิษก่อน", url: "https://www.pcd.go.th/?p=35662" },
      PCD_REPORT,
    ],
  },

  earth: {
    whoTh: "คนที่อยู่ใกล้ที่ที่ขยะอันตรายไปโผล่ และคนงานในโรงงานเล็กหรือร้านรับซื้อของเก่าที่ต้องจับมันทุกวัน",
    people: [
      "คนงานร้านรับซื้อของเก่า",
      "ชาวบ้านที่อยู่ข้างโกดังที่ไม่มีใครรู้ว่าเก็บอะไร",
      "เกษตรกรที่มีคนมาขอเช่าที่ดินทิ้งของ",
      "คนที่มีมือถือเก่ากับแบตเก่าอยู่ในลิ้นชัก",
    ],
    moments: [
      "ตอนมีรถบรรทุกแปลกหน้ามาขนของเข้าออกตอนกลางคืน",
      "ตอนจะขายหรือทิ้งมือถือเก่า",
      "ตอนเห็นน้ำไหลออกจากกองขยะหลังฝนตก",
      "ตอนรับของเก่ามาแยก โดยไม่รู้ว่าข้างในมีอะไร",
    ],
    needs: [
      "ดูออกว่าอะไรคือขยะอันตราย",
      "รู้ว่าขยะที่เห็นมาจากไหน และจะไปไหนต่อ",
      "แจ้งเจ้าหน้าที่ได้ โดยตัวเองไม่เดือดร้อน",
      "ทิ้งของเก่าได้ถูกที่",
    ],
    look: [
      {
        nameTh: "กรุงเทพธุรกิจ: แผนคุมขยะอุตสาหกรรม",
        kindTh: "ข่าว",
        findTh: "ขยะอันตรายจากโรงงานควรถูกติดตามอย่างไร",
        url: "https://www.bangkokbiznews.com/business/980275",
      },
      {
        nameTh: "Greenpeace: สภารับร่างกฎหมาย PRTR",
        kindTh: "ข่าว (อังกฤษ)",
        findTh: "กฎหมายที่จะให้โรงงานเปิดเผยว่าปล่อยอะไรออกมา และตอนนี้ไปถึงไหน",
        url: "https://www.greenpeace.org/southeastasia/press/67822/thai-parliament-unanimously-approves-prtr-draft-law-advancing-environmental-transparency-and-public-health-rights/",
      },
      {
        nameTh: "Greenpeace Thailand: แคมเปญ PRTR",
        kindTh: "แคมเปญ",
        findTh: "ทำไมคนถึงเรียกร้องให้มีกฎหมายนี้",
        url: "https://www.greenpeace.org/thailand/climate-airpollution-thaiprtr/",
      },
      {
        nameTh: "data.go.th: รายชื่อโรงงานแปรรูปสินค้าเกษตร",
        kindTh: "ข้อมูลเปิด",
        findTh: "ตัวอย่างว่าข้อมูลโรงงานแบบไหนที่เปิดให้ทุกคนดูได้",
        url: "https://data.go.th/en/dataset/dataset_11_188",
      },
      {
        nameTh: "Google Earth Pro (บนคอมพิวเตอร์)",
        kindTh: "เครื่องมือ",
        findTh: "ภาพถ่ายดาวเทียมย้อนหลังของที่ไหนก็ได้ เลือกดูตามปี",
      },
      {
        nameTh: "Copernicus Browser",
        kindTh: "เครื่องมือ (ต้องสมัครฟรี)",
        findTh: "ภาพดาวเทียม Sentinel-2 ภาพใหม่ทุกไม่กี่วัน",
        url: "https://browser.dataspace.copernicus.eu/",
      },
      {
        nameTh: "EurekAlert: AI กับดาวเทียมจับที่ทิ้งขยะเถื่อน",
        kindTh: "งานวิจัย (อังกฤษ)",
        findTh: "นักวิจัยหาที่ทิ้งขยะจากอวกาศได้อย่างไร",
        url: "https://www.eurekalert.org/news-releases/1091286",
      },
    ],
    questions: [
      "ตอนขยะอันตรายเปลี่ยนมือ ควรมีเอกสารอะไร และใครดูเอกสารนั้นได้บ้าง",
      "ถ้าขยะหนึ่งคันรถหายไประหว่างทาง ใครจะรู้เป็นคนแรก",
      "มองจากข้างบน เราเห็นอะไรได้ และอะไรที่ไม่เห็น",
    ],
    toolsTh: "ภาพถ่ายดาวเทียม เทียบก่อนและหลัง",
    safeTh:
      "ห้ามเข้าไปในที่ทิ้งขยะ ภาพของที่แห่งเดียวก็บอกได้ว่าเป็นของใคร แม้ไม่ได้ใส่ชื่อ ถ้าเจออะไรเกี่ยวกับที่จริง ให้แจ้งเจ้าหน้าที่แบบส่วนตัว อย่าโพสต์",
    words: [
      { th: "กากของเสียอันตราย", en: "Hazardous waste", meaningTh: "ขยะจากโรงงานที่ทำร้ายคนได้ ถ้าไม่ถูกจัดการอย่างถูกวิธี" },
      { th: "ใบกำกับการขนส่งของเสียอันตราย", en: "Manifest", meaningTh: "เอกสารที่ต้องตามขยะอันตรายไปทุกที่ จนถึงที่กำจัด" },
      { th: "ใบ ร.ง.4", en: "Factory licence", meaningTh: "ใบอนุญาตที่โรงงานต้องมีถึงจะเปิดได้" },
      { th: "แคดเมียม", en: "Cadmium", meaningTh: "โลหะที่เป็นพิษ" },
      { th: "ขยะอิเล็กทรอนิกส์", en: "E-waste", meaningTh: "มือถือ คอมพิวเตอร์ และแบตเตอรี่เก่า" },
    ],
    today: [
      { th: "อย่าทิ้งมือถือและแบตเตอรี่เก่าปนกับขยะทั่วไป" },
      { th: "ส่งหน้านี้ให้คนที่อยู่ใกล้โรงงานหรือโกดัง" },
      PCD_REPORT,
    ],
  },

  air: {
    whoTh: "เพื่อนบ้านของโรงงานหรือที่ที่มีการเผา และใครก็ตามที่เคยลองร้องเรียนเรื่องกลิ่นหรือควัน",
    people: [
      "ครอบครัวที่อยู่ข้างโรงงานแยกขยะ",
      "เด็กเล็กหรือผู้สูงอายุที่เป็นโรคปอด",
      "นักเรียนที่โรงเรียนต้องปิดเพราะฝุ่น",
      "ชาวบ้านที่ได้กลิ่นทุกคืน แต่พิสูจน์ไม่ได้",
    ],
    moments: [
      "ตอนกลิ่นมากลางดึก แล้วไม่มีเจ้าหน้าที่",
      "ตอนยื่นเรื่องร้องเรียน แล้วถูกถามหาหลักฐาน",
      "เช้าที่ต้องตัดสินใจว่าจะให้ลูกออกไปข้างนอกไหม",
      "ช่วงหน้าเผา กุมภาพันธ์ถึงเมษายน",
    ],
    needs: [
      "จดสิ่งที่เกิดเป็นหลักฐานที่เจ้าหน้าที่ใช้ได้",
      "รู้ว่าค่าฝุ่นแถวบ้านตอนนี้เท่าไร",
      "รู้ว่าต้องแจ้งใคร และแจ้งอย่างไร",
      "ป้องกันตัวเองในวันที่อากาศแย่",
    ],
    look: [
      {
        nameTh: "Air4Thai (เว็บและแอป)",
        kindTh: "ข้อมูลทางการ",
        findTh: "ค่า PM2.5 และดัชนีคุณภาพอากาศ แยกตามสถานี",
        url: "http://air4thai.pcd.go.th/",
      },
      {
        nameTh: "AQICN: คุณภาพอากาศในไทย",
        kindTh: "เครือข่ายเซนเซอร์",
        findTh: "ค่าจากเซนเซอร์ราคาถูกทั่วประเทศ รวมถึง DustBoy ของมหาวิทยาลัยเชียงใหม่",
        url: "https://aqicn.org/city/thailand/",
      },
      {
        nameTh: "Sensor for All, วิศวฯ จุฬาฯ",
        kindTh: "เครือข่ายเซนเซอร์",
        findTh: "ค่าฝุ่นใกล้บ้าน พร้อมข้อมูลย้อนหลัง",
        url: "https://www.eng.chula.ac.th/?p=37762",
      },
      {
        nameTh: "GISTDA: จุดความร้อน",
        kindTh: "ข้อมูลดาวเทียม",
        findTh: "ไฟที่มองเห็นจากอวกาศ ทุกวัน",
        url: "https://disaster.gistda.or.th/fire",
      },
      {
        nameTh: "data.go.th: จุดความร้อนรายจังหวัด",
        kindTh: "ข้อมูลเปิด",
        findTh: "ไฟล์จุดความร้อนที่ดาวน์โหลดไปวิเคราะห์ต่อได้",
        url: "https://gdcc.data.go.th/en/dataset/dataset_66_04_006",
      },
      {
        nameTh: "กรมควบคุมมลพิษ: ช่องทางร้องเรียน (PDF)",
        kindTh: "คู่มือทางการ",
        findTh: "แจ้งเรื่องมลพิษได้ที่ไหน และเรื่องจะถูกจัดการอย่างไร",
        url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
      },
    ],
    questions: [
      "เซนเซอร์ PM2.5 วัดอะไรได้ และอะไรที่มันวัดไม่ได้",
      "ถ้าอากาศแย่ จะรู้ได้อย่างไรว่ามาจากข้างบ้าน หรือมาจากที่ไกล",
      "เจ้าหน้าที่ต้องเห็นอะไร ถึงจะลงมือกับเรื่องร้องเรียน",
    ],
    toolsTh:
      "เซนเซอร์ที่มีอยู่แล้วใกล้คนของคุณ (ของเขาเอง หน้าจอเครื่องฟอกอากาศ DustBoy หรือ Sensor for All) กับทิศทางลมจากแอปพยากรณ์อากาศ",
    safeTh: "ห้ามเข้าไปในพื้นที่โรงงาน ถ้าจะใช้เซนเซอร์ ให้อยู่ในบ้านของคนที่อาศัยตรงนั้นอยู่แล้ว",
    words: [
      { th: "ฝุ่น PM2.5", en: "PM2.5", meaningTh: "ฝุ่นที่เล็กมากจนเข้าไปลึกถึงปอด" },
      { th: "ดัชนีคุณภาพอากาศ", en: "AQI", meaningTh: "ตัวเลขตัวเดียวที่บอกว่าอากาศสะอาดแค่ไหน" },
      { th: "จุดความร้อน", en: "Hotspot", meaningTh: "จุดที่ดาวเทียมเห็นว่าร้อนผิดปกติ ส่วนใหญ่คือไฟ" },
    ],
    today: [
      { th: "เช็กค่าฝุ่นใกล้บ้านใน Air4Thai ก่อนออกจากบ้าน", url: "http://air4thai.pcd.go.th/" },
      { th: "ได้กลิ่นหรือเห็นควัน จดวัน เวลา ทิศลม และอาการไว้ทุกครั้ง แล้วแนบไปตอนแจ้ง" },
      PCD_REPORT,
    ],
  },

  fire: {
    whoTh: "ครอบครัวที่อยู่ใกล้เขตโรงงาน และญาติที่อยู่ไกลออกไป",
    people: [
      "ครอบครัวที่บ้านอยู่ใกล้โรงงานเคมี",
      "ญาติที่อยู่ต่างจังหวัด แล้วติดต่อที่บ้านไม่ได้",
      "อาสากู้ภัยและนักดับเพลิง",
      "ผู้สูงอายุที่อยู่บ้านคนเดียวใกล้เขตอุตสาหกรรม",
    ],
    moments: [
      "ชั่วโมงแรกหลังเกิดไฟไหม้สารเคมี",
      "ตอนตีสามที่ทุกคนหลับ",
      "ตอนต้องตัดสินใจว่าจะออกจากบ้านไหม และไปทางไหน",
      "หลายวันหลังไฟดับ ที่ยังไม่รู้ว่าอากาศปลอดภัยหรือยัง",
    ],
    needs: [
      "รู้เร็วว่าเกิดอะไรขึ้น และต้องทำอะไร",
      "รู้ว่าต้องไปที่ไหน",
      "บอกญาติได้ว่าปลอดภัยแล้ว",
      "รู้ว่าต้องฟังคำสั่งจากใคร",
    ],
    look: [
      {
        nameTh: "TruePlookpanya: เบอร์แจ้งเหตุไฟไหม้",
        kindTh: "สายด่วน",
        findTh: "199 สำหรับแจ้งไฟไหม้",
        url: "https://www.trueplookpanya.com/knowledge/content/93843-heabod-hea-",
      },
      {
        nameTh: "กรมป้องกันและบรรเทาสาธารณภัย",
        kindTh: "สายด่วน",
        findTh: "1784 สำหรับสาธารณภัย",
        url: "https://www.disaster.go.th/",
      },
      {
        nameTh: "กรมควบคุมมลพิษ: สายด่วน 1650",
        kindTh: "สายด่วน",
        findTh: "แจ้งเรื่องมลพิษ รวมถึงสารเคมีรั่วไหล",
        url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
      },
      {
        nameTh: "GISTDA: จุดความร้อน",
        kindTh: "ข้อมูลดาวเทียม",
        findTh: "ไฟที่มองเห็นจากอวกาศ",
        url: "https://disaster.gistda.or.th/fire",
      },
      {
        nameTh: "Nation: ดาวเทียมพบจุดความร้อน 1,355 จุด",
        kindTh: "ข่าว",
        findTh: "ข่าวใช้ข้อมูลดาวเทียมเรื่องไฟอย่างไร",
        url: "https://www.nationthailand.com/news/general/40046356",
      },
    ],
    questions: [
      "ในชั่วโมงแรกของไฟไหม้สารเคมี ครอบครัวหนึ่งต้องรู้อะไร และวันนี้ใครเป็นคนบอกเขา",
      "ใครมีหน้าที่เตือนคน และสั่งให้ออกจากพื้นที่",
      "ญาติที่อยู่ไกลจะรู้ได้อย่างไรว่าที่บ้านปลอดภัย",
    ],
    safeTh:
      "ใช้คำแนะนำทางการเท่านั้น และให้ผู้รู้ตรวจก่อนเผยแพร่ อย่าเขียนคำแนะนำเรื่องสุขภาพหรือการอพยพขึ้นมาเอง และห้ามเข้าไปในเขตโรงงาน",
    words: [
      { th: "สารเคมีรั่วไหล", en: "Chemical leak", meaningTh: "สารเคมีอันตรายหลุดออกมาในอากาศ น้ำ หรือดิน" },
      { th: "อพยพ", en: "Evacuate", meaningTh: "ออกจากบ้านเพราะมีอันตราย" },
      { th: "จุดความร้อน", en: "Hotspot", meaningTh: "จุดที่ดาวเทียมเห็นว่าร้อนผิดปกติ ส่วนใหญ่คือไฟ" },
    ],
    today: [
      { th: "บันทึกเบอร์ 199 (ไฟไหม้) และ 1784 (สาธารณภัย) ไว้ในมือถือของพ่อแม่" },
      { th: "ถามหน่วยงานท้องถิ่นว่าชุมชนของคุณมีแผนรับมือเหตุสารเคมีไหม" },
      PCD_REPORT,
    ],
  },

  aether: {
    whoTh: "ทุกคนที่มีมือถือ เริ่มจากตัวเรา และคนในบ้านที่เชื่อและแชร์สิ่งที่ฟีดป้อนให้",
    people: [
      "แม่ที่ส่งต่อข่าวในกลุ่มไลน์ครอบครัว",
      "ตัวเราเองตอนเลื่อนฟีดก่อนนอน",
      "ตายายที่เชื่อหน้าผู้ประกาศข่าวที่คุ้นเคย",
      "เพื่อนที่กำลังจะโอนเงินตามโฆษณาลงทุน",
    ],
    moments: [
      "สามวินาทีก่อนกดแชร์",
      "ตอนเห็นคลิปคนดังชวนลงทุน",
      "ตอนหยิบมือถือขึ้นมาโดยไม่รู้ตัว",
      "ตอนข่าวปลอมเก่าวนกลับมาในกลุ่ม",
    ],
    needs: [
      "หยุดคิดก่อนแชร์",
      "เช็กได้ว่าใครโพสต์ และมาจากไหน",
      "เห็นว่าแอปดึงเวลาไปเท่าไร",
      "แยกคลิป AI ออกจากของจริง",
    ],
    look: [
      {
        nameTh: "Cofact",
        kindTh: "ตรวจข่าว",
        findTh: "แชตบอตใน LINE ที่รับคำถาม และผลตรวจข่าวที่ผ่านมา",
        url: "https://blog.cofact.org/?p=9997",
      },
      {
        nameTh: "Thai PBS Verify",
        kindTh: "ตรวจข่าว",
        findTh: "ผลตรวจโพสต์ไวรัลและดีปเฟก",
        url: "https://www.thaipbs.or.th/verify",
      },
      {
        nameTh: "ชัวร์ก่อนแชร์ (อสมท) และ AFP Fact Check ภาษาไทย",
        kindTh: "ตรวจข่าว",
        findTh: "ผลตรวจข่าวไทยเพิ่มเติม",
      },
      {
        nameTh: "Screen Time (iPhone) หรือ Digital Wellbeing (Android)",
        kindTh: "ข้อมูลของคุณเอง",
        findTh: "แต่ละแอปใช้เวลาไปกี่นาที หยิบมือถือกี่ครั้ง และมีแจ้งเตือนกี่ครั้ง",
      },
      {
        nameTh: "Cal Newport, Digital Minimalism (2019)",
        kindTh: "หนังสือ",
        findTh: "ทำไมแอปถูกออกแบบให้ดึงความสนใจ และวิธีลองลดใช้ 30 วัน",
      },
    ],
    questions: [
      "ข้อความล่าสุดที่คนในบ้านส่งต่อมาจากไหน เขาจะเช็กได้อย่างไร",
      "เมื่อวานคุณหยิบมือถือกี่ครั้ง และอะไรทำให้หยิบ",
      "หาสามอย่างที่แอปหนึ่งทำ เพื่อให้คุณอยู่ต่อ ใครได้เงินจากแต่ละอย่าง",
      "อะไรจะทำให้คนหยุดคิดก่อนแชร์",
    ],
    safeTh:
      "ติดป้ายทุกอย่างที่แต่งขึ้น ห้ามทำดีปเฟกของคนจริง แม้จะทำเพื่อเตือน ใช้ข้อมูลจากมือถือของตัวเอง หรือของเพื่อนที่อนุญาตแล้ว และไม่ใส่ชื่อในสิ่งที่เผยแพร่",
    words: [
      { th: "ข่าวปลอม", en: "Fake news", meaningTh: "เรื่องไม่จริงที่ทำให้ดูเหมือนข่าว" },
      { th: "ดีปเฟก", en: "Deepfake", meaningTh: "วิดีโอหรือเสียงปลอมของคนจริง ที่ทำด้วย AI" },
      { th: "ตรวจสอบข้อเท็จจริง", en: "Fact-check", meaningTh: "เช็กว่าสิ่งที่อ้างจริงไหม และใครเป็นคนพูด" },
      { th: "อัลกอริทึม", en: "Algorithm", meaningTh: "กฎที่แอปใช้เลือกว่าคุณจะเห็นอะไรต่อ" },
      { th: "ร่องรอยทางดิจิทัล", en: "Digital footprint", meaningTh: "ร่องรอยและต้นทุนที่มองไม่เห็นจากสิ่งที่เราทำออนไลน์" },
    ],
    today: [
      { th: "ก่อนแชร์ครั้งหน้า ส่งข้อความนั้นไปถาม Cofact ก่อน", url: "https://blog.cofact.org/?p=9997" },
      { th: "เปิด Screen Time หรือ Digital Wellbeing ดูว่าเมื่อวานหยิบมือถือกี่ครั้ง" },
      { th: "ส่งหน้านี้เข้ากลุ่มไลน์ครอบครัว" },
    ],
  },
};

/** Words that point at a culprit instead of a moment to fix. Gentle hints, not a filter. */
const BLAME_WORDS = ["ผิด", "โทษ", "เลว", "ห่วย", "โกง", "ต้องโดน", "ไม่ทำอะไร", "ทำไมไม่", "มักง่าย", "เห็นแก่ตัว"];

/** Words that put an answer inside the question. */
const SOLUTION_WORDS = ["แอป", "เว็บ", "บอท", "bot", "app", "ระบบ", "แพลตฟอร์ม", "ด้วย AI", "ใช้ AI"];

export interface FrameParts {
  person: string;
  moment: string;
  need: string;
}

/** "เราจะช่วยให้{คน} {ทำได้} {ตอน} ได้อย่างไร", with empty parts left out. */
export function buildFrame({ person, moment, need }: FrameParts): string {
  const p = person.trim() || "คนหนึ่งคน";
  const parts = [`เราจะช่วยให้${p}`, need.trim(), moment.trim()].filter(Boolean);
  return `${parts.join(" ")} ได้อย่างไร`;
}

export interface FrameCheck {
  key: "person" | "question" | "blame" | "open";
  ok: boolean;
  th: string;
  hintTh: string;
}

/** Four checks on a finished question. They teach; they never block. */
export function checkFrame(text: string, person: string): FrameCheck[] {
  const t = text.trim();
  const lower = t.toLowerCase();
  const blame = BLAME_WORDS.find((w) => t.includes(w));
  const answer = SOLUTION_WORDS.find((w) => lower.includes(w.toLowerCase()));
  return [
    {
      key: "person",
      ok: person.trim().length > 0 && t.includes(person.trim()),
      th: "มีคนหนึ่งคนที่ชัดเจน",
      hintTh: "ใส่คนที่เจอเรื่องนี้จริงลงในคำถาม",
    },
    {
      key: "question",
      ok: /อย่างไร|ยังไง|ได้ไหม\s*$/.test(t),
      th: "เป็นคำถามที่ชวนหาทาง",
      hintTh: "ลองจบด้วย “ได้อย่างไร”",
    },
    {
      key: "blame",
      ok: !blame,
      th: "ไม่ได้ชี้ว่าใครผิด",
      hintTh: blame ? `คำว่า “${blame}” ชี้หาคนผิด ลองเปลี่ยนเป็นสิ่งที่คนของคุณต้องการ` : "",
    },
    {
      key: "open",
      ok: !answer,
      th: "ยังไม่ได้ใส่คำตอบไว้ในคำถาม",
      hintTh: answer ? `“${answer}” คือวิธีแก้ เก็บไว้ทีหลัง ให้คำถามเปิดไว้ก่อน` : "",
    },
  ];
}
