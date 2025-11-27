"use client";

import { Map, Users, GraduationCap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LandingFeaturesProps {
  lang: "en" | "th";
}

export function LandingFeatures({ lang }: LandingFeaturesProps) {
  const features = [
    {
      icon: Map,
      title: lang === "en" ? "Journey Map" : "แผนที่การเดินทาง",
      description: lang === "en" 
        ? "Visualize your life goals, reflect on your progress, and navigate your personal growth journey."
        : "ตั้งเป้าหมายชีวิต สะท้อนความคิด และนำทางสู่การเติบโตของคุณด้วยแผนที่ชีวิต",
      color: "text-purple-400",
      gradient: "from-purple-500/20 to-blue-500/20",
    },
    {
      icon: Users,
      title: lang === "en" ? "Seed Camp" : "Seed Camp",
      description: lang === "en"
        ? "Join multiplayer learning camps. Master Web Dev, Game Dev, and Hacking with peers."
        : "เข้าร่วมแคมป์เรียนรู้แบบกลุ่ม ฝึกฝน Web Dev, Game Dev และ Hacking ไปพร้อมกับเพื่อนๆ",
      color: "text-green-400",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      icon: GraduationCap,
      title: lang === "en" ? "Uni & Major Finder" : "ค้นหามหาวิทยาลัย",
      description: lang === "en"
        ? "Make data-driven decisions about your education with our comprehensive university database."
        : "ตัดสินใจเลือกที่เรียนด้วยข้อมูลที่ครบถ้วน จากฐานข้อมูลมหาวิทยาลัยที่ครอบคลุมที่สุด",
      color: "text-orange-400",
      gradient: "from-orange-500/20 to-red-500/20",
    },
  ];

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {lang === "en" ? "Everything You Need to Grow" : "ทุกสิ่งที่คุณต้องใช้ในการเติบโต"}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {lang === "en" 
              ? "A complete ecosystem designed to help you discover, learn, and achieve."
              : "ระบบนิเวศการเรียนรู้ที่ออกแบบมาเพื่อช่วยให้คุณค้นพบ เรียนรู้ และประสบความสำเร็จ"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="relative bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-300 group h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardHeader>
                  <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
                  <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-base">
                    {feature.description}
                  </CardDescription>
                  <div className={`mt-6 flex items-center text-sm font-medium ${feature.color} opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0`}>
                    {lang === "en" ? "Learn more" : "ดูเพิ่มเติม"} <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
