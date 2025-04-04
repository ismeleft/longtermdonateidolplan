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
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    );

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        }/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("上傳到 Cloudinary 失敗:", error);
      throw error;
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadError("");
    setLoading(true);

    try {
      // 檢查文件數量和大小的邏輯保持不變
      if (files.length > 3) {
        setUploadError("一次最多只能上傳3張照片");
        return;
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 15 * 1024 * 1024) {
        setUploadError("照片總大小不能超過 15MB");
        return;
      }

      // 上傳到 Cloudinary
      const uploadPromises = files.map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("單張照片不能超過 5MB");
          return null;
        }

        if (!file.type.startsWith("image/")) {
          setUploadError("只能上傳圖片文件");
          return null;
        }

        try {
          const cloudinaryUrl = await uploadToCloudinary(file);
          return cloudinaryUrl;
        } catch (error) {
          setUploadError("照片上傳失敗，請重試");
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const validResults = results.filter((result) => result !== null);

      if (validResults.length > 0) {
        setPhotos((prevPhotos) => {
          const newPhotos = [...prevPhotos];
          validResults.forEach((result) => {
            if (newPhotos.length < 3) {
              newPhotos.push(result);
            }
          });
          return newPhotos;
        });
      }
    } catch (error) {
      setUploadError("上傳過程發生錯誤，請重試");
    } finally {
      setLoading(false);
    }
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
          photos, // 現在存儲的是 Cloudinary URL
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
    setUploadError(""); // 清除之前的错误提示
    if (type === "camera") {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const removePhoto = (index) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
    setUploadError(""); // 清除之前的错误提示
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
                {uploadError && (
                  <div className="upload-error">{uploadError}</div>
                )}
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
                <div className="upload-hint">
                  {photos.length === 0
                    ? "請上傳三張照片"
                    : photos.length === 3
                    ? "已選擇三張照片"
                    : `還需要上傳 ${3 - photos.length} 張照片`}
                </div>
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
