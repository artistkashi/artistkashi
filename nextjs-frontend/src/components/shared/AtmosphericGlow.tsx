"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export const AtmosphericGlow = () => {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], ["10vh", "80vh"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["90vh", "20vh"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      <motion.div
        style={{ top: y1, rotate }}
        className="absolute -left-32 w-80 h-80 bg-gold/20 blur-[120px] rounded-full"
      />
      <motion.div
        style={{ top: y2, rotate: -rotate }}
        className="absolute -right-32 w-80 h-80 bg-gold/10 blur-[120px] rounded-full"
      />

      {/* Mobile-only extra punch */}
      <div className="lg:hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-[150px] rounded-full"
        />
      </div>
    </div>
  );
};
