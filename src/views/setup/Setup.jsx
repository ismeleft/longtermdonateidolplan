import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const Setup = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [idolName, setIdolName] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("最多只能上傳3張照片");
      return;
    }

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((results) => {
      setPhotos(results);
    });
  };

  const handleNext = async () => {
    if (step === 1 && idolName) {
      setStep(2);
    } else if (step === 2 && photos.length === 3) {
      setLoading(true);
      setError("");

      try {
        // 保存偶像數據到 Firestore
        const idolDoc = await addDoc(collection(db, "idols"), {
          idolName,
          photos,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // 保存偶像ID到 localStorage
        localStorage.setItem("current_idol_id", idolDoc.id);

        // 完成設置
        onComplete({ idolName, photos, id: idolDoc.id });
      } catch (error) {
        console.error("保存偶像數據失敗:", error);
        setError("保存失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="welcome-container">
      <div className="main-content">
        <div className="large-text">
          <span className="text-part">長期資助海外藝術青年</span>
          <br />
          成果發表計畫
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="setup-form"
            >
              <div className="setup-title">請輸入偶像名稱</div>
              <input
                type="text"
                value={idolName}
                onChange={(e) => setIdolName(e.target.value)}
                placeholder="輸入偶像名稱"
                className="setup-input"
              />
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="setup-form"
            >
              <div className="setup-title">上傳三張照片</div>
              <div className="photo-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="file-input"
                />
                <div className="photo-preview">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={`preview-card ${
                        photos[index] ? "has-image" : ""
                      }`}
                      onClick={triggerFileInput}
                    >
                      {photos[index] ? (
                        <img src={photos[index]} alt={`Preview ${index + 1}`} />
                      ) : (
                        <div className="placeholder">+</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="upload-hint">點擊任意卡片上傳照片</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="error-message">{error}</div>}

        <div className="action-button">
          <button
            className="setup-button"
            onClick={handleNext}
            disabled={
              (step === 1 && !idolName) ||
              (step === 2 && photos.length !== 3) ||
              loading
            }
          >
            {loading ? "保存中..." : step === 1 ? "下一步" : "完成設定"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;
