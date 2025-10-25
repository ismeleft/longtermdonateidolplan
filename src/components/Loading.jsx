import React from "react";
import { motion } from "framer-motion";
import "./Loading.css";

const Loading = () => {
  const letters = ["L", "O", "A", "D", "I", "N", "G"];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const letterVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      rotate: -10,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const dotVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="loading-container">
      <div className="loading-content">
        {/* 藝術性字母設計 */}
        <motion.div
          className="loading-letters"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              className={`loading-letter loading-letter-${index + 1}`}
              variants={letterVariants}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* 簡約的動態點 */}
        <div className="loading-dots">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="loading-dot"
              variants={dotVariants}
              animate="animate"
              style={{
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* 細線裝飾 */}
        <motion.div
          className="loading-line"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: 1.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>
    </div>
  );
};

export default Loading;
