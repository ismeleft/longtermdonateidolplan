import React, { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const Setup = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [idolName, setIdolName] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("最多只能上傳3張照片");
      return;
    }

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        // 检查文件大小
        if (file.size > 5 * 1024 * 1024) {
          // 5MB
          alert("照片大小不能超過 5MB");
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((results) => {
      const validResults = results.filter((result) => result !== null);
      if (validResults.length > 0) {
        setPhotos((prevPhotos) => {
          const newPhotos = [...prevPhotos];
          validResults.forEach((result, index) => {
            if (newPhotos.length < 3) {
              newPhotos.push(result);
            }
          });
          return newPhotos;
        });
      }
    });
  };

  const handleNext = async () => {
    if (step === 1 && idolName) {
      setStep(2);
    } else if (step === 2 && photos.length === 3) {
      setLoading(true);
      setError("");

      try {
        const idolDoc = await addDoc(collection(db, "idols"), {
          idolName,
          photos,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        localStorage.setItem("current_idol_id", idolDoc.id);
        onComplete({ idolName, photos, id: idolDoc.id });
      } catch (error) {
        console.error("保存偶像數據失敗:", error);
        setError("保存失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }
  };

  const triggerFileInput = (type) => {
    if (type === "camera") {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const removePhoto = (index) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
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
            <div key="step1" className="setup-form">
              <div className="setup-title">請輸入偶像名稱</div>
              <input
                type="text"
                value={idolName}
                onChange={(e) => setIdolName(e.target.value)}
                placeholder="輸入偶像名稱"
                className="setup-input"
              />
            </div>
          ) : (
            <div key="step2" className="setup-form">
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
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                    >
                      {photos[index] ? (
                        <div className="preview-card-content">
                          <img
                            src={photos[index]}
                            alt={`Preview ${index + 1}`}
                          />
                          <button
                            className="remove-photo"
                            onClick={() => removePhoto(index)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="upload-options">
                          <button
                            className="upload-option"
                            onClick={() => triggerFileInput("gallery")}
                          >
                            從相簿選擇
                          </button>
                          <button
                            className="upload-option"
                            onClick={() => triggerFileInput("camera")}
                          >
                            拍攝照片
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="upload-hint">點擊空白處上傳或拍攝照片</div>
              </div>
            </div>
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
