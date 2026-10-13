/**
 * SHIFT refund rule, shared so every place states the same steps.
 * A student gets a full refund only if they did every step and still feel
 * the shift wasn't worth it. Missing a mentor session is fine if they join
 * the make-up class.
 */
export const REFUND_STEPS = [
  "คิดไอเดียอย่างน้อย 3 ไอเดีย แล้วเลือกอันที่ดีที่สุด",
  "คุยกับคนที่เจอปัญหาจริงอย่างน้อย 3 คน ก่อนเริ่มสร้าง",
  "เลือกปัญหาเดียว กับกลุ่มคนใช้กลุ่มเดียว",
  "สร้างต้นแบบที่คนอื่นลองใช้ได้",
  "ให้คนนอกรุ่นอย่างน้อย 3 คนลองใช้ แล้วจดว่าเขาพูดอะไร",
  "ปรับอย่างน้อย 1 อย่างจากสิ่งที่คนลองใช้บอก",
  "นำเสนองานในวันที่ 7",
  "โพสต์ความคืบหน้าใน Discord ทุกวัน",
  "เข้าเซสชันกับพี่เลี้ยงทุกครั้ง (พลาดแล้วเข้าคลาสชดเชยได้)",
] as const;

export const REFUND_HOW =
  "ทำครบแล้วยังรู้สึกว่าไม่คุ้ม ทักมาบอกเราได้เลย ถ้าขาดขั้นไหนไป จะไม่ได้รับเงินคืน";
