import React, { useEffect, useState, useRef } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";

const Welcome = ({
  onStart,
  userData,
  onJournalClick,
  user,
  onUserDataUpdate,
}) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [startDate, setStartDate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState({
    idolName: "",
    meetingDate: ""
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 從當前 idol 資料載入 startDate
  useEffect(() => {
    if (userData?.startDate) {
      setStartDate(new Date(userData.startDate));
    } else {
      setStartDate(new Date());
    }
  }, [userData]);

  // 根据屏幕宽度计算卡片位置
  const getCardTransform = (index) => {
    const isSmallMobile = windowWidth <= 480;
    const isTinyMobile = windowWidth <= 360;

    let translateX, rotate, translateY;

    if (isTinyMobile) {
      translateX = (index - 1) * 110;
      rotate = (index - 1) * 15;
      translateY = (index === 1) ? 0 : 20;
    } else if (isSmallMobile) {
      translateX = (index - 1) * 130;
      rotate = (index - 1) * 20;
      translateY = (index === 1) ? 0 : 30;
    } else { // Desktop and isMobile
      translateX = (index - 1) * 160;
      rotate = (index - 1) * 25;
      translateY = (index === 1) ? 0 : 40;
    }

    return `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`;
  };

  // 獲取用戶顯示名稱
  const getUserDisplayName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  // 計算追星時長（天數）
  const calculateDuration = () => {
    if (!startDate) return 0;
    const now = new Date();
    const diffTime = Math.abs(now - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Cloudinary 上傳函數
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

  // 處理照片上傳
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadError("");
    setUploading(true);

    try {
      // 檢查文件數量和大小
      const currentPhotos = userData?.photos || [];
      const totalNewPhotos = currentPhotos.length + files.length;

      if (totalNewPhotos > 3) {
        setUploadError(`Maximum 3 photos allowed, currently ${currentPhotos.length} uploaded`);
        return;
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        setUploadError("Total file size cannot exceed 10MB");
        return;
      }

      // 上傳到 Cloudinary
      const uploadPromises = files.map(async (file) => {
        if (file.size > 2 * 1024 * 1024) {
          setUploadError("Each photo cannot exceed 2MB");
          return null;
        }

        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are allowed");
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
        // 更新 Firebase 中的偶像資料
        const newPhotos = [...currentPhotos, ...validResults].slice(0, 3);
        await updateDoc(doc(db, "idols", userData.id), {
          photos: newPhotos,
          updatedAt: new Date(),
        });

        // 更新本地狀態
        const updatedUserData = {
          ...userData,
          photos: newPhotos,
        };
        onUserDataUpdate(updatedUserData);
      }
    } catch (error) {
      console.error("上傳失敗:", error);
      setUploadError("Upload failed, please try again");
    } finally {
      setUploading(false);
    }
  };

  // 移除照片
  const handleRemovePhoto = async (index) => {
    try {
      const currentPhotos = userData?.photos || [];
      const newPhotos = currentPhotos.filter((_, i) => i !== index);

      // 更新 Firebase
      await updateDoc(doc(db, "idols", userData.id), {
        photos: newPhotos,
        updatedAt: new Date(),
      });

      // 更新本地狀態
      const updatedUserData = {
        ...userData,
        photos: newPhotos,
      };
      onUserDataUpdate(updatedUserData);
    } catch (error) {
      console.error("移除照片失敗:", error);
      setUploadError("Failed to remove photo, please try again");
    }
  };

  // 打開編輯模態框
  const handleEditClick = () => {
    setEditingData({
      idolName: userData?.idolName || "",
      meetingDate: startDate ? startDate.toISOString().split('T')[0] : ""
    });
    setShowEditModal(true);
  };

  // 取消編輯
  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingData({
      idolName: "",
      meetingDate: ""
    });
  };

  // 保存編輯
  const handleEditSave = async () => {
    if (!editingData.idolName || !editingData.meetingDate) {
      setUploadError("Artist name and support date are required");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      // 1. 更新偶像名稱和相遇日期（都存在 idol 文件中）
      await updateDoc(doc(db, "idols", userData.id), {
        idolName: editingData.idolName,
        startDate: new Date(editingData.meetingDate).toISOString(),
        updatedAt: new Date()
      });

      // 2. 更新本地狀態
      const updatedUserData = {
        ...userData,
        idolName: editingData.idolName,
        startDate: new Date(editingData.meetingDate).toISOString()
      };
      onUserDataUpdate(updatedUserData);

      // 3. 更新相遇日期
      setStartDate(new Date(editingData.meetingDate));

      setShowEditModal(false);
    } catch (error) {
      console.error("保存編輯失敗:", error);
      setUploadError("Save failed, please try again");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="welcome-container">
      <div className="main-content">
        {/* 歡迎語 - 移到頁面頂部右上角 */}
        <div className="welcome-greeting-top">
          <span className="greeting-text-small">
            Hi, {getUserDisplayName()}!
          </span>
          {startDate && (
            <span className="days-count">{calculateDuration()} days</span>
          )}
        </div>

        <div className="large-text">
          <div className="artistic-title-main">
            <span className="main-letter main-letter-1">A</span>
            <span className="main-letter main-letter-2">r</span>
            <span className="main-letter main-letter-3">t</span>
            <span className="main-letter main-letter-4">i</span>
            <span className="main-letter main-letter-5">s</span>
            <span className="main-letter main-letter-6">t</span>
          </div>
          <div className="artistic-title-sub">
            <span className="sub-letter sub-letter-1">P</span>
            <span className="sub-letter sub-letter-2">a</span>
            <span className="sub-letter sub-letter-3">t</span>
            <span className="sub-letter sub-letter-4">r</span>
            <span className="sub-letter sub-letter-5">o</span>
            <span className="sub-letter sub-letter-6">n</span>
            <span className="sub-letter sub-letter-7">a</span>
            <span className="sub-letter sub-letter-8">g</span>
            <span className="sub-letter sub-letter-9">e</span>
            <span className="sub-letter sub-letter-10"> </span>
            <span className="sub-letter sub-letter-11">J</span>
            <span className="sub-letter sub-letter-12">o</span>
            <span className="sub-letter sub-letter-13">u</span>
            <span className="sub-letter sub-letter-14">r</span>
            <span className="sub-letter sub-letter-15">n</span>
            <span className="sub-letter sub-letter-16">a</span>
            <span className="sub-letter sub-letter-17">l</span>
          </div>
          {userData?.idolName && (
            <div className="idol-name-section">
              <div className="idol-name-main">{userData.idolName}</div>
              <button
                className="edit-button"
                onClick={handleEditClick}
                title="Edit Artist Info"
              >
                ✎
              </button>
            </div>
          )}
        </div>

        <div className="photo-cards">
          {/* 隱藏的文件輸入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />

          {[0, 1, 2].map((index) => {
            const photo = userData?.photos?.[index];
            return (
              <div
                key={index}
                className={`card ${photo ? "" : "empty"}`}
                style={{
                  transform: getCardTransform(index),
                  zIndex: index,
                }}
                onMouseEnter={(e) => {
                  if (photo) {
                    e.currentTarget.style.transform = `${getCardTransform(
                      index
                    )} translateY(-10px)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (photo) {
                    e.currentTarget.style.transform = getCardTransform(index);
                  }
                }}
              >
                {photo ? (
                  <div className="card-with-photo">
                    <img src={photo} alt={`照片 ${index + 1}`} />
                    <button
                      className="remove-photo-btn"
                      onClick={() => handleRemovePhoto(index)}
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="card-placeholder"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                  >
                    {uploading ? "•••" : "+"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 上傳錯誤提示 */}
        {uploadError && (
          <div className="upload-error-welcome">{uploadError}</div>
        )}

        {/* 編輯偶像資料模態框 */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content edit-modal">
              <h3>Edit Artist Info</h3>
              <div className="edit-form">
                <div className="form-row">
                  <label>Artist Name</label>
                  <input
                    type="text"
                    value={editingData.idolName}
                    onChange={(e) => setEditingData({
                      ...editingData,
                      idolName: e.target.value
                    })}
                    placeholder="Enter artist name"
                    disabled={uploading}
                  />
                </div>
                <div className="form-row">
                  <label>Supporting Since</label>
                  <input
                    type="date"
                    value={editingData.meetingDate}
                    onChange={(e) => setEditingData({
                      ...editingData,
                      meetingDate: e.target.value
                    })}
                    disabled={uploading}
                  />
                </div>
                <div className="form-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleEditSave}
                    disabled={uploading}
                  >
                    {uploading ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleEditCancel}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="action-button">
          {!userData?.idolName ? (
            <button className="start-button" onClick={onStart}>
              Begin Your Journey
            </button>
          ) : (
            <button className="journal-button" onClick={onJournalClick}>
              Support Log
            </button>
          )}
        </div>

        <div className="footer">
          <div className="morse-code">
            {[
              "-",
              "..",
              "-.",
              "--.",
              "-",
              "..-",
              ".-",
              "-.",
              "..",
              ".",
              "--...",
              "....",
              "---",
              "-.",
              "--.",
              "..",
              "..",
              ".-",
              "-.",
            ].map((code, index) => (
              <React.Fragment key={index}>
                {code.split("").map((char, charIndex) => (
                  <span
                    key={`${index}-${charIndex}`}
                    className={char === "." ? "morse-dot" : "morse-dash"}
                  >
                    {char}
                  </span>
                ))}
                <span className="morse-space" />
              </React.Fragment>
            ))}
          </div>
          <div className="author">@LEFTLEFT10</div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
