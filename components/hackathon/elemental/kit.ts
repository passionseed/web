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
  /** Step 3 chips: what they need to be able to do. Each reads after "ช่วยให้{คน}" and before "ได้อย่างไร". */
  needs: readonly string[];
  look: readonly KitLink[];
  questions: readonly string[];
  toolsTh?: string;
  safeTh: string;
  words: readonly KitWord[];
  /** Things anyone can do today, before any hackathon. */
  today: readonly KitAction[];
}

/**
 * The kit's idea in its name: blame asks who is at fault, the kit asks where
 * it goes wrong. Used for page titles, the tool heading and the story card.
 */
export const KIT_TITLE_PARTS = ["ใครผิด", "ผิดตรงไหน"] as const;
export const KIT_TITLE_TH = KIT_TITLE_PARTS.join(" → ");

export const PCD_REPORT: KitAction = {
  th: "เจอมลพิษแถวบ้าน โทรแจ้งกรมควบคุมมลพิษที่ 1650 หรือแจ้งทาง LINE @Traffyfondue ได้เลย",
  url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
};

/** Questions that help with any element (the brain's "Questions for every team"). */
export const EVERY_QUESTION_TH = [
  "นึกถึงใครอยู่ ตอนนี้เวลาเจอเรื่องนี้ เขาทำยังไง",
  "ตอนนี้มีอะไรช่วยเขาได้บ้าง แล้วเขายังติดตรงไหน",
  "เขาต้องเห็นอะไรถึงจะเชื่อว่าวิธีนี้ช่วยได้",
  "ใครดูแลเรื่องนี้ ถ้าจะติดต่อ ต้องติดต่อทางไหน",
] as const;

/** The four moves from blame to a question, shown on the kit page. */
export const FRAME_MOVES = [
  { th: "พักความโกรธไว้ก่อน", detailTh: "ถ้าอ่านแล้วโกรธ จะระบายก่อนก็ได้ แล้วค่อยดูว่าคนในข่าวเจออะไร" },
  { th: "นึกถึงคนที่เจอเรื่องนี้", detailTh: "เลือกสักคนที่นึกภาพออกว่าเขาเจออะไร" },
  { th: "ดูว่าเขาติดตรงไหน", detailTh: "ตอนไหนที่เขาต้องตัดสินใจ แต่ข้อมูลไม่พอหรือไม่มีใครช่วย" },
  { th: "ตั้งเป็นคำถาม", detailTh: "เขาอยากทำอะไรให้ได้ ลองถามว่า “เราจะช่วยให้เขา… ได้อย่างไร” แล้วค่อยคิดวิธีช่วย" },
] as const;

export const ELEMENT_KITS: Record<ElementKey, ElementKit> = {
  water: {
    whoTh: "ครอบครัวริมแม่น้ำกก แม่น้ำสาย และแม่น้ำโขงในเชียงราย รวมถึงคนรอบตัวที่ต้องคอยตอบคำถามเรื่องน้ำ",
    people: [
      "ครอบครัวริมแม่น้ำที่ใช้น้ำประปาหมู่บ้าน",
      "คนหาปลาริมแม่น้ำกก",
      "เกษตรกรที่สูบน้ำจากแม่น้ำไปรดผัก",
      "ลูกหลานที่ทำงานไกลบ้านและห่วงพ่อแม่",
    ],
    moments: [
      "ตอนจะเอาน้ำมาดื่มหรือทำกับข้าว",
      "ตอนอ่านผลตรวจแล้วงงกับตัวเลข",
      "ช่วงหลายสัปดาห์ที่รอผลตรวจรอบใหม่",
      "ตอนจับปลาหรือเก็บหอยมากิน",
    ],
    needs: [
      "รู้ว่าน้ำที่ใช้อยู่มาจากไหน",
      "เข้าใจผลตรวจน้ำล่าสุด",
      "รู้ว่าต้องทำอะไรต่อและไปถามใคร",
      "บอกต่อคนในหมู่บ้านได้ถูกต้อง",
    ],
    look: [
      {
        nameTh: "กรมควบคุมมลพิษ · การแก้ปัญหาแม่น้ำกก",
        kindTh: "ข้อมูลทางการ",
        findTh: "ผลตรวจสารหนูแต่ละจุด แต่ละรอบ",
        url: "https://www.pcd.go.th/?p=35662",
      },
      {
        nameTh: "กรมควบคุมมลพิษ · เร่งแก้สารหนูในแม่น้ำกก",
        kindTh: "ข้อมูลทางการ",
        findTh: "หน่วยงานรัฐกำลังแก้ปัญหาอย่างไร",
        url: "https://www.pcd.go.th/?p=36593",
      },
      {
        nameTh: "Nation · พบสารหนูใน 11 จุดของแม่น้ำกก",
        kindTh: "ข่าว",
        findTh: "ผลตรวจที่ลงในข่าวและคำชี้แจงของเจ้าหน้าที่",
        url: "https://www.nationthailand.com/news/general/40050712",
      },
      {
        nameTh: "Nation · ผลตรวจล่าสุดของแม่น้ำกก สาย และโขง",
        kindTh: "ข่าว",
        findTh: "ดูว่าผลตรวจรอบหลัง ๆ ยังเกินมาตรฐานไหม",
        url: "https://www.nationthailand.com/health-wellness/40064048",
      },
      {
        nameTh: "Thai PBS · ผลตรวจแม่น้ำสาละวิน",
        kindTh: "ข่าว",
        findTh: "เกณฑ์สารหนูในแม่น้ำที่กรมควบคุมมลพิษใช้",
        url: "https://www.thaipbs.or.th/news/content/508600",
      },
      {
        nameTh: "Nation · สารหนูในน้ำบาดาลภาคเหนือ",
        kindTh: "ข่าว",
        findTh: "สารหนูในบ่อน้ำที่เชียงใหม่และเชียงราย",
        url: "https://www.nationthailand.com/news/general/40073595",
      },
      {
        nameTh: "เว็บข้อมูลของคณะกรรมาธิการแม่น้ำโขง",
        kindTh: "ข้อมูลเปิด (สมัครฟรี)",
        findTh: "คุณภาพน้ำทั่วลุ่มแม่น้ำโขง",
        url: "https://opendevelopmentmekong.net/announcements/mekong-river-commission-launches-interactive-and-easy-to-use-mekong-data-portal/",
      },
      {
        nameTh: "data.go.th · สถานีวัดคุณภาพน้ำอัตโนมัติ",
        kindTh: "ข้อมูลเปิด",
        findTh: "ตัวอย่างข้อมูลจากแม่น้ำบางปะกงที่วัดทุก 30 นาที ลองดูว่าสถานีวัดค่าไหนได้บ้าง",
        url: "https://data.go.th/en/dataset/dataset_11_032",
      },
      {
        nameTh: "Asia News Network · ค่าน้ำที่ครอบครัวในแม่สายต้องจ่ายเพิ่ม",
        kindTh: "ข่าว",
        findTh: "คนในชุมชนเสียอะไรไปบ้างเพราะปัญหาเรื่องน้ำ",
        url: "https://asianews.network/?p=315519",
      },
    ],
    questions: [
      "เขาตรวจน้ำในแม่น้ำบ่อยแค่ไหน ระหว่างรอผลรอบใหม่ คนที่ใช้น้ำต้องรู้อะไรบ้าง",
      "น้ำที่เขาใช้อยู่มาจากไหน น้ำแม่น้ำ น้ำบ่อ น้ำประปา หรือน้ำขวด",
      "ถ้าผลตรวจบอกว่า “เกินมาตรฐาน” คนที่ใช้น้ำดื่ม ทำนา หรือหาปลาควรเข้าใจว่าอย่างไร แล้วใครให้คำแนะนำได้บ้าง",
      "เวลาได้ข่าวเรื่องน้ำ เขาฟังใคร",
    ],
    safeTh:
      "ถ้ามีคนถามว่าน้ำปลอดภัยไหม ให้ดูผลตรวจและคำแนะนำจากหน่วยงานรัฐด้วยกัน อย่ารับรองว่าน้ำปลอดภัยหรือไปเก็บตัวอย่างน้ำจากแม่น้ำเอง",
    words: [
      { th: "สารหนู", en: "Arsenic", meaningTh: "สารพิษจากการทำเหมืองที่มองไม่เห็นด้วยตาเปล่าในน้ำ" },
      { th: "ค่ามาตรฐาน / เกินมาตรฐาน", en: "Standard", meaningTh: "ค่ามาตรฐานคือค่าสูงสุดที่เกณฑ์กำหนดไว้ ถ้าวัดได้สูงกว่านั้นก็เรียกว่าเกินมาตรฐาน" },
      { th: "มก./ล.", en: "mg/L", meaningTh: "มิลลิกรัมต่อลิตร บอกว่าในน้ำ 1 ลิตรมีสารนั้นกี่มิลลิกรัม" },
      { th: "น้ำผิวดิน / น้ำบาดาล", en: "Surface water, groundwater", meaningTh: "น้ำผิวดินคือน้ำในแม่น้ำหรือบ่อ ส่วนน้ำบาดาลคือน้ำที่สูบขึ้นมาจากใต้ดิน" },
      { th: "ตะกอนดิน", en: "Sediment", meaningTh: "โคลนก้นแม่น้ำที่ยังมีสารพิษค้างอยู่ได้ แม้น้ำจะดูใสแล้ว" },
    ],
    today: [
      { th: "ส่งหน้านี้ให้คนที่มีบ้านหรือครอบครัวอยู่ริมแม่น้ำกก สาย หรือโขง" },
      { th: "เช็กผลล่าสุดจากกรมควบคุมมลพิษก่อนแชร์ตัวเลขเรื่องน้ำ", url: "https://www.pcd.go.th/?p=35662" },
      PCD_REPORT,
    ],
  },

  earth: {
    whoTh: "คนที่อยู่ใกล้จุดทิ้งขยะอันตราย กับคนงานในโรงงานเล็ก ๆ หรือร้านรับซื้อของเก่าที่ต้องจับขยะพวกนี้ทุกวัน",
    people: [
      "คนงานร้านรับซื้อของเก่า",
      "คนที่อยู่ข้างโกดังที่ไม่รู้ว่าเก็บอะไร",
      "เกษตรกรที่มีคนมาขอเช่าที่ดินทิ้งของ",
      "คนที่เก็บมือถือกับแบตเก่าไว้ในลิ้นชัก",
    ],
    moments: [
      "ตอนรถบรรทุกไม่คุ้นตาขนของเข้าออกตอนดึก",
      "ตอนจะขายหรือทิ้งมือถือเก่า",
      "ตอนเห็นน้ำไหลออกจากกองขยะหลังฝนตก",
      "ตอนแยกของเก่าโดยไม่รู้ว่าข้างในมีอะไร",
    ],
    needs: [
      "ดูออกว่าอะไรคือขยะอันตราย",
      "รู้ว่าขยะมาจากไหนและจะไปไหนต่อ",
      "แจ้งเจ้าหน้าที่โดยไม่เดือดร้อน",
      "ทิ้งของเก่าให้ถูกที่",
    ],
    look: [
      {
        nameTh: "กรุงเทพธุรกิจ · แผนคุมขยะอุตสาหกรรม",
        kindTh: "ข่าว",
        findTh: "ตามดูได้ยังไงว่าขยะอันตรายจากโรงงานไปไหน",
        url: "https://www.bangkokbiznews.com/business/980275",
      },
      {
        nameTh: "Greenpeace · สภารับร่างกฎหมาย PRTR",
        kindTh: "ข่าว (อังกฤษ)",
        findTh: "ร่างกฎหมายให้โรงงานเปิดเผยว่าปล่อยอะไรออกมา ดูว่าตอนนี้ร่างไปถึงไหนแล้ว",
        url: "https://www.greenpeace.org/southeastasia/press/67822/thai-parliament-unanimously-approves-prtr-draft-law-advancing-environmental-transparency-and-public-health-rights/",
      },
      {
        nameTh: "Greenpeace Thailand · แคมเปญ PRTR",
        kindTh: "แคมเปญ",
        findTh: "ทำไมคนถึงเรียกร้องให้มีกฎหมายนี้",
        url: "https://www.greenpeace.org/thailand/climate-airpollution-thaiprtr/",
      },
      {
        nameTh: "data.go.th · รายชื่อโรงงานแปรรูปสินค้าเกษตร",
        kindTh: "ข้อมูลเปิด",
        findTh: "ตัวอย่างข้อมูลโรงงานที่เปิดให้ทุกคนดูได้",
        url: "https://data.go.th/en/dataset/dataset_11_188",
      },
      {
        nameTh: "Google Earth Pro (บนคอมพิวเตอร์)",
        kindTh: "เครื่องมือ",
        findTh: "ภาพถ่ายดาวเทียมย้อนหลังของที่ไหนก็ได้ เลือกดูตามปี",
      },
      {
        nameTh: "Copernicus Browser",
        kindTh: "เครื่องมือ (สมัครฟรี)",
        findTh: "ภาพดาวเทียม Sentinel-2 มีภาพใหม่ทุกไม่กี่วัน",
        url: "https://browser.dataspace.copernicus.eu/",
      },
      {
        nameTh: "EurekAlert · ใช้ AI กับภาพดาวเทียมหาจุดทิ้งขยะเถื่อน",
        kindTh: "งานวิจัย (อังกฤษ)",
        findTh: "นักวิจัยดูภาพดาวเทียมยังไงถึงเจอจุดทิ้งขยะ",
        url: "https://www.eurekalert.org/news-releases/1091286",
      },
    ],
    questions: [
      "ตอนส่งขยะอันตรายต่อ ต้องมีเอกสารอะไร ใครขอดูได้บ้าง",
      "ถ้าขยะเต็มรถ 1 คันหายไประหว่างทาง ใครจะรู้ก่อน",
      "ดูภาพดาวเทียมแล้วเห็นอะไรบ้าง มีอะไรที่ดูจากภาพไม่ได้",
    ],
    toolsTh: "ลองเทียบภาพดาวเทียมของจุดเดิมก่อนกับหลัง",
    safeTh:
      "อย่าเข้าไปในจุดทิ้งขยะ แค่เห็นรูปสถานที่ก็อาจเดาได้ว่าเป็นของใคร ถ้าเจอเบาะแส ให้แจ้งเจ้าหน้าที่โดยตรงและอย่าโพสต์",
    words: [
      { th: "กากของเสียอันตราย", en: "Hazardous waste", meaningTh: "ขยะจากโรงงานที่เป็นอันตรายต่อคนถ้าจัดการผิดวิธี" },
      { th: "ใบกำกับการขนส่งของเสียอันตราย", en: "Manifest", meaningTh: "เอกสารที่ติดไปกับขยะอันตรายจนถึงจุดกำจัด" },
      { th: "ใบ ร.ง.4", en: "Factory licence", meaningTh: "ใบอนุญาตให้โรงงานเปิดดำเนินการ" },
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
    whoTh: "คนที่อยู่ใกล้โรงงานหรือจุดที่มีการเผา รวมถึงคนที่เคยแจ้งเรื่องกลิ่นหรือควัน",
    people: [
      "ครอบครัวที่อยู่ข้างโรงงานแยกขยะ",
      "เด็กเล็กหรือผู้สูงอายุที่เป็นโรคปอด",
      "นักเรียนที่โรงเรียนต้องปิดเพราะฝุ่น",
      "ชาวบ้านที่ได้กลิ่นทุกคืนแต่ไม่มีหลักฐาน",
    ],
    moments: [
      "ตอนกลิ่นมากลางดึกและไม่มีเจ้าหน้าที่",
      "ตอนโดนขอหลักฐานหลังร้องเรียน",
      "ตอนเช้าที่คิดว่าจะให้ลูกออกข้างนอกไหม",
      "ช่วงที่มีการเผา (กุมภาพันธ์ถึงเมษายน)",
    ],
    needs: [
      "จดเหตุการณ์ไว้เป็นหลักฐานให้เจ้าหน้าที่",
      "รู้ว่าค่าฝุ่นแถวบ้านตอนนี้เท่าไร",
      "รู้ว่าต้องแจ้งใครและแจ้งยังไง",
      "ป้องกันตัวเองจากอากาศแย่ ๆ",
    ],
    look: [
      {
        nameTh: "Air4Thai (เว็บและแอป)",
        kindTh: "ข้อมูลทางการ",
        findTh: "ค่า PM2.5 กับดัชนีคุณภาพอากาศของแต่ละสถานี",
        url: "http://air4thai.pcd.go.th/",
      },
      {
        nameTh: "AQICN · คุณภาพอากาศในไทย",
        kindTh: "เครือข่ายเซนเซอร์",
        findTh: "ค่าที่วัดได้จากเซนเซอร์ราคาประหยัดทั่วประเทศ เช่น DustBoy ของมหาวิทยาลัยเชียงใหม่",
        url: "https://aqicn.org/city/thailand/",
      },
      {
        nameTh: "Sensor for All, วิศวฯ จุฬาฯ",
        kindTh: "เครือข่ายเซนเซอร์",
        findTh: "ค่าฝุ่นใกล้บ้าน พร้อมข้อมูลย้อนหลัง",
        url: "https://www.eng.chula.ac.th/?p=37762",
      },
      {
        nameTh: "GISTDA · จุดความร้อน",
        kindTh: "ข้อมูลดาวเทียม",
        findTh: "ดูจุดความร้อนที่ดาวเทียมตรวจพบในแต่ละวัน",
        url: "https://disaster.gistda.or.th/fire",
      },
      {
        nameTh: "data.go.th · จุดความร้อนรายจังหวัด",
        kindTh: "ข้อมูลเปิด",
        findTh: "ไฟล์จุดความร้อนที่ดาวน์โหลดไปวิเคราะห์ต่อได้",
        url: "https://gdcc.data.go.th/en/dataset/dataset_66_04_006",
      },
      {
        nameTh: "กรมควบคุมมลพิษ · ช่องทางร้องเรียน (PDF)",
        kindTh: "คู่มือทางการ",
        findTh: "แจ้งเรื่องมลพิษได้ที่ไหน แล้วเจ้าหน้าที่ทำอะไรต่อ",
        url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
      },
    ],
    questions: [
      "เซนเซอร์ PM2.5 บอกอะไรได้บ้าง มีอะไรที่วัดไม่ได้",
      "ถ้าอากาศแย่ จะรู้ได้ยังไงว่าต้นเหตุมาจากแถวบ้านหรือไกลออกไป",
      "ต้องมีหลักฐานอะไร เจ้าหน้าที่ถึงจะเริ่มจัดการเรื่องร้องเรียน",
    ],
    toolsTh:
      "ลองดูค่าจากเซนเซอร์ที่มีอยู่แล้วแถวนั้น เช่น เซนเซอร์ที่บ้าน หน้าจอเครื่องฟอกอากาศ DustBoy หรือ Sensor for All แล้วดูทิศลมในแอปพยากรณ์อากาศ",
    safeTh: "อย่าเข้าไปในโรงงาน ถ้าจะใช้เซนเซอร์ ให้ใช้ในบ้านของคนที่อยู่แถวนั้นอยู่แล้ว",
    words: [
      { th: "ฝุ่น PM2.5", en: "PM2.5", meaningTh: "ฝุ่นละเอียดจนเข้าไปลึกถึงปอดได้" },
      { th: "ดัชนีคุณภาพอากาศ", en: "AQI", meaningTh: "ตัวเลขที่บอกว่าคุณภาพอากาศดีหรือแย่แค่ไหน" },
      { th: "จุดความร้อน", en: "Hotspot", meaningTh: "จุดที่ดาวเทียมตรวจเจอว่าร้อนผิดปกติ ส่วนใหญ่มาจากไฟ" },
    ],
    today: [
      { th: "ก่อนออกจากบ้าน ลองเช็กค่าฝุ่นแถวนั้นใน Air4Thai", url: "http://air4thai.pcd.go.th/" },
      { th: "ทุกครั้งที่ได้กลิ่นหรือเห็นควัน จดวัน เวลา ทิศลม และอาการไว้ แล้วส่งบันทึกไปด้วยตอนแจ้ง" },
      PCD_REPORT,
    ],
  },

  fire: {
    whoTh: "ครอบครัวที่อยู่ใกล้เขตโรงงานกับญาติที่อยู่ไกล",
    people: [
      "ครอบครัวที่อยู่ใกล้โรงงานเคมี",
      "ญาติต่างจังหวัดที่ติดต่อคนที่บ้านไม่ได้",
      "อาสากู้ภัยและนักดับเพลิง",
      "ผู้สูงอายุที่อยู่ลำพังใกล้เขตอุตสาหกรรม",
    ],
    moments: [
      "ชั่วโมงแรกหลังเกิดไฟไหม้สารเคมี",
      "ตอนตีสามที่ทุกคนหลับ",
      "ตอนคิดว่าจะออกจากบ้านไหม ไปทางไหน",
      "หลังไฟดับหลายวัน ยังห่วงเรื่องอากาศ",
    ],
    needs: [
      "รู้ทันเหตุการณ์และรู้ว่าต้องทำอะไรต่อ",
      "รู้ว่าต้องไปที่ไหน",
      "บอกญาติได้ว่าปลอดภัยแล้ว",
      "รู้ว่าต้องฟังคำสั่งจากหน่วยงานไหน",
    ],
    look: [
      {
        nameTh: "TruePlookpanya · เบอร์แจ้งเหตุไฟไหม้",
        kindTh: "สายด่วน",
        findTh: "โทร 199 แจ้งเหตุไฟไหม้",
        url: "https://www.trueplookpanya.com/knowledge/content/93843-heabod-hea-",
      },
      {
        nameTh: "กรมป้องกันและบรรเทาสาธารณภัย",
        kindTh: "สายด่วน",
        findTh: "โทร 1784 แจ้งเหตุสาธารณภัย",
        url: "https://www.disaster.go.th/",
      },
      {
        nameTh: "กรมควบคุมมลพิษ · สายด่วน 1650",
        kindTh: "สายด่วน",
        findTh: "แจ้งเรื่องมลพิษ รวมถึงสารเคมีรั่วไหล",
        url: "https://ecap.pcd.go.th/public/assets/img/download/202605211900681739.pdf",
      },
      {
        nameTh: "GISTDA · จุดความร้อน",
        kindTh: "ข้อมูลดาวเทียม",
        findTh: "จุดความร้อนที่ดาวเทียมตรวจพบ",
        url: "https://disaster.gistda.or.th/fire",
      },
      {
        nameTh: "Nation · ดาวเทียมพบจุดความร้อน 1,355 จุด",
        kindTh: "ข่าว",
        findTh: "ดูว่าข่าวเอาข้อมูลดาวเทียมมาเล่าเรื่องไฟยังไง",
        url: "https://www.nationthailand.com/news/general/40046356",
      },
    ],
    questions: [
      "ชั่วโมงแรกที่เกิดไฟไหม้สารเคมี ครอบครัวแถวนั้นต้องรู้อะไร ตอนนี้ใครเป็นคนบอก",
      "ใครมีหน้าที่แจ้งเตือนและสั่งให้ออกจากพื้นที่",
      "ญาติที่อยู่ไกลจะรู้ได้อย่างไรว่าที่บ้านปลอดภัย",
    ],
    safeTh:
      "ใช้คำแนะนำจากหน่วยงานรัฐ แล้วให้ผู้รู้ช่วยดูก่อนแชร์ อย่าเขียนคำแนะนำเรื่องสุขภาพหรือการอพยพเอง และอย่าเข้าไปในเขตโรงงาน",
    words: [
      { th: "สารเคมีรั่วไหล", en: "Chemical leak", meaningTh: "สารเคมีอันตรายรั่วออกมาปนกับอากาศ น้ำ หรือดิน" },
      { th: "อพยพ", en: "Evacuate", meaningTh: "ออกจากบ้านเพราะมีอันตราย" },
      { th: "จุดความร้อน", en: "Hotspot", meaningTh: "จุดที่ดาวเทียมตรวจเจอว่าร้อนผิดปกติ ส่วนใหญ่มาจากไฟ" },
    ],
    today: [
      { th: "บันทึกเบอร์ 199 (ไฟไหม้) และ 1784 (สาธารณภัย) ไว้ในมือถือของพ่อแม่" },
      { th: "ลองถามหน่วยงานท้องถิ่นว่า ถ้าเกิดเหตุเกี่ยวกับสารเคมี แถวบ้านมีแผนรับมือไหม" },
      PCD_REPORT,
    ],
  },

  aether: {
    whoTh: "ทุกคนที่ใช้มือถือ รวมถึงคนในบ้านที่เชื่อแล้วแชร์เรื่องที่เห็นในฟีด",
    people: [
      "แม่ที่ส่งต่อข่าวในกลุ่มไลน์ครอบครัว",
      "ตัวเอง",
      "ตายายที่เชื่อผู้ประกาศข่าวหน้าคุ้น",
      "เพื่อนที่กำลังจะโอนเงินตามโฆษณาลงทุน",
    ],
    moments: [
      "สามวินาทีก่อนกดแชร์",
      "ตอนเห็นคลิปคนดังชวนลงทุน",
      "ตอนเผลอหยิบมือถือมาเลื่อนฟีดก่อนนอน",
      "ตอนข่าวปลอมเก่าวนกลับมาในกลุ่มไลน์",
    ],
    needs: [
      "หยุดคิดก่อนแชร์",
      "เช็กว่าใครโพสต์และเรื่องมาจากไหน",
      "รู้ว่าใช้เวลาเลื่อนฟีดไปเท่าไร",
      "แยกคลิป AI กับคลิปจริง",
    ],
    look: [
      {
        nameTh: "Cofact",
        kindTh: "ตรวจข่าว",
        findTh: "ถามบอตใน LINE หรือดูข่าวที่เคยเช็กไว้แล้ว",
        url: "https://blog.cofact.org/?p=9997",
      },
      {
        nameTh: "Thai PBS Verify",
        kindTh: "ตรวจข่าว",
        findTh: "ผลเช็กโพสต์ที่คนแชร์กันเยอะและคลิปดีปเฟก",
        url: "https://www.thaipbs.or.th/verify",
      },
      {
        nameTh: "ชัวร์ก่อนแชร์ (อสมท) และ AFP Fact Check ภาษาไทย",
        kindTh: "ตรวจข่าว",
        findTh: "แหล่งเช็กข่าวภาษาไทยอีกสองแห่ง",
      },
      {
        nameTh: "Screen Time (iPhone) หรือ Digital Wellbeing (Android)",
        kindTh: "ข้อมูลการใช้มือถือ",
        findTh: "ดูว่าใช้แต่ละแอปกี่นาที หยิบมือถือกี่ครั้ง และได้แจ้งเตือนกี่ครั้ง",
      },
      {
        nameTh: "Cal Newport, Digital Minimalism (2019)",
        kindTh: "หนังสือ",
        findTh: "ทำไมแอปถึงดึงความสนใจได้ และจะลองใช้ให้น้อยลงเป็นเวลา 30 วันได้ยังไง",
      },
    ],
    questions: [
      "ข้อความล่าสุดที่คนในบ้านส่งต่อมาจากไหน เขาจะเช็กที่มาได้ยังไง",
      "เมื่อวานหยิบมือถือกี่ครั้ง หยิบเพราะอะไร",
      "ลองเลือกแอปสักแอป หา 3 อย่างที่ทำให้อยากใช้ต่อ แล้วดูว่าใครได้เงินจากแต่ละอย่าง",
      "อะไรจะทำให้คนหยุดคิดก่อนแชร์",
    ],
    safeTh:
      "เขียนกำกับให้ชัดทุกครั้งถ้าแต่งเรื่องขึ้นมา อย่าทำดีปเฟกของคนจริง ถึงจะทำไว้เตือนคนอื่นก็อย่าทำ ใช้เฉพาะข้อมูลจากมือถือของตัวเองหรือของเพื่อนที่อนุญาตแล้ว เวลาเผยแพร่อย่าใส่ชื่อ",
    words: [
      { th: "ข่าวปลอม", en: "Fake news", meaningTh: "เรื่องไม่จริงที่ทำให้ดูเหมือนข่าว" },
      { th: "ดีปเฟก", en: "Deepfake", meaningTh: "คลิปหรือเสียงที่ใช้ AI ทำให้เหมือนคนจริง" },
      { th: "ตรวจสอบข้อเท็จจริง", en: "Fact-check", meaningTh: "เช็กว่าเรื่องที่เขาพูดจริงไหม และเขาเป็นใคร" },
      { th: "อัลกอริทึม", en: "Algorithm", meaningTh: "กฎที่แอปใช้เลือกว่าจะให้เห็นอะไรต่อ" },
      { th: "ร่องรอยทางดิจิทัล", en: "Digital footprint", meaningTh: "ร่องรอยที่ทิ้งไว้จากสิ่งที่ทำออนไลน์ รวมถึงสิ่งที่เสียไปโดยไม่ทันสังเกต" },
    ],
    today: [
      { th: "ครั้งหน้าก่อนกดแชร์ ลองส่งข้อความไปถาม Cofact", url: "https://blog.cofact.org/?p=9997" },
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

/**
 * "{ตอน…} เราจะช่วยให้{คน} {ทำอะไร}ได้อย่างไร". The moment leads, so it frames
 * the whole question and "ตอน" and "ได้" never pile up at the end (Thai review
 * by Codex and Gemini, 2026-11-24). A need typed with "ได้" at the end loses
 * it, so the question doesn't read "ได้ได้อย่างไร".
 */
export function buildFrame({ person, moment, need }: FrameParts): string {
  const who = person.trim() || "คนที่เจอเรื่องนี้";
  const what = need.trim().replace(/\s*ได้$/, "");
  // Thai writes "แย่ ๆ ได้", with a space after the repeat mark.
  const glue = what.endsWith("ๆ") ? " " : "";
  const ask = what ? `เราจะช่วยให้${who} ${what}${glue}ได้อย่างไร` : `เราจะช่วยให้${who}ได้อย่างไร`;
  return [moment.trim(), ask].filter(Boolean).join(" ");
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
      th: "บอกชัดว่าอยากช่วยใคร",
      hintTh: "ลองใส่ว่าอยากช่วยใครลงในคำถาม",
    },
    {
      key: "question",
      ok: /อย่างไร|ยังไง|ได้ไหม\s*$/.test(t),
      th: "ถามว่าจะช่วยยังไง",
      hintTh: "ลองจบด้วย “ได้อย่างไร”",
    },
    {
      key: "blame",
      ok: !blame,
      th: "ไม่ได้ชี้ว่าใครผิด",
      hintTh: blame ? `ลองอ่านตรงคำว่า “${blame}” อีกที ถ้ากำลังถามว่าใครผิด ลองกลับมาถามว่าเขาต้องการอะไร` : "",
    },
    {
      key: "open",
      ok: !answer,
      th: "เปิดให้ลองได้หลายวิธี",
      hintTh: answer ? `ลองดูคำว่า “${answer}” ถ้าเป็นวิธีที่คิดไว้ ลองเก็บไว้ก่อน แล้วถามว่าเขาอยากทำอะไรให้ได้` : "",
    },
  ];
}
