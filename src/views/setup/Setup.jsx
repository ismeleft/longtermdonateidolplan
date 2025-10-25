import React, { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp, doc, setDoc, query, where, getDocs } from "firebase/firestore";

const Setup = ({ onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [idolName, setIdolName] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
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
      console.error("Failed to upload to Cloudinary:", error);
      throw error;
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadError("");
    setLoading(true);

    try {
      // Check file count and size
      if (files.length > 3) {
        setUploadError("Maximum 3 photos can be uploaded at once");
        return;
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        setUploadError("Total file size cannot exceed 10MB");
        return;
      }

      // Upload to Cloudinary
      const uploadPromises = files.map(async (file) => {
        if (file.size > 2 * 1024 * 1024) {
          setUploadError("Single photo cannot exceed 2MB");
          return null;
        }

        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files can be uploaded");
          return null;
        }

        try {
          const cloudinaryUrl = await uploadToCloudinary(file);
          return cloudinaryUrl;
        } catch {
          setUploadError("Photo upload failed, please try again");
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
    } catch {
      setUploadError("Upload process failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && idolName && meetingDate) {
      setStep(2);
    } else if (step === 2) {
      setLoading(true);
      setError("");

      try {
        // 1. 檢查用戶現有的 idol 數量（判斷是否為第一個 idol）
        const idolsQuery = query(
          collection(db, "idols"),
          where("userId", "==", user.uid)
        );
        const existingIdolsSnapshot = await getDocs(idolsQuery);
        const isFirstIdol = existingIdolsSnapshot.empty;

        console.log("📊 現有 idol 數量:", existingIdolsSnapshot.size);
        console.log("🆕 是否為第一個 idol:", isFirstIdol);

        // 2. 保存偶像資料（包含各自的相遇日期）
        const idolDoc = await addDoc(collection(db, "idols"), {
          idolName,
          photos, // Now storing Cloudinary URLs (can be empty array)
          userId: user.uid, // 加入用戶 ID 進行隔離
          startDate: new Date(meetingDate).toISOString(), // 每個 idol 各自的相遇日期
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log("✅ 成功創建 idol:", idolDoc.id);

        // 3. 如果是第一個 idol，同時保存到 userSettings（向後兼容）
        if (isFirstIdol) {
          const userSettings = {
            startDate: new Date(meetingDate).toISOString(),
            updatedAt: Timestamp.now()
          };
          await setDoc(doc(db, "userSettings", user.uid), userSettings, { merge: true });
        }

        // 4. 更新 localStorage
        localStorage.setItem("current_idol_id", idolDoc.id);

        // 5. 通知父組件完成，並傳遞 isFirstIdol 參數
        onComplete({
          idolName,
          photos,
          id: idolDoc.id,
          userId: user.uid,
          startDate: new Date(meetingDate).toISOString(), // 傳遞 startDate
          isFirstIdol // 重要：告訴 App.jsx 這是不是第一個 idol
        });
      } catch (error) {
        console.error("Failed to save idol data:", error);
        setError("Save failed, please try again later");
      } finally {
        setLoading(false);
      }
    }
  };

  const triggerFileInput = (type) => {
    setUploadError(""); // Clear previous error messages
    if (type === "camera") {
      cameraInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const removePhoto = (index) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
    setUploadError(""); // Clear previous error messages
  };

  return (
    <div className="welcome-container">
      <div className="main-content">
        {/* Setup 頁面不需要顯示主標題，因為已經有分散字母設計 */}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <div key="step1" className="setup-form">
              <div className="setup-title">
                <div className="artistic-title">
                  <span className="letter letter-1">s</span>
                  <span className="letter letter-2">e</span>
                  <span className="letter letter-3">t</span>
                  <span className="letter letter-4">u</span>
                  <span className="letter letter-5">p</span>
                </div>
                <div className="subtitle">Enter artist information</div>
              </div>
              <input
                type="text"
                value={idolName}
                onChange={(e) => setIdolName(e.target.value)}
                placeholder="Enter artist name..."
                className="setup-input"
              />
              <div className="meeting-date-section">
                <label htmlFor="meetingDate" className="date-label">
                  When you started supporting {idolName || 'this artist'}:
                </label>
                <input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="setup-input date-input"
                />
                <div className="date-hint">
                  Mark this special beginning ✨
                </div>
              </div>
            </div>
          ) : (
            <div key="step2" className="setup-form">
              <div className="setup-title">
                <div className="artistic-title">
                  <span className="letter letter-1">p</span>
                  <span className="letter letter-2">h</span>
                  <span className="letter letter-3">o</span>
                  <span className="letter letter-4">t</span>
                  <span className="letter letter-5">o</span>
                  <span className="letter letter-6">s</span>
                </div>
                <div className="subtitle">Upload photos (optional)</div>
              </div>
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
                            Choose from Gallery
                          </button>
                          <button
                            className="upload-option"
                            onClick={() => triggerFileInput("camera")}
                          >
                            Take Photo
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="upload-hint">
                  {photos.length === 0
                    ? "上傳最多三張照片，或選擇跳過"
                    : photos.length === 3
                    ? "已選擇三張照片"
                    : `已選擇 ${photos.length} 張照片`}
                </div>
                
                {photos.length === 0 && (
                  <div className="skip-option">
                    <button
                      className="skip-button-inline"
                      onClick={handleNext}
                      disabled={loading}
                      style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      {loading ? '處理中...' : '跳過照片上傳'}
                    </button>
                    <div className="or-divider">或繼續上傳照片</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        {error && <div className="error-message">{error}</div>}

        <div className="action-button">
          {step === 2 ? (
            photos.length > 0 ? (
              <button
                className="setup-button"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? "儲存中..." : "完成設定"}
              </button>
            ) : null
          ) : (
            <button
              className="setup-button"
              onClick={handleNext}
              disabled={(step === 1 && (!idolName || !meetingDate)) || loading}
            >
              {loading ? "載入中..." : "下一步"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;
