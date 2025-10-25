import React, { useEffect, useState, useRef } from "react";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

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

  // 從 Firebase 載入用戶設定
  useEffect(() => {
    if (user) {
      loadUserStartDate();
    }
  }, [user]);

  const loadUserStartDate = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "userSettings", user.uid));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setStartDate(
          settings.startDate ? new Date(settings.startDate) : new Date()
        );
      } else {
        setStartDate(new Date());
      }
    } catch (error) {
      console.error("載入用戶設定失敗:", error);
      setStartDate(new Date());
    }
  };

  // 根据屏幕宽度计算卡片位置
  const getCardTransform = (index) => {
    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;
    const isTinyMobile = windowWidth <= 360;

    let translateX = (index - 1) * 160;
    let rotate = (index - 1) * 5;

    if (isTinyMobile) {
      translateX = (index - 1) * 120;
      rotate = (index - 1) * 3;
    } else if (isSmallMobile) {
      translateX = (index - 1) * 140;
      rotate = (index - 1) * 4;
    } else if (isMobile) {
      translateX = (index - 1) * 160;
      rotate = (index - 1) * 5;
    }

    return `translateX(${translateX}px) rotate(${rotate}deg)`;
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
        setUploadError(`最多只能有3張照片，目前已有${currentPhotos.length}張`);
        return;
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 10 * 1024 * 1024) {
        setUploadError("總文件大小不能超過10MB");
        return;
      }

      // 上傳到 Cloudinary
      const uploadPromises = files.map(async (file) => {
        if (file.size > 2 * 1024 * 1024) {
          setUploadError("單張照片不能超過2MB");
          return null;
        }

        if (!file.type.startsWith("image/")) {
          setUploadError("只能上傳圖片文件");
          return null;
        }

        try {
          const cloudinaryUrl = await uploadToCloudinary(file);
          return cloudinaryUrl;
        } catch {
          setUploadError("照片上傳失敗，請重試");
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
      setUploadError("上傳過程失敗，請重試");
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
      setUploadError("移除照片失敗，請重試");
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
      setUploadError("偶像名稱和相遇日期都是必填的");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      // 1. 更新偶像資料
      await updateDoc(doc(db, "idols", userData.id), {
        idolName: editingData.idolName,
        updatedAt: new Date()
      });

      // 2. 更新用戶設定中的相遇日期
      await setDoc(doc(db, "userSettings", user.uid), {
        startDate: new Date(editingData.meetingDate).toISOString(),
        updatedAt: new Date()
      }, { merge: true });

      // 3. 更新本地狀態
      const updatedUserData = {
        ...userData,
        idolName: editingData.idolName
      };
      onUserDataUpdate(updatedUserData);

      // 4. 更新相遇日期
      setStartDate(new Date(editingData.meetingDate));

      setShowEditModal(false);
    } catch (error) {
      console.error("保存編輯失敗:", error);
      setUploadError("保存失敗，請重試");
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
            <span className="days-count">{calculateDuration()} 天</span>
          )}
        </div>

        <div className="large-text">
          <div className="artistic-title-main">
            <span className="main-letter main-letter-1">L</span>
            <span className="main-letter main-letter-2">o</span>
            <span className="main-letter main-letter-3">n</span>
            <span className="main-letter main-letter-4">g</span>
            <span className="main-letter main-letter-5">-</span>
            <span className="main-letter main-letter-6">t</span>
            <span className="main-letter main-letter-7">e</span>
            <span className="main-letter main-letter-8">r</span>
            <span className="main-letter main-letter-9">m</span>
          </div>
          <div className="artistic-title-sub">
            <span className="sub-letter sub-letter-1">S</span>
            <span className="sub-letter sub-letter-2">u</span>
            <span className="sub-letter sub-letter-3">p</span>
            <span className="sub-letter sub-letter-4">p</span>
            <span className="sub-letter sub-letter-5">o</span>
            <span className="sub-letter sub-letter-6">r</span>
            <span className="sub-letter sub-letter-7">t</span>
            <span className="sub-letter sub-letter-8">J</span>
            <span className="sub-letter sub-letter-9">o</span>
            <span className="sub-letter sub-letter-10">u</span>
            <span className="sub-letter sub-letter-11">r</span>
            <span className="sub-letter sub-letter-12">n</span>
            <span className="sub-letter sub-letter-13">a</span>
            <span className="sub-letter sub-letter-14">l</span>
          </div>
          {userData?.idolName && (
            <div className="idol-name-section">
              <div className="idol-name-main">{userData.idolName}</div>
              <button 
                className="edit-button"
                onClick={handleEditClick}
                title="編輯偶像資料"
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
                      title="移除照片"
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
              <h3>編輯偶像資料</h3>
              <div className="edit-form">
                <div className="form-row">
                  <label>偶像名稱</label>
                  <input
                    type="text"
                    value={editingData.idolName}
                    onChange={(e) => setEditingData({
                      ...editingData,
                      idolName: e.target.value
                    })}
                    placeholder="輸入偶像名稱"
                    disabled={uploading}
                  />
                </div>
                <div className="form-row">
                  <label>相遇日期</label>
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
                    {uploading ? "保存中..." : "保存"}
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={handleEditCancel}
                    disabled={uploading}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="action-button">
          {!userData?.idolName ? (
            <button className="start-button" onClick={onStart}>
              Setup Profile
            </button>
          ) : (
            <button className="journal-button" onClick={onJournalClick}>
              Enter Journal
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
