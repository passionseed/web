import type { ElementKey } from "./media";

/**
 * The full brief behind each element on /hackathon: the problem, the
 * challenge at two sizes, and real cases with their impact.
 *
 * Challenges: Big's draft in company-brain private/hackathon-december-2026.md
 * ("The 5 challenges"), put into Thai. Aether follows its new scope (AI, social
 * media and tech's unseen harms; Big, 2026-11-21).
 *
 * Cases: web research on 2026-11-22. Every number is from a page that was
 * opened and is linked in `sources`; nothing is estimated. Rule (Big,
 * 2026-11-19): no company or venue is named, only the place, the year and what
 * happened.
 *
 * Years are Buddhist Era (2569 = 2026).
 */

export interface CaseSource {
  name: string;
  url: string;
  dateTh: string;
}

export interface CaseImpact {
  /** The number, as it should read big: "30 เท่า", "1,992 คน". */
  value: string;
  labelTh: string;
}

/** A photo we may publish (CC, public domain, Unsplash); never a news outlet's photo. */
export interface CaseImage {
  src: string;
  altTh: string;
  /** Printed on the photo, as its license asks: author, license, where it's from. */
  credit: string;
  /** The file's Commons page, which carries the full license. */
  creditUrl: string;
}

export interface ElementCase {
  titleTh: string;
  placeTh: string;
  yearTh: string;
  whatHappenedTh: string;
  impact: readonly CaseImpact[];
  whoIsHurtTh: string;
  sources: readonly CaseSource[];
  image?: CaseImage;
}

export interface ElementDetail {
  /**
   * The button that opens this brief: a question from one of this element's
   * cases, so each one is a different hook. Only facts that are in `cases`.
   */
  ctaTh: string;
  problemTh: string;
  howMightWeTh: string;
  starterTh: string;
  stretchTh: string;
  cases: readonly ElementCase[];
  cover?: CaseImage;
}

/** Under each challenge: the cases are examples, not the only problems (Angpao, 2026-11-20). */
export const ANY_PROBLEM_NOTE = "ทีมเลือกปัญหาใดก็ได้ในธาตุนั้น หรือรวมหลายธาตุ";

export const ELEMENT_DETAILS: Record<ElementKey, ElementDetail> = {
  water: {
    ctaTh: "ทำไมน้ำประปาแม่สายต้องหยุดจ่าย",
    problemTh:
      "แม่น้ำทางภาคเหนือมีสารหนูจากเหมืองต้นน้ำ ครอบครัวที่ดื่ม ทำนา และหาปลาจากแม่น้ำมักรู้ตัวช้า และตัวเลขผลตรวจในข่าวก็อ่านยาก",
    howMightWeTh:
      "เราจะช่วยให้คนที่อยู่ริมแม่น้ำรู้ได้อย่างไร ว่าวันนี้น้ำใช้ได้ไหม และถ้าใช้ไม่ได้ ต้องทำอะไร",
    starterTh:
      "เว็บหน้าเดียวหรือ LINE bot สำหรับหนึ่งอำเภอริมแม่น้ำ บอกผลตรวจน้ำล่าสุดเป็นภาษาที่ทุกคนอ่านเข้าใจ และบอกว่าควรทำอะไรต่อ",
    stretchTh:
      "แจ้งเตือนทันทีเมื่อผลตรวจใหม่เกินค่าปลอดภัย หรือคู่มือตรวจน้ำเองที่บ้านแบบราคาถูก ที่ครอบครัวจริงลองใช้แล้ว",
    cases: [
      {
        titleTh: "สารหนูในแม่น้ำสาย จนน้ำประปาต้องหยุดจ่าย",
        placeTh: "แม่สาย เชียงราย และหนองคาย",
        yearTh: "พ.ย. 2569",
        whatHappenedTh:
          "สารหนูจากเหมืองต้นน้ำไหลลงแม่น้ำสายและแม่น้ำโขง น้ำประปาใน 14 หมู่บ้านของอำเภอแม่สายต้องหยุดจ่าย และรัฐต้องสั่งหาน้ำสะอาดมาแจกให้คนในพื้นที่",
        impact: [
          { value: "30 เท่า", labelTh: "สารหนูในโรงผลิตน้ำประปาแม่สาย เทียบกับค่าที่ปลอดภัย" },
          { value: "20,000+ ครัวเรือน", labelTh: "ได้รับผลกระทบทางภาคเหนือ" },
          { value: "17 จาก 177 คน", labelTh: "ที่หนองคาย ตรวจพบสารหนูในปัสสาวะ" },
        ],
        whoIsHurtTh: "ทุกบ้านที่ใช้น้ำประปา และชาวบ้านริมแม่น้ำโขงที่อยู่ปลายน้ำ",
        sources: [
          {
            name: "Al Jazeera",
            url: "https://www.aljazeera.com/news/2026/11/18/arsenic-pollution-linked-to-myanmar-mining-prompts-water-alert-in-thailand",
            dateTh: "18 พ.ย. 2569",
          },
          {
            name: "Manila Times",
            url: "https://www.manilatimes.net/2026/11/18/world/thailand-orders-clean-water-for-thousands-facing-arsenic-pollution/2472924",
            dateTh: "18 พ.ย. 2569",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/water-1.webp",
          altTh: "น้ำท่วมเอ่อล้นทุ่งในจังหวัดเชียงราย ปี 2567",
          credit: "ภาพ: ร้อยตรี โชคดี, CC BY-SA 4.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:2024_Flooding_in_Chiang_Rai_Province_2.jpg",
        },
      },
      {
        titleTh: "แม่น้ำกกที่ไม่เคยใสอีกเลย",
        placeTh: "แม่น้ำกก เชียงราย",
        yearTh: "2567 ถึง 2569",
        whatHappenedTh:
          "หลังน้ำท่วมปี 2567 แม่น้ำกกขุ่นต่อเนื่องมาเกือบ 2 ปี และพบโลหะหนักในน้ำ ชาวบ้านที่หาปลาจับปลาได้น้อยลงมาก และหอยที่เคยกินได้ก็ไม่ปลอดภัยแล้ว",
        impact: [
          { value: "16 จาก 90 คน", labelTh: "ชาวบ้านที่ตรวจเล็บและผม พบสารหนูเกินมาตรฐาน" },
          { value: "2 ตัว", labelTh: "ปลาที่ชาวประมงจับได้ทั้งวัน" },
          { value: "3.09 มก./กก.", labelTh: "สารหนูในหอยขม เกินมาตรฐาน จนเจ้าหน้าที่แนะนำให้งดกิน" },
        ],
        whoIsHurtTh: "คนหาปลา และเกษตรกรที่ปลูกผักริมแม่น้ำ",
        sources: [
          { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/557481", dateTh: "5 ก.ย. 2569" },
          { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/503075", dateTh: "8 มี.ค. 2569" },
          {
            name: "HaRDstories",
            url: "https://hardstories.org/stories/environmental-justice/myanmar-mining-boom-poisons-thai-rivers",
            dateTh: "4 เม.ย. 2569",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/water-2.webp",
          altTh: "น้ำโคลนท่วมบ้านเรือนในเชียงราย ปี 2567",
          credit: "ภาพ: ร้อยตรี โชคดี, CC BY-SA 4.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:2024_Flooding_in_Chiang_Rai_Province_1.jpg",
        },
      },
    ],
  },

  earth: {
    ctaTh: "กากแคดเมียมหมื่นตันถูกขนไปไหน",
    problemTh:
      "กากอันตรายที่ควรถูกเก็บไว้อย่างปลอดภัย ถูกขุดขึ้นมาขนไปขายต่อ แล้วไปโผล่ในโกดังและโรงงานใกล้บ้านคนที่อยู่ไกลออกไป ไม่มีใครรู้จนคนเริ่มป่วย",
    howMightWeTh:
      "เราจะทำให้กากอันตรายหายไป หรือถูกขายต่อโดยไม่มีใครรู้ ยากขึ้นได้อย่างไร",
    starterTh:
      "คู่มือสั้นๆ สำหรับคนทำงานในโรงงานเล็กหรือร้านรับซื้อของเก่า: ดูยังไงว่าเป็นกากอันตราย ทำไมถึงอันตราย และต้องโทรหาใคร ลองกับคนที่ทำงานกับเศษโลหะหรือขยะจริง 3 คน",
    stretchTh:
      "เดโม “พาสปอร์ตขยะ” ป้าย QR ที่บันทึกทุกครั้งที่ขยะเปลี่ยนมือ ถ้าขั้นไหนหายไป จะเห็นทันที",
    cases: [
      {
        titleTh: "กากแคดเมียมหมื่นตัน ที่ถูกขนออกไปเงียบๆ",
        placeTh: "จากตาก ไปสมุทรสาครและชลบุรี",
        yearTh: "2567",
        whatHappenedTh:
          "กากที่มีแคดเมียมถูกขนออกจากที่เก็บในจังหวัดตาก ไปไว้ในโกดังและโรงงานหลายจังหวัด ตำรวจตามเจอเพิ่มเรื่อยๆ สุดท้ายต้องขนกลับไปที่ตากทีละขบวน",
        impact: [
          { value: "10,000+ ตัน", labelTh: "กากแคดเมียมที่ตำรวจตามพบ" },
          { value: "17 จาก 34 คน", labelTh: "ชาวบ้านรอบโรงงานโลหะ ที่ต้องเข้าโรงพยาบาล" },
          { value: "258 ตัน", labelTh: "ที่รถ 10 คันขบวนแรก ขนกลับไปตาก" },
        ],
        whoIsHurtTh: "คนงานในโรงงาน คนที่อยู่รอบโกดัง และดินกับแม่น้ำตลอดทางที่ขนผ่าน",
        sources: [
          { name: "ไทยรัฐ", url: "https://www.thairath.co.th/news/local/central/2777163", dateTh: "9 เม.ย. 2567" },
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/thailand/general/40037329",
            dateTh: "18 เม.ย. 2567",
          },
          { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/339530", dateTh: "30 เม.ย. 2567" },
        ],
        image: {
          src: "/hackathon/elemental/cases/earth-1.webp",
          altTh: "ถังเก็บกากอันตรายวางซ้อนกันบนพาเลท",
          credit: "ภาพ: Mampato, Public domain, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Drums_with_toxic_waste_2776.jpg",
        },
      },
      {
        titleTh: "ขยะอิเล็กทรอนิกส์ทะลักเข้าโรงงานที่ไม่มีใบอนุญาต",
        placeTh: "ฉะเชิงเทรา ปทุมธานี และระยอง",
        yearTh: "2566 ถึง 2569",
        whatHappenedTh:
          "ไทยนำเข้าขยะอิเล็กทรอนิกส์มากขึ้นหลายเท่าในไม่กี่ปี เจ้าหน้าที่บุกค้นแล้วเจอกองขยะมหาศาลในอาคารที่ไม่มีใบอนุญาตโรงงาน ชาวบ้านรอบๆ บ่นว่าหายใจไม่สะดวก เวียนหัว และปวดหัว",
        impact: [
          { value: "56,154 ตัน", labelTh: "ขยะอิเล็กทรอนิกส์ที่ไทยนำเข้าแค่ 10 เดือนแรกของปี 2566 (ทั้งปี 2560 มีแค่ 2,824 ตัน)" },
          { value: "2,500+ ตัน", labelTh: "ขยะอิเล็กทรอนิกส์และเศษโลหะ ที่เจอในการบุกค้นที่ระยอง" },
          { value: "9 จาก 15 อาคาร", labelTh: "ในจุดเดียวกัน ไม่มีใบอนุญาตโรงงาน" },
        ],
        whoIsHurtTh: "ชาวบ้านที่อยู่ห่างโรงงานราว 1 กิโลเมตร และคนงานที่ทำงานข้างใน",
        sources: [
          {
            name: "BenarNews",
            url: "https://www.benarnews.org/english/news/thai/waste-concerns-01022024134827.html",
            dateTh: "2 ม.ค. 2567",
          },
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/news/general/40072391",
            dateTh: "17 ต.ค. 2569",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/earth-2.webp",
          altTh: "กองคอมพิวเตอร์และจอเก่าที่ถูกทิ้ง",
          credit: "ภาพ: AvWijk, Public domain, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Ewaste-pile.jpg",
        },
      },
      {
        titleTh: "ขยะที่ถูกฝังในไร่ แล้วน้ำท่วมพาออกมา",
        placeTh: "ฉะเชิงเทรา และปราจีนบุรี",
        yearTh: "2568 ถึง 2569",
        whatHappenedTh:
          "กากอุตสาหกรรมถูกลักลอบฝังในที่ดินเกษตร พอน้ำท่วมปี 2569 มลพิษจากบ่อขยะก็ไหลเข้าหมู่บ้าน คนที่เคยจับปลากินเองไม่กล้ากินอีก",
        impact: [
          { value: "~50,000 ตัน", labelTh: "กากอุตสาหกรรมที่ถูกฝังผิดกฎหมายในอำเภอแปลงยาว" },
          { value: "6,000+ ตัน", labelTh: "กากในโกดังที่บุกค้น ตรวจเบื้องต้นเจอสารหนู แคดเมียม ตะกั่ว และปรอท" },
          { value: "60+ จุด", labelTh: "ที่นักวิจัยสงสัยว่าเป็นที่ทิ้งขยะเถื่อน ในปราจีนบุรีจังหวัดเดียว" },
        ],
        whoIsHurtTh: "เกษตรกรและชาวบ้านที่ใช้น้ำและกินปลาจากในพื้นที่",
        sources: [
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/news/policy/40052176",
            dateTh: "5 ก.ค. 2568",
          },
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/news/general/40073679",
            dateTh: "19 พ.ย. 2569",
          },
          {
            name: "The Star / AFP",
            url: "https://www.thestar.com.my/aseanplus/aseanplus-news/2026/11/19/thai-floods-expose-waste-pollution-in-039garbage-dump039-region",
            dateTh: "19 พ.ย. 2569",
          },
        ],
      },
    ],
  },

  air: {
    ctaTh: "ทำไมโรงเรียนกว่า 250 แห่งต้องปิด",
    problemTh:
      "ทุกหน้าแล้ง ภาคเหนือจมอยู่ในควันจากการเผา ในเมืองฝุ่นหนาจนโรงเรียนต้องปิด และบางที่ก็มีโรงงานแยกขยะตั้งอยู่ข้างบ้าน เพื่อนบ้านได้กลิ่นทุกวัน แต่พิสูจน์ไม่ได้ และไม่รู้จะแจ้งใคร",
    howMightWeTh:
      "เราจะช่วยให้คนบันทึก พิสูจน์ และแจ้งเรื่องมลพิษในอากาศใกล้บ้านได้อย่างปลอดภัยได้อย่างไร",
    starterTh:
      "สมุดบันทึกมลพิษ: ชาวบ้านจดกลิ่น เวลา อาการ และถ่ายรูป แล้วเรียงเป็นไทม์ไลน์ที่ส่งให้เจ้าหน้าที่ได้ ลองกับคนจริง 3 คน",
    stretchTh:
      "แผนที่ที่รวมบันทึกจากหลายบ้าน หรือคู่มือทีละขั้นว่าต้องยื่นเรื่องร้องเรียนกับหน่วยงานไหน",
    cases: [
      {
        titleTh: "ฝุ่นที่ปิดโรงเรียนในกรุงเทพฯ",
        placeTh: "กรุงเทพฯ",
        yearTh: "ม.ค. 2568",
        whatHappenedTh:
          "ฝุ่น PM2.5 สูงเกินค่าปลอดภัยติดกันหลายวัน จนกรุงเทพฯ ต้องสั่งปิดโรงเรียนหลายร้อยแห่ง",
        impact: [
          { value: "250+ โรงเรียน", labelTh: "ในกรุงเทพฯ ที่ต้องปิดเพราะฝุ่น ณ วันที่ 24 ม.ค." },
          { value: "108", labelTh: "ไมโครกรัม/ลบ.ม. ค่า PM2.5 เช้าวันที่ 24 ม.ค." },
          { value: "21.6 เท่า", labelTh: "ของค่าแนะนำรายปีขององค์การอนามัยโลก" },
        ],
        whoIsHurtTh: "นักเรียนที่เสียวันเรียน เด็กเล็ก และผู้สูงอายุที่มีโรคปอด",
        sources: [
          {
            name: "Al Jazeera",
            url: "https://www.aljazeera.com/news/2025/1/24/more-than-250-schools-close-in-bangkok-as-air-pollution-soars",
            dateTh: "24 ม.ค. 2568",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/air-1.webp",
          altTh: "สะพานพระราม 9 และแม่น้ำเจ้าพระยา ในหมอกฝุ่น",
          credit: "ภาพ: eric molina, CC BY 2.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:King_Rama_IX_Bridge_(4272903581).jpg",
        },
      },
      {
        titleTh: "ฤดูเผาที่เชียงใหม่",
        placeTh: "เชียงใหม่ และภาคเหนือ",
        yearTh: "2568 ถึง 2569",
        whatHappenedTh:
          "ทุกปีช่วงกุมภาพันธ์ถึงเมษายน มีการเผาไร่และป่า อากาศทั้งภาคเหนือกลายเป็นอันตราย ป่าจำนวนมากถูกถางเพื่อปลูกข้าวโพด แล้วถูกเผาซ้ำทุกปี",
        impact: [
          { value: "409", labelTh: "ไมโครกรัม/ลบ.ม. ค่า PM2.5 ที่วัดได้ในอำเภอแม่ริม 4 เม.ย. 2569" },
          { value: "1.5 เท่า", labelTh: "ผู้ป่วยที่โรงพยาบาลมหาราชนครเชียงใหม่ เทียบกับปกติ" },
          { value: "51%", labelTh: "ของฝุ่น PM2.5 ในเชียงใหม่ช่วงมีนาคมถึงเมษายน มาจากการเผาในภาคเกษตร" },
        ],
        whoIsHurtTh: "คนทั้งภาคเหนือ โดยเฉพาะเด็ก ผู้สูงอายุ และครอบครัวเกษตรกร",
        sources: [
          {
            name: "The Star",
            url: "https://www.thestar.com.my/aseanplus/aseanplus-news/2026/04/04/pm25-levels-in-chiang-mai-reaches-extremely-dangerous-levels-visibility-plummets",
            dateTh: "4 เม.ย. 2569",
          },
          {
            name: "Chiang Mai CityLife",
            url: "https://www.chiangmaicitylife.com/citynews/general/maharaj-hospital-says-patient-number-have-surged-1-5-times/",
            dateTh: "3 เม.ย. 2569",
          },
          {
            name: "Mongabay",
            url: "https://news.mongabay.com/2025/11/karen-community-fighting-corn-and-coal-for-clean-air-in-northern-thailand/",
            dateTh: "6 พ.ย. 2568",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/air-2.webp",
          altTh: "ตัวเมืองเชียงใหม่ใต้ฟ้าสีหม่นจากควันการเผา",
          credit: "ภาพ: FredTC, CC BY-SA 4.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Chiang_Mai_Air_Pollution_P_20180306_144750_1_p.jpg",
        },
      },
      {
        titleTh: "กลิ่นจากโรงงานข้างบ้าน",
        placeTh: "ชลบุรี และภาคตะวันออก",
        yearTh: "2568 ถึง 2569",
        whatHappenedTh:
          "ชาวบ้านที่อยู่ติดโรงงานหลอมหรือแยกขยะ บ่นเรื่องควัน เวียนหัว และนอนไม่หลับ พอเจ้าหน้าที่ออกตรวจทั่วประเทศ ก็เจอโรงงานทำผิดกฎหมายเกือบครึ่ง",
        impact: [
          { value: "375 จาก 752", labelTh: "สถานประกอบการที่เจ้าหน้าที่ตรวจ แล้วพบว่าทำผิด พ.ร.บ.โรงงาน" },
          { value: "~200 คน", labelTh: "ชาวบ้านในชลบุรีที่ออกมาประท้วงเรื่องกลิ่นจากโรงงานรีไซเคิลพลาสติก" },
        ],
        whoIsHurtTh: "ครอบครัวที่อยู่ห่างโรงงานไม่กี่กิโลเมตร รวมถึงเด็กๆ",
        sources: [
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/news/general/40073408",
            dateTh: "12 พ.ย. 2569",
          },
          {
            name: "The Pattaya News",
            url: "https://thepattayanews.com/2025/12/08/residents-in-chonburi-protest-plastic-recycling-factory-over-persistent-foul-odors-despite-closure-order/",
            dateTh: "8 ธ.ค. 2568",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/air-3.webp",
          altTh: "ควันพวยพุ่งจากปล่องโรงงาน",
          credit: "ภาพ: Pöllö, CC BY 3.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Smoke_plume_from_chimney_of_power_plant.jpg",
        },
      },
    ],
  },

  fire: {
    ctaTh: "ทำไม 1,992 คนต้องอพยพ",
    problemTh:
      "ที่เก็บกากเคมีที่ถูกสั่งปิดไปแล้ว แต่กากยังกองอยู่ เกิดไฟไหม้ติดต่อกันหลายวัน คนรอบๆ ต้องหนีออกจากบ้าน โดยไม่รู้ว่ากำลังสูดอะไรเข้าไป",
    howMightWeTh:
      "เราจะเตือนและปกป้องคนที่อยู่ใกล้แหล่งสารเคมีได้อย่างไร ทั้งก่อนและระหว่างไฟไหม้ หรือทำให้แน่ใจว่ากากที่ถูกสั่งให้ขนออก ถูกขนออกไปจริง",
    starterTh:
      "คู่มือฉุกเฉินหน้าเดียวสำหรับชุมชนหนึ่งที่อยู่ใกล้เขตโรงงาน: ถ้าเกิดไฟไหม้สารเคมีต้องทำอะไร ไปที่ไหน โทรหาใคร ลองกับคนที่อยู่ใกล้เขตโรงงานจริง 3 คน",
    stretchTh:
      "ระบบลงทะเบียนรับการแจ้งเตือน หรือเครื่องมือเช็กอินให้ครอบครัวบอกญาติได้ว่าปลอดภัยแล้ว",
    cases: [
      {
        titleTh: "ที่เก็บกากเคมีที่ปิดไปแล้ว ยังไหม้อยู่หลายวัน",
        placeTh: "บ้านค่าย ระยอง",
        yearTh: "เม.ย. 2567",
        whatHappenedTh:
          "ที่เก็บกากเคมีแห่งนี้หยุดดำเนินการไปตั้งแต่ไฟไหม้ครั้งก่อนในปี 2565 แต่กากยังอยู่ที่เดิม พอไฟลุกอีกครั้ง เมทานอล น้ำมันเตา และกากตะกอนน้ำมัน ในโกดัง 5 หลังที่มีถังนับหมื่นใบ ก็ไหม้ต่อเนื่องหลายวัน",
        impact: [
          { value: "67 คน", labelTh: "ชาวบ้านที่ต้องเข้ารักษาเพราะสูดควัน" },
          { value: "2 ตำบล", labelTh: "ที่ชาวบ้านต้องอพยพออกจากบ้าน" },
          { value: "3 วัน+", labelTh: "ผ่านไปแล้วไฟก็ยังไม่ดับ" },
        ],
        whoIsHurtTh: "ชาวบ้านรอบๆ ที่ต้องสูดควันและอพยพออกจากบ้าน",
        sources: [
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/news/general/40037460",
            dateTh: "23 เม.ย. 2567",
          },
          { name: "Sanook", url: "https://www.sanook.com/news/9340702/", dateTh: "24 เม.ย. 2567" },
          { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/339694", dateTh: "5 พ.ค. 2567" },
        ],
      },
      {
        titleTh: "โรงงานเคมีระเบิดตอนตีสาม",
        placeTh: "บางพลี สมุทรปราการ",
        yearTh: "ก.ค. 2564",
        whatHappenedTh:
          "โรงงานผลิตเม็ดโฟมระเบิดตอนตีสาม แล้วไฟลุกลาม คนในรัศมี 5 กิโลเมตรถูกสั่งให้ออกจากพื้นที่ ไฟใช้เวลากว่า 26 ชั่วโมงกว่าจะดับ และทิ้งสารสไตรีนที่เป็นพิษไว้",
        impact: [
          { value: "1,992 คน", labelTh: "ถูกสั่งให้อพยพ" },
          { value: "5 กม.", labelTh: "รัศมีที่ให้คนออกห่าง" },
          { value: "700 ล้านบาท", labelTh: "ความเสียหายเบื้องต้น" },
        ],
        whoIsHurtTh: "อาสากู้ภัยอายุ 18 ปีที่เสียชีวิตระหว่างหนีไฟ ชาวบ้านรอบโรงงาน และนักดับเพลิง",
        sources: [
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/in-focus/40002861",
            dateTh: "5 ก.ค. 2564",
          },
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/in-focus/40002894",
            dateTh: "6 ก.ค. 2564",
          },
        ],
      },
      {
        titleTh: "ป่าภาคเหนือไหม้ทุกหน้าแล้ง",
        placeTh: "เชียงใหม่ และทั่วประเทศ",
        yearTh: "2557 ถึง 2567",
        whatHappenedTh:
          "ทุกหน้าแล้ง ไฟไหม้ป่าทางภาคเหนือแล้วกลายเป็นควันที่ทุกคนต้องหายใจ แค่ช่วงต้นปี 2567 เชียงใหม่จังหวัดเดียวก็เสียป่าไปหลายหมื่นไร่",
        impact: [
          { value: "66,685 ไร่", labelTh: "ป่าในเชียงใหม่ที่ถูกไฟไหม้ ถึง 13 มี.ค. 2567" },
          { value: "81.6 ถึง 122", labelTh: "ค่า PM2.5 ใน 14 อำเภอของเชียงใหม่ ขณะที่ค่าปลอดภัยคือ 37.5" },
          { value: "1,008,946 ไร่", labelTh: "พื้นที่ที่ถูกไฟไหม้ทั่วประเทศ ปี 2557 ถึง 2566" },
        ],
        whoIsHurtTh: "คนภาคเหนือที่ต้องหายใจเอาควันเข้าไป สัตว์ป่า และอาสาดับไฟ",
        sources: [
          {
            name: "Nation Thailand",
            url: "https://www.nationthailand.com/thailand/general/40036340",
            dateTh: "13 มี.ค. 2567",
          },
          { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/337401", dateTh: "24 ก.พ. 2567" },
        ],
        image: {
          src: "/hackathon/elemental/cases/fire-3.webp",
          altTh: "ไฟไหม้ใบไม้แห้งในป่า จังหวัดแม่ฮ่องสอน",
          credit: "ภาพ: Takeaway, CC BY-SA 3.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Forest_fire_mae_hong_son_province_01.jpg",
        },
      },
    ],
  },

  aether: {
    ctaTh: "ผู้ประกาศข่าวที่ไม่เคยพูดประโยคนั้น",
    problemTh:
      "ภัยบางอย่างไม่มีควันและไม่มีกลิ่น: แอปที่ออกแบบให้เลื่อนไม่หยุด คลิป AI และข่าวปลอมในกลุ่มไลน์ครอบครัว ดีปเฟกที่ใช้หลอกเอาเงิน และไฟฟ้ามหาศาลที่ AI ใช้ เรามองไม่เห็นมัน จนมันทำร้ายเราไปแล้ว",
    howMightWeTh:
      "เราจะช่วยให้คนหนึ่งคนที่เรารู้จัก มองเห็นภัยที่ซ่อนอยู่ ก่อนที่เขาจะเชื่อ แชร์ หรือจ่ายเงินให้มันได้อย่างไร",
    starterTh:
      "LINE bot หรือคู่มือที่ช่วยให้คนในบ้านเช็กข้อความก่อนแชร์: ใครโพสต์ มีที่มาไหม รูปจริงหรือเปล่า ลองกับคนจริง 3 คน หรือจดฟีดตัวเอง 3 วัน นับว่าเจอคลิป AI หรือข่าวปลอมกี่ชิ้น แล้วมันทำอะไรกับเรา",
    stretchTh:
      "เครื่องมือที่จับรูปที่ AI ทำ หรือข่าวปลอมเก่าที่วนกลับมา หรือทางให้คนทำคอนเทนต์หาเงินได้ โดยไม่ต้องพึ่งคลิกเบต",
    cases: [
      {
        titleTh: "ผู้ประกาศข่าวที่ไม่เคยพูดประโยคนั้น",
        placeTh: "โฆษณาบน Facebook ในไทย",
        yearTh: "2568",
        whatHappenedTh:
          "โฆษณาใช้ AI ปลอมคลิปผู้ประกาศข่าวตัวจริง ให้ดูเหมือนแนะนำการลงทุน ภาพบางส่วนตัดมาจากข่าวจริงเมื่อหลายปีก่อน ทีมตรวจสอบข่าวเจอแบบนี้แล้วอย่างน้อย 3 ถึง 4 ครั้ง",
        impact: [
          { value: "8,000 บาท", labelTh: "ที่ชวนให้ลงก่อน โดยสัญญาว่าจะได้คืนถึง 800,000 บาท" },
          { value: "12,000 ครั้ง", labelTh: "ยอดดูของคลิปปลอมคลิปเดียว" },
          { value: "72.3%", labelTh: "โอกาสที่คลิปหนึ่งในชุดนี้ถูกสร้างด้วย AI ตามเครื่องมือตรวจ" },
        ],
        whoIsHurtTh: "ทุกคนที่เชื่อใจหน้าผู้ประกาศข่าวที่คุ้นเคย โดยเฉพาะพ่อแม่และผู้สูงอายุ",
        sources: [
          { name: "Thai PBS Verify", url: "https://www.thaipbs.or.th/verify/content/4431", dateTh: "22 ก.ค. 2568" },
          { name: "Thai PBS Verify", url: "https://www.thaipbs.or.th/verify/content/5074", dateTh: "28 ส.ค. 2568" },
        ],
        image: {
          src: "/hackathon/elemental/cases/aether-1.webp",
          altTh: "เครื่องพิมพ์ดีดที่พิมพ์คำว่า fake news",
          credit: "ภาพ: Jorge Franganillo, CC BY 2.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Fake_news_-_51120419628.jpg",
        },
      },
      {
        titleTh: "ค่าเสียหายจากมิจฉาชีพออนไลน์",
        placeTh: "ทั่วประเทศไทย",
        yearTh: "2567 ถึง 2569",
        whatHappenedTh:
          "มิจฉาชีพเข้าถึงคนไทยผ่านโทรศัพท์ SMS และโฆษณาออนไลน์ หลายชิ้นเป็นของปลอมหรือทำด้วย AI แค่สัปดาห์เดียว ความเสียหายก็เกินร้อยล้านบาท",
        impact: [
          { value: "5,092 คดี", labelTh: "ที่แจ้งผ่านเว็บตำรวจออนไลน์ ในสัปดาห์เดียว (21 ถึง 27 มิ.ย. 2569)" },
          { value: "160 ล้านบาท", labelTh: "ความเสียหายในสัปดาห์เดียวกัน" },
        ],
        whoIsHurtTh: "ทุกคน คดีส่วนใหญ่ในสัปดาห์นั้น (81.4%) เป็นการหลอกขายของและบริการออนไลน์ ซึ่งวัยรุ่นก็โดนได้",
        sources: [
          { name: "ไทยรัฐ", url: "https://en.thairath.co.th/news/crime/2942806", dateTh: "มิ.ย. 2569" },
        ],
      },
      {
        titleTh: "ทุกคำตอบของ AI ใช้ไฟจากโรงไฟฟ้า",
        placeTh: "ทั่วโลก",
        yearTh: "2567 ถึง 2573",
        whatHappenedTh:
          "แชตบอตและเครื่องมือสร้างภาพด้วย AI ทำงานอยู่ในดาต้าเซ็นเตอร์ขนาดยักษ์ที่กินไฟมหาศาล และความต้องการไฟของมันกำลังจะเพิ่มเป็นเท่าตัว",
        impact: [
          { value: "415 TWh", labelTh: "ไฟที่ดาต้าเซ็นเตอร์ทั่วโลกใช้ในปี 2567" },
          { value: "945 TWh", labelTh: "ที่คาดว่าจะใช้ในปี 2573 มากกว่าไฟที่ญี่ปุ่นทั้งประเทศใช้อยู่ตอนนี้" },
          { value: "4 เท่า+", labelTh: "ดาต้าเซ็นเตอร์สำหรับ AI โดยเฉพาะ คาดว่าจะใช้ไฟเพิ่มขึ้นภายในปี 2573" },
        ],
        whoIsHurtTh: "ทุกคนที่จ่ายค่าไฟและหายใจเอามลพิษจากโรงไฟฟ้า แต่มองไม่เห็น เพราะมันซ่อนอยู่หลังช่องแชต",
        sources: [
          {
            name: "IEA",
            url: "https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai",
            dateTh: "2568",
          },
          {
            name: "IEA",
            url: "https://www.iea.org/news/ai-is-set-to-drive-surging-electricity-demand-from-data-centres-while-offering-the-potential-to-transform-how-the-energy-sector-works",
            dateTh: "2568",
          },
        ],
        image: {
          src: "/hackathon/elemental/cases/aether-3.webp",
          altTh: "แถวตู้เซิร์ฟเวอร์ในดาต้าเซ็นเตอร์",
          credit: "ภาพ: Carl Lender, CC BY 2.0, Wikimedia Commons",
          creditUrl: "https://commons.wikimedia.org/wiki/File:Datacenter_Server_Racks_(22370909788).jpg",
        },
      },
    ],
  },
};
